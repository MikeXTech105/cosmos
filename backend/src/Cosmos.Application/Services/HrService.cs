using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.HR;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.HR;
using Cosmos.Domain.HR;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Application.Services;

public sealed partial class HrService : IHrService
{
    private readonly IHrRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly ICurrentUser _currentUser;
    private readonly IServiceProvider _services;

    public HrService(IHrRepository repository, IAuditRepository auditRepository, ICurrentUser currentUser, IServiceProvider services)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _currentUser = currentUser;
        _services = services;
    }

    private long? UserId => _currentUser.UserId;

    public async Task<ApiResponse<DepartmentDto>> GetDepartmentAsync(long id, CancellationToken ct) =>
        ApiResponse<DepartmentDto>.Success(await _repository.GetDepartmentAsync(id, ct) ?? throw NotFound("Department"));

    public async Task<ApiResponse<PagedResult<DepartmentDto>>> GetDepartmentsAsync(HrPagedQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<DepartmentDto>>.Success(await _repository.GetDepartmentsAsync(query, ct));
    }

    public async Task<ApiResponse<DepartmentDto>> CreateDepartmentAsync(CreateDepartmentCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.CreateDepartmentAsync(command, UserId, ct);
        await AuditAsync("HR.Departments", result.Id, "Create", null, result, ct);
        return ApiResponse<DepartmentDto>.Success(result, "Department created.");
    }

    public async Task<ApiResponse<DepartmentDto>> UpdateDepartmentAsync(long id, UpdateDepartmentCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct, id);
        var old = await _repository.GetDepartmentAsync(id, ct) ?? throw NotFound("Department");
        var result = await _repository.UpdateDepartmentAsync(id, command, UserId, ct);
        await AuditAsync("HR.Departments", id, "Update", old, result, ct);
        return ApiResponse<DepartmentDto>.Success(result, "Department updated.");
    }

    public async Task<ApiResponse> DeleteDepartmentAsync(long id, CancellationToken ct) =>
        await DeleteAsync("HR.Departments", "Department", id, () => _repository.GetDepartmentAsync(id, ct), () => _repository.DeleteDepartmentAsync(id, UserId, ct), ct);

    public async Task<ApiResponse<DesignationDto>> GetDesignationAsync(long id, CancellationToken ct) =>
        ApiResponse<DesignationDto>.Success(await _repository.GetDesignationAsync(id, ct) ?? throw NotFound("Designation"));

    public async Task<ApiResponse<PagedResult<DesignationDto>>> GetDesignationsAsync(HrPagedQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<DesignationDto>>.Success(await _repository.GetDesignationsAsync(query, ct));
    }

    public async Task<ApiResponse<DesignationDto>> CreateDesignationAsync(CreateDesignationCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.CreateDesignationAsync(command, UserId, ct);
        await AuditAsync("HR.Designations", result.Id, "Create", null, result, ct);
        return ApiResponse<DesignationDto>.Success(result, "Designation created.");
    }

    public async Task<ApiResponse<DesignationDto>> UpdateDesignationAsync(long id, UpdateDesignationCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct, id);
        var old = await _repository.GetDesignationAsync(id, ct) ?? throw NotFound("Designation");
        var result = await _repository.UpdateDesignationAsync(id, command, UserId, ct);
        await AuditAsync("HR.Designations", id, "Update", old, result, ct);
        return ApiResponse<DesignationDto>.Success(result, "Designation updated.");
    }

    public async Task<ApiResponse> DeleteDesignationAsync(long id, CancellationToken ct) =>
        await DeleteAsync("HR.Designations", "Designation", id, () => _repository.GetDesignationAsync(id, ct), () => _repository.DeleteDesignationAsync(id, UserId, ct), ct);

    public async Task<ApiResponse<ShiftDto>> GetShiftAsync(long id, CancellationToken ct) =>
        ApiResponse<ShiftDto>.Success(await _repository.GetShiftAsync(id, ct) ?? throw NotFound("Shift"));

    public async Task<ApiResponse<PagedResult<ShiftDto>>> GetShiftsAsync(HrPagedQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<ShiftDto>>.Success(await _repository.GetShiftsAsync(query, ct));
    }

    public async Task<ApiResponse<ShiftDto>> CreateShiftAsync(CreateShiftCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.CreateShiftAsync(command, UserId, ct);
        await AuditAsync("HR.Shifts", result.Id, "Create", null, result, ct);
        return ApiResponse<ShiftDto>.Success(result, "Shift created.");
    }

    public async Task<ApiResponse<ShiftDto>> UpdateShiftAsync(long id, UpdateShiftCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct, id);
        var old = await _repository.GetShiftAsync(id, ct) ?? throw NotFound("Shift");
        var result = await _repository.UpdateShiftAsync(id, command, UserId, ct);
        await AuditAsync("HR.Shifts", id, "Update", old, result, ct);
        return ApiResponse<ShiftDto>.Success(result, "Shift updated.");
    }

    public async Task<ApiResponse> DeleteShiftAsync(long id, CancellationToken ct) =>
        await DeleteAsync("HR.Shifts", "Shift", id, () => _repository.GetShiftAsync(id, ct), () => _repository.DeleteShiftAsync(id, UserId, ct), ct);

    public async Task<ApiResponse<EmployeeDto>> GetEmployeeAsync(long id, CancellationToken ct) =>
        ApiResponse<EmployeeDto>.Success(await _repository.GetEmployeeAsync(id, ct) ?? throw NotFound("Employee"));

    public async Task<ApiResponse<PagedResult<EmployeeListItemDto>>> GetEmployeesAsync(GetEmployeesQuery query, CancellationToken ct)
    {
        await ValidateAsync(query, ct);
        return ApiResponse<PagedResult<EmployeeListItemDto>>.Success(await _repository.GetEmployeesAsync(query, ct));
    }

    public async Task<ApiResponse<EmployeeDto>> CreateEmployeeAsync(CreateEmployeeCommand command, CancellationToken ct)
    {
        command = EmployeeInputNormalizer.Normalize(command);
        await ValidateAsync(command, ct);
        var result = await _repository.CreateEmployeeAsync(command, UserId, ct);
        await AuditAsync("HR.Employees", result.Id, "Create", null, result, ct);
        return ApiResponse<EmployeeDto>.Success(result, "Employee created.");
    }

    public async Task<ApiResponse<EmployeeDto>> UpdateEmployeeAsync(long id, UpdateEmployeeCommand command, CancellationToken ct)
    {
        var old = await _repository.GetEmployeeAsync(id, ct) ?? throw NotFound("Employee");
        command = EmployeeInputNormalizer.Normalize(command);
        await ValidateAsync(command, ct, id);
        EnsureEmployeeStatusTransition(old, command);
        var result = await _repository.UpdateEmployeeAsync(id, command, UserId, ct);
        await AuditAsync("HR.Employees", id, "Update", old, result, ct);
        return ApiResponse<EmployeeDto>.Success(result, "Employee updated.");
    }

    public async Task<ApiResponse<EmployeeDto>> ResignEmployeeAsync(long id, ResignEmployeeCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct, id);
        var old = await _repository.GetEmployeeAsync(id, ct) ?? throw NotFound("Employee");
        var result = await _repository.ResignEmployeeAsync(id, command, UserId, ct);
        await AuditAsync("HR.Employees", id, "Resign", old, result, ct);
        return ApiResponse<EmployeeDto>.Success(result, "Employee resigned.");
    }

    public async Task<ApiResponse<EmployeeDto>> RejoinEmployeeAsync(long id, RejoinEmployeeCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct, id);
        var old = await _repository.GetEmployeeAsync(id, ct) ?? throw NotFound("Employee");
        var result = await _repository.RejoinEmployeeAsync(id, command, UserId, ct);
        await AuditAsync("HR.Employees", id, "Rejoin", old, result, ct);
        return ApiResponse<EmployeeDto>.Success(result, "Employee rejoined.");
    }

    public async Task<ApiResponse> DeleteEmployeeAsync(long id, CancellationToken ct) =>
        await DeleteAsync("HR.Employees", "Employee", id, () => _repository.GetEmployeeAsync(id, ct), () => _repository.DeleteEmployeeAsync(id, UserId, ct), ct);

    public async Task<ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>> GetEmployeeDropdownAsync(string? search, bool includeResigned, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>.Success(await _repository.GetEmployeeDropdownAsync(search, includeResigned, ct));

    public async Task<ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>> GetReportingManagersAsync(long? departmentId, long? excludingEmployeeId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<EmployeeDropdownDto>>.Success(await _repository.GetReportingManagersAsync(departmentId, excludingEmployeeId, ct));

    public async Task<ApiResponse<IReadOnlyCollection<EmployeeDocumentDto>>> GetEmployeeDocumentsAsync(long employeeId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<EmployeeDocumentDto>>.Success(await _repository.GetEmployeeDocumentsAsync(employeeId, ct));

    public async Task<ApiResponse<EmployeeDocumentDto>> AddEmployeeDocumentAsync(long employeeId, AddEmployeeDocumentCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.AddEmployeeDocumentAsync(employeeId, command, UserId, ct);
        await AuditAsync("HR.EmployeeDocuments", result.Id, "Create", null, result, ct);
        return ApiResponse<EmployeeDocumentDto>.Success(result, "Employee document added.");
    }

    public async Task<ApiResponse> DeleteEmployeeDocumentAsync(long documentId, CancellationToken ct)
    {
        var result = await _repository.DeleteEmployeeDocumentAsync(documentId, UserId, ct);
        EnsureSuccess(result);
        await AuditAsync("HR.EmployeeDocuments", documentId, "Delete", new { Id = documentId }, null, ct);
        return ApiResponse.Success(result.Message);
    }

    public async Task<ApiResponse<IReadOnlyCollection<EmployeeBankAccountDto>>> GetEmployeeBankDetailsAsync(long employeeId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<EmployeeBankAccountDto>>.Success(await _repository.GetEmployeeBankDetailsAsync(employeeId, ct));

    public async Task<ApiResponse<EmployeeBankAccountDto>> AddEmployeeBankDetailsAsync(long employeeId, AddEmployeeBankDetailsCommand command, CancellationToken ct)
    {
        command = EmployeeInputNormalizer.Normalize(command);
        await ValidateAsync(command, ct);
        var result = await _repository.AddEmployeeBankDetailsAsync(employeeId, command, UserId, ct);
        await AuditAsync("HR.EmployeeBankAccounts", result.Id, "Create", null, result, ct);
        return ApiResponse<EmployeeBankAccountDto>.Success(result, "Employee bank details added.");
    }

    public Task<ApiResponse<AttendanceDto>> CheckInAsync(AttendanceCheckInCommand command, CancellationToken ct) =>
        MutateAsync("HR.Attendance", "CheckIn", () => _repository.CheckInAsync(command, UserId, ct), ct);

    public Task<ApiResponse<AttendanceDto>> CheckOutAsync(AttendanceCheckOutCommand command, CancellationToken ct) =>
        MutateAsync("HR.Attendance", "CheckOut", () => _repository.CheckOutAsync(command, UserId, ct), ct);

    public async Task<ApiResponse<AttendanceDto>> ManualAttendanceAsync(AttendanceManualEntryCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        return await MutateAsync("HR.Attendance", "ManualEntry", () => _repository.ManualAttendanceAsync(command, UserId, ct), ct);
    }

    public async Task<ApiResponse<PagedResult<AttendanceDto>>> GetAttendanceAsync(GetAttendanceQuery query, CancellationToken ct) =>
        ApiResponse<PagedResult<AttendanceDto>>.Success(await _repository.GetAttendanceAsync(query, ct));

    public async Task<ApiResponse<IReadOnlyCollection<AttendanceDto>>> GetEmployeeAttendanceAsync(long employeeId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<AttendanceDto>>.Success(await _repository.GetEmployeeAttendanceAsync(employeeId, fromDate, toDate, ct));

    public async Task<ApiResponse<AttendanceAdjustmentDto>> RequestAttendanceAdjustmentAsync(AttendanceAdjustmentRequestCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.RequestAttendanceAdjustmentAsync(command, UserId, ct);
        await AuditAsync("HR.AttendanceAdjustments", result.Id, "Create", null, result, ct);
        return ApiResponse<AttendanceAdjustmentDto>.Success(result, "Attendance adjustment requested.");
    }

    public async Task<ApiResponse<AttendanceAdjustmentDto>> DecideAttendanceAdjustmentAsync(AttendanceAdjustmentDecisionCommand command, bool approve, CancellationToken ct)
    {
        var result = await _repository.DecideAttendanceAdjustmentAsync(command.AdjustmentId, approve, command.Remarks, UserId, ct);
        await AuditAsync("HR.AttendanceAdjustments", result.Id, approve ? "Approve" : "Reject", null, result, ct);
        return ApiResponse<AttendanceAdjustmentDto>.Success(result, approve ? "Attendance adjustment approved." : "Attendance adjustment rejected.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<AttendanceMonthlyReportDto>>> GetMonthlyAttendanceReportAsync(AttendanceMonthlyReportQuery query, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<AttendanceMonthlyReportDto>>.Success(await _repository.GetMonthlyAttendanceReportAsync(query, ct));

    public async Task<ApiResponse<IReadOnlyCollection<AttendanceDepartmentReportDto>>> GetDepartmentAttendanceReportAsync(AttendanceDepartmentReportQuery query, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<AttendanceDepartmentReportDto>>.Success(await _repository.GetDepartmentAttendanceReportAsync(query, ct));

    public async Task<ApiResponse<LeaveApplicationDto>> ApplyLeaveAsync(ApplyLeaveCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.ApplyLeaveAsync(command, UserId, ct);
        await AuditAsync("HR.LeaveApplications", result.Id, "Apply", null, result, ct);
        return ApiResponse<LeaveApplicationDto>.Success(result, "Leave application submitted.");
    }

    public async Task<ApiResponse<LeaveApplicationDto>> ActOnLeaveAsync(LeaveActionCommand command, string action, CancellationToken ct)
    {
        var result = await _repository.ActOnLeaveAsync(command.LeaveApplicationId, action, command.EmployeeId, command.Remarks, UserId, ct);
        await AuditAsync("HR.LeaveApplications", result.Id, action, null, result, ct);
        var message = action switch
        {
            "Approve" => "Leave application approved.",
            "Reject" => "Leave application rejected.",
            "Cancel" => "Leave application cancelled.",
            _ => "Leave application updated."
        };
        return ApiResponse<LeaveApplicationDto>.Success(result, message);
    }

    public async Task<ApiResponse<PagedResult<LeaveApplicationDto>>> GetLeavesAsync(GetLeavesQuery query, CancellationToken ct) =>
        ApiResponse<PagedResult<LeaveApplicationDto>>.Success(await _repository.GetLeavesAsync(query, ct));

    public async Task<ApiResponse<IReadOnlyCollection<LeaveBalanceDto>>> GetLeaveBalanceAsync(long employeeId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<LeaveBalanceDto>>.Success(await _repository.GetLeaveBalanceAsync(employeeId, ct));

    public async Task<ApiResponse<PagedResult<LeaveApplicationDto>>> GetPendingLeaveApprovalsAsync(GetPendingLeaveApprovalsQuery query, CancellationToken ct) =>
        ApiResponse<PagedResult<LeaveApplicationDto>>.Success(await _repository.GetPendingLeaveApprovalsAsync(query, ct));

    public async Task<ApiResponse<PayrollRunDto>> ProcessPayrollAsync(ProcessPayrollCommand command, CancellationToken ct)
    {
        await ValidateAsync(command, ct);
        var result = await _repository.ProcessPayrollAsync(command, UserId, ct);
        await AuditAsync("HR.PayrollRuns", result.Id, "Process", null, result, ct);
        return ApiResponse<PayrollRunDto>.Success(result, "Payroll processed.");
    }

    public async Task<ApiResponse<PayrollRunDto>> ApprovePayrollAsync(ApprovePayrollCommand command, CancellationToken ct)
    {
        var old = await _repository.GetPayrollRunAsync(command.PayrollRunId, ct) ?? throw NotFound("Payroll run");
        var result = await _repository.ApprovePayrollAsync(command.PayrollRunId, UserId, ct);
        await AuditAsync("HR.PayrollRuns", result.Id, "Approve", old, result, ct);
        return ApiResponse<PayrollRunDto>.Success(result, "Payroll approved.");
    }

    public async Task<ApiResponse<PayrollRunDto>> GetPayrollRunAsync(long id, CancellationToken ct) =>
        ApiResponse<PayrollRunDto>.Success(await _repository.GetPayrollRunAsync(id, ct) ?? throw NotFound("Payroll run"));

    public async Task<ApiResponse<IReadOnlyCollection<PayrollDetailDto>>> GetPayrollHistoryAsync(long employeeId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<PayrollDetailDto>>.Success(await _repository.GetPayrollHistoryAsync(employeeId, ct));

    public async Task<ApiResponse<PayslipDto>> GetPayslipAsync(GetPayslipQuery query, CancellationToken ct) =>
        ApiResponse<PayslipDto>.Success(await _repository.GetPayslipAsync(query, ct) ?? throw NotFound("Payslip"));

    private async Task<ApiResponse<T>> MutateAsync<T>(string entity, string action, Func<Task<T>> operation, CancellationToken ct)
    {
        var result = await operation();
        var id = typeof(T).GetProperty("Id")?.GetValue(result)?.ToString() ?? "0";
        await _auditRepository.AddAsync(new AuditEntryRequest(entity, id, action, null, AuditSerializer.Serialize(result), null), ct);
        return ApiResponse<T>.Success(result);
    }

    private async Task<ApiResponse> DeleteAsync<T>(string entity, string label, long id, Func<Task<T?>> get, Func<Task<OperationResult>> delete, CancellationToken ct) where T : class
    {
        var old = await get() ?? throw NotFound(label);
        var result = await delete();
        EnsureSuccess(result);
        await AuditAsync(entity, id, "Delete", old, null, ct);
        return ApiResponse.Success(result.Message);
    }

    private async Task ValidateAsync<T>(T request, CancellationToken ct, long? routeId = null)
    {
        var validator = _services.GetService<IValidator<T>>();
        if (validator is null) return;
        await ValidationRunner.ValidateAsync(validator, request, context =>
        {
            if (routeId.HasValue) context.RootContextData["Id"] = routeId.Value;
        }, ct);
    }

    private static void EnsureEmployeeStatusTransition(EmployeeDto existing, UpdateEmployeeCommand command)
    {
        const int resigned = (int)EmployeeStatus.Resigned;

        if (command.ReportingManagerId == existing.Id)
        {
            throw ValidationFailure(nameof(command.ReportingManagerId), "Employee cannot report to themselves.");
        }

        if (existing.Status == resigned && command.Status != resigned)
        {
            throw ValidationFailure(nameof(command.Status), "A resigned employee must be rejoined through the rejoin endpoint.");
        }

        if (existing.Status != resigned && command.Status == resigned)
        {
            throw ValidationFailure(nameof(command.Status), "Use the resign endpoint to mark an employee as resigned.");
        }
    }

    private static CosmosException ValidationFailure(string field, string message) =>
        new(
            "Validation failed.",
            400,
            new[] { message },
            new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
            {
                [field] = new[] { message }
            });

    private Task AuditAsync(string entity, long id, string action, object? before, object? after, CancellationToken ct) =>
        _auditRepository.AddAsync(new AuditEntryRequest(entity, id.ToString(), action, before is null ? null : AuditSerializer.Serialize(before), after is null ? null : AuditSerializer.Serialize(after), null), ct);

    private static void EnsureSuccess(OperationResult result)
    {
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
    }

    private static NotFoundException NotFound(string entity) => new($"{entity} was not found.");
}
