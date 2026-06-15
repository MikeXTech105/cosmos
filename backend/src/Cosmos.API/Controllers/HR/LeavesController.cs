using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.HR;

[Authorize]
[Route("api/hr/leaves")]
public sealed class LeavesController : ApiControllerBase
{
    private readonly IHrService _service;
    public LeavesController(IHrService service) => _service = service;

    [HttpPost("apply"), RequirePermission(HrPermissions.Leave, PermissionAction.Create)]
    public async Task<IActionResult> Apply(ApplyLeaveCommand command, CancellationToken ct) => FromResponse(await _service.ApplyLeaveAsync(command, ct), StatusCodes.Status201Created);
    [HttpPost("cancel"), RequirePermission(HrPermissions.Leave, PermissionAction.Create)]
    public async Task<IActionResult> Cancel(LeaveActionCommand command, CancellationToken ct) => FromResponse(await _service.ActOnLeaveAsync(command, "Cancel", ct));
    [HttpPost("approve"), RequirePermission(HrPermissions.Leave, PermissionAction.Approve)]
    public async Task<IActionResult> Approve(LeaveActionCommand command, CancellationToken ct) => FromResponse(await _service.ActOnLeaveAsync(command, "Approve", ct));
    [HttpPost("reject"), RequirePermission(HrPermissions.Leave, PermissionAction.Approve)]
    public async Task<IActionResult> Reject(LeaveActionCommand command, CancellationToken ct) => FromResponse(await _service.ActOnLeaveAsync(command, "Reject", ct));
    [HttpGet, RequirePermission(HrPermissions.Leave, PermissionAction.View)]
    public async Task<IActionResult> GetList([FromQuery] GetLeavesQuery query, CancellationToken ct) => FromResponse(await _service.GetLeavesAsync(query, ct));
    [HttpGet("balance"), RequirePermission(HrPermissions.Leave, PermissionAction.View)]
    public async Task<IActionResult> Balance([FromQuery] long employeeId, CancellationToken ct) => FromResponse(await _service.GetLeaveBalanceAsync(employeeId, ct));
    [HttpGet("pending-approvals"), RequirePermission(HrPermissions.Leave, PermissionAction.Approve)]
    public async Task<IActionResult> PendingApprovals([FromQuery] GetPendingLeaveApprovalsQuery query, CancellationToken ct) => FromResponse(await _service.GetPendingLeaveApprovalsAsync(query, ct));
}
