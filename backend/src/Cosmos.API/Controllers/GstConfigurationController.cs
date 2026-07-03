using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Gst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("GST Configuration")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/configuration")]
public sealed class GstConfigurationController : ApiControllerBase
{
    private readonly IGstZenProviderService _providerService;

    public GstConfigurationController(IGstZenProviderService providerService) => _providerService = providerService;

    [HttpGet("status")]
    [RequirePermission(GstPermissions.Configuration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<GstConfigurationStatusResponse>), StatusCodes.Status200OK)]
    public IActionResult GetStatus() =>
        FromResponse(ApiResponse<GstConfigurationStatusResponse>.Success(_providerService.GetConfigurationStatus()));
}
