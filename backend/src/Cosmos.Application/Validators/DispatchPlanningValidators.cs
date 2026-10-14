using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Domain.DispatchPlanning;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class DispatchSkuSettingQueryValidator : AbstractValidator<DispatchSkuSettingQuery>
{
    public DispatchSkuSettingQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
    }
}

public sealed class SaveDispatchSkuSettingRequestValidator : AbstractValidator<SaveDispatchSkuSettingRequest>
{
    public SaveDispatchSkuSettingRequestValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.PackagingProfileId).GreaterThan(0).When(x => x.PackagingProfileId.HasValue);
        RuleFor(x => x.Tier).Must(x => Enum.IsDefined(typeof(DispatchTier), x));
        RuleFor(x => x.SafetyStockFactor).GreaterThan(0);
        RuleFor(x => x.RecurringDemandFactor).GreaterThan(0);
        RuleFor(x => x.MinimumDispatchQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.RoundingMode).Must(x => Enum.IsDefined(typeof(DispatchRoundingMode), x));
        RuleFor(x => x.AllocationPriority).GreaterThanOrEqualTo(0);
        RuleFor(x => x).Must(x => !x.EffectiveFrom.HasValue || !x.EffectiveTo.HasValue || x.EffectiveTo >= x.EffectiveFrom)
            .WithMessage("EffectiveTo cannot be earlier than EffectiveFrom.");
    }
}

public sealed class ValidateDispatchSnapshotImportRequestValidator : AbstractValidator<ValidateDispatchSnapshotImportRequest>
{
    public ValidateDispatchSnapshotImportRequestValidator()
    {
        RuleFor(x => x.OriginalFileName).NotEmpty().MaximumLength(260);
        RuleFor(x => x.FileHash).Must(x => string.IsNullOrWhiteSpace(x) || (x.Length == 64 && System.Text.RegularExpressions.Regex.IsMatch(x, "^[A-Fa-f0-9]{64}$")))
            .WithMessage("FileHash must be a SHA-256 hexadecimal value when supplied.");
        RuleFor(x => x.ImportType).Must(x => Enum.IsDefined(typeof(DispatchSnapshotImportType), x));
        RuleFor(x => x.ChannelId).GreaterThan(0);
        RuleFor(x => x.Rows).NotEmpty().Must(x => x.Count <= 50_000).WithMessage("Import cannot exceed 50,000 rows.");
        RuleForEach(x => x.Rows).SetValidator(new DispatchSnapshotImportRowRequestValidator());
    }
}

public sealed class ValidateManualDispatchSnapshotRequestValidator : AbstractValidator<ValidateManualDispatchSnapshotRequest>
{
    public ValidateManualDispatchSnapshotRequestValidator()
    {
        RuleFor(x => x.ImportType).Must(x => Enum.IsDefined(typeof(DispatchSnapshotImportType), x));
        RuleFor(x => x.ChannelId).GreaterThan(0);
        RuleFor(x => x.Row).NotNull().SetValidator(new DispatchSnapshotImportRowRequestValidator());
    }
}

public sealed class DispatchSnapshotImportRowRequestValidator : AbstractValidator<DispatchSnapshotImportRowRequest>
{
    public DispatchSnapshotImportRowRequestValidator()
    {
        RuleFor(x => x.RowNumber).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.ChannelSku).NotEmpty().MaximumLength(150);
        RuleFor(x => x).Must(x => !x.PeriodFrom.HasValue || !x.PeriodTo.HasValue || x.PeriodFrom <= x.PeriodTo).WithMessage("PeriodTo cannot be earlier than PeriodFrom.");
        RuleFor(x => x.SalesQuantity).GreaterThanOrEqualTo(0).When(x => x.SalesQuantity.HasValue);
        RuleFor(x => x.AvailableQuantity).GreaterThanOrEqualTo(0).When(x => x.AvailableQuantity.HasValue);
        RuleFor(x => x.ReservedQuantity).GreaterThanOrEqualTo(0).When(x => x.ReservedQuantity.HasValue);
        RuleFor(x => x.DamagedQuantity).GreaterThanOrEqualTo(0).When(x => x.DamagedQuantity.HasValue);
        RuleFor(x => x.InboundQuantity).GreaterThanOrEqualTo(0).When(x => x.InboundQuantity.HasValue);
        RuleFor(x => x.InboundStatus).Must(x => !x.HasValue || Enum.IsDefined(typeof(DispatchInboundStatus), x.Value));
        RuleFor(x => x.SourceReference).MaximumLength(500);
        RuleFor(x => x.ReferenceNumber).MaximumLength(100);
    }
}

