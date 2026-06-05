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
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Cosmos ERP Security API",
        Version = "v1",
        Description = "Authentication, authorization, users, roles, pages, and permissions for Cosmos ERP. Authorization is JWT-authenticated and permission decisions are loaded from SQL Server stored procedures."
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
    options.DocumentTitle = "Cosmos ERP Security API";
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Cosmos ERP Security API v1");
});

app.UseHttpsRedirection();
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
