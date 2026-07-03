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
//[Tags("GST Sessions")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/sessions")]
public sealed class GstSessionsController : ApiControllerBase
{
    private readonly IGstSessionService _service;

    public GstSessionsController(IGstSessionService service) => _service = service;

    [HttpPost("generate-otp")]
    [RequirePermission(GstPermissions.Session, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<GstSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateOtp(GenerateGstOtpRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GenerateOtpAsync(request, cancellationToken));

    [HttpPost("authenticate-otp")]
    [RequirePermission(GstPermissions.Session, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<GstSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AuthenticateOtp(AuthenticateGstOtpRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.AuthenticateOtpAsync(request, cancellationToken));

    [HttpGet("{companyGstRegistrationId:long}/status")]
    [RequirePermission(GstPermissions.Session, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<GstSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(long companyGstRegistrationId, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetStatusAsync(companyGstRegistrationId, cancellationToken));
}
