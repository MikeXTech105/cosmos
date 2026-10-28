namespace Cosmos.Contracts.Manufacturing;

public sealed record PurchaseReceiptCreditRequest(string IdempotencyKey,long BillItemId,DateOnly BusinessDate,string Reason);

public sealed record PurchaseReceiptLineRequest(long PurchaseOrderLineId, long ItemId, long UnitId,
    decimal AcceptedQuantity, decimal RejectedQuantity = 0, decimal QuarantinedQuantity = 0, decimal? SourceUnitCost = null);
public sealed record PurchaseReceiptRequest(string Version, string IdempotencyKey, DateOnly BusinessDate,
    Guid SupplierId, string SourceReference, IReadOnlyCollection<PurchaseReceiptLineRequest> Lines, string? AttachmentReference = null);
public sealed record PurchaseReceiptBillLink(long ReceiptLineId, long BillItemId, decimal Quantity);
public sealed record PurchaseReceiptBillLinkRequest(string Version, string IdempotencyKey, IReadOnlyCollection<PurchaseReceiptBillLink> Lines);
public sealed record PurchaseReceiptReturnRequest(string Version, string IdempotencyKey, DateOnly BusinessDate,
    long ReceiptLineId, decimal AcceptedQuantity, decimal RejectedQuantity, decimal QuarantinedQuantity, string Reason);
public sealed record PurchasePromiseRequest(string Version, string IdempotencyKey, DateOnly ExpectedDate, string Reason);
public sealed record PurchaseReceiptBalanceLine(long Id, long PurchaseOrderLineId, long ItemId, long UnitId,
    decimal AcceptedQuantity, decimal RejectedQuantity, decimal QuarantinedQuantity, decimal ReturnedAcceptedQuantity,
    decimal ReturnedRejectedQuantity, decimal ReturnedQuarantinedQuantity, decimal BilledQuantity, DateOnly BusinessDate)
{
    public long ReceiptId { get; init; }
    public string? ReceiptVersion { get; init; }
    public string? SourceReference { get; init; }
    public decimal? SourceUnitCost { get; init; }
    public string? ItemName { get; init; }
    public string? UnitName { get; init; }
}
public sealed record PurchaseReceiptReturnHistory(long Id, long ReceiptId, long ReceiptLineId, DateOnly BusinessDate,
    decimal AcceptedQuantity, decimal RejectedQuantity, decimal QuarantinedQuantity, string Reason,
    long? PurchaseReturnId, long? BillItemId);
public sealed record PurchaseReceiptBillLinkContext(long Id, long ReceiptLineId, long BillItemId, long PurchaseBillId, decimal Quantity)
{
    public string? PurchaseBillNo { get; init; }
    public int? BillStatus { get; init; }
}
public sealed record PurchasePromiseHistoryDto(long Id, DateOnly? PreviousDate, DateOnly ExpectedDate, string Reason, DateTime CreatedAtUtc);
public sealed record PurchasePhysicalOrderLine(long Id, long ItemId, long UnitId, decimal OrderedQuantity, string? ItemName, string? UnitName);
public sealed record PurchasePhysicalContext(long Id, string Version, IReadOnlyCollection<PurchaseReceiptBalanceLine> Lines)
{
    public IReadOnlyCollection<PurchaseReceiptReturnHistory> Returns { get; init; } = [];
    public IReadOnlyCollection<PurchaseReceiptBillLinkContext> BillLinks { get; init; } = [];
    public IReadOnlyCollection<PurchasePromiseHistoryDto> PromiseHistory { get; init; } = [];
    public IReadOnlyCollection<PurchasePhysicalOrderLine> OrderLines { get; init; } = [];
}
public sealed record PurchaseFollowupQuery(DateOnly AsOfDate, Guid? SupplierId = null, bool OverdueOnly = false,
    int PageNumber = 1, int PageSize = 50);
public sealed record PurchaseFollowupLine(long PurchaseOrderId, string PurchaseOrderNo, Guid SupplierId,
    long PurchaseOrderLineId, long ItemId, long UnitId, DateOnly OrderDate, DateOnly? ExpectedDate,
    decimal OrderedQuantity, decimal AcceptedQuantity, decimal RejectedQuantity, decimal QuarantinedQuantity,
    decimal ReturnedQuantity, decimal? PendingQuantity, bool IsOverdue)
{
    public string? SupplierName { get; init; }
    public string? ItemName { get; init; }
    public string? UnitName { get; init; }
}
