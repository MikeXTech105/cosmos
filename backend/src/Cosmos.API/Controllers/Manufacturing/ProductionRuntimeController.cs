using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

public sealed record ProductionRuntimeDto(string CompanyKey, DateOnly BusinessDate, string BusinessTimeZone,
    string BrowserTimeZone, DateOnly? ClosedThroughDate);

[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/manufacturing/runtime")]
public sealed class ProductionRuntimeController(IProductionCompanyScope scope, IConfiguration configuration) : ProductionWorkspaceApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<ProductionRuntimeDto>), 200)]
    public IActionResult Get()
    {
        var company = scope.CompanyKey; // Authenticated catalog validation, never a client company selector.
        var zone = scope.BusinessTimeZone;
        var browserZone = TimeZoneInfo.TryConvertWindowsIdToIanaId(zone, out var iana) ? iana : zone;
        var configured = configuration["Manufacturing:ClosedThroughDate"];
        DateOnly? closed = string.IsNullOrWhiteSpace(configured) ? null : DateOnly.ParseExact(configured, "yyyy-MM-dd");
        return Ok(ApiResponse<ProductionRuntimeDto>.Success(new(company, scope.CurrentBusinessDate, zone, browserZone!, closed)));
    }
}
