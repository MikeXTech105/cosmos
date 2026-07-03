using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[ApiExplorerSettings(GroupName = "hr")]
[Route("api/hr/attendance")]
public sealed class AttendanceController : ApiControllerBase
{
    private readonly IHrService _service;
    public AttendanceController(IHrService service) => _service = service;

    [HttpPost("check-in"), RequirePermission(HrPermissions.Attendance, PermissionAction.Edit)]
    public async Task<IActionResult> CheckIn(AttendanceCheckInCommand command, CancellationToken ct) => FromResponse(await _service.CheckInAsync(command, ct), StatusCodes.Status201Created);
    [HttpPost("check-out"), RequirePermission(HrPermissions.Attendance, PermissionAction.Edit)]
    public async Task<IActionResult> CheckOut(AttendanceCheckOutCommand command, CancellationToken ct) => FromResponse(await _service.CheckOutAsync(command, ct));
    [HttpPost("manual-entry"), RequirePermission(HrPermissions.Attendance, PermissionAction.Edit)]
    public async Task<IActionResult> ManualEntry(AttendanceManualEntryCommand command, CancellationToken ct) => FromResponse(await _service.ManualAttendanceAsync(command, ct));
    [HttpGet, RequirePermission(HrPermissions.Attendance, PermissionAction.View)]
    public async Task<IActionResult> GetList([FromQuery] GetAttendanceQuery query, CancellationToken ct) => FromResponse(await _service.GetAttendanceAsync(query, ct));
    [HttpGet("{employeeId:long}"), RequirePermission(HrPermissions.Attendance, PermissionAction.View)]
    public async Task<IActionResult> GetEmployee(long employeeId, [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate, CancellationToken ct) => FromResponse(await _service.GetEmployeeAttendanceAsync(employeeId, fromDate, toDate, ct));
    [HttpPost("adjustment-request"), RequirePermission(HrPermissions.Attendance, PermissionAction.Edit)]
    public async Task<IActionResult> RequestAdjustment(AttendanceAdjustmentRequestCommand command, CancellationToken ct) => FromResponse(await _service.RequestAttendanceAdjustmentAsync(command, ct), StatusCodes.Status201Created);
    [HttpPost("approve-adjustment"), RequirePermission(HrPermissions.Attendance, PermissionAction.Approve)]
    public async Task<IActionResult> ApproveAdjustment(AttendanceAdjustmentDecisionCommand command, CancellationToken ct) => FromResponse(await _service.DecideAttendanceAdjustmentAsync(command, true, ct));
    [HttpPost("reject-adjustment"), RequirePermission(HrPermissions.Attendance, PermissionAction.Approve)]
    public async Task<IActionResult> RejectAdjustment(AttendanceAdjustmentDecisionCommand command, CancellationToken ct) => FromResponse(await _service.DecideAttendanceAdjustmentAsync(command, false, ct));
    [HttpGet("monthly-report"), RequirePermission(HrPermissions.Attendance, PermissionAction.View)]
    public async Task<IActionResult> MonthlyReport([FromQuery] AttendanceMonthlyReportQuery query, CancellationToken ct) => FromResponse(await _service.GetMonthlyAttendanceReportAsync(query, ct));
    [HttpGet("department-report"), RequirePermission(HrPermissions.Attendance, PermissionAction.View)]
    public async Task<IActionResult> DepartmentReport([FromQuery] AttendanceDepartmentReportQuery query, CancellationToken ct) => FromResponse(await _service.GetDepartmentAttendanceReportAsync(query, ct));
}
