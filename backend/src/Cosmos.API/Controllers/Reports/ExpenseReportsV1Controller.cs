using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Reports;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Reports;

[Authorize]
[ApiExplorerSettings(GroupName = "reports")]
[Route("api/v1/reports/expenses")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
public sealed class ExpenseReportsV1Controller(IReportsService service) : ApiControllerBase
{
    /// <summary>Gets expense summary totals for the selected date range.</summary>
    [HttpGet("summary")]
    [RequirePermission("Reports.Expenses", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ExpenseSummaryReportDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] ExpenseReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetExpenseSummaryAsync(query, ct));

    /// <summary>Gets expenses grouped by category.</summary>
    [HttpGet("by-category")]
    [RequirePermission("Reports.Expenses", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ExpenseByCategoryReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ByCategory([FromQuery] ExpenseReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetExpenseByCategoryAsync(query, ct));

    /// <summary>Gets expenses grouped by paid-to party.</summary>
    [HttpGet("by-party")]
    [RequirePermission("Reports.Expenses", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<ExpenseByPartyReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ByParty([FromQuery] ExpenseReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetExpenseByPartyAsync(query, ct));

    /// <summary>Gets monthly expense summary totals.</summary>
    [HttpGet("monthly-summary")]
    [RequirePermission("Reports.Expenses", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<MonthlyExpenseSummaryReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MonthlySummary([FromQuery] ExpenseReportQuery query, CancellationToken ct) =>
        FromResponse(await service.GetMonthlyExpenseSummaryAsync(query, ct));
}
