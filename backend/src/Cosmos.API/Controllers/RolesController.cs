using Asp.Versioning;
using Cosmos.API.Authorization;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Roles;
using Cosmos.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[ApiVersion(1.0)]
[Authorize]
public sealed class RolesController(IRoleService roleService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpGet]
    [HasPermission("ROLES_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<PagedResult<RoleResponse>>>> GetAll([FromQuery] QueryParameters query, CancellationToken cancellationToken) =>
        Success(await roleService.GetPagedAsync(query, cancellationToken), "Roles fetched successfully");

    [HttpGet("{id:guid}")]
    [HasPermission("ROLES_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> GetById(Guid id, CancellationToken cancellationToken) =>
        Success(await roleService.GetByIdAsync(id, cancellationToken), "Role fetched successfully");

    [HttpPost]
    [HasPermission("ROLES_PAGE_CREATE")]
    public async Task<ActionResult<ApiResponse<Guid>>> Create(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var id = await roleService.CreateAsync(request, CurrentUserId, cancellationToken);
        return Success(id, "Role created successfully");
    }

    [HttpPut("{id:guid}")]
    [HasPermission("ROLES_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Update(Guid id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        await roleService.UpdateAsync(id, request, CurrentUserId, cancellationToken);
        return SuccessMessage("Role updated successfully");
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("ROLES_PAGE_DELETE")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await roleService.DeleteAsync(id, CurrentUserId, cancellationToken);
        return SuccessMessage("Role deleted successfully");
    }
}
