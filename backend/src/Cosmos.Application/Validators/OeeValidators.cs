using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Oee;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class OeeMasterListQueryValidator : AbstractValidator<OeeMasterListQuery>
{
    public OeeMasterListQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortDirection).Must(IsSortDirection);
    }

    private static bool IsSortDirection(string value) => string.Equals(value, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "DESC", StringComparison.OrdinalIgnoreCase);
}

public sealed class CreateOeeMachineValidator : AbstractValidator<CreateOeeMachineRequest>
{
    public CreateOeeMachineValidator()
    {
        RuleFor(x => x.MachineCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.MachineName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Tonnage).MaximumLength(50);
        RuleFor(x => x.Location).MaximumLength(150);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class CreateOeeMouldValidator : AbstractValidator<CreateOeeMouldRequest>
{
    public CreateOeeMouldValidator()
    {
        RuleFor(x => x.MouldName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TargetShotPerDay).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Cavity).GreaterThan(0).When(x => x.Cavity.HasValue);
        RuleFor(x => x.CycleTime).GreaterThanOrEqualTo(0).When(x => x.CycleTime.HasValue);
    }
}

public sealed class CreateOeeDowntimeReasonValidator : AbstractValidator<CreateOeeDowntimeReasonRequest>
{
    public CreateOeeDowntimeReasonValidator() => RuleFor(x => x.ReasonName).NotEmpty().MaximumLength(200);
}

public sealed class OeeProductionEntryLineValidator : AbstractValidator<OeeProductionEntryLineRequest>
{
    public OeeProductionEntryLineValidator(IOeeRepository repository)
    {
        RuleFor(x => x.MachineId).GreaterThan(0).MustAsync(repository.MachineExistsAsync).WithMessage("Machine was not found.");
        RuleFor(x => x.MouldId).GreaterThan(0).MustAsync(repository.MouldExistsAsync).WithMessage("Mould was not found.");
        RuleFor(x => x.DowntimeReasonId).NotNull().MustAsync(repository.DowntimeReasonExistsAsync).WithMessage("Downtime reason was not found.");
        RuleFor(x => x.MachineOnTime).Must(IsMachineOnTime).WithMessage("MachineOnTime must be 24 HR, 12 HR, or 0 HR.");
        RuleFor(x => x.ShotCount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Remarks).MaximumLength(500);
    }

    private static bool IsMachineOnTime(string value) => value is "24 HR" or "12 HR" or "0 HR";
}

public sealed class BulkCreateOeeProductionEntriesValidator : AbstractValidator<BulkCreateOeeProductionEntriesRequest>
{
    public BulkCreateOeeProductionEntriesValidator(IOeeRepository repository)
    {
        RuleFor(x => x.ProductionDate).NotEmpty();
        RuleFor(x => x.Entries).NotEmpty();
        RuleFor(x => x.Entries.Select(e => e.MachineId)).Must(ids => ids.Distinct().Count() == ids.Count()).WithMessage("Duplicate machine entries are not allowed for the same production date.");
        RuleForEach(x => x.Entries).SetValidator(new OeeProductionEntryLineValidator(repository));
    }
}

public sealed class UpdateOeeProductionEntryValidator : AbstractValidator<UpdateOeeProductionEntryRequest>
{
    public UpdateOeeProductionEntryValidator(IOeeRepository repository)
    {
        RuleFor(x => x.ProductionDate).NotEmpty();
        RuleFor(x => x.MachineId).GreaterThan(0).MustAsync(repository.MachineExistsAsync).WithMessage("Machine was not found.");
        RuleFor(x => x.MouldId).GreaterThan(0).MustAsync(repository.MouldExistsAsync).WithMessage("Mould was not found.");
        RuleFor(x => x.DowntimeReasonId).NotNull().MustAsync(repository.DowntimeReasonExistsAsync).WithMessage("Downtime reason was not found.");
        RuleFor(x => x.MachineOnTime).Must(x => x is "24 HR" or "12 HR" or "0 HR").WithMessage("MachineOnTime must be 24 HR, 12 HR, or 0 HR.");
        RuleFor(x => x.ShotCount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Remarks).MaximumLength(500);
    }
}

public sealed class OeeProductionEntryListQueryValidator : AbstractValidator<OeeProductionEntryListQuery>
{
    public OeeProductionEntryListQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortDirection).Must(x => string.Equals(x, "ASC", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DESC", StringComparison.OrdinalIgnoreCase));
        RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue);
    }
}

public sealed class OeeDashboardQueryValidator : AbstractValidator<OeeDashboardQuery>
{
    public OeeDashboardQueryValidator()
    {
        RuleFor(x => x.LastDays).GreaterThan(0).When(x => x.LastDays.HasValue);
        RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue);
    }
}

public sealed class OeeReportQueryValidator : AbstractValidator<OeeReportQuery>
{
    public OeeReportQueryValidator()
    {
        RuleFor(x => x.LastDays).GreaterThan(0).When(x => x.LastDays.HasValue);
        RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue);
    }
}
