using Cosmos.API.Exports;
using Cosmos.API.Middleware;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DataBook;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.DataBook;

/// <summary>Creates and manages shared and owner-private Data Book entries.</summary>
[Authorize]
[ApiExplorerSettings(GroupName = "data-book")]
[Route("api/v1/data-book/entries")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class DataBookEntriesController(IDataBookService service) : ApiControllerBase
{
    /// <summary>Lists public entries and only the caller's private entries.</summary>
    [HttpGet]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<DataBookEntryListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] DataBookEntryListQuery query, CancellationToken ct) =>
        FromResponse(await service.GetListAsync(query, ct));

    /// <summary>Exports public entries and only the caller's private entries as UTF-8 CSV.</summary>
    [HttpGet("export")]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.Export)]
    [Produces("text/csv")]
    public async Task<IActionResult> Export([FromQuery] DataBookExportRequest request, [FromQuery] string? format, CancellationToken ct)
    {
        CsvExport.RequireCsv(format);
        var result = await service.ExportAsync(request, ct);
        return CsvExport.Create(result.Data ?? Array.Empty<DataBookExportDto>(), $"cosmos_data_book_{DateTime.UtcNow:yyyy-MM-dd}.csv");
    }

    /// <summary>Gets an entry. Another user's private entry is reported as not found.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<DataBookEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) =>
        FromResponse(await service.GetByIdAsync(id, ct));

    /// <summary>Creates a public or owner-private entry.</summary>
    [HttpPost]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<DataBookEntryDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateDataBookEntryRequest request, CancellationToken ct) =>
        FromResponse(await service.CreateAsync(request, CorrelationId, ct), StatusCodes.Status201Created);

    /// <summary>Updates an entry. Public entries are shared; private entries remain owner-only.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<DataBookEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateDataBookEntryRequest request, CancellationToken ct) =>
        FromResponse(await service.UpdateAsync(id, request, CorrelationId, ct));

    /// <summary>Soft deletes an entry using optimistic concurrency.</summary>
    [HttpDelete("{id:long}")]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, [FromBody] DeleteDataBookEntryRequest request, CancellationToken ct) =>
        FromResponse(await service.DeleteAsync(id, request, CorrelationId, ct));

    /// <summary>Gets immutable business history. View permission is used because the global model has no History action.</summary>
    [HttpGet("{id:long}/history")]
    [RequirePermission(DataBookPermissions.Entries, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DataBookEntryHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> History(long id, CancellationToken ct) =>
        FromResponse(await service.GetHistoryAsync(id, ct));

    private string? CorrelationId => HttpContext.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value) ? value?.ToString() : null;
}
