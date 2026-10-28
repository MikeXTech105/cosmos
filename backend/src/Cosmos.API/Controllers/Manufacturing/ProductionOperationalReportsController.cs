using System.Globalization;
using System.Text;
using System.Text.Json;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/manufacturing/reports")]
public sealed class ProductionOperationalReportsController(IProductionWorkspaceService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("operational/{kind}"), RequirePermission(ManufacturingPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProductionOperationalReportRow>>), 200)]
    public async Task<IActionResult> Read(string kind, [FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.OperationalReportAsync(kind, q, ct));

    [HttpGet("operational/{kind}/export"), RequirePermission(ManufacturingPermissions.Reports, PermissionAction.Export)]
    [Produces("application/x-ndjson", "text/csv"), ProducesResponseType(200)]
    public async Task Export(string kind, [FromQuery] ProductionWorkspaceQuery q, CancellationToken ct, [FromQuery] string format = "ndjson")
    {
        var csv = string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase);
        if (!csv && !string.Equals(format, "ndjson", StringComparison.OrdinalIgnoreCase))
            throw new Cosmos.Shared.Exceptions.CosmosException("Choose csv or ndjson export format.");
        // Fetch/validate the first page before starting the response, preserving normal error envelopes.
        var page = (await service.OperationalReportAsync(kind, q with { PageNumber = 1, PageSize = 200 }, ct)).Data!;
        Response.ContentType = csv ? "text/csv; charset=utf-8" : "application/x-ndjson";
        Response.Headers["X-Calculation-Version"]="business-ledger-events-v1";
        Response.Headers.ContentDisposition = $"attachment; filename=production-{kind}.{(csv ? "csv" : "ndjson")}";
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var basis = $"{kind}; as of {q.AsOfDate:yyyy-MM-dd}; from {q.FromDate:yyyy-MM-dd}; to {q.ToDate:yyyy-MM-dd}; Item {q.ItemId}; Channel {q.ChannelId}; search {q.Search}; full matching rows; concurrent changes possible";
        if (csv)
        {
            await Response.WriteAsync("\uFEFF" + string.Join(',', CsvColumns.Select(x => CsvEscape(x.Header))) + "\r\n", ct);
            if (page.Summary is not null)
            {
                var summary = JsonSerializer.SerializeToElement(page.Summary, options);
                var totals = Property(summary, "quantityTotals");
                if (totals.ValueKind == JsonValueKind.Array)
                    foreach (var total in totals.EnumerateArray()) await CsvRow(total, "Unit total", basis, ct);
            }
        }
        var number = 1;
        while (true)
        {
            foreach (var row in page.Items)
            {
                if (csv) await CsvRow(JsonSerializer.SerializeToElement(row, options), "Data", basis, ct);
                else { await JsonSerializer.SerializeAsync(Response.Body, row, options, ct); await Response.WriteAsync("\n", ct); }
            }
            if (number * page.PageSize >= page.TotalCount || page.Items.Count == 0) break;
            page = (await service.OperationalReportAsync(kind, q with { PageNumber = ++number, PageSize = 200 }, ct)).Data!;
        }
    }

    private static readonly (string Key, string Header)[] CsvColumns = [
        ("recordType", "Row type"), ("businessDate", "Business date"), ("itemCode", "Item code"), ("itemName", "Item name"),
        ("unitName", "Unit"), ("unitId", "Unit reference"), ("channelId", "Channel reference"), ("sourceType", "Source"), ("sourceId", "Source reference"),
        ("goodOutput", "Accepted output"), ("rejectedOutput", "Rejected output"), ("dispatchedQuantity", "Dispatched quantity"),
        ("returnedQuantity", "Returned quantity"), ("plannedQuantity", "Planned quantity"), ("signedQuantity", "Signed stock movement"),
        ("onHandQuantity", "Stock on hand"), ("reservedQuantity", "Reserved stock"), ("availableQuantity", "Available stock"),
        ("reconciliationDifference", "Reconciliation difference"), ("requiredMinutes", "Required minutes"), ("dueDate", "Due date"),
        ("onTime", "On time"), ("dataQualityFlag", "Quality / unavailable evidence"), ("calculationVersion", "Calculation basis"), ("filters", "Filter basis")
    ];

    private async Task CsvRow(JsonElement row, string type, string basis, CancellationToken ct)
    {
        await Response.WriteAsync(string.Join(',', CsvColumns.Select(column => CsvEscape(column.Key switch
        {
            "recordType" => type,
            "filters" => basis,
            _ => PropertyText(row, column.Key)
        }))) + "\r\n", ct);
    }

    private static JsonElement Property(JsonElement row, string key) => row.ValueKind == JsonValueKind.Object
        ? row.EnumerateObject().Where(x => string.Equals(x.Name, key, StringComparison.OrdinalIgnoreCase)).Select(x => x.Value).FirstOrDefault()
        : default;
    private static string PropertyText(JsonElement row, string key)
    {
        var value = Property(row, key);
        return value.ValueKind switch { JsonValueKind.Undefined or JsonValueKind.Null => "", JsonValueKind.String => value.GetString() ?? "", _ => value.GetRawText() };
    }
    private static string CsvEscape(string value)
    {
        var trimmed = value.TrimStart();
        if (trimmed.Length > 0 && "=+-@".Contains(trimmed[0]) && !decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out _)) value = "'" + value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
