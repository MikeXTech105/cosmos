using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Domain.WebsiteManagement;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class SaveWebsiteProductRequestValidator : AbstractValidator<SaveWebsiteProductRequest>
{
    public SaveWebsiteProductRequestValidator()
    {
        RuleFor(x => x.Code).Must(NotBlank).WithMessage("Code is required.").MaximumLength(100);
        RuleFor(x => x.Name).Must(NotBlank).WithMessage("Name is required.").MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.DisplayPrice).GreaterThanOrEqualTo(0).When(x => x.DisplayPrice.HasValue);
        RuleFor(x => x.CurrencyCode).MaximumLength(3).Must(v => string.IsNullOrWhiteSpace(v) || v.Trim().Length == 3).WithMessage("CurrencyCode must be a three-letter code.");
        RuleFor(x => x.Rating).InclusiveBetween(0, 5).When(x => x.Rating.HasValue);
        RuleFor(x => x.ReviewCount).GreaterThanOrEqualTo(0).When(x => x.ReviewCount.HasValue);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 100000);
        RuleFor(x => x.AmazonUrl).Must(BeHttpUrl).When(x => !string.IsNullOrWhiteSpace(x.AmazonUrl)).WithMessage("AmazonUrl must be an absolute HTTP or HTTPS URL.");
        RuleForEach(x => x.Benefits).SetValidator(new WebsiteProductBenefitRequestValidator());
        RuleForEach(x => x.Media).SetValidator(new WebsiteProductMediaRequestValidator());
    }

    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
    private static bool BeHttpUrl(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

public sealed class WebsiteProductBenefitRequestValidator : AbstractValidator<WebsiteProductBenefitRequest>
{
    public WebsiteProductBenefitRequestValidator()
    {
        RuleFor(x => x.BenefitText).Must(x => !string.IsNullOrWhiteSpace(x)).WithMessage("Benefit text is required.").MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 100000);
    }
}

public sealed class WebsiteProductMediaRequestValidator : AbstractValidator<WebsiteProductMediaRequest>
{
    public WebsiteProductMediaRequestValidator()
    {
        RuleFor(x => x.PublicUrl).Must(x => !string.IsNullOrWhiteSpace(x)).WithMessage("Media URL is required.").MaximumLength(1000)
            .Must(BeSafePublicUrl).WithMessage("Media URL must be an absolute HTTP/HTTPS URL or an application-relative /uploads/ URL.");
        RuleFor(x => x.AltText).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 100000);
    }

    private static bool BeSafePublicUrl(string? value) => value?.StartsWith("/uploads/", StringComparison.Ordinal) == true ||
        (Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));
}

public sealed class WebsiteProductListQueryValidator : AbstractValidator<WebsiteProductListQuery>
{
    public WebsiteProductListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.PublishStatus).Must(BePublishStatus).WithMessage("PublishStatus must be Draft, Published, or Archived.");
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(v => EmptyOr(v, "name", "code", "sortOrder", "publishedAtUtc", "createdAtUtc", "updatedAtUtc")).WithMessage("SortBy is not supported.");
        RuleFor(x => x.SortDirection).Must(v => EmptyOr(v, "asc", "desc")).WithMessage("SortDirection must be asc or desc.");
    }
    private static bool BePublishStatus(string? value) => string.IsNullOrWhiteSpace(value) || Enum.TryParse<WebsitePublishStatus>(value, true, out _);
    private static bool EmptyOr(string? value, params string[] allowed) => string.IsNullOrWhiteSpace(value) || allowed.Contains(value.Trim(), StringComparer.OrdinalIgnoreCase);
}

public sealed class SaveWebsiteBlogCategoryRequestValidator : AbstractValidator<SaveWebsiteBlogCategoryRequest>
{
    public SaveWebsiteBlogCategoryRequestValidator()
    {
        RuleFor(x => x.Name).Must(NotBlank).WithMessage("Name is required.").MaximumLength(150);
        RuleFor(x => x.Slug).Must(IsSlug).WithMessage("Slug must contain lowercase letters, numbers, and hyphens only.").MaximumLength(180);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 100000);
    }
    internal static bool IsSlug(string? value) => !string.IsNullOrWhiteSpace(value) && System.Text.RegularExpressions.Regex.IsMatch(value.Trim(), "^[a-z0-9]+(?:-[a-z0-9]+)*$");
    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
}

