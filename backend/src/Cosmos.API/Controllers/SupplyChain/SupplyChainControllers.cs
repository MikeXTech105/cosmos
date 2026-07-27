using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.SupplyChain;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Cosmos.API.Controllers.SupplyChain;

[Authorize]
[ApiExplorerSettings(GroupName = "supply-chain")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/supply-chain/channels")]
public sealed class SupplyChainChannelsController(ISupplyChainService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(SupplyChainPermissions.Channels, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ChannelDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] SupplyChainListQuery query, CancellationToken ct) => FromResponse(await service.GetChannelsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Channels, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ChannelDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetChannelAsync(id, ct));

    [HttpPost]
    [RequirePermission(SupplyChainPermissions.Channels, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ChannelDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveChannelRequest request, CancellationToken ct) => FromResponse(await service.CreateChannelAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Channels, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ChannelDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveChannelRequest request, CancellationToken ct) => FromResponse(await service.UpdateChannelAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Channels, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteChannelAsync(id, ct));

    [HttpPatch("{id:long}/status")]
    [RequirePermission(SupplyChainPermissions.Channels, PermissionAction.Edit)]
    public async Task<IActionResult> Status(long id, [FromBody] ChangeSupplyChainActiveStatusRequest request, CancellationToken ct) => FromResponse(await service.SetChannelStatusAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "supply-chain")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/supply-chain/warehouses")]
public sealed class SupplyChainWarehousesController(ISupplyChainService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ChannelWarehouseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ChannelWarehouseQuery query, CancellationToken ct) => FromResponse(await service.GetWarehousesAsync(query, ct));

    [HttpGet("dropdown")]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ChannelWarehouseDropdownDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Dropdown([FromQuery] long? channelId, CancellationToken ct) => FromResponse(await service.GetWarehouseDropdownAsync(channelId, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ChannelWarehouseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetWarehouseAsync(id, ct));

    [HttpPost]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ChannelWarehouseDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveChannelWarehouseRequest request, CancellationToken ct) => FromResponse(await service.CreateWarehouseAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ChannelWarehouseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveChannelWarehouseRequest request, CancellationToken ct) => FromResponse(await service.UpdateWarehouseAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteWarehouseAsync(id, ct));

    [HttpPatch("{id:long}/status")]
    [RequirePermission(SupplyChainPermissions.Warehouses, PermissionAction.Edit)]
    public async Task<IActionResult> Status(long id, [FromBody] ChangeSupplyChainActiveStatusRequest request, CancellationToken ct) => FromResponse(await service.SetWarehouseStatusAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "supply-chain")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/supply-chain/item-mappings")]
public sealed class SupplyChainItemMappingsController(ISupplyChainService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ChannelItemMappingDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ChannelItemMappingQuery query, CancellationToken ct) => FromResponse(await service.GetItemMappingsAsync(query, ct));

    [HttpGet("unmatched")]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<UnmatchedChannelItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Unmatched(CancellationToken ct) => FromResponse(await service.GetUnmatchedItemsAsync(ct));

    [HttpGet("{id:long}")]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ChannelItemMappingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetItemMappingAsync(id, ct));

    [HttpPost]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ChannelItemMappingDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveChannelItemMappingRequest request, CancellationToken ct) => FromResponse(await service.CreateItemMappingAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ChannelItemMappingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveChannelItemMappingRequest request, CancellationToken ct) => FromResponse(await service.UpdateItemMappingAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteItemMappingAsync(id, ct));

    [HttpPatch("{id:long}/status")]
    [RequirePermission(SupplyChainPermissions.ItemMappings, PermissionAction.Edit)]
    public async Task<IActionResult> Status(long id, [FromBody] ChangeSupplyChainActiveStatusRequest request, CancellationToken ct) => FromResponse(await service.SetItemMappingStatusAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "supply-chain")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/supply-chain/packaging-profiles")]
