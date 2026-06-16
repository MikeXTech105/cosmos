using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.HR;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.HR;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class HrRepository : IHrRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public HrRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public Task<DepartmentDto?> GetDepartmentAsync(long id, CancellationToken ct) => QuerySingleAsync<DepartmentDto>("sp_HR_Department_GetById", new { Id = id }, ct);
    public Task<PagedResult<DepartmentDto>> GetDepartmentsAsync(HrPagedQuery query, CancellationToken ct) => QueryPagedAsync<DepartmentDto>("sp_HR_Department_GetList", PagedParameters(query), query.PageNumber, query.PageSize, ct);
    public Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<DepartmentDto>("sp_HR_Department_Create", new { command.DepartmentCode, command.DepartmentName, command.Description, command.IsActive, UserId = userId }, ct);
    public Task<DepartmentDto> UpdateDepartmentAsync(long id, UpdateDepartmentCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<DepartmentDto>("sp_HR_Department_Update", new { Id = id, command.DepartmentCode, command.DepartmentName, command.Description, command.IsActive, UserId = userId }, ct);
    public Task<OperationResult> DeleteDepartmentAsync(long id, long? userId, CancellationToken ct) => ExecuteStatusAsync("sp_HR_Department_Delete", new { Id = id, UserId = userId }, ct);
    public Task<bool> DepartmentValueExistsAsync(string field, string value, long? excludingId, CancellationToken ct) => QueryScalarAsync<bool>("sp_HR_Department_ValueExists", new { Field = field, Value = value, ExcludingId = excludingId }, ct);

    public Task<DesignationDto?> GetDesignationAsync(long id, CancellationToken ct) => QuerySingleAsync<DesignationDto>("sp_HR_Designation_GetById", new { Id = id }, ct);
    public Task<PagedResult<DesignationDto>> GetDesignationsAsync(HrPagedQuery query, CancellationToken ct) => QueryPagedAsync<DesignationDto>("sp_HR_Designation_GetList", PagedParameters(query), query.PageNumber, query.PageSize, ct);
    public Task<DesignationDto> CreateDesignationAsync(CreateDesignationCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<DesignationDto>("sp_HR_Designation_Create", new { command.DesignationCode, command.DesignationName, command.DepartmentId, command.Description, command.IsActive, UserId = userId }, ct);
    public Task<DesignationDto> UpdateDesignationAsync(long id, UpdateDesignationCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<DesignationDto>("sp_HR_Designation_Update", new { Id = id, command.DesignationCode, command.DesignationName, command.DepartmentId, command.Description, command.IsActive, UserId = userId }, ct);
    public Task<OperationResult> DeleteDesignationAsync(long id, long? userId, CancellationToken ct) => ExecuteStatusAsync("sp_HR_Designation_Delete", new { Id = id, UserId = userId }, ct);

    public Task<ShiftDto?> GetShiftAsync(long id, CancellationToken ct) => QuerySingleAsync<ShiftDto>("sp_HR_Shift_GetById", new { Id = id }, ct);
    public Task<PagedResult<ShiftDto>> GetShiftsAsync(HrPagedQuery query, CancellationToken ct) => QueryPagedAsync<ShiftDto>("sp_HR_Shift_GetList", PagedParameters(query), query.PageNumber, query.PageSize, ct);
    public Task<ShiftDto> CreateShiftAsync(CreateShiftCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<ShiftDto>("sp_HR_Shift_Create", ShiftParameters(null, command, userId), ct);
    public Task<ShiftDto> UpdateShiftAsync(long id, UpdateShiftCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<ShiftDto>("sp_HR_Shift_Update", ShiftParameters(id, command, userId), ct);
    public Task<OperationResult> DeleteShiftAsync(long id, long? userId, CancellationToken ct) => ExecuteStatusAsync("sp_HR_Shift_Delete", new { Id = id, UserId = userId }, ct);

    public Task<EmployeeDto?> GetEmployeeAsync(long id, CancellationToken ct) => QuerySingleAsync<EmployeeDto>("sp_HR_Employee_GetById", new { Id = id }, ct);
    public Task<PagedResult<EmployeeListItemDto>> GetEmployeesAsync(GetEmployeesQuery query, CancellationToken ct) =>
        QueryPagedAsync<EmployeeListItemDto>("sp_HR_Employee_GetList", query, query.PageNumber, query.PageSize, ct);
    public Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeCommand command, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<EmployeeDto>("sp_HR_Employee_Create", EmployeeParameters(null, command, userId, command.BankDetails), ct);
    public Task<EmployeeDto> UpdateEmployeeAsync(long id, UpdateEmployeeCommand command, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<EmployeeDto>("sp_HR_Employee_Update", EmployeeParameters(id, command, userId, null), ct);
    public Task<OperationResult> DeleteEmployeeAsync(long id, long? userId, CancellationToken ct) => ExecuteStatusAsync("sp_HR_Employee_Delete", new { Id = id, UserId = userId }, ct);
    public Task<IReadOnlyCollection<EmployeeDropdownDto>> GetEmployeeDropdownAsync(string? search, CancellationToken ct) => QueryAsync<EmployeeDropdownDto>("sp_HR_Employee_GetDropdown", new { Search = search }, ct);
    public Task<IReadOnlyCollection<EmployeeDropdownDto>> GetReportingManagersAsync(long? departmentId, long? excludingEmployeeId, CancellationToken ct) => QueryAsync<EmployeeDropdownDto>("sp_HR_Employee_GetReportingManagers", new { DepartmentId = departmentId, ExcludingEmployeeId = excludingEmployeeId }, ct);
    public Task<IReadOnlyCollection<EmployeeDocumentDto>> GetEmployeeDocumentsAsync(long employeeId, CancellationToken ct) => QueryAsync<EmployeeDocumentDto>("sp_HR_EmployeeDocument_GetList", new { EmployeeId = employeeId }, ct);
    public Task<EmployeeDocumentDto> AddEmployeeDocumentAsync(long employeeId, AddEmployeeDocumentCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<EmployeeDocumentDto>("sp_HR_EmployeeDocument_Create", new { EmployeeId = employeeId, command.DocumentType, command.FileName, command.FilePath, command.ExpiryDate, UserId = userId }, ct);
    public Task<OperationResult> DeleteEmployeeDocumentAsync(long documentId, long? userId, CancellationToken ct) => ExecuteStatusAsync("sp_HR_EmployeeDocument_Delete", new { Id = documentId, UserId = userId }, ct);
    public Task<IReadOnlyCollection<EmployeeBankAccountDto>> GetEmployeeBankDetailsAsync(long employeeId, CancellationToken ct) => QueryAsync<EmployeeBankAccountDto>("sp_HR_EmployeeBank_GetList", new { EmployeeId = employeeId }, ct);
    public Task<EmployeeBankAccountDto> AddEmployeeBankDetailsAsync(long employeeId, AddEmployeeBankDetailsCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<EmployeeBankAccountDto>("sp_HR_EmployeeBank_Create", new { EmployeeId = employeeId, command.BankName, command.AccountNumber, command.IFSCCode, command.BranchName, command.UPIId, UserId = userId }, ct);
    public Task<bool> EmployeeValueExistsAsync(string field, string value, long? excludingId, CancellationToken ct) => QueryScalarAsync<bool>("sp_HR_Employee_ValueExists", new { Field = field, Value = value, ExcludingId = excludingId }, ct);
    public Task<bool> EntityExistsAsync(string entity, long id, CancellationToken ct) => QueryScalarAsync<bool>("sp_HR_Entity_Exists", new { Entity = entity, Id = id }, ct);

    public Task<AttendanceDto> CheckInAsync(AttendanceCheckInCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<AttendanceDto>("sp_HR_Attendance_CheckIn", new { command.EmployeeId, command.CheckInTime, UserId = userId }, ct);
    public Task<AttendanceDto> CheckOutAsync(AttendanceCheckOutCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<AttendanceDto>("sp_HR_Attendance_CheckOut", new { command.EmployeeId, command.CheckOutTime, UserId = userId }, ct);
    public Task<AttendanceDto> ManualAttendanceAsync(AttendanceManualEntryCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<AttendanceDto>("sp_HR_Attendance_ManualEntry", new { command.EmployeeId, command.AttendanceDate, command.CheckInTime, command.CheckOutTime, command.AttendanceStatus, UserId = userId }, ct);
    public Task<PagedResult<AttendanceDto>> GetAttendanceAsync(GetAttendanceQuery query, CancellationToken ct) => QueryPagedAsync<AttendanceDto>("sp_HR_Attendance_GetList", query, query.PageNumber, query.PageSize, ct);
    public Task<IReadOnlyCollection<AttendanceDto>> GetEmployeeAttendanceAsync(long employeeId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct) => QueryAsync<AttendanceDto>("sp_HR_Attendance_GetByEmployee", new { EmployeeId = employeeId, FromDate = fromDate, ToDate = toDate }, ct);
    public Task<AttendanceAdjustmentDto> RequestAttendanceAdjustmentAsync(AttendanceAdjustmentRequestCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<AttendanceAdjustmentDto>("sp_HR_AttendanceAdjustment_Create", new { command.EmployeeId, command.AttendanceId, command.Reason, UserId = userId }, ct);
    public Task<AttendanceAdjustmentDto> DecideAttendanceAdjustmentAsync(long adjustmentId, bool approve, string? remarks, long? userId, CancellationToken ct) => QueryWithStatusAsync<AttendanceAdjustmentDto>("sp_HR_AttendanceAdjustment_Decide", new { AdjustmentId = adjustmentId, Approve = approve, Remarks = remarks, UserId = userId }, ct);
    public Task<IReadOnlyCollection<AttendanceMonthlyReportDto>> GetMonthlyAttendanceReportAsync(AttendanceMonthlyReportQuery query, CancellationToken ct) => QueryAsync<AttendanceMonthlyReportDto>("sp_HR_Attendance_MonthlyReport", new { query.EmployeeId, query.Month, query.Year }, ct);
    public Task<IReadOnlyCollection<AttendanceDepartmentReportDto>> GetDepartmentAttendanceReportAsync(AttendanceDepartmentReportQuery query, CancellationToken ct) => QueryAsync<AttendanceDepartmentReportDto>("sp_HR_Attendance_DepartmentReport", query, ct);

    public Task<LeaveApplicationDto> ApplyLeaveAsync(ApplyLeaveCommand command, long? userId, CancellationToken ct) => QueryWithStatusAsync<LeaveApplicationDto>("sp_HR_Leave_Apply", new { command.EmployeeId, command.LeaveTypeId, command.StartDate, command.EndDate, command.Reason, UserId = userId }, ct);
    public Task<LeaveApplicationDto> ActOnLeaveAsync(long leaveApplicationId, string action, long? employeeId, string? remarks, long? userId, CancellationToken ct) => QueryWithStatusAsync<LeaveApplicationDto>("sp_HR_Leave_Action", new { LeaveApplicationId = leaveApplicationId, Action = action, EmployeeId = employeeId, Remarks = remarks, UserId = userId }, ct);
    public Task<PagedResult<LeaveApplicationDto>> GetLeavesAsync(GetLeavesQuery query, CancellationToken ct) => QueryPagedAsync<LeaveApplicationDto>("sp_HR_Leave_GetList", query, query.PageNumber, query.PageSize, ct);
    public Task<IReadOnlyCollection<LeaveBalanceDto>> GetLeaveBalanceAsync(long employeeId, CancellationToken ct) => QueryAsync<LeaveBalanceDto>("sp_HR_Leave_GetBalance", new { EmployeeId = employeeId }, ct);
    public Task<PagedResult<LeaveApplicationDto>> GetPendingLeaveApprovalsAsync(GetPendingLeaveApprovalsQuery query, CancellationToken ct) => QueryPagedAsync<LeaveApplicationDto>("sp_HR_Leave_GetPendingApprovals", query, query.PageNumber, query.PageSize, ct);

    public async Task<PayrollRunDto> ProcessPayrollAsync(ProcessPayrollCommand command, long? userId, CancellationToken ct)
    {
        var row = await QueryWithStatusAsync<PayrollRunRow>("sp_HR_Payroll_Process", new { command.PayrollMonth, command.PayrollYear, UserId = userId }, ct);
        var result = MapPayrollRun(row);
        return await GetPayrollRunAsync(result.Id, ct) ?? result;
    }

    public async Task<PayrollRunDto> ApprovePayrollAsync(long payrollRunId, long? userId, CancellationToken ct)
    {
        var row = await QueryWithStatusAsync<PayrollRunRow>("sp_HR_Payroll_Approve", new { PayrollRunId = payrollRunId, UserId = userId }, ct);
        var result = MapPayrollRun(row);
        return await GetPayrollRunAsync(result.Id, ct) ?? result;
    }

    public async Task<PayrollRunDto?> GetPayrollRunAsync(long id, CancellationToken ct)
    {
        var row = await QuerySingleAsync<PayrollRunRow>("sp_HR_Payroll_GetRun", new { Id = id }, ct);
        if (row is null) return null;
        var details = await QueryAsync<PayrollDetailDto>("sp_HR_Payroll_GetRunDetails", new { PayrollRunId = id }, ct);
        return MapPayrollRun(row) with { Details = details };
    }

    public Task<IReadOnlyCollection<PayrollDetailDto>> GetPayrollHistoryAsync(long employeeId, CancellationToken ct) => QueryAsync<PayrollDetailDto>("sp_HR_Payroll_GetHistory", new { EmployeeId = employeeId }, ct);
    public Task<PayslipDto?> GetPayslipAsync(GetPayslipQuery query, CancellationToken ct) => QuerySingleAsync<PayslipDto>("sp_HR_Payroll_GetPayslip", query, ct);

    private async Task<IReadOnlyCollection<T>> QueryAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T?> QuerySingleAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T> QueryScalarAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        var command = new CommandDefinition(procedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
        return await connection.QuerySingleAsync<T>(command);
    }

    private async Task<T> QueryWithStatusAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<OperationResult> ExecuteStatusAsync(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, procedure, parameters, ct);
    }

    private async Task<PagedResult<T>> QueryPagedAsync<T>(string procedure, object parameters, int pageNumber, int pageSize, CancellationToken ct)
    {
        var rows = await QueryAsync<T>(procedure, parameters, ct);
        var totalCountProperty = typeof(T).GetProperty("TotalCount");
        var totalCount = rows.FirstOrDefault() is { } first && totalCountProperty?.GetValue(first) is int count ? count : 0;
        return new PagedResult<T>(rows, pageNumber, pageSize, totalCount);
    }

    private static object PagedParameters(HrPagedQuery query) => new
    {
        query.Search,
        query.IsActive,
        query.PageNumber,
        query.PageSize,
        query.SortBy,
        query.SortDirection
    };

    private static DynamicParameters ShiftParameters(long? id, object command, long? userId)
    {
        dynamic value = command;
        var parameters = new DynamicParameters();
        if (id.HasValue) parameters.Add("Id", id.Value);
        parameters.Add("ShiftCode", (string)value.ShiftCode);
        parameters.Add("ShiftName", (string)value.ShiftName);
        parameters.Add("StartTime", (TimeSpan)value.StartTime);
        parameters.Add("EndTime", (TimeSpan)value.EndTime);
        parameters.Add("GraceMinutes", (int)value.GraceMinutes);
        parameters.Add("IsNightShift", (bool)value.IsNightShift);
        parameters.Add("WeeklyHours", (decimal)value.WeeklyHours);
        parameters.Add("IsActive", (bool)value.IsActive);
        parameters.Add("UserId", userId);
        return parameters;
    }

    private static DynamicParameters EmployeeParameters(long? id, object command, long? userId, EmployeeBankAccountRequest? bankDetails)
    {
        dynamic value = command;
        var parameters = new DynamicParameters();
        if (id.HasValue) parameters.Add("Id", id.Value);
        parameters.Add("EmployeeCode", (string)value.EmployeeCode);
        parameters.Add("FirstName", (string)value.FirstName);
        parameters.Add("LastName", (string?)value.LastName);
        parameters.Add("Gender", (int)value.Gender);
        parameters.Add("DateOfBirth", (DateTime?)value.DateOfBirth);
        parameters.Add("JoiningDate", (DateTime)value.JoiningDate);
        parameters.Add("Mobile", (string?)value.Mobile);
        parameters.Add("Email", (string?)value.Email);
        parameters.Add("DepartmentId", (long)value.DepartmentId);
        parameters.Add("DesignationId", (long)value.DesignationId);
        parameters.Add("ReportingManagerId", (long?)value.ReportingManagerId);
        parameters.Add("ShiftId", (long)value.ShiftId);
        parameters.Add("EmploymentType", (int)value.EmploymentType);
        parameters.Add("Status", (int)value.Status);
        parameters.Add("ProfilePhotoUrl", (string?)value.ProfilePhotoUrl);
        parameters.Add("AddressesJson", JsonSerializer.Serialize(value.Addresses, JsonOptions));
        if (!id.HasValue) parameters.Add("BankDetailsJson", bankDetails is null ? null : JsonSerializer.Serialize(bankDetails, JsonOptions));
        parameters.Add("UserId", userId);
        return parameters;
    }

    private static PayrollRunDto MapPayrollRun(PayrollRunRow row) =>
        new(row.Id, row.PayrollMonth, row.PayrollYear, row.Status, row.CreatedOn, row.UpdatedOn);

    private sealed record PayrollRunRow(long Id, int PayrollMonth, int PayrollYear, int Status, DateTime CreatedOn, DateTime? UpdatedOn);
}
