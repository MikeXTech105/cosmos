using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[ApiExplorerSettings(GroupName = "hr")]
[Route("api/hr/employees")]
public sealed class EmployeesController : ApiControllerBase
{
    private readonly IHrService _service;
    public EmployeesController(IHrService service) => _service = service;

    [HttpGet, RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> GetList([FromQuery] GetEmployeesQuery query, CancellationToken ct) => FromResponse(await _service.GetEmployeesAsync(query, ct));
    [HttpGet("dropdown"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> Dropdown([FromQuery] string? search, CancellationToken ct) => FromResponse(await _service.GetEmployeeDropdownAsync(search, ct));
    [HttpGet("reporting-managers"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> ReportingManagers([FromQuery] long? departmentId, [FromQuery] long? excludingEmployeeId, CancellationToken ct) => FromResponse(await _service.GetReportingManagersAsync(departmentId, excludingEmployeeId, ct));
    [HttpGet("{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await _service.GetEmployeeAsync(id, ct));
    [HttpPost, RequirePermission(HrPermissions.Employee, PermissionAction.Create)]
    public async Task<IActionResult> Create(CreateEmployeeCommand command, CancellationToken ct) => FromResponse(await _service.CreateEmployeeAsync(command, ct), StatusCodes.Status201Created);
    [HttpPut("{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    public async Task<IActionResult> Update(long id, UpdateEmployeeCommand command, CancellationToken ct) => FromResponse(await _service.UpdateEmployeeAsync(id, command, ct));
    [HttpDelete("{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await _service.DeleteEmployeeAsync(id, ct));

    [HttpGet("{id:long}/documents"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> Documents(long id, CancellationToken ct) => FromResponse(await _service.GetEmployeeDocumentsAsync(id, ct));
    [HttpPost("{id:long}/documents"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    public async Task<IActionResult> AddDocument(long id, AddEmployeeDocumentCommand command, CancellationToken ct) => FromResponse(await _service.AddEmployeeDocumentAsync(id, command, ct), StatusCodes.Status201Created);
    [HttpDelete("documents/{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    public async Task<IActionResult> DeleteDocument(long id, CancellationToken ct) => FromResponse(await _service.DeleteEmployeeDocumentAsync(id, ct));
    [HttpGet("{id:long}/bank-details"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> BankDetails(long id, CancellationToken ct) => FromResponse(await _service.GetEmployeeBankDetailsAsync(id, ct));
    [HttpPost("{id:long}/bank-details"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    public async Task<IActionResult> AddBankDetails(long id, AddEmployeeBankDetailsCommand command, CancellationToken ct) => FromResponse(await _service.AddEmployeeBankDetailsAsync(id, command, ct), StatusCodes.Status201Created);
}