public sealed class SupplyChainPackagingProfilesController(ISupplyChainService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(SupplyChainPermissions.PackagingProfiles, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ItemPackagingProfileDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ItemPackagingProfileQuery query, CancellationToken ct) => FromResponse(await service.GetPackagingProfilesAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(SupplyChainPermissions.PackagingProfiles, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ItemPackagingProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetPackagingProfileAsync(id, ct));

    [HttpPost]
    [RequirePermission(SupplyChainPermissions.PackagingProfiles, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ItemPackagingProfileDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] SaveItemPackagingProfileRequest request, CancellationToken ct) => FromResponse(await service.CreatePackagingProfileAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(SupplyChainPermissions.PackagingProfiles, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ItemPackagingProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] SaveItemPackagingProfileRequest request, CancellationToken ct) => FromResponse(await service.UpdatePackagingProfileAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(SupplyChainPermissions.PackagingProfiles, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeletePackagingProfileAsync(id, ct));

    [HttpPatch("{id:long}/set-default")]
    [RequirePermission(SupplyChainPermissions.PackagingProfiles, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ItemPackagingProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetDefault(long id, CancellationToken ct) => FromResponse(await service.SetPackagingProfileDefaultAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "supply-chain")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[Route("api/v1/supply-chain/imports")]
public sealed class SupplyChainImportsController(ISupplyChainService service) : ApiControllerBase
{
    private const long MaximumImportBytes = 10 * 1024 * 1024;

    [HttpPost("validate")]
    [Consumes("multipart/form-data")]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<SupplyChainImportValidationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate([FromForm] SupplyChainImportValidationForm request, CancellationToken ct)
    {
        var content = await ReadImportAsync(request.File, ct);
        var correlationId = HttpContext.Items.TryGetValue(Middleware.CorrelationIdMiddleware.HeaderName, out var value) ? value?.ToString() : null;
        return FromResponse(await service.ValidateImportAsync(request.File.FileName, request.ImportType, request.ChannelId, content, correlationId, ct));
    }

    [HttpGet]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SupplyChainImportBatchDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] SupplyChainImportBatchQuery query, CancellationToken ct) => FromResponse(await service.GetImportBatchesAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<SupplyChainImportBatchDetailsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetImportBatchAsync(id, ct));

    [HttpGet("{id:long}/errors")]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<SupplyChainImportRowErrorDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Errors(long id, CancellationToken ct) => FromResponse(await service.GetImportErrorsAsync(id, ct));

    [HttpGet("{id:long}/error-export")]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.Export)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ErrorExport(long id, CancellationToken ct)
    {
        var errors = (await service.GetImportErrorsAsync(id, ct)).Data ?? [];
        var csv = new StringBuilder("RowNumber,Field,Message,OriginalValue\r\n");
        foreach (var error in errors)
            csv.Append(error.RowNumber).Append(',').Append(Csv(error.Field)).Append(',').Append(Csv(error.Message)).Append(',').Append(Csv(error.OriginalValue)).Append("\r\n");
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"supply-chain-import-{id}-errors.csv");
    }

    [HttpPost("{id:long}/commit")]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<SupplyChainImportBatchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Commit(long id, [FromBody] CommitSupplyChainImportRequest request, CancellationToken ct) => FromResponse(await service.CommitImportAsync(id, request, ct));

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(SupplyChainPermissions.Imports, PermissionAction.Delete)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelSupplyChainImportRequest request, CancellationToken ct) => FromResponse(await service.CancelImportAsync(id, request, ct));

    private static async Task<byte[]> ReadImportAsync(IFormFile file, CancellationToken ct)
    {
        if (file.Length <= 0) throw new BadHttpRequestException("An import file is required.");
        if (file.Length > MaximumImportBytes) throw new BadHttpRequestException("Import file size must be 10 MB or less.");
        var extension = Path.GetExtension(file.FileName);
        if (!extension.Equals(".csv", StringComparison.OrdinalIgnoreCase) && !extension.Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            throw new BadHttpRequestException("Only .csv and .xlsx files are allowed.");
        await using var input = file.OpenReadStream();
        using var output = new MemoryStream();
        await input.CopyToAsync(output, ct);
        return output.ToArray();
    }

    private static string Csv(string? value) => '"' + (value ?? string.Empty).Replace("\"", "\"\"") + '"';
}

public sealed record SupplyChainImportValidationForm(IFormFile File, string ImportType = "ProcurementSales", long? ChannelId = null);
