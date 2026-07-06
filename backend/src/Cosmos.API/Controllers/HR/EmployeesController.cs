using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.HR;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[ApiExplorerSettings(GroupName = "hr")]
[Route("api/hr/employees")]
public sealed class EmployeesController : ApiControllerBase
{
    private readonly IHrService _service;
    public EmployeesController(IHrService service) => _service = service;

    [HttpGet, RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    [SwaggerOperation(Summary = "Get employees", Description = "Returns non-deleted employees by default, including resigned employees with statusName. Supports status=active, status=inactive, status=resigned, status=terminated, numeric status values, and includeResigned=false.")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<EmployeeListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetEmployeesQuery query, CancellationToken ct) => FromResponse(await _service.GetEmployeesAsync(query, ct));

    [HttpGet("dropdown"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    [SwaggerOperation(Summary = "Get employee dropdown", Description = "Returns active, non-deleted employees by default. Set includeResigned=true only for workflows that explicitly need resigned employees.")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Dropdown([FromQuery] string? search, [FromQuery] bool includeResigned = false, CancellationToken ct = default) => FromResponse(await _service.GetEmployeeDropdownAsync(search, includeResigned, ct));

    [HttpGet("reporting-managers"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    public async Task<IActionResult> ReportingManagers([FromQuery] long? departmentId, [FromQuery] long? excludingEmployeeId, CancellationToken ct) => FromResponse(await _service.GetReportingManagersAsync(departmentId, excludingEmployeeId, ct));

    [HttpGet("{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await _service.GetEmployeeAsync(id, ct));

    [HttpPost, RequirePermission(HrPermissions.Employee, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateEmployeeCommand command, CancellationToken ct) => FromResponse(await _service.CreateEmployeeAsync(command, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateEmployeeCommand command, CancellationToken ct) => FromResponse(await _service.UpdateEmployeeAsync(id, command, ct));

    [HttpPut("{id:long}/resign"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    [SwaggerOperation(Summary = "Resign employee", Description = "Marks an existing non-deleted employee as resigned without soft deleting the row. Example request: { \"lastWorkingDate\": \"2026-07-03\", \"resignationReason\": \"Personal reasons\" }.")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Resign(long id, ResignEmployeeCommand command, CancellationToken ct) => FromResponse(await _service.ResignEmployeeAsync(id, command, ct));

    [HttpPut("{id:long}/rejoin"), RequirePermission(HrPermissions.Employee, PermissionAction.Edit)]
    [SwaggerOperation(Summary = "Rejoin employee", Description = "Reactivates the same resigned employee record and keeps the existing employee code. Example request: { \"rejoinedDate\": \"2026-07-03\", \"remarks\": \"Returned to production team\" }.")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Rejoin(long id, RejoinEmployeeCommand command, CancellationToken ct) => FromResponse(await _service.RejoinEmployeeAsync(id, command, ct));

    [HttpDelete("{id:long}"), RequirePermission(HrPermissions.Employee, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
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
