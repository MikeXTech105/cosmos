using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Oee;
using Cosmos.Contracts.Oee;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("OEE")]
[ApiExplorerSettings(GroupName = "OEE")]
[Route("api/v1/oee/dashboard")]
public sealed class OeeDashboardController(IOeeService service) : ApiControllerBase
{
    [HttpGet("summary")]
    [RequirePermission(OeePermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<OeeDashboardSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] OeeDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetDashboardSummaryAsync(query, ct));

    [HttpGet("machine-wise")]
    [RequirePermission(OeePermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MachineWise([FromQuery] OeeDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetMachineWiseAsync(query, ct));

    [HttpGet("mould-wise")]
    [RequirePermission(OeePermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MouldWise([FromQuery] OeeDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetMouldWiseAsync(query, ct));

    [HttpGet("top-downtime-reasons")]
    [RequirePermission(OeePermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TopDowntimeReasons([FromQuery] OeeDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetTopDowntimeReasonsAsync(query, ct));

    [HttpGet("daily-trend")]
    [RequirePermission(OeePermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeDailyTrendDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DailyTrend([FromQuery] OeeDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetDailyTrendAsync(query, ct));
}
