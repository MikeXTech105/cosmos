using Cosmos.Contracts.Common;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IShipmentOperationsService
{
    Task<ApiResponse<PagedResult<ShipmentSummaryDto>>> GetShipmentsAsync(ShipmentListQuery query, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> GetShipmentAsync(long id, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> CreateManualShipmentAsync(CreateManualShipmentRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> CreateFromDispatchPlanAsync(CreateShipmentFromDispatchPlanRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> TransitionAsync(long id, TransitionShipmentRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> CancelAsync(long id, CancelShipmentRequest request, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<ShipmentPackingSuggestionDto>>> GetPackingSuggestionsAsync(long shipmentId, ShipmentPackingSuggestionRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> SavePackageAsync(long shipmentId, SaveShipmentPackageRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> SaveDocketAsync(long shipmentId, SaveShipmentDocketRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> SaveAppointmentAsync(long shipmentId, SaveShipmentAppointmentRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> AddTrackingEventAsync(long shipmentId, AddShipmentTrackingEventRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> AddDeliveryAttemptAsync(long shipmentId, AddShipmentDeliveryAttemptRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentDto>> CreateReceiptAsync(long shipmentId, CreateShipmentReceiptRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentReturnDto>> CreateReturnAsync(long shipmentId, CreateShipmentReturnRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentReturnDto>> ReceiveReturnAsync(long shipmentReturnId, ReceiveShipmentReturnRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentFreightChargeDto>> SaveFreightChargeAsync(long shipmentId, SaveShipmentFreightChargeRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentFreightChargeDto>> SubmitFreightChargeAsync(long freightChargeId, CancellationToken ct);
    Task<ApiResponse<ShipmentFreightChargeDto>> ApproveFreightChargeAsync(long freightChargeId, ApproveShipmentFreightRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentFreightChargeDto>> RejectFreightChargeAsync(long freightChargeId, RejectShipmentFreightRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentFreightChargeDto>> MarkFreightPaidAsync(long freightChargeId, MarkShipmentFreightPaidRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentFreightChargeDto>> CreateRojmelExpenseAsync(long freightChargeId, CreateShipmentFreightRojmelExpenseRequest request, CancellationToken ct);
    Task<ApiResponse> SetTransporterRoleAsync(Guid partyId, SetTransporterRoleRequest request, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<TransporterPartyDto>>> GetTransportersAsync(string? search, CancellationToken ct);
    Task<ApiResponse<PagedResult<ShipmentReportRowDto>>> GetReportAsync(ShipmentReportQuery query, CancellationToken ct);
    Task<ApiResponse<ShipmentDashboardDto>> GetDashboardAsync(DateOnly? asOfDate, CancellationToken ct);
    Task<ApiResponse<ShipmentHistoricalImportValidationDto>> ValidateHistoricalImportAsync(ValidateShipmentHistoricalImportRequest request, CancellationToken ct);
    Task<ApiResponse<ShipmentHistoricalImportBatchDto>> CommitHistoricalImportAsync(long id, CommitShipmentHistoricalImportRequest request, CancellationToken ct);
    Task<ApiResponse> CancelHistoricalImportAsync(long id, CancelShipmentHistoricalImportRequest request, CancellationToken ct);
    Task<ApiResponse<PagedResult<ShipmentHistoricalImportBatchDto>>> GetHistoricalImportBatchesAsync(ShipmentHistoricalImportBatchQuery query, CancellationToken ct);
}
