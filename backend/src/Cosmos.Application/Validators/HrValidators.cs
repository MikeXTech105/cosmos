using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.HR;
using Cosmos.Domain.HR;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class HrPagedQueryValidator : AbstractValidator<HrPagedQuery>
{
    public HrPagedQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortDirection).Must(IsSortDirection).WithMessage("SortDirection must be ASC or DESC.");
    }

    private static bool IsSortDirection(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Equals("ASC", StringComparison.OrdinalIgnoreCase) || value.Equals("DESC", StringComparison.OrdinalIgnoreCase);
}

public sealed class CreateDepartmentValidator : AbstractValidator<CreateDepartmentCommand>
{
    public CreateDepartmentValidator(IHrRepository repository)
    {
        RuleFor(x => x.DepartmentCode).NotEmpty().MaximumLength(20)
            .MustAsync(async (value, ct) => !await repository.DepartmentValueExistsAsync("DepartmentCode", value, null, ct))
            .WithMessage("Department code already exists.");
        RuleFor(x => x.DepartmentName).NotEmpty().MaximumLength(200)
            .MustAsync(async (value, ct) => !await repository.DepartmentValueExistsAsync("DepartmentName", value, null, ct))
            .WithMessage("Department name already exists.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class UpdateDepartmentValidator : AbstractValidator<UpdateDepartmentCommand>
{
    public UpdateDepartmentValidator(IHrRepository repository)
    {
        RuleFor(x => x.DepartmentCode).NotEmpty().MaximumLength(20)
            .MustAsync(async (command, value, context, ct) => !await repository.DepartmentValueExistsAsync("DepartmentCode", value, RouteId(context), ct))
            .WithMessage("Department code already exists.");
        RuleFor(x => x.DepartmentName).NotEmpty().MaximumLength(200)
            .MustAsync(async (command, value, context, ct) => !await repository.DepartmentValueExistsAsync("DepartmentName", value, RouteId(context), ct))
            .WithMessage("Department name already exists.");
        RuleFor(x => x.Description).MaximumLength(500);
    }

    private static long? RouteId(ValidationContext<UpdateDepartmentCommand> context) =>
        context.RootContextData.TryGetValue("Id", out var value) ? value as long? : null;
}

public sealed class CreateDesignationValidator : AbstractValidator<CreateDesignationCommand>
{
    public CreateDesignationValidator(IHrRepository repository)
    {
        RuleFor(x => x.DesignationCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.DesignationName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DepartmentId).GreaterThan(0).MustAsync((id, ct) => repository.EntityExistsAsync("Department", id, ct)).WithMessage("Department was not found.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class UpdateDesignationValidator : AbstractValidator<UpdateDesignationCommand>
{
    public UpdateDesignationValidator(IHrRepository repository)
    {
        RuleFor(x => x.DesignationCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.DesignationName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DepartmentId).GreaterThan(0).MustAsync((id, ct) => repository.EntityExistsAsync("Department", id, ct)).WithMessage("Department was not found.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class CreateShiftValidator : AbstractValidator<CreateShiftCommand>
{
    public CreateShiftValidator() => AddRules();
    private void AddRules()
    {
        RuleFor(x => x.ShiftCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.ShiftName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.StartTime).NotNull();
        RuleFor(x => x.EndTime).NotNull();
        RuleFor(x => x.GraceMinutes).InclusiveBetween(0, 240);
        RuleFor(x => x.WeeklyHours).InclusiveBetween(0, 168);
    }
}

public sealed class UpdateShiftValidator : AbstractValidator<UpdateShiftCommand>
{
    public UpdateShiftValidator()
    {
        RuleFor(x => x.ShiftCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.ShiftName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.GraceMinutes).InclusiveBetween(0, 240);
        RuleFor(x => x.WeeklyHours).InclusiveBetween(0, 168);
    }
}

public sealed class CreateEmployeeValidator : AbstractValidator<CreateEmployeeCommand>
{
    public CreateEmployeeValidator(IHrRepository repository) => AddRules(repository, null);

    private void AddRules(IHrRepository repository, long? excludingId)
    {
        RuleFor(x => x.EmployeeCode).NotEmpty().MaximumLength(30)
            .MustAsync((value, ct) => Unique(repository, "EmployeeCode", value, excludingId, ct)).WithMessage("Employee code already exists.");
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).MaximumLength(100);
        RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Email))
            .MustAsync((value, ct) => Unique(repository, "Email", value!, excludingId, ct)).When(x => !string.IsNullOrWhiteSpace(x.Email)).WithMessage("Email already exists.");
        RuleFor(x => x.Mobile).MaximumLength(20)
            .MustAsync((value, ct) => Unique(repository, "Mobile", value!, excludingId, ct)).When(x => !string.IsNullOrWhiteSpace(x.Mobile)).WithMessage("Mobile already exists.");
        RuleFor(x => x.DepartmentId).MustAsync((id, ct) => repository.EntityExistsAsync("Department", id, ct)).WithMessage("Department was not found.");
        RuleFor(x => x.DesignationId).MustAsync((id, ct) => repository.EntityExistsAsync("Designation", id, ct)).WithMessage("Designation was not found.");
        RuleFor(x => x.ShiftId).MustAsync((id, ct) => repository.EntityExistsAsync("Shift", id, ct)).WithMessage("Shift was not found.");
        RuleFor(x => x.Gender).Must(x => Enum.IsDefined(typeof(Gender), x));
        RuleFor(x => x.EmploymentType).Must(x => Enum.IsDefined(typeof(EmploymentType), x));
        RuleFor(x => x.Status).Must(x => Enum.IsDefined(typeof(EmployeeStatus), x));
        RuleFor(x => x.Status).NotEqual((int)EmployeeStatus.Resigned)
            .WithMessage("Use the resign endpoint to mark an employee as resigned.");
        RuleForEach(x => x.Addresses).SetValidator(new EmployeeAddressRequestValidator());
        RuleFor(x => x.BankDetails).SetValidator(new EmployeeBankAccountRequestValidator()!).When(x => x.BankDetails is not null);
    }

    private static async Task<bool> Unique(IHrRepository repository, string field, string value, long? excludingId, CancellationToken ct) =>
        !await repository.EmployeeValueExistsAsync(field, value, excludingId, ct);
}

public sealed class UpdateEmployeeValidator : AbstractValidator<UpdateEmployeeCommand>
{
    public UpdateEmployeeValidator(IHrRepository repository)
    {
        RuleFor(x => x.EmployeeCode).NotEmpty().MaximumLength(30)
            .MustAsync(async (command, value, context, ct) => !await repository.EmployeeValueExistsAsync("EmployeeCode", value, RouteId(context), ct)).WithMessage("Employee code already exists.");
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).MaximumLength(100);
        RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Email))
            .MustAsync(async (command, value, context, ct) => string.IsNullOrWhiteSpace(value) || !await repository.EmployeeValueExistsAsync("Email", value, RouteId(context), ct)).WithMessage("Email already exists.");
        RuleFor(x => x.Mobile).MaximumLength(20)
            .MustAsync(async (command, value, context, ct) => string.IsNullOrWhiteSpace(value) || !await repository.EmployeeValueExistsAsync("Mobile", value, RouteId(context), ct)).WithMessage("Mobile already exists.");
        RuleFor(x => x.DateOfBirth).LessThan(x => x.JoiningDate).When(x => x.DateOfBirth.HasValue)
            .WithMessage("Date of birth must be before joining date.");
        RuleFor(x => x.JoiningDate).NotEmpty();
        RuleFor(x => x.DepartmentId).GreaterThan(0).MustAsync((id, ct) => repository.EntityExistsAsync("Department", id, ct)).WithMessage("Department was not found or is inactive.");
        RuleFor(x => x.DesignationId).GreaterThan(0).MustAsync((id, ct) => repository.EntityExistsAsync("Designation", id, ct)).WithMessage("Designation was not found or is inactive.");
        RuleFor(x => x.ReportingManagerId)
            .MustAsync(async (id, ct) => !id.HasValue || await repository.EntityExistsAsync("Employee", id.Value, ct))
            .WithMessage("Reporting manager was not found or is inactive.");
        RuleFor(x => x.ShiftId).GreaterThan(0).MustAsync((id, ct) => repository.EntityExistsAsync("Shift", id, ct)).WithMessage("Shift was not found or is inactive.");
        RuleFor(x => x.Gender).Must(x => Enum.IsDefined(typeof(Gender), x)).WithMessage("Gender must be a valid value.");
        RuleFor(x => x.EmploymentType).Must(x => Enum.IsDefined(typeof(EmploymentType), x)).WithMessage("Employment type must be a valid value.");
        RuleFor(x => x.Status).Must(x => Enum.IsDefined(typeof(EmployeeStatus), x)).WithMessage("Status must be a valid value.");
        RuleFor(x => x.ProfilePhotoUrl).MaximumLength(1000);
        RuleForEach(x => x.Addresses).SetValidator(new EmployeeAddressRequestValidator());
    }

    private static long? RouteId(ValidationContext<UpdateEmployeeCommand> context) =>
        context.RootContextData.TryGetValue("Id", out var value) && value is long id ? id : null;
}

public sealed class ResignEmployeeValidator : AbstractValidator<ResignEmployeeCommand>
{
    public ResignEmployeeValidator()
    {
        RuleFor(x => x.LastWorkingDate).NotEmpty();
        RuleFor(x => x.ResignationReason).MaximumLength(500);
    }
}

public sealed class RejoinEmployeeValidator : AbstractValidator<RejoinEmployeeCommand>
{
    public RejoinEmployeeValidator()
    {
        RuleFor(x => x.Remarks).MaximumLength(500);
    }
}

public sealed class GetEmployeesQueryValidator : AbstractValidator<GetEmployeesQuery>
{
    public GetEmployeesQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortDirection).Must(IsSortDirection).WithMessage("SortDirection must be ASC or DESC.");
        RuleFor(x => x.Status)
            .Must(IsEmployeeStatus)
            .WithMessage("Status must be active, inactive, resigned, terminated, or a valid employee status number.")
            .When(x => !string.IsNullOrWhiteSpace(x.Status));
    }

    private static bool IsSortDirection(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Equals("ASC", StringComparison.OrdinalIgnoreCase) || value.Equals("DESC", StringComparison.OrdinalIgnoreCase);

    private static bool IsEmployeeStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        if (int.TryParse(value, out var numeric)) return Enum.IsDefined(typeof(EmployeeStatus), numeric);
        return Enum.TryParse<EmployeeStatus>(value, ignoreCase: true, out _);
    }
}

public sealed class EmployeeAddressRequestValidator : AbstractValidator<EmployeeAddressRequest>
{
    public EmployeeAddressRequestValidator()
    {
        RuleFor(x => x.AddressType).NotEmpty().MaximumLength(30);
        RuleFor(x => x.AddressLine1).NotEmpty().MaximumLength(250);
        RuleFor(x => x.AddressLine2).MaximumLength(250);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.Country).MaximumLength(100);
        RuleFor(x => x.Pincode).MaximumLength(20);
    }
}

