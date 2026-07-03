using System.Reflection;
using Cosmos.API.Middleware;
using Cosmos.Application;
using Cosmos.Infrastructure;
using Cosmos.Persistence;
using Cosmos.Shared.Security;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

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
    .Get<string[]>();

var swaggerModules = new[]
{
    new SwaggerModule("dashboard", "Cosmos ERP - Dashboard API", "Dashboard API"),
    new SwaggerModule("masters", "Cosmos ERP - Masters API", "Masters API"),
    new SwaggerModule("items", "Cosmos ERP - Items API", "Items API"),
    new SwaggerModule("parties", "Cosmos ERP - Parties API", "Parties API"),
    new SwaggerModule("sales", "Cosmos ERP - Sales API", "Sales API"),
    new SwaggerModule("Purchase & Expense", "Cosmos ERP - Purchase & Expense API", "Purchase & Expense"),
    new SwaggerModule("gst", "Cosmos ERP - GST Integration API", "GST Integration"),
    new SwaggerModule("OEE", "Cosmos ERP - OEE API", "OEE"),
    new SwaggerModule("hr", "Cosmos ERP - HR API", "HR API"),
    new SwaggerModule("reports", "Cosmos ERP - Reports API", "Reports API"),
    new SwaggerModule("settings", "Cosmos ERP - Settings API", "Settings API"),
    new SwaggerModule("general", "Cosmos ERP - General API", "General API")
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy
            .WithOrigins(allowedOrigins!)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser>(provider =>
{
    var accessor = provider.GetRequiredService<IHttpContextAccessor>();
    return new CurrentUser(accessor.HttpContext?.User);
});

builder.Services.AddApplication();
builder.Services.AddPersistence();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();

builder.Services.AddSwaggerGen(options =>
{
    options.EnableAnnotations();

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

    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", null, null),
            new List<string>()
        }
    });

    foreach (var xmlFile in Directory.EnumerateFiles(AppContext.BaseDirectory, "*.xml"))
    {
        options.IncludeXmlComments(xmlFile, includeControllerXmlComments: true);
    }
});

var app = builder.Build();

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
app.UseMiddleware<AuditMiddleware>();

app.MapControllers();
app.MapHealthChecks("/health");
app.Run();

public partial class Program;

internal sealed record SwaggerModule(string GroupName, string Title, string DisplayName);
