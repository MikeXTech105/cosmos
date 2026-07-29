using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.ShipmentOperations;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class ShipmentOperationsRepository : IShipmentOperationsRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly ISqlConnectionFactory _connectionFactory;

    public ShipmentOperationsRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PagedResult<ShipmentSummaryDto>> GetShipmentsAsync(ShipmentListQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ShipmentSummaryDto>("usp_ShipmentOperations_Shipment_List", query, ct), query.PageNumber, query.PageSize);

    public async Task<ShipmentDto?> GetShipmentAsync(long id, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command("usp_ShipmentOperations_Shipment_Get", new { Id = id }, ct));
        var header = await multi.ReadSingleOrDefaultAsync<ShipmentHeader>();
        if (header is null) return null;

        var items = (await multi.ReadAsync<ShipmentItemDto>()).AsList();
        var packages = (await multi.ReadAsync<ShipmentPackageRow>()).AsList();
        var packageItems = (await multi.ReadAsync<ShipmentPackageItemDto>()).AsList();
        var dockets = (await multi.ReadAsync<ShipmentDocketDto>()).AsList();
        var appointments = (await multi.ReadAsync<ShipmentAppointmentDto>()).AsList();
        var trackingEvents = (await multi.ReadAsync<ShipmentTrackingEventDto>()).AsList();
        var deliveryAttempts = (await multi.ReadAsync<ShipmentDeliveryAttemptDto>()).AsList();
        var receiptHeaders = (await multi.ReadAsync<ShipmentReceiptHeader>()).AsList();
        var receiptItems = (await multi.ReadAsync<ShipmentReceiptItemDto>()).AsList();
        var returnHeaders = (await multi.ReadAsync<ShipmentReturnHeader>()).AsList();
        var returnItems = (await multi.ReadAsync<ShipmentReturnItemDto>()).AsList();
        var freightCharges = (await multi.ReadAsync<ShipmentFreightChargeDto>()).AsList();

        return header.ToDto(
            items,
            packages.Select(x => x.ToDto(packageItems.Where(i => i.ShipmentPackageId == x.Id).ToArray())).ToArray(),
            dockets,
            appointments,
            trackingEvents,
            deliveryAttempts,
            receiptHeaders.Select(x => x.ToDto(receiptItems.Where(i => i.ShipmentReceiptId == x.Id).ToArray())).ToArray(),
            returnHeaders.Select(x => x.ToDto(returnItems.Where(i => i.ShipmentReturnId == x.Id).ToArray())).ToArray(),
            freightCharges);
    }

    public Task<long> CreateManualShipmentAsync(CreateManualShipmentRequest request, long? userId, CancellationToken ct) =>
        ExecuteIdAsync("usp_ShipmentOperations_Shipment_CreateManual", new
        {
            request.ChannelId, request.WarehouseId, request.ShipmentDate, request.ExpectedDeliveryDate, request.TransporterPartyId,
            request.InvoiceId, request.InvoiceNumber, request.StoNumber, request.MarketplaceReference, request.ExternalShipmentReference,
            request.DispatchMode, request.Priority, request.ManualReason, request.Notes,
            ItemsJson = JsonSerializer.Serialize(request.Items, JsonOptions), UserId = userId
        }, ct);

    public Task<long> CreateFromDispatchPlanAsync(CreateShipmentFromDispatchPlanRequest request, long? userId, CancellationToken ct) =>
        ExecuteIdAsync("usp_ShipmentOperations_Shipment_CreateFromDispatchPlan", new
        {
            request.DispatchPlanningRunId, request.WarehouseId, request.ShipmentDate, request.ExpectedDeliveryDate,
            request.TransporterPartyId, request.InvoiceId, request.InvoiceNumber, request.StoNumber, request.Notes,
            AllocationsJson = JsonSerializer.Serialize(request.Allocations, JsonOptions), UserId = userId
        }, ct);

    public Task TransitionShipmentAsync(long id, int sourceStatus, int targetStatus, string? remarks, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Shipment_Transition", new { Id = id, SourceStatus = sourceStatus, TargetStatus = targetStatus, Remarks = remarks, UserId = userId }, ct);

    public Task CancelShipmentAsync(long id, string reason, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Shipment_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

    public Task<IReadOnlyCollection<ShipmentPackingSuggestionInput>> GetPackingSuggestionInputsAsync(long shipmentId, CancellationToken ct) =>
        QueryAsync<ShipmentPackingSuggestionInput>("usp_ShipmentOperations_Packing_SuggestionInputs", new { ShipmentId = shipmentId }, ct);

    public Task SavePackageAsync(long shipmentId, SaveShipmentPackageRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Package_Save", new
        {
            ShipmentId = shipmentId, request.PackageNumber, request.PackageType, request.PackagingProfileId,
            request.Length, request.Width, request.Height, request.DimensionUnit, request.GrossWeight, request.NetWeight,
            request.WeightUnit, request.VolumetricDivisor, request.TrackingLabel, request.Barcode, request.SealNumber,
            request.IsMixedPackage, request.Notes, ItemsJson = JsonSerializer.Serialize(request.Items, JsonOptions), UserId = userId
        }, ct);

    public Task SaveDocketAsync(long shipmentId, SaveShipmentDocketRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Docket_Save", new { ShipmentId = shipmentId, request.TransporterPartyId, request.DocketNumber, request.DocketDate, request.DispatchMode, request.TrackingUrl, request.VehicleNumber, request.DriverName, request.DriverMobile, request.PickupReference, request.EstimatedDeliveryDate, request.ActualPickupDateUtc, request.Notes, UserId = userId }, ct);

    public Task SaveAppointmentAsync(long shipmentId, SaveShipmentAppointmentRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Appointment_Save", new { ShipmentId = shipmentId, request.AppointmentReference, request.AppointmentDate, request.TimeFrom, request.TimeTo, request.AppointmentStatus, request.Remarks, request.CancellationReason, UserId = userId }, ct);

    public Task AddTrackingEventAsync(long shipmentId, AddShipmentTrackingEventRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Tracking_Add", new { ShipmentId = shipmentId, request.EventType, request.EventStatus, request.EventDateTimeUtc, request.Location, request.ReferenceNumber, request.Source, request.Remarks, UserId = userId }, ct);

    public Task AddDeliveryAttemptAsync(long shipmentId, AddShipmentDeliveryAttemptRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_DeliveryAttempt_Add", new { ShipmentId = shipmentId, request.AttemptDateTimeUtc, request.Outcome, request.ReasonCode, request.Remarks, request.NextAttemptDate, UserId = userId }, ct);

    public Task CreateReceiptAsync(long shipmentId, CreateShipmentReceiptRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Receipt_Create", new { ShipmentId = shipmentId, request.ReceiptDate, request.MarketplaceReceiptReference, request.ReceivedByName, request.ProofAttachmentUrl, request.Notes, ItemsJson = JsonSerializer.Serialize(request.Items, JsonOptions), UserId = userId }, ct);

    public Task<long> CreateReturnAsync(long shipmentId, CreateShipmentReturnRequest request, long? userId, CancellationToken ct) =>
        ExecuteIdAsync("usp_ShipmentOperations_Return_Create", new { ShipmentId = shipmentId, request.ReturnDate, request.ReturnReason, request.TransporterPartyId, request.DocketNumber, request.ExpectedReturnDate, request.Notes, ItemsJson = JsonSerializer.Serialize(request.Items, JsonOptions), UserId = userId }, ct);

    public async Task<ShipmentReturnDto?> GetReturnAsync(long shipmentReturnId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command("usp_ShipmentOperations_Return_Get", new { Id = shipmentReturnId }, ct));
        var header = await multi.ReadSingleOrDefaultAsync<ShipmentReturnHeader>();
        return header is null ? null : header.ToDto((await multi.ReadAsync<ShipmentReturnItemDto>()).AsList());
    }

    public Task ReceiveReturnAsync(long shipmentReturnId, ReceiveShipmentReturnRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Return_Receive", new { Id = shipmentReturnId, request.ReceivedBackDate, request.Notes, ItemsJson = JsonSerializer.Serialize(request.Items, JsonOptions), UserId = userId }, ct);

    public Task<long> SaveFreightChargeAsync(long shipmentId, SaveShipmentFreightChargeRequest request, long? userId, CancellationToken ct) =>
        ExecuteIdAsync("usp_ShipmentOperations_Freight_Create", new
        {
            ShipmentId = shipmentId, request.TransporterPartyId, request.ChargeType, request.CurrencyCode, request.BaseFreight,
            request.FuelSurcharge, request.HandlingCharge, request.LoadingCharge, request.UnloadingCharge, request.AppointmentCharge,
            request.ReturnFreight, request.OtherCharge, request.TaxAmount, request.DiscountAmount, request.ActualWeight,
            request.VolumetricWeight, request.ChargeableWeight, request.RatePerWeightUnit, request.TransporterInvoiceNumber,
            request.TransporterInvoiceDate, UserId = userId
        }, ct);

    public async Task<ShipmentFreightChargeDto?> GetFreightChargeAsync(long freightChargeId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<ShipmentFreightChargeDto>(connection, "usp_ShipmentOperations_Freight_Get", new { Id = freightChargeId }, ct);
    }

    public Task SubmitFreightChargeAsync(long freightChargeId, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Freight_Submit", new { Id = freightChargeId, UserId = userId }, ct);

    public Task ApproveFreightChargeAsync(long freightChargeId, string? approvalNotes, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Freight_Approve", new { Id = freightChargeId, ApprovalNotes = approvalNotes, UserId = userId }, ct);

    public Task RejectFreightChargeAsync(long freightChargeId, string reason, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Freight_Reject", new { Id = freightChargeId, Reason = reason, UserId = userId }, ct);

    public Task MarkFreightPaidAsync(long freightChargeId, MarkShipmentFreightPaidRequest request, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Freight_MarkPaid", new { Id = freightChargeId, request.PaidAtUtc, request.PaymentReference, UserId = userId }, ct);

    public async Task<ShipmentFreightRojmelReservationDto> ReserveFreightRojmelAsync(long freightChargeId, long? userId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command("usp_ShipmentOperations_Freight_ReserveRojmel", new { Id = freightChargeId, UserId = userId }, ct));
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        return await multi.ReadSingleAsync<ShipmentFreightRojmelReservationDto>();
    }

    public Task CompleteFreightRojmelAsync(long freightChargeId, Guid reservationToken, long rojmelTransactionId, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Freight_CompleteRojmel", new { Id = freightChargeId, ReservationToken = reservationToken, RojmelTransactionId = rojmelTransactionId, UserId = userId }, ct);

    public Task ReleaseFreightRojmelAsync(long freightChargeId, Guid reservationToken, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Freight_ReleaseRojmel", new { Id = freightChargeId, ReservationToken = reservationToken, UserId = userId }, ct);

    public Task SetTransporterRoleAsync(Guid partyId, bool isTransporter, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Transporter_Set", new { PartyId = partyId, IsTransporter = isTransporter, UserId = userId }, ct);

    public Task<IReadOnlyCollection<TransporterPartyDto>> GetTransportersAsync(string? search, CancellationToken ct) =>
        QueryAsync<TransporterPartyDto>("usp_ShipmentOperations_Transporter_List", new { Search = search }, ct);

    public async Task<PagedResult<ShipmentReportRowDto>> GetShipmentReportAsync(ShipmentReportQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ShipmentReportRowDto>("usp_ShipmentOperations_Report_List", query, ct), query.PageNumber, query.PageSize);

    public async Task<ShipmentDashboardDto> GetDashboardAsync(DateOnly? asOfDate, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<ShipmentDashboardDto>(connection, "usp_ShipmentOperations_Dashboard", new { AsOfDate = asOfDate }, ct)
            ?? new ShipmentDashboardDto(0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    public async Task<ShipmentHistoricalImportValidationDto> ValidateHistoricalImportAsync(ValidateShipmentHistoricalImportRequest request, long? userId, string correlationId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command("usp_ShipmentOperations_Import_Validate", new { request.OriginalFileName, request.FileHash, RowsJson = JsonSerializer.Serialize(request.Rows, JsonOptions), CorrelationId = correlationId, UserId = userId }, ct));
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        var header = await multi.ReadSingleAsync<ShipmentHistoricalImportValidationHeader>();
        return new ShipmentHistoricalImportValidationDto(header.BatchId, header.TotalRows, header.ValidRows, header.InvalidRows, header.DuplicateRows, header.UnmatchedSkuCount, (await multi.ReadAsync<ShipmentHistoricalImportRowErrorDto>()).AsList(), header.CanCommit);
    }

    public Task<ShipmentHistoricalImportBatchDto> CommitHistoricalImportAsync(long id, CommitShipmentHistoricalImportRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ShipmentHistoricalImportBatchDto>("usp_ShipmentOperations_Import_Commit", new { Id = id, request.AllowDuplicate, request.CorrectionReason, UserId = userId }, ct);

    public Task CancelHistoricalImportAsync(long id, string reason, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_ShipmentOperations_Import_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

    public async Task<PagedResult<ShipmentHistoricalImportBatchDto>> GetHistoricalImportBatchesAsync(ShipmentHistoricalImportBatchQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ShipmentHistoricalImportBatchDto>("usp_ShipmentOperations_Import_List", query, ct), query.PageNumber, query.PageSize);

    private async Task<long> ExecuteIdAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command(procedure, parameters, ct));
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        return (await multi.ReadSingleAsync<IdResult>()).Id;
    }

    private async Task<IReadOnlyCollection<T>> QueryAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T> QueryWithStatusAsync<T>(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task ExecuteStatusOrThrowAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        ThrowIfFailed(await StoredProcedureExecutor.ExecuteStatusAsync(connection, procedure, parameters, ct));
    }

    private static CommandDefinition Command(string procedure, object? parameters, CancellationToken ct) => new(procedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
    private static void ThrowIfFailed(OperationResult result) { if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode); }

    private static PagedResult<T> Page<T>(IReadOnlyCollection<T> rows, int page, int size) where T : class
    {
        var totalProperty = typeof(T).GetProperty("TotalCount");
        var total = rows.FirstOrDefault() is { } first && totalProperty?.GetValue(first) is int value ? value : 0;
        return new PagedResult<T>(rows, page, size, total);
    }

    private sealed record IdResult(long Id);
    private sealed record ShipmentHistoricalImportValidationHeader(long BatchId, int TotalRows, int ValidRows, int InvalidRows, int DuplicateRows, int UnmatchedSkuCount, bool CanCommit);

    private sealed record ShipmentHeader(
        long Id, string ShipmentNumber, ShipmentSourceType SourceType, long ChannelId, string ChannelCode, string ChannelName,
        long WarehouseId, string WarehouseCode, string WarehouseName, long? DispatchPlanningRunId, DateOnly ShipmentDate,
        DateOnly? ExpectedDeliveryDate, long? InvoiceId, string? InvoiceNumber, string? StoNumber, string? MarketplaceReference,
        string? ExternalShipmentReference, Guid? TransporterPartyId, string? TransporterName, ShipmentDispatchMode DispatchMode,
        ShipmentStatus Status, ShipmentPriority Priority, string? ManualReason, string? Notes, decimal TotalPlannedQuantity,
        decimal TotalPackedQuantity, decimal TotalDispatchedQuantity, decimal TotalReceivedQuantity, decimal TotalReturnedQuantity,
        int TotalPackages, decimal TotalGrossWeight, decimal TotalVolumetricWeight, decimal TotalChargeableWeight,
        DateTime CreatedAtUtc, long? CreatedBy, DateTime? UpdatedAtUtc, long? UpdatedBy, DateTime? PackedAtUtc, long? PackedBy,
        DateTime? DispatchedAtUtc, long? DispatchedBy, DateTime? DeliveredAtUtc, long? DeliveredBy, DateTime? ClosedAtUtc,
        long? ClosedBy, DateTime? CancelledAtUtc, long? CancelledBy, string? CancellationReason)
    {
        public ShipmentDto ToDto(IReadOnlyCollection<ShipmentItemDto> items, IReadOnlyCollection<ShipmentPackageDto> packages,
            IReadOnlyCollection<ShipmentDocketDto> dockets, IReadOnlyCollection<ShipmentAppointmentDto> appointments,
            IReadOnlyCollection<ShipmentTrackingEventDto> trackingEvents, IReadOnlyCollection<ShipmentDeliveryAttemptDto> deliveryAttempts,
            IReadOnlyCollection<ShipmentReceiptDto> receipts, IReadOnlyCollection<ShipmentReturnDto> returns,
            IReadOnlyCollection<ShipmentFreightChargeDto> freightCharges) =>
            new(Id, ShipmentNumber, SourceType, ChannelId, ChannelCode, ChannelName, WarehouseId, WarehouseCode, WarehouseName,
                DispatchPlanningRunId, ShipmentDate, ExpectedDeliveryDate, InvoiceId, InvoiceNumber, StoNumber, MarketplaceReference,
                ExternalShipmentReference, TransporterPartyId, TransporterName, DispatchMode, Status, Priority, ManualReason, Notes,
                TotalPlannedQuantity, TotalPackedQuantity, TotalDispatchedQuantity, TotalReceivedQuantity, TotalReturnedQuantity,
                TotalPackages, TotalGrossWeight, TotalVolumetricWeight, TotalChargeableWeight, CreatedAtUtc, CreatedBy, UpdatedAtUtc,
                UpdatedBy, PackedAtUtc, PackedBy, DispatchedAtUtc, DispatchedBy, DeliveredAtUtc, DeliveredBy, ClosedAtUtc, ClosedBy,
                CancelledAtUtc, CancelledBy, CancellationReason, items, packages, dockets, appointments, trackingEvents, deliveryAttempts,
                receipts, returns, freightCharges);
    }

    private sealed record ShipmentPackageRow(long Id, long ShipmentId, string PackageNumber, string PackageType, long? PackagingProfileId,
        decimal Length, decimal Width, decimal Height, string DimensionUnit, decimal GrossWeight, decimal NetWeight, string WeightUnit,
        decimal? VolumetricDivisor, decimal VolumetricWeight, decimal ChargeableWeight, string? TrackingLabel, string? Barcode,
        string? SealNumber, bool IsMixedPackage, string? Notes)
    {
        public ShipmentPackageDto ToDto(IReadOnlyCollection<ShipmentPackageItemDto> items) => new(Id, ShipmentId, PackageNumber, PackageType,
            PackagingProfileId, Length, Width, Height, DimensionUnit, GrossWeight, NetWeight, WeightUnit, VolumetricDivisor,
            VolumetricWeight, ChargeableWeight, TrackingLabel, Barcode, SealNumber, IsMixedPackage, Notes, items);
    }

    private sealed record ShipmentReceiptHeader(long Id, long ShipmentId, string ReceiptNumber, DateOnly ReceiptDate,
        string? MarketplaceReceiptReference, string? ReceivedByName, string? ProofAttachmentUrl, string? Notes)
    {
        public ShipmentReceiptDto ToDto(IReadOnlyCollection<ShipmentReceiptItemDto> items) => new(Id, ShipmentId, ReceiptNumber, ReceiptDate,
            MarketplaceReceiptReference, ReceivedByName, ProofAttachmentUrl, Notes, items);
    }

    private sealed record ShipmentReturnHeader(long Id, string ReturnNumber, long ShipmentId, DateOnly ReturnDate, string ReturnReason,
        ShipmentReturnStatus Status, Guid? TransporterPartyId, string? TransporterName, string? DocketNumber, DateOnly? ExpectedReturnDate,
        DateOnly? ReceivedBackDate, string? Notes)
    {
        public ShipmentReturnDto ToDto(IReadOnlyCollection<ShipmentReturnItemDto> items) => new(Id, ReturnNumber, ShipmentId, ReturnDate,
            ReturnReason, Status, TransporterPartyId, TransporterName, DocketNumber, ExpectedReturnDate, ReceivedBackDate, Notes, items);
    }
}
