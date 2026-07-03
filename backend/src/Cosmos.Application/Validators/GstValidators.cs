using System.Text.RegularExpressions;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Gst;
using FluentValidation;

namespace Cosmos.Application.Validators;

public static partial class GstValidationRules
{
    public const string GstinPattern = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";

    public static IRuleBuilderOptions<T, string> ValidGstin<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().Length(15).Matches(GstinRegex()).WithMessage("GSTIN must be a valid 15-character Indian GSTIN.");

    [GeneratedRegex(GstinPattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex GstinRegex();
}

public sealed class CreateCompanyGstRegistrationValidator : AbstractValidator<CreateCompanyGstRegistrationRequest>
{
    public CreateCompanyGstRegistrationValidator(IGstRepository repository)
    {
        RuleFor(x => x.Gstin).ValidGstin();
        RuleFor(x => x.Gstin)
            .MustAsync((gstin, ct) => repository.GstinExistsAsync(gstin, null, ct).ContinueWith(t => !t.Result, ct))
            .WithMessage("GSTIN already exists.");
        RuleFor(x => x.LegalName).MaximumLength(250);
        RuleFor(x => x.TradeName).MaximumLength(250);
        RuleFor(x => x.StateCode).MaximumLength(10);
        RuleFor(x => x.StateName).MaximumLength(100);
        RuleFor(x => x.BranchName).MaximumLength(150);
        RuleFor(x => x.Pincode).MaximumLength(20);
        RuleFor(x => x.GstPortalUsername).MaximumLength(150);
        RuleFor(x => x.Status).NotEmpty().MaximumLength(50);
    }
}

public sealed class UpdateCompanyGstRegistrationValidator : AbstractValidator<UpdateCompanyGstRegistrationRequest>
{
    public UpdateCompanyGstRegistrationValidator(IGstRepository repository)
    {
        RuleFor(x => x.Gstin).ValidGstin();
        RuleFor(x => x.LegalName).MaximumLength(250);
        RuleFor(x => x.TradeName).MaximumLength(250);
        RuleFor(x => x.StateCode).MaximumLength(10);
        RuleFor(x => x.StateName).MaximumLength(100);
        RuleFor(x => x.BranchName).MaximumLength(150);
        RuleFor(x => x.Pincode).MaximumLength(20);
        RuleFor(x => x.GstPortalUsername).MaximumLength(150);
        RuleFor(x => x.Status).NotEmpty().MaximumLength(50);
    }
}

public sealed class CompanyGstRegistrationListValidator : AbstractValidator<CompanyGstRegistrationListRequest>
{
    private static readonly string[] AllowedSortColumns = ["Gstin", "LegalName", "StateCode", "Status", "CreatedAt"];

    public CompanyGstRegistrationListValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(IsSortDirection).WithMessage("SortDirection must be ASC or DESC.");
    }

    private static bool IsSortDirection(string? value) =>
        string.IsNullOrWhiteSpace(value) || string.Equals(value, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "DESC", StringComparison.OrdinalIgnoreCase);
}

public sealed class VerifyGstinValidator : AbstractValidator<VerifyGstinRequest>
{
    public VerifyGstinValidator() => RuleFor(x => x.Gstin).ValidGstin();
}

public sealed class GenerateEWayBillValidator : AbstractValidator<GenerateEWayBillRequest>
{
    public GenerateEWayBillValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.SalesInvoiceId).GreaterThan(0).When(x => x.SalesInvoiceId.HasValue);
        RuleFor(x => x.PurchaseInvoiceId).GreaterThan(0).When(x => x.PurchaseInvoiceId.HasValue);
        RuleFor(x => x.DocumentNumber).MaximumLength(100);
        RuleFor(x => x.VehicleNumber).MaximumLength(50);
        RuleFor(x => x.Distance).GreaterThanOrEqualTo(0).When(x => x.Distance.HasValue);
    }
}

public sealed class CancelEWayBillValidator : AbstractValidator<CancelEWayBillRequest>
{
    public CancelEWayBillValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.EWayBillNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CancelReasonCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CancelRemark).NotEmpty().MaximumLength(500);
    }
}

public sealed class UpdateEWayBillVehicleValidator : AbstractValidator<UpdateEWayBillVehicleRequest>
{
    public UpdateEWayBillVehicleValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.EWayBillNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.VehicleNumber).NotEmpty().MaximumLength(50);
    }
}

public sealed class ExtendEWayBillValidator : AbstractValidator<ExtendEWayBillRequest>
{
    public ExtendEWayBillValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.EWayBillNumber).NotEmpty().MaximumLength(100);
    }
}

public sealed class GenerateEInvoiceValidator : AbstractValidator<GenerateEInvoiceRequest>
{
    public GenerateEInvoiceValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.SalesInvoiceId).GreaterThan(0).When(x => x.SalesInvoiceId.HasValue);
        RuleFor(x => x.DocumentNumber).MaximumLength(100);
        RuleFor(x => x.SellerGstin!).ValidGstin().When(x => !string.IsNullOrWhiteSpace(x.SellerGstin));
        RuleFor(x => x.BuyerGstin!).ValidGstin().When(x => !string.IsNullOrWhiteSpace(x.BuyerGstin));
    }
}

public sealed class CancelEInvoiceValidator : AbstractValidator<CancelEInvoiceRequest>
{
    public CancelEInvoiceValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.Irn).NotEmpty().MaximumLength(500);
        RuleFor(x => x.CancelReasonCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CancelRemark).NotEmpty().MaximumLength(500);
    }
}

public sealed class GenerateGstOtpValidator : AbstractValidator<GenerateGstOtpRequest>
{
    public GenerateGstOtpValidator() => RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
}

public sealed class AuthenticateGstOtpValidator : AbstractValidator<AuthenticateGstOtpRequest>
{
    public AuthenticateGstOtpValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.Otp).NotEmpty().MaximumLength(20).WithMessage("OTP is required.");
    }
}

public sealed class GstApiLogListValidator : AbstractValidator<GstApiLogListRequest>
{
    private static readonly string[] AllowedSortColumns = ["ApiType", "CreatedAt", "StatusCode", "IsSuccess", "DurationMs"];

    public GstApiLogListValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(x => string.IsNullOrWhiteSpace(x) || AllowedSortColumns.Contains(x)).WithMessage("SortBy is invalid.");
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be ASC or DESC.");
        RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue);
    }
}
