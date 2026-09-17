using System.Reflection;
using System.Threading.RateLimiting;
using Cosmos.API.Audit;
using Cosmos.API.Hosting;
using Cosmos.API.Middleware;
using Cosmos.API.WebsiteManagement;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Application;
using Cosmos.Application.Services;
using Cosmos.Infrastructure;
using Cosmos.Persistence;
using Cosmos.Shared.Options;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
var reverseProxyOptions = builder.Configuration.GetSection(ReverseProxyOptions.SectionName).Get<ReverseProxyOptions>() ?? new ReverseProxyOptions();
ReverseProxyForwarding.Validate(reverseProxyOptions);
builder.Services.Configure<ImageUploadOptions>(builder.Configuration.GetSection(ImageUploadOptions.SectionName));

if (reverseProxyOptions.IsEnabled)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options => ReverseProxyForwarding.Configure(options, reverseProxyOptions));
}

builder.Host.UseSerilog((context, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/cosmos-api-.log", rollingInterval: RollingInterval.Day);
});

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()?
    .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out _))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray() ?? Array.Empty<string>();

var swaggerModules = new[]
{
    new SwaggerModule("dashboard", "Cosmos ERP - Dashboard API", "Dashboard API"),
    new SwaggerModule("activity-logs", "Cosmos ERP - Activity Logs API", "Activity Logs API"),
    new SwaggerModule("masters", "Cosmos ERP - Masters API", "Masters API"),
    new SwaggerModule("items", "Cosmos ERP - Items API", "Items API"),
    new SwaggerModule("parties", "Cosmos ERP - Parties API", "Parties API"),
    new SwaggerModule("sales", "Cosmos ERP - Sales API", "Sales API"),
    new SwaggerModule("Purchase & Expense", "Cosmos ERP - Purchase & Expense API", "Purchase & Expense"),
    new SwaggerModule("gst", "Cosmos ERP - GST Integration API", "GST Integration"),
    new SwaggerModule("OEE", "Cosmos ERP - OEE API", "OEE"),
    new SwaggerModule("hr", "Cosmos ERP - HR API", "HR API"),
    new SwaggerModule("reports", "Cosmos ERP - Reports API", "Reports API"),
    new SwaggerModule("procurement-planning", "Cosmos ERP - Procurement Planning API", "Procurement Planning"),
    new SwaggerModule("dispatch-planning", "Cosmos ERP - Dispatch Planning API", "Dispatch Planning"),
    new SwaggerModule("shipment-operations", "Cosmos ERP - Shipment Operations API", "Shipment Operations"),
    new SwaggerModule("supply-chain", "Cosmos ERP - Supply Chain Foundation API", "Supply Chain Foundation"),
    new SwaggerModule("data-book", "Cosmos ERP - Data Book API", "Data Book"),
    new SwaggerModule("website-management", "Cosmos ERP - Website Management API", "Website Management"),
    new SwaggerModule("website-public", "WEWEL Public Website API", "WEWEL Public Website"),
    new SwaggerModule("rojmel", "Cosmos ERP - Rojmel / Wallet API", "Rojmel / Wallet"),
    new SwaggerModule("settings", "Cosmos ERP - Settings API", "Settings API"),
    new SwaggerModule("general", "Cosmos ERP - General API", "General API")
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders(CorrelationIdMiddleware.HeaderName, "Content-Disposition");
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<Cosmos.Contracts.Audit.IAuditRequestContext, HttpAuditRequestContext>();
builder.Services.AddScoped<ICurrentUser>(provider =>
{
    var accessor = provider.GetRequiredService<IHttpContextAccessor>();
    return new CurrentUser(accessor.HttpContext?.User);
});

builder.Services.AddApplication();
builder.Services.AddPersistence();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(entry => entry.Value is { Errors.Count: > 0 })
                .ToDictionary(
                    entry => string.IsNullOrWhiteSpace(entry.Key) ? "_" : entry.Key,
                    entry => (IReadOnlyCollection<string>)entry.Value!.Errors
                        .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage) ? "The supplied value is invalid." : error.ErrorMessage)
                        .Distinct(StringComparer.Ordinal)
                        .ToArray(),
                    StringComparer.Ordinal);
            var correlationId = context.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value)
                ? value?.ToString()
                : null;
            if (PublicWebsiteResponse.IsPublicWebsiteRequest(context.HttpContext))
            {
                var publicErrors = errors.ToDictionary(pair => pair.Key, pair => pair.Value.FirstOrDefault() ?? "The supplied value is invalid.", StringComparer.Ordinal);
                return new BadRequestObjectResult(new WebsitePublicErrorResponse("Validation failed.", "VALIDATION_FAILED", publicErrors, correlationId));
            }
            return new BadRequestObjectResult(ApiResponse.Failure("Validation failed.", errors, correlationId));
        };
    });
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("website-public-write", context =>
    {
        var clientKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 8,
            Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        var correlationId = context.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value) ? value?.ToString() : null;
        if (PublicWebsiteResponse.IsPublicWebsiteRequest(context.HttpContext))
        {
            await context.HttpContext.Response.WriteAsJsonAsync(new WebsitePublicErrorResponse("Too many requests. Please wait a moment and try again.", "RATE_LIMITED", null, correlationId), ct);
            return;
        }
        await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse.Failure("Too many requests.", new[] { "Too many requests." }, correlationId), ct);
    };
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();
builder.Services.Configure<DashboardOptions>(builder.Configuration.GetSection("Dashboard"));
builder.Services.Configure<SystemOwnerOptions>(options =>
{
    options.Username = builder.Configuration[SystemOwnerOptions.UsernameEnvironmentVariable];
    options.Email = builder.Configuration[SystemOwnerOptions.EmailEnvironmentVariable];
    options.Password = builder.Configuration[SystemOwnerOptions.PasswordEnvironmentVariable];
});

