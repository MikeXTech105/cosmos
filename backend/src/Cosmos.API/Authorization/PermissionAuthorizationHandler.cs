using System.Security.Claims;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Shared.Constants;
using Microsoft.AspNetCore.Authorization;

namespace Cosmos.API.Authorization;

public sealed class PermissionAuthorizationHandler(
    ICurrentUserService currentUserService,
    IPermissionService permissionService) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (!currentUserService.UserId.HasValue)
        {
            return;
        }

        if (context.User.IsInRole(ApplicationRoles.MasterAdmin) ||
            context.User.HasClaim("permission", requirement.PermissionKey))
        {
            context.Succeed(requirement);
            return;
        }

        var hasPermission = await permissionService.UserHasPermissionAsync(currentUserService.UserId.Value, requirement.PermissionKey, CancellationToken.None);
        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}
