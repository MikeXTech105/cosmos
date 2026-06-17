using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Parties;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Tags("Parties")]
[ApiExplorerSettings(GroupName = "parties")]
[Route("api/v1/parties")]
public sealed class PartiesController : ApiControllerBase
{
    private readonly IPartyService _service;

    public PartiesController(IPartyService service) => _service = service;

    /// <summary>Gets a paginated party list.</summary>
    [HttpGet]
    [RequirePermission("Party", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PartyListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetPartiesQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(query, cancellationToken));

    /// <summary>Gets a party by id.</summary>
    [HttpGet("{id:guid}")]
    [RequirePermission("Party", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PartyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(new GetPartyByIdQuery(id), cancellationToken));

    /// <summary>Creates a party.</summary>
    [HttpPost]
    [RequirePermission("Party", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<PartyDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreatePartyCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates a party.</summary>
    [HttpPut("{id:guid}")]
    [RequirePermission("Party", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<PartyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, UpdatePartyCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, command, cancellationToken));

    /// <summary>Soft deletes a party.</summary>
    [HttpDelete("{id:guid}")]
    [RequirePermission("Party", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
        FromResponse(await _service.DeleteAsync(new DeletePartyCommand(id), cancellationToken));

    /// <summary>Activates or deactivates a party.</summary>
    [HttpPatch("{id:guid}/status")]
    [RequirePermission("Party", PermissionAction.Edit)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangePartyStatusCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.ChangeStatusAsync(id, command, cancellationToken));
}
