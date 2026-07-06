using Cosmos.Application.Abstractions.Services;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Cosmos.API.Security;

public sealed class RequirePermissionFilter : IAsyncAuthorizationFilter
{
    private readonly string _pageName;
    private readonly PermissionAction _action;
    private readonly IPermissionService _permissionService;

    public RequirePermissionFilter(string pageName, PermissionAction action, IPermissionService permissionService)
    {
        _pageName = pageName;
        _action = action;
        _permissionService = permissionService;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var userIdValue = context.HttpContext.User.FindFirst("UserId")?.Value;
        if (!int.TryParse(userIdValue, out var userId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var allowed = await _permissionService.UserHasPermissionAsync(userId, _pageName, _action, context.HttpContext.RequestAborted);
        if (!allowed)
        {
            context.Result = new ForbidResult();
        }
    }
}
