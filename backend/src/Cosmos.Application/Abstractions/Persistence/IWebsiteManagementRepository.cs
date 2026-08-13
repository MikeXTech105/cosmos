using Cosmos.Contracts.Common;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Domain.WebsiteManagement;

namespace Cosmos.Application.Abstractions.Persistence;

/// <summary>Stored-procedure boundary for Website Management. Public projections deliberately omit private warranty storage metadata.</summary>
public interface IWebsiteManagementRepository
{
    Task<PagedResult<WebsiteProductDto>> GetProductsAsync(WebsiteProductListQuery query, CancellationToken ct);
    Task<WebsiteProductDto?> GetProductByIdAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteProductDto>> GetPublicProductsAsync(CancellationToken ct);
    Task<WebsiteProductDto> SaveProductAsync(long? id, SaveWebsiteProductRequest request, int userId, CancellationToken ct);
    Task DeleteProductAsync(long id, int userId, CancellationToken ct);

    Task<PagedResult<WebsiteBlogPostDto>> GetBlogPostsAsync(WebsiteBlogPostListQuery query, CancellationToken ct);
    Task<WebsiteBlogPostDto?> GetBlogPostByIdAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteBlogPostDto>> GetPublicBlogPostsAsync(CancellationToken ct);
    Task<WebsiteBlogPostDto?> GetPublicBlogPostBySlugAsync(string slug, CancellationToken ct);
    Task<WebsiteBlogPostDto> SaveBlogPostAsync(long? id, SaveWebsiteBlogPostRequest request, int userId, CancellationToken ct);
    Task DeleteBlogPostAsync(long id, int userId, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteBlogCategoryDto>> GetBlogCategoriesAsync(bool publicOnly, CancellationToken ct);
    Task<WebsiteBlogCategoryDto> SaveBlogCategoryAsync(long? id, SaveWebsiteBlogCategoryRequest request, int userId, CancellationToken ct);
    Task DeleteBlogCategoryAsync(long id, int userId, CancellationToken ct);

    Task<PagedResult<WebsiteAnnouncementDto>> GetAnnouncementsAsync(WebsiteAnnouncementListQuery query, CancellationToken ct);
    Task<WebsiteAnnouncementDto?> GetAnnouncementByIdAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteAnnouncementDto>> GetPublicAnnouncementsAsync(string placement, CancellationToken ct);
    Task<WebsiteAnnouncementDto> SaveAnnouncementAsync(long? id, SaveWebsiteAnnouncementRequest request, int userId, CancellationToken ct);
    Task DeleteAnnouncementAsync(long id, int userId, CancellationToken ct);

    Task<WebsitePublicSubmissionResponse> CreateWarrantyClaimAsync(WebsiteWarrantySubmissionRequest request, IReadOnlyCollection<StoredWebsiteWarrantyAttachment> attachments, CancellationToken ct);
    Task<PagedResult<WebsiteWarrantyClaimListItemDto>> GetWarrantyClaimsAsync(WebsiteWarrantyClaimListQuery query, CancellationToken ct);
    Task<WebsiteWarrantyClaimDto?> GetWarrantyClaimByIdAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteWarrantyAttachmentDto>> GetWarrantyAttachmentsAsync(long claimId, CancellationToken ct);
    Task<WebsiteWarrantyAttachmentDownload?> GetWarrantyAttachmentForDownloadAsync(long attachmentId, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteWarrantyHistoryDto>> GetWarrantyHistoryAsync(long claimId, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteWarrantyNoteDto>> GetWarrantyNotesAsync(long claimId, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteWarrantyCustomerMessageDto>> GetWarrantyCustomerMessagesAsync(long claimId, CancellationToken ct);
    Task AssignWarrantyClaimAsync(long claimId, int? assignedToUserId, string? remark, int userId, CancellationToken ct);
    Task TransitionWarrantyClaimAsync(long claimId, WarrantyClaimStatus targetStatus, string? remark, int userId, CancellationToken ct);
    Task ResolveWarrantyClaimAsync(long claimId, ResolveWebsiteWarrantyClaimRequest request, int userId, CancellationToken ct);
    Task AddWarrantyNoteAsync(long claimId, string note, int userId, CancellationToken ct);
    Task AddWarrantyCustomerMessageAsync(long claimId, string message, int userId, CancellationToken ct);
    Task<WebsiteWarrantyReportDto> GetWarrantyReportAsync(CancellationToken ct);
    Task<WebsiteDashboardOverviewDto> GetDashboardOverviewAsync(CancellationToken ct);

    Task<IReadOnlyCollection<WebsiteSettingDto>> GetSettingsAsync(bool publicOnly, CancellationToken ct);
    Task UpdateSettingsAsync(IReadOnlyCollection<WebsiteSettingValueRequest> settings, int userId, CancellationToken ct);
    Task CreateContactEnquiryAsync(WebsiteContactEnquiryRequest request, CancellationToken ct);
}

public sealed record StoredWebsiteWarrantyAttachment(string StorageKey, string OriginalFileName, string DetectedMimeType, long SizeBytes, WarrantyAttachmentType AttachmentType);
