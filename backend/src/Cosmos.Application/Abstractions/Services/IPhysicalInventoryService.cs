using Cosmos.Contracts.Manufacturing;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IPhysicalInventoryService
{
    Task<ApiResponse<ProductionCommandResult>> ApprovePurchaseAsync(long orderId,ProductionOrderActionRequest r,CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ClosePurchaseRemainderAsync(long orderId,ProductionOrderActionRequest r,CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> VerifyPackingAsync(long shipmentId,ShipmentPackingVerificationRequest r,CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ReceiptCreditAsync(long returnId,PurchaseReceiptCreditRequest r,CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> PurchaseDraftAsync(long runId, ProcurementPurchaseDraftRequest r, CancellationToken ct);
    Task<ApiResponse<ProcurementPurchaseSourceContext>> PurchaseSourcesAsync(long runId, CancellationToken ct);
    Task<ApiResponse<ProcurementSupplierPolicyDto>> SupplierPolicyAsync(long itemId, ProcurementSupplierPolicyRequest? r, CancellationToken ct);
    Task<ApiResponse<PagedResult<SupplierPerformanceLine>>> SupplierPerformanceAsync(SupplierPerformanceQuery q, CancellationToken ct);
    Task<ApiResponse<PhysicalOwnershipSnapshot>> ReadAsync(long id, string kind, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> InvoiceOwnershipAsync(long invoiceId, InvoiceOwnershipRequest request, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ShipmentLinksAsync(long shipmentId, ShipmentInvoiceLinkRequest request, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ReceiptAsync(long orderId, PurchaseReceiptRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> BillLinksAsync(long billId, PurchaseReceiptBillLinkRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> SupplierReturnAsync(long receiptId, PurchaseReceiptReturnRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> PromiseAsync(long orderId, PurchasePromiseRequest r, CancellationToken ct);
    Task<ApiResponse<PurchasePhysicalContext>> PurchaseReadAsync(long id, string kind, CancellationToken ct);
    Task<ApiResponse<PagedResult<PurchaseFollowupLine>>> FollowupsAsync(PurchaseFollowupQuery q, CancellationToken ct);
}
