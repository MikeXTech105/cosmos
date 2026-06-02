namespace Cosmos.Application.Parties.Commands;

public sealed record UpdatePartySettingsCommand(
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
    int AdditionalField4Type);
