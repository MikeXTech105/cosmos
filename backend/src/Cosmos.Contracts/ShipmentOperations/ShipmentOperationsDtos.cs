using Cosmos.Contracts.Common;
using Cosmos.Domain.ShipmentOperations;

namespace Cosmos.Contracts.ShipmentOperations;

public sealed record ShipmentListQuery(
    string? Search = null,
    long? ChannelId = null,
    long? WarehouseId = null,
    ShipmentStatus? Status = null,
    ShipmentSourceType? SourceType = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record ShipmentSummaryDto(
    long Id,
    string ShipmentNumber,
    ShipmentSourceType SourceType,
    long ChannelId,
    string ChannelCode,
    long WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    DateOnly ShipmentDate,
    ShipmentStatus Status,
    ShipmentPriority Priority,
    string? InvoiceNumber,
    string? StoNumber,
    string? TransporterName,
    decimal TotalPlannedQuantity,
    decimal TotalPackedQuantity,
    decimal TotalDispatchedQuantity,
    decimal TotalReceivedQuantity,
    decimal TotalReturnedQuantity,
    int TotalPackages,
    DateTime CreatedAtUtc,
    int TotalCount = 0)
{
    public ShipmentSummaryDto() : this(0, string.Empty, ShipmentSourceType.Manual, 0, string.Empty, 0, string.Empty, string.Empty,
        default, ShipmentStatus.Draft, ShipmentPriority.Normal, null, null, null, 0, 0, 0, 0, 0, 0, default, 0) { }
}

public sealed record ShipmentDto(
    long Id,
    string ShipmentNumber,
    ShipmentSourceType SourceType,
    long ChannelId,
    string ChannelCode,
    string ChannelName,
    long WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    long? DispatchPlanningRunId,
    DateOnly ShipmentDate,
    DateOnly? ExpectedDeliveryDate,
    long? InvoiceId,
    string? InvoiceNumber,
    string? StoNumber,
    string? MarketplaceReference,
    string? ExternalShipmentReference,
    Guid? TransporterPartyId,
    string? TransporterName,
    ShipmentDispatchMode DispatchMode,
    ShipmentStatus Status,
    ShipmentPriority Priority,
    string? ManualReason,
    string? Notes,
    decimal TotalPlannedQuantity,
    decimal TotalPackedQuantity,
    decimal TotalDispatchedQuantity,
    decimal TotalReceivedQuantity,
    decimal TotalReturnedQuantity,
    int TotalPackages,
    decimal TotalGrossWeight,
    decimal TotalVolumetricWeight,
    decimal TotalChargeableWeight,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? UpdatedAtUtc,
    long? UpdatedBy,
    DateTime? PackedAtUtc,
    long? PackedBy,
    DateTime? DispatchedAtUtc,
    long? DispatchedBy,
    DateTime? DeliveredAtUtc,
    long? DeliveredBy,
    DateTime? ClosedAtUtc,
    long? ClosedBy,
    DateTime? CancelledAtUtc,
    long? CancelledBy,
    string? CancellationReason,
    IReadOnlyCollection<ShipmentItemDto> Items,
    IReadOnlyCollection<ShipmentPackageDto> Packages,
    IReadOnlyCollection<ShipmentDocketDto> Dockets,
    IReadOnlyCollection<ShipmentAppointmentDto> Appointments,
    IReadOnlyCollection<ShipmentTrackingEventDto> TrackingEvents,
    IReadOnlyCollection<ShipmentDeliveryAttemptDto> DeliveryAttempts,
    IReadOnlyCollection<ShipmentReceiptDto> Receipts,
    IReadOnlyCollection<ShipmentReturnDto> Returns,
    IReadOnlyCollection<ShipmentFreightChargeDto> FreightCharges);

public sealed record ShipmentItemDto(
    long Id,
    long ShipmentId,
    long ItemId,
    long? ChannelItemMappingId,
    long? DispatchPlanningAllocationId,
    decimal PlannedQuantity,
    decimal PackedQuantity,
    decimal DispatchedQuantity,
    decimal ReceivedQuantity,
    decimal RejectedQuantity,
    decimal DamagedQuantity,
    decimal ShortQuantity,
    decimal ReturnedQuantity,
    decimal RestockableReturnQuantity,
    decimal NonRestockableReturnQuantity,
    decimal UnitsPerBoxSnapshot,
    long? PackagingProfileId,
    string? ChannelSkuSnapshot,
    string ItemCodeSnapshot,
    string ItemNameSnapshot,
    string? Notes);

public sealed record ShipmentPackageDto(
    long Id,
    long ShipmentId,
    string PackageNumber,
    string PackageType,
    long? PackagingProfileId,
    decimal Length,
    decimal Width,
    decimal Height,
    string DimensionUnit,
    decimal GrossWeight,
    decimal NetWeight,
    string WeightUnit,
    decimal? VolumetricDivisor,
    decimal VolumetricWeight,
    decimal ChargeableWeight,
    string? TrackingLabel,
    string? Barcode,
    string? SealNumber,
    bool IsMixedPackage,
    string? Notes,
    IReadOnlyCollection<ShipmentPackageItemDto> Items);

public sealed record ShipmentPackageItemDto(long Id, long ShipmentPackageId, long ShipmentItemId, decimal Quantity, string ItemCode, string ItemName);

public sealed record ShipmentDocketDto(
    long Id,
    long ShipmentId,
    Guid TransporterPartyId,
    string TransporterName,
    string DocketNumber,
    DateOnly DocketDate,
    ShipmentDispatchMode DispatchMode,
    string? TrackingUrl,
    string? VehicleNumber,
    string? DriverName,
    string? DriverMobile,
    string? PickupReference,
    DateOnly? EstimatedDeliveryDate,
    DateTime? ActualPickupDateUtc,
    string? Notes,
    DateTime CreatedAtUtc);

public sealed record ShipmentAppointmentDto(
    long Id,
    long ShipmentId,
    string? AppointmentReference,
    DateOnly AppointmentDate,
    TimeOnly? TimeFrom,
    TimeOnly? TimeTo,
    ShipmentAppointmentStatus AppointmentStatus,
    int AttemptNumber,
    DateTime? RequestedAtUtc,
    long? RequestedBy,
    DateTime? BookedAtUtc,
    long? BookedBy,
    DateTime? CompletedAtUtc,
    DateTime? CancelledAtUtc,
    string? CancellationReason,
    string? Remarks);

public sealed record ShipmentTrackingEventDto(
    long Id,
    long ShipmentId,
    ShipmentTrackingEventType EventType,
    string? EventStatus,
    DateTime EventDateTimeUtc,
    string? Location,
    string? ReferenceNumber,
    string Source,
    string? Remarks,
    DateTime CreatedAtUtc,
    long? CreatedBy);

public sealed record ShipmentDeliveryAttemptDto(
    long Id,
    long ShipmentId,
    int AttemptNumber,
    DateTime AttemptDateTimeUtc,
    ShipmentDeliveryAttemptOutcome Outcome,
    string? ReasonCode,
    string? Remarks,
    DateOnly? NextAttemptDate,
    DateTime CreatedAtUtc,
    long? CreatedBy);

public sealed record ShipmentReceiptDto(
    long Id,
    long ShipmentId,
    string ReceiptNumber,
    DateOnly ReceiptDate,
    string? MarketplaceReceiptReference,
    string? ReceivedByName,
    string? ProofAttachmentUrl,
    string? Notes,
    IReadOnlyCollection<ShipmentReceiptItemDto> Items);

public sealed record ShipmentReceiptItemDto(
    long Id,
    long ShipmentReceiptId,
    long ShipmentItemId,
    decimal ReceivedQuantity,
    decimal RejectedQuantity,
    decimal DamagedQuantity,
    decimal ShortQuantity,
    string? ReasonCode,
    string? Notes);

public sealed record ShipmentReturnDto(
    long Id,
    string ReturnNumber,
    long ShipmentId,
    DateOnly ReturnDate,
    string ReturnReason,
    ShipmentReturnStatus Status,
    Guid? TransporterPartyId,
    string? TransporterName,
    string? DocketNumber,
    DateOnly? ExpectedReturnDate,
    DateOnly? ReceivedBackDate,
    string? Notes,
    IReadOnlyCollection<ShipmentReturnItemDto> Items);

public sealed record ShipmentReturnItemDto(
    long Id,
    long ShipmentReturnId,
    long ShipmentItemId,
    decimal ReturnQuantity,
    decimal ReceivedBackQuantity,
    decimal RestockableQuantity,
    decimal DamagedQuantity,
    decimal NonRestockableQuantity,
    string? ReasonCode,
    string? Notes);

public sealed record ShipmentFreightChargeDto(
    long Id,
    long ShipmentId,
    Guid? TransporterPartyId,
    string? TransporterName,
    ShipmentFreightChargeType ChargeType,
    string CurrencyCode,
    decimal BaseFreight,
    decimal FuelSurcharge,
    decimal HandlingCharge,
    decimal LoadingCharge,
    decimal UnloadingCharge,
    decimal AppointmentCharge,
    decimal ReturnFreight,
    decimal OtherCharge,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal TotalCharge,
    decimal ActualWeight,
    decimal VolumetricWeight,
    decimal ChargeableWeight,
    decimal? RatePerWeightUnit,
    string? TransporterInvoiceNumber,
    DateOnly? TransporterInvoiceDate,
    ShipmentFreightStatus Status,
    string? ApprovalNotes,
    DateTime? ApprovedAtUtc,
    long? ApprovedBy,
    DateTime? PaidAtUtc,
    long? PaidBy,
    long? RojmelTransactionId);

public sealed record CreateShipmentItemRequest(
    long ItemId,
    decimal PlannedQuantity,
    long? ChannelItemMappingId = null,
    long? DispatchPlanningAllocationId = null,
    long? PackagingProfileId = null,
    string? Notes = null);

public sealed record CreateManualShipmentRequest(
    long ChannelId,
    long WarehouseId,
    DateOnly ShipmentDate,
    IReadOnlyCollection<CreateShipmentItemRequest> Items,
    DateOnly? ExpectedDeliveryDate = null,
    Guid? TransporterPartyId = null,
    long? InvoiceId = null,
    string? InvoiceNumber = null,
    string? StoNumber = null,
    string? MarketplaceReference = null,
    string? ExternalShipmentReference = null,
    ShipmentDispatchMode DispatchMode = ShipmentDispatchMode.Road,
    ShipmentPriority Priority = ShipmentPriority.Normal,
    string? ManualReason = null,
    string? Notes = null);

public sealed record DispatchAllocationShipmentLineRequest(long DispatchPlanningAllocationId, decimal PlannedQuantity);

public sealed record CreateShipmentFromDispatchPlanRequest(
    long DispatchPlanningRunId,
    long WarehouseId,
    IReadOnlyCollection<DispatchAllocationShipmentLineRequest> Allocations,
    DateOnly ShipmentDate,
    DateOnly? ExpectedDeliveryDate = null,
    Guid? TransporterPartyId = null,
    long? InvoiceId = null,
    string? InvoiceNumber = null,
    string? StoNumber = null,
    string? Notes = null);

public sealed record TransitionShipmentRequest(ShipmentStatus TargetStatus, string? Remarks = null);
public sealed record CancelShipmentRequest(string Reason);

public sealed record SaveShipmentPackageRequest(
    string PackageNumber,
    string PackageType,
    IReadOnlyCollection<SaveShipmentPackageItemRequest> Items,
    long? PackagingProfileId = null,
    decimal Length = 0,
    decimal Width = 0,
    decimal Height = 0,
    string DimensionUnit = "CM",
    decimal GrossWeight = 0,
    decimal NetWeight = 0,
    string WeightUnit = "KG",
    decimal? VolumetricDivisor = null,
    string? TrackingLabel = null,
    string? Barcode = null,
    string? SealNumber = null,
    bool IsMixedPackage = false,
    string? Notes = null);

public sealed record SaveShipmentPackageItemRequest(long ShipmentItemId, decimal Quantity);
public sealed record ShipmentPackingSuggestionRequest(bool AllowMixedPackages = false, bool IncludeLoosePackage = true);
public sealed record ShipmentPackingSuggestionDto(long ShipmentItemId, long ItemId, string ItemCode, string ItemName, decimal Quantity, decimal UnitsPerBox, int SuggestedPackageCount, decimal SuggestedLooseQuantity, decimal Length, decimal Width, decimal Height, decimal GrossWeight, decimal NetWeight, decimal? VolumetricDivisor);

public sealed record SaveShipmentDocketRequest(
    Guid TransporterPartyId,
    string DocketNumber,
    DateOnly DocketDate,
    ShipmentDispatchMode DispatchMode,
    string? TrackingUrl = null,
    string? VehicleNumber = null,
    string? DriverName = null,
    string? DriverMobile = null,
    string? PickupReference = null,
    DateOnly? EstimatedDeliveryDate = null,
    DateTime? ActualPickupDateUtc = null,
    string? Notes = null);

public sealed record SaveShipmentAppointmentRequest(
    DateOnly AppointmentDate,
    ShipmentAppointmentStatus AppointmentStatus,
    string? AppointmentReference = null,
    TimeOnly? TimeFrom = null,
    TimeOnly? TimeTo = null,
    string? Remarks = null,
    string? CancellationReason = null);

public sealed record AddShipmentTrackingEventRequest(
    ShipmentTrackingEventType EventType,
    DateTime EventDateTimeUtc,
    string Source,
    string? EventStatus = null,
    string? Location = null,
    string? ReferenceNumber = null,
    string? Remarks = null);

public sealed record AddShipmentDeliveryAttemptRequest(
    DateTime AttemptDateTimeUtc,
    ShipmentDeliveryAttemptOutcome Outcome,
    string? ReasonCode = null,
    string? Remarks = null,
    DateOnly? NextAttemptDate = null);

public sealed record CreateShipmentReceiptRequest(
    DateOnly ReceiptDate,
    IReadOnlyCollection<CreateShipmentReceiptItemRequest> Items,
    string? MarketplaceReceiptReference = null,
    string? ReceivedByName = null,
    string? ProofAttachmentUrl = null,
    string? Notes = null);

public sealed record CreateShipmentReceiptItemRequest(long ShipmentItemId, decimal ReceivedQuantity, decimal RejectedQuantity, decimal DamagedQuantity, decimal ShortQuantity, string? ReasonCode = null, string? Notes = null);

public sealed record CreateShipmentReturnRequest(
    DateOnly ReturnDate,
    string ReturnReason,
    IReadOnlyCollection<CreateShipmentReturnItemRequest> Items,
    Guid? TransporterPartyId = null,
    string? DocketNumber = null,
    DateOnly? ExpectedReturnDate = null,
    string? Notes = null);

public sealed record CreateShipmentReturnItemRequest(long ShipmentItemId, decimal ReturnQuantity, string? ReasonCode = null, string? Notes = null);
public sealed record ReceiveShipmentReturnRequest(DateOnly ReceivedBackDate, IReadOnlyCollection<ReceiveShipmentReturnItemRequest> Items, string? Notes = null);
public sealed record ReceiveShipmentReturnItemRequest(long ShipmentReturnItemId, decimal ReceivedBackQuantity, decimal RestockableQuantity, decimal DamagedQuantity, decimal NonRestockableQuantity, string? ReasonCode = null, string? Notes = null);

public sealed record SaveShipmentFreightChargeRequest(
    ShipmentFreightChargeType ChargeType,
    string CurrencyCode,
    decimal BaseFreight,
    decimal FuelSurcharge = 0,
    decimal HandlingCharge = 0,
    decimal LoadingCharge = 0,
    decimal UnloadingCharge = 0,
    decimal AppointmentCharge = 0,
    decimal ReturnFreight = 0,
    decimal OtherCharge = 0,
    decimal TaxAmount = 0,
    decimal DiscountAmount = 0,
    Guid? TransporterPartyId = null,
    decimal ActualWeight = 0,
    decimal VolumetricWeight = 0,
    decimal ChargeableWeight = 0,
    decimal? RatePerWeightUnit = null,
    string? TransporterInvoiceNumber = null,
    DateOnly? TransporterInvoiceDate = null);

public sealed record ApproveShipmentFreightRequest(string? ApprovalNotes = null);
public sealed record RejectShipmentFreightRequest(string Reason);
public sealed record MarkShipmentFreightPaidRequest(DateTime PaidAtUtc, string? PaymentReference = null);
public sealed record CreateShipmentFreightRojmelExpenseRequest(long WalletId, DateOnly TransactionDate, long? CategoryId, string? PaymentMode = null, string? Description = null);

public sealed record SetTransporterRoleRequest(bool IsTransporter);
public sealed record TransporterPartyDto(Guid PartyId, string PartyCode, string PartyName, string? MobileNo, string? Email, bool IsTransporter);

public sealed record ShipmentReportQuery(
    long? ChannelId = null,
    long? WarehouseId = null,
    ShipmentStatus? Status = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int PageNumber = 1,
    int PageSize = 200);

public sealed record ShipmentReportRowDto(string ShipmentNumber, DateOnly ShipmentDate, string ChannelCode, string WarehouseCode, string ItemCode, string ItemName, decimal PlannedQuantity, decimal DispatchedQuantity, decimal ReceivedQuantity, decimal ReturnedQuantity, ShipmentStatus Status, string? DocketNumber, decimal FreightAmount, int TotalCount = 0)
{
    public ShipmentReportRowDto() : this(string.Empty, default, string.Empty, string.Empty, string.Empty, string.Empty, 0, 0, 0, 0, ShipmentStatus.Draft, null, 0, 0) { }
}

public sealed record ShipmentDashboardDto(int DraftCount, int ReadyForDispatchCount, int InTransitCount, int DeliveryAttemptCount, int ReturnInProgressCount, int OverdueCount, decimal DispatchedQuantity, decimal DeliveredQuantity, decimal OpenFreightAmount);

public sealed record ValidateShipmentHistoricalImportRequest(string OriginalFileName, string FileHash, IReadOnlyCollection<ShipmentHistoricalImportRowRequest> Rows);
public sealed record ShipmentHistoricalImportRowRequest(int RowNumber, string? SourceShipmentReference, string ChannelCode, string WarehouseCode, string ChannelSku, decimal Quantity, DateOnly ShipmentDate, ShipmentStatus Status, string? DocketNumber = null, string? InvoiceNumber = null, string? StoNumber = null, string? TransporterPartyCode = null, decimal? FreightAmount = null, string? Notes = null);
public sealed record ShipmentHistoricalImportValidationDto(long BatchId, int TotalRows, int ValidRows, int InvalidRows, int DuplicateRows, int UnmatchedSkuCount, IReadOnlyCollection<ShipmentHistoricalImportRowErrorDto> RowErrors, bool CanCommit);
public sealed record ShipmentHistoricalImportRowErrorDto(int RowNumber, string Field, string Message, string? OriginalValue = null);
public sealed record ShipmentHistoricalImportBatchDto(long Id, string OriginalFileName, string FileHash, int Status, int TotalRows, int ValidRows, int InvalidRows, int CommittedRows, DateTime UploadedAtUtc, DateTime? CommittedAtUtc, int TotalCount = 0)
{
    public ShipmentHistoricalImportBatchDto() : this(0, string.Empty, string.Empty, 0, 0, 0, 0, 0, default, null, 0) { }
}
public sealed record ShipmentHistoricalImportBatchQuery(int? Status = null, int PageNumber = 1, int PageSize = 20);
public sealed record CommitShipmentHistoricalImportRequest(bool AllowDuplicate = false, string? CorrectionReason = null);
public sealed record CancelShipmentHistoricalImportRequest(string Reason);