builder.Services.AddSwaggerGen(options =>
{
    options.EnableAnnotations();
    options.CustomSchemaIds(SwaggerSchemaIds.Create);

    // Module-wise Swagger documents keep ERP areas navigable without changing API routes.
    foreach (var module in swaggerModules)
    {
        options.SwaggerDoc(module.GroupName, new OpenApiInfo
        {
            Title = module.Title,
            Version = "v1",
            Description = "Cosmos ERP API endpoints grouped by functional module."
        });
    }

    options.DocInclusionPredicate((documentName, apiDescription) =>
    {
        var groupName = string.IsNullOrWhiteSpace(apiDescription.GroupName)
            ? "general"
            : apiDescription.GroupName;

        return string.Equals(groupName, documentName, StringComparison.OrdinalIgnoreCase);
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT bearer auth. In Swagger UI paste the accessToken only; the Bearer prefix is added automatically.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", document),
            new List<string>()
        }
    });

    foreach (var xmlFile in Directory.EnumerateFiles(AppContext.BaseDirectory, "*.xml"))
    {
        options.IncludeXmlComments(xmlFile, includeControllerXmlComments: true);
    }
});

var app = builder.Build();

app.Logger.LogInformation(
    "Cosmos API starting in {EnvironmentName}. Trusted reverse-proxy forwarding enabled: {ReverseProxyForwardingEnabled}",
    app.Environment.EnvironmentName,
    reverseProxyOptions.IsEnabled);

try
{
    await using var scope = app.Services.CreateAsyncScope();
    var provisioner = scope.ServiceProvider.GetRequiredService<Cosmos.Application.Abstractions.Services.ISystemOwnerProvisioningService>();
    await provisioner.EnsureProvisionedAsync(CancellationToken.None);
}
catch (SystemOwnerProvisioningValidationException exception)
{
    app.Logger.LogCritical(
        "System Owner startup provisioning failed validation. {ValidationSummary}",
        exception.Message);
    throw;
}

// Must run before scheme-sensitive middleware and controllers so a trusted TLS proxy
// can establish Request.IsHttps from X-Forwarded-Proto.
if (reverseProxyOptions.IsEnabled)
{
    app.UseForwardedHeaders();
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.DocumentTitle = "Cosmos ERP API";
    foreach (var module in swaggerModules)
    {
        options.SwaggerEndpoint($"/swagger/{module.GroupName}/swagger.json", module.DisplayName);
    }
});

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSerilogRequestLogging();
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseMiddleware<JwtClaimsMiddleware>();
app.UseAuthorization();
app.UseRateLimiter();
app.UseMiddleware<AuditMiddleware>();

app.MapControllers();
app.MapHealthChecks("/health");
app.Run();

public partial class Program;

internal sealed record SwaggerModule(string GroupName, string Title, string DisplayName);

internal static class SwaggerSchemaIds
{
    public static string Create(Type type)
    {
        if (!type.IsGenericType)
        {
            return CreateSimple(type);
        }

        var genericTypeName = type.Name[..type.Name.IndexOf('`')];
        var genericArgumentNames = string.Join("And", type.GetGenericArguments().Select(Create));
        return $"{genericArgumentNames}{genericTypeName}";
    }

    private static string CreateSimple(Type type)
    {
        var name = type.FullName ?? type.Name;
        name = name
            .Replace("Cosmos.Contracts.", string.Empty, StringComparison.Ordinal)
            .Replace("Cosmos.Shared.Responses.", string.Empty, StringComparison.Ordinal)
            .Replace("Cosmos.Contracts.Common.", string.Empty, StringComparison.Ordinal)
            .Replace("+", ".", StringComparison.Ordinal);

        return string.Concat(name.Split('.', StringSplitOptions.RemoveEmptyEntries));
    }
}