public sealed class EmployeeBankAccountRequestValidator : AbstractValidator<EmployeeBankAccountRequest>
{
    public EmployeeBankAccountRequestValidator()
    {
        RuleFor(x => x.BankName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.AccountNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.IFSCCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.BranchName).MaximumLength(150);
        RuleFor(x => x.UPIId).MaximumLength(100);
    }
}

public sealed class AddEmployeeDocumentValidator : AbstractValidator<AddEmployeeDocumentCommand>
{
    public AddEmployeeDocumentValidator()
    {
        RuleFor(x => x.DocumentType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.FilePath).NotEmpty().MaximumLength(1000);
    }
}

public sealed class AddEmployeeBankDetailsValidator : AbstractValidator<AddEmployeeBankDetailsCommand>
{
    public AddEmployeeBankDetailsValidator()
    {
        RuleFor(x => x.BankName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.AccountNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.IFSCCode).NotEmpty().MaximumLength(20);
    }
}

public sealed class AttendanceManualEntryValidator : AbstractValidator<AttendanceManualEntryCommand>
{
    public AttendanceManualEntryValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.AttendanceStatus).Must(x => Enum.IsDefined(typeof(AttendanceStatus), x));
        RuleFor(x => x).Must(x => !x.CheckInTime.HasValue || !x.CheckOutTime.HasValue || x.CheckOutTime > x.CheckInTime).WithMessage("Check-out must be after check-in.");
    }
}

public sealed class AttendanceAdjustmentRequestValidator : AbstractValidator<AttendanceAdjustmentRequestCommand>
{
    public AttendanceAdjustmentRequestValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.AttendanceId).GreaterThan(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

public sealed class ApplyLeaveValidator : AbstractValidator<ApplyLeaveCommand>
{
    public ApplyLeaveValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.LeaveTypeId).GreaterThan(0);
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

public sealed class ProcessPayrollValidator : AbstractValidator<ProcessPayrollCommand>
{
    public ProcessPayrollValidator()
    {
        RuleFor(x => x.PayrollMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.PayrollYear).InclusiveBetween(2000, 9999);
    }
}
