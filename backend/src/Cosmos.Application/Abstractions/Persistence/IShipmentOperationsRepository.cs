using Cosmos.Contracts.Common;
using Cosmos.Contracts.ShipmentOperations;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IShipmentOperationsRepository
{
    Task<PagedResult<ShipmentSummaryDto>> GetShipmentsAsync(ShipmentListQuery query, CancellationToken ct);
    Task<ShipmentDto?> GetShipmentAsync(long id, CancellationToken ct);
    Task<long> CreateManualShipmentAsync(CreateManualShipmentRequest request, long? userId, CancellationToken ct);
    Task<long> CreateFromDispatchPlanAsync(CreateShipmentFromDispatchPlanRequest request, long? userId, CancellationToken ct);
    Task TransitionShipmentAsync(long id, int sourceStatus, int targetStatus, string? remarks, long? userId, CancellationToken ct);
    Task CancelShipmentAsync(long id, string reason, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<ShipmentPackingSuggestionInput>> GetPackingSuggestionInputsAsync(long shipmentId, CancellationToken ct);
    Task SavePackageAsync(long shipmentId, SaveShipmentPackageRequest request, long? userId, CancellationToken ct);
    Task SaveDocketAsync(long shipmentId, SaveShipmentDocketRequest request, long? userId, CancellationToken ct);
    Task SaveAppointmentAsync(long shipmentId, SaveShipmentAppointmentRequest request, long? userId, CancellationToken ct);
    Task AddTrackingEventAsync(long shipmentId, AddShipmentTrackingEventRequest request, long? userId, CancellationToken ct);
    Task AddDeliveryAttemptAsync(long shipmentId, AddShipmentDeliveryAttemptRequest request, long? userId, CancellationToken ct);
    Task CreateReceiptAsync(long shipmentId, CreateShipmentReceiptRequest request, long? userId, CancellationToken ct);
    Task<long> CreateReturnAsync(long shipmentId, CreateShipmentReturnRequest request, long? userId, CancellationToken ct);
    Task<ShipmentReturnDto?> GetReturnAsync(long shipmentReturnId, CancellationToken ct);
    Task ReceiveReturnAsync(long shipmentReturnId, ReceiveShipmentReturnRequest request, long? userId, CancellationToken ct);
    Task<long> SaveFreightChargeAsync(long shipmentId, SaveShipmentFreightChargeRequest request, long? userId, CancellationToken ct);
    Task<ShipmentFreightChargeDto?> GetFreightChargeAsync(long freightChargeId, CancellationToken ct);
    Task SubmitFreightChargeAsync(long freightChargeId, long? userId, CancellationToken ct);
    Task ApproveFreightChargeAsync(long freightChargeId, string? approvalNotes, long? userId, CancellationToken ct);
    Task RejectFreightChargeAsync(long freightChargeId, string reason, long? userId, CancellationToken ct);
    Task MarkFreightPaidAsync(long freightChargeId, MarkShipmentFreightPaidRequest request, long? userId, CancellationToken ct);
    Task<ShipmentFreightRojmelReservationDto> ReserveFreightRojmelAsync(long freightChargeId, long? userId, CancellationToken ct);
    Task CompleteFreightRojmelAsync(long freightChargeId, Guid reservationToken, long rojmelTransactionId, long? userId, CancellationToken ct);
    Task ReleaseFreightRojmelAsync(long freightChargeId, Guid reservationToken, long? userId, CancellationToken ct);
    Task SetTransporterRoleAsync(Guid partyId, bool isTransporter, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<TransporterPartyDto>> GetTransportersAsync(string? search, CancellationToken ct);
    Task<PagedResult<ShipmentReportRowDto>> GetShipmentReportAsync(ShipmentReportQuery query, CancellationToken ct);
    Task<ShipmentDashboardDto> GetDashboardAsync(DateOnly? asOfDate, CancellationToken ct);
    Task<ShipmentHistoricalImportValidationDto> ValidateHistoricalImportAsync(ValidateShipmentHistoricalImportRequest request, long? userId, string correlationId, CancellationToken ct);
    Task<ShipmentHistoricalImportBatchDto> CommitHistoricalImportAsync(long id, CommitShipmentHistoricalImportRequest request, long? userId, CancellationToken ct);
    Task CancelHistoricalImportAsync(long id, string reason, long? userId, CancellationToken ct);
    Task<PagedResult<ShipmentHistoricalImportBatchDto>> GetHistoricalImportBatchesAsync(ShipmentHistoricalImportBatchQuery query, CancellationToken ct);
}

public sealed record ShipmentPackingSuggestionInput(
    long ShipmentItemId,
    long ItemId,
    string ItemCode,
    string ItemName,
    decimal PlannedQuantity,
    decimal PackedQuantity,
    decimal UnitsPerBox,
    decimal Length,
    decimal Width,
    decimal Height,
    decimal GrossWeight,
    decimal NetWeight,
    decimal? VolumetricDivisor);

public sealed record ShipmentFreightRojmelReservationDto(
    long FreightChargeId,
    long ShipmentId,
    Guid ReservationToken,
    decimal Amount,
    string CurrencyCode,
    string ShipmentNumber,
    string? TransporterInvoiceNumber);
