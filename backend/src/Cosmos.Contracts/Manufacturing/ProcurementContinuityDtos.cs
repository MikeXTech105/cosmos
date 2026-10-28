namespace Cosmos.Contracts.Manufacturing;

public sealed record ProcurementPurchaseLineRequest(long PlanningRunLineId, decimal? UnitPrice,
    decimal TaxPercentage, string PriceSourceReference);
public sealed record ProcurementPurchaseDraftRequest(string IdempotencyKey, Guid SupplierId, DateOnly OrderDate,
    DateOnly? ExpectedDate, IReadOnlyCollection<ProcurementPurchaseLineRequest> Lines, string? Notes = null);
public sealed record ProcurementPurchaseSourceLine(long PlanningRunLineId, long PurchaseOrderId, string PurchaseOrderNo,
    long PurchaseOrderLineId, long ItemId, long UnitId, decimal Quantity, int Status, string? PriceSourceReference);
public sealed record ProcurementPurchaseSourceContext(long Id, IReadOnlyCollection<ProcurementPurchaseSourceLine> Lines);
public enum ProcurementLeadTimeUnit { CalendarDays = 1, Weeks = 2 }
public sealed record ProcurementSupplierPolicyRequest(string Version, string IdempotencyKey, decimal LeadTime,
    ProcurementLeadTimeUnit LeadTimeUnit, Guid? DefaultSupplierId, string SourceReference);
public sealed record ProcurementSupplierPolicyDto(long ItemId, string Version, decimal? SourceLeadTime,
    ProcurementLeadTimeUnit? SourceLeadTimeUnit, decimal? ConfiguredLeadTimeDays, Guid? DefaultSupplierId, string? SourceReference);
public sealed record SupplierPerformanceQuery(DateOnly FromDate, DateOnly ToDate, Guid? SupplierId = null,
    int PageNumber = 1, int PageSize = 50);
public sealed record SupplierPerformanceLine(Guid SupplierId, long UnitId, decimal AcceptedQuantity,
    decimal ReturnedQuantity, decimal OnTimeAcceptedQuantity, decimal DatedAcceptedQuantity,
    decimal UndatedAcceptedQuantity, decimal? OnTimePercent, decimal? QuantityWeightedLeadDays)
{
    public string? SupplierName { get; init; }
    public string? UnitName { get; init; }
}
