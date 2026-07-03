namespace Cosmos.Domain.HR;

public abstract class HrAuditableEntity
{
    public long Id { get; set; }
    public DateTime CreatedOn { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedOn { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedOn { get; set; }
    public long? DeletedBy { get; set; }
    public bool IsDeleted { get; set; }
}

public sealed class Department : HrAuditableEntity
{
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public sealed class Designation : HrAuditableEntity
{
    public string DesignationCode { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public long DepartmentId { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public sealed class Shift : HrAuditableEntity
{
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int GraceMinutes { get; set; }
    public bool IsNightShift { get; set; }
    public decimal WeeklyHours { get; set; }
    public bool IsActive { get; set; }
}

public sealed class Employee : HrAuditableEntity
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public Gender Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public DateOnly JoiningDate { get; set; }
    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public long DepartmentId { get; set; }
    public long DesignationId { get; set; }
    public long? ReportingManagerId { get; set; }
    public long ShiftId { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public EmployeeStatus Status { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public DateTime? ResignedDate { get; set; }
    public DateOnly? LastWorkingDate { get; set; }
    public string? ResignationReason { get; set; }
    public DateTime? RejoinedDate { get; set; }
    public string? RejoinRemarks { get; set; }
}

public sealed class EmployeeAddress : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public string AddressType { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Pincode { get; set; }
}

public sealed class EmployeeBankAccount : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string IFSCCode { get; set; } = string.Empty;
    public string? BranchName { get; set; }
    public string? UPIId { get; set; }
}

public sealed class EmployeeDocument : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public DateOnly? ExpiryDate { get; set; }
}

public sealed class Attendance : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public int WorkingMinutes { get; set; }
    public int OvertimeMinutes { get; set; }
    public AttendanceStatus AttendanceStatus { get; set; }
}

public sealed class AttendanceAdjustment : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public long AttendanceId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ApprovalStatus Status { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTime? ApprovedOn { get; set; }
}

public sealed class LeaveType : HrAuditableEntity
{
    public string LeaveCode { get; set; } = string.Empty;
    public string LeaveName { get; set; } = string.Empty;
    public decimal AnnualQuota { get; set; }
    public bool IsPaidLeave { get; set; }
}

public sealed class LeaveBalance : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public long LeaveTypeId { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal UsedBalance { get; set; }
    public decimal RemainingBalance { get; set; }
}

public sealed class LeaveApplication : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public long LeaveTypeId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LeaveApplicationStatus Status { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTime? ApprovedOn { get; set; }
}

public sealed class SalaryStructure : HrAuditableEntity
{
    public string Name { get; set; } = string.Empty;
}

public sealed class SalaryComponent : HrAuditableEntity
{
    public string ComponentName { get; set; } = string.Empty;
    public SalaryComponentType ComponentType { get; set; }
}

public sealed class EmployeeSalaryStructure : HrAuditableEntity
{
    public long EmployeeId { get; set; }
    public long SalaryStructureId { get; set; }
    public DateOnly EffectiveDate { get; set; }
}

public sealed class PayrollRun : HrAuditableEntity
{
    public int PayrollMonth { get; set; }
    public int PayrollYear { get; set; }
    public PayrollRunStatus Status { get; set; }
}

public sealed class PayrollDetail : HrAuditableEntity
{
    public long PayrollRunId { get; set; }
    public long EmployeeId { get; set; }
    public decimal GrossSalary { get; set; }
    public decimal TotalDeduction { get; set; }
    public decimal NetSalary { get; set; }
}
