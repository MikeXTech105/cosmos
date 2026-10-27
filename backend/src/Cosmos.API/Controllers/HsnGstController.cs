using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.HsnGst;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers;
[Authorize, ApiExplorerSettings(GroupName = "gst"), Route("api/v1/gst")]
public sealed class HsnGstController(IHsnGstService service) : ApiControllerBase
{
    [HttpGet("rate-versions"), RequirePermission("GST.RateHistory",PermissionAction.View)] public async Task<IActionResult> ListRates([FromQuery]GstRateRuleVersionListQuery q,CancellationToken ct)=>FromResponse(await service.GetRateVersionsAsync(q,ct));
    [HttpPost("rate-versions"), RequirePermission("GST.RateHistory",PermissionAction.Create)] public async Task<IActionResult> CreateRate(SaveGstRateRuleVersionRequest r,CancellationToken ct)=>FromResponse(await service.SaveRateVersionAsync(r,ct),201);
}
