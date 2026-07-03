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
[Route("api/v1/oee/reports")]
public sealed class OeeReportsController(IOeeService service) : ApiControllerBase
{
    [HttpGet("daily")]
    [RequirePermission(OeePermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeDailyReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Daily([FromQuery] OeeReportQuery query, CancellationToken ct) => FromResponse(await service.GetDailyReportAsync(query, ct));

    [HttpGet("machine-performance")]
    [RequirePermission(OeePermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MachinePerformance([FromQuery] OeeReportQuery query, CancellationToken ct) => FromResponse(await service.GetMachinePerformanceReportAsync(query, ct));

    [HttpGet("mould-performance")]
    [RequirePermission(OeePermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MouldPerformance([FromQuery] OeeReportQuery query, CancellationToken ct) => FromResponse(await service.GetMouldPerformanceReportAsync(query, ct));

    [HttpGet("downtime")]
    [RequirePermission(OeePermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Downtime([FromQuery] OeeReportQuery query, CancellationToken ct) => FromResponse(await service.GetDowntimeReportAsync(query, ct));

    [HttpGet("export/excel")]
    [RequirePermission(OeePermissions.Reports, PermissionAction.Export)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportExcel([FromQuery] OeeReportQuery query, CancellationToken ct)
    {
        var file = await service.ExportDailyReportAsync(query, ct);
        return File(file.Content, file.ContentType, file.FileName);
    }
}
