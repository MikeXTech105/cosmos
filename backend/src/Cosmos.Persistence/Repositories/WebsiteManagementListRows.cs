using Cosmos.Contracts.Common;
using Cosmos.Contracts.WebsiteManagement;

namespace Cosmos.Persistence.Repositories;

/// <summary>
/// Database row contracts for Website Management list procedures. These are deliberately
/// separate from API DTOs because the procedures carry TotalCount with every row.
/// </summary>
internal interface IWebsitePagedListRow
{
    int TotalCount { get; }
}

internal static class WebsitePagedResultMapper
{
    public static PagedResult<TDto> Map<TRow, TDto>(
        IReadOnlyCollection<TRow> rows,
        int pageNumber,
        int pageSize,
        Func<TRow, TDto> map)
        where TRow : IWebsitePagedListRow
    {
        var totalCount = rows.FirstOrDefault()?.TotalCount ?? 0;
        return new PagedResult<TDto>(rows.Select(map).ToArray(), pageNumber, pageSize, totalCount);
    }
}

internal sealed class WebsiteProductListRow : IWebsitePagedListRow
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal? DisplayPrice { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
    public int? ReviewCount { get; set; }
    public string? Badge { get; set; }
    public string? UrgencyText { get; set; }
    public string? Material { get; set; }
    public string? QuantityDisplay { get; set; }
    public bool? IsUvResistant { get; set; }
    public bool? IsRustProof { get; set; }
    public bool? IsWindTested { get; set; }
    public string? WarrantyDisplay { get; set; }
    public string? AmazonUrl { get; set; }
    public string? BrandName { get; set; }
    public string? AvailabilityText { get; set; }
    public int SortOrder { get; set; }
    public string PublishStatus { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public string BenefitsJson { get; set; } = "[]";
    public string? PrimaryImageUrl { get; set; }
    public byte[]? RowVersion { get; set; }
    public int TotalCount { get; set; }

    public WebsiteProductDto ToDto() => new(
        Id, Code, Name, Description, DisplayPrice, CurrencyCode, Rating, ReviewCount, Badge, UrgencyText, Material,
        QuantityDisplay, IsUvResistant, IsRustProof, IsWindTested, WarrantyDisplay, AmazonUrl, BrandName,
        AvailabilityText, SortOrder, PublishStatus, IsActive, PublishedAtUtc, BenefitsJson, PrimaryImageUrl, RowVersion);
}

internal sealed class WebsiteBlogPostListRow : IWebsitePagedListRow
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string ReadTime { get; set; } = string.Empty;
    public long CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string PublishStatus { get; set; } = string.Empty;
    public DateTime? PublishedAtUtc { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OpenGraphImageUrl { get; set; }
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public byte[]? RowVersion { get; set; }
    public int TotalCount { get; set; }

    public WebsiteBlogPostDto ToDto() => new(
        Id, Title, Slug, Excerpt, Content, CoverImageUrl, ReadTime, CategoryId, CategoryName, PublishStatus,
        PublishedAtUtc, SeoTitle, SeoDescription, OpenGraphImageUrl, IsFeatured, SortOrder, RowVersion);
}

internal sealed class WebsiteAnnouncementListRow : IWebsitePagedListRow
{
    public long Id { get; set; }
    public string? Title { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Placement { get; set; } = string.Empty;
    public string? CtaLabel { get; set; }
    public string? CtaUrl { get; set; }
    public int Priority { get; set; }
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
    public bool IsActive { get; set; }
    public string DismissalVersion { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public byte[]? RowVersion { get; set; }
    public int TotalCount { get; set; }

    public WebsiteAnnouncementDto ToDto() => new(
        Id, Title, Message, Placement, CtaLabel, CtaUrl, Priority, StartsAtUtc, EndsAtUtc, IsActive,
        DismissalVersion, SortOrder, RowVersion);
}

internal sealed class WebsiteWarrantyClaimListRow : IWebsitePagedListRow
{
    public long Id { get; set; }
    public string ReferenceId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public DateOnly PurchaseDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ResolutionType { get; set; }
    public int? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public int TotalCount { get; set; }

    public WebsiteWarrantyClaimListItemDto ToDto() => new(
        Id, ReferenceId, FullName, Email, OrderNumber, PurchaseDate, Status, ResolutionType, AssignedToUserId,
        AssignedToUserName, SubmittedAtUtc, UpdatedAtUtc);
}
