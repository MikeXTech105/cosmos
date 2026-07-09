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
[Route("api/v1/reports/purchase")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class PurchaseReportsV1Controller(IReportsService service) : ApiControllerBase
{
    /// <summary>Gets purchase summary totals for the selected date range.</summary>
    [HttpGet("summary")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PurchaseSummaryReportDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] ReportDateRangeQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPurchaseSummaryAsync(query, ct));

    /// <summary>Gets paged purchase bill register rows.</summary>
    [HttpGet("bills")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PurchaseBillRegisterReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Bills([FromQuery] PurchaseBillRegisterReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPurchaseBillRegisterAsync(query, ct));

    /// <summary>Gets purchases grouped by supplier.</summary>
    [HttpGet("by-supplier")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PurchaseBySupplierReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> BySupplier([FromQuery] PurchaseBySupplierReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPurchaseBySupplierAsync(query, ct));

    /// <summary>Gets purchases grouped by item.</summary>
    [HttpGet("by-item")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PurchaseByItemReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ByItem([FromQuery] PurchaseByItemReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPurchaseByItemAsync(query, ct));

    /// <summary>Gets paged supplier payment-out rows.</summary>
    [HttpGet("payments-out")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PaymentOutReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PaymentsOut([FromQuery] PaymentOutReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPaymentOutAsync(query, ct));

    /// <summary>Gets supplier payable balances.</summary>
    [HttpGet("payables")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<SupplierPayableReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Payables([FromQuery] SupplierPayablesReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSupplierPayablesAsync(query, ct));

    /// <summary>Gets purchase tax/GST summary grouped by GST rate and HSN/SAC.</summary>
    [HttpGet("tax-summary")]
    [RequirePermission("Reports.Purchase", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PurchaseTaxSummaryReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TaxSummary([FromQuery] ReportDateRangeQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPurchaseTaxSummaryAsync(query, ct));
}
