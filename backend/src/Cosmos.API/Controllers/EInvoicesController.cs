using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("GSTZen")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/e-invoices")]
public sealed class EInvoicesController : ApiControllerBase
{
    private readonly IEInvoiceService _service;

    public EInvoicesController(IEInvoiceService service) => _service = service;

    [HttpPost("generate")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.Create)]
    [SwaggerOperation(Summary = "Generate E-Invoice (safety blocked)", Description = "Returns GST_SERVER_GENERATION_NOT_AVAILABLE. Client payloads are deliberately not submitted to GSTZen until Cosmos creates a validated immutable invoice snapshot and durable idempotent request server-side.")]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Generate(GenerateEInvoiceRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GenerateAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPost("cancel")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.Delete)]
    [SwaggerOperation(Summary = "Cancel E-Invoice", Description = "Calls GSTZen E-Invoice Cancel. The invoice must already have a stored IRN. RequestJson can be supplied for GSTZen's exact cancel payload; otherwise Irn, CancelReasonCode, and CancelRemark are mapped to Irn, CnlRsn, and CnlRem.")]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(CancelEInvoiceRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.CancelAsync(request, cancellationToken));

    [HttpPost("get-details")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.View)]
    [SwaggerOperation(Summary = "Get E-Invoice Details from GSTZen", Description = "Calls GSTZen Get E-Invoice by IRN using SellerDtls.Gstin and Irn. SellerGstin defaults to the selected company GST registration when omitted.")]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDetails(GetEInvoiceDetailsRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetDetailsAsync(request, cancellationToken));

    [HttpGet("{irn}")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.View)]
    [SwaggerOperation(Summary = "Get stored E-Invoice by IRN", Description = "Returns the E-Invoice record stored in Cosmos. Use POST get-details to call GSTZen.")]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByIrn(string irn, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIrnAsync(irn, cancellationToken));
}
