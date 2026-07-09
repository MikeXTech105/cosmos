using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Reports;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Reports;

[Authorize]
[ApiExplorerSettings(GroupName = "reports")]
[Route("api/v1/reports/inventory")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class InventoryReportsV1Controller(IReportsService service) : ApiControllerBase
{
    /// <summary>Gets stock summary by item.</summary>
    [HttpGet("stock-summary")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<StockSummaryReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockSummary([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockSummaryAsync(query, ct));

    /// <summary>Gets paged stock ledger rows from stock movements.</summary>
    [HttpGet("stock-ledger")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<StockLedgerReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockLedger([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockLedgerAsync(query, ct));

    /// <summary>Gets paged item movement totals grouped by item and movement type.</summary>
    [HttpGet("item-movement")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ItemMovementReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ItemMovement([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetItemMovementAsync(query, ct));

    /// <summary>Gets items whose current stock is less than or equal to minimum stock.</summary>
    [HttpGet("low-stock")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<LowStockReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> LowStock([FromQuery] LowStockReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetLowStockAsync(query, ct));

    /// <summary>Gets stock valuation using current stock and purchase price.</summary>
    [HttpGet("stock-valuation")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<StockValuationReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockValuation([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockValuationAsync(query, ct));
}
