using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("Masters")]
[ApiExplorerSettings(GroupName = "masters")]
[Route("api/units")]
public sealed class UnitsController : ApiControllerBase
{
    private readonly IUnitService _service;

    public UnitsController(IUnitService service) => _service = service;

    /// <summary>Gets a paginated unit list.</summary>
    [HttpGet]
    [RequirePermission("Units", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<UnitListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetUnitsQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(query, cancellationToken));

    /// <summary>Gets a unit by id.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission("Units", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<UnitDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(new GetUnitByIdQuery(id), cancellationToken));

    /// <summary>Creates a unit.</summary>
    [HttpPost]
    [RequirePermission("Units", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<UnitDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateUnitCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates a unit.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission("Units", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<UnitDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateUnitCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, command, cancellationToken));

    /// <summary>Soft deletes a unit.</summary>
    [HttpDelete("{id:long}")]
    [RequirePermission("Units", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.DeleteAsync(new DeleteUnitCommand(id), cancellationToken));
}
