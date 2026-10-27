using System.Data;
using System.Text.Json;
using System.Reflection;
using Cosmos.API.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Persistence.Connection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionSwaggerRuntimeTests
{
    [Fact]
    public async Task Real_manufacturing_Swagger_publishes_typed_commands_reports_and_capacity_contracts()
    {
        await using var factory = new ContractFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var json = await client.GetStringAsync("/swagger/manufacturing/swagger.json");
        using var doc = JsonDocument.Parse(json);
        var paths = doc.RootElement.GetProperty("paths");
        foreach (var path in new[] { "/api/v1/manufacturing/work-centres", "/api/v1/manufacturing/operations",
            "/api/v1/manufacturing/orders", "/api/v1/manufacturing/orders/{id}/release", "/api/v1/manufacturing/orders/{id}/completions",
            "/api/v1/manufacturing/orders/{id}/capacity", "/api/v1/manufacturing/orders/{id}/schedule",
            "/api/v1/manufacturing/planning/finished", "/api/v1/manufacturing/planning/materials",
            "/api/v1/manufacturing/reports/materials", "/api/v1/manufacturing/imports/stage",
            "/api/v1/manufacturing/orders/{id}/amend", "/api/v1/manufacturing/imports/{id}/post",
            "/api/v1/manufacturing/planning/snapshots/{id}" })
            Assert.True(paths.TryGetProperty(path, out _), $"Missing implemented route {path}");
        var release = paths.GetProperty("/api/v1/manufacturing/orders/{id}/release").GetProperty("post");
        Assert.True(release.GetProperty("requestBody").GetProperty("content").GetProperty("application/json").TryGetProperty("schema", out _));
        Assert.True(release.GetProperty("responses").GetProperty("200").GetProperty("content").GetProperty("application/json").TryGetProperty("schema", out _));
        Assert.True(release.GetProperty("responses").TryGetProperty("409",out _));
        if(Environment.GetEnvironmentVariable("COSMOS_WRITE_PRODUCTION_CONTRACTS")=="1")
        {
            var directory=Path.Combine(ProductionMigrationSyntaxTests.FindRoot(),"backend","docs","production-contracts");Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory,"manufacturing.openapi.json"),json);
            foreach(var group in new[]{"procurement-planning","supply-chain","sales","shipment-operations","Purchase & Expense"})
            {
                var contract=await client.GetStringAsync($"/swagger/{Uri.EscapeDataString(group)}/swagger.json");
                await File.WriteAllTextAsync(Path.Combine(directory,group.Replace(" & ","-").ToLowerInvariant()+".openapi.json"),contract);
            }
            var routes=typeof(Program).Assembly.GetTypes().Where(t=>t.Namespace=="Cosmos.API.Controllers.Manufacturing" && t.GetCustomAttribute<RouteAttribute>() is not null)
                .SelectMany(t=>t.GetMethods(BindingFlags.Public|BindingFlags.Instance|BindingFlags.DeclaredOnly).SelectMany(m=>m.GetCustomAttributes<HttpMethodAttribute>().Select(a=>new{
                    controller=t.Name,action=m.Name,methods=a.HttpMethods,path="/"+t.GetCustomAttribute<RouteAttribute>()!.Template+ (a.Template is null?"":"/"+a.Template),
                    request=m.GetParameters().Where(p=>p.ParameterType!=typeof(CancellationToken)).Select(p=>new{name=p.Name,type=p.ParameterType.Name}),
                    responses=m.GetCustomAttributes<ProducesResponseTypeAttribute>().Select(r=>new{status=r.StatusCode,type=r.Type?.ToString()}),
                    permissions=m.GetCustomAttributes<RequirePermissionAttribute>().Select(p=>new{page=p.Arguments![0],action=p.Arguments[1]!.ToString()})
                }))).ToArray();
            await File.WriteAllTextAsync(Path.Combine(directory,"implemented-routes.json"),JsonSerializer.Serialize(routes,new JsonSerializerOptions{WriteIndented=true}));
        }
    }
    [Theory]
    [InlineData("/api/v1/manufacturing/orders")]
    [InlineData("/api/v1/manufacturing/reports/materials")]
    [InlineData("/api/purchase-orders/follow-ups?asOfDate=2026-10-27")]
    public async Task Unauthenticated_runtime_requests_cannot_access_company_data(string path)
    {
        await using var factory = new ContractFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var response = await client.GetAsync(path);
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private sealed class ContractFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:CosmosDb"] = "Server=127.0.0.1,1;Database=CosmosProductionIntegrationTests_SwaggerOnly;Integrated Security=true;Connect Timeout=1;TrustServerCertificate=true",
                ["Manufacturing:CatalogCompanyKey"] = "swagger-test", ["Manufacturing:BusinessTimeZone"] = "India Standard Time",
                ["Jwt:SigningKey"] = "Only_For_Local_Swagger_Contract_Tests_1234567890"
            }));
            builder.ConfigureTestServices(services =>
            {
                var provisioner = new Mock<ISystemOwnerProvisioningService>();
                provisioner.Setup(x => x.EnsureProvisionedAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
                services.RemoveAll<ISystemOwnerProvisioningService>(); services.AddSingleton(provisioner.Object);
                services.RemoveAll<ISqlConnectionFactory>(); services.AddSingleton<ISqlConnectionFactory, NoSqlConnections>();
            });
        }
    }
    private sealed class NoSqlConnections : ISqlConnectionFactory
    {
        public Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken) =>
            throw new InvalidOperationException("SQL access is forbidden in these Swagger/authentication contract tests.");
    }
}
