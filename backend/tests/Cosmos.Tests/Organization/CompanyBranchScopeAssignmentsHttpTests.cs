using System.Net;
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
public sealed class CompanyBranchScopeAssignmentsHttpTests
{
 [Fact] public async Task All_assignment_routes_use_auth_permission_envelope_and_correlation_pipeline(){await using var h=await Host.Create(true);var paths=new[]{("/api/v1/organization/scope-assignments/me",HttpMethod.Get),("/api/v1/organization/scope-assignments/users/9",HttpMethod.Get),("/api/v1/organization/scope-assignments",HttpMethod.Post),("/api/v1/organization/scope-assignments/2",HttpMethod.Delete)};foreach(var (path,method) in paths){var q=new HttpRequestMessage(method,path);q.Headers.Add("X-Test-User","42");q.Headers.Add(CorrelationIdMiddleware.HeaderName,"scope-http");if(method==HttpMethod.Post)q.Content=System.Net.Http.Json.JsonContent.Create(new GrantCompanyBranchScopeRequest(9,1,null));var r=await h.Client.SendAsync(q);Assert.Equal(method==HttpMethod.Delete?HttpStatusCode.NoContent:method==HttpMethod.Post?HttpStatusCode.Created:HttpStatusCode.OK,r.StatusCode);Assert.Equal("scope-http",r.Headers.GetValues(CorrelationIdMiddleware.HeaderName).Single());}}
 [Fact] public async Task Missing_permission_returns_403_and_unauthenticated_returns_401(){await using var h=await Host.Create(false);Assert.Equal(HttpStatusCode.Unauthorized,(await h.Client.GetAsync("/api/v1/organization/scope-assignments/me")).StatusCode);var q=new HttpRequestMessage(HttpMethod.Get,"/api/v1/organization/scope-assignments/users/9");q.Headers.Add("X-Test-User","42");Assert.Equal(HttpStatusCode.Forbidden,(await h.Client.SendAsync(q)).StatusCode);}
 private sealed class Host: IAsyncDisposable {readonly WebApplication app;public HttpClient Client{get;}Host(WebApplication a,HttpClient c){app=a;Client=c;}public static async Task<Host>Create(bool allow){var p=new Mock<IPermissionService>();p.Setup(x=>x.UserHasPermissionAsync(42,It.IsAny<string>(),It.IsAny<PermissionAction>(),It.IsAny<CancellationToken>())).ReturnsAsync(allow);var s=new Mock<ICompanyBranchScopeAdministrationService>();s.Setup(x=>x.GetMyEffectiveScopeAsync(It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse<IReadOnlyCollection<EffectiveCompanyBranchScopeDto>>.Success([]));s.Setup(x=>x.GetUserAssignmentsAsync(It.IsAny<int>(),It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse<IReadOnlyCollection<UserCompanyBranchScopeDto>>.Success([]));s.Setup(x=>x.GrantAsync(It.IsAny<GrantCompanyBranchScopeRequest>(),It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse<UserCompanyBranchScopeDto>.Success(new(2,9,1,null,true,DateTime.UtcNow,null)));s.Setup(x=>x.RevokeAsync(It.IsAny<long>(),It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse.Success());using var l=new TcpListener(System.Net.IPAddress.Loopback,0);l.Start();var port=((System.Net.IPEndPoint)l.LocalEndpoint).Port;var b=WebApplication.CreateBuilder();b.WebHost.UseUrls($"http://127.0.0.1:{port}");b.Services.AddSingleton(p.Object);b.Services.AddSingleton(s.Object);b.Services.AddAuthentication("t").AddScheme<AuthenticationSchemeOptions,Auth>("t",_=>{});b.Services.AddAuthorization();b.Services.AddControllers().AddApplicationPart(typeof(CompanyBranchScopeAssignmentsController).Assembly);var a=b.Build();a.UseMiddleware<CorrelationIdMiddleware>();a.UseMiddleware<GlobalExceptionMiddleware>();a.UseAuthentication();a.UseAuthorization();a.MapControllers();await a.StartAsync();return new Host(a,new HttpClient{BaseAddress=new Uri($"http://127.0.0.1:{port}")});}public async ValueTask DisposeAsync(){Client.Dispose();await app.StopAsync();await app.DisposeAsync();}}
 private sealed class Auth(IOptionsMonitor<AuthenticationSchemeOptions> o,ILoggerFactory l,UrlEncoder e):AuthenticationHandler<AuthenticationSchemeOptions>(o,l,e){protected override Task<AuthenticateResult> HandleAuthenticateAsync(){if(!Request.Headers.TryGetValue("X-Test-User",out var id))return Task.FromResult(AuthenticateResult.NoResult());return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("UserId",id!)],"t")),"t")));}}
}
