using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("GST E-Invoices")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/e-invoices")]
public sealed class EInvoicesController : ApiControllerBase
{
    private readonly IEInvoiceService _service;

    public EInvoicesController(IEInvoiceService service) => _service = service;

    [HttpPost("generate")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Generate(GenerateEInvoiceRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GenerateAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPost("cancel")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(CancelEInvoiceRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.CancelAsync(request, cancellationToken));

    [HttpGet("{irn}")]
    [RequirePermission(GstPermissions.EInvoice, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<EInvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByIrn(string irn, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIrnAsync(irn, cancellationToken));
}
