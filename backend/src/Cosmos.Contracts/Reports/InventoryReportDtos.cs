using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.Reports;

public sealed class InventoryReportFiltersDto
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public DateOnly? AsOfDate { get; set; }
    public long? ItemId { get; set; }
    public long? CategoryId { get; set; }
    public long? UnitId { get; set; }
    public Guid? PartyId { get; set; }
    public string? Search { get; set; }
    public string? StockStatus { get; set; }
    public string? MovementType { get; set; }
    public string? SourceType { get; set; }
    public bool IncludeInactive { get; set; }
    public int? InactiveDays { get; set; }
    public decimal? MinimumStockValue { get; set; }
    public int? Top { get; set; }
    public int? MinimumTransactions { get; set; }
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
}

public sealed record InventoryReportData<TSummary, TRow>(TSummary Summary, PagedResult<TRow> Rows);

public sealed class InventoryReportResult<TSummary, TRow>
{
    public string ReportTitle { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; }
    public string? ValuationMethod { get; set; }
    public InventoryReportFiltersDto AppliedFilters { get; set; } = new();
    public TSummary Summary { get; set; } = default!;
    public IReadOnlyCollection<TRow> Rows { get; set; } = [];
}

public sealed class PagedInventoryReportResult<TSummary, TRow>
{
    public string ReportTitle { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; }
    public string? ValuationMethod { get; set; }
    public InventoryReportFiltersDto AppliedFilters { get; set; } = new();
    public TSummary Summary { get; set; } = default!;
    public PagedResult<TRow> Rows { get; set; } = new([], 1, 20, 0);
}

public sealed class StockSummaryTotalsDto
{
    public int ItemCount { get; set; }
    public decimal TotalOpeningQuantity { get; set; }
    public decimal TotalPurchaseQuantity { get; set; }
    public decimal TotalSalesQuantity { get; set; }
    public decimal TotalPurchaseReturnQuantity { get; set; }
    public decimal TotalSalesReturnQuantity { get; set; }
    public decimal TotalClosingQuantity { get; set; }
    public decimal TotalReservedQuantity { get; set; }
    public decimal TotalAvailableQuantity { get; set; }
    public decimal TotalStockValue { get; set; }
}

public sealed class StockSummaryReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal OpeningQuantity { get; set; }
    public decimal PurchaseQuantity { get; set; }
    public decimal SalesQuantity { get; set; }
    public decimal PurchaseReturnQuantity { get; set; }
    public decimal SalesReturnQuantity { get; set; }
    public decimal AdjustmentInQuantity { get; set; }
    public decimal AdjustmentOutQuantity { get; set; }
    public decimal ClosingQuantity { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal PurchaseRate { get; set; }
    public decimal SalesRate { get; set; }
    public decimal StockValue { get; set; }
    public string StockStatus { get; set; } = string.Empty;
    public int TotalCount { get; set; }
}

public sealed class StockLedgerTotalsDto
{
    public decimal OpeningBalance { get; set; }
    public decimal TotalInward { get; set; }
    public decimal TotalOutward { get; set; }
    public decimal ClosingBalance { get; set; }
    public int TransactionCount { get; set; }
}

public class StockLedgerReportDto
{
    public long Id { get; set; }
    public DateTime MovementDateTime { get; set; }
    public DateOnly MovementDate { get; set; }
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public long SourceId { get; set; }
    public string? VoucherNumber { get; set; }
    public int MovementType { get; set; }
    public string MovementTypeName { get; set; } = string.Empty;
    public Guid? PartyId { get; set; }
    public string? PartyName { get; set; }
    public decimal QuantityIn { get; set; }
    public decimal QuantityOut { get; set; }
    public decimal InQuantity { get => QuantityIn; set => QuantityIn = value; }
    public decimal OutQuantity { get => QuantityOut; set => QuantityOut = value; }
    public decimal RunningQuantityBalance { get; set; }
    public decimal BalanceQuantity { get => RunningQuantityBalance; set => RunningQuantityBalance = value; }
    public decimal? Rate { get; set; }
    public decimal? Value { get; set; }
    public string? Remarks { get; set; }
    public int TotalCount { get; set; }
}

