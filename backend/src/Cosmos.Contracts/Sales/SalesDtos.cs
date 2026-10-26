using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.Sales;

public class SalesInvoiceDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public Guid CustomerPartyId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerMobileNo { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }
    public int Status { get; set; }
    public int PaymentStatus { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    /// <summary>Explicit issuing registration chosen for this invoice; null is retained for historical invoices.</summary>
    public long? CompanyGstRegistrationId { get; set; }
    public string? CompanyGstin { get; set; }
    public string? CompanyGstLegalName { get; set; }
    public string? CompanyGstBranchName { get; set; }
    public string? PlaceOfSupplyStateCode { get; set; }
    public string? PlaceOfSupplySource { get; set; }
    public int? PriceBasis { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public int TotalCount { get; set; }
}

public sealed class SalesInvoiceDetailDto : SalesInvoiceDto
{
    public IReadOnlyCollection<SalesInvoiceItemDto> Items { get; set; } = Array.Empty<SalesInvoiceItemDto>();
    public IReadOnlyCollection<SalesPaymentDto> Payments { get; set; } = Array.Empty<SalesPaymentDto>();
}

public sealed class SalesInvoiceItemDto
{
    public long Id { get; set; }
    public long SalesInvoiceId { get; set; }
    public long ItemId { get; set; }
    public string ItemNameSnapshot { get; set; } = string.Empty;
    public string? HsnSacCodeSnapshot { get; set; }
    public decimal Quantity { get; set; }
    public long? UnitId { get; set; }
    public string? UnitNameSnapshot { get; set; }
    public decimal Rate { get; set; }
    public decimal DiscountPercentage { get; set; }
    public decimal DiscountAmount { get; set; }
    public long? TaxRateId { get; set; }
    public decimal TaxPercentageSnapshot { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public sealed class SalesPaymentDto
{
    public long Id { get; set; }
    public long SalesInvoiceId { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public int PaymentMode { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public sealed record SalesInvoiceCalculatedTotals(
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal GrandTotal,
    decimal PaidAmount,
    decimal DueAmount,
    int PaymentStatus);

public sealed record SalesSummaryReportDto(int TotalInvoices, decimal TotalSalesAmount, decimal TotalPaidAmount, decimal TotalDueAmount);
public sealed record SalesInvoiceListSummaryDto(int TotalInvoices, decimal TotalSalesAmount, decimal UnpaidAmount, int OverdueCount);
public sealed record CustomerReceivableReportDto(Guid CustomerPartyId, string CustomerName, decimal TotalSales, decimal PaidAmount, decimal DueAmount);
public sealed record ItemWiseSalesReportDto(long ItemId, string ItemName, decimal QuantitySold, decimal TotalAmount);

public sealed record PagedSalesInvoiceResponse(PagedResult<SalesInvoiceDto> Result);
