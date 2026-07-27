using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Domain.ProcurementPlanning;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class ProcurementListQueryValidator : AbstractValidator<ProcurementListQuery>
{
    public ProcurementListQueryValidator() => AddPagingRules(this, x => x.PageNumber, x => x.PageSize);

    internal static void AddPagingRules<T>(AbstractValidator<T> validator, System.Linq.Expressions.Expression<Func<T, int>> page, System.Linq.Expressions.Expression<Func<T, int>> size)
    {
        validator.RuleFor(page).GreaterThan(0);
        validator.RuleFor(size).InclusiveBetween(1, 200);
    }
}

public sealed class SaveSalesChannelRequestValidator : AbstractValidator<SaveSalesChannelRequest>
{
    public SaveSalesChannelRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20).Matches("^[A-Za-z0-9_-]+$");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class ChannelSkuMappingQueryValidator : AbstractValidator<ChannelSkuMappingQuery>
{
    public ChannelSkuMappingQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SalesChannelId).GreaterThan(0).When(x => x.SalesChannelId.HasValue);
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
    }
}

public sealed class SaveChannelSkuMappingRequestValidator : AbstractValidator<SaveChannelSkuMappingRequest>
{
    public SaveChannelSkuMappingRequestValidator()
    {
        RuleFor(x => x.SalesChannelId).GreaterThan(0);
        RuleFor(x => x.ChannelSku).NotEmpty().MaximumLength(150);
        RuleFor(x => x.ChannelProductName).MaximumLength(300);
        RuleFor(x => x.ItemId).GreaterThan(0);
    }
}

public sealed class SalesImportBatchQueryValidator : AbstractValidator<SalesImportBatchQuery>
{
    public SalesImportBatchQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class CancelSalesImportBatchRequestValidator : AbstractValidator<CancelSalesImportBatchRequest>
{
    public CancelSalesImportBatchRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class ManualSalesEntryRequestValidator : AbstractValidator<ManualSalesEntryRequest>
{
    public ManualSalesEntryRequestValidator()
    {
        RuleFor(x => x.SalesDate).NotEmpty();
        RuleFor(x => x.SalesChannelId).GreaterThan(0);
        RuleFor(x => x.ChannelSku).NotEmpty().MaximumLength(150);
        RuleFor(x => x.ChannelProductName).MaximumLength(300);
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class SalesHistoryQueryValidator : AbstractValidator<SalesHistoryQuery>
{
    public SalesHistoryQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.ImportBatchId).GreaterThan(0).When(x => x.ImportBatchId.HasValue);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class SaveProductBomRequestValidator : AbstractValidator<SaveProductBomRequest>
{
    public SaveProductBomRequestValidator()
    {
        RuleFor(x => x.Components).NotNull().Must(x => x.Count > 0).WithMessage("At least one BOM component is required.");
        RuleForEach(x => x.Components).SetValidator(new SaveBomComponentRequestValidator());
        RuleFor(x => x.Components)
            .Must(x => x.Where(y => y.IsActive).Select(y => y.ComponentItemId).Distinct().Count() == x.Count(y => y.IsActive))
            .WithMessage("Duplicate active BOM components are not allowed.");
    }
}

public sealed class SaveBomComponentRequestValidator : AbstractValidator<SaveBomComponentRequest>
{
    public SaveBomComponentRequestValidator()
    {
        RuleFor(x => x.ComponentItemId).GreaterThan(0);
        RuleFor(x => x.QuantityRequired).GreaterThan(0);
        RuleFor(x => x.UnitId).GreaterThan(0).When(x => x.UnitId.HasValue);
    }
}

public sealed class ProcurementSettingQueryValidator : AbstractValidator<ProcurementSettingQuery>
{
    public ProcurementSettingQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class SaveProcurementSettingRequestValidator : AbstractValidator<SaveProcurementSettingRequest>
{
    public SaveProcurementSettingRequestValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0);
        RuleFor(x => x.ConfiguredLeadTimeDays).GreaterThanOrEqualTo(0).When(x => x.ConfiguredLeadTimeDays.HasValue);
        RuleFor(x => x.LeadTimeOverrideDays).GreaterThanOrEqualTo(0).When(x => x.LeadTimeOverrideDays.HasValue);
        RuleFor(x => x.SafetyFactor).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MinimumOrderQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.OrderMultiple).GreaterThan(0).When(x => x.OrderMultiple.HasValue);
        RuleFor(x => x.RoundingRule).Must(x => Enum.IsDefined(typeof(PlanningRoundingRule), x));
        RuleFor(x => x).Must(x => x.ManualPlanning || x.ConfiguredLeadTimeDays.HasValue || x.LeadTimeOverrideDays.HasValue)
            .WithMessage("An effective lead time is required unless the item is manual planning.");
    }
}

public sealed class CreateLeadTimeHistoryRequestValidator : AbstractValidator<CreateLeadTimeHistoryRequest>
{
    public CreateLeadTimeHistoryRequestValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0);
        RuleFor(x => x.Reference).MaximumLength(100);
        RuleFor(x => x.ReceivedDate).GreaterThanOrEqualTo(x => x.OrderedDate);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class PlanningRequestValidator : AbstractValidator<PlanningRequest>
{
    public PlanningRequestValidator()
    {
        RuleFor(x => x.FromDate).NotEmpty();
        RuleFor(x => x.ToDate).NotEmpty().GreaterThanOrEqualTo(x => x.FromDate);
        RuleFor(x => x).Must(x => x.ToDate.DayNumber - x.FromDate.DayNumber + 1 <= 366).WithMessage("Planning date range cannot exceed 366 days.");
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class PlanningRunQueryValidator : AbstractValidator<PlanningRunQuery>
{
    public PlanningRunQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
        RuleFor(x => x.Status).Must(x => !x.HasValue || Enum.IsDefined(typeof(PlanningRunStatus), x.Value)).WithMessage("Status is invalid.");
    }
}

public sealed class UpdatePlanningLineRequestValidator : AbstractValidator<UpdatePlanningLineRequest>
{
    public UpdatePlanningLineRequestValidator()
    {
        RuleFor(x => x.FinalQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.AdjustmentReason).MaximumLength(1000);
    }
}

public sealed class CancelPlanningRunRequestValidator : AbstractValidator<CancelPlanningRunRequest>
{
    public CancelPlanningRunRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class PlanningRunLineQueryValidator : AbstractValidator<PlanningRunLineQuery>
{
    public PlanningRunLineQueryValidator() => RuleFor(x => x.Search).MaximumLength(200);
}
