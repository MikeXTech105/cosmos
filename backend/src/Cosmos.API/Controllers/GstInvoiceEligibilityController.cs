using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/invoices")]
public sealed class GstInvoiceEligibilityController(IGstComplianceEligibilityService service) : ApiControllerBase
{
    [HttpGet("{salesInvoiceId:long}/eligibility")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<GstComplianceSnapshotReadiness>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEligibility(long salesInvoiceId, CancellationToken cancellationToken) =>
        FromResponse(await service.AssessSalesInvoiceAsync(salesInvoiceId, cancellationToken));
}
