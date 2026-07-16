using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.ProcurementPlanning;

[Authorize]
[ApiExplorerSettings(GroupName = "procurement-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/procurement-planning/channels")]
public sealed class ProcurementChannelsController(IProcurementPlanningService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SalesChannelDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ProcurementListQuery query, CancellationToken ct) => FromResponse(await service.GetChannelsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<SalesChannelDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetChannelAsync(id, ct));

    [HttpPost]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<SalesChannelDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveSalesChannelRequest request, CancellationToken ct) => FromResponse(await service.CreateChannelAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<SalesChannelDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveSalesChannelRequest request, CancellationToken ct) => FromResponse(await service.UpdateChannelAsync(id, request, ct));

    [HttpPatch("{id:long}/status")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetStatus(long id, [FromBody] ChangeActiveStatusRequest request, CancellationToken ct) => FromResponse(await service.SetChannelStatusAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "procurement-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/procurement-planning/sku-mappings")]
public sealed class ProcurementSkuMappingsController(IProcurementPlanningService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(ProcurementPlanningPermissions.SkuMapping, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ChannelSkuMappingDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ChannelSkuMappingQuery query, CancellationToken ct) => FromResponse(await service.GetSkuMappingsAsync(query, ct));

    [HttpGet("unmapped")]
    [RequirePermission(ProcurementPlanningPermissions.SkuMapping, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<UnmappedChannelSkuDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Unmapped(CancellationToken ct) => FromResponse(await service.GetUnmappedSkusAsync(ct));

    [HttpGet("{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.SkuMapping, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ChannelSkuMappingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetSkuMappingAsync(id, ct));

    [HttpPost]
    [RequirePermission(ProcurementPlanningPermissions.SkuMapping, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ChannelSkuMappingDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveChannelSkuMappingRequest request, CancellationToken ct) => FromResponse(await service.CreateSkuMappingAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.SkuMapping, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ChannelSkuMappingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveChannelSkuMappingRequest request, CancellationToken ct) => FromResponse(await service.UpdateSkuMappingAsync(id, request, ct));

    [HttpPatch("{id:long}/status")]
    [RequirePermission(ProcurementPlanningPermissions.SkuMapping, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetStatus(long id, [FromBody] ChangeActiveStatusRequest request, CancellationToken ct) => FromResponse(await service.SetSkuMappingStatusAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "procurement-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/procurement-planning/sales")]
public sealed class ProcurementSalesController(IProcurementPlanningService service) : ApiControllerBase
{
    private const long MaximumImportBytes = 10 * 1024 * 1024;

    [HttpGet("import-template")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.View)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public IActionResult ImportTemplate()
    {
        var file = service.BuildImportTemplate();
        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpPost("imports/preview")]
    [Consumes("multipart/form-data")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<SalesImportPreviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Preview([FromForm] SalesImportPreviewForm request, CancellationToken ct)
    {
        var content = await ReadImportAsync(request.File, ct);
        return FromResponse(await service.PreviewImportAsync(request.File.FileName, content, ct));
    }

    [HttpPost("imports/confirm")]
    [Consumes("multipart/form-data")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<SalesImportConfirmResultDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Confirm([FromForm] SalesImportConfirmForm request, CancellationToken ct)
    {
        var content = await ReadImportAsync(request.File, ct);
        return FromResponse(await service.ConfirmImportAsync(request.File.FileName, content, request.AllowDuplicate, request.CorrectionReason, ct), StatusCodes.Status201Created);
    }

    [HttpGet("import-batches")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SalesImportBatchDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Batches([FromQuery] SalesImportBatchQuery query, CancellationToken ct) => FromResponse(await service.GetImportBatchesAsync(query, ct));

    [HttpGet("import-batches/{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<SalesImportBatchDetailsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Batch(long id, CancellationToken ct) => FromResponse(await service.GetImportBatchAsync(id, ct));

    [HttpPost("import-batches/{id:long}/cancel")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CancelBatch(long id, [FromBody] CancelSalesImportBatchRequest request, CancellationToken ct) => FromResponse(await service.CancelImportBatchAsync(id, request, ct));

    [HttpPost("manual")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<SalesHistoryDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateManual([FromBody] ManualSalesEntryRequest request, CancellationToken ct) => FromResponse(await service.CreateManualSalesAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("manual/{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<SalesHistoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateManual(long id, [FromBody] ManualSalesEntryRequest request, CancellationToken ct) => FromResponse(await service.UpdateManualSalesAsync(id, request, ct));

    [HttpDelete("manual/{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteManual(long id, CancellationToken ct) => FromResponse(await service.DeleteManualSalesAsync(id, ct));

    [HttpGet("history")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SalesHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> History([FromQuery] SalesHistoryQuery query, CancellationToken ct) => FromResponse(await service.GetSalesHistoryAsync(query, ct));

    [HttpGet("summary")]
    [RequirePermission(ProcurementPlanningPermissions.SalesImport, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductSalesSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] DateOnly fromDate, [FromQuery] DateOnly toDate, CancellationToken ct) => FromResponse(await service.GetSalesSummaryAsync(fromDate, toDate, ct));

    private static async Task<byte[]> ReadImportAsync(IFormFile file, CancellationToken ct)
    {
        if (file.Length <= 0) throw new BadHttpRequestException("An import file is required.");
        if (file.Length > MaximumImportBytes) throw new BadHttpRequestException("Import file size must be 10 MB or less.");
        var extension = Path.GetExtension(file.FileName);
        if (!extension.Equals(".csv", StringComparison.OrdinalIgnoreCase) && !extension.Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            throw new BadHttpRequestException("Only .csv and .xlsx files are allowed.");
        await using var input = file.OpenReadStream();
        using var output = new MemoryStream();
        await input.CopyToAsync(output, ct);
        return output.ToArray();
    }
}

public sealed record SalesImportPreviewForm(IFormFile File);
public sealed record SalesImportConfirmForm(IFormFile File, bool AllowDuplicate = false, string? CorrectionReason = null);

[Authorize]
[ApiExplorerSettings(GroupName = "procurement-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/procurement-planning/boms")]
public sealed class ProcurementBomsController(IProcurementPlanningService service) : ApiControllerBase
{
    [HttpGet("products/{productId:long}")]
    [RequirePermission(ProcurementPlanningPermissions.BomMapping, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductBomDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long productId, CancellationToken ct) => FromResponse(await service.GetProductBomAsync(productId, ct));

    [HttpPut("products/{productId:long}")]
    [RequirePermission(ProcurementPlanningPermissions.BomMapping, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductBomDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Save(long productId, [FromBody] SaveProductBomRequest request, CancellationToken ct) => FromResponse(await service.SaveProductBomAsync(productId, request, ct));

    [HttpGet("issues")]
    [RequirePermission(ProcurementPlanningPermissions.BomMapping, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Issues(CancellationToken ct) => FromResponse(await service.GetBomIssuesAsync(ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "procurement-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/procurement-planning/settings")]
public sealed class ProcurementSettingsController(IProcurementPlanningService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProcurementSettingDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ProcurementSettingQuery query, CancellationToken ct) => FromResponse(await service.GetSettingsAsync(query, ct));

    [HttpGet("items/{itemId:long}")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProcurementSettingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long itemId, CancellationToken ct) => FromResponse(await service.GetSettingByItemAsync(itemId, ct));

    [HttpPut("items/{itemId:long}")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProcurementSettingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Save(long itemId, [FromBody] SaveProcurementSettingRequest request, CancellationToken ct)
    {
        if (itemId != request.ItemId) throw new BadHttpRequestException("Route itemId must match request ItemId.");
        return FromResponse(await service.SaveSettingAsync(request, ct));
    }

    [HttpGet("missing")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Missing(CancellationToken ct) => FromResponse(await service.GetMissingSettingsAsync(ct));

    [HttpPost("lead-time-history")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<LeadTimeHistoryDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddLeadTime([FromBody] CreateLeadTimeHistoryRequest request, CancellationToken ct) => FromResponse(await service.AddLeadTimeHistoryAsync(request, ct), StatusCodes.Status201Created);

    [HttpGet("items/{itemId:long}/lead-time-history")]
    [RequirePermission(ProcurementPlanningPermissions.Settings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<LeadTimeHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> LeadTimeHistory(long itemId, CancellationToken ct) => FromResponse(await service.GetLeadTimeHistoryAsync(itemId, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "procurement-planning")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/procurement-planning/plans")]
public sealed class ProcurementPlansController(IProcurementPlanningService service) : ApiControllerBase
{
    [HttpPost("validate")]
    [RequirePermission(ProcurementPlanningPermissions.GeneratePlan, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PlanningValidationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate([FromBody] PlanningRequest request, CancellationToken ct) => FromResponse(await service.ValidatePlanningAsync(request, ct));

    [HttpPost("preview")]
    [RequirePermission(ProcurementPlanningPermissions.GeneratePlan, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<PlanningPreviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Preview([FromBody] PlanningRequest request, CancellationToken ct) => FromResponse(await service.PreviewPlanningAsync(request, ct));

    [HttpPost("runs")]
    [RequirePermission(ProcurementPlanningPermissions.GeneratePlan, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<PlanningRunDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> SaveRun([FromBody] PlanningRequest request, CancellationToken ct) => FromResponse(await service.SavePlanningRunAsync(request, ct), StatusCodes.Status201Created);

    [HttpGet("runs")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PlanningRunSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Runs([FromQuery] PlanningRunQuery query, CancellationToken ct) => FromResponse(await service.GetPlanningRunsAsync(query, ct));

    [HttpGet("runs/{id:long}")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Run(long id, CancellationToken ct) => FromResponse(await service.GetPlanningRunAsync(id, ct));

    [HttpGet("runs/{id:long}/lines")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PlanningRunLineDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunLines(long id, [FromQuery] PlanningRunLineQuery query, CancellationToken ct) => FromResponse(await service.GetPlanningRunLinesAsync(id, query, ct));

    [HttpPatch("runs/{runId:long}/lines/{lineId:long}")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<PlanningRunLineDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Adjust(long runId, long lineId, [FromBody] UpdatePlanningLineRequest request, CancellationToken ct) => FromResponse(await service.UpdatePlanningLineAsync(runId, lineId, request, ct));

    [HttpPost("runs/{id:long}/finalize")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<PlanningRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Finalize(long id, CancellationToken ct) => FromResponse(await service.FinalizePlanningRunAsync(id, ct));

    [HttpGet("runs/{id:long}/export")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.Export)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Export(long id, CancellationToken ct)
    {
        var file = await service.ExportPlanningRunAsync(id, ct);
        return File(file.Content, file.ContentType, file.FileName);
    }
}
