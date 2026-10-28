using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Cosmos.API.Controllers;
using Cosmos.API.Middleware;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Organization;
using Cosmos.Contracts.Organization;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Cosmos.Tests.Organization;

public sealed class CompanyBranchMasterHttpAuthorizationTests
{
    [Fact]
    public async Task Unauthenticated_company_request_returns_401()
    {
        await using var host = await Host.CreateAsync((_, _) => true);
        Assert.Equal(HttpStatusCode.Unauthorized, (await host.Client.GetAsync("/api/v1/organization/companies")).StatusCode);
    }

    [Fact]
    public async Task Missing_page_permission_returns_403_without_service_call()
    {
        await using var host = await Host.CreateAsync((_, _) => false);
        var response = await host.Client.SendAsync(Request(HttpMethod.Get, "/api/v1/organization/companies"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, host.ServiceCalls);
    }

    [Fact]
    public async Task Authorized_request_uses_actual_filter_pipeline_and_preserves_correlation_id()
    {
        await using var host = await Host.CreateAsync((page, action) => page == "System.CompanyBranchScope" && action == PermissionAction.View);
        var request = Request(HttpMethod.Get, "/api/v1/organization/companies");
        request.Headers.Add(CorrelationIdMiddleware.HeaderName, "company-branch-http-test");
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("company-branch-http-test", response.Headers.GetValues(CorrelationIdMiddleware.HeaderName).Single());
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyCollection<CompanyDto>>>();
        Assert.True(body!.Succeeded);
        Assert.Equal(1, host.ServiceCalls);
    }

    private static HttpRequestMessage Request(HttpMethod method, string path) => new(method, path) { Headers = { { TestAuthenticationHandler.UserHeader, "42" } } };

    private sealed class Host : IAsyncDisposable
    {
        private readonly WebApplication app;
        private readonly Mock<ICompanyBranchMasterService> service;
        private Host(WebApplication app, HttpClient client, Mock<ICompanyBranchMasterService> service) { this.app = app; Client = client; this.service = service; }
        public HttpClient Client { get; }
        public int ServiceCalls => service.Invocations.Count;

        public static async Task<Host> CreateAsync(Func<string, PermissionAction, bool> allowed)
        {
            var permissions = new Mock<IPermissionService>();
            permissions.Setup(x => x.UserHasPermissionAsync(42, It.IsAny<string>(), It.IsAny<PermissionAction>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((int _, string page, PermissionAction action, CancellationToken _) => allowed(page, action));
            var masters = new Mock<ICompanyBranchMasterService>();
            masters.Setup(x => x.CompaniesAsync(It.IsAny<string?>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<IReadOnlyCollection<CompanyDto>>.Success([new CompanyDto(1, "A", "Authorized", true)]));
            var port = Port();
            var builder = WebApplication.CreateBuilder();
            builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
            builder.Services.AddSingleton(permissions.Object);
            builder.Services.AddSingleton(masters.Object);
            builder.Services.AddAuthentication(TestAuthenticationHandler.SchemeName).AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(TestAuthenticationHandler.SchemeName, _ => { });
            builder.Services.AddAuthorization();
            builder.Services.AddControllers().AddApplicationPart(typeof(CompanyBranchesController).Assembly);
            var app = builder.Build();
            app.UseMiddleware<CorrelationIdMiddleware>(); app.UseMiddleware<GlobalExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
            await app.StartAsync();
            return new Host(app, new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}") }, masters);
        }

        public async ValueTask DisposeAsync() { Client.Dispose(); await app.StopAsync(); await app.DisposeAsync(); }
        private static int Port() { using var listener = new TcpListener(System.Net.IPAddress.Loopback, 0); listener.Start(); return ((System.Net.IPEndPoint)listener.LocalEndpoint).Port; }
    }

    private sealed class TestAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        public const string SchemeName = "CompanyBranchHttp"; public const string UserHeader = "X-Test-User";
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue(UserHeader, out var id)) return Task.FromResult(AuthenticateResult.NoResult());
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("UserId", id!)], SchemeName)), SchemeName)));
        }
    }
}
