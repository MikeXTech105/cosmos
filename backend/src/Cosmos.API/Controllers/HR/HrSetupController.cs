using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize, ApiExplorerSettings(GroupName = "hr"), Route("api/hr/setup")]
public sealed class HrSetupController(IHrService service) : ApiControllerBase
{
    [HttpGet("payroll-rates"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> PayrollRates([FromQuery] ProcessPayrollCommand query, CancellationToken ct) => FromResponse(await service.GetPayrollRateOptionsAsync(query, ct));
    [HttpGet("payroll-runs"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> PayrollRuns([FromQuery] GetPayrollRunsQuery query, CancellationToken ct) => FromResponse(await service.GetPayrollRunsAsync(query, ct));
    [HttpGet("attendance-adjustments"), RequirePermission(HrPermissions.Attendance, PermissionAction.Approve)]
    public async Task<IActionResult> PendingAdjustments(CancellationToken ct) => FromResponse(await service.GetPendingAdjustmentsAsync(ct));
    [HttpGet("leave-entitlements/{employeeId:long}"), RequirePermission(HrPermissions.Leave, PermissionAction.View)]
    public async Task<IActionResult> Entitlements(long employeeId, CancellationToken ct) => FromResponse(await service.GetLeaveEntitlementsAsync(employeeId, ct));
    [HttpPut("leave-entitlements"), RequirePermission(HrPermissions.Leave, PermissionAction.Edit)]
    public async Task<IActionResult> SetEntitlement(SaveEmployeeLeaveEntitlementCommand command, CancellationToken ct) => FromResponse(await service.SaveLeaveEntitlementAsync(command, ct));
    [HttpGet("leave-types"), RequirePermission(HrPermissions.Leave, PermissionAction.View)]
    public async Task<IActionResult> LeaveTypes(CancellationToken ct) => FromResponse(await service.GetLeaveTypesAsync(ct));
    [HttpPost("leave-types"), RequirePermission(HrPermissions.Leave, PermissionAction.Create)]
    public async Task<IActionResult> CreateLeaveType(SaveLeaveTypeCommand command, CancellationToken ct) => FromResponse(await service.SaveLeaveTypeAsync(null, command, ct), 201);
    [HttpPut("leave-types/{id:long}"), RequirePermission(HrPermissions.Leave, PermissionAction.Edit)]
    public async Task<IActionResult> UpdateLeaveType(long id, SaveLeaveTypeCommand command, CancellationToken ct) => FromResponse(await service.SaveLeaveTypeAsync(id, command, ct));
    [HttpGet("salary-components"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> Components(CancellationToken ct) => FromResponse(await service.GetSalaryComponentsAsync(ct));
    [HttpPost("salary-components"), RequirePermission(HrPermissions.Payroll, PermissionAction.Create)]
    public async Task<IActionResult> CreateComponent(SaveSalaryComponentCommand command, CancellationToken ct) => FromResponse(await service.SaveSalaryComponentAsync(null, command, ct), 201);
    [HttpPut("salary-components/{id:long}"), RequirePermission(HrPermissions.Payroll, PermissionAction.Edit)]
    public async Task<IActionResult> UpdateComponent(long id, SaveSalaryComponentCommand command, CancellationToken ct) => FromResponse(await service.SaveSalaryComponentAsync(id, command, ct));
    [HttpGet("salary-structures"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> Structures(CancellationToken ct) => FromResponse(await service.GetSalaryStructuresAsync(ct));
    [HttpPost("salary-structures"), RequirePermission(HrPermissions.Payroll, PermissionAction.Create)]
    public async Task<IActionResult> CreateStructure(SaveSalaryStructureCommand command, CancellationToken ct) => FromResponse(await service.SaveSalaryStructureAsync(null, command, ct), 201);
    [HttpPut("salary-structures/{id:long}"), RequirePermission(HrPermissions.Payroll, PermissionAction.Edit)]
    public async Task<IActionResult> UpdateStructure(long id, SaveSalaryStructureCommand command, CancellationToken ct) => FromResponse(await service.SaveSalaryStructureAsync(id, command, ct));
    [HttpGet("salary-assignments"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> Assignments([FromQuery] long? employeeId, CancellationToken ct) => FromResponse(await service.GetSalaryAssignmentsAsync(employeeId, ct));
    [HttpPost("salary-assignments"), RequirePermission(HrPermissions.Payroll, PermissionAction.Create)]
    public async Task<IActionResult> Assign(AssignSalaryStructureCommand command, CancellationToken ct) => FromResponse(await service.AssignSalaryStructureAsync(command, ct), 201);
    [HttpGet("payroll-preflight"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> Preflight([FromQuery] ProcessPayrollCommand query, CancellationToken ct) => FromResponse(await service.GetPayrollPreflightAsync(query, ct));
}
