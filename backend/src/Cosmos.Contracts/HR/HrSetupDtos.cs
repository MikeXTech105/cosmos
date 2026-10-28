namespace Cosmos.Contracts.HR;

public sealed record HrLeaveTypeDto(long Id, string LeaveCode, string LeaveName, decimal AnnualQuota, bool IsPaidLeave, bool IsActive, byte[] RowVersion);
public sealed record HrSalaryComponentDto(long Id, string ComponentName, int ComponentType, byte[] RowVersion);
public sealed record HrSalaryAmountDto(long SalaryStructureId, long SalaryComponentId, string ComponentName, int ComponentType, decimal Amount);
public sealed record HrSalaryStructureDto(long Id, string Name, byte[] RowVersion, IReadOnlyCollection<HrSalaryAmountDto>? Components = null);
public sealed record HrSalaryAssignmentDto(long Id, long EmployeeId, string EmployeeName, long SalaryStructureId, string StructureName, DateTime EffectiveDate, byte[] RowVersion);
public sealed record HrPayrollPreflightDto(long EmployeeId, string EmployeeCode, string EmployeeName, long? SalaryStructureId, int ComponentCount, int AttendanceDays, int EmploymentDays, bool RequiresRateSelection, string? BlockedReason);
public sealed record HrPayrollRateOptionDto(long EmployeeId, long SalaryAssignmentId, long SalaryStructureId, string StructureName, DateTime EffectiveDate, byte[] RowVersion, decimal MonthlyEarnings, decimal FixedDeductions);
public sealed record HrLeaveEntitlementDto(long Id, long EmployeeId, long LeaveTypeId, decimal OpeningBalance, decimal UsedBalance, decimal RemainingBalance, byte[] RowVersion);
public sealed record HrAdjustmentContextDto(long Id, long EmployeeId, string EmployeeCode, string EmployeeName, long AttendanceId, DateTime AttendanceDate, DateTime? CheckInTime, DateTime? CheckOutTime, int AttendanceStatus, string Reason, int Status, int? ProposedAttendanceStatus, DateTime? ProposedCheckInTime, DateTime? ProposedCheckOutTime);
public sealed record HrPayrollRunOptionDto(long Id, int PayrollMonth, int PayrollYear, int Status, int EmployeeCount, decimal NetSalary, int TotalCount);
