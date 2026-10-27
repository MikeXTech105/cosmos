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
    [Produces("application/x-ndjson"), ProducesResponseType(200)]
    public async Task Export(string kind, [FromQuery] ProductionWorkspaceQuery q, CancellationToken ct)
    {
        // Fetch/validate the first page before starting the response, preserving normal error envelopes.
        var page = (await service.OperationalReportAsync(kind, q with { PageNumber = 1, PageSize = 200 }, ct)).Data!;
        Response.ContentType = "application/x-ndjson";
        Response.Headers["X-Calculation-Version"]="business-ledger-events-v1";
        Response.Headers.ContentDisposition = $"attachment; filename=production-{kind}.ndjson";
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var number = 1;
        while (true)
        {
            foreach (var row in page.Items)
            {
                await JsonSerializer.SerializeAsync(Response.Body, row, options, ct);
                await Response.WriteAsync("\n", ct);
            }
            if (number * page.PageSize >= page.TotalCount || page.Items.Count == 0) break;
            page = (await service.OperationalReportAsync(kind, q with { PageNumber = ++number, PageSize = 200 }, ct)).Data!;
        }
    }
}
