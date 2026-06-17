using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Roles;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Tags("Settings")]
[ApiExplorerSettings(GroupName = "settings")]
[Route("api/roles")]
public sealed class RolesController : ApiControllerBase
{
    private readonly IRoleService _service;

    public RolesController(IRoleService service) => _service = service;

    /// <summary>Gets roles.</summary>
    [HttpGet]
    [RequirePermission("Roles", PermissionAction.View)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) => FromResponse(await _service.GetAllAsync(cancellationToken));

    /// <summary>Gets a role by id.</summary>
    [HttpGet("{id:int}")]
    [RequirePermission("Roles", PermissionAction.View)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => FromResponse(await _service.GetByIdAsync(id, cancellationToken));

    /// <summary>Creates a role.</summary>
    [HttpPost]
    [RequirePermission("Roles", PermissionAction.Create)]
    public async Task<IActionResult> Create(CreateRoleRequest request, CancellationToken cancellationToken) => FromResponse(await _service.CreateAsync(request, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates a role.</summary>
    [HttpPut("{id:int}")]
    [RequirePermission("Roles", PermissionAction.Edit)]
    public async Task<IActionResult> Update(int id, UpdateRoleRequest request, CancellationToken cancellationToken) => FromResponse(await _service.UpdateAsync(id, request, cancellationToken));

    /// <summary>Deletes a role.</summary>
    [HttpDelete("{id:int}")]
    [RequirePermission("Roles", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) => FromResponse(await _service.DeleteAsync(id, cancellationToken));
}