public sealed class SaveWebsiteBlogPostRequestValidator : AbstractValidator<SaveWebsiteBlogPostRequest>
{
    public SaveWebsiteBlogPostRequestValidator()
    {
        RuleFor(x => x.Title).Must(NotBlank).WithMessage("Title is required.").MaximumLength(250);
        RuleFor(x => x.Slug).Must(SaveWebsiteBlogCategoryRequestValidator.IsSlug).WithMessage("Slug must contain lowercase letters, numbers, and hyphens only.").MaximumLength(220);
        RuleFor(x => x.Excerpt).Must(NotBlank).WithMessage("Excerpt is required.").MaximumLength(1000);
        RuleFor(x => x.Content).Must(NotBlank).WithMessage("Content is required.").MaximumLength(100000);
        RuleFor(x => x.ReadTime).Must(NotBlank).WithMessage("ReadTime is required.").MaximumLength(50);
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.CoverImageUrl).Must(BeSafePublicUrl).When(x => !string.IsNullOrWhiteSpace(x.CoverImageUrl)).WithMessage("CoverImageUrl must be an absolute HTTP/HTTPS URL or an application-relative /uploads/ URL.");
        RuleFor(x => x.OpenGraphImageUrl).Must(BeSafePublicUrl).When(x => !string.IsNullOrWhiteSpace(x.OpenGraphImageUrl)).WithMessage("OpenGraphImageUrl must be an absolute HTTP/HTTPS URL or an application-relative /uploads/ URL.");
        RuleFor(x => x.SeoTitle).MaximumLength(250);
        RuleFor(x => x.SeoDescription).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 100000);
        RuleFor(x => x.PublishedAtUtc).NotNull().When(x => x.PublishStatus == WebsitePublishStatus.Published).WithMessage("PublishedAtUtc is required for published posts.");
    }
    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
    private static bool BeSafePublicUrl(string? value) => value?.StartsWith("/uploads/", StringComparison.Ordinal) == true ||
        (Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));
}

public sealed class WebsiteBlogPostListQueryValidator : AbstractValidator<WebsiteBlogPostListQuery>
{
    public WebsiteBlogPostListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.PublishStatus).Must(v => string.IsNullOrWhiteSpace(v) || Enum.TryParse<WebsitePublishStatus>(v, true, out _)).WithMessage("PublishStatus must be Draft, Published, or Archived.");
        RuleFor(x => x.PageNumber).GreaterThan(0); RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(v => string.IsNullOrWhiteSpace(v) || new[] { "title", "slug", "publishedAtUtc", "createdAtUtc", "updatedAtUtc", "sortOrder" }.Contains(v.Trim(), StringComparer.OrdinalIgnoreCase)).WithMessage("SortBy is not supported.");
        RuleFor(x => x.SortDirection).Must(v => string.IsNullOrWhiteSpace(v) || v.Trim().Equals("asc", StringComparison.OrdinalIgnoreCase) || v.Trim().Equals("desc", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be asc or desc.");
    }
}

