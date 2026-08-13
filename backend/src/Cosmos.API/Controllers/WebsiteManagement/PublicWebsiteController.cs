using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.WebsiteManagement;
using Cosmos.Domain.WebsiteManagement;
using Cosmos.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Cosmos.API.Controllers.WebsiteManagement;

/// <summary>Anonymous website contracts intentionally return the WEWEL client's plain JSON response shape, not the internal Cosmos envelope.</summary>
[AllowAnonymous]
[ApiController]
[ApiExplorerSettings(GroupName = "website-public")]
[Route("api/website")]
public sealed class PublicWebsiteController(
    IWebsiteProductService products, IWebsiteBlogService blogs, IWebsiteAnnouncementService announcements,
    IWebsiteWarrantyService warranty, IWebsiteSettingsService settings, IWebsiteContactService contact) : ControllerBase
{
    [HttpGet("products")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WebsiteProductDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Products(CancellationToken ct) => Ok(await products.GetPublicAsync(ct));

    [HttpGet("blog-posts")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WebsiteBlogPostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> BlogPosts(CancellationToken ct) => Ok(await blogs.GetPublicPostsAsync(ct));

    [HttpGet("blog-posts/{slug}")]
    [ProducesResponseType(typeof(WebsiteBlogPostDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> BlogPost(string slug, CancellationToken ct) => Ok(await blogs.GetPublicPostBySlugAsync(slug, ct) ?? throw new NotFoundException("Blog post was not found."));

    [HttpGet("announcements")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WebsiteAnnouncementDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Announcements([FromQuery] string? placement, CancellationToken ct) => Ok(await announcements.GetPublicAsync(placement ?? "top-bar", ct));

    [HttpGet("settings")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WebsiteSettingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Settings(CancellationToken ct) => Ok(await settings.GetPublicAsync(ct));

    [HttpPost("warranty-claims")]
    [EnableRateLimiting("website-public-write")]
    [RequestSizeLimit(40 * 1024 * 1024)]
    [ProducesResponseType(typeof(WebsitePublicSubmissionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(WebsitePublicErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(WebsitePublicErrorResponse), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SubmitWarrantyClaim([FromForm] WebsiteWarrantyClaimForm form, CancellationToken ct)
    {
        var invoice = await ReadUploadAsync(form.Invoice, WarrantyAttachmentType.Invoice, "invoice", ct);
        var images = new List<WebsiteWarrantyUpload>();
        foreach (var file in form.ProductImages ?? Array.Empty<IFormFile>()) images.Add(await ReadUploadAsync(file, WarrantyAttachmentType.ProductDamageImage, "productImages[]", ct));
        var claim = new WebsiteWarrantySubmissionRequest(form.FullName ?? string.Empty, form.Email ?? string.Empty, form.OrderNumber ?? string.Empty, form.PurchaseDate, form.Description ?? string.Empty, form.Source, form.Consent, invoice, images);
        return StatusCode(StatusCodes.Status201Created, await warranty.SubmitAsync(claim, ct));
    }

    [HttpPost("contact-enquiries")]
    [EnableRateLimiting("website-public-write")]
    [RequestSizeLimit(256 * 1024)]
    [ProducesResponseType(typeof(WebsitePublicSubmissionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(WebsitePublicErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitContact([FromBody] WebsiteContactEnquiryRequest request, CancellationToken ct) => StatusCode(StatusCodes.Status201Created, await contact.SubmitAsync(request, ct));

    private static async Task<WebsiteWarrantyUpload> ReadUploadAsync(IFormFile? file, WarrantyAttachmentType type, string field, CancellationToken ct)
    {
        if (file is null || file.Length <= 0) throw FieldError(field, type == WarrantyAttachmentType.Invoice ? "Upload an invoice or order screenshot." : "Add at least one photo of the product damage.");
        var maxBytes = type == WarrantyAttachmentType.Invoice ? 10L * 1024 * 1024 : 5L * 1024 * 1024;
        if (file.Length > maxBytes) throw FieldError(field, $"This file is larger than the allowed {maxBytes / 1024 / 1024} MB.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = type == WarrantyAttachmentType.Invoice
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { [".pdf"] = "application/pdf", [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png" }
            : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".webp"] = "image/webp" };
        if (!allowed.TryGetValue(extension, out var expectedType)) throw FieldError(field, type == WarrantyAttachmentType.Invoice ? "Please upload a PDF, JPG or PNG invoice." : "Please upload a JPG, PNG or WEBP image.");
        await using var input = file.OpenReadStream();
        using var memory = new MemoryStream((int)file.Length);
        await input.CopyToAsync(memory, ct);
        var content = memory.ToArray();
        var detected = DetectType(content) ?? throw FieldError(field, "This file's contents do not match its file type.");
        if (!string.Equals(detected, expectedType, StringComparison.OrdinalIgnoreCase) || !string.IsNullOrWhiteSpace(file.ContentType) && !string.Equals(file.ContentType, expectedType, StringComparison.OrdinalIgnoreCase)) throw FieldError(field, "This file's contents do not match its file type.");
        return new WebsiteWarrantyUpload(Path.GetFileName(file.FileName), file.ContentType ?? string.Empty, detected, content, type);
    }

    private static string? DetectType(ReadOnlySpan<byte> bytes) =>
        bytes.Length >= 4 && bytes[..4].SequenceEqual("%PDF"u8) ? "application/pdf" :
        bytes.Length >= 3 && bytes[..3].SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF }) ? "image/jpeg" :
        bytes.Length >= 8 && bytes[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }) ? "image/png" :
        bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8) ? "image/webp" : null;
    private static CosmosException FieldError(string field, string message) => new(message, StatusCodes.Status400BadRequest, new[] { message }, new Dictionary<string, IReadOnlyCollection<string>> { [field] = new[] { message } });
}

public sealed record WebsiteWarrantyClaimForm(string? FullName, string? Email, string? OrderNumber, DateOnly PurchaseDate, string? Description, IFormFile? Invoice, [property: FromForm(Name = "productImages[]")] IReadOnlyList<IFormFile>? ProductImages, string? Source, bool Consent);
