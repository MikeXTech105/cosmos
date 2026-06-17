using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[ApiExplorerSettings(GroupName = "hr")]
[Route("api/hr/departments")]
public sealed class DepartmentsController : ApiControllerBase
{
    private readonly IHrService _service;
    public DepartmentsController(IHrService service) => _service = service;

    [HttpGet, RequirePermission(HrPermissions.Department, PermissionAction.View)]
    public async Task<IActionResult> GetList([FromQuery] HrPagedQuery query, CancellationToken ct) => FromResponse(await _service.GetDepartmentsAsync(query, ct));

    [HttpGet("{id:long}"), RequirePermission(HrPermissions.Department, PermissionAction.View)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await _service.GetDepartmentAsync(id, ct));

    [HttpPost, RequirePermission(HrPermissions.Department, PermissionAction.Create)]
    public async Task<IActionResult> Create(CreateDepartmentCommand command, CancellationToken ct) => FromResponse(await _service.CreateDepartmentAsync(command, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}"), RequirePermission(HrPermissions.Department, PermissionAction.Edit)]
    public async Task<IActionResult> Update(long id, UpdateDepartmentCommand command, CancellationToken ct) => FromResponse(await _service.UpdateDepartmentAsync(id, command, ct));

    [HttpDelete("{id:long}"), RequirePermission(HrPermissions.Department, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await _service.DeleteDepartmentAsync(id, ct));
}
