using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Domain.Security;
using Cosmos.Domain.WebsiteManagement;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.WebsiteManagement;

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/dashboard")]
public sealed class WebsiteManagementDashboardController(IWebsiteDashboardService service) : ApiControllerBase
{
    [HttpGet("overview")]
    [RequirePermission(WebsiteManagementPermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<WebsiteDashboardOverviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Overview(CancellationToken ct) => FromResponse(await service.GetOverviewAsync(ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/products")]
public sealed class WebsiteProductsController(IWebsiteProductService service) : ApiControllerBase
{
    [HttpGet] [RequirePermission(WebsiteManagementPermissions.Products, PermissionAction.View)] [ProducesResponseType(typeof(ApiResponse<PagedResult<WebsiteProductDto>>), StatusCodes.Status200OK)] public async Task<IActionResult> List([FromQuery] WebsiteProductListQuery query, CancellationToken ct) => FromResponse(await service.GetListAsync(query, ct));
    [HttpGet("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Products, PermissionAction.View)] [ProducesResponseType(typeof(ApiResponse<WebsiteProductDto>), StatusCodes.Status200OK)] public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetByIdAsync(id, ct));
    [HttpPost] [RequirePermission(WebsiteManagementPermissions.Products, PermissionAction.Create)] [ProducesResponseType(typeof(ApiResponse<WebsiteProductDto>), StatusCodes.Status201Created)] public async Task<IActionResult> Create(SaveWebsiteProductRequest request, CancellationToken ct) => FromResponse(await service.CreateAsync(request, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Products, PermissionAction.Edit)] [ProducesResponseType(typeof(ApiResponse<WebsiteProductDto>), StatusCodes.Status200OK)] public async Task<IActionResult> Update(long id, SaveWebsiteProductRequest request, CancellationToken ct) => FromResponse(await service.UpdateAsync(id, request, ct));
    [HttpDelete("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Products, PermissionAction.Delete)] [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)] public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/blog-posts")]
public sealed class WebsiteBlogPostsController(IWebsiteBlogService service) : ApiControllerBase
{
    [HttpGet] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.View)] public async Task<IActionResult> List([FromQuery] WebsiteBlogPostListQuery query, CancellationToken ct) => FromResponse(await service.GetPostsAsync(query, ct));
    [HttpGet("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.View)] public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetPostByIdAsync(id, ct));
    [HttpPost] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.Create)] public async Task<IActionResult> Create(SaveWebsiteBlogPostRequest request, CancellationToken ct) => FromResponse(await service.CreatePostAsync(request, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.Edit)] public async Task<IActionResult> Update(long id, SaveWebsiteBlogPostRequest request, CancellationToken ct) => FromResponse(await service.UpdatePostAsync(id, request, ct));
    [HttpDelete("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.Delete)] public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeletePostAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/blog-categories")]
public sealed class WebsiteBlogCategoriesController(IWebsiteBlogService service) : ApiControllerBase
{
    [HttpGet] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.View)] public async Task<IActionResult> List(CancellationToken ct) => FromResponse(await service.GetCategoriesAsync(ct));
    [HttpPost] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.Create)] public async Task<IActionResult> Create(SaveWebsiteBlogCategoryRequest request, CancellationToken ct) => FromResponse(await service.CreateCategoryAsync(request, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.Edit)] public async Task<IActionResult> Update(long id, SaveWebsiteBlogCategoryRequest request, CancellationToken ct) => FromResponse(await service.UpdateCategoryAsync(id, request, ct));
    [HttpDelete("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Blogs, PermissionAction.Delete)] public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteCategoryAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/announcements")]
public sealed class WebsiteAnnouncementsController(IWebsiteAnnouncementService service) : ApiControllerBase
{
    [HttpGet] [RequirePermission(WebsiteManagementPermissions.Announcements, PermissionAction.View)] public async Task<IActionResult> List([FromQuery] WebsiteAnnouncementListQuery query, CancellationToken ct) => FromResponse(await service.GetListAsync(query, ct));
    [HttpPost] [RequirePermission(WebsiteManagementPermissions.Announcements, PermissionAction.Create)] public async Task<IActionResult> Create(SaveWebsiteAnnouncementRequest request, CancellationToken ct) => FromResponse(await service.CreateAsync(request, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Announcements, PermissionAction.Edit)] public async Task<IActionResult> Update(long id, SaveWebsiteAnnouncementRequest request, CancellationToken ct) => FromResponse(await service.UpdateAsync(id, request, ct));
    [HttpDelete("{id:long}")] [RequirePermission(WebsiteManagementPermissions.Announcements, PermissionAction.Delete)] public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/warranty-claims")]
public sealed class WebsiteWarrantyClaimsController(IWebsiteWarrantyService service, IWebsiteFileStorage storage) : ApiControllerBase
{
    [HttpGet] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> List([FromQuery] WebsiteWarrantyClaimListQuery query, CancellationToken ct) => FromResponse(await service.GetListAsync(query, ct));
    [HttpGet("{id:long}")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetByIdAsync(id, ct));
    [HttpGet("{id:long}/history")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> History(long id, CancellationToken ct) => FromResponse(await service.GetHistoryAsync(id, ct));
    [HttpGet("{id:long}/attachments")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> Attachments(long id, CancellationToken ct) => FromResponse(await service.GetAttachmentsAsync(id, ct));
    [HttpGet("attachments/{attachmentId:long}/download")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> Download(long attachmentId, CancellationToken ct)
    {
        var attachment = await service.GetAttachmentForDownloadAsync(attachmentId, ct) ?? throw new Cosmos.Shared.Exceptions.NotFoundException("Warranty attachment was not found.");
        var stream = await storage.OpenPrivateWarrantyEvidenceReadAsync(attachment.StorageKey, ct) ?? throw new Cosmos.Shared.Exceptions.NotFoundException("Warranty attachment file was not found.");
        return File(stream, attachment.DetectedMimeType, Path.GetFileName(attachment.OriginalFileName));
    }
    [HttpPost("{id:long}/assign")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Edit)] public async Task<IActionResult> Assign(long id, AssignWebsiteWarrantyClaimRequest request, CancellationToken ct) => FromResponse(await service.AssignAsync(id, request, ct));
    [HttpPost("{id:long}/start-review")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Edit)] public async Task<IActionResult> StartReview(long id, WarrantyWorkflowRequest request, CancellationToken ct) => FromResponse(await service.StartReviewAsync(id, request, ct));
    [HttpPost("{id:long}/request-information")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Edit)] public async Task<IActionResult> RequestInformation(long id, WarrantyWorkflowRequest request, CancellationToken ct) => FromResponse(await service.RequestInformationAsync(id, request, ct));
    [HttpPost("{id:long}/approve")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Approve)] public async Task<IActionResult> Approve(long id, WarrantyWorkflowRequest request, CancellationToken ct) => FromResponse(await service.ApproveAsync(id, request, ct));
    [HttpPost("{id:long}/reject")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Approve)] public async Task<IActionResult> Reject(long id, WarrantyWorkflowRequest request, CancellationToken ct) => FromResponse(await service.RejectAsync(id, request, ct));
    [HttpPost("{id:long}/resolve")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Approve)] public async Task<IActionResult> Resolve(long id, ResolveWebsiteWarrantyClaimRequest request, CancellationToken ct) => FromResponse(await service.ResolveAsync(id, request, ct));
    [HttpPost("{id:long}/complete")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Approve)] public async Task<IActionResult> Complete(long id, WarrantyWorkflowRequest request, CancellationToken ct) => FromResponse(await service.CompleteAsync(id, request, ct));
    [HttpGet("{id:long}/notes")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> Notes(long id, CancellationToken ct) => FromResponse(await service.GetNotesAsync(id, ct));
    [HttpPost("{id:long}/notes")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Edit)] public async Task<IActionResult> AddNote(long id, AddWebsiteWarrantyNoteRequest request, CancellationToken ct) => FromResponse(await service.AddNoteAsync(id, request, ct), StatusCodes.Status201Created);
    [HttpGet("{id:long}/customer-messages")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> CustomerMessages(long id, CancellationToken ct) => FromResponse(await service.GetCustomerMessagesAsync(id, ct));
    [HttpPost("{id:long}/customer-messages")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.Edit)] public async Task<IActionResult> AddCustomerMessage(long id, AddWebsiteWarrantyCustomerMessageRequest request, CancellationToken ct) => FromResponse(await service.AddCustomerMessageAsync(id, request, ct), StatusCodes.Status201Created);
    [HttpGet("reports/summary")] [RequirePermission(WebsiteManagementPermissions.WarrantyClaims, PermissionAction.View)] public async Task<IActionResult> Report(CancellationToken ct) => FromResponse(await service.GetReportAsync(ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "website-management")]
[Route("api/v1/website-management/settings")]
public sealed class WebsiteSettingsController(IWebsiteSettingsService service) : ApiControllerBase
{
    [HttpGet] [RequirePermission(WebsiteManagementPermissions.Settings, PermissionAction.View)] public async Task<IActionResult> Get(CancellationToken ct) => FromResponse(await service.GetAsync(ct));
    [HttpPut] [RequirePermission(WebsiteManagementPermissions.Settings, PermissionAction.Edit)] public async Task<IActionResult> Update(UpdateWebsiteSettingsRequest request, CancellationToken ct) => FromResponse(await service.UpdateAsync(request, ct));
}
