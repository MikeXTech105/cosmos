using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Sales;
using Cosmos.Contracts.Sales;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Tags("Reports")]
[ApiExplorerSettings(GroupName = "reports")]
[Route("api/v1/sales/reports")]
public sealed class SalesReportsController : ApiControllerBase
{
    private readonly ISalesService _service;

    public SalesReportsController(ISalesService service) => _service = service;

    /// <summary>Gets sales totals for a date range.</summary>
    [HttpGet("summary")]
    [RequirePermission("Sales.Report", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<SalesSummaryReportDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] GetSalesSummaryReportQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetSummaryReportAsync(query, cancellationToken));

    /// <summary>Gets customer receivable balances.</summary>
    [HttpGet("customer-receivables")]
    [RequirePermission("Sales.Report", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CustomerReceivables([FromQuery] GetCustomerReceivablesQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetCustomerReceivablesAsync(query, cancellationToken));

    /// <summary>Gets item-wise sales totals.</summary>
    [HttpGet("item-wise-sales")]
    [RequirePermission("Sales.Report", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ItemWiseSalesReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ItemWiseSales([FromQuery] GetItemWiseSalesReportQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetItemWiseSalesAsync(query, cancellationToken));
}
