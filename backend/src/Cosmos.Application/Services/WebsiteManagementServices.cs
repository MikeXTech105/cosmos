using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Domain.WebsiteManagement;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class WebsiteProductService(
    IWebsiteManagementRepository repository, IAuditRepository audit, ICurrentUser currentUser,
    IValidator<SaveWebsiteProductRequest> saveValidator, IValidator<WebsiteProductListQuery> listValidator) : IWebsiteProductService
{
    public async Task<ApiResponse<PagedResult<WebsiteProductDto>>> GetListAsync(WebsiteProductListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(listValidator, query, ct);
        return ApiResponse<PagedResult<WebsiteProductDto>>.Success(await repository.GetProductsAsync(Normalize(query), ct));
    }
    public async Task<ApiResponse<WebsiteProductDto>> GetByIdAsync(long id, CancellationToken ct) => ApiResponse<WebsiteProductDto>.Success(await GetRequiredAsync(id, ct));
    public async Task<ApiResponse<WebsiteProductDto>> CreateAsync(SaveWebsiteProductRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(saveValidator, request, ct);
        var result = await repository.SaveProductAsync(null, Normalize(request), UserId(), ct);
        await AuditAsync(result, AuditActions.Created, ct);
        return ApiResponse<WebsiteProductDto>.Success(result, "Website product created.");
    }
    public async Task<ApiResponse<WebsiteProductDto>> UpdateAsync(long id, SaveWebsiteProductRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(saveValidator, request, ct);
        var before = await GetRequiredAsync(id, ct);
        var result = await repository.SaveProductAsync(id, Normalize(request), UserId(), ct);
        var action = result.PublishStatus == WebsitePublishStatus.Published.ToString() && before.PublishStatus != WebsitePublishStatus.Published.ToString() ? "Published"
            : result.PublishStatus == WebsitePublishStatus.Archived.ToString() && before.PublishStatus != WebsitePublishStatus.Archived.ToString() ? "Archived"
            : result.IsActive && !before.IsActive ? AuditActions.Activated : !result.IsActive && before.IsActive ? AuditActions.Deactivated : AuditActions.Updated;
        await AuditAsync(result, action, ct);
        return ApiResponse<WebsiteProductDto>.Success(result, "Website product updated.");
    }
    public async Task<ApiResponse> DeleteAsync(long id, CancellationToken ct)
    {
        var product = await GetRequiredAsync(id, ct); await repository.DeleteProductAsync(id, UserId(), ct); await AuditAsync(product, AuditActions.SoftDeleted, ct);
        return ApiResponse.Success("Website product deleted.");
    }
    public Task<IReadOnlyCollection<WebsiteProductDto>> GetPublicAsync(CancellationToken ct) => repository.GetPublicProductsAsync(ct);
    private async Task<WebsiteProductDto> GetRequiredAsync(long id, CancellationToken ct) => id > 0 ? await repository.GetProductByIdAsync(id, ct) ?? throw new NotFoundException("Website product was not found.") : throw new NotFoundException("Website product was not found.");
    private int UserId() => currentUser.UserId ?? throw new UnauthorizedCosmosException();
    private Task AuditAsync(WebsiteProductDto product, string action, CancellationToken ct) => audit.AddAsync(new AuditEntryRequest("WebsiteProducts", product.Id.ToString(), action, null, AuditSerializer.Serialize(new { product.Code, product.Name, product.PublishStatus, product.IsActive }), UserId(), AuditModules.WebsiteManagement, "WebsiteProduct", product.Name, $"{action} website product {product.Name}"), ct);
    private static WebsiteProductListQuery Normalize(WebsiteProductListQuery x) => x with { Search = Trim(x.Search), PublishStatus = Trim(x.PublishStatus), SortBy = Trim(x.SortBy), SortDirection = Trim(x.SortDirection)?.ToLowerInvariant() };
    private static SaveWebsiteProductRequest Normalize(SaveWebsiteProductRequest x) => x with { Code = x.Code.Trim(), Name = x.Name.Trim(), Description = Trim(x.Description), CurrencyCode = string.IsNullOrWhiteSpace(x.CurrencyCode) ? "INR" : x.CurrencyCode.Trim().ToUpperInvariant(), Badge = Trim(x.Badge), UrgencyText = Trim(x.UrgencyText), Material = Trim(x.Material), QuantityDisplay = Trim(x.QuantityDisplay), WarrantyDisplay = Trim(x.WarrantyDisplay), AmazonUrl = Trim(x.AmazonUrl), BrandName = Trim(x.BrandName), AvailabilityText = Trim(x.AvailabilityText), Benefits = x.Benefits?.Select(b => b with { BenefitText = b.BenefitText.Trim() }).ToArray(), Media = x.Media?.Select(m => m with { PublicUrl = m.PublicUrl.Trim(), AltText = Trim(m.AltText) }).ToArray() };
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class WebsiteBlogService(
    IWebsiteManagementRepository repository, IAuditRepository audit, ICurrentUser currentUser,
    IValidator<SaveWebsiteBlogPostRequest> postValidator, IValidator<SaveWebsiteBlogCategoryRequest> categoryValidator,
    IValidator<WebsiteBlogPostListQuery> listValidator) : IWebsiteBlogService
{
    public async Task<ApiResponse<PagedResult<WebsiteBlogPostDto>>> GetPostsAsync(WebsiteBlogPostListQuery query, CancellationToken ct) { await ValidationRunner.ValidateAsync(listValidator, query, ct); return ApiResponse<PagedResult<WebsiteBlogPostDto>>.Success(await repository.GetBlogPostsAsync(Normalize(query), ct)); }
    public async Task<ApiResponse<WebsiteBlogPostDto>> GetPostByIdAsync(long id, CancellationToken ct) => ApiResponse<WebsiteBlogPostDto>.Success(await GetPostAsync(id, ct));
    public async Task<ApiResponse<WebsiteBlogPostDto>> CreatePostAsync(SaveWebsiteBlogPostRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(postValidator, request, ct); var post = await repository.SaveBlogPostAsync(null, Normalize(request), UserId(), ct); await AuditAsync(post, AuditActions.Created, ct); return ApiResponse<WebsiteBlogPostDto>.Success(post, "Blog post created."); }
    public async Task<ApiResponse<WebsiteBlogPostDto>> UpdatePostAsync(long id, SaveWebsiteBlogPostRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(postValidator, request, ct); var before = await GetPostAsync(id, ct); var post = await repository.SaveBlogPostAsync(id, Normalize(request), UserId(), ct); await AuditAsync(post, post.PublishStatus == "Published" && before.PublishStatus != "Published" ? "Published" : post.PublishStatus != "Published" && before.PublishStatus == "Published" ? "Unpublished" : AuditActions.Updated, ct); return ApiResponse<WebsiteBlogPostDto>.Success(post, "Blog post updated."); }
    public async Task<ApiResponse> DeletePostAsync(long id, CancellationToken ct) { var post = await GetPostAsync(id, ct); await repository.DeleteBlogPostAsync(id, UserId(), ct); await AuditAsync(post, AuditActions.SoftDeleted, ct); return ApiResponse.Success("Blog post deleted."); }
    public async Task<ApiResponse<IReadOnlyCollection<WebsiteBlogCategoryDto>>> GetCategoriesAsync(CancellationToken ct) => ApiResponse<IReadOnlyCollection<WebsiteBlogCategoryDto>>.Success(await repository.GetBlogCategoriesAsync(false, ct));
    public async Task<ApiResponse<WebsiteBlogCategoryDto>> CreateCategoryAsync(SaveWebsiteBlogCategoryRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(categoryValidator, request, ct); var category = await repository.SaveBlogCategoryAsync(null, Normalize(request), UserId(), ct); await AuditSimpleAsync("WebsiteBlogCategories", category.Id, category.Name, AuditActions.Created, ct); return ApiResponse<WebsiteBlogCategoryDto>.Success(category, "Blog category created."); }
    public async Task<ApiResponse<WebsiteBlogCategoryDto>> UpdateCategoryAsync(long id, SaveWebsiteBlogCategoryRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(categoryValidator, request, ct); var category = await repository.SaveBlogCategoryAsync(id, Normalize(request), UserId(), ct); await AuditSimpleAsync("WebsiteBlogCategories", id, category.Name, AuditActions.Updated, ct); return ApiResponse<WebsiteBlogCategoryDto>.Success(category, "Blog category updated."); }
    public async Task<ApiResponse> DeleteCategoryAsync(long id, CancellationToken ct) { await repository.DeleteBlogCategoryAsync(id, UserId(), ct); await AuditSimpleAsync("WebsiteBlogCategories", id, null, AuditActions.SoftDeleted, ct); return ApiResponse.Success("Blog category deleted."); }
    public Task<IReadOnlyCollection<WebsiteBlogPostDto>> GetPublicPostsAsync(CancellationToken ct) => repository.GetPublicBlogPostsAsync(ct);
    public Task<WebsiteBlogPostDto?> GetPublicPostBySlugAsync(string slug, CancellationToken ct) => repository.GetPublicBlogPostBySlugAsync(slug.Trim().ToLowerInvariant(), ct);
    private async Task<WebsiteBlogPostDto> GetPostAsync(long id, CancellationToken ct) => id > 0 ? await repository.GetBlogPostByIdAsync(id, ct) ?? throw new NotFoundException("Blog post was not found.") : throw new NotFoundException("Blog post was not found.");
    private int UserId() => currentUser.UserId ?? throw new UnauthorizedCosmosException();
    private Task AuditAsync(WebsiteBlogPostDto post, string action, CancellationToken ct) => audit.AddAsync(new AuditEntryRequest("WebsiteBlogPosts", post.Id.ToString(), action, null, AuditSerializer.Serialize(new { post.Slug, post.Title, post.PublishStatus }), UserId(), AuditModules.WebsiteManagement, "WebsiteBlogPost", post.Title, $"{action} blog post {post.Title}"), ct);
    private Task AuditSimpleAsync(string table, long id, string? name, string action, CancellationToken ct) => audit.AddAsync(new AuditEntryRequest(table, id.ToString(), action, null, null, UserId(), AuditModules.WebsiteManagement, table, name, $"{action} website blog category"), ct);
    private static WebsiteBlogPostListQuery Normalize(WebsiteBlogPostListQuery x) => x with { Search = Trim(x.Search), PublishStatus = Trim(x.PublishStatus), SortBy = Trim(x.SortBy), SortDirection = Trim(x.SortDirection)?.ToLowerInvariant() };
    private static SaveWebsiteBlogPostRequest Normalize(SaveWebsiteBlogPostRequest x) => x with { Title = x.Title.Trim(), Slug = x.Slug.Trim().ToLowerInvariant(), Excerpt = x.Excerpt.Trim(), Content = x.Content.Trim(), CoverImageUrl = Trim(x.CoverImageUrl), ReadTime = x.ReadTime.Trim(), SeoTitle = Trim(x.SeoTitle), SeoDescription = Trim(x.SeoDescription), OpenGraphImageUrl = Trim(x.OpenGraphImageUrl) };
    private static SaveWebsiteBlogCategoryRequest Normalize(SaveWebsiteBlogCategoryRequest x) => x with { Name = x.Name.Trim(), Slug = x.Slug.Trim().ToLowerInvariant(), Description = Trim(x.Description) };
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class WebsiteAnnouncementService(
    IWebsiteManagementRepository repository, IAuditRepository audit, ICurrentUser currentUser,
    IValidator<SaveWebsiteAnnouncementRequest> validator) : IWebsiteAnnouncementService
{
    public async Task<ApiResponse<PagedResult<WebsiteAnnouncementDto>>> GetListAsync(WebsiteAnnouncementListQuery query, CancellationToken ct) => ApiResponse<PagedResult<WebsiteAnnouncementDto>>.Success(await repository.GetAnnouncementsAsync(query with { Placement = Trim(query.Placement) }, ct));
    public async Task<ApiResponse<WebsiteAnnouncementDto>> CreateAsync(SaveWebsiteAnnouncementRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(validator, request, ct); var value = await repository.SaveAnnouncementAsync(null, Normalize(request), UserId(), ct); await AuditAsync(value, AuditActions.Created, ct); return ApiResponse<WebsiteAnnouncementDto>.Success(value, "Announcement created."); }
    public async Task<ApiResponse<WebsiteAnnouncementDto>> UpdateAsync(long id, SaveWebsiteAnnouncementRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(validator, request, ct); var before = await repository.GetAnnouncementByIdAsync(id, ct) ?? throw new NotFoundException("Website announcement was not found."); var value = await repository.SaveAnnouncementAsync(id, Normalize(request), UserId(), ct); var action = !value.IsActive && before.IsActive ? AuditActions.Deactivated : value.IsActive && !before.IsActive ? AuditActions.Activated : value.StartsAtUtc != before.StartsAtUtc || value.EndsAtUtc != before.EndsAtUtc || value.Priority != before.Priority ? "ScheduleChanged" : AuditActions.Updated; await AuditAsync(value, action, ct); return ApiResponse<WebsiteAnnouncementDto>.Success(value, "Announcement updated."); }
    public async Task<ApiResponse> DeleteAsync(long id, CancellationToken ct) { await repository.DeleteAnnouncementAsync(id, UserId(), ct); await audit.AddAsync(new AuditEntryRequest("WebsiteAnnouncements", id.ToString(), AuditActions.SoftDeleted, null, null, UserId(), AuditModules.WebsiteManagement, "WebsiteAnnouncement", null, "Deleted website announcement."), ct); return ApiResponse.Success("Announcement deleted."); }
    public Task<IReadOnlyCollection<WebsiteAnnouncementDto>> GetPublicAsync(string placement, CancellationToken ct) => repository.GetPublicAnnouncementsAsync(NormalizePlacement(placement), ct);
    private int UserId() => currentUser.UserId ?? throw new UnauthorizedCosmosException();
    private Task AuditAsync(WebsiteAnnouncementDto value, string action, CancellationToken ct) => audit.AddAsync(new AuditEntryRequest("WebsiteAnnouncements", value.Id.ToString(), action, null, AuditSerializer.Serialize(new { value.Placement, value.Priority, value.IsActive, value.StartsAtUtc, value.EndsAtUtc }), UserId(), AuditModules.WebsiteManagement, "WebsiteAnnouncement", value.Title, $"{action} website announcement."), ct);
    private static SaveWebsiteAnnouncementRequest Normalize(SaveWebsiteAnnouncementRequest x) => x with { Title = Trim(x.Title), Message = x.Message.Trim(), CtaLabel = Trim(x.CtaLabel), CtaUrl = Trim(x.CtaUrl), DismissalVersion = string.IsNullOrWhiteSpace(x.DismissalVersion) ? "1" : x.DismissalVersion.Trim() };
    private static string NormalizePlacement(string value) => string.Equals(value?.Trim(), "top-bar", StringComparison.OrdinalIgnoreCase) ? "TopBar" : "TopBar";
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class WebsiteWarrantyService(
    IWebsiteManagementRepository repository, IWebsiteFileStorage storage, IAuditRepository audit, ICurrentUser currentUser,
    IValidator<WebsiteWarrantySubmissionRequest> submissionValidator, IValidator<WebsiteWarrantyClaimListQuery> listValidator,
    IValidator<ResolveWebsiteWarrantyClaimRequest> resolveValidator, IValidator<AddWebsiteWarrantyNoteRequest> noteValidator,
    IValidator<AddWebsiteWarrantyCustomerMessageRequest> messageValidator) : IWebsiteWarrantyService
{
    public async Task<WebsitePublicSubmissionResponse> SubmitAsync(WebsiteWarrantySubmissionRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(submissionValidator, request, ct);
        var saved = new List<StoredWebsiteWarrantyAttachment>();
        try
        {
            foreach (var upload in new[] { request.Invoice }.Concat(request.ProductImages))
            {
                var storageKey = await storage.SavePrivateWarrantyEvidenceAsync(upload.OriginalFileName, upload.Content, ct);
                saved.Add(new StoredWebsiteWarrantyAttachment(storageKey, upload.OriginalFileName, upload.DetectedContentType, upload.Content.LongLength, upload.AttachmentType));
            }
            return await repository.CreateWarrantyClaimAsync(Normalize(request), saved, ct);
        }
        catch
        {
            foreach (var attachment in saved) { try { await storage.DeletePrivateWarrantyEvidenceAsync(attachment.StorageKey, ct); } catch { } }
            throw;
        }
    }
    public async Task<ApiResponse<PagedResult<WebsiteWarrantyClaimListItemDto>>> GetListAsync(WebsiteWarrantyClaimListQuery query, CancellationToken ct) { await ValidationRunner.ValidateAsync(listValidator, query, ct); return ApiResponse<PagedResult<WebsiteWarrantyClaimListItemDto>>.Success(await repository.GetWarrantyClaimsAsync(Normalize(query), ct)); }
    public async Task<ApiResponse<WebsiteWarrantyClaimDto>> GetByIdAsync(long id, CancellationToken ct) => ApiResponse<WebsiteWarrantyClaimDto>.Success(await GetClaimAsync(id, ct));
    public async Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyAttachmentDto>>> GetAttachmentsAsync(long id, CancellationToken ct) { await EnsureClaimAsync(id, ct); return ApiResponse<IReadOnlyCollection<WebsiteWarrantyAttachmentDto>>.Success(await repository.GetWarrantyAttachmentsAsync(id, ct)); }
    public Task<WebsiteWarrantyAttachmentDownload?> GetAttachmentForDownloadAsync(long id, CancellationToken ct) => repository.GetWarrantyAttachmentForDownloadAsync(id, ct);
    public async Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyHistoryDto>>> GetHistoryAsync(long id, CancellationToken ct) { await EnsureClaimAsync(id, ct); return ApiResponse<IReadOnlyCollection<WebsiteWarrantyHistoryDto>>.Success(await repository.GetWarrantyHistoryAsync(id, ct)); }
    public async Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyNoteDto>>> GetNotesAsync(long id, CancellationToken ct) { await EnsureClaimAsync(id, ct); return ApiResponse<IReadOnlyCollection<WebsiteWarrantyNoteDto>>.Success(await repository.GetWarrantyNotesAsync(id, ct)); }
    public async Task<ApiResponse<IReadOnlyCollection<WebsiteWarrantyCustomerMessageDto>>> GetCustomerMessagesAsync(long id, CancellationToken ct) { await EnsureClaimAsync(id, ct); return ApiResponse<IReadOnlyCollection<WebsiteWarrantyCustomerMessageDto>>.Success(await repository.GetWarrantyCustomerMessagesAsync(id, ct)); }
    public async Task<ApiResponse> AssignAsync(long id, AssignWebsiteWarrantyClaimRequest request, CancellationToken ct) { await EnsureClaimAsync(id, ct); await repository.AssignWarrantyClaimAsync(id, request.AssignedToUserId, Trim(request.Remark), UserId(), ct); await AuditAsync(id, "Assigned", null, new { request.AssignedToUserId }, ct); return ApiResponse.Success("Warranty claim assignment updated."); }
    public Task<ApiResponse> StartReviewAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct) => TransitionAsync(id, WarrantyClaimStatus.UnderReview, request.Remark, ct);
    public Task<ApiResponse> RequestInformationAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct) => TransitionAsync(id, WarrantyClaimStatus.NeedMoreInformation, request.Remark, ct);
    public Task<ApiResponse> ApproveAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct) => TransitionAsync(id, WarrantyClaimStatus.Approved, request.Remark, ct);
    public Task<ApiResponse> RejectAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct) => TransitionAsync(id, WarrantyClaimStatus.Rejected, request.Remark, ct);
    public async Task<ApiResponse> ResolveAsync(long id, ResolveWebsiteWarrantyClaimRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(resolveValidator, request, ct); var claim = await GetClaimAsync(id, ct); if (!string.Equals(claim.Status, WarrantyClaimStatus.Approved.ToString(), StringComparison.OrdinalIgnoreCase)) throw new CosmosException("Only approved claims can receive a resolution.", 400); await repository.ResolveWarrantyClaimAsync(id, request with { Remark = Trim(request.Remark), RefundReference = Trim(request.RefundReference), ReplacementReference = Trim(request.ReplacementReference), ReplacementTrackingNumber = Trim(request.ReplacementTrackingNumber), RepairReference = Trim(request.RepairReference), ResolutionRemarks = Trim(request.ResolutionRemarks) }, UserId(), ct); await AuditAsync(id, "ResolutionSet", null, new { request.ResolutionType }, ct); return ApiResponse.Success("Warranty resolution saved."); }
    public Task<ApiResponse> CompleteAsync(long id, WarrantyWorkflowRequest request, CancellationToken ct) => TransitionAsync(id, WarrantyClaimStatus.Completed, request.Remark, ct);
    public async Task<ApiResponse<WebsiteWarrantyNoteDto>> AddNoteAsync(long id, AddWebsiteWarrantyNoteRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(noteValidator, request, ct); await EnsureClaimAsync(id, ct); await repository.AddWarrantyNoteAsync(id, request.Note.Trim(), UserId(), ct); var value = (await repository.GetWarrantyNotesAsync(id, ct)).First(); await AuditAsync(id, "InternalNoteAdded", null, new { }, ct); return ApiResponse<WebsiteWarrantyNoteDto>.Success(value, "Internal note added."); }
    public async Task<ApiResponse<WebsiteWarrantyCustomerMessageDto>> AddCustomerMessageAsync(long id, AddWebsiteWarrantyCustomerMessageRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(messageValidator, request, ct); await EnsureClaimAsync(id, ct); await repository.AddWarrantyCustomerMessageAsync(id, request.Message.Trim(), UserId(), ct); var value = (await repository.GetWarrantyCustomerMessagesAsync(id, ct)).First(); await AuditAsync(id, "CustomerMessageAdded", null, new { }, ct); return ApiResponse<WebsiteWarrantyCustomerMessageDto>.Success(value, "Customer message added."); }
    public async Task<ApiResponse<WebsiteWarrantyReportDto>> GetReportAsync(CancellationToken ct) => ApiResponse<WebsiteWarrantyReportDto>.Success(await repository.GetWarrantyReportAsync(ct));
    private async Task<ApiResponse> TransitionAsync(long id, WarrantyClaimStatus target, string? remark, CancellationToken ct) { var claim = await GetClaimAsync(id, ct); EnsureTransition(claim.Status, target); await repository.TransitionWarrantyClaimAsync(id, target, Trim(remark), UserId(), ct); await AuditAsync(id, target == WarrantyClaimStatus.Approved ? AuditActions.Approved : target == WarrantyClaimStatus.Rejected ? AuditActions.Rejected : "StatusChanged", new { claim.Status }, new { Status = target.ToString() }, ct); return ApiResponse.Success($"Warranty claim moved to {target}."); }
    private async Task<WebsiteWarrantyClaimDto> GetClaimAsync(long id, CancellationToken ct) => id > 0 ? await repository.GetWarrantyClaimByIdAsync(id, ct) ?? throw new NotFoundException("Warranty claim was not found.") : throw new NotFoundException("Warranty claim was not found.");
    private async Task EnsureClaimAsync(long id, CancellationToken ct) => _ = await GetClaimAsync(id, ct);
    private int UserId() => currentUser.UserId ?? throw new UnauthorizedCosmosException();
    private Task AuditAsync(long id, string action, object? oldValue, object? newValue, CancellationToken ct) => audit.AddAsync(new AuditEntryRequest("WebsiteWarrantyClaims", id.ToString(), action, oldValue is null ? null : AuditSerializer.Serialize(oldValue), newValue is null ? null : AuditSerializer.Serialize(newValue), UserId(), AuditModules.WebsiteManagement, "WebsiteWarrantyClaim", null, $"{action} website warranty claim."), ct);
    private static WebsiteWarrantySubmissionRequest Normalize(WebsiteWarrantySubmissionRequest x) => x with { FullName = x.FullName.Trim(), Email = x.Email.Trim(), OrderNumber = x.OrderNumber.Trim(), Description = x.Description.Trim(), Source = string.IsNullOrWhiteSpace(x.Source) ? "WEWEL_WEBSITE" : x.Source.Trim() };
    private static WebsiteWarrantyClaimListQuery Normalize(WebsiteWarrantyClaimListQuery x) => x with { Search = Trim(x.Search), Status = Trim(x.Status), ResolutionType = Trim(x.ResolutionType), SortBy = Trim(x.SortBy), SortDirection = Trim(x.SortDirection)?.ToLowerInvariant() };
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    internal static void EnsureTransition(string current, WarrantyClaimStatus target)
    {
        if (!Enum.TryParse<WarrantyClaimStatus>(current, true, out var source) || !IsAllowed(source, target)) throw new CosmosException($"Warranty claim cannot move from {current} to {target}.", 400);
    }
    internal static bool IsAllowed(WarrantyClaimStatus source, WarrantyClaimStatus target) => (source, target) switch
    {
        (WarrantyClaimStatus.Submitted, WarrantyClaimStatus.UnderReview) => true,
        (WarrantyClaimStatus.UnderReview, WarrantyClaimStatus.NeedMoreInformation or WarrantyClaimStatus.Approved or WarrantyClaimStatus.Rejected) => true,
        (WarrantyClaimStatus.NeedMoreInformation, WarrantyClaimStatus.UnderReview) => true,
        (WarrantyClaimStatus.Approved, WarrantyClaimStatus.Completed) => true,
        _ => false
    };
}