public sealed class ItemLedgerSummaryDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public decimal TotalInward { get; set; }
    public decimal TotalOutward { get; set; }
    public decimal ClosingBalance { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal ReservedStock { get; set; }
    public decimal AvailableStock { get; set; }
}

public sealed class ItemMovementReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int MovementType { get; set; }
    public string MovementTypeName { get; set; } = string.Empty;
    public decimal InQuantity { get; set; }
    public decimal OutQuantity { get; set; }
    public decimal NetQuantity { get; set; }
    public int TotalCount { get; set; }
}

public sealed class StockExceptionSummaryDto
{
    public int ItemCount { get; set; }
    public decimal TotalCurrentStock { get; set; }
    public decimal TotalAvailableStock { get; set; }
    public decimal TotalShortageQuantity { get; set; }
    public decimal EstimatedValueImpact { get; set; }
}

public sealed class LowStockReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal ReservedStock { get; set; }
    public decimal AvailableStock { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal ReorderShortage { get; set; }
    public decimal ShortageQuantity { get => ReorderShortage; set => ReorderShortage = value; }
    public decimal PurchasePrice { get; set; }
    public decimal EstimatedReorderValue { get; set; }
    public int TotalCount { get; set; }
}

public sealed class NegativeStockReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal AvailableStock { get; set; }
    public decimal MinimumStock { get; set; }
    public DateTime? LastStockMovementDate { get; set; }
    public string? LastMovementType { get; set; }
    public decimal NegativeQuantity { get; set; }
    public decimal EstimatedStockValueImpact { get; set; }
    public int TotalCount { get; set; }
}

public sealed class StockMovementSummaryDto
{
    public decimal TotalInward { get; set; }
    public decimal TotalOutward { get; set; }
    public decimal NetMovement { get; set; }
    public int NumberOfTransactions { get; set; }
}

public sealed class StockMovementReportRowDto : StockLedgerReportDto
{
}

public sealed class StockValuationSummaryDto
{
    public decimal TotalQuantity { get; set; }
    public decimal TotalStockValue { get; set; }
    public int ItemCount { get; set; }
}

public sealed class StockValuationReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal ClosingQuantity { get; set; }
    public decimal CurrentStock { get => ClosingQuantity; set => ClosingQuantity = value; }
    public decimal UnitCost { get; set; }
    public decimal ValuationRate { get => UnitCost; set => UnitCost = value; }
    public decimal StockValue { get; set; }
    public string ValuationMethod { get; set; } = string.Empty;
    public int TotalCount { get; set; }
}

public sealed class DeadStockSummaryDto
{
    public int ItemCount { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal TotalStockValue { get; set; }
}

public sealed class DeadStockReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal CurrentQuantity { get; set; }
    public decimal StockValue { get; set; }
    public DateOnly? LastSoldDate { get; set; }
    public int? DaysSinceLastSale { get; set; }
    public DateOnly? LastPurchaseDate { get; set; }
    public string StockAgeClassification { get; set; } = string.Empty;
    public bool NeverSold { get; set; }
    public int TotalCount { get; set; }
}

public sealed class MovingItemsSummaryDto
{
    public int ItemCount { get; set; }
    public decimal TotalSoldQuantity { get; set; }
    public int TotalSalesTransactions { get; set; }
    public decimal TotalSalesValue { get; set; }
}

public sealed class FastMovingItemReportDto
{
    public int Rank { get; set; }
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal TotalSoldQuantity { get; set; }
    public int SalesTransactionCount { get; set; }
    public decimal SalesValue { get; set; }
    public decimal AverageQuantityPerTransaction { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal? EstimatedDaysOfStock { get; set; }
    public int TotalCount { get; set; }
}

public sealed class SlowMovingItemReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal SoldQuantity { get; set; }
    public int SalesTransactionCount { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal StockValue { get; set; }
    public DateOnly? LastSoldDate { get; set; }
    public int? DaysSinceLastSale { get; set; }
    public string MovementClassification { get; set; } = string.Empty;
    public int TotalCount { get; set; }
}
