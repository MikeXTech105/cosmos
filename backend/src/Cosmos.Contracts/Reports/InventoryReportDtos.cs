namespace Cosmos.Contracts.Reports;

public sealed class StockSummaryReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal OpeningStock { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal ReservedStock { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal StockValue { get; set; }
}

public sealed class StockLedgerReportDto
{
    public long Id { get; set; }
    public DateOnly MovementDate { get; set; }
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public long SourceId { get; set; }
    public int MovementType { get; set; }
    public decimal InQuantity { get; set; }
    public decimal OutQuantity { get; set; }
    public decimal BalanceQuantity { get; set; }
    public int TotalCount { get; set; }
}

public sealed class ItemMovementReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int MovementType { get; set; }
    public decimal InQuantity { get; set; }
    public decimal OutQuantity { get; set; }
    public decimal NetQuantity { get; set; }
    public int TotalCount { get; set; }
}

public sealed class LowStockReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal ShortageQuantity { get; set; }
}

public sealed class StockValuationReportDto
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal ValuationRate { get; set; }
    public decimal StockValue { get; set; }
}
