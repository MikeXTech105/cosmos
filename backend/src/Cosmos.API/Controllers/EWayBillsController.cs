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
//[Tags("GST E-Way Bills")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/eway-bills")]
public sealed class EWayBillsController : ApiControllerBase
{
    private readonly IEWayBillService _service;

    public EWayBillsController(IEWayBillService service) => _service = service;

    [HttpPost("generate")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Generate(GenerateEWayBillRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GenerateAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPost("cancel")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(CancelEWayBillRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.CancelAsync(request, cancellationToken));

    [HttpPost("update-vehicle")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateVehicle(UpdateEWayBillVehicleRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateVehicleAsync(request, cancellationToken));

    [HttpPost("extend")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Extend(ExtendEWayBillRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.ExtendAsync(request, cancellationToken));

    [HttpGet("{ewayBillNumber}")]
    [RequirePermission(GstPermissions.EWayBill, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<EWayBillResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByNumber(string ewayBillNumber, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByNumberAsync(ewayBillNumber, cancellationToken));
}
