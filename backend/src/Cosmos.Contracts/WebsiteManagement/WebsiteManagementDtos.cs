using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cosmos.Domain.WebsiteManagement;

namespace Cosmos.Contracts.WebsiteManagement;

public sealed record WebsiteProductDto(
    long Id,
    string Code,
    string Name,
    string? Description,
    decimal? DisplayPrice,
    string CurrencyCode,
    decimal? Rating,
    int? ReviewCount,
    string? Badge,
    string? UrgencyText,
    string? Material,
    string? QuantityDisplay,
    bool? IsUvResistant,
    bool? IsRustProof,
    bool? IsWindTested,
    string? WarrantyDisplay,
    string? AmazonUrl,
    string? BrandName,
    string? AvailabilityText,
    int SortOrder,
    string PublishStatus,
    bool IsActive,
    DateTime? PublishedAtUtc,
    [property: JsonIgnore] string? BenefitsJson,
    string? PrimaryImageUrl,
    byte[]? RowVersion = null)
{
    public IReadOnlyList<string> Benefits => WebsiteJson.ReadStrings(BenefitsJson);
}

public sealed record WebsiteProductMediaDto(long Id, long WebsiteProductId, string PublicUrl, string? AltText, int SortOrder, bool IsPrimary, DateTime CreatedAtUtc);
public sealed record WebsiteProductBenefitRequest(string BenefitText, int SortOrder = 0);
public sealed record WebsiteProductMediaRequest(string PublicUrl, string? AltText, int SortOrder = 0, bool IsPrimary = false);
public sealed record SaveWebsiteProductRequest(
    string Code, string Name, string? Description, decimal? DisplayPrice, string? CurrencyCode, decimal? Rating, int? ReviewCount,
    string? Badge, string? UrgencyText, string? Material, string? QuantityDisplay, bool? IsUvResistant, bool? IsRustProof,
    bool? IsWindTested, string? WarrantyDisplay, string? AmazonUrl, string? BrandName, string? AvailabilityText,
    int SortOrder, WebsitePublishStatus PublishStatus, bool IsActive,
    IReadOnlyList<WebsiteProductBenefitRequest>? Benefits = null,
    IReadOnlyList<WebsiteProductMediaRequest>? Media = null,
    string? RowVersion = null);
public sealed record WebsiteProductListQuery(string? Search = null, string? PublishStatus = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20, string? SortBy = null, string? SortDirection = null);

public sealed record WebsiteBlogCategoryDto(long Id, string Name, string Slug, string? Description, int SortOrder, bool IsActive, byte[]? RowVersion = null);
public sealed record SaveWebsiteBlogCategoryRequest(string Name, string Slug, string? Description, int SortOrder, bool IsActive, string? RowVersion = null);
public sealed record WebsiteBlogPostDto(
    long Id, string Title, string Slug, string Excerpt, string Content, string? CoverImageUrl, string ReadTime, long CategoryId,
    string? CategoryName, string PublishStatus, DateTime? PublishedAtUtc, string? SeoTitle, string? SeoDescription,
    string? OpenGraphImageUrl, bool IsFeatured, int SortOrder, byte[]? RowVersion = null);
public sealed record SaveWebsiteBlogPostRequest(
    string Title, string Slug, string Excerpt, string Content, string? CoverImageUrl, string ReadTime, long CategoryId,
    WebsitePublishStatus PublishStatus, DateTime? PublishedAtUtc, string? SeoTitle, string? SeoDescription,
    string? OpenGraphImageUrl, bool IsFeatured, int SortOrder, string? RowVersion = null);
public sealed record WebsiteBlogPostListQuery(string? Search = null, long? CategoryId = null, string? PublishStatus = null, int PageNumber = 1, int PageSize = 20, string? SortBy = null, string? SortDirection = null);

public sealed record WebsiteAnnouncementDto(
    long Id, string? Title, string Message, string Placement, string? CtaLabel, string? CtaUrl, int Priority,
    DateTime? StartsAtUtc, DateTime? EndsAtUtc, bool IsActive, string DismissalVersion, int SortOrder, byte[]? RowVersion = null);
public sealed record SaveWebsiteAnnouncementRequest(
    string? Title, string Message, AnnouncementPlacement Placement, string? CtaLabel, string? CtaUrl, int Priority,
    DateTime? StartsAtUtc, DateTime? EndsAtUtc, bool IsActive, string? DismissalVersion, int SortOrder, string? RowVersion = null);
public sealed record WebsiteAnnouncementListQuery(string? Placement = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20);

public sealed record WebsiteWarrantySubmissionRequest(
    string FullName, string Email, string OrderNumber, DateOnly PurchaseDate, string Description, string? Source, bool Consent,
    WebsiteWarrantyUpload Invoice, IReadOnlyList<WebsiteWarrantyUpload> ProductImages);
public sealed record WebsiteWarrantyUpload(string OriginalFileName, string DeclaredContentType, string DetectedContentType, byte[] Content, WarrantyAttachmentType AttachmentType);
public sealed record WebsitePublicSubmissionResponse(string Message, string? ReferenceId = null);
public sealed record WebsitePublicErrorResponse(string Message, string Code, IReadOnlyDictionary<string, string>? FieldErrors = null, string? CorrelationId = null);

