using Cosmos.Contracts.Common;
using Cosmos.Shared.Responses;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/manufacturing")]
public sealed class ProductionConfigurationController(IProductionWorkspaceService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("shift-capacity/{id:long}/calendar"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<CapacityCalendarContextDto>), 200)]
    public async Task<IActionResult> CalendarContext(long id, [FromQuery] DateOnly businessDate, CancellationToken ct) => FromResponse(await service.CalendarContextAsync(id, businessDate, ct));
    [HttpPost("configuration/{kind}/{id:long}/effectivity"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> EndEffectivity(string kind,long id,ProductionEffectivityRequest r,CancellationToken ct) => FromResponse(await service.EndEffectivityAsync(kind=="bom" ? "invalid" : kind,id,r,ct));
    [HttpPut("shift-capacity/{id:long}/calendar"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Calendar(long id, CapacityCalendarRequest r, CancellationToken ct) => FromResponse(await service.CalendarAsync(id, r, ct));
    [HttpGet("items/{id:long}/configuration"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionConfigurationDto>), 200)]
    public async Task<IActionResult> ItemConfiguration(long id, CancellationToken ct) => FromResponse(await service.ConfigurationAsync(id, "item", ct));
    [HttpGet("work-centres/{id:long}/shifts"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionConfigurationDto>), 200)]
    public async Task<IActionResult> WorkCentreShifts(long id, CancellationToken ct) => FromResponse(await service.ConfigurationAsync(id, "work-centre", ct));
    [HttpGet("work-centres"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionMasterDto>>), 200)]
    public async Task<IActionResult> WorkCentres([FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.MastersAsync("work-centres", q, ct));
    [HttpGet("work-centres/{id:long}"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionMasterDto>), 200)]
    public async Task<IActionResult> WorkCentre(long id, CancellationToken ct) => FromResponse(await service.MasterByIdAsync("work-centres", id, ct));
    [HttpPost("work-centres"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ProductionMasterDto>), 201)]
    public async Task<IActionResult> CreateWorkCentre(WorkCentreRequest r, CancellationToken ct) => FromResponse(await service.WorkCentreAsync(null, r, ct), 201);
    [HttpPut("work-centres/{id:long}"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionMasterDto>), 200)]
    public async Task<IActionResult> UpdateWorkCentre(long id, WorkCentreRequest r, CancellationToken ct) => FromResponse(await service.WorkCentreAsync(id, r, ct));
    [HttpGet("operations"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionMasterDto>>), 200)]
    public async Task<IActionResult> Operations([FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.MastersAsync("operations", q, ct));
    [HttpGet("operations/{id:long}"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionMasterDto>), 200)]
    public async Task<IActionResult> Operation(long id, CancellationToken ct) => FromResponse(await service.MasterByIdAsync("operations", id, ct));
    [HttpPost("operations"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ProductionMasterDto>), 201)]
    public async Task<IActionResult> CreateOperation(OperationRequest r, CancellationToken ct) => FromResponse(await service.OperationAsync(null, r, ct), 201);
    [HttpPut("operations/{id:long}"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionMasterDto>), 200)]
    public async Task<IActionResult> UpdateOperation(long id, OperationRequest r, CancellationToken ct) => FromResponse(await service.OperationAsync(id, r, ct));
    [HttpPost("items/{itemId:long}/routings"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 201)]
    public async Task<IActionResult> Routing(long itemId, ItemRoutingRequest r, CancellationToken ct) => FromResponse(await service.RoutingAsync(itemId, r, ct), 201);
    [HttpPost("items/{itemId:long}/eligibility"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 201)]
    public async Task<IActionResult> Eligibility(long itemId, ItemEligibilityRequest r, CancellationToken ct) => FromResponse(await service.EligibilityAsync(itemId, r, ct), 201);
    [HttpPost("work-centres/{id:long}/shifts"), RequirePermission(ManufacturingPermissions.Configuration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 201)]
    public async Task<IActionResult> Shift(long id, WorkCentreShiftRequest r, CancellationToken ct) => FromResponse(await service.ShiftAsync(id, r, ct), 201);
}

