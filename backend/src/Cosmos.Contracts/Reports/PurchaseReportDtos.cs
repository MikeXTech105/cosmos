namespace Cosmos.Contracts.Reports;

public sealed class PurchaseSummaryReportDto
{
    public int TotalBills { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}

public sealed class PurchaseBillRegisterReportDto
{
    public long Id { get; set; }
    public string PurchaseBillNo { get; set; } = string.Empty;
    public string? SupplierInvoiceNo { get; set; }
    public DateOnly BillDate { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public int Status { get; set; }
    public int PaymentStatus { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public int TotalCount { get; set; }
}

public sealed class PurchaseBySupplierReportDto
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public int BillCount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}

public sealed class PurchaseByItemReportDto
{
    public long ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? HsnSacCode { get; set; }
    public decimal Quantity { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public sealed class PaymentOutReportDto
{
    public long Id { get; set; }
    public string PaymentOutNo { get; set; } = string.Empty;
    public DateOnly PaymentDate { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int PaymentMode { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public int TotalCount { get; set; }
}

public sealed class SupplierPayableReportDto
{
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public decimal TotalPurchase { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}

public sealed class PurchaseTaxSummaryReportDto
{
    public string? HsnSacCode { get; set; }
    public decimal GstRate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}
