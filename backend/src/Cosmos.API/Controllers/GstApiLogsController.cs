using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("GST API Logs")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/api-logs")]
public sealed class GstApiLogsController : ApiControllerBase
{
    private readonly IGstApiLogService _service;

    public GstApiLogsController(IGstApiLogService service) => _service = service;

    [HttpGet]
    [RequirePermission(GstPermissions.Logs, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<GstApiLogResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GstApiLogListRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(request, cancellationToken));
}
