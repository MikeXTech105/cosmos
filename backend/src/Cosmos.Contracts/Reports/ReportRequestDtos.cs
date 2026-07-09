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

public sealed class InventoryReportQuery : ReportPagedQuery
{
    public long? ItemId { get; set; }
    public long? CategoryId { get; set; }
}

public sealed class LowStockReportQuery
{
    public long? CategoryId { get; set; }
    public string? Search { get; set; }
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
