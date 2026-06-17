namespace Cosmos.Contracts.HR;

public sealed record DepartmentDto(long Id, string DepartmentCode, string DepartmentName, string? Description, bool IsActive, DateTime CreatedOn, DateTime? UpdatedOn, int TotalCount = 0);
public sealed record DesignationDto(long Id, string DesignationCode, string DesignationName, long DepartmentId, string DepartmentName, string? Description, bool IsActive, DateTime CreatedOn, DateTime? UpdatedOn, int TotalCount = 0);
public sealed record ShiftDto(long Id, string ShiftCode, string ShiftName, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes, bool IsNightShift, decimal WeeklyHours, bool IsActive, DateTime CreatedOn, DateTime? UpdatedOn, int TotalCount = 0);

public sealed record EmployeeAddressDto(long Id, long EmployeeId, string AddressType, string AddressLine1, string? AddressLine2, string? City, string? State, string? Country, string? Pincode);
public sealed record EmployeeBankAccountDto(long Id, long EmployeeId, string BankName, string AccountNumber, string IFSCCode, string? BranchName, string? UPIId, DateTime CreatedOn);
public sealed record EmployeeDocumentDto(long Id, long EmployeeId, string DocumentType, string FileName, string FilePath, DateOnly? ExpiryDate, DateTime CreatedOn);
public sealed record EmployeeDto(
    long Id, string EmployeeCode, string FirstName, string? LastName, int Gender, DateOnly? DateOfBirth,
    DateOnly JoiningDate, string? Mobile, string? Email, long DepartmentId, string DepartmentName,
    long DesignationId, string DesignationName, long? ReportingManagerId, string? ReportingManagerName,
    long ShiftId, string ShiftName, int EmploymentType, int Status, string? ProfilePhotoUrl,
    bool IsActive, DateTime CreatedOn, DateTime? UpdatedOn);
public sealed class EmployeeListItemDto
{
    public long Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public long DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public long DesignationId { get; set; }
    public string DesignationName { get; set; } = string.Empty;
    public long? ReportingManagerId { get; set; }
    public string? ReportingManagerName { get; set; }
    public int EmploymentType { get; set; }
    public int Status { get; set; }
    public DateOnly JoiningDate { get; set; }
    public bool IsActive { get; set; }
    public int TotalCount { get; set; }
}
public sealed record EmployeeDropdownDto(long Id, string EmployeeCode, string EmployeeName);

public sealed record AttendanceDto(
    long Id, long EmployeeId, string EmployeeCode, string EmployeeName, DateOnly AttendanceDate,
    DateTime? CheckInTime, DateTime? CheckOutTime, int WorkingMinutes, int OvertimeMinutes,
    int AttendanceStatus, DateTime CreatedOn, int TotalCount = 0);
public sealed record AttendanceAdjustmentDto(long Id, long EmployeeId, long AttendanceId, string Reason, int Status, long? ApprovedBy, DateTime? ApprovedOn, DateTime CreatedOn);
public sealed record AttendanceMonthlyReportDto(long EmployeeId, string EmployeeCode, string EmployeeName, int PayrollMonth, int PayrollYear, int PresentDays, int AbsentDays, int HalfDays, int LeaveDays, int Holidays, int WeekOffDays, int WfhDays, int WorkingMinutes, int OvertimeMinutes);
public sealed record AttendanceDepartmentReportDto(long DepartmentId, string DepartmentName, DateOnly AttendanceDate, int EmployeeCount, int PresentCount, int AbsentCount, int LeaveCount, int OtherCount);

public sealed record LeaveBalanceDto(long Id, long EmployeeId, long LeaveTypeId, string LeaveCode, string LeaveName, decimal OpeningBalance, decimal UsedBalance, decimal RemainingBalance);
public sealed record LeaveApplicationDto(long Id, long EmployeeId, string EmployeeCode, string EmployeeName, long LeaveTypeId, string LeaveName, DateOnly StartDate, DateOnly EndDate, decimal LeaveDays, string Reason, int Status, long? ApprovedBy, DateTime? ApprovedOn, DateTime CreatedOn, int TotalCount = 0);

public sealed record PayrollDetailDto(long Id, long PayrollRunId, long EmployeeId, string EmployeeCode, string EmployeeName, decimal PayableDays, decimal GrossSalary, decimal TotalDeduction, decimal NetSalary);
public sealed record PayrollRunDto(long Id, int PayrollMonth, int PayrollYear, int Status, DateTime CreatedOn, DateTime? UpdatedOn, IReadOnlyCollection<PayrollDetailDto>? Details = null);
public sealed record PayslipDto(long PayrollRunId, int PayrollMonth, int PayrollYear, long EmployeeId, string EmployeeCode, string EmployeeName, decimal PayableDays, decimal GrossSalary, decimal TotalDeduction, decimal NetSalary, int Status);
