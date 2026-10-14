using System.ComponentModel;

namespace Cosmos.Contracts.Parties;

public sealed record PartyDto(
    Guid Id,
    string PartyCode,
    string PartyName,
    string PartyType,
    string? MobileNo,
    string? Email,
    int GSTTreatment,
    string? GSTIN,
    string? LegalName,
    string? TradeName,
    string? BillingAddressLine1,
    string? BillingAddressLine2,
    string? BillingCity,
    string? BillingState,
    string? BillingCountry,
    string? BillingPincode,
    string? ShippingAddressLine1,
    string? ShippingAddressLine2,
    string? ShippingCity,
    string? ShippingState,
    string? ShippingCountry,
    string? ShippingPincode,
    decimal OpeningBalance,
    int OpeningBalanceType,
    decimal CreditLimit,
    int CreditPeriodDays,
    bool IsActive,
    DateTime CreatedOn,
    Guid? CreatedBy,
    DateTime? ModifiedOn,
    Guid? ModifiedBy,
    bool IsDeleted,
    DateTime? DeletedOn,
    byte[] RowVersion);

public sealed record PartyListItemDto(
    Guid Id,
    string PartyCode,
    string PartyName,
    string? MobileNo,
    string? Email,
    int GSTTreatment,
    string? GSTIN,
    decimal OpeningBalance,
    int OpeningBalanceType,
    decimal CreditLimit,
    int CreditPeriodDays,
    bool IsActive,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    int TotalCount)
{
    public string PartyType { get; init; } = "Both";
}

public sealed record PartyListSummaryDto(
    int AllCount,
    int CustomerCount,
    int SupplierCount,
    int BothCount,
    int InactiveCount,
    decimal TotalCreditLimit);

public sealed record PartyListMetadataDto(int TotalCount);

public sealed record PartyExportDto(
    [property: DisplayName("Party Name")] string PartyName,
    [property: DisplayName("Party Type")] string PartyType,
    [property: DisplayName("GSTIN")] string? GSTIN,
    [property: DisplayName("Mobile")] string? Mobile,
    [property: DisplayName("Email")] string? Email,
    [property: DisplayName("Billing City")] string? BillingCity,
    [property: DisplayName("Billing State")] string? BillingState,
    [property: DisplayName("Credit Limit")] decimal CreditLimit,
    [property: DisplayName("Opening Balance")] decimal OpeningBalance,
    [property: DisplayName("Opening Balance Type")] int OpeningBalanceType,
    [property: DisplayName("Status")] string Status);

public sealed record PartySettingsDto(
    Guid Id,
    bool EnablePartyGrouping,
    bool EnableShippingAddress,
    bool PrintShippingAddress,
    bool EnablePartyStatus,
    bool EnablePaymentReminder,
    int ReminderDays,
    string? ReminderMessage,
    bool EnableLoyaltyPoints,
    string? AdditionalField1Name,
    bool AdditionalField1Enabled,
    bool AdditionalField1ShowInPrint,
    string? AdditionalField2Name,
    bool AdditionalField2Enabled,
    bool AdditionalField2ShowInPrint,
    string? AdditionalField3Name,
    bool AdditionalField3Enabled,
    bool AdditionalField3ShowInPrint,
    string? AdditionalField4Name,
    bool AdditionalField4Enabled,
    bool AdditionalField4ShowInPrint,
    int AdditionalField4Type,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