public sealed class WebsiteSettingsService(IWebsiteManagementRepository repository, IAuditRepository audit, ICurrentUser currentUser, IValidator<UpdateWebsiteSettingsRequest> validator) : IWebsiteSettingsService
{
    public async Task<ApiResponse<IReadOnlyCollection<WebsiteSettingDto>>> GetAsync(CancellationToken ct) => ApiResponse<IReadOnlyCollection<WebsiteSettingDto>>.Success(await repository.GetSettingsAsync(false, ct));
    public async Task<ApiResponse> UpdateAsync(UpdateWebsiteSettingsRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(validator, request, ct); var userId = currentUser.UserId ?? throw new UnauthorizedCosmosException(); await repository.UpdateSettingsAsync(request.Settings.Select(x => x with { Value = x.Value.Trim() }).ToArray(), userId, ct); await audit.AddAsync(new AuditEntryRequest("WebsiteSettings", "Batch", AuditActions.Updated, null, AuditSerializer.Serialize(new { Keys = request.Settings.Select(s => s.SettingKey).ToArray() }), userId, AuditModules.WebsiteManagement, "WebsiteSettings", null, "Updated website settings."), ct); return ApiResponse.Success("Website settings updated."); }
    public Task<IReadOnlyCollection<WebsiteSettingDto>> GetPublicAsync(CancellationToken ct) => repository.GetSettingsAsync(true, ct);
}
public sealed class WebsiteDashboardService(IWebsiteManagementRepository repository) : IWebsiteDashboardService { public async Task<ApiResponse<WebsiteDashboardOverviewDto>> GetOverviewAsync(CancellationToken ct) => ApiResponse<WebsiteDashboardOverviewDto>.Success(await repository.GetDashboardOverviewAsync(ct)); }
public sealed class WebsiteContactService(IWebsiteManagementRepository repository, IValidator<WebsiteContactEnquiryRequest> validator) : IWebsiteContactService { public async Task<WebsitePublicSubmissionResponse> SubmitAsync(WebsiteContactEnquiryRequest request, CancellationToken ct) { await ValidationRunner.ValidateAsync(validator, request, ct); await repository.CreateContactEnquiryAsync(request with { FirstName = request.FirstName.Trim(), LastName = request.LastName.Trim(), Email = request.Email.Trim(), Subject = request.Subject.Trim(), Message = request.Message.Trim(), EnquiryType = string.IsNullOrWhiteSpace(request.EnquiryType) ? "GENERAL" : request.EnquiryType.Trim(), Source = string.IsNullOrWhiteSpace(request.Source) ? "WEWEL_WEBSITE" : request.Source.Trim() }, ct); return new WebsitePublicSubmissionResponse("Your message has been received."); } }
