using System.Text.Json;
using Cosmos.API.Exports;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Reports;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Reports;

[Authorize]
[ApiExplorerSettings(GroupName = "reports")]
[Route("api/v1/reports/export")]
public sealed class ReportExportsV1Controller(IReportsService reports, IPermissionService permissions, ICurrentUser currentUser) : ApiControllerBase
{
    [HttpPost]
    [Produces("text/csv")]
    public async Task<IActionResult> Export(ReportExportRequest request, CancellationToken cancellationToken)
    {
        var report = request.ReportId?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(request.Format) && !string.Equals(request.Format, "csv", StringComparison.OrdinalIgnoreCase))
        {
            throw new CosmosException("Only CSV export format is supported.", StatusCodes.Status400BadRequest,
                new[] { "Format must be csv." },
                new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
                {
                    ["Format"] = new[] { "Format must be csv." }
                });
        }
        var pageName = report switch
        {
            "sales-invoices" or "sales-by-party" or "sales-by-item" or "sales-tax-summary" or "customer-receivables" => "Reports.Sales",
            "purchase-by-supplier" or "purchase-by-item" or "purchase-tax-summary" or "supplier-payables" => "Reports.Purchase",
            "expense-by-category" or "expense-by-party" or "monthly-expenses" => "Reports.Expense",
            "party-ledger" => "Reports.Party",
            _ => throw new CosmosException("ReportId is not supported for export.", StatusCodes.Status400BadRequest,
                new[] { "Supported reports: sales-invoices, sales-by-party, sales-by-item, sales-tax-summary, customer-receivables, purchase-by-supplier, purchase-by-item, purchase-tax-summary, supplier-payables, expense-by-category, expense-by-party, monthly-expenses, party-ledger." },
                new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
                {
                    ["ReportId"] = new[] { "The report id is not supported." }
                })
        };

        if (currentUser.UserId is not int userId || !await permissions.UserHasPermissionAsync(userId, pageName, PermissionAction.Export, cancellationToken))
        {
            throw new ForbiddenCosmosException();
        }

        return report switch
        {
            "sales-invoices" => await ExportAllPagedRows(
                page =>
                {
                    var query = ReadFilters<SalesInvoiceRegisterReportQuery>(request);
                    query.PageNumber = page;
                    query.PageSize = 200;
                    return reports.GetSalesInvoiceRegisterAsync(query, cancellationToken);
                },
                report,
                cancellationToken),
            "sales-by-party" => await ExportRows(reports.GetSalesByPartyAsync(ReadFilters<SalesByPartyReportQuery>(request), cancellationToken), report, cancellationToken),
            "sales-by-item" => await ExportRows(reports.GetSalesByItemAsync(ReadFilters<SalesByItemReportQuery>(request), cancellationToken), report, cancellationToken),
            "sales-tax-summary" => await ExportRows(reports.GetSalesTaxSummaryAsync(ReadFilters<ReportDateRangeQuery>(request), cancellationToken), report, cancellationToken),
            "customer-receivables" => await ExportRows(reports.GetCustomerReceivablesAsync(ReadFilters<CustomerReceivablesReportQuery>(request), cancellationToken), report, cancellationToken),
            "purchase-by-supplier" => await ExportRows(reports.GetPurchaseBySupplierAsync(ReadFilters<PurchaseBySupplierReportQuery>(request), cancellationToken), report, cancellationToken),
            "purchase-by-item" => await ExportRows(reports.GetPurchaseByItemAsync(ReadFilters<PurchaseByItemReportQuery>(request), cancellationToken), report, cancellationToken),
            "purchase-tax-summary" => await ExportRows(reports.GetPurchaseTaxSummaryAsync(ReadFilters<ReportDateRangeQuery>(request), cancellationToken), report, cancellationToken),
            "supplier-payables" => await ExportRows(reports.GetSupplierPayablesAsync(ReadFilters<SupplierPayablesReportQuery>(request), cancellationToken), report, cancellationToken),
            "expense-by-category" => await ExportRows(reports.GetExpenseByCategoryAsync(ReadFilters<ExpenseReportQuery>(request), cancellationToken), report, cancellationToken),
            "expense-by-party" => await ExportRows(reports.GetExpenseByPartyAsync(ReadFilters<ExpenseReportQuery>(request), cancellationToken), report, cancellationToken),
            "monthly-expenses" => await ExportRows(reports.GetMonthlyExpenseSummaryAsync(ReadFilters<ExpenseReportQuery>(request), cancellationToken), report, cancellationToken),
            "party-ledger" => await ExportAllPagedRows(
                page =>
                {
                    var query = ReadFilters<PartyReportQuery>(request);
                    query.PageNumber = page;
                    query.PageSize = 200;
                    return reports.GetPartyLedgerAsync(query, cancellationToken);
                },
                report,
                cancellationToken),
            _ => throw new InvalidOperationException("Unsupported report.")
        };
    }

    private static T ReadFilters<T>(ReportExportRequest request) where T : new() =>
        request.Filters is { } filters && filters.ValueKind is not JsonValueKind.Null and not JsonValueKind.Undefined
            ? JsonSerializer.Deserialize<T>(filters.GetRawText(), new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new T()
            : new T();

    private static async Task<IActionResult> ExportRows<T>(Task<Cosmos.Shared.Responses.ApiResponse<IReadOnlyCollection<T>>> task, string report, CancellationToken cancellationToken)
    {
        var result = await task;
        cancellationToken.ThrowIfCancellationRequested();
        return CsvExport.Create(result.Data ?? Array.Empty<T>(), $"{report}-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    private static async Task<IActionResult> ExportAllPagedRows<T>(
        Func<int, Task<Cosmos.Shared.Responses.ApiResponse<Cosmos.Contracts.Common.PagedResult<T>>>> getPage,
        string report,
        CancellationToken cancellationToken)
    {
        var rows = new List<T>();
        for (var page = 1; ; page++)
        {
            var result = await getPage(page);
            var data = result.Data ?? throw new CosmosException("The report export did not return data.", 500);
            rows.AddRange(data.Items);
            if (page >= data.TotalPages)
            {
                break;
            }

            cancellationToken.ThrowIfCancellationRequested();
        }

        return CsvExport.Create(rows, $"{report}-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }
}

public sealed record ReportExportRequest(string ReportId, string? Format = "csv", JsonElement? Filters = null);
