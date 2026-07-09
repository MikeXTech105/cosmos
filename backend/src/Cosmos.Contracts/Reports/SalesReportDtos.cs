namespace Cosmos.Contracts.Reports;

public sealed class SalesSummaryReportDto
{
    public int TotalInvoices { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public decimal CancelledAmount { get; set; }
}

public sealed class SalesInvoiceRegisterReportDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public Guid CustomerPartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int Status { get; set; }
    public int PaymentStatus { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public int TotalCount { get; set; }
}

public sealed class SalesByPartyReportDto
{
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public int InvoiceCount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}

public sealed class SalesByItemReportDto
{
    public long ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? HsnSacCode { get; set; }
    public decimal Quantity { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public sealed class PaymentInReportDto
{
    public long Id { get; set; }
    public long SalesInvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly PaymentDate { get; set; }
    public Guid CustomerPartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int PaymentMode { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public int TotalCount { get; set; }
}

public sealed class CustomerReceivableReportDto
{
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public decimal TotalSales { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}

public sealed class SalesTaxSummaryReportDto
{
    public string? HsnSacCode { get; set; }
    public decimal GstRate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}
