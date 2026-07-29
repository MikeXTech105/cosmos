using Cosmos.API.Exports;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Cosmos.API.Controllers.ShipmentOperations;

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/shipment-operations/shipments")]
public sealed class ShipmentsController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ShipmentSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ShipmentListQuery query, CancellationToken ct) => FromResponse(await service.GetShipmentsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetShipmentAsync(id, ct));

    [HttpPost("manual")]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.Create)]
    [SwaggerOperation(Summary = "Create a manual shipment without changing inventory")]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateManual([FromBody] CreateManualShipmentRequest request, CancellationToken ct) => FromResponse(await service.CreateManualShipmentAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("from-dispatch-planning")]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.Create)]
    [SwaggerOperation(Summary = "Create a shipment from remaining finalized Dispatch Planning allocation")]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateFromDispatchPlan([FromBody] CreateShipmentFromDispatchPlanRequest request, CancellationToken ct) => FromResponse(await service.CreateFromDispatchPlanAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("{id:long}/transition")]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.Edit)]
    [SwaggerOperation(Summary = "Run a centrally validated shipment workflow transition")]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Transition(long id, [FromBody] TransitionShipmentRequest request, CancellationToken ct) => FromResponse(await service.TransitionAsync(id, request, ct));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelShipmentRequest request, CancellationToken ct) => FromResponse(await service.CancelAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[Route("api/v1/shipment-operations/shipments/{shipmentId:long}")]
public sealed class ShipmentExecutionController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpGet("packing-suggestions")]
    [RequirePermission(ShipmentOperationsPermissions.Packing, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ShipmentPackingSuggestionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PackingSuggestions(long shipmentId, [FromQuery] ShipmentPackingSuggestionRequest request, CancellationToken ct) => FromResponse(await service.GetPackingSuggestionsAsync(shipmentId, request, ct));

    [HttpPost("packages")]
    [RequirePermission(ShipmentOperationsPermissions.Packing, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SavePackage(long shipmentId, [FromBody] SaveShipmentPackageRequest request, CancellationToken ct) => FromResponse(await service.SavePackageAsync(shipmentId, request, ct));

    [HttpPost("dockets")]
    [RequirePermission(ShipmentOperationsPermissions.Dockets, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveDocket(long shipmentId, [FromBody] SaveShipmentDocketRequest request, CancellationToken ct) => FromResponse(await service.SaveDocketAsync(shipmentId, request, ct));

    [HttpPost("appointments")]
    [RequirePermission(ShipmentOperationsPermissions.Appointments, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveAppointment(long shipmentId, [FromBody] SaveShipmentAppointmentRequest request, CancellationToken ct) => FromResponse(await service.SaveAppointmentAsync(shipmentId, request, ct));

    [HttpPost("tracking-events")]
    [RequirePermission(ShipmentOperationsPermissions.Tracking, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddTrackingEvent(long shipmentId, [FromBody] AddShipmentTrackingEventRequest request, CancellationToken ct) => FromResponse(await service.AddTrackingEventAsync(shipmentId, request, ct));

    [HttpPost("delivery-attempts")]
    [RequirePermission(ShipmentOperationsPermissions.Tracking, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddDeliveryAttempt(long shipmentId, [FromBody] AddShipmentDeliveryAttemptRequest request, CancellationToken ct) => FromResponse(await service.AddDeliveryAttemptAsync(shipmentId, request, ct));

    [HttpPost("receipts")]
    [RequirePermission(ShipmentOperationsPermissions.Receipts, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateReceipt(long shipmentId, [FromBody] CreateShipmentReceiptRequest request, CancellationToken ct) => FromResponse(await service.CreateReceiptAsync(shipmentId, request, ct));

    [HttpPost("returns")]
    [RequirePermission(ShipmentOperationsPermissions.Returns, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentReturnDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateReturn(long shipmentId, [FromBody] CreateShipmentReturnRequest request, CancellationToken ct) => FromResponse(await service.CreateReturnAsync(shipmentId, request, ct), StatusCodes.Status201Created);

    [HttpPost("freight-charges")]
    [RequirePermission(ShipmentOperationsPermissions.Freight, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentFreightChargeDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> SaveFreight(long shipmentId, [FromBody] SaveShipmentFreightChargeRequest request, CancellationToken ct) => FromResponse(await service.SaveFreightChargeAsync(shipmentId, request, ct), StatusCodes.Status201Created);
}

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[Route("api/v1/shipment-operations/returns")]
public sealed class ShipmentReturnsController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpPost("{id:long}/receive")]
    [RequirePermission(ShipmentOperationsPermissions.Returns, PermissionAction.Edit)]
    [SwaggerOperation(Summary = "Receive return and restock only the declared restockable quantity")]
    [ProducesResponseType(typeof(ApiResponse<ShipmentReturnDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Receive(long id, [FromBody] ReceiveShipmentReturnRequest request, CancellationToken ct) => FromResponse(await service.ReceiveReturnAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[Route("api/v1/shipment-operations/freight-charges")]
public sealed class ShipmentFreightController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpPost("{id:long}/submit")]
    [RequirePermission(ShipmentOperationsPermissions.Freight, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentFreightChargeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit(long id, CancellationToken ct) => FromResponse(await service.SubmitFreightChargeAsync(id, ct));

    [HttpPost("{id:long}/approve")]
    [RequirePermission(ShipmentOperationsPermissions.Freight, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentFreightChargeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(long id, [FromBody] ApproveShipmentFreightRequest request, CancellationToken ct) => FromResponse(await service.ApproveFreightChargeAsync(id, request, ct));

    [HttpPost("{id:long}/reject")]
    [RequirePermission(ShipmentOperationsPermissions.Freight, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentFreightChargeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(long id, [FromBody] RejectShipmentFreightRequest request, CancellationToken ct) => FromResponse(await service.RejectFreightChargeAsync(id, request, ct));

    [HttpPost("{id:long}/mark-paid")]
    [RequirePermission(ShipmentOperationsPermissions.Freight, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentFreightChargeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkPaid(long id, [FromBody] MarkShipmentFreightPaidRequest request, CancellationToken ct) => FromResponse(await service.MarkFreightPaidAsync(id, request, ct));

    [HttpPost("{id:long}/rojmel-expense")]
    [RequirePermission(ShipmentOperationsPermissions.Freight, PermissionAction.Approve)]
    [SwaggerOperation(Summary = "Explicitly post approved freight to Rojmel; approval alone never posts an expense")]
    [ProducesResponseType(typeof(ApiResponse<ShipmentFreightChargeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRojmelExpense(long id, [FromBody] CreateShipmentFreightRojmelExpenseRequest request, CancellationToken ct) => FromResponse(await service.CreateRojmelExpenseAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[Route("api/v1/shipment-operations/transporters")]
public sealed class ShipmentTransportersController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<TransporterPartyDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? search, CancellationToken ct) => FromResponse(await service.GetTransportersAsync(search, ct));

    [HttpPut("{partyId:guid}")]
    [RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetRole(Guid partyId, [FromBody] SetTransporterRoleRequest request, CancellationToken ct) => FromResponse(await service.SetTransporterRoleAsync(partyId, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[Route("api/v1/shipment-operations/reports")]
public sealed class ShipmentReportsController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(ShipmentOperationsPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ShipmentReportRowDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ShipmentReportQuery query, CancellationToken ct) => FromResponse(await service.GetReportAsync(query, ct));

    [HttpGet("dashboard")]
    [RequirePermission(ShipmentOperationsPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentDashboardDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Dashboard([FromQuery] DateOnly? asOfDate, CancellationToken ct) => FromResponse(await service.GetDashboardAsync(asOfDate, ct));

    [HttpGet("export")]
    [RequirePermission(ShipmentOperationsPermissions.Reports, PermissionAction.Export)]
    [Produces("text/csv")]
    public async Task<IActionResult> Export([FromQuery] ShipmentReportQuery query, CancellationToken ct)
    {
        var response = await service.GetReportAsync(query with { PageNumber = 1, PageSize = 500 }, ct);
        return CsvExport.Create(response.Data?.Items ?? Array.Empty<ShipmentReportRowDto>(), $"shipment-operations-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }
}

[Authorize]
[ApiExplorerSettings(GroupName = "shipment-operations")]
[Route("api/v1/shipment-operations/imports")]
public sealed class ShipmentHistoricalImportsController(IShipmentOperationsService service) : ApiControllerBase
{
    [HttpPost("validate")]
    [RequirePermission(ShipmentOperationsPermissions.Imports, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentHistoricalImportValidationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate([FromBody] ValidateShipmentHistoricalImportRequest request, CancellationToken ct) => FromResponse(await service.ValidateHistoricalImportAsync(request, ct));

    [HttpPost("{id:long}/commit")]
    [RequirePermission(ShipmentOperationsPermissions.Imports, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ShipmentHistoricalImportBatchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Commit(long id, [FromBody] CommitShipmentHistoricalImportRequest request, CancellationToken ct) => FromResponse(await service.CommitHistoricalImportAsync(id, request, ct));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(ShipmentOperationsPermissions.Imports, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelShipmentHistoricalImportRequest request, CancellationToken ct) => FromResponse(await service.CancelHistoricalImportAsync(id, request, ct));

    [HttpGet]
    [RequirePermission(ShipmentOperationsPermissions.Imports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ShipmentHistoricalImportBatchDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ShipmentHistoricalImportBatchQuery query, CancellationToken ct) => FromResponse(await service.GetHistoricalImportBatchesAsync(query, ct));
}
