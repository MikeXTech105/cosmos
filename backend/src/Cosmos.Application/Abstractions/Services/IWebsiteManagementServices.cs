using Cosmos.Contracts.Common;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IWebsiteProductService
{
    Task<ApiResponse<PagedResult<WebsiteProductDto>>> GetListAsync(WebsiteProductListQuery query, CancellationToken ct);
    Task<ApiResponse<WebsiteProductDto>> GetByIdAsync(long id, CancellationToken ct);
    Task<ApiResponse<WebsiteProductDto>> CreateAsync(SaveWebsiteProductRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteProductDto>> UpdateAsync(long id, SaveWebsiteProductRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteProductDto>> GetPublicAsync(CancellationToken ct);
}

public interface IWebsiteBlogService
{
    Task<ApiResponse<PagedResult<WebsiteBlogPostDto>>> GetPostsAsync(WebsiteBlogPostListQuery query, CancellationToken ct);
    Task<ApiResponse<WebsiteBlogPostDto>> GetPostByIdAsync(long id, CancellationToken ct);
    Task<ApiResponse<WebsiteBlogPostDto>> CreatePostAsync(SaveWebsiteBlogPostRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteBlogPostDto>> UpdatePostAsync(long id, SaveWebsiteBlogPostRequest request, CancellationToken ct);
    Task<ApiResponse> DeletePostAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<WebsiteBlogCategoryDto>>> GetCategoriesAsync(CancellationToken ct);
    Task<ApiResponse<WebsiteBlogCategoryDto>> CreateCategoryAsync(SaveWebsiteBlogCategoryRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteBlogCategoryDto>> UpdateCategoryAsync(long id, SaveWebsiteBlogCategoryRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteCategoryAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteBlogPostDto>> GetPublicPostsAsync(CancellationToken ct);
    Task<WebsiteBlogPostDto?> GetPublicPostBySlugAsync(string slug, CancellationToken ct);
}

public interface IWebsiteAnnouncementService
{
    Task<ApiResponse<PagedResult<WebsiteAnnouncementDto>>> GetListAsync(WebsiteAnnouncementListQuery query, CancellationToken ct);
    Task<ApiResponse<WebsiteAnnouncementDto>> CreateAsync(SaveWebsiteAnnouncementRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteAnnouncementDto>> UpdateAsync(long id, SaveWebsiteAnnouncementRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteAnnouncementDto>> GetPublicAsync(string placement, CancellationToken ct);
}

public interface IWebsiteWarrantyService
{
    Task<WebsitePublicSubmissionResponse> SubmitAsync(WebsiteWarrantySubmissionRequest request, CancellationToken ct);
    Task<ApiResponse<PagedResult<WebsiteWarrantyClaimListItemDto>>> GetListAsync(WebsiteWarrantyClaimListQuery query, CancellationToken ct);
    Task<ApiResponse<WebsiteWarrantyClaimDto>> GetByIdAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyAttachmentDto>>> GetAttachmentsAsync(long id, CancellationToken ct);
    Task<WebsiteWarrantyAttachmentDownload?> GetAttachmentForDownloadAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyHistoryDto>>> GetHistoryAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyNoteDto>>> GetNotesAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyCustomerMessageDto>>> GetCustomerMessagesAsync(long id, CancellationToken ct);
    Task<ApiResponse> AssignAsync(long id, AssignWebsiteWarrantyClaimRequest request, CancellationToken ct);
    Task<ApiResponse> StartReviewAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct);
    Task<ApiResponse> RequestInformationAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct);
    Task<ApiResponse> ApproveAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct);
    Task<ApiResponse> RejectAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct);
    Task<ApiResponse> ResolveAsync(long id, ResolveWebsiteWarrantyClaimRequest request, CancellationToken ct);
    Task<ApiResponse> CompleteAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteWarrantyNoteDto>> AddNoteAsync(long id, AddWebsiteWarrantyNoteRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteWarrantyCustomerMessageDto>> AddCustomerMessageAsync(long id, AddWebsiteWarrantyCustomerMessageRequest request, CancellationToken ct);
    Task<ApiResponse<WebsiteWarrantyReportDto>> GetReportAsync(CancellationToken ct);
}

public interface IWebsiteSettingsService
{
    Task<ApiResponse<IReadOnlyCollection<WebsiteSettingDto>>> GetAsync(CancellationToken ct);
    Task<ApiResponse> UpdateAsync(UpdateWebsiteSettingsRequest request, CancellationToken ct);
    Task<IReadOnlyCollection<WebsiteSettingDto>> GetPublicAsync(CancellationToken ct);
}

public interface IWebsiteDashboardService
{
    Task<ApiResponse<WebsiteDashboardOverviewDto>> GetOverviewAsync(CancellationToken ct);
}

public interface IWebsiteContactService
{
    Task<WebsitePublicSubmissionResponse> SubmitAsync(WebsiteContactEnquiryRequest request, CancellationToken ct);
}
