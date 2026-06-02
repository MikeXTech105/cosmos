namespace Cosmos.Domain.Entities;

public sealed class PartySettings
{
    public Guid Id { get; set; }
    public bool EnablePartyGrouping { get; set; }
    public bool EnableShippingAddress { get; set; }
    public bool PrintShippingAddress { get; set; }
    public bool EnablePartyStatus { get; set; }
    public bool EnablePaymentReminder { get; set; }
    public int ReminderDays { get; set; }
    public string? ReminderMessage { get; set; }
    public bool EnableLoyaltyPoints { get; set; }
    public string? AdditionalField1Name { get; set; }
    public bool AdditionalField1Enabled { get; set; }
    public bool AdditionalField1ShowInPrint { get; set; }
    public string? AdditionalField2Name { get; set; }
    public bool AdditionalField2Enabled { get; set; }
    public bool AdditionalField2ShowInPrint { get; set; }
    public string? AdditionalField3Name { get; set; }
    public bool AdditionalField3Enabled { get; set; }
    public bool AdditionalField3ShowInPrint { get; set; }
    public string? AdditionalField4Name { get; set; }
    public bool AdditionalField4Enabled { get; set; }
    public bool AdditionalField4ShowInPrint { get; set; }
    public int AdditionalField4Type { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
