using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Tags("Settings")]
[ApiExplorerSettings(GroupName = "settings")]
[Route("api/permissions")]
public sealed class PermissionsController : ApiControllerBase
{
    private readonly IPermissionService _service;

    public PermissionsController(IPermissionService service) => _service = service;

    /// <summary>Gets all page permissions assigned to a role.</summary>
    [HttpGet("role/{roleId:int}")]
    [RequirePermission("Permissions", PermissionAction.View)]
    public async Task<IActionResult> GetByRoleId(int roleId, CancellationToken cancellationToken) => FromResponse(await _service.GetByRoleIdAsync(roleId, cancellationToken));

    /// <summary>Replaces all page permissions assigned to a role.</summary>
    [HttpPut("role/{roleId:int}")]
    [RequirePermission("Permissions", PermissionAction.Edit)]
    public async Task<IActionResult> Save(int roleId, SaveRolePermissionsRequest request, CancellationToken cancellationToken) => FromResponse(await _service.SaveAsync(roleId, request, cancellationToken));
}
