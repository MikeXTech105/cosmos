using Cosmos.Application.HR;
using Cosmos.Contracts.HR;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Services;

public sealed partial class HrService
{
    public async Task<ApiResponse<IReadOnlyCollection<HrPayrollRateOptionDto>>> GetPayrollRateOptionsAsync(ProcessPayrollCommand query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<IReadOnlyCollection<HrPayrollRateOptionDto>>.Success(await _repository.GetPayrollRateOptionsAsync(query, ct));
    }
    public async Task<ApiResponse<PagedResult<HrPayrollRunOptionDto>>> GetPayrollRunsAsync(GetPayrollRunsQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<HrPayrollRunOptionDto>>.Success(await _repository.GetPayrollRunsAsync(query, ct));
    }
    public async Task<ApiResponse<IReadOnlyCollection<HrAdjustmentContextDto>>> GetPendingAdjustmentsAsync(CancellationToken ct) => ApiResponse<IReadOnlyCollection<HrAdjustmentContextDto>>.Success(await _repository.GetPendingAdjustmentsAsync(ct));
    public async Task<ApiResponse<IReadOnlyCollection<HrLeaveEntitlementDto>>> GetLeaveEntitlementsAsync(long employeeId, CancellationToken ct) => ApiResponse<IReadOnlyCollection<HrLeaveEntitlementDto>>.Success(await _repository.GetLeaveEntitlementsAsync(employeeId, ct));
    public async Task<ApiResponse<HrLeaveEntitlementDto>> SaveLeaveEntitlementAsync(SaveEmployeeLeaveEntitlementCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return await MutateAsync("HR.LeaveBalances", "SetEntitlement", () => _repository.SaveLeaveEntitlementAsync(command, UserId, ct), ct);
    }
    public async Task<ApiResponse<IReadOnlyCollection<HrLeaveTypeDto>>> GetLeaveTypesAsync(CancellationToken ct) => ApiResponse<IReadOnlyCollection<HrLeaveTypeDto>>.Success(await _repository.GetLeaveTypesAsync(ct));
    public async Task<ApiResponse<HrLeaveTypeDto>> SaveLeaveTypeAsync(long? id, SaveLeaveTypeCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return await MutateAsync("HR.LeaveTypes", id.HasValue ? "Update" : "Create", () => _repository.SaveLeaveTypeAsync(id, command, UserId, ct), ct);
    }
    public async Task<ApiResponse<IReadOnlyCollection<HrSalaryComponentDto>>> GetSalaryComponentsAsync(CancellationToken ct) => ApiResponse<IReadOnlyCollection<HrSalaryComponentDto>>.Success(await _repository.GetSalaryComponentsAsync(ct));
    public async Task<ApiResponse<HrSalaryComponentDto>> SaveSalaryComponentAsync(long? id, SaveSalaryComponentCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return await MutateAsync("HR.SalaryComponents", id.HasValue ? "Update" : "Create", () => _repository.SaveSalaryComponentAsync(id, command, UserId, ct), ct);
    }
    public async Task<ApiResponse<IReadOnlyCollection<HrSalaryStructureDto>>> GetSalaryStructuresAsync(CancellationToken ct) => ApiResponse<IReadOnlyCollection<HrSalaryStructureDto>>.Success(await _repository.GetSalaryStructuresAsync(ct));
    public async Task<ApiResponse<HrSalaryStructureDto>> SaveSalaryStructureAsync(long? id, SaveSalaryStructureCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return await MutateAsync("HR.SalaryStructures", id.HasValue ? "Update" : "Create", () => _repository.SaveSalaryStructureAsync(id, command, UserId, ct), ct);
    }
    public async Task<ApiResponse<IReadOnlyCollection<HrSalaryAssignmentDto>>> GetSalaryAssignmentsAsync(long? employeeId, CancellationToken ct) => ApiResponse<IReadOnlyCollection<HrSalaryAssignmentDto>>.Success(await _repository.GetSalaryAssignmentsAsync(employeeId, ct));
    public async Task<ApiResponse<HrSalaryAssignmentDto>> AssignSalaryStructureAsync(AssignSalaryStructureCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return await MutateAsync("HR.EmployeeSalaryStructures", "Create", () => _repository.AssignSalaryStructureAsync(command, UserId, ct), ct);
    }
    public async Task<ApiResponse<IReadOnlyCollection<HrPayrollPreflightDto>>> GetPayrollPreflightAsync(ProcessPayrollCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return ApiResponse<IReadOnlyCollection<HrPayrollPreflightDto>>.Success(await _repository.GetPayrollPreflightAsync(command, ct));
    }
}
