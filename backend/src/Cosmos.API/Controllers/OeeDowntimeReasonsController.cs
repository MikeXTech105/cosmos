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
[Route("api/v1/oee/downtime-reasons")]
public sealed class OeeDowntimeReasonsController(IOeeService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(OeePermissions.DowntimeReasons, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<OeeDowntimeReasonDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] OeeMasterListQuery query, CancellationToken ct) => FromResponse(await service.GetDowntimeReasonsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(OeePermissions.DowntimeReasons, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<OeeDowntimeReasonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetDowntimeReasonAsync(id, ct));

    [HttpPost]
    [RequirePermission(OeePermissions.DowntimeReasons, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<OeeDowntimeReasonDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateOeeDowntimeReasonRequest request, CancellationToken ct) => FromResponse(await service.CreateDowntimeReasonAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(OeePermissions.DowntimeReasons, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<OeeDowntimeReasonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateOeeDowntimeReasonRequest request, CancellationToken ct) => FromResponse(await service.UpdateDowntimeReasonAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(OeePermissions.DowntimeReasons, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteDowntimeReasonAsync(id, ct));
}
