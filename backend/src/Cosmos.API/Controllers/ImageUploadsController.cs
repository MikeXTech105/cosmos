using Cosmos.API.Security;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Route("api/uploads")]
public sealed class ImageUploadsController(IWebHostEnvironment environment) : ApiControllerBase
{
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;
    private const string WebsiteMediaPermission = "WebsiteManagement.Media";

    [HttpPost("images")]
    [ApiExplorerSettings(GroupName = "items")]
    [Consumes("multipart/form-data")]
    [RequirePermission("Items", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ImageUploadDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> UploadImage([FromForm] ImageUploadRequest request, CancellationToken cancellationToken)
        => await UploadImageAsync(request, "items", cancellationToken);

    /// <summary>Uploads public CMS images for Website Products and Blog Posts.</summary>
    [HttpPost("website/images")]
    [ApiExplorerSettings(GroupName = "website-management")]
    [Consumes("multipart/form-data")]
    [RequirePermission(WebsiteMediaPermission, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ImageUploadDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> UploadWebsiteImage([FromForm] ImageUploadRequest request, CancellationToken cancellationToken)
        => await UploadImageAsync(request, "website", cancellationToken);

    private async Task<IActionResult> UploadImageAsync(
        ImageUploadRequest request,
        string requiredFolder,
        CancellationToken cancellationToken)
    {
        var file = request.File;
        if (file is null || file.Length == 0)
        {
            throw InvalidFile("An image file is required.");
        }

        if (file.Length > MaxImageSizeBytes)
        {
            throw InvalidFile("Image size must be 5 MB or less.");
        }

        var uploadFolder = string.IsNullOrWhiteSpace(request.Folder)
            ? requiredFolder
            : request.Folder.Trim().ToLowerInvariant();
        if (!string.Equals(uploadFolder, requiredFolder, StringComparison.Ordinal))
        {
            throw InvalidFile($"Only the {requiredFolder} upload folder is allowed.");
        }

        var imageType = await DetectImageTypeAsync(file, cancellationToken)
            ?? throw InvalidFile("The file signature is not a supported image.");
        if (!string.IsNullOrWhiteSpace(file.ContentType)
            && !string.Equals(file.ContentType, imageType.ContentType, StringComparison.OrdinalIgnoreCase))
        {
            throw InvalidFile("The declared content type does not match the image signature.");
        }

        var webRootPath = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var rootDirectory = Path.GetFullPath(Path.Combine(webRootPath, "uploads"));
        var uploadDirectory = Path.GetFullPath(Path.Combine(rootDirectory, uploadFolder));
        if (!uploadDirectory.StartsWith(rootDirectory + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            throw InvalidFile("Invalid upload path.");
        }

        Directory.CreateDirectory(uploadDirectory);
        var fileName = $"{Guid.NewGuid():N}{imageType.Extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);
        await using (var stream = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var relativeUrl = $"/uploads/{uploadFolder}/{fileName}";
        var imageUrl = $"{Request.Scheme}://{Request.Host}{relativeUrl}";
        return FromResponse(
            ApiResponse<ImageUploadDto>.Success(
                new ImageUploadDto(imageUrl, fileName, imageType.ContentType, file.Length),
                "Image uploaded."),
            StatusCodes.Status201Created);
    }

    private static async Task<ImageType?> DetectImageTypeAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(header.AsMemory(), cancellationToken);

        return bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF
            ? new ImageType(".jpg", "image/jpeg")
            : bytesRead >= 8 && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })
                ? new ImageType(".png", "image/png")
                : bytesRead >= 6 && (header[..6].SequenceEqual("GIF87a"u8) || header[..6].SequenceEqual("GIF89a"u8))
                    ? new ImageType(".gif", "image/gif")
                    : bytesRead >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8)
                        ? new ImageType(".webp", "image/webp")
                        : null;
    }

    private static CosmosException InvalidFile(string message) =>
        new(message, StatusCodes.Status400BadRequest, new[] { message });

    private sealed record ImageType(string Extension, string ContentType);
}

public sealed record ImageUploadDto(string Url, string FileName, string ContentType, long SizeBytes);
public sealed record ImageUploadRequest(IFormFile? File, string? Folder);
