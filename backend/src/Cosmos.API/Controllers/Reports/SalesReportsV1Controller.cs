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
[Route("api/v1/reports/sales")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class SalesReportsV1Controller(IReportsService service) : ApiControllerBase
{
    /// <summary>Gets sales summary totals for the selected date range.</summary>
    [HttpGet("summary")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<SalesSummaryReportDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] ReportDateRangeQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSalesSummaryAsync(query, ct));

    /// <summary>Gets paged sales invoice register rows.</summary>
    [HttpGet("invoices")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SalesInvoiceRegisterReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Invoices([FromQuery] SalesInvoiceRegisterReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSalesInvoiceRegisterAsync(query, ct));

    /// <summary>Gets sales grouped by party/customer.</summary>
    [HttpGet("by-party")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<SalesByPartyReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ByParty([FromQuery] SalesByPartyReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSalesByPartyAsync(query, ct));

    /// <summary>Gets sales grouped by item.</summary>
    [HttpGet("by-item")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<SalesByItemReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ByItem([FromQuery] SalesByItemReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSalesByItemAsync(query, ct));

    /// <summary>Gets paged customer payment-in rows.</summary>
    [HttpGet("payments-in")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PaymentInReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PaymentsIn([FromQuery] PaymentInReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPaymentInAsync(query, ct));

    /// <summary>Gets customer receivable balances.</summary>
    [HttpGet("receivables")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Receivables([FromQuery] CustomerReceivablesReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetCustomerReceivablesAsync(query, ct));

    /// <summary>Gets sales tax/GST summary grouped by GST rate and HSN/SAC.</summary>
    [HttpGet("tax-summary")]
    [RequirePermission("Reports.Sales", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<SalesTaxSummaryReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TaxSummary([FromQuery] ReportDateRangeQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSalesTaxSummaryAsync(query, ct));
}
