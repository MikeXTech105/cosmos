namespace Cosmos.Domain.Sales;

public sealed class SalesInvoice
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public Guid CustomerPartyId { get; set; }
    public long? CompanyGstRegistrationId { get; set; }
    public string? PlaceOfSupplyStateCode { get; set; }
    public string? PlaceOfSupplySource { get; set; }
    public int? PriceBasis { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }
    public SalesInvoiceStatus Status { get; set; }
    public SalesPaymentStatus PaymentStatus { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public long? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
    public long? DeletedBy { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

public sealed class SalesInvoiceItem
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
    public DateTime CreatedAtUtc { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public long? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}

public sealed class SalesInvoicePayment
{
    public long Id { get; set; }
    public long SalesInvoiceId { get; set; }
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public SalesPaymentMode PaymentMode { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public long? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}
