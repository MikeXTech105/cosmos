using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[ApiExplorerSettings(GroupName = "hr")]
[Route("api/hr/shifts")]
public sealed class ShiftsController : ApiControllerBase
{
    private readonly IHrService _service;
    public ShiftsController(IHrService service) => _service = service;

    [HttpGet, RequirePermission(HrPermissions.Shift, PermissionAction.View)]
    public async Task<IActionResult> GetList([FromQuery] HrPagedQuery query, CancellationToken ct) => FromResponse(await _service.GetShiftsAsync(query, ct));
    [HttpGet("{id:long}"), RequirePermission(HrPermissions.Shift, PermissionAction.View)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await _service.GetShiftAsync(id, ct));
    [HttpPost, RequirePermission(HrPermissions.Shift, PermissionAction.Create)]
    public async Task<IActionResult> Create(CreateShiftCommand command, CancellationToken ct) => FromResponse(await _service.CreateShiftAsync(command, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}"), RequirePermission(HrPermissions.Shift, PermissionAction.Edit)]
    public async Task<IActionResult> Update(long id, UpdateShiftCommand command, CancellationToken ct) => FromResponse(await _service.UpdateShiftAsync(id, command, ct));
    [HttpDelete("{id:long}"), RequirePermission(HrPermissions.Shift, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await _service.DeleteShiftAsync(id, ct));
}
