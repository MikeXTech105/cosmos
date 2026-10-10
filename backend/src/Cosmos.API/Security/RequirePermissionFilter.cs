using Cosmos.API.Middleware;
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
    private readonly ILogger<RequirePermissionFilter> _logger;

    public RequirePermissionFilter(string pageName, PermissionAction action, IPermissionService permissionService, ILogger<RequirePermissionFilter> logger)
    {
        _pageName = pageName;
        _action = action;
        _permissionService = permissionService;
        _logger = logger;
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
            _logger.LogWarning(
                "Permission denied. CorrelationId: {CorrelationId}; UserId: {UserId}; Method: {Method}; Path: {Path}; Page: {Page}; Action: {Action}",
                GetCorrelationId(context),
                userId,
                context.HttpContext.Request.Method,
                context.HttpContext.Request.Path,
                _pageName,
                _action);
            context.Result = Failure(context, StatusCodes.Status403Forbidden, "Forbidden");
        }
    }

    private static string? GetCorrelationId(AuthorizationFilterContext context) =>
        context.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value)
            ? value?.ToString()
            : null;

    private static ObjectResult Failure(AuthorizationFilterContext context, int statusCode, string message)
    {
        return new ObjectResult(ApiResponse.Failure(message, new[] { message }, GetCorrelationId(context))) { StatusCode = statusCode };
    }
}
