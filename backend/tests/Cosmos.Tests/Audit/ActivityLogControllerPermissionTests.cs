using Cosmos.API.Controllers.ActivityLogs;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Security.Claims;

namespace Cosmos.Tests.Audit;

public sealed class ActivityLogControllerPermissionTests
{
    [Theory]
    [InlineData("List", PermissionAction.View)]
    [InlineData("Get", PermissionAction.View)]
    [InlineData("Export", PermissionAction.Export)]
    public void Every_activity_endpoint_uses_its_read_only_permission(string methodName, PermissionAction action)
    {
        var method = typeof(ActivityLogsController).GetMethods().Single(method => method.Name == methodName);
        var permission = Assert.Single(method.GetCustomAttributes(typeof(RequirePermissionAttribute), true).Cast<RequirePermissionAttribute>());

        Assert.Equal(new object[] { ActivityLogPermissions.ActivityLogs, action }, permission.Arguments);
    }

    [Fact]
    public void Detail_openapi_metadata_exposes_the_sanitized_detail_contract()
    {
        var method = typeof(ActivityLogsController).GetMethods().Single(method => method.Name == "Get");
        var response = Assert.Single(method.GetCustomAttributes(typeof(ProducesResponseTypeAttribute), true).Cast<ProducesResponseTypeAttribute>());

        Assert.Equal(typeof(ApiResponse<ActivityLogDetailDto>), response.Type);
    }

    [Fact]
    public async Task Activity_log_view_permission_enforces_401_403_and_allows_a_permitted_user()
    {
        var unauthenticated = new RequirePermissionFilter(ActivityLogPermissions.ActivityLogs, PermissionAction.View, Mock.Of<IPermissionService>(), NullLogger<RequirePermissionFilter>.Instance);
        var anonymousContext = CreateFilterContext(new ClaimsPrincipal(new ClaimsIdentity()));
        await unauthenticated.OnAuthorizationAsync(anonymousContext);
        Assert.Equal(StatusCodes.Status401Unauthorized, Assert.IsType<ObjectResult>(anonymousContext.Result).StatusCode);

        var permissions = new Mock<IPermissionService>();
        permissions.Setup(x => x.UserHasPermissionAsync(7, ActivityLogPermissions.ActivityLogs, PermissionAction.View, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var forbidden = new RequirePermissionFilter(ActivityLogPermissions.ActivityLogs, PermissionAction.View, permissions.Object, NullLogger<RequirePermissionFilter>.Instance);
        var deniedContext = CreateFilterContext(Principal(7));
        await forbidden.OnAuthorizationAsync(deniedContext);
        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(deniedContext.Result).StatusCode);

        permissions.Setup(x => x.UserHasPermissionAsync(7, ActivityLogPermissions.ActivityLogs, PermissionAction.View, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var allowedContext = CreateFilterContext(Principal(7));
        await forbidden.OnAuthorizationAsync(allowedContext);
        Assert.Null(allowedContext.Result);
    }

    private static ClaimsPrincipal Principal(int userId) => new(new ClaimsIdentity([new Claim("UserId", userId.ToString())], "test"));

    private static AuthorizationFilterContext CreateFilterContext(ClaimsPrincipal principal)
    {
        var httpContext = new DefaultHttpContext { User = principal };
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        return new AuthorizationFilterContext(actionContext, []);
    }
}
