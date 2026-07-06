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
[Tags("GSTZen")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/eway-bills")]
public sealed class EWayBillsController : ApiControllerBase
{
    private readonly IEWayBillService _service;

    public EWayBillsController(IEWayBillService service) => _service = service;

    [HttpPost("generate")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Create)]
    [SwaggerOperation(Summary = "Generate E-Way Bill", Description = "Calls GSTZen E-Way Bill Generate. Provide RequestJson in GSTZen's documented payload shape with supply/document/from/to/transporter/item fields.")]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Generate(GenerateEWayBillRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GenerateAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPost("cancel")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Delete)]
    [SwaggerOperation(Summary = "Cancel E-Way Bill", Description = "Calls GSTZen E-Way Bill Cancel. The e-way bill must already be stored in Cosmos. Wrapper fields are mapped to ewbNo, cancelRsnCode, and cancelRmrk unless RequestJson is supplied.")]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(CancelEWayBillRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.CancelAsync(request, cancellationToken));

    [HttpPost("update-vehicle")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Edit)]
    [SwaggerOperation(Summary = "Update E-Way Bill Vehicle", Description = "Calls GSTZen Update Part B. Provide RequestJson with ewbNo, FromPlace, FromState, ReasonCode, ReasonRem, TransMode, and VehicleNo.")]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateVehicle(UpdateEWayBillVehicleRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateVehicleAsync(request, cancellationToken));

    [HttpPost("extend")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Edit)]
    [SwaggerOperation(Summary = "Extend E-Way Bill", Description = "Calls the configured GSTZen E-Way Bill Extend endpoint.")]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Extend(ExtendEWayBillRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.ExtendAsync(request, cancellationToken));

    [HttpPost("get-details")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.View)]
    [SwaggerOperation(Summary = "Get E-Way Bill Details from GSTZen", Description = "Calls GSTZen Get E-Way Bill using ewbNo.")]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDetails(GetEWayBillDetailsRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetDetailsAsync(request, cancellationToken));

    [HttpGet("{ewayBillNumber}")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.View)]
    [SwaggerOperation(Summary = "Get stored E-Way Bill by number", Description = "Returns the E-Way Bill record stored in Cosmos. Use POST get-details to call GSTZen.")]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByNumber(string ewayBillNumber, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByNumberAsync(ewayBillNumber, cancellationToken));
}
