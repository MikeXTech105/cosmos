using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[ApiExplorerSettings(GroupName = "hr")]
[Route("api/hr/designations")]
public sealed class DesignationsController : ApiControllerBase
{
    private readonly IHrService _service;
    public DesignationsController(IHrService service) => _service = service;

    [HttpGet, RequirePermission(HrPermissions.Designation, PermissionAction.View)]
    public async Task<IActionResult> GetList([FromQuery] HrPagedQuery query, CancellationToken ct) => FromResponse(await _service.GetDesignationsAsync(query, ct));
    [HttpGet("{id:long}"), RequirePermission(HrPermissions.Designation, PermissionAction.View)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await _service.GetDesignationAsync(id, ct));
    [HttpPost, RequirePermission(HrPermissions.Designation, PermissionAction.Create)]
    public async Task<IActionResult> Create(CreateDesignationCommand command, CancellationToken ct) => FromResponse(await _service.CreateDesignationAsync(command, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}"), RequirePermission(HrPermissions.Designation, PermissionAction.Edit)]
    public async Task<IActionResult> Update(long id, UpdateDesignationCommand command, CancellationToken ct) => FromResponse(await _service.UpdateDesignationAsync(id, command, ct));
    [HttpDelete("{id:long}"), RequirePermission(HrPermissions.Designation, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await _service.DeleteDesignationAsync(id, ct));
}
