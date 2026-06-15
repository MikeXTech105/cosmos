using Cosmos.Application.HR;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.HR;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IHrRepository
{
    Task<DepartmentDto?> GetDepartmentAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<DepartmentDto>> GetDepartmentsAsync(HrPagedQuery query, CancellationToken cancellationToken);
    Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentCommand command, long? userId, CancellationToken cancellationToken);
    Task<DepartmentDto> UpdateDepartmentAsync(long id, UpdateDepartmentCommand command, long? userId, CancellationToken cancellationToken);
    Task<OperationResult> DeleteDepartmentAsync(long id, long? userId, CancellationToken cancellationToken);
    Task<bool> DepartmentValueExistsAsync(string field, string value, long? excludingId, CancellationToken cancellationToken);

    Task<DesignationDto?> GetDesignationAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<DesignationDto>> GetDesignationsAsync(HrPagedQuery query, CancellationToken cancellationToken);
    Task<DesignationDto> CreateDesignationAsync(CreateDesignationCommand command, long? userId, CancellationToken cancellationToken);
    Task<DesignationDto> UpdateDesignationAsync(long id, UpdateDesignationCommand command, long? userId, CancellationToken cancellationToken);
    Task<OperationResult> DeleteDesignationAsync(long id, long? userId, CancellationToken cancellationToken);

    Task<ShiftDto?> GetShiftAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<ShiftDto>> GetShiftsAsync(HrPagedQuery query, CancellationToken cancellationToken);
    Task<ShiftDto> CreateShiftAsync(CreateShiftCommand command, long? userId, CancellationToken cancellationToken);
    Task<ShiftDto> UpdateShiftAsync(long id, UpdateShiftCommand command, long? userId, CancellationToken cancellationToken);
    Task<OperationResult> DeleteShiftAsync(long id, long? userId, CancellationToken cancellationToken);

    Task<EmployeeDto?> GetEmployeeAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<EmployeeListItemDto>> GetEmployeesAsync(GetEmployeesQuery query, CancellationToken cancellationToken);
    Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeCommand command, long? userId, CancellationToken cancellationToken);
    Task<EmployeeDto> UpdateEmployeeAsync(long id, UpdateEmployeeCommand command, long? userId, CancellationToken cancellationToken);
    Task<OperationResult> DeleteEmployeeAsync(long id, long? userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<EmployeeDropdownDto>> GetEmployeeDropdownAsync(string? search, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<EmployeeDropdownDto>> GetReportingManagersAsync(long? departmentId, long? excludingEmployeeId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<EmployeeDocumentDto>> GetEmployeeDocumentsAsync(long employeeId, CancellationToken cancellationToken);
    Task<EmployeeDocumentDto> AddEmployeeDocumentAsync(long employeeId, AddEmployeeDocumentCommand command, long? userId, CancellationToken cancellationToken);
    Task<OperationResult> DeleteEmployeeDocumentAsync(long documentId, long? userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<EmployeeBankAccountDto>> GetEmployeeBankDetailsAsync(long employeeId, CancellationToken cancellationToken);
    Task<EmployeeBankAccountDto> AddEmployeeBankDetailsAsync(long employeeId, AddEmployeeBankDetailsCommand command, long? userId, CancellationToken cancellationToken);
    Task<bool> EmployeeValueExistsAsync(string field, string value, long? excludingId, CancellationToken cancellationToken);
    Task<bool> EntityExistsAsync(string entity, long id, CancellationToken cancellationToken);

    Task<AttendanceDto> CheckInAsync(AttendanceCheckInCommand command, long? userId, CancellationToken cancellationToken);
    Task<AttendanceDto> CheckOutAsync(AttendanceCheckOutCommand command, long? userId, CancellationToken cancellationToken);
    Task<AttendanceDto> ManualAttendanceAsync(AttendanceManualEntryCommand command, long? userId, CancellationToken cancellationToken);
    Task<PagedResult<AttendanceDto>> GetAttendanceAsync(GetAttendanceQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AttendanceDto>> GetEmployeeAttendanceAsync(long employeeId, DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken);
    Task<AttendanceAdjustmentDto> RequestAttendanceAdjustmentAsync(AttendanceAdjustmentRequestCommand command, long? userId, CancellationToken cancellationToken);
    Task<AttendanceAdjustmentDto> DecideAttendanceAdjustmentAsync(long adjustmentId, bool approve, string? remarks, long? userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AttendanceMonthlyReportDto>> GetMonthlyAttendanceReportAsync(AttendanceMonthlyReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AttendanceDepartmentReportDto>> GetDepartmentAttendanceReportAsync(AttendanceDepartmentReportQuery query, CancellationToken cancellationToken);

    Task<LeaveApplicationDto> ApplyLeaveAsync(ApplyLeaveCommand command, long? userId, CancellationToken cancellationToken);
    Task<LeaveApplicationDto> ActOnLeaveAsync(long leaveApplicationId, string action, long? employeeId, string? remarks, long? userId, CancellationToken cancellationToken);
    Task<PagedResult<LeaveApplicationDto>> GetLeavesAsync(GetLeavesQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<LeaveBalanceDto>> GetLeaveBalanceAsync(long employeeId, CancellationToken cancellationToken);
    Task<PagedResult<LeaveApplicationDto>> GetPendingLeaveApprovalsAsync(GetPendingLeaveApprovalsQuery query, CancellationToken cancellationToken);

    Task<PayrollRunDto> ProcessPayrollAsync(ProcessPayrollCommand command, long? userId, CancellationToken cancellationToken);
    Task<PayrollRunDto> ApprovePayrollAsync(long payrollRunId, long? userId, CancellationToken cancellationToken);
    Task<PayrollRunDto?> GetPayrollRunAsync(long id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PayrollDetailDto>> GetPayrollHistoryAsync(long employeeId, CancellationToken cancellationToken);
    Task<PayslipDto?> GetPayslipAsync(GetPayslipQuery query, CancellationToken cancellationToken);
}
