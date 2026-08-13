using System.Reflection;
using Cosmos.API.Controllers.WebsiteManagement;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Domain.Security;
using Cosmos.Domain.WebsiteManagement;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cosmos.Tests.WebsiteManagement;

public sealed class WebsiteManagementTests
{
    [Fact]
    public async Task Product_validator_rejects_out_of_range_rating_and_unsafe_media_url()
    {
        var request = ProductRequest() with { Rating = 5.1m, Media = [new WebsiteProductMediaRequest("ftp://example.test/image.jpg", null)] };

        var result = await new SaveWebsiteProductRequestValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "Rating");
        Assert.Contains(result.Errors, error => error.PropertyName.Contains("Media", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Blog_validator_requires_a_publish_date_for_published_posts()
    {
        var request = new SaveWebsiteBlogPostRequest("A post", "a-post", "An excerpt", "## Content", null, "4 min read", 1, WebsitePublishStatus.Published, null, null, null, null, false, 0);

        var result = await new SaveWebsiteBlogPostRequestValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "PublishedAtUtc");
    }

    [Fact]
    public async Task Announcement_validator_rejects_an_inverted_schedule()
    {
        var now = DateTime.UtcNow;
        var request = new SaveWebsiteAnnouncementRequest(null, "Sale", AnnouncementPlacement.TopBar, null, null, 1, now, now.AddMinutes(-1), true, "1", 0);

        var result = await new SaveWebsiteAnnouncementRequestValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.ErrorMessage.Contains("StartsAtUtc", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Warranty_validator_enforces_existing_frontend_required_fields()
    {
        var request = WarrantyRequest() with { PurchaseDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)), Consent = false, ProductImages = [] };

        var result = await new WebsiteWarrantySubmissionRequestValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == "PurchaseDate");
        Assert.Contains(result.Errors, error => error.PropertyName == "Consent");
        Assert.Contains(result.Errors, error => error.PropertyName == "ProductImages");
    }

    [Theory]
    [InlineData(WarrantyClaimStatus.Submitted, WarrantyClaimStatus.UnderReview, true)]
    [InlineData(WarrantyClaimStatus.UnderReview, WarrantyClaimStatus.Approved, true)]
    [InlineData(WarrantyClaimStatus.Approved, WarrantyClaimStatus.Completed, true)]
    [InlineData(WarrantyClaimStatus.Rejected, WarrantyClaimStatus.Completed, false)]
    [InlineData(WarrantyClaimStatus.Submitted, WarrantyClaimStatus.Completed, false)]
    public void Warranty_workflow_permits_only_defined_transitions(WarrantyClaimStatus from, WarrantyClaimStatus to, bool allowed) =>
        Assert.Equal(allowed, WebsiteWarrantyService.IsAllowed(from, to));

    [Fact]
    public async Task Warranty_submission_stores_private_evidence_metadata_without_audit_payload_content()
    {
        var repository = new Mock<IWebsiteManagementRepository>();
        var storage = new Mock<IWebsiteFileStorage>();
        storage.SetupSequence(x => x.SavePrivateWarrantyEvidenceAsync(It.IsAny<string>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("2026/08/invoice.pdf").ReturnsAsync("2026/08/photo.jpg");
        repository.Setup(x => x.CreateWarrantyClaimAsync(It.IsAny<WebsiteWarrantySubmissionRequest>(), It.IsAny<IReadOnlyCollection<StoredWebsiteWarrantyAttachment>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WebsitePublicSubmissionResponse("Warranty claim submitted.", "WC-2026-000001"));
        var service = CreateWarrantyService(repository.Object, storage.Object);

        var result = await service.SubmitAsync(WarrantyRequest(), CancellationToken.None);

        Assert.Equal("WC-2026-000001", result.ReferenceId);
        repository.Verify(x => x.CreateWarrantyClaimAsync(
            It.IsAny<WebsiteWarrantySubmissionRequest>(),
            It.Is<IReadOnlyCollection<StoredWebsiteWarrantyAttachment>>(attachments => attachments.Count == 2 && attachments.All(a => !a.StorageKey.Contains("..", StringComparison.Ordinal))),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("List", PermissionAction.View)]
    [InlineData("Get", PermissionAction.View)]
    [InlineData("Create", PermissionAction.Create)]
    [InlineData("Update", PermissionAction.Edit)]
    [InlineData("Delete", PermissionAction.Delete)]
    public void Product_management_endpoints_use_existing_product_permissions(string methodName, PermissionAction action)
    {
        var method = typeof(WebsiteProductsController).GetMethods().Single(method => method.Name == methodName);
        var permission = Assert.Single(method.GetCustomAttributes(typeof(RequirePermissionAttribute), true).Cast<RequirePermissionAttribute>());
        Assert.Equal(new object[] { WebsiteManagementPermissions.Products, action }, permission.Arguments);
    }

    [Fact]
    public void Migration_contains_standalone_website_schema_workflow_and_public_contracts()
    {
        var script = ReadBackendFile("database", "migrations", "20260813_website_management_module.sql");

        Assert.Contains("CREATE TABLE dbo.WebsiteProducts", script, StringComparison.Ordinal);
        Assert.DoesNotContain("WebsiteProductId) REFERENCES dbo.Items", script, StringComparison.Ordinal);
        Assert.Contains("CREATE TABLE dbo.WebsiteWarrantyClaimAttachments", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_CreatePublic", script, StringComparison.Ordinal);
        Assert.Contains("WITH(UPDLOCK,HOLDLOCK)", script, StringComparison.Ordinal);
        Assert.Contains("TR_WebsiteWarrantyClaimHistory_AppendOnly", script, StringComparison.Ordinal);
        Assert.Contains("WebsiteManagement.WarrantyClaims", script, StringComparison.Ordinal);
    }

    private static WebsiteWarrantyService CreateWarrantyService(IWebsiteManagementRepository repository, IWebsiteFileStorage storage) => new(
        repository, storage, Mock.Of<IAuditRepository>(), new StubCurrentUser(11), new WebsiteWarrantySubmissionRequestValidator(),
        new WebsiteWarrantyClaimListQueryValidator(), new ResolveWebsiteWarrantyClaimRequestValidator(), new AddWebsiteWarrantyNoteRequestValidator(), new AddWebsiteWarrantyCustomerMessageRequestValidator());

    private static WebsiteWarrantySubmissionRequest WarrantyRequest() => new("A Customer", "customer@example.test", "ORDER-123", DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), "This product broke during ordinary use.", "WEWEL_WEBSITE", true,
        new WebsiteWarrantyUpload("invoice.pdf", "application/pdf", "application/pdf", "%PDF-1.7"u8.ToArray(), WarrantyAttachmentType.Invoice),
        [new WebsiteWarrantyUpload("damage.jpg", "image/jpeg", "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF }, WarrantyAttachmentType.ProductDamageImage)]);

    private static SaveWebsiteProductRequest ProductRequest() => new("clips-24", "Premium Clips", null, 299m, "INR", 4.8m, 12, null, null, "ABS", "24 pcs", true, true, true, "1 Year", "https://www.amazon.in", "WEWEL", "InStock", 0, WebsitePublishStatus.Published, true);

    private static string ReadBackendFile(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine([directory.FullName, .. segments]);
            if (File.Exists(candidate)) return File.ReadAllText(candidate);
            directory = directory.Parent;
        }
        throw new FileNotFoundException($"Could not locate backend file: {string.Join('/', segments)}");
    }

    private sealed class StubCurrentUser(int userId) : ICurrentUser
    {
        public int? UserId => userId;
        public string? Username => null;
        public string? Email => null;
    }
}
