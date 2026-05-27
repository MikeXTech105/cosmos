using Asp.Versioning;
using Cosmos.API.Authorization;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Permissions;
using Cosmos.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[ApiVersion(1.0)]
[Authorize]
public sealed class PermissionsController(IPermissionService permissionService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpGet("roles/{roleId:guid}")]
    [HasPermission("PERMISSIONS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PermissionResponse>>>> GetByRole(Guid roleId, CancellationToken cancellationToken) =>
        Success(await permissionService.GetByRoleAsync(roleId, cancellationToken), "Permissions fetched successfully");

    [HttpPut("roles/{roleId:guid}")]
    [HasPermission("PERMISSIONS_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Upsert(Guid roleId, UpsertRolePermissionRequest request, CancellationToken cancellationToken)
    {
        var normalized = request with { RoleId = roleId };
        await permissionService.UpsertAsync(normalized, CurrentUserId, cancellationToken);
        return SuccessMessage("Permissions updated successfully");
    }

    [HttpGet("users/{userId:guid}/keys")]
    [HasPermission("PERMISSIONS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<string>>>> GetUserPermissionKeys(Guid userId, CancellationToken cancellationToken) =>
        Success(await permissionService.GetPermissionKeysByUserAsync(userId, cancellationToken), "Permission keys fetched successfully");
}
