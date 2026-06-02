namespace Cosmos.Domain.Entities;

public sealed class Party
{
    public Guid Id { get; set; }
    public string PartyCode { get; set; } = string.Empty;
    public string PartyName { get; set; } = string.Empty;
    public string? MobileNo { get; set; }
    public string? Email { get; set; }
    public int GSTTreatment { get; set; }
    public string? GSTIN { get; set; }
    public string? LegalName { get; set; }
    public string? TradeName { get; set; }
    public string? BillingAddressLine1 { get; set; }
    public string? BillingAddressLine2 { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingState { get; set; }
    public string? BillingCountry { get; set; }
    public string? BillingPincode { get; set; }
    public string? ShippingAddressLine1 { get; set; }
    public string? ShippingAddressLine2 { get; set; }
    public string? ShippingCity { get; set; }
    public string? ShippingState { get; set; }
    public string? ShippingCountry { get; set; }
    public string? ShippingPincode { get; set; }
    public decimal OpeningBalance { get; set; }
    public int OpeningBalanceType { get; set; }
    public decimal CreditLimit { get; set; }
    public int CreditPeriodDays { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedOn { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public Guid? ModifiedBy { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedOn { get; set; }
    public byte[] RowVersion { get; set; } = [];
}
