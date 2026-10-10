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
[Route("api/v1/reports/parties")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class PartyReportsV1Controller(IReportsService service) : ApiControllerBase
{
    /// <summary>Gets paged party ledger rows.</summary>
    [HttpGet("ledger")]
    [RequirePermission("Reports.Parties", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PartyLedgerReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Ledger([FromQuery] PartyReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPartyLedgerAsync(query, ct));

    /// <summary>Gets a customer statement from party ledger rows.</summary>
    [HttpGet("customer-statement")]
    [RequirePermission("Reports.Parties", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CustomerStatement([FromQuery] PartyStatementReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetCustomerStatementAsync(query, ct));

    /// <summary>Gets a supplier statement from party ledger rows.</summary>
    [HttpGet("supplier-statement")]
    [RequirePermission("Reports.Parties", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SupplierStatement([FromQuery] PartyStatementReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetSupplierStatementAsync(query, ct));

    /// <summary>Gets receivable aging buckets.</summary>
    [HttpGet("receivable-aging")]
    [RequirePermission("Reports.Parties", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ReceivableAgingReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReceivableAging([FromQuery] AgingReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetReceivableAgingAsync(query, ct));

    /// <summary>Gets payable aging buckets.</summary>
    [HttpGet("payable-aging")]
    [RequirePermission("Reports.Parties", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<PayableAgingReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> PayableAging([FromQuery] AgingReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetPayableAgingAsync(query, ct));
}
