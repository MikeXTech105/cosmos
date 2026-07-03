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
//[Tags("GSTIN Verification")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst")]
public sealed class GstVerificationController : ApiControllerBase
{
    private readonly IGstVerificationService _service;

    public GstVerificationController(IGstVerificationService service) => _service = service;

    [HttpPost("verify-gstin")]
    [RequirePermission(GstPermissions.Verification, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<GstinVerificationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Verify(VerifyGstinRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.VerifyAsync(request, cancellationToken));
}
