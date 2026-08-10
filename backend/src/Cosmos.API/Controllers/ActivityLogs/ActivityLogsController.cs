using Cosmos.API.Exports;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.ActivityLogs;

/// <summary>Lists and exports permanent business and security activity records.</summary>
[Authorize]
[ApiExplorerSettings(GroupName = "activity-logs")]
[Route("api/v1/activity-logs")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class ActivityLogsController(IActivityLogService service) : ApiControllerBase
{
    /// <summary>Lists permanent activity records with server-side filtering, paging, and safe sorting.</summary>
    [HttpGet]
    [RequirePermission(ActivityLogPermissions.ActivityLogs, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ActivityLogListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ActivityLogListQuery query, CancellationToken ct) =>
        FromResponse(await service.GetListAsync(query, ct));

    /// <summary>Exports matching permanent activity records as UTF-8 CSV. The server caps the export at 50,000 rows.</summary>
    [HttpGet("export")]
    [RequirePermission(ActivityLogPermissions.ActivityLogs, PermissionAction.Export)]
    [Produces("text/csv")]
    public async Task<IActionResult> Export([FromQuery] ActivityLogExportRequest request, [FromQuery] string? format, CancellationToken ct)
    {
        CsvExport.RequireCsv(format);
        var result = await service.ExportAsync(request, ct);
        return CsvExport.Create(result.Data ?? Array.Empty<ActivityLogExportDto>(), $"cosmos_activity_logs_{DateTime.UtcNow:yyyy-MM-dd}.csv");
    }

    /// <summary>Gets a safe activity detail, including sanitized before/after values and changed fields where available.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission(ActivityLogPermissions.ActivityLogs, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ActivityLogDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) =>
        FromResponse(await service.GetByIdAsync(id, ct));
}