public sealed class SaveWebsiteAnnouncementRequestValidator : AbstractValidator<SaveWebsiteAnnouncementRequest>
{
    public SaveWebsiteAnnouncementRequestValidator()
    {
        RuleFor(x => x.Title).MaximumLength(200);
        RuleFor(x => x.Message).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Message is required.").MaximumLength(1000);
        RuleFor(x => x.CtaLabel).MaximumLength(100);
        RuleFor(x => x.CtaUrl).Must(BeHttpUrl).When(x => !string.IsNullOrWhiteSpace(x.CtaUrl)).WithMessage("CtaUrl must be an absolute HTTP or HTTPS URL.");
        RuleFor(x => x.Priority).InclusiveBetween(-10000, 10000); RuleFor(x => x.SortOrder).InclusiveBetween(0, 100000);
        RuleFor(x => x).Must(x => !x.StartsAtUtc.HasValue || !x.EndsAtUtc.HasValue || x.StartsAtUtc < x.EndsAtUtc).WithMessage("StartsAtUtc must be before EndsAtUtc.");
    }
    private static bool BeHttpUrl(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

public sealed class WebsiteWarrantySubmissionRequestValidator : AbstractValidator<WebsiteWarrantySubmissionRequest>
{
    public WebsiteWarrantySubmissionRequestValidator()
    {
        RuleFor(x => x.FullName).Must(v => !string.IsNullOrWhiteSpace(v) && v.Trim().Length is >= 2 and <= 100).WithMessage("Full name must be between 2 and 100 characters.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.OrderNumber).Must(v => !string.IsNullOrWhiteSpace(v) && v.Trim().Length is >= 3 and <= 100).WithMessage("Order number must be between 3 and 100 characters.");
        RuleFor(x => x.PurchaseDate).GreaterThan(DateOnly.MinValue).WithMessage("Purchase date is required.").Must(v => v <= DateOnly.FromDateTime(DateTime.UtcNow)).WithMessage("Purchase date cannot be in the future.");
        RuleFor(x => x.Description).Must(v => !string.IsNullOrWhiteSpace(v) && v.Trim().Length is >= 20 and <= 2000).WithMessage("Issue description must be between 20 and 2000 characters.");
        RuleFor(x => x.Consent).Equal(true).WithMessage("Please confirm that the information is accurate.");
        RuleFor(x => x.Source).Must(v => string.IsNullOrWhiteSpace(v) || string.Equals(v.Trim(), "WEWEL_WEBSITE", StringComparison.Ordinal)).WithMessage("Source must be WEWEL_WEBSITE.");
        RuleFor(x => x.Invoice).NotNull().Must(x => x.AttachmentType == WarrantyAttachmentType.Invoice).WithMessage("An invoice is required.");
        RuleFor(x => x.ProductImages).NotNull().Must(x => x.Count is >= 1 and <= 5).WithMessage("Add between 1 and 5 product damage images.");
        RuleForEach(x => x.ProductImages).Must(x => x.AttachmentType == WarrantyAttachmentType.ProductDamageImage).WithMessage("Product image metadata is invalid.");
    }
}

public sealed class WebsiteWarrantyClaimListQueryValidator : AbstractValidator<WebsiteWarrantyClaimListQuery>
{
    public WebsiteWarrantyClaimListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200); RuleFor(x => x.Status).Must(v => string.IsNullOrWhiteSpace(v) || Enum.TryParse<WarrantyClaimStatus>(v, true, out _)).WithMessage("Status is invalid.");
        RuleFor(x => x.ResolutionType).Must(v => string.IsNullOrWhiteSpace(v) || Enum.TryParse<WarrantyResolutionType>(v, true, out _)).WithMessage("ResolutionType is invalid.");
        RuleFor(x => x.AssignedToUserId).GreaterThan(0).When(x => x.AssignedToUserId.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0); RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).Must(v => string.IsNullOrWhiteSpace(v) || new[] { "submittedAtUtc", "updatedAtUtc", "referenceId", "status", "purchaseDate" }.Contains(v.Trim(), StringComparer.OrdinalIgnoreCase)).WithMessage("SortBy is not supported.");
        RuleFor(x => x.SortDirection).Must(v => string.IsNullOrWhiteSpace(v) || v.Trim().Equals("asc", StringComparison.OrdinalIgnoreCase) || v.Trim().Equals("desc", StringComparison.OrdinalIgnoreCase)).WithMessage("SortDirection must be asc or desc.");
        RuleFor(x => x).Must(x => !x.SubmittedFromUtc.HasValue || !x.SubmittedToUtc.HasValue || x.SubmittedFromUtc <= x.SubmittedToUtc).WithMessage("SubmittedFromUtc must be on or before SubmittedToUtc.");
        RuleFor(x => x).Must(x => !x.PurchaseDateFrom.HasValue || !x.PurchaseDateTo.HasValue || x.PurchaseDateFrom <= x.PurchaseDateTo).WithMessage("PurchaseDateFrom must be on or before PurchaseDateTo.");
    }
}

public sealed class ResolveWebsiteWarrantyClaimRequestValidator : AbstractValidator<ResolveWebsiteWarrantyClaimRequest>
{
    public ResolveWebsiteWarrantyClaimRequestValidator()
    {
        RuleFor(x => x.RefundAmount).GreaterThan(0).When(x => x.ResolutionType == WarrantyResolutionType.Refund).WithMessage("RefundAmount must be greater than zero for a refund.");
        RuleFor(x => x.RefundReference).Must(v => !string.IsNullOrWhiteSpace(v)).When(x => x.ResolutionType == WarrantyResolutionType.Refund).WithMessage("RefundReference is required for a refund.");
        RuleFor(x => x.ReplacementReference).Must(v => !string.IsNullOrWhiteSpace(v)).When(x => x.ResolutionType == WarrantyResolutionType.Replacement).WithMessage("ReplacementReference is required for a replacement.");
        RuleFor(x => x.RepairReference).Must(v => !string.IsNullOrWhiteSpace(v)).When(x => x.ResolutionType == WarrantyResolutionType.Repair).WithMessage("RepairReference is required for a repair.");
        RuleFor(x => x.ResolutionRemarks).MaximumLength(2000); RuleFor(x => x.Remark).MaximumLength(1000);
    }
}

