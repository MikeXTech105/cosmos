using System.Text.Json;
using Cosmos.Application.HR;
using Cosmos.Contracts.HR;
using Cosmos.Contracts.Common;

namespace Cosmos.Persistence.Repositories;

public sealed partial class HrRepository
{
    public Task<IReadOnlyCollection<HrPayrollRateOptionDto>> GetPayrollRateOptionsAsync(ProcessPayrollCommand query, CancellationToken ct) => QueryAsync<HrPayrollRateOptionDto>("sp_HR_Payroll_RateOptions", new { query.PayrollMonth, query.PayrollYear }, ct);
    public Task<PagedResult<HrPayrollRunOptionDto>> GetPayrollRunsAsync(GetPayrollRunsQuery query, CancellationToken ct) => QueryPagedAsync<HrPayrollRunOptionDto>("sp_HR_Payroll_GetRuns", new { query.Search, query.PageNumber, query.PageSize }, query.PageNumber, query.PageSize, ct);
    public Task<IReadOnlyCollection<HrAdjustmentContextDto>> GetPendingAdjustmentsAsync(CancellationToken ct) => QueryAsync<HrAdjustmentContextDto>("sp_HR_AttendanceAdjustment_Pending", null, ct);
    public Task<IReadOnlyCollection<HrLeaveEntitlementDto>> GetLeaveEntitlementsAsync(long employeeId, CancellationToken ct) => QueryAsync<HrLeaveEntitlementDto>("sp_HR_LeaveEntitlement_GetList", new { EmployeeId = employeeId }, ct);
    public Task<HrLeaveEntitlementDto> SaveLeaveEntitlementAsync(SaveEmployeeLeaveEntitlementCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<HrLeaveEntitlementDto>("sp_HR_LeaveEntitlement_Save", new { command.EmployeeId, command.LeaveTypeId, command.OpeningBalance, command.RowVersion, UserId = userId }, ct);
    public Task<IReadOnlyCollection<HrLeaveTypeDto>> GetLeaveTypesAsync(CancellationToken ct) => QueryAsync<HrLeaveTypeDto>("sp_HR_LeaveType_GetList", null, ct);
    public Task<HrLeaveTypeDto> SaveLeaveTypeAsync(long? id, SaveLeaveTypeCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<HrLeaveTypeDto>("sp_HR_LeaveType_Save", new { Id = id, command.LeaveCode, command.LeaveName, command.AnnualQuota, command.IsPaidLeave, command.IsActive, command.RowVersion, UserId = userId }, ct);
    public Task<IReadOnlyCollection<HrSalaryComponentDto>> GetSalaryComponentsAsync(CancellationToken ct) => QueryAsync<HrSalaryComponentDto>("sp_HR_SalaryComponent_GetList", null, ct);
    public Task<HrSalaryComponentDto> SaveSalaryComponentAsync(long? id, SaveSalaryComponentCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<HrSalaryComponentDto>("sp_HR_SalaryComponent_Save", new { Id = id, command.ComponentName, command.ComponentType, command.RowVersion, UserId = userId }, ct);
    public async Task<IReadOnlyCollection<HrSalaryStructureDto>> GetSalaryStructuresAsync(CancellationToken ct)
    {
        var structures = await QueryAsync<SalaryStructureRow>("sp_HR_SalaryStructure_GetList", null, ct);
        var amounts = await QueryAsync<HrSalaryAmountDto>("sp_HR_SalaryStructure_GetAmounts", null, ct);
        return structures.Select(row => new HrSalaryStructureDto(row.Id, row.Name, row.RowVersion, amounts.Where(amount => amount.SalaryStructureId == row.Id).ToArray())).ToArray();
    }
    public async Task<HrSalaryStructureDto> SaveSalaryStructureAsync(long? id, SaveSalaryStructureCommand command, long? userId, CancellationToken ct)
    {
        var row = await QueryWithStatusAsync<SalaryStructureRow>("sp_HR_SalaryStructure_Save", new { Id = id, command.Name, ComponentsJson = JsonSerializer.Serialize(command.Components, JsonOptions), command.RowVersion, UserId = userId }, ct);
        return new HrSalaryStructureDto(row.Id, row.Name, row.RowVersion);
    }
    public Task<IReadOnlyCollection<HrSalaryAssignmentDto>> GetSalaryAssignmentsAsync(long? employeeId, CancellationToken ct) => QueryAsync<HrSalaryAssignmentDto>("sp_HR_SalaryAssignment_GetList", new { EmployeeId = employeeId }, ct);
    public Task<HrSalaryAssignmentDto> AssignSalaryStructureAsync(AssignSalaryStructureCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<HrSalaryAssignmentDto>("sp_HR_SalaryAssignment_Create", new { command.EmployeeId, command.SalaryStructureId, EffectiveDate = command.EffectiveDate.ToDateTime(TimeOnly.MinValue), UserId = userId }, ct);
    public Task<IReadOnlyCollection<HrPayrollPreflightDto>> GetPayrollPreflightAsync(ProcessPayrollCommand command, CancellationToken ct) => QueryAsync<HrPayrollPreflightDto>("sp_HR_Payroll_Preflight", new { command.PayrollMonth, command.PayrollYear }, ct);
    private sealed record SalaryStructureRow(long Id, string Name, byte[] RowVersion);
}
