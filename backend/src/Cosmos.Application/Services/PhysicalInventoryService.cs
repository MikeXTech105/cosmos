using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Manufacturing;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;

namespace Cosmos.Application.Services;

public sealed class PhysicalInventoryService(IProductionWorkspaceRepository repository, IProductionCompanyScope scope, ICurrentUser user) : IPhysicalInventoryService
{
    public Task<ApiResponse<ProductionCommandResult>> ApprovePurchaseAsync(long orderId,ProductionOrderActionRequest r,CancellationToken ct)
    {
        scope.EnsureOpenDate(scope.CurrentBusinessDate);
        if(string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length>1000)throw new CosmosException("Purchase approval needs a review reason.");
        return Execute("purchase-approve",orderId,r.Version,r.IdempotencyKey,r,ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> ClosePurchaseRemainderAsync(long orderId,ProductionOrderActionRequest r,CancellationToken ct)
    {
        scope.EnsureOpenDate(scope.CurrentBusinessDate);
        if(string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length>1000)throw new CosmosException("Closing the unreceived PO remainder needs a reason.");
        return Execute("purchase-close",orderId,r.Version,r.IdempotencyKey,r,ct);
    }
    public async Task<ApiResponse<ProductionCommandResult>> VerifyPackingAsync(long shipmentId,ShipmentPackingVerificationRequest r,CancellationToken ct)
    {
        if(r.Version.Length!=18 || !r.Version.StartsWith("0x",StringComparison.Ordinal) || string.IsNullOrWhiteSpace(r.IdempotencyKey) || r.IdempotencyKey.Length>100 || string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length>1000 || r.Lines.Count==0 || r.Lines.Select(x=>x.ShipmentItemId).Distinct().Count()!=r.Lines.Count || r.Lines.Any(x=>x.ShipmentItemId<=0 || x.UnitId<=0 || x.PackagingProfileId<=0))
            throw new CosmosException("Verify real shipment lines, Item base units and packaging profiles with a current version and review reason.");
        return ApiResponse<ProductionCommandResult>.Success(await repository.ExecuteAsync<ProductionCommandResult>("sp_ShipmentPhysical_VerifyPacking",scope.CompanyKey,user.UserId??throw new UnauthorizedCosmosException(),new {Id=shipmentId,Request=r},ct));
    }
    public async Task<ApiResponse<ProductionCommandResult>> ReceiptCreditAsync(long returnId,PurchaseReceiptCreditRequest r,CancellationToken ct)
    {
        scope.EnsureOpenDate(r.BusinessDate);
        if(r.BusinessDate==default || r.BusinessDate>scope.CurrentBusinessDate || r.BillItemId<=0 || string.IsNullOrWhiteSpace(r.IdempotencyKey) || r.IdempotencyKey.Length>100 || string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length>500)
            throw new CosmosException("Reference a posted physical return and its billed line, with a dated credit reason and idempotency key.");
        return ApiResponse<ProductionCommandResult>.Success(await repository.ExecuteAsync<ProductionCommandResult>("sp_PurchasePhysical_ReturnCredit",scope.CompanyKey,user.UserId??throw new UnauthorizedCosmosException(),new {Id=returnId,Request=r},ct));
    }
    public async Task<ApiResponse<ProductionCommandResult>> PurchaseDraftAsync(long runId, ProcurementPurchaseDraftRequest r, CancellationToken ct)
    {
        scope.EnsureOpenDate(r.OrderDate);
        if (string.IsNullOrWhiteSpace(r.IdempotencyKey) || r.IdempotencyKey.Length > 100 || r.SupplierId == Guid.Empty || r.OrderDate == default || r.OrderDate > scope.CurrentBusinessDate || r.ExpectedDate < r.OrderDate || r.Lines.Count == 0 ||
            r.Lines.Select(x => x.PlanningRunLineId).Distinct().Count() != r.Lines.Count || r.Notes?.Length > 1000 ||
            r.Lines.Any(x => x.PlanningRunLineId <= 0 || x.UnitPrice is null or < 0 || decimal.Round(x.UnitPrice.Value,2) != x.UnitPrice || x.TaxPercentage is < 0 or > 100 || decimal.Round(x.TaxPercentage,4) != x.TaxPercentage || string.IsNullOrWhiteSpace(x.PriceSourceReference) || x.PriceSourceReference.Length > 200))
            throw new CosmosException("Select unique approved shortages, a real supplier and explicitly sourced two-place prices with valid tax and business dates.");
        return ApiResponse<ProductionCommandResult>.Success(await repository.ExecuteAsync<ProductionCommandResult>("sp_ProcurementPlanning_PurchaseDraft", scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), new { Id = runId, Request = r }, ct));
    }
    public async Task<ApiResponse<ProcurementPurchaseSourceContext>> PurchaseSourcesAsync(long runId, CancellationToken ct) =>
        ApiResponse<ProcurementPurchaseSourceContext>.Success(await repository.ExecuteAsync<ProcurementPurchaseSourceContext>("sp_ProcurementContinuity_PurchaseSources", scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), new { Id = runId }, ct));
    public async Task<ApiResponse<ProcurementSupplierPolicyDto>> SupplierPolicyAsync(long itemId, ProcurementSupplierPolicyRequest? r, CancellationToken ct)
    {
        if (r is not null && (r.Version.Length != 18 || !r.Version.StartsWith("0x",StringComparison.Ordinal) || string.IsNullOrWhiteSpace(r.IdempotencyKey) || r.IdempotencyKey.Length > 100 || r.LeadTime < 0 || decimal.Round(r.LeadTime,3) != r.LeadTime || !Enum.IsDefined(r.LeadTimeUnit) || string.IsNullOrWhiteSpace(r.SourceReference) || r.SourceReference.Length > 200))
            throw new CosmosException("A current version, typed calendar duration and source reference are required.");
        return ApiResponse<ProcurementSupplierPolicyDto>.Success(await repository.ExecuteAsync<ProcurementSupplierPolicyDto>("sp_ProcurementSupplierPolicy", scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), new { Id = itemId, Request = r }, ct));
    }
    public async Task<ApiResponse<PagedResult<SupplierPerformanceLine>>> SupplierPerformanceAsync(SupplierPerformanceQuery q, CancellationToken ct)
    {
        if (q.FromDate == default || q.ToDate < q.FromDate) throw new CosmosException("Select a real receipt business-date period.");
        return ApiResponse<PagedResult<SupplierPerformanceLine>>.Success(await repository.ExecuteAsync<PagedResult<SupplierPerformanceLine>>("sp_PurchaseSupplier_Performance",scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(),q with { PageNumber=Math.Max(1,q.PageNumber),PageSize=Math.Clamp(q.PageSize,1,200) },ct));
    }
    public async Task<ApiResponse<PhysicalOwnershipSnapshot>> ReadAsync(long id, string kind, CancellationToken ct) =>
        ApiResponse<PhysicalOwnershipSnapshot>.Success(await repository.ExecuteAsync<PhysicalOwnershipSnapshot>("sp_PhysicalInventory_Read", scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), new { Id = id, Kind = kind }, ct));
    public Task<ApiResponse<ProductionCommandResult>> InvoiceOwnershipAsync(long invoiceId, InvoiceOwnershipRequest request, CancellationToken ct)
    {
        if (request.Lines.Count == 0 || request.Lines.Select(x => x.InvoiceLineId).Distinct().Count() != request.Lines.Count || request.Lines.Any(x => x.InvoiceLineId <= 0 || !Enum.IsDefined(x.Owner)))
            throw new CosmosException("Unique invoice lines and explicit physical stock owners are required.");
        return Execute("invoice-policy", invoiceId, request.Version, request.IdempotencyKey, request, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> ShipmentLinksAsync(long shipmentId, ShipmentInvoiceLinkRequest request, CancellationToken ct)
    {
        if (request.Lines.Count == 0 || request.Lines.Any(x => x.ShipmentItemId <= 0 || x.InvoiceLineId <= 0 || x.Quantity <= 0 || !ProductionCalculations.IsPostingQuantity(x.Quantity)) ||
            request.Lines.Select(x => (x.ShipmentItemId, x.InvoiceLineId)).Distinct().Count() != request.Lines.Count)
            throw new CosmosException("Unique shipment/invoice line pairs with positive quantities are required.");
        return Execute("shipment-links", shipmentId, request.Version, request.IdempotencyKey, request, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> ReceiptAsync(long orderId, PurchaseReceiptRequest r, CancellationToken ct)
    {
        scope.EnsureOpenDate(r.BusinessDate);
        if (r.BusinessDate == default || r.BusinessDate>scope.CurrentBusinessDate || r.SupplierId == Guid.Empty || string.IsNullOrWhiteSpace(r.SourceReference) || r.Lines.Count == 0 || r.Lines.Select(x => x.PurchaseOrderLineId).Distinct().Count() != r.Lines.Count ||
            r.Lines.Any(x => x.AcceptedQuantity < 0 || x.RejectedQuantity < 0 || x.QuarantinedQuantity < 0 || !ProductionCalculations.IsPostingQuantity(x.AcceptedQuantity) || !ProductionCalculations.IsPostingQuantity(x.RejectedQuantity) || !ProductionCalculations.IsPostingQuantity(x.QuarantinedQuantity) || x.SourceUnitCost < 0 || (x.SourceUnitCost.HasValue && decimal.Round(x.SourceUnitCost.Value,2)!=x.SourceUnitCost) || x.AcceptedQuantity + x.RejectedQuantity + x.QuarantinedQuantity <= 0)) throw new CosmosException("A dated supplier receipt needs unique real PO lines and nonnegative six-place disposition quantities. Missing cost remains null.");
        return Execute("purchase-receipt", orderId, r.Version, r.IdempotencyKey, r, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> BillLinksAsync(long billId, PurchaseReceiptBillLinkRequest r, CancellationToken ct)
    {
        if (r.Lines.Count == 0 || r.Lines.Any(x => x.ReceiptLineId <= 0 || x.BillItemId <= 0 || x.Quantity <= 0 || !ProductionCalculations.IsPostingQuantity(x.Quantity))) throw new CosmosException("Real receipt and bill lines with positive matching quantities are required.");
        return Execute("purchase-bill-links", billId, r.Version, r.IdempotencyKey, r, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> SupplierReturnAsync(long receiptId, PurchaseReceiptReturnRequest r, CancellationToken ct)
    {
        scope.EnsureOpenDate(r.BusinessDate);
        if (r.BusinessDate == default || r.BusinessDate>scope.CurrentBusinessDate || r.ReceiptLineId <= 0 || string.IsNullOrWhiteSpace(r.Reason) || r.AcceptedQuantity < 0 || r.RejectedQuantity < 0 || r.QuarantinedQuantity < 0 || !ProductionCalculations.IsPostingQuantity(r.AcceptedQuantity) || !ProductionCalculations.IsPostingQuantity(r.RejectedQuantity) || !ProductionCalculations.IsPostingQuantity(r.QuarantinedQuantity) || r.AcceptedQuantity + r.RejectedQuantity + r.QuarantinedQuantity <= 0) throw new CosmosException("Supplier return must reference the original receipt line and positive returnable dispositions with a reason.");
        return Execute("purchase-return", receiptId, r.Version, r.IdempotencyKey, r, ct);
    }
    public Task<ApiResponse<ProductionCommandResult>> PromiseAsync(long orderId, PurchasePromiseRequest r, CancellationToken ct)
    {
        if (r.ExpectedDate == default || string.IsNullOrWhiteSpace(r.Reason)) throw new CosmosException("A revised expected date and reason are required.");
        return Execute("purchase-promise", orderId, r.Version, r.IdempotencyKey, r, ct);
    }
    public async Task<ApiResponse<PurchasePhysicalContext>> PurchaseReadAsync(long id, string kind, CancellationToken ct) =>
        ApiResponse<PurchasePhysicalContext>.Success(await repository.ExecuteAsync<PurchasePhysicalContext>("sp_PurchasePhysical_Read", scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), new { Id = id, Kind = kind }, ct));
    public async Task<ApiResponse<PagedResult<PurchaseFollowupLine>>> FollowupsAsync(PurchaseFollowupQuery q, CancellationToken ct)
    {
        if (q.AsOfDate == default) throw new CosmosException("Follow-up requires an explicit business as-of date.");
        if (q.AsOfDate != scope.CurrentBusinessDate) throw new CosmosException("The operational PO follow-up uses today's promise and cancellation state. Select the current business date; receipt history has its own dated view.");
        return ApiResponse<PagedResult<PurchaseFollowupLine>>.Success(await repository.ExecuteAsync<PagedResult<PurchaseFollowupLine>>("sp_PurchasePhysical_Followups", scope.CompanyKey,
            user.UserId ?? throw new UnauthorizedCosmosException(), q with { PageNumber = Math.Max(1, q.PageNumber), PageSize = Math.Clamp(q.PageSize, 1, 200) }, ct));
    }
    private async Task<ApiResponse<ProductionCommandResult>> Execute(string action, long id, string version, string key, object request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 100 || version.Length != 18 || !version.StartsWith("0x", StringComparison.Ordinal))
            throw new CosmosException("A returned rowversion and idempotency key are required.");
        var procedure = action.StartsWith("purchase-", StringComparison.Ordinal) ? "sp_PurchasePhysical_Command" : "sp_PhysicalInventory_Ownership";
        return ApiResponse<ProductionCommandResult>.Success(await repository.ExecuteAsync<ProductionCommandResult>(procedure,
            scope.CompanyKey, user.UserId ?? throw new UnauthorizedCosmosException(), new { Action = action, Id = id, Request = request }, ct));
    }
}