public sealed class AddWebsiteWarrantyNoteRequestValidator : AbstractValidator<AddWebsiteWarrantyNoteRequest>
{
    public AddWebsiteWarrantyNoteRequestValidator() => RuleFor(x => x.Note).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Note is required.").MaximumLength(4000);
}
public sealed class AddWebsiteWarrantyCustomerMessageRequestValidator : AbstractValidator<AddWebsiteWarrantyCustomerMessageRequest>
{
    public AddWebsiteWarrantyCustomerMessageRequestValidator() => RuleFor(x => x.Message).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Message is required.").MaximumLength(4000);
}
public sealed class UpdateWebsiteSettingsRequestValidator : AbstractValidator<UpdateWebsiteSettingsRequest>
{
    public static readonly IReadOnlySet<string> AllowedKeys = new HashSet<string>(StringComparer.Ordinal)
    {
        "SupportEmail", "ManufacturingLocation", "SocialInstagramUrl", "SocialFacebookUrl", "SocialYoutubeUrl", "SocialLinkedInUrl",
        "WhatsAppNumber", "WhatsAppDefaultMessage", "DefaultSeoTitle", "DefaultSeoDescription", "DefaultSeoImage", "PublicCountersEnabled", "WarrantyStatisticsVisible"
    };
    public UpdateWebsiteSettingsRequestValidator()
    {
        RuleFor(x => x.Settings).NotNull().Must(x => x.Count is >= 1 and <= 20).WithMessage("Provide between 1 and 20 settings.");
        RuleForEach(x => x.Settings).ChildRules(setting =>
        {
            setting.RuleFor(x => x.SettingKey).Must(x => AllowedKeys.Contains(x)).WithMessage("SettingKey is not allowed.");
            setting.RuleFor(x => x.Value).MaximumLength(2000);
            setting.RuleFor(x => x).Must(IsValidSettingValue).WithMessage("Use a valid email, HTTP(S) URL, or true/false value for this setting.");
        });
        RuleFor(x => x.Settings).Must(x => x.Select(s => s.SettingKey).Distinct(StringComparer.Ordinal).Count() == x.Count).WithMessage("Setting keys must be unique.");
    }
    private static bool IsValidSettingValue(WebsiteSettingValueRequest setting)
    {
        var value = setting.Value?.Trim() ?? "";
        if (setting.SettingKey is "PublicCountersEnabled" or "WarrantyStatisticsVisible") return bool.TryParse(value, out _);
        if (value.Length == 0) return true;
        if (setting.SettingKey == "SupportEmail") return System.Net.Mail.MailAddress.TryCreate(value, out var address) && address.Address == value;
        if (setting.SettingKey.EndsWith("Url", StringComparison.Ordinal) || setting.SettingKey == "DefaultSeoImage")
            return Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https";
        return true;
    }
}

public sealed class WebsiteContactEnquiryRequestValidator : AbstractValidator<WebsiteContactEnquiryRequest>
{
    public WebsiteContactEnquiryRequestValidator()
    {
        RuleFor(x => x.FirstName).Must(v => !string.IsNullOrWhiteSpace(v) && v.Trim().Length <= 100).WithMessage("First name is required and must be 100 characters or fewer.");
        RuleFor(x => x.LastName).Must(v => !string.IsNullOrWhiteSpace(v) && v.Trim().Length <= 100).WithMessage("Last name is required and must be 100 characters or fewer.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Subject).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Subject is required.").MaximumLength(200);
        RuleFor(x => x.Message).Must(v => !string.IsNullOrWhiteSpace(v) && v.Trim().Length is >= 10 and <= 4000).WithMessage("Message must be between 10 and 4000 characters.");
        RuleFor(x => x.EnquiryType).Must(v => string.IsNullOrWhiteSpace(v) || new[] { "PRODUCT_QUESTION", "WARRANTY_SUPPORT", "BULK_ORDER", "DISTRIBUTOR_ENQUIRY", "BUSINESS_PARTNERSHIP", "AMAZON_SUPPORT", "GENERAL", "OTHER" }.Contains(v.Trim(), StringComparer.Ordinal)).WithMessage("EnquiryType is invalid.");
        RuleFor(x => x.Source).Must(v => string.IsNullOrWhiteSpace(v) || string.Equals(v.Trim(), "WEWEL_WEBSITE", StringComparison.Ordinal)).WithMessage("Source must be WEWEL_WEBSITE.").MaximumLength(100);
    }
}
