using Cosmos.API.Security;
using Cosmos.API.Exports;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Cosmos.API.Controllers.DispatchPlanning;

[Authorize]
[ApiExplorerSettings(GroupName = "dispatch-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/dispatch-planning/settings")]
public sealed class DispatchSkuSettingsController(IDispatchPlanningService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(DispatchPlanningPermissions.SkuSettings, PermissionAction.View)]
    [SwaggerOperation(Summary = "List Dispatch SKU settings")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<DispatchSkuSettingDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] DispatchSkuSettingQuery query, CancellationToken ct) => FromResponse(await service.GetSkuSettingsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(DispatchPlanningPermissions.SkuSettings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<DispatchSkuSettingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetSkuSettingAsync(id, ct));

    [HttpPost]
    [RequirePermission(DispatchPlanningPermissions.SkuSettings, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<DispatchSkuSettingDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveDispatchSkuSettingRequest request, CancellationToken ct) => FromResponse(await service.CreateSkuSettingAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(DispatchPlanningPermissions.SkuSettings, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<DispatchSkuSettingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveDispatchSkuSettingRequest request, CancellationToken ct) => FromResponse(await service.UpdateSkuSettingAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(DispatchPlanningPermissions.SkuSettings, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteSkuSettingAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "dispatch-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/dispatch-planning/imports")]
public sealed class DispatchSnapshotImportsController(IDispatchPlanningService service) : ApiControllerBase
{
    [HttpPost("validate")]
    [RequirePermission(DispatchPlanningPermissions.Imports, PermissionAction.Create)]
    [SwaggerOperation(Summary = "Validate a Dispatch snapshot import adapter payload")]
    [ProducesResponseType(typeof(ApiResponse<DispatchSnapshotImportValidationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate([FromBody] ValidateDispatchSnapshotImportRequest request, CancellationToken ct) => FromResponse(await service.ValidateSnapshotImportAsync(request, ct));

    [HttpPost("{id:long}/commit")]
    [RequirePermission(DispatchPlanningPermissions.Imports, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<DispatchSnapshotImportBatchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Commit(long id, [FromBody] CommitDispatchSnapshotImportRequest request, CancellationToken ct) => FromResponse(await service.CommitSnapshotImportAsync(id, request, ct));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(DispatchPlanningPermissions.Imports, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelDispatchSnapshotImportRequest request, CancellationToken ct) => FromResponse(await service.CancelSnapshotImportAsync(id, request, ct));

    [HttpGet]
    [RequirePermission(DispatchPlanningPermissions.Imports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<DispatchSnapshotImportBatchDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] DispatchSnapshotImportBatchQuery query, CancellationToken ct) => FromResponse(await service.GetSnapshotImportBatchesAsync(query, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "dispatch-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/dispatch-planning/runs")]
public sealed class DispatchPlanningRunsController(IDispatchPlanningService service) : ApiControllerBase
{
    [HttpPost]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.Create)]
    [SwaggerOperation(Summary = "Create a Draft Dispatch Planning run")]
    [ProducesResponseType(typeof(ApiResponse<DispatchPlanningRunDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateDispatchPlanningRunRequest request, CancellationToken ct) => FromResponse(await service.CreateRunAsync(request, ct), StatusCodes.Status201Created);

    [HttpGet]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<DispatchPlanningRunSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] DispatchPlanningRunQuery query, CancellationToken ct) => FromResponse(await service.GetRunsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<DispatchPlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetRunAsync(id, ct));

    [HttpPost("{id:long}/calculate")]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<DispatchPlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Calculate(long id, CancellationToken ct) => FromResponse(await service.CalculateRunAsync(id, ct));

    [HttpGet("{id:long}/recommendations")]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DispatchRecommendationDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Recommendations(long id, [FromQuery] DispatchRecommendationQuery query, CancellationToken ct) => FromResponse(await service.GetRecommendationsAsync(id, query, ct));

    [HttpPatch("{runId:long}/recommendations/{recommendationId:long}")]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<DispatchRecommendationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Override(long runId, long recommendationId, [FromBody] UpdateDispatchRecommendationRequest request, CancellationToken ct) => FromResponse(await service.OverrideRecommendationAsync(runId, recommendationId, request, ct));

    [HttpPost("{id:long}/allocate")]
    [RequirePermission(DispatchPlanningPermissions.Allocation, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<DispatchPlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Allocate(long id, [FromBody] AllocateDispatchPlanningRunRequest request, CancellationToken ct) => FromResponse(await service.AllocateAsync(id, request, ct));

    [HttpPost("{id:long}/finalize")]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<DispatchPlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Finalize(long id, CancellationToken ct) => FromResponse(await service.FinalizeAsync(id, ct));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(DispatchPlanningPermissions.PlanningRuns, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse<DispatchPlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelDispatchPlanningRunRequest request, CancellationToken ct) => FromResponse(await service.CancelAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "dispatch-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[Route("api/v1/dispatch-planning/reports")]
public sealed class DispatchPlanningReportsController(IDispatchPlanningService service) : ApiControllerBase
{
    [HttpGet("recommendations")]
    [RequirePermission(DispatchPlanningPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<DispatchRecommendationReportRowDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Recommendations([FromQuery] DispatchRecommendationReportQuery query, CancellationToken ct) => FromResponse(await service.GetRecommendationReportAsync(query, ct));

    [HttpGet("recommendations/export")]
    [Produces("text/csv")]
    [RequirePermission(DispatchPlanningPermissions.Reports, PermissionAction.Export)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportRecommendations([FromQuery] DispatchRecommendationReportQuery query, CancellationToken ct)
    {
        var result = await service.GetRecommendationReportAsync(query with { PageNumber = 1, PageSize = 500 }, ct);
        return CsvExport.Create(result.Data?.Items ?? Array.Empty<DispatchRecommendationReportRowDto>(), $"dispatch-recommendations-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }
}
