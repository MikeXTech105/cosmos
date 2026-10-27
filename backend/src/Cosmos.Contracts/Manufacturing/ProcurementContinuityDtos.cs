namespace Cosmos.Contracts.Manufacturing;

public sealed record ProcurementPurchaseLineRequest(long PlanningRunLineId, decimal? UnitPrice,
    decimal TaxPercentage, string PriceSourceReference);
public sealed record ProcurementPurchaseDraftRequest(string IdempotencyKey, Guid SupplierId, DateOnly OrderDate,
    DateOnly? ExpectedDate, IReadOnlyCollection<ProcurementPurchaseLineRequest> Lines, string? Notes = null);
public enum ProcurementLeadTimeUnit { CalendarDays = 1, Weeks = 2 }
public sealed record ProcurementSupplierPolicyRequest(string Version, string IdempotencyKey, decimal LeadTime,
    ProcurementLeadTimeUnit LeadTimeUnit, Guid? DefaultSupplierId, string SourceReference);
public sealed record ProcurementSupplierPolicyDto(long ItemId, string Version, decimal? SourceLeadTime,
    ProcurementLeadTimeUnit? SourceLeadTimeUnit, decimal? ConfiguredLeadTimeDays, Guid? DefaultSupplierId, string? SourceReference);
public sealed record SupplierPerformanceQuery(DateOnly FromDate, DateOnly ToDate, Guid? SupplierId = null,
    int PageNumber = 1, int PageSize = 50);
public sealed record SupplierPerformanceLine(Guid SupplierId, long UnitId, decimal AcceptedQuantity,
    decimal ReturnedQuantity, decimal OnTimeAcceptedQuantity, decimal DatedAcceptedQuantity,
    decimal UndatedAcceptedQuantity, decimal? OnTimePercent, decimal? QuantityWeightedLeadDays);
