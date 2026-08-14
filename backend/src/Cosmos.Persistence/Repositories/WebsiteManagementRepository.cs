using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class WebsiteManagementRepository(ISqlConnectionFactory connectionFactory) : IWebsiteManagementRepository
{
    public async Task<PagedResult<WebsiteProductDto>> GetProductsAsync(WebsiteProductListQuery query, CancellationToken ct) => await GetPageAsync<WebsiteProductListRow, WebsiteProductDto>("usp_WebsiteProduct_GetList", query, query.PageNumber, query.PageSize, static row => row.ToDto(), ct);
    public Task<WebsiteProductDto?> GetProductByIdAsync(long id, CancellationToken ct) => QueryOneAsync<WebsiteProductDto>("usp_WebsiteProduct_GetById", new { Id = id }, ct);
    public Task<IReadOnlyCollection<WebsiteProductDto>> GetPublicProductsAsync(CancellationToken ct) => QueryAsync<WebsiteProductDto>("usp_WebsiteProduct_GetPublic", null, ct);
    public Task<WebsiteProductDto> SaveProductAsync(long? id, SaveWebsiteProductRequest request, int userId, CancellationToken ct) => QueryWithStatusAsync<WebsiteProductDto>("usp_WebsiteProduct_Save", new { Id = id, request.Code, request.Name, request.Description, request.DisplayPrice, request.CurrencyCode, request.Rating, request.ReviewCount, request.Badge, request.UrgencyText, request.Material, request.QuantityDisplay, request.IsUvResistant, request.IsRustProof, request.IsWindTested, request.WarrantyDisplay, request.AmazonUrl, request.BrandName, request.AvailabilityText, request.SortOrder, PublishStatus = request.PublishStatus.ToString(), request.IsActive, BenefitsJson = Serialize(request.Benefits), MediaJson = Serialize(request.Media), ExpectedRowVersion = ToRowVersion(request.RowVersion), CurrentUserId = userId }, ct);
    public async Task DeleteProductAsync(long id, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteProduct_Delete", new { Id = id, CurrentUserId = userId }, ct);

    public async Task<PagedResult<WebsiteBlogPostDto>> GetBlogPostsAsync(WebsiteBlogPostListQuery query, CancellationToken ct) => await GetPageAsync<WebsiteBlogPostListRow, WebsiteBlogPostDto>("usp_WebsiteBlogPost_GetList", query, query.PageNumber, query.PageSize, static row => row.ToDto(), ct);
    public Task<WebsiteBlogPostDto?> GetBlogPostByIdAsync(long id, CancellationToken ct) => QueryOneAsync<WebsiteBlogPostDto>("usp_WebsiteBlogPost_GetById", new { Id = id }, ct);
    public Task<IReadOnlyCollection<WebsiteBlogPostDto>> GetPublicBlogPostsAsync(CancellationToken ct) => QueryAsync<WebsiteBlogPostDto>("usp_WebsiteBlogPost_GetPublicList", null, ct);
    public Task<WebsiteBlogPostDto?> GetPublicBlogPostBySlugAsync(string slug, CancellationToken ct) => QueryOneAsync<WebsiteBlogPostDto>("usp_WebsiteBlogPost_GetPublicBySlug", new { Slug = slug }, ct);
    public Task<WebsiteBlogPostDto> SaveBlogPostAsync(long? id, SaveWebsiteBlogPostRequest request, int userId, CancellationToken ct) => QueryWithStatusAsync<WebsiteBlogPostDto>("usp_WebsiteBlogPost_Save", new { Id = id, request.Title, request.Slug, request.Excerpt, request.Content, request.CoverImageUrl, request.ReadTime, request.CategoryId, PublishStatus = request.PublishStatus.ToString(), request.PublishedAtUtc, request.SeoTitle, request.SeoDescription, request.OpenGraphImageUrl, request.IsFeatured, request.SortOrder, ExpectedRowVersion = ToRowVersion(request.RowVersion), CurrentUserId = userId }, ct);
    public async Task DeleteBlogPostAsync(long id, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteBlogPost_Delete", new { Id = id, CurrentUserId = userId }, ct);
    public Task<IReadOnlyCollection<WebsiteBlogCategoryDto>> GetBlogCategoriesAsync(bool publicOnly, CancellationToken ct) => QueryAsync<WebsiteBlogCategoryDto>(publicOnly ? "usp_WebsiteBlogCategory_GetPublic" : "usp_WebsiteBlogCategory_GetList", null, ct);
    public Task<WebsiteBlogCategoryDto> SaveBlogCategoryAsync(long? id, SaveWebsiteBlogCategoryRequest request, int userId, CancellationToken ct) => QueryWithStatusAsync<WebsiteBlogCategoryDto>("usp_WebsiteBlogCategory_Save", new { Id = id, request.Name, request.Slug, request.Description, request.SortOrder, request.IsActive, ExpectedRowVersion = ToRowVersion(request.RowVersion), CurrentUserId = userId }, ct);
    public async Task DeleteBlogCategoryAsync(long id, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteBlogCategory_Delete", new { Id = id, CurrentUserId = userId }, ct);

    public async Task<PagedResult<WebsiteAnnouncementDto>> GetAnnouncementsAsync(WebsiteAnnouncementListQuery query, CancellationToken ct) => await GetPageAsync<WebsiteAnnouncementListRow, WebsiteAnnouncementDto>("usp_WebsiteAnnouncement_GetList", query, query.PageNumber, query.PageSize, static row => row.ToDto(), ct);
    public Task<WebsiteAnnouncementDto?> GetAnnouncementByIdAsync(long id, CancellationToken ct) => QueryOneAsync<WebsiteAnnouncementDto>("usp_WebsiteAnnouncement_GetById", new { Id = id }, ct);
    public Task<IReadOnlyCollection<WebsiteAnnouncementDto>> GetPublicAnnouncementsAsync(string placement, CancellationToken ct) => QueryAsync<WebsiteAnnouncementDto>("usp_WebsiteAnnouncement_GetPublic", new { Placement = placement }, ct);
    public Task<WebsiteAnnouncementDto> SaveAnnouncementAsync(long? id, SaveWebsiteAnnouncementRequest request, int userId, CancellationToken ct) => QueryWithStatusAsync<WebsiteAnnouncementDto>("usp_WebsiteAnnouncement_Save", new { Id = id, request.Title, request.Message, Placement = request.Placement.ToString(), request.CtaLabel, request.CtaUrl, request.Priority, request.StartsAtUtc, request.EndsAtUtc, request.IsActive, request.DismissalVersion, request.SortOrder, ExpectedRowVersion = ToRowVersion(request.RowVersion), CurrentUserId = userId }, ct);
    public async Task DeleteAnnouncementAsync(long id, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteAnnouncement_Delete", new { Id = id, CurrentUserId = userId }, ct);

    public Task<WebsitePublicSubmissionResponse> CreateWarrantyClaimAsync(WebsiteWarrantySubmissionRequest request, IReadOnlyCollection<StoredWebsiteWarrantyAttachment> attachments, CancellationToken ct) => QueryWithStatusAsync<WebsitePublicSubmissionResponse>("usp_WebsiteWarrantyClaim_CreatePublic", new { request.FullName, request.Email, request.OrderNumber, request.PurchaseDate, request.Description, request.Source, request.Consent, AttachmentsJson = Serialize(attachments) }, ct);
    public async Task<PagedResult<WebsiteWarrantyClaimListItemDto>> GetWarrantyClaimsAsync(WebsiteWarrantyClaimListQuery query, CancellationToken ct) => await GetPageAsync<WebsiteWarrantyClaimListRow, WebsiteWarrantyClaimListItemDto>("usp_WebsiteWarrantyClaim_GetList", query, query.PageNumber, query.PageSize, static row => row.ToDto(), ct);
    public Task<WebsiteWarrantyClaimDto?> GetWarrantyClaimByIdAsync(long id, CancellationToken ct) => QueryOneAsync<WebsiteWarrantyClaimDto>("usp_WebsiteWarrantyClaim_GetById", new { Id = id }, ct);
    public Task<IReadOnlyCollection<WebsiteWarrantyAttachmentDto>> GetWarrantyAttachmentsAsync(long claimId, CancellationToken ct) => QueryAsync<WebsiteWarrantyAttachmentDto>("usp_WebsiteWarrantyClaim_GetAttachments", new { ClaimId = claimId }, ct);
    public Task<WebsiteWarrantyAttachmentDownload?> GetWarrantyAttachmentForDownloadAsync(long attachmentId, CancellationToken ct) => QueryOneAsync<WebsiteWarrantyAttachmentDownload>("usp_WebsiteWarrantyClaim_GetAttachmentDownload", new { AttachmentId = attachmentId }, ct);
    public Task<IReadOnlyCollection<WebsiteWarrantyHistoryDto>> GetWarrantyHistoryAsync(long claimId, CancellationToken ct) => QueryAsync<WebsiteWarrantyHistoryDto>("usp_WebsiteWarrantyClaim_GetHistory", new { ClaimId = claimId }, ct);
    public Task<IReadOnlyCollection<WebsiteWarrantyNoteDto>> GetWarrantyNotesAsync(long claimId, CancellationToken ct) => QueryAsync<WebsiteWarrantyNoteDto>("usp_WebsiteWarrantyClaim_GetNotes", new { ClaimId = claimId }, ct);
    public Task<IReadOnlyCollection<WebsiteWarrantyCustomerMessageDto>> GetWarrantyCustomerMessagesAsync(long claimId, CancellationToken ct) => QueryAsync<WebsiteWarrantyCustomerMessageDto>("usp_WebsiteWarrantyClaim_GetCustomerMessages", new { ClaimId = claimId }, ct);
    public async Task AssignWarrantyClaimAsync(long claimId, int? assignedToUserId, string? remark, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteWarrantyClaim_Assign", new { ClaimId = claimId, AssignedToUserId = assignedToUserId, Remark = remark, CurrentUserId = userId }, ct);
    public async Task TransitionWarrantyClaimAsync(long claimId, Domain.WebsiteManagement.WarrantyClaimStatus targetStatus, string? remark, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteWarrantyClaim_Transition", new { ClaimId = claimId, TargetStatus = targetStatus.ToString(), Remark = remark, CurrentUserId = userId }, ct);
    public async Task ResolveWarrantyClaimAsync(long claimId, ResolveWebsiteWarrantyClaimRequest request, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteWarrantyClaim_Resolve", new { ClaimId = claimId, ResolutionType = request.ResolutionType.ToString(), request.RefundAmount, request.RefundReference, request.ReplacementReference, request.ReplacementTrackingNumber, request.RepairReference, request.ResolutionRemarks, request.Remark, CurrentUserId = userId }, ct);
    public async Task AddWarrantyNoteAsync(long claimId, string note, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteWarrantyClaim_AddNote", new { ClaimId = claimId, Note = note, CurrentUserId = userId }, ct);
    public async Task AddWarrantyCustomerMessageAsync(long claimId, string message, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteWarrantyClaim_AddCustomerMessage", new { ClaimId = claimId, Message = message, CurrentUserId = userId }, ct);
    public async Task<WebsiteWarrantyReportDto> GetWarrantyReportAsync(CancellationToken ct) => await QueryOneAsync<WebsiteWarrantyReportDto>("usp_WebsiteWarrantyClaim_GetReport", null, ct) ?? new WebsiteWarrantyReportDto(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, 0, 0, 0);
    public async Task<WebsiteDashboardOverviewDto> GetDashboardOverviewAsync(CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<WebsiteDashboardOverviewDto>(connection, "usp_WebsiteManagementDashboard_GetOverview", null, ct);
    }

    public Task<IReadOnlyCollection<WebsiteSettingDto>> GetSettingsAsync(bool publicOnly, CancellationToken ct) => QueryAsync<WebsiteSettingDto>(publicOnly ? "usp_WebsiteSettings_GetPublic" : "usp_WebsiteSettings_GetAll", null, ct);
    public async Task UpdateSettingsAsync(IReadOnlyCollection<WebsiteSettingValueRequest> settings, int userId, CancellationToken ct) => await ExecuteAsync("usp_WebsiteSettings_Update", new { SettingsJson = Serialize(settings), CurrentUserId = userId }, ct);
    public async Task CreateContactEnquiryAsync(WebsiteContactEnquiryRequest request, CancellationToken ct) => await ExecuteAsync("usp_WebsiteContactEnquiry_Create", request, ct);

    private async Task<PagedResult<TDto>> GetPageAsync<TRow, TDto>(string procedure, object parameters, int pageNumber, int pageSize, Func<TRow, TDto> map, CancellationToken ct)
        where TRow : IWebsitePagedListRow
    {
        var rows = await QueryAsync<TRow>(procedure, parameters, ct);
        return WebsitePagedResultMapper.Map(rows, pageNumber, pageSize, map);
    }
    private async Task<IReadOnlyCollection<T>> QueryAsync<T>(string procedure, object? parameters, CancellationToken ct) { using var connection = await connectionFactory.CreateOpenConnectionAsync(ct); return await StoredProcedureExecutor.QueryAsync<T>(connection, procedure, parameters, ct); }
    private async Task<T?> QueryOneAsync<T>(string procedure, object? parameters, CancellationToken ct) { using var connection = await connectionFactory.CreateOpenConnectionAsync(ct); return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<T>(connection, procedure, parameters, ct); }
    private async Task<T> QueryWithStatusAsync<T>(string procedure, object? parameters, CancellationToken ct) { using var connection = await connectionFactory.CreateOpenConnectionAsync(ct); return await StoredProcedureExecutor.QueryWithStatusAsync<T>(connection, procedure, parameters, ct); }
    private async Task ExecuteAsync(string procedure, object? parameters, CancellationToken ct) { using var connection = await connectionFactory.CreateOpenConnectionAsync(ct); var result = await StoredProcedureExecutor.ExecuteStatusAsync(connection, procedure, parameters, ct); if (!result.Succeeded) throw new Cosmos.Shared.Exceptions.CosmosException(result.Message, result.StatusCode); }
    private static string Serialize<T>(T value) => System.Text.Json.JsonSerializer.Serialize(value);
    private static byte[]? ToRowVersion(string? value) => string.IsNullOrWhiteSpace(value) ? null : Convert.FromBase64String(value);
}
