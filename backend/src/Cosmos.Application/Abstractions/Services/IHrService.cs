using Cosmos.Application.HR;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.HR;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IHrService
{
    Task<ApiResponse<DepartmentDto>> GetDepartmentAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<DepartmentDto>>> GetDepartmentsAsync(HrPagedQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<DepartmentDto>> CreateDepartmentAsync(CreateDepartmentCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<DepartmentDto>> UpdateDepartmentAsync(long id, UpdateDepartmentCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteDepartmentAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<DesignationDto>> GetDesignationAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<DesignationDto>>> GetDesignationsAsync(HrPagedQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<DesignationDto>> CreateDesignationAsync(CreateDesignationCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<DesignationDto>> UpdateDesignationAsync(long id, UpdateDesignationCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteDesignationAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<ShiftDto>> GetShiftAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<ShiftDto>>> GetShiftsAsync(HrPagedQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<ShiftDto>> CreateShiftAsync(CreateShiftCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<ShiftDto>> UpdateShiftAsync(long id, UpdateShiftCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteShiftAsync(long id, CancellationToken cancellationToken);

    Task<ApiResponse<EmployeeDto>> GetEmployeeAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<EmployeeListItemDto>>> GetEmployeesAsync(GetEmployeesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<EmployeeDto>> CreateEmployeeAsync(CreateEmployeeCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<EmployeeDto>> UpdateEmployeeAsync(long id, UpdateEmployeeCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<EmployeeDto>> ResignEmployeeAsync(long id, ResignEmployeeCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<EmployeeDto>> RejoinEmployeeAsync(long id, RejoinEmployeeCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteEmployeeAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>> GetEmployeeDropdownAsync(string? search, bool includeResigned, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>> GetReportingManagersAsync(long? departmentId, long? excludingEmployeeId, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<EmployeeDocumentDto>>> GetEmployeeDocumentsAsync(long employeeId, CancellationToken cancellationToken);
    Task<ApiResponse<EmployeeDocumentDto>> AddEmployeeDocumentAsync(long employeeId, AddEmployeeDocumentCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteEmployeeDocumentAsync(long documentId, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<EmployeeBankAccountDto>>> GetEmployeeBankDetailsAsync(long employeeId, CancellationToken cancellationToken);
    Task<ApiResponse<EmployeeBankAccountDto>> AddEmployeeBankDetailsAsync(long employeeId, AddEmployeeBankDetailsCommand command, CancellationToken cancellationToken);

    Task<ApiResponse<AttendanceDto>> CheckInAsync(AttendanceCheckInCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<AttendanceDto>> CheckOutAsync(AttendanceCheckOutCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<AttendanceDto>> ManualAttendanceAsync(AttendanceManualEntryCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<AttendanceDto>>> GetAttendanceAsync(GetAttendanceQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<AttendanceDto>>> GetEmployeeAttendanceAsync(long employeeId, DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken);
    Task<ApiResponse<AttendanceAdjustmentDto>> RequestAttendanceAdjustmentAsync(AttendanceAdjustmentRequestCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<AttendanceAdjustmentDto>> DecideAttendanceAdjustmentAsync(AttendanceAdjustmentDecisionCommand command, bool approve, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<AttendanceMonthlyReportDto>>> GetMonthlyAttendanceReportAsync(AttendanceMonthlyReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<AttendanceDepartmentReportDto>>> GetDepartmentAttendanceReportAsync(AttendanceDepartmentReportQuery query, CancellationToken cancellationToken);

    Task<ApiResponse<LeaveApplicationDto>> ApplyLeaveAsync(ApplyLeaveCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<LeaveApplicationDto>> ActOnLeaveAsync(LeaveActionCommand command, string action, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<LeaveApplicationDto>>> GetLeavesAsync(GetLeavesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<LeaveBalanceDto>>> GetLeaveBalanceAsync(long employeeId, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<LeaveApplicationDto>>> GetPendingLeaveApprovalsAsync(GetPendingLeaveApprovalsQuery query, CancellationToken cancellationToken);

    Task<ApiResponse<PayrollRunDto>> ProcessPayrollAsync(ProcessPayrollCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<PayrollRunDto>> ApprovePayrollAsync(ApprovePayrollCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<PayrollRunDto>> GetPayrollRunAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PayrollDetailDto>>> GetPayrollHistoryAsync(long employeeId, CancellationToken cancellationToken);
    Task<ApiResponse<PayslipDto>> GetPayslipAsync(GetPayslipQuery query, CancellationToken cancellationToken);
}
