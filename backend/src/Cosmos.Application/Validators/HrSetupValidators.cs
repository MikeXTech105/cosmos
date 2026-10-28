using Cosmos.Application.HR;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class GetPayrollRunsValidator : AbstractValidator<GetPayrollRunsQuery>
{
    public GetPayrollRunsValidator() { RuleFor(x => x.Search).MaximumLength(100); RuleFor(x => x.PageNumber).GreaterThan(0); RuleFor(x => x.PageSize).InclusiveBetween(1, 100); }
}

public sealed class SaveEmployeeLeaveEntitlementValidator : AbstractValidator<SaveEmployeeLeaveEntitlementCommand>
{
    public SaveEmployeeLeaveEntitlementValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.LeaveTypeId).GreaterThan(0);
        RuleFor(x => x.OpeningBalance).InclusiveBetween(0, 999999.99m).PrecisionScale(8, 2, false);
    }
}

public sealed class SaveLeaveTypeValidator : AbstractValidator<SaveLeaveTypeCommand>
{
    public SaveLeaveTypeValidator()
    {
        RuleFor(x => x.LeaveCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.LeaveName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.AnnualQuota).InclusiveBetween(0, 999999.99m).PrecisionScale(8, 2, false);
    }
}
public sealed class SaveSalaryComponentValidator : AbstractValidator<SaveSalaryComponentCommand>
{
    public SaveSalaryComponentValidator()
    {
        RuleFor(x => x.ComponentName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.ComponentType).InclusiveBetween(1, 2);
    }
}
public sealed class SaveSalaryStructureValidator : AbstractValidator<SaveSalaryStructureCommand>
{
    public SaveSalaryStructureValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Components).NotNull().NotEmpty();
        RuleFor(x => x.Components).Must(x => x is not null && x.Select(r => r.SalaryComponentId).Distinct().Count() == x.Count).WithMessage("Each salary component can appear only once.");
        RuleForEach(x => x.Components).ChildRules(row => {
            row.RuleFor(x => x.SalaryComponentId).GreaterThan(0);
            row.RuleFor(x => x.Amount).InclusiveBetween(0, 9999999999999999.99m).PrecisionScale(18, 2, false);
        });
    }
}
public sealed class AssignSalaryStructureValidator : AbstractValidator<AssignSalaryStructureCommand>
{
    public AssignSalaryStructureValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.SalaryStructureId).GreaterThan(0);
        RuleFor(x => x.EffectiveDate).NotEqual(default(DateOnly));
    }
}
