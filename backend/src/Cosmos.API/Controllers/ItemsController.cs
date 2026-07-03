using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("Items")]
[ApiExplorerSettings(GroupName = "items")]
[Route("api/items")]
public sealed class ItemsController : ApiControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif"
    };

    private const long MaxImageSizeBytes = 5 * 1024 * 1024;
    private readonly IItemService _service;
    private readonly IWebHostEnvironment _environment;

    public ItemsController(IItemService service, IWebHostEnvironment environment)
    {
        _service = service;
        _environment = environment;
    }

    /// <summary>Gets a paginated item list.</summary>
    [HttpGet]
    [RequirePermission("Items", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ItemListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetItemsQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(query, cancellationToken));

    /// <summary>Gets an item by id.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission("Items", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(new GetItemByIdQuery(id), cancellationToken));

    ///// <summary>Creates an item.</summary>
    //[HttpPost]
    //[RequirePermission("Items", PermissionAction.Create)]
    //[Consumes("application/json")]
    //[ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status201Created)]
    //public async Task<IActionResult> Create([FromBody] CreateItemCommand command, CancellationToken cancellationToken) =>
    //    FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Creates an item with an uploaded image file.</summary>
    [HttpPost]
    [RequirePermission("Items", PermissionAction.Create)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateFromForm([FromForm] CreateItemFormRequest request, CancellationToken cancellationToken)
    {
        var imageUrl = await SaveImageAsync(request.Image, cancellationToken);
        try
        {
            var command = request.ToCommand(imageUrl);
            return FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);
        }
        catch
        {
            DeleteImage(imageUrl);
            throw;
        }
    }

    /// <summary>Updates an item.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission("Items", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateItemCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, command, cancellationToken));

    /// <summary>Soft deletes an item.</summary>
    [HttpDelete("{id:long}")]
    [RequirePermission("Items", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.DeleteAsync(new DeleteItemCommand(id), cancellationToken));

    private async Task<string?> SaveImageAsync(IFormFile? image, CancellationToken cancellationToken)
    {
        if (image is null || image.Length == 0)
        {
            return null;
        }

        if (image.Length > MaxImageSizeBytes)
        {
            throw new BadHttpRequestException("Image size must be 5 MB or less.", StatusCodes.Status400BadRequest);
        }

        var extension = Path.GetExtension(image.FileName);
        if (!AllowedImageExtensions.Contains(extension))
        {
            throw new BadHttpRequestException("Only JPG, PNG, WEBP, and GIF images are allowed.", StatusCodes.Status400BadRequest);
        }

        var webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var uploadDirectory = Path.Combine(webRootPath, "uploads", "items");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await image.CopyToAsync(stream, cancellationToken);

        return $"/uploads/items/{fileName}";
    }

    private void DeleteImage(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return;
        }

        var fileName = Path.GetFileName(imageUrl);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        var webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var filePath = Path.Combine(webRootPath, "uploads", "items", fileName);
        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
        }
    }
}

public sealed record CreateItemFormRequest(
    string Name,
    string ItemCode,
    string? Barcode,
    long CategoryId,
    long UnitId,
    int ItemType,
    decimal PurchasePrice,
    decimal SalesPrice,
    string? HSNCode,
    decimal GSTRate,
    bool TrackInventory,
    decimal OpeningStock,
    decimal OpeningStockValue,
    decimal CurrentStock,
    decimal ReservedStock,
    decimal MinimumStock,
    string? Description,
    bool IsActive,
    IFormFile? Image)
{
    public CreateItemCommand ToCommand(string? imageUrl) =>
        new(
            Name,
            ItemCode,
            Barcode,
            CategoryId,
            UnitId,
            ItemType,
            PurchasePrice,
            SalesPrice,
            HSNCode,
            GSTRate,
            TrackInventory,
            OpeningStock,
            OpeningStockValue,
            CurrentStock,
            ReservedStock,
            MinimumStock,
            Description,
            imageUrl,
            IsActive);
}
