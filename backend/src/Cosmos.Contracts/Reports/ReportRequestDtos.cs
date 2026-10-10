namespace Cosmos.Contracts.Reports;

public class ReportDateRangeQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}

public class ReportPagedQuery : ReportDateRangeQuery
{
    public string? Search { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; } = "DESC";
}

public sealed class SalesInvoiceRegisterReportQuery : ReportPagedQuery
{
    public Guid? PartyId { get; set; }
    public int? Status { get; set; }
    public int? PaymentStatus { get; set; }
}

public sealed class SalesByPartyReportQuery : ReportDateRangeQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class SalesByItemReportQuery : ReportDateRangeQuery
{
    public long? ItemId { get; set; }
}

public sealed class PaymentInReportQuery : ReportPagedQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class CustomerReceivablesReportQuery : ReportDateRangeQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class PurchaseBillRegisterReportQuery : ReportPagedQuery
{
    public Guid? PartyId { get; set; }
    public int? Status { get; set; }
    public int? PaymentStatus { get; set; }
}

public sealed class PurchaseBySupplierReportQuery : ReportDateRangeQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class PurchaseByItemReportQuery : ReportDateRangeQuery
{
    public long? ItemId { get; set; }
}

public sealed class PaymentOutReportQuery : ReportPagedQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class SupplierPayablesReportQuery : ReportDateRangeQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class ExpenseReportQuery : ReportDateRangeQuery
{
    public long? CategoryId { get; set; }
    public Guid? PartyId { get; set; }
}

public class InventoryReportQuery : ReportPagedQuery
{
    public DateOnly? AsOfDate { get; set; }
    public long? ItemId { get; set; }
    public long? CategoryId { get; set; }
    public long? UnitId { get; set; }
    public string? StockStatus { get; set; }
    public bool IncludeInactive { get; set; }
}

public class StockLedgerReportQuery : InventoryReportQuery
{
    public string? MovementType { get; set; }
    public string? SourceType { get; set; }
    public Guid? PartyId { get; set; }
}

public sealed class StockMovementReportQuery : StockLedgerReportQuery
{
}

public sealed class LowStockReportQuery : ReportPagedQuery
{
    public long? CategoryId { get; set; }
    public long? UnitId { get; set; }
    public bool IncludeInactive { get; set; }
}

public sealed class NegativeStockReportQuery : ReportPagedQuery
{
    public long? CategoryId { get; set; }
    public long? UnitId { get; set; }
    public bool IncludeInactive { get; set; }
}

public sealed class StockAgeingReportQuery : ReportPagedQuery
{
    public DateOnly? AsOfDate { get; set; }
    public int InactiveDays { get; set; } = 90;
    public long? CategoryId { get; set; }
    public long? ItemId { get; set; }
    public decimal? MinimumStockValue { get; set; }
    public bool IncludeInactive { get; set; }
}

public sealed class MovingItemsReportQuery : ReportPagedQuery
{
    public long? CategoryId { get; set; }
    public int? Top { get; set; }
    public int MinimumTransactions { get; set; } = 1;
    public bool IncludeInactive { get; set; }
}

public sealed class PartyReportQuery : ReportPagedQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class PartyStatementReportQuery : ReportDateRangeQuery
{
    public Guid? PartyId { get; set; }
}

public sealed class AgingReportQuery : ReportDateRangeQuery
{
    public Guid? PartyId { get; set; }
}
