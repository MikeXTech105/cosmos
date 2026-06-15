using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[Route("api/hr/payroll")]
public sealed class PayrollController : ApiControllerBase
{
    private readonly IHrService _service;
    public PayrollController(IHrService service) => _service = service;

    [HttpPost("process"), RequirePermission(HrPermissions.Payroll, PermissionAction.Create)]
    public async Task<IActionResult> Process(ProcessPayrollCommand command, CancellationToken ct) => FromResponse(await _service.ProcessPayrollAsync(command, ct), StatusCodes.Status201Created);
    [HttpPost("approve"), RequirePermission(HrPermissions.Payroll, PermissionAction.Approve)]
    public async Task<IActionResult> Approve(ApprovePayrollCommand command, CancellationToken ct) => FromResponse(await _service.ApprovePayrollAsync(command, ct));
    [HttpGet("run/{id:long}"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> GetRun(long id, CancellationToken ct) => FromResponse(await _service.GetPayrollRunAsync(id, ct));
    [HttpGet("history/{employeeId:long}"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> History(long employeeId, CancellationToken ct) => FromResponse(await _service.GetPayrollHistoryAsync(employeeId, ct));
    [HttpGet("payslip/{employeeId:long}"), RequirePermission(HrPermissions.Payroll, PermissionAction.View)]
    public async Task<IActionResult> Payslip(long employeeId, [FromQuery] int? payrollMonth, [FromQuery] int? payrollYear, CancellationToken ct) => FromResponse(await _service.GetPayslipAsync(new GetPayslipQuery(employeeId, payrollMonth, payrollYear), ct));
}