public sealed class DispatchSnapshotImportBatchQueryValidator : AbstractValidator<DispatchSnapshotImportBatchQuery>
{
    public DispatchSnapshotImportBatchQueryValidator()
    {
        RuleFor(x => x.ImportType).Must(x => !x.HasValue || Enum.IsDefined(typeof(DispatchSnapshotImportType), x.Value));
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class CommitDispatchSnapshotImportRequestValidator : AbstractValidator<CommitDispatchSnapshotImportRequest>
{
    public CommitDispatchSnapshotImportRequestValidator() => RuleFor(x => x.CorrectionReason).NotEmpty().MaximumLength(1000).When(x => x.AllowDuplicate);
}

public sealed class CancelDispatchSnapshotImportRequestValidator : AbstractValidator<CancelDispatchSnapshotImportRequest>
{
    public CancelDispatchSnapshotImportRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class CreateDispatchPlanningRunRequestValidator : AbstractValidator<CreateDispatchPlanningRunRequest>
{
    public CreateDispatchPlanningRunRequestValidator()
    {
        RuleFor(x => x.ChannelId).GreaterThan(0);
        RuleFor(x => x.PlanningDate).NotEmpty();
        RuleFor(x => x.SalesImportBatchId).GreaterThan(0);
        RuleFor(x => x.WarehouseStockImportBatchId).GreaterThan(0);
        RuleFor(x => x.WarehouseInboundImportBatchId).GreaterThan(0).When(x => x.WarehouseInboundImportBatchId.HasValue);
        RuleFor(x => x.CompanyStockSourceType).Must(x => Enum.IsDefined(typeof(DispatchCompanyStockSourceType), x));
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public sealed class DispatchPlanningRunQueryValidator : AbstractValidator<DispatchPlanningRunQuery>
{
    public DispatchPlanningRunQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.Status).Must(x => !x.HasValue || Enum.IsDefined(typeof(DispatchPlanningRunStatus), x.Value));
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}

public sealed class DispatchRecommendationQueryValidator : AbstractValidator<DispatchRecommendationQuery>
{
    public DispatchRecommendationQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.Tier).Must(x => !x.HasValue || Enum.IsDefined(typeof(DispatchTier), x.Value));
    }
}

public sealed class UpdateDispatchRecommendationRequestValidator : AbstractValidator<UpdateDispatchRecommendationRequest>
{
    public UpdateDispatchRecommendationRequestValidator()
    {
        RuleFor(x => x.FinalRecommendationQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.OverrideReason).NotEmpty().MaximumLength(1000);
    }
}

public sealed class AllocateDispatchPlanningRunRequestValidator : AbstractValidator<AllocateDispatchPlanningRunRequest>
{
    public AllocateDispatchPlanningRunRequestValidator() => RuleFor(x => x.Notes).MaximumLength(1000);
}

public sealed class CancelDispatchPlanningRunRequestValidator : AbstractValidator<CancelDispatchPlanningRunRequest>
{
    public CancelDispatchPlanningRunRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}

public sealed class DispatchRecommendationReportQueryValidator : AbstractValidator<DispatchRecommendationReportQuery>
{
    public DispatchRecommendationReportQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 500);
        RuleFor(x => x.Status).Must(x => !x.HasValue || Enum.IsDefined(typeof(DispatchPlanningRunStatus), x.Value));
        RuleFor(x => x).Must(x => !x.FromDate.HasValue || !x.ToDate.HasValue || x.FromDate <= x.ToDate).WithMessage("FromDate must be on or before ToDate.");
    }
}
