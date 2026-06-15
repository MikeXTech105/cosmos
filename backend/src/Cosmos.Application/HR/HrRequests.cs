using Cosmos.Contracts.HR;

namespace Cosmos.Application.HR;

public sealed record HrPagedQuery(string? Search = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20, string? SortBy = null, string? SortDirection = "ASC");

public sealed record CreateDepartmentCommand(string DepartmentCode, string DepartmentName, string? Description, bool IsActive = true);
public sealed record UpdateDepartmentCommand(string DepartmentCode, string DepartmentName, string? Description, bool IsActive = true);
public sealed record CreateDesignationCommand(string DesignationCode, string DesignationName, long DepartmentId, string? Description, bool IsActive = true);
public sealed record UpdateDesignationCommand(string DesignationCode, string DesignationName, long DepartmentId, string? Description, bool IsActive = true);
public sealed record CreateShiftCommand(string ShiftCode, string ShiftName, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes, bool IsNightShift, decimal WeeklyHours, bool IsActive = true);
public sealed record UpdateShiftCommand(string ShiftCode, string ShiftName, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes, bool IsNightShift, decimal WeeklyHours, bool IsActive = true);

public sealed record EmployeeAddressRequest(string AddressType, string AddressLine1, string? AddressLine2, string? City, string? State, string? Country, string? Pincode);
public sealed record EmployeeBankAccountRequest(string BankName, string AccountNumber, string IFSCCode, string? BranchName, string? UPIId);
public sealed record CreateEmployeeCommand(
    string EmployeeCode, string FirstName, string? LastName, int Gender, DateOnly? DateOfBirth,
    DateOnly JoiningDate, string? Mobile, string? Email, long DepartmentId, long DesignationId,
    long? ReportingManagerId, long ShiftId, int EmploymentType, int Status, string? ProfilePhotoUrl,
    IReadOnlyCollection<EmployeeAddressRequest>? Addresses = null, EmployeeBankAccountRequest? BankDetails = null);
public sealed record UpdateEmployeeCommand(
    string EmployeeCode, string FirstName, string? LastName, int Gender, DateOnly? DateOfBirth,
    DateOnly JoiningDate, string? Mobile, string? Email, long DepartmentId, long DesignationId,
    long? ReportingManagerId, long ShiftId, int EmploymentType, int Status, string? ProfilePhotoUrl,
    IReadOnlyCollection<EmployeeAddressRequest>? Addresses = null);
public sealed record GetEmployeesQuery(string? Search = null, long? DepartmentId = null, long? DesignationId = null, int? Status = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20, string? SortBy = "EmployeeCode", string? SortDirection = "ASC");
public sealed record AddEmployeeDocumentCommand(string DocumentType, string FileName, string FilePath, DateOnly? ExpiryDate);
public sealed record AddEmployeeBankDetailsCommand(string BankName, string AccountNumber, string IFSCCode, string? BranchName, string? UPIId);

public sealed record AttendanceCheckInCommand(long EmployeeId, DateTime? CheckInTime = null);
public sealed record AttendanceCheckOutCommand(long EmployeeId, DateTime? CheckOutTime = null);
public sealed record AttendanceManualEntryCommand(long EmployeeId, DateOnly AttendanceDate, DateTime? CheckInTime, DateTime? CheckOutTime, int AttendanceStatus);
public sealed record GetAttendanceQuery(long? EmployeeId = null, long? DepartmentId = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int? Status = null, int PageNumber = 1, int PageSize = 20);
public sealed record AttendanceAdjustmentRequestCommand(long EmployeeId, long AttendanceId, string Reason);
public sealed record AttendanceAdjustmentDecisionCommand(long AdjustmentId, string? Remarks = null);
public sealed record AttendanceMonthlyReportQuery(long? EmployeeId, int Month, int Year);
public sealed record AttendanceDepartmentReportQuery(long? DepartmentId, DateOnly AttendanceDate);

public sealed record ApplyLeaveCommand(long EmployeeId, long LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string Reason);
public sealed record LeaveActionCommand(long LeaveApplicationId, long? EmployeeId = null, string? Remarks = null);
public sealed record GetLeavesQuery(long? EmployeeId = null, long? LeaveTypeId = null, int? Status = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 20);
public sealed record GetLeaveBalanceQuery(long EmployeeId);
public sealed record GetPendingLeaveApprovalsQuery(long? ReportingManagerId = null, int PageNumber = 1, int PageSize = 20);

public sealed record ProcessPayrollCommand(int PayrollMonth, int PayrollYear);
public sealed record ApprovePayrollCommand(long PayrollRunId);
public sealed record GetPayrollHistoryQuery(long EmployeeId);
public sealed record GetPayslipQuery(long EmployeeId, int? PayrollMonth = null, int? PayrollYear = null);
