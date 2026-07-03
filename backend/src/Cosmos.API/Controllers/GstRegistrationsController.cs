using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("GST Registrations")]
[ApiExplorerSettings(GroupName = "gst")]
[Route("api/v1/gst/registrations")]
public sealed class GstRegistrationsController : ApiControllerBase
{
    private readonly IGstRegistrationService _service;

    public GstRegistrationsController(IGstRegistrationService service) => _service = service;

    [HttpGet]
    [RequirePermission(GstPermissions.Registration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<CompanyGstRegistrationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] CompanyGstRegistrationListRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(request, cancellationToken));

    [HttpPost]
    [RequirePermission(GstPermissions.Registration, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<CompanyGstRegistrationResponse>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateCompanyGstRegistrationRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.CreateAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpGet("{id:long}")]
    [RequirePermission(GstPermissions.Registration, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<CompanyGstRegistrationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(id, cancellationToken));

    [HttpPut("{id:long}")]
    [RequirePermission(GstPermissions.Registration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<CompanyGstRegistrationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateCompanyGstRegistrationRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:long}")]
    [RequirePermission(GstPermissions.Registration, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.DeleteAsync(id, cancellationToken));

    [HttpPost("{id:long}/verify")]
    [RequirePermission(GstPermissions.Registration, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<CompanyGstRegistrationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Verify(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.VerifyAsync(id, cancellationToken));

    [HttpPost("{id:long}/set-default")]
    [RequirePermission(GstPermissions.Registration, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<CompanyGstRegistrationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetDefault(long id, SetDefaultCompanyGstRegistrationRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.SetDefaultAsync(id, request, cancellationToken));
}
