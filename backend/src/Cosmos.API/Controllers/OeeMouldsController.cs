using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Oee;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Oee;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("OEE")]
[ApiExplorerSettings(GroupName = "OEE")]
[Route("api/v1/oee/moulds")]
public sealed class OeeMouldsController(IOeeService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(OeePermissions.Moulds, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<OeeMouldDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] OeeMasterListQuery query, CancellationToken ct) => FromResponse(await service.GetMouldsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(OeePermissions.Moulds, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<OeeMouldDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetMouldAsync(id, ct));

    [HttpPost]
    [RequirePermission(OeePermissions.Moulds, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<OeeMouldDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateOeeMouldRequest request, CancellationToken ct) => FromResponse(await service.CreateMouldAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(OeePermissions.Moulds, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<OeeMouldDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateOeeMouldRequest request, CancellationToken ct) => FromResponse(await service.UpdateMouldAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(OeePermissions.Moulds, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteMouldAsync(id, ct));
}
