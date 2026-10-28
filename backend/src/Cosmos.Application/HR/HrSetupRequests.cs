namespace Cosmos.Application.HR;

public sealed record SaveLeaveTypeCommand(string LeaveCode, string LeaveName, decimal AnnualQuota, bool IsPaidLeave, bool IsActive, byte[]? RowVersion = null);
public sealed record SaveSalaryComponentCommand(string ComponentName, int ComponentType, byte[]? RowVersion = null);
public sealed record SalaryAmountRequest(long SalaryComponentId, decimal Amount);
public sealed record SaveSalaryStructureCommand(string Name, IReadOnlyCollection<SalaryAmountRequest> Components, byte[]? RowVersion = null);
public sealed record AssignSalaryStructureCommand(long EmployeeId, long SalaryStructureId, DateOnly EffectiveDate);
public sealed record SaveEmployeeLeaveEntitlementCommand(long EmployeeId, long LeaveTypeId, decimal OpeningBalance, byte[]? RowVersion = null);
public sealed record GetPayrollRunsQuery(string? Search = null, int PageNumber = 1, int PageSize = 40);
