using Cosmos.API.Security;
using Cosmos.API.Exports;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Users;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("Settings")]
[ApiExplorerSettings(GroupName = "settings")]
[Route("api/users")]
public sealed class UsersController : ApiControllerBase
{
    private readonly IUserService _service;

    public UsersController(IUserService service) => _service = service;

    /// <summary>Gets active and inactive non-deleted users.</summary>
    [HttpGet]
    [RequirePermission("Users", PermissionAction.View)]
    [SwaggerOperation(Summary = "Get users", Description = "Requires Users/View permission from SQL Server.")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<UserDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) => FromResponse(await _service.GetAllAsync(cancellationToken));

    /// <summary>Exports users as UTF-8 CSV without password or token data.</summary>
    [HttpGet("export")]
    [RequirePermission("Users", PermissionAction.Export)]
    [Produces("text/csv")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int? roleId,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        CsvExport.RequireCsv(format);
        var result = await _service.ExportAsync(search, isActive, roleId, sortBy, sortDirection, cancellationToken);
        return CsvExport.Create(result.Data ?? Array.Empty<UserExportDto>(), $"cosmos_users_{DateTime.UtcNow:yyyy-MM-dd}.csv");
    }

    /// <summary>Gets a user by id.</summary>
    [HttpGet("{id:int}")]
    [RequirePermission("Users", PermissionAction.View)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => FromResponse(await _service.GetByIdAsync(id, cancellationToken));

    /// <summary>Creates a user with a BCrypt password hash.</summary>
    [HttpPost]
    [RequirePermission("Users", PermissionAction.Create)]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken) => FromResponse(await _service.CreateAsync(request, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates a user profile and active flag.</summary>
    [HttpPut("{id:int}")]
    [RequirePermission("Users", PermissionAction.Edit)]
    public async Task<IActionResult> Update(int id, UpdateUserRequest request, CancellationToken cancellationToken) => FromResponse(await _service.UpdateAsync(id, request, cancellationToken));

    /// <summary>Soft deletes a user.</summary>
    [HttpDelete("{id:int}")]
    [RequirePermission("Users", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) => FromResponse(await _service.DeleteAsync(id, cancellationToken));

    /// <summary>Activates a user account.</summary>
    [HttpPatch("{id:int}/activate")]
    [RequirePermission("Users", PermissionAction.Edit)]
    public async Task<IActionResult> Activate(int id, CancellationToken cancellationToken) => FromResponse(await _service.ActivateAsync(id, cancellationToken));

    /// <summary>Deactivates a user account.</summary>
    [HttpPatch("{id:int}/deactivate")]
    [RequirePermission("Users", PermissionAction.Edit)]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken) => FromResponse(await _service.DeactivateAsync(id, cancellationToken));

    /// <summary>Replaces user role assignments.</summary>
    [HttpPost("{id:int}/roles")]
    [RequirePermission("Users", PermissionAction.Edit)]
    public async Task<IActionResult> AssignRoles(int id, AssignUserRolesRequest request, CancellationToken cancellationToken) => FromResponse(await _service.AssignRolesAsync(id, request, cancellationToken));
}