[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/manufacturing/orders")]
public sealed class ProductionOrdersController(IProductionWorkspaceService service) : ProductionWorkspaceApiControllerBase
{
    [HttpPost("{id:long}/amend"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Amend(long id,ProductionOrderAmendRequest r,CancellationToken ct) => FromResponse(await service.AmendAsync(id,r,ct));
    [HttpGet("{id:long}/capacity"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<CapacityFeasibilityDto>), 200)]
    public async Task<IActionResult> Capacity(long id, [FromQuery] DateOnly businessDate, CancellationToken ct) => FromResponse(await service.CapacityAsync(id, businessDate, ct));
    [HttpPost("{id:long}/schedule"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Schedule(long id, CapacityScheduleRequest r, CancellationToken ct) => FromResponse(await service.ScheduleAsync(id, r, ct));
    [HttpGet("{id:long}/context"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionOrderContextDto>), 200)]
    public async Task<IActionResult> Context(long id, CancellationToken ct) => FromResponse(await service.ContextAsync(id, ct));
    [HttpGet("{id:long}/labels"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionOrderLabelsDto>), 200)]
    public async Task<IActionResult> Labels(long id, CancellationToken ct) => FromResponse(await service.OrderLabelsAsync(id, ct));
    [HttpGet, RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionOrderDto>>), 200)]
    public async Task<IActionResult> List([FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.OrdersAsync(q, ct));
    [HttpGet("{id:long}"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionOrderDto>), 200)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.OrderAsync(id, ct));
    [HttpPost, RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ProductionOrderDto>), 201)]
    public async Task<IActionResult> Create(ProductionOrderDraftRequest r, CancellationToken ct) => FromResponse(await service.DraftAsync(null, r, ct), 201);
    [HttpPut("{id:long}"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionOrderDto>), 200)]
    public async Task<IActionResult> Update(long id, ProductionOrderDraftRequest r, CancellationToken ct) => FromResponse(await service.DraftAsync(id, r, ct));
    [HttpPost("{id:long}/release"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Release(long id, ProductionOrderReleaseRequest r, CancellationToken ct) => FromResponse(await service.ReleaseAsync(id, r, ct));
    [HttpPost("{id:long}/completions"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Complete(long id, ProductionCompletionRequest r, CancellationToken ct) => FromResponse(await service.CompleteAsync(id, r, ct));
    [HttpPost("{id:long}/close"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Close(long id, ProductionOrderActionRequest r, CancellationToken ct) => FromResponse(await service.ActionAsync(id, "close", r, ct));
    [HttpPost("{id:long}/cancel"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Cancel(long id, ProductionOrderActionRequest r, CancellationToken ct) => FromResponse(await service.ActionAsync(id, "cancel", r, ct));
    [HttpPost("completions/{completionId:long}/reverse"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Reverse(long completionId, ProductionOrderActionRequest r, CancellationToken ct) => FromResponse(await service.ActionAsync(completionId, "reverse-completion", r, ct));
}

[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/manufacturing")]
public sealed class ProductionPlanningReportsController(IProductionWorkspaceService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("planning/demand-observations"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionDemandObservationDto>>), 200)]
    public async Task<IActionResult> Demand([FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.DemandObservationsAsync(q, ct));
    [HttpPost("planning/demand-observations"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> ObserveDemand(ProductionDemandObservationRequest r, CancellationToken ct) => FromResponse(await service.ObserveDemandAsync(r, ct));
    [HttpPost("planning/materials"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<MaterialFeasibilityDto>), 200)]
    public async Task<IActionResult> MaterialFeasibility(MaterialFeasibilityRequest r, CancellationToken ct) => FromResponse(await service.MaterialsAsync(r, ct));
    [HttpPost("planning/finished"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<FinishedPlanningSnapshot>), 200)]
    public async Task<IActionResult> Finished(FinishedPlanningRequest r, CancellationToken ct) => FromResponse(await service.PlanAsync(r, ct));
    [HttpGet("reports/production"), RequirePermission(ManufacturingPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionReportRow>>), 200)]
    public async Task<IActionResult> Production([FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.ReportAsync("production", q, ct));
    [HttpGet("reports/materials"), RequirePermission(ManufacturingPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionReportRow>>), 200)]
    public async Task<IActionResult> Materials([FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.ReportAsync("materials", q, ct));
    [HttpPost("imports/stage"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportResult>), 201)]
    public async Task<IActionResult> Stage(ProductionImportRequest r, CancellationToken ct) => FromResponse(await service.StageAsync(r, ct), 201);
}
