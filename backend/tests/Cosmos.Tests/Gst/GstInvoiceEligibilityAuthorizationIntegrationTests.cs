using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Cosmos.API.Controllers;
using Cosmos.API.Middleware;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Sales;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Cosmos.Tests.Gst;

public sealed class GstInvoiceEligibilityAuthorizationIntegrationTests
{
    [Fact]
    public async Task UnauthenticatedRequest_Returns401()
    {
        await using var host = await EligibilityTestHost.CreateAsync((_, _) => false);

        var response = await host.Client.GetAsync("/api/v1/gst/invoices/9/eligibility");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task SinglePermission_Returns403(bool eInvoiceAccess, bool salesAccess)
    {
        await using var host = await EligibilityTestHost.CreateAsync((page, _) =>
            page == "GST.EInvoice" ? eInvoiceAccess : page == "Sales.Invoice" && salesAccess);

        var response = await host.Client.SendAsync(Authenticated("/api/v1/gst/invoices/9/eligibility"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, host.ServiceCalls);
    }

    [Fact]
    public async Task BothPermissions_Returns200ForExistingInvoice()
    {
        await using var host = await EligibilityTestHost.CreateAsync((_, _) => true);

        var response = await host.Client.SendAsync(Authenticated("/api/v1/gst/invoices/9/eligibility"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<GstComplianceSnapshotReadiness>>();
        Assert.True(body!.Succeeded);
        Assert.Equal(9, body.Data!.SalesInvoiceId);
        Assert.Equal(1, host.ServiceCalls);
    }

    [Fact]
    public async Task UnknownInvoice_Returns404WithoutEligibilityData()
    {
        await using var host = await EligibilityTestHost.CreateAsync((_, _) => true, unknownInvoice: true);

        var response = await host.Client.SendAsync(Authenticated("/api/v1/gst/invoices/404/eligibility"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse>();
        Assert.False(body!.Succeeded);
        Assert.Equal(1, host.ServiceCalls);
    }

    [Fact]
    public async Task NonPositiveInvoiceId_IsRejectedByRouting()
    {
        await using var host = await EligibilityTestHost.CreateAsync((_, _) => true);

        var response = await host.Client.SendAsync(Authenticated("/api/v1/gst/invoices/0/eligibility"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, host.ServiceCalls);
    }

    private static HttpRequestMessage Authenticated(string path) => new(HttpMethod.Get, path) { Headers = { { TestAuthenticationHandler.UserHeader, "42" } } };

    private sealed class EligibilityTestHost : IAsyncDisposable
    {
        private readonly WebApplication _app;
        private readonly Mock<IGstComplianceEligibilityService> _service;

        private EligibilityTestHost(WebApplication app, HttpClient client, Mock<IGstComplianceEligibilityService> service)
        {
            _app = app;
            Client = client;
            _service = service;
        }

        public HttpClient Client { get; }
        public int ServiceCalls => _service.Invocations.Count(invocation => invocation.Method.Name == nameof(IGstComplianceEligibilityService.AssessSalesInvoiceAsync));

        public static async Task<EligibilityTestHost> CreateAsync(Func<string, PermissionAction, bool> permitted, bool unknownInvoice = false)
        {
            var permissionService = new Mock<IPermissionService>();
            permissionService.Setup(x => x.UserHasPermissionAsync(42, It.IsAny<string>(), It.IsAny<PermissionAction>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((int _, string page, PermissionAction action, CancellationToken _) => permitted(page, action));

            var eligibility = new Mock<IGstComplianceEligibilityService>();
            eligibility.Setup(x => x.AssessSalesInvoiceAsync(404, It.IsAny<CancellationToken>()))
                .Returns(() => unknownInvoice
                    ? throw new NotFoundException("Sales invoice was not found.")
                    : Task.FromResult(ApiResponse<GstComplianceSnapshotReadiness>.Success(new GstComplianceSnapshotReadiness(404, false, Array.Empty<GstComplianceReadinessIssue>()))));
            eligibility.Setup(x => x.AssessSalesInvoiceAsync(9, It.IsAny<CancellationToken>()))
                .ReturnsAsync(ApiResponse<GstComplianceSnapshotReadiness>.Success(new GstComplianceSnapshotReadiness(9, false, Array.Empty<GstComplianceReadinessIssue>())));

            var builder = WebApplication.CreateBuilder();
            var port = GetAvailableTcpPort();
            builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
            builder.Services.AddSingleton(permissionService.Object);
            builder.Services.AddSingleton(eligibility.Object);
            builder.Services.AddAuthentication(TestAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(TestAuthenticationHandler.SchemeName, _ => { });
            builder.Services.AddAuthorization();
            builder.Services.AddControllers().AddApplicationPart(typeof(GstInvoiceEligibilityController).Assembly);

            var app = builder.Build();
            app.UseMiddleware<GlobalExceptionMiddleware>();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            await app.StartAsync();
            return new EligibilityTestHost(app, new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}") }, eligibility);
        }

        private static int GetAvailableTcpPort()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            return ((IPEndPoint)listener.LocalEndpoint).Port;
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await _app.StopAsync();
            await _app.DisposeAsync();
        }
    }

    private sealed class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "EligibilityTest";
        public const string UserHeader = "X-Test-User";

        public TestAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue(UserHeader, out var userId)) return Task.FromResult(AuthenticateResult.NoResult());
            var identity = new ClaimsIdentity([new Claim("UserId", userId!)], SchemeName);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
        }
    }
}
