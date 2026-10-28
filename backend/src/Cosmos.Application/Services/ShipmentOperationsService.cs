using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.ShipmentOperations;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Rojmel;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class ShipmentOperationsService : IShipmentOperationsService
{
    private readonly IShipmentOperationsRepository _repository;
    private readonly IShipmentPackingSuggestionService _packingSuggestions;
    private readonly ShipmentStatusTransitionService _transitions;
    private readonly IRojmelTransactionService _rojmelTransactions;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUser _currentUser;
    private readonly IServiceProvider _services;
    private readonly ILogger<ShipmentOperationsService> _logger;

    public ShipmentOperationsService(
        IShipmentOperationsRepository repository,
        IShipmentPackingSuggestionService packingSuggestions,
        ShipmentStatusTransitionService transitions,
        IRojmelTransactionService rojmelTransactions,
        IAuditRepository audit,
        ICurrentUser currentUser,
        IServiceProvider services,
        ILogger<ShipmentOperationsService> logger)
    {
        _repository = repository;
        _packingSuggestions = packingSuggestions;
        _transitions = transitions;
        _rojmelTransactions = rojmelTransactions;
        _audit = audit;
        _currentUser = currentUser;
        _services = services;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<ShipmentSummaryDto>>> GetShipmentsAsync(ShipmentListQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<ShipmentSummaryDto>>.Success(await _repository.GetShipmentsAsync(query, ct));
    }

    public async Task<ApiResponse<ShipmentDto>> GetShipmentAsync(long id, CancellationToken ct) =>
        ApiResponse<ShipmentDto>.Success(await ShipmentAsync(id, ct));

    public async Task<ApiResponse<IReadOnlyCollection<ShipmentDispatchAllocationDto>>> GetDispatchAllocationsAsync(long runId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<ShipmentDispatchAllocationDto>>.Success(await _repository.GetDispatchAllocationsAsync(runId, ct));

    public async Task<ApiResponse<ShipmentDto>> CreateManualShipmentAsync(CreateManualShipmentRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var id = await _repository.CreateManualShipmentAsync(request, _currentUser.UserId, ct);
        var shipment = await ShipmentAsync(id, ct);
        await AuditAsync("Shipments", id, "CreateManual", null, shipment, ct);
        return ApiResponse<ShipmentDto>.Success(shipment, "Manual shipment created. Inventory was not changed.");
    }

    public async Task<ApiResponse<ShipmentDto>> CreateFromDispatchPlanAsync(CreateShipmentFromDispatchPlanRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var id = await _repository.CreateFromDispatchPlanAsync(request, _currentUser.UserId, ct);
        var shipment = await ShipmentAsync(id, ct);
        await AuditAsync("Shipments", id, "CreateFromDispatchPlan", null, new { request.DispatchPlanningRunId, request.WarehouseId, request.Allocations, shipment.ShipmentNumber }, ct);
        return ApiResponse<ShipmentDto>.Success(shipment, "Shipment created from finalized Dispatch Planning allocation. Inventory was not changed.");
    }

    public async Task<ApiResponse<ShipmentDto>> TransitionAsync(long id, TransitionShipmentRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await ShipmentAsync(id, ct);
        _transitions.EnsureAllowed(before.Status, request.TargetStatus);
        await _repository.TransitionShipmentAsync(id, (int)before.Status, (int)request.TargetStatus, request.Remarks, _currentUser.UserId, ct);
        var after = await ShipmentAsync(id, ct);
        await AuditAsync("Shipments", id, "Transition", new { before.Status }, new { after.Status, request.Remarks }, ct);
        _logger.LogInformation("Shipment {ShipmentId} transitioned from {PreviousStatus} to {TargetStatus} by {UserId}.", id, before.Status, after.Status, _currentUser.UserId);
        return ApiResponse<ShipmentDto>.Success(after, request.TargetStatus == Cosmos.Domain.ShipmentOperations.ShipmentStatus.Dispatched
            ? "Shipment dispatched and inventory movement recorded."
            : "Shipment status updated.");
    }

    public async Task<ApiResponse<ShipmentDto>> CancelAsync(long id, CancelShipmentRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await ShipmentAsync(id, ct);
        await _repository.CancelShipmentAsync(id, request.Reason.Trim(), _currentUser.UserId, ct);
        var after = await ShipmentAsync(id, ct);
        await AuditAsync("Shipments", id, "Cancel", new { before.Status }, new { request.Reason, after.Status }, ct);
        return ApiResponse<ShipmentDto>.Success(after, "Shipment cancelled. Pre-dispatch allocation quantity is available for reconversion.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<ShipmentPackingSuggestionDto>>> GetPackingSuggestionsAsync(long shipmentId, ShipmentPackingSuggestionRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        _ = await ShipmentAsync(shipmentId, ct);
        return ApiResponse<IReadOnlyCollection<ShipmentPackingSuggestionDto>>.Success(
            _packingSuggestions.Suggest(await _repository.GetPackingSuggestionInputsAsync(shipmentId, ct), request));
    }

    public async Task<ApiResponse<ShipmentDto>> SavePackageAsync(long shipmentId, SaveShipmentPackageRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(before);
        await _repository.SavePackageAsync(shipmentId, request, _currentUser.UserId, ct);
        var after = await ShipmentAsync(shipmentId, ct);
        await AuditAsync("ShipmentPackages", shipmentId, "SavePackage", new { request.PackageNumber }, new { after.TotalPackages, after.TotalPackedQuantity }, ct);
        return ApiResponse<ShipmentDto>.Success(after, "Shipment package saved. Inventory was not changed.");
    }

    public async Task<ApiResponse<ShipmentDto>> RemovePackageAsync(long shipmentId, long packageId, RemoveShipmentPackageRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        // Version, packing state, repeat intent and allocation reconciliation are checked
        // under the same database lock. Readback does not repeat the physical command.
        await _repository.RemovePackageAsync(shipmentId, packageId, request, _currentUser.UserId, ct);
        return ApiResponse<ShipmentDto>.Success(await ShipmentAsync(shipmentId, ct),
            "Draft package removed. Its quantities are unpacked; verify conversion and review the replacement package. Inventory was not changed.");
    }

    public async Task<ApiResponse<ShipmentDto>> SaveDocketAsync(long shipmentId, SaveShipmentDocketRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        await _repository.SaveDocketAsync(shipmentId, request, _currentUser.UserId, ct);
        var after = await ShipmentAsync(shipmentId, ct);
        await AuditAsync("ShipmentDockets", shipmentId, "SaveDocket", null, new { request.DocketNumber, request.TransporterPartyId }, ct);
        return ApiResponse<ShipmentDto>.Success(after, "Docket saved.");
    }

    public async Task<ApiResponse<ShipmentDto>> SaveAppointmentAsync(long shipmentId, SaveShipmentAppointmentRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        await _repository.SaveAppointmentAsync(shipmentId, request, _currentUser.UserId, ct);
        var after = await ShipmentAsync(shipmentId, ct);
        await AuditAsync("ShipmentAppointments", shipmentId, "SaveAppointment", null, request, ct);
        return ApiResponse<ShipmentDto>.Success(after, "Shipment appointment history updated.");
    }

    public async Task<ApiResponse<ShipmentDto>> AddTrackingEventAsync(long shipmentId, AddShipmentTrackingEventRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        await _repository.AddTrackingEventAsync(shipmentId, request, _currentUser.UserId, ct);
        await AuditAsync("ShipmentTrackingEvents", shipmentId, "AddTrackingEvent", null, request, ct);
        return ApiResponse<ShipmentDto>.Success(await ShipmentAsync(shipmentId, ct), "Tracking event appended.");
    }

    public async Task<ApiResponse<ShipmentDto>> AddDeliveryAttemptAsync(long shipmentId, AddShipmentDeliveryAttemptRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        await _repository.AddDeliveryAttemptAsync(shipmentId, request, _currentUser.UserId, ct);
        await AuditAsync("ShipmentDeliveryAttempts", shipmentId, "AddDeliveryAttempt", null, request, ct);
        return ApiResponse<ShipmentDto>.Success(await ShipmentAsync(shipmentId, ct), "Delivery attempt recorded.");
    }

    public async Task<ApiResponse<ShipmentDto>> CreateReceiptAsync(long shipmentId, CreateShipmentReceiptRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        await _repository.CreateReceiptAsync(shipmentId, request, _currentUser.UserId, ct);
        var after = await ShipmentAsync(shipmentId, ct);
        await AuditAsync("ShipmentReceipts", shipmentId, "CreateReceipt", null, request, ct);
        return ApiResponse<ShipmentDto>.Success(after, "Shipment receipt recorded.");
    }

    public async Task<ApiResponse<ShipmentReturnDto>> CreateReturnAsync(long shipmentId, CreateShipmentReturnRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        var id = await _repository.CreateReturnAsync(shipmentId, request, _currentUser.UserId, ct);
        var result = await ReturnAsync(id, ct);
        await AuditAsync("ShipmentReturns", id, "Create", null, result, ct);
        return ApiResponse<ShipmentReturnDto>.Success(result, "Shipment return initiated. Inventory was not changed.");
    }

    public async Task<ApiResponse<ShipmentReturnDto>> ReceiveReturnAsync(long shipmentReturnId, ReceiveShipmentReturnRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await ReturnAsync(shipmentReturnId, ct);
        await _repository.ReceiveReturnAsync(shipmentReturnId, request, _currentUser.UserId, ct);
        var after = await ReturnAsync(shipmentReturnId, ct);
        await AuditAsync("ShipmentReturns", shipmentReturnId, "Receive", before, after, ct);
        return ApiResponse<ShipmentReturnDto>.Success(after, "Return receipt recorded; only restockable quantities updated inventory.");
    }

    public async Task<ApiResponse<ShipmentFreightChargeDto>> SaveFreightChargeAsync(long shipmentId, SaveShipmentFreightChargeRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var shipment = await ShipmentAsync(shipmentId, ct);
        EnsureMutable(shipment);
        var id = await _repository.SaveFreightChargeAsync(shipmentId, request, _currentUser.UserId, ct);
        var result = await FreightAsync(id, ct);
        await AuditAsync("ShipmentFreightCharges", id, "Create", null, result, ct);
        return ApiResponse<ShipmentFreightChargeDto>.Success(result, "Freight charge created as Draft.");
    }

    public async Task<ApiResponse<ShipmentFreightChargeDto>> SubmitFreightChargeAsync(long freightChargeId, CancellationToken ct)
    {
        var before = await FreightAsync(freightChargeId, ct);
        await _repository.SubmitFreightChargeAsync(freightChargeId, _currentUser.UserId, ct);
        var after = await FreightAsync(freightChargeId, ct);
        await AuditAsync("ShipmentFreightCharges", freightChargeId, "Submit", before, after, ct);
        return ApiResponse<ShipmentFreightChargeDto>.Success(after, "Freight charge submitted for approval.");
    }

    public async Task<ApiResponse<ShipmentFreightChargeDto>> ApproveFreightChargeAsync(long freightChargeId, ApproveShipmentFreightRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await FreightAsync(freightChargeId, ct);
        await _repository.ApproveFreightChargeAsync(freightChargeId, request.ApprovalNotes, _currentUser.UserId, ct);
        var after = await FreightAsync(freightChargeId, ct);
        await AuditAsync("ShipmentFreightCharges", freightChargeId, "Approve", before, after, ct);
        return ApiResponse<ShipmentFreightChargeDto>.Success(after, "Freight charge approved. No Rojmel entry was created.");
    }

    public async Task<ApiResponse<ShipmentFreightChargeDto>> RejectFreightChargeAsync(long freightChargeId, RejectShipmentFreightRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await FreightAsync(freightChargeId, ct);
        await _repository.RejectFreightChargeAsync(freightChargeId, request.Reason.Trim(), _currentUser.UserId, ct);
        var after = await FreightAsync(freightChargeId, ct);
        await AuditAsync("ShipmentFreightCharges", freightChargeId, "Reject", before, after, ct);
        return ApiResponse<ShipmentFreightChargeDto>.Success(after, "Freight charge rejected.");
    }

    public async Task<ApiResponse<ShipmentFreightChargeDto>> MarkFreightPaidAsync(long freightChargeId, MarkShipmentFreightPaidRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var before = await FreightAsync(freightChargeId, ct);
        await _repository.MarkFreightPaidAsync(freightChargeId, request, _currentUser.UserId, ct);
        var after = await FreightAsync(freightChargeId, ct);
        await AuditAsync("ShipmentFreightCharges", freightChargeId, "MarkPaid", before, after, ct);
        return ApiResponse<ShipmentFreightChargeDto>.Success(after, "Freight marked paid without automatic Rojmel posting.");
    }

    public async Task<ApiResponse<ShipmentFreightChargeDto>> CreateRojmelExpenseAsync(long freightChargeId, CreateShipmentFreightRojmelExpenseRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var reservation = await _repository.ReserveFreightRojmelAsync(freightChargeId, _currentUser.UserId, ct);
        try
        {
            var reference = $"SHIPMENT-FREIGHT:{reservation.FreightChargeId}";
            var description = string.IsNullOrWhiteSpace(request.Description)
                ? $"Freight for shipment {reservation.ShipmentNumber}"
                : request.Description.Trim();
            var response = await _rojmelTransactions.CreateExpenseAsync(
                new CreateRojmelTransactionRequest(request.WalletId, request.TransactionDate, request.CategoryId, reservation.Amount, request.PaymentMode, description, reference), ct);
            var transaction = response.Data ?? throw new CosmosException("Rojmel did not return a posted expense transaction.", 502);
            await _repository.CompleteFreightRojmelAsync(freightChargeId, reservation.ReservationToken, transaction.Id, _currentUser.UserId, ct);
            var freight = await FreightAsync(freightChargeId, ct);
            await AuditAsync("ShipmentFreightCharges", freightChargeId, "CreateRojmelExpense", null, new { transaction.Id, transaction.TransactionNo }, ct);
            return ApiResponse<ShipmentFreightChargeDto>.Success(freight, "Approved freight posted to Rojmel through the explicit hand-off.");
        }
        catch
        {
            await _repository.ReleaseFreightRojmelAsync(freightChargeId, reservation.ReservationToken, _currentUser.UserId, ct);
            throw;
        }
    }

    public async Task<ApiResponse> SetTransporterRoleAsync(Guid partyId, SetTransporterRoleRequest request, CancellationToken ct)
    {
        await _repository.SetTransporterRoleAsync(partyId, request.IsTransporter, _currentUser.UserId, ct);
        await AuditAsync("PartyRoles", 0, request.IsTransporter ? "SetTransporter" : "RemoveTransporter", null, new { partyId }, ct);
        return ApiResponse.Success(request.IsTransporter ? "Party marked as a transporter." : "Transporter role removed from party.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<TransporterPartyDto>>> GetTransportersAsync(string? search, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<TransporterPartyDto>>.Success(await _repository.GetTransportersAsync(search, ct));

    public async Task<ApiResponse<PagedResult<ShipmentReportRowDto>>> GetReportAsync(ShipmentReportQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<ShipmentReportRowDto>>.Success(await _repository.GetShipmentReportAsync(query, ct));
    }

    public Task<ApiResponse<ShipmentDashboardDto>> GetDashboardAsync(DateOnly? asOfDate, CancellationToken ct) =>
        GetDashboardCoreAsync(asOfDate, ct);

    public async Task<ApiResponse<ShipmentHistoricalImportValidationDto>> ValidateHistoricalImportAsync(ValidateShipmentHistoricalImportRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var result = await _repository.ValidateHistoricalImportAsync(request, _currentUser.UserId, Guid.NewGuid().ToString("N"), ct);
        await AuditAsync("SupplyChainImportBatches", result.BatchId, "ValidateShipmentHistoricalImport", null, new { result.TotalRows, result.ValidRows, result.InvalidRows }, ct);
        return ApiResponse<ShipmentHistoricalImportValidationDto>.Success(result, "Historical shipment import validated. It will not alter stock.");
    }

    public async Task<ApiResponse<ShipmentHistoricalImportBatchDto>> CommitHistoricalImportAsync(long id, CommitShipmentHistoricalImportRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        var result = await _repository.CommitHistoricalImportAsync(id, request, _currentUser.UserId, ct);
        await AuditAsync("SupplyChainImportBatches", id, "CommitShipmentHistoricalImport", null, result, ct);
        return ApiResponse<ShipmentHistoricalImportBatchDto>.Success(result, "Historical shipment import committed without inventory movement.");
    }

    public async Task<ApiResponse> CancelHistoricalImportAsync(long id, CancelShipmentHistoricalImportRequest request, CancellationToken ct)
    {
        await ValidateAsync(request, ct);
        await _repository.CancelHistoricalImportAsync(id, request.Reason.Trim(), _currentUser.UserId, ct);
        await AuditAsync("SupplyChainImportBatches", id, "CancelShipmentHistoricalImport", null, request, ct);
        return ApiResponse.Success("Historical shipment import cancelled.");
    }

    public async Task<ApiResponse<PagedResult<ShipmentHistoricalImportBatchDto>>> GetHistoricalImportBatchesAsync(ShipmentHistoricalImportBatchQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<ShipmentHistoricalImportBatchDto>>.Success(await _repository.GetHistoricalImportBatchesAsync(query, ct));
    }

    private async Task<ApiResponse<ShipmentDashboardDto>> GetDashboardCoreAsync(DateOnly? asOfDate, CancellationToken ct) =>
        ApiResponse<ShipmentDashboardDto>.Success(await _repository.GetDashboardAsync(asOfDate, ct));

    private async Task<ShipmentDto> ShipmentAsync(long id, CancellationToken ct) =>
        await _repository.GetShipmentAsync(id, ct) ?? throw new CosmosException("Shipment was not found.", 404);

    private async Task<ShipmentReturnDto> ReturnAsync(long id, CancellationToken ct) =>
        await _repository.GetReturnAsync(id, ct) ?? throw new CosmosException("Shipment return was not found.", 404);

    private async Task<ShipmentFreightChargeDto> FreightAsync(long id, CancellationToken ct) =>
        await _repository.GetFreightChargeAsync(id, ct) ?? throw new CosmosException("Shipment freight charge was not found.", 404);

    private static void EnsureMutable(ShipmentDto shipment)
    {
        if (shipment.Status == Cosmos.Domain.ShipmentOperations.ShipmentStatus.Closed)
        {
            throw new CosmosException("Closed shipments are immutable.", 409);
        }
    }

    private async Task ValidateAsync<T>(T request, CancellationToken ct)
    {
        var validator = _services.GetRequiredService<IValidator<T>>();
        var result = await validator.ValidateAsync(request, ct);
        if (!result.IsValid) throw new ValidationException(result.Errors);
    }

    private Task AuditAsync(string table, long id, string action, object? before, object? after, CancellationToken ct) =>
        _audit.AddAsync(new AuditEntryRequest(table, id.ToString(), action, Serialize(before), Serialize(after), _currentUser.UserId), ct);

    private static string? Serialize(object? value) => value is null ? null : JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
}
