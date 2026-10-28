using System.Text.RegularExpressions;
using System.Text.Json;
using System.Text.Json.Nodes;
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

    public static bool HasJsonFields(string? json, params string[] requiredPaths)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        try
        {
            var node = JsonNode.Parse(json);
            return node is not null && requiredPaths.All(path => FindPath(node, path) is not null);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    public static bool HasJsonArrayItems(string? json, string arrayPath)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        try
        {
            return FindPath(JsonNode.Parse(json), arrayPath) is JsonArray { Count: > 0 };
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static JsonNode? FindPath(JsonNode? node, string path)
    {
        foreach (var part in path.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (node is not JsonObject obj)
            {
                return null;
            }

            var match = obj.FirstOrDefault(x => string.Equals(x.Key, part, StringComparison.OrdinalIgnoreCase));
            node = match.Value;
        }

        return node;
    }
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
        RuleFor(x => x.RequestJson)
            .NotEmpty()
            .WithMessage("GSTZen E-Way Bill generation requires RequestJson with the official GSTZen payload.")
            .Must(x => GstValidationRules.HasJsonFields(
                x,
                "supplyType",
                "subSupplyType",
                "docType",
                "docNo",
                "docDate",
                "fromGstin",
                "fromPincode",
                "fromStateCode",
                "toGstin",
                "toPincode",
                "toStateCode",
                "transactionType",
                "totalValue",
                "totInvValue",
                "transMode",
                "transDistance"))
            .WithMessage("GSTZen E-Way Bill RequestJson is missing one or more required fields.")
            .Must(x => GstValidationRules.HasJsonArrayItems(x, "itemList"))
            .WithMessage("GSTZen E-Way Bill RequestJson must contain at least one itemList entry.");
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

public sealed class GetEWayBillDetailsValidator : AbstractValidator<GetEWayBillDetailsRequest>
{
    public GetEWayBillDetailsValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.EWayBillNumber).NotEmpty().MaximumLength(100);
    }
}

public sealed class UpdateEWayBillVehicleValidator : AbstractValidator<UpdateEWayBillVehicleRequest>
{
    public UpdateEWayBillVehicleValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.EWayBillNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.VehicleNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.RequestJson)
            .NotEmpty()
            .WithMessage("GSTZen E-Way Bill Update Part B requires RequestJson with the official GSTZen payload.")
            .Must(x => GstValidationRules.HasJsonFields(x, "ewbNo", "FromPlace", "FromState", "ReasonCode", "ReasonRem", "TransMode", "VehicleNo"))
            .WithMessage("GSTZen Update Part B RequestJson is missing one or more required fields.");
    }
}

public sealed class ExtendEWayBillValidator : AbstractValidator<ExtendEWayBillRequest>
{
    public ExtendEWayBillValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.EWayBillNumber).NotEmpty().MaximumLength(100);
        RuleFor(x => x.FromPlace).NotEmpty().MaximumLength(100);
        RuleFor(x => x.FromState).NotNull().InclusiveBetween(1,38);
        RuleFor(x => x.FromPincode).NotEmpty().Matches("^[1-9][0-9]{5}$");
        RuleFor(x => x.TransportMode).Must(x=>x is "1" or "2" or "3" or "4" or "5");
        RuleFor(x => x.RemainingDistance).Must(x=>int.TryParse(x,out var distance) && distance>0).WithMessage("Enter a positive remaining distance in kilometres.");
        RuleFor(x => x.ExtensionReasonCode).NotEmpty().MaximumLength(10);
        RuleFor(x => x.ExtensionRemark).NotEmpty().MaximumLength(500);
        RuleFor(x => x.VehicleNumber).NotEmpty().MaximumLength(50).When(x=>x.TransportMode=="1");
        RuleFor(x => x.TransportDocumentNumber).NotEmpty().MaximumLength(100).When(x=>x.TransportMode is "2" or "3" or "4");
        RuleFor(x => x.TransportDocumentDate).NotNull().When(x=>!string.IsNullOrWhiteSpace(x.TransportDocumentNumber));
        RuleFor(x => x.ConsignmentStatus).Must(x=>x=="M").When(x=>x.TransportMode!="5");
        RuleFor(x => x.ConsignmentStatus).Must(x=>x=="T").When(x=>x.TransportMode=="5");
        RuleFor(x => x.TransitType).Must(x=>x is "R" or "W" or "O").When(x=>x.TransportMode=="5");
        RuleFor(x => x.AddressLine1).NotEmpty().MaximumLength(250).When(x=>x.TransportMode=="5");
        RuleFor(x => x.AddressLine2).NotEmpty().MaximumLength(250).When(x=>x.TransportMode=="5");
        RuleFor(x => x.AddressLine3).NotEmpty().MaximumLength(250).When(x=>x.TransportMode=="5");
        RuleFor(x => x.IdempotencyKey).NotNull().NotEqual(Guid.Empty);
        RuleFor(x => x.Version).NotEmpty().Matches("^0x[0-9A-Fa-f]{16}$");
        RuleFor(x => x.RequestJson).Must(string.IsNullOrWhiteSpace).WithMessage("Raw provider request JSON is not accepted for extensions.");
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
        RuleFor(x => x.RequestJson)
            .NotEmpty()
            .WithMessage("GSTZen E-Invoice generation requires RequestJson with the official GSTZen/NIC payload.")
            .Must(x => GstValidationRules.HasJsonFields(
                x,
                "Version",
                "TranDtls.TaxSch",
                "TranDtls.SupTyp",
                "DocDtls.Typ",
                "DocDtls.No",
                "DocDtls.Dt",
                "SellerDtls.Gstin",
                "SellerDtls.LglNm",
                "SellerDtls.Addr1",
                "SellerDtls.Loc",
                "SellerDtls.Pin",
                "SellerDtls.Stcd",
                "BuyerDtls.Gstin",
                "BuyerDtls.LglNm",
                "BuyerDtls.Pos",
                "BuyerDtls.Addr1",
                "BuyerDtls.Loc",
                "BuyerDtls.Pin",
                "BuyerDtls.Stcd",
                "ValDtls.AssVal",
                "ValDtls.TotInvVal"))
            .WithMessage("GSTZen E-Invoice RequestJson is missing one or more required fields.")
            .Must(x => GstValidationRules.HasJsonArrayItems(x, "ItemList"))
            .WithMessage("GSTZen E-Invoice RequestJson must contain at least one ItemList entry.");
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

public sealed class GetEInvoiceDetailsValidator : AbstractValidator<GetEInvoiceDetailsRequest>
{
    public GetEInvoiceDetailsValidator()
    {
        RuleFor(x => x.CompanyGstRegistrationId).GreaterThan(0);
        RuleFor(x => x.Irn).NotEmpty().Length(64).WithMessage("IRN must be the 64-character invoice reference number.");
        RuleFor(x => x.SellerGstin!).ValidGstin().When(x => !string.IsNullOrWhiteSpace(x.SellerGstin));
        RuleFor(x => x.Irp).MaximumLength(20);
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
