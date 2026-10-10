using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Dashboard;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Dashboard;

[Authorize]
[ApiExplorerSettings(GroupName = "dashboard")]
[Route("api/v1/dashboard")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class DashboardController(IDashboardService service) : ApiControllerBase
{
    /// <summary>Gets the general ERP dashboard overview.</summary>
    [HttpGet("overview")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<DashboardOverviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Overview([FromQuery] DashboardOverviewRequest request, CancellationToken ct) =>
        FromResponse(await service.GetOverviewAsync(request, ct));

    /// <summary>Gets sales and purchase totals grouped by day, week, or month.</summary>
    [HttpGet("sales-purchase-trend")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DashboardTrendPointDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SalesPurchaseTrend([FromQuery] DashboardTrendRequest request, CancellationToken ct) =>
        FromResponse(await service.GetSalesPurchaseTrendAsync(request, ct));

    /// <summary>Gets sales revenue compared with recorded expenses.</summary>
    [HttpGet("revenue-expense-trend")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DashboardRevenueExpenseTrendPointDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RevenueExpenseTrend([FromQuery] DashboardTrendRequest request, CancellationToken ct) =>
        FromResponse(await service.GetRevenueExpenseTrendAsync(request, ct));

    /// <summary>Gets top-selling items from confirmed, non-cancelled sales.</summary>
    [HttpGet("top-selling-items")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DashboardTopSellingItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TopSellingItems([FromQuery] DashboardTopItemsRequest request, CancellationToken ct) =>
        FromResponse(await service.GetTopSellingItemsAsync(request, ct));

    /// <summary>Gets top customers or suppliers based on transactional activity.</summary>
    [HttpGet("top-parties")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DashboardTopPartyDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TopParties([FromQuery] DashboardTopPartiesRequest request, CancellationToken ct) =>
        FromResponse(await service.GetTopPartiesAsync(request, ct));

    /// <summary>Gets grouped dashboard alerts with limited preview rows.</summary>
    [HttpGet("alerts")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<DashboardAlertsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Alerts([FromQuery] DashboardAlertsRequest request, CancellationToken ct) =>
        FromResponse(await service.GetAlertsAsync(request, ct));

    /// <summary>Gets aggregate HR attendance and employee counts.</summary>
    [HttpGet("hr-summary")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<DashboardHrSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> HrSummary([FromQuery] DashboardHrSummaryRequest request, CancellationToken ct) =>
        FromResponse(await service.GetHrSummaryAsync(request, ct));

    /// <summary>Gets a compact feed of recent permanent business and security activity.</summary>
    [HttpGet("recent-activity")]
    [RequirePermission("Dashboard", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DashboardRecentActivityDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecentActivity([FromQuery] DashboardRecentActivityRequest request, CancellationToken ct) =>
        FromResponse(await service.GetRecentActivityAsync(request, ct));
}