public sealed record WebsiteWarrantyClaimListQuery(
    string? Search = null, string? Status = null, string? ResolutionType = null, int? AssignedToUserId = null,
    DateTime? SubmittedFromUtc = null, DateTime? SubmittedToUtc = null, DateOnly? PurchaseDateFrom = null, DateOnly? PurchaseDateTo = null,
    int PageNumber = 1, int PageSize = 20, string? SortBy = null, string? SortDirection = null);
public sealed record WebsiteWarrantyClaimListItemDto(
    long Id, string ReferenceId, string FullName, string Email, string OrderNumber, DateOnly PurchaseDate, string Status,
    string? ResolutionType, int? AssignedToUserId, string? AssignedToUserName, DateTime SubmittedAtUtc, DateTime? UpdatedAtUtc);
public sealed record WebsiteWarrantyClaimDto(
    long Id, string ReferenceId, string FullName, string Email, string OrderNumber, DateOnly PurchaseDate, string Description,
    string Source, bool ConsentAccepted, DateTime ConsentAcceptedAtUtc, long? WebsiteProductId, string Status, string? ResolutionType,
    int? AssignedToUserId, string? AssignedToUserName, decimal? RefundAmount, string? RefundReference, string? ReplacementReference,
    string? ReplacementTrackingNumber, string? RepairReference, string? ResolutionRemarks, DateTime SubmittedAtUtc, DateTime? ReviewedAtUtc,
    DateTime? ResolvedAtUtc, DateTime? CompletedAtUtc, DateTime? UpdatedAtUtc);
public sealed record WebsiteWarrantyAttachmentDto(long Id, long WarrantyClaimId, string AttachmentType, string OriginalFileName, string DetectedMimeType, long SizeBytes, string ScanStatus, DateTime CreatedAtUtc);
public sealed record WebsiteWarrantyAttachmentDownload(long Id, string StorageKey, string OriginalFileName, string DetectedMimeType);
public sealed record WebsiteWarrantyHistoryDto(long Id, long WarrantyClaimId, string EventType, string? OldStatus, string? NewStatus, string? OldResolutionType, string? NewResolutionType, string? Remark, int? ChangedByUserId, string? ChangedByName, DateTime ChangedAtUtc);
public sealed record WebsiteWarrantyNoteDto(long Id, long WarrantyClaimId, string Note, int CreatedByUserId, string? CreatedByName, DateTime CreatedAtUtc);
public sealed record WebsiteWarrantyCustomerMessageDto(long Id, long WarrantyClaimId, string Message, int CreatedByUserId, string? CreatedByName, DateTime CreatedAtUtc);
public sealed record AssignWebsiteWarrantyClaimRequest(int? AssignedToUserId, string? Remark = null);
public sealed record WarrantyWorkflowRequest(string? Remark = null);
public sealed record ResolveWebsiteWarrantyClaimRequest(WarrantyResolutionType ResolutionType, decimal? RefundAmount, string? RefundReference, string? ReplacementReference, string? ReplacementTrackingNumber, string? RepairReference, string? ResolutionRemarks, string? Remark = null);
public sealed record AddWebsiteWarrantyNoteRequest(string Note);
public sealed record AddWebsiteWarrantyCustomerMessageRequest(string Message);
public sealed record WebsiteWarrantyReportDto(int TotalClaims, int SubmittedClaims, int UnderReviewClaims, int NeedMoreInformationClaims, int ApprovedClaims, int RejectedClaims, int CompletedClaims, int RefundCount, decimal RefundAmountTotal, int ReplacementCount, decimal? AverageResolutionHours, int OpenUnder7Days, int Open7To30Days, int OpenOver30Days);

public sealed record WebsiteDashboardOverviewDto(
    int TotalProducts, int PublishedProducts, int TotalBlogPosts, int PublishedBlogPosts, int ActiveAnnouncements,
    int TotalWarrantyClaims, int SubmittedClaims, int UnderReviewClaims, int ApprovedClaims, int RejectedClaims, int CompletedClaims,
    int RefundResolutions, int ReplacementResolutions, int ClaimsThisMonth)
{
    public IReadOnlyList<WebsiteWarrantyClaimListItemDto> RecentWarrantyClaims { get; init; } = Array.Empty<WebsiteWarrantyClaimListItemDto>();
}

public sealed record WebsiteSettingDto(string SettingKey, string Value, bool IsPublic, DateTime UpdatedAtUtc, int? UpdatedByUserId);
public sealed record UpdateWebsiteSettingsRequest(IReadOnlyList<WebsiteSettingValueRequest> Settings);
public sealed record WebsiteSettingValueRequest(string SettingKey, string Value, bool IsPublic);

public sealed record WebsiteContactEnquiryRequest(string FirstName, string LastName, string Email, string Subject, string Message, string? EnquiryType, string? Source);

public static class WebsiteJson
{
    public static IReadOnlyList<string> ReadStrings(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try { return JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>(); }
        catch (JsonException) { return Array.Empty<string>(); }
    }
}
