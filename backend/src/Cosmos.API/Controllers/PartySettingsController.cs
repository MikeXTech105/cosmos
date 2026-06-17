using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Parties;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Tags("Settings")]
[ApiExplorerSettings(GroupName = "settings")]
[Route("api/v1/settings/party")]
public sealed class PartySettingsController : ApiControllerBase
{
    private readonly IPartySettingsService _service;

    public PartySettingsController(IPartySettingsService service) => _service = service;

    /// <summary>Gets party settings.</summary>
    [HttpGet]
    [RequirePermission("Party", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PartySettingsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        FromResponse(await _service.GetAsync(new GetPartySettingsQuery(), cancellationToken));

    /// <summary>Updates party settings.</summary>
    [HttpPut]
    [RequirePermission("Party", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<PartySettingsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(UpdatePartySettingsCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(command, cancellationToken));
}
