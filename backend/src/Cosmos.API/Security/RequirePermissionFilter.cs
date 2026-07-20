using Cosmos.Application.Abstractions.Services;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
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
            context.Result = Failure(context, StatusCodes.Status401Unauthorized, "Unauthorized");
            return;
        }

        var userIdValue = context.HttpContext.User.FindFirst("UserId")?.Value;
        if (!int.TryParse(userIdValue, out var userId))
        {
            context.Result = Failure(context, StatusCodes.Status401Unauthorized, "Unauthorized");
            return;
        }

        var allowed = await _permissionService.UserHasPermissionAsync(userId, _pageName, _action, context.HttpContext.RequestAborted);
        if (!allowed)
        {
            context.Result = Failure(context, StatusCodes.Status403Forbidden, "Forbidden");
        }
    }

    private static ObjectResult Failure(AuthorizationFilterContext context, int statusCode, string message)
    {
        var correlationId = context.HttpContext.Items.TryGetValue("X-Correlation-Id", out var value)
            ? value?.ToString()
            : null;
        return new ObjectResult(ApiResponse.Failure(message, new[] { message }, correlationId)) { StatusCode = statusCode };
    }
}
