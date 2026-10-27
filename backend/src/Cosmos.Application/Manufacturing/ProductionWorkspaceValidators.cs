using Cosmos.Contracts.Manufacturing;
using FluentValidation;

namespace Cosmos.Application.Manufacturing;

public sealed class ProductionOrderDraftValidator : AbstractValidator<ProductionOrderDraftRequest>
{
    public ProductionOrderDraftValidator()
    {
        RuleFor(x => x.BusinessDate).NotEmpty();
        RuleFor(x => x.PlannedStart).NotEmpty();
        RuleFor(x => x.DueDate).GreaterThanOrEqualTo(x => x.PlannedStart);
        RuleFor(x => x.ItemId).GreaterThan(0); RuleFor(x => x.BomId).GreaterThan(0);
        RuleFor(x => x.RoutingId).GreaterThan(0); RuleFor(x => x.PlannedQuantity).GreaterThan(0).PrecisionScale(22, 6, true);
        RuleFor(x => x.MachineId).GreaterThan(0); RuleFor(x => x.MouldId).GreaterThan(0); RuleFor(x => x.ShiftId).GreaterThan(0);
        RuleFor(x => x.Notes).MaximumLength(1000); RuleFor(x => x.Reference).MaximumLength(100);
        RuleFor(x => x.SourceLineId).NotEmpty().MaximumLength(100).When(x => x.SourcePlanId.HasValue);
    }
}
public sealed class ProductionCompletionValidator : AbstractValidator<ProductionCompletionRequest>
{
    public ProductionCompletionValidator()
    {
        RuleFor(x => x.BusinessDate).NotEmpty(); RuleFor(x => x.OccurredAt).NotEmpty();
        RuleFor(x => x.GoodOutput).GreaterThanOrEqualTo(0).PrecisionScale(22, 6, true);
        RuleFor(x => x.RejectedOutput).GreaterThanOrEqualTo(0).PrecisionScale(22, 6, true);
        RuleFor(x => x).Must(x => x.GoodOutput + x.RejectedOutput > 0).WithMessage("Completion output must be positive.");
        RuleFor(x => x.MachineId).GreaterThan(0); RuleFor(x => x.MouldId).GreaterThan(0); RuleFor(x => x.ShiftId).GreaterThan(0);
        RuleFor(x => x.Materials).NotEmpty().Must(x => x.Select(y => y.ItemId).Distinct().Count() == x.Count);
        RuleForEach(x => x.Materials).ChildRules(m =>
        {
            m.RuleFor(x => x.ItemId).GreaterThan(0); m.RuleFor(x => x.UnitId).GreaterThan(0);
            m.RuleFor(x => x.ConsumedQuantity).GreaterThanOrEqualTo(0).PrecisionScale(22, 6, true);
            m.RuleFor(x => x.ScrapQuantity).GreaterThanOrEqualTo(0).PrecisionScale(22, 6, true);
            m.RuleFor(x => x.ReturnedQuantity).GreaterThanOrEqualTo(0).PrecisionScale(22, 6, true);
        });
        RuleFor(x => x.VarianceReason).MaximumLength(1000); RuleFor(x => x.SourceReference).MaximumLength(100);
    }
}
