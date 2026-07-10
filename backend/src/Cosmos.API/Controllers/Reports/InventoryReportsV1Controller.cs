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
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<StockSummaryTotalsDto, StockSummaryReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockSummary([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockSummaryAsync(query, ct));

    /// <summary>Gets paged stock ledger rows from stock movements.</summary>
    [HttpGet("stock-ledger")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<StockLedgerTotalsDto, StockLedgerReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockLedger([FromQuery] StockLedgerReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockLedgerAsync(query, ct));

    /// <summary>Gets an item-specific stock ledger with item balances and totals.</summary>
    [HttpGet("items/{itemId:long}/ledger")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<InventoryReportResult<ItemLedgerSummaryDto, StockLedgerReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ItemLedger(long itemId, [FromQuery] StockLedgerReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetItemLedgerAsync(itemId, query, ct));

    /// <summary>Gets paged item movement totals grouped by item and movement type.</summary>
    [HttpGet("item-movement")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ItemMovementReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ItemMovement([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetItemMovementAsync(query, ct));

    /// <summary>Gets items whose current stock is less than or equal to minimum stock.</summary>
    [HttpGet("low-stock")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<StockExceptionSummaryDto, LowStockReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> LowStock([FromQuery] LowStockReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetLowStockAsync(query, ct));

    /// <summary>Gets items with negative current stock.</summary>
    [HttpGet("negative-stock")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<StockExceptionSummaryDto, NegativeStockReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> NegativeStock([FromQuery] NegativeStockReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetNegativeStockAsync(query, ct));

    /// <summary>Gets raw stock movement rows and movement totals.</summary>
    [HttpGet("stock-movements")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<StockMovementSummaryDto, StockMovementReportRowDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockMovements([FromQuery] StockMovementReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockMovementsAsync(query, ct));

    /// <summary>Gets stock valuation using current stock and purchase price.</summary>
    [HttpGet("stock-valuation")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<StockValuationSummaryDto, StockValuationReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> StockValuation([FromQuery] InventoryReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetStockValuationAsync(query, ct));

    /// <summary>Gets positive-stock items with no sales movement in the selected inactivity period.</summary>
    [HttpGet("dead-stock")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<DeadStockSummaryDto, DeadStockReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeadStock([FromQuery] StockAgeingReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetDeadStockAsync(query, ct));

    /// <summary>Gets fastest-moving items ranked by sold quantity and sales value.</summary>
    [HttpGet("fast-moving-items")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<MovingItemsSummaryDto, FastMovingItemReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> FastMovingItems([FromQuery] MovingItemsReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetFastMovingItemsAsync(query, ct));

    /// <summary>Gets slow-moving items with positive stock and low or zero sales in the selected period.</summary>
    [HttpGet("slow-moving-items")]
    [RequirePermission("Reports.Inventory", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedInventoryReportResult<MovingItemsSummaryDto, SlowMovingItemReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SlowMovingItems([FromQuery] MovingItemsReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSlowMovingItemsAsync(query, ct));
}
