using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class CreatePartyValidator : AbstractValidator<CreatePartyCommand>
{
    public CreatePartyValidator()
    {
        Include(new PartyCommandValidator<CreatePartyCommand>());
    }
}

public sealed class UpdatePartyValidator : AbstractValidator<UpdatePartyCommand>
{
    public UpdatePartyValidator()
    {
        Include(new PartyCommandValidator<UpdatePartyCommand>());
    }
}

public sealed class ChangePartyStatusValidator : AbstractValidator<ChangePartyStatusCommand>
{
    public ChangePartyStatusValidator()
    {
        RuleFor(x => x.IsActive).NotNull();
    }
}

public sealed class GetPartiesQueryValidator : AbstractValidator<GetPartiesQuery>
{
    private static readonly string[] AllowedSortColumns = ["PartyCode", "PartyName", "MobileNo", "GSTIN", "CreatedOn"];

    public GetPartiesQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be ASC or DESC.");
    }
}

public sealed class UpdatePartySettingsValidator : AbstractValidator<UpdatePartySettingsCommand>
{
    public UpdatePartySettingsValidator()
    {
        RuleFor(x => x.ReminderDays).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ReminderMessage).MaximumLength(500);
        RuleFor(x => x.AdditionalField1Name).MaximumLength(100);
        RuleFor(x => x.AdditionalField2Name).MaximumLength(100);
        RuleFor(x => x.AdditionalField3Name).MaximumLength(100);
        RuleFor(x => x.AdditionalField4Name).MaximumLength(100);
        RuleFor(x => x.AdditionalField4Type).GreaterThanOrEqualTo(0);
    }
}

internal sealed class PartyCommandValidator<T> : AbstractValidator<T>
{
    private const string GstinPattern = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";

    public PartyCommandValidator()
    {
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.PartyCode))).NotEmpty().MaximumLength(50);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.PartyName))).NotEmpty().MaximumLength(200);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.MobileNo))).MaximumLength(20);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.Email))).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(GetString(x, nameof(CreatePartyCommand.Email))));
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.GSTIN))).Matches(GstinPattern).When(x => !string.IsNullOrWhiteSpace(GetString(x, nameof(CreatePartyCommand.GSTIN)))).WithMessage("GSTIN format is invalid.");
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.LegalName))).MaximumLength(250);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.TradeName))).MaximumLength(250);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.BillingAddressLine1))).MaximumLength(250);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.BillingAddressLine2))).MaximumLength(250);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.BillingCity))).MaximumLength(100);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.BillingState))).MaximumLength(100);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.BillingCountry))).MaximumLength(100);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.BillingPincode))).MaximumLength(20);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.ShippingAddressLine1))).MaximumLength(250);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.ShippingAddressLine2))).MaximumLength(250);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.ShippingCity))).MaximumLength(100);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.ShippingState))).MaximumLength(100);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.ShippingCountry))).MaximumLength(100);
        RuleFor(x => GetString(x, nameof(CreatePartyCommand.ShippingPincode))).MaximumLength(20);
        RuleFor(x => GetDecimal(x, nameof(CreatePartyCommand.CreditLimit))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetInt(x, nameof(CreatePartyCommand.CreditPeriodDays))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetDecimal(x, nameof(CreatePartyCommand.OpeningBalance))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetInt(x, nameof(CreatePartyCommand.GSTTreatment))).GreaterThanOrEqualTo(0);
        RuleFor(x => GetInt(x, nameof(CreatePartyCommand.OpeningBalanceType))).GreaterThanOrEqualTo(0);
    }

    private static string? GetString(T instance, string propertyName) => typeof(T).GetProperty(propertyName)?.GetValue(instance) as string;
    private static int GetInt(T instance, string propertyName) => (int)(typeof(T).GetProperty(propertyName)?.GetValue(instance) ?? 0);
    private static decimal GetDecimal(T instance, string propertyName) => (decimal)(typeof(T).GetProperty(propertyName)?.GetValue(instance) ?? 0m);
}
