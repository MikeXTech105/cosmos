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
    /// <summary>Assesses a sales invoice for future GST compliance snapshot readiness.</summary>
    /// <remarks>This endpoint is read-only. It requires both Sales Invoice and E-Invoice view permission and never calls a provider, recalculates tax, or changes the invoice.</remarks>
    [HttpGet("{salesInvoiceId:long:min(1)}/eligibility")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.View)]
    [RequirePermission("Sales.Invoice", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<GstComplianceSnapshotReadiness>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEligibility(long salesInvoiceId, CancellationToken cancellationToken) =>
        FromResponse(await service.AssessSalesInvoiceAsync(salesInvoiceId, cancellationToken));
}
