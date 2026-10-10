using Cosmos.Contracts.SupplyChain;
using FluentValidation;

namespace Cosmos.Application.Validators;

public sealed class SupplyChainListQueryValidator : AbstractValidator<SupplyChainListQuery>
{
    public SupplyChainListQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).MaximumLength(50);
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || x.Equals("ASC", StringComparison.OrdinalIgnoreCase) || x.Equals("DESC", StringComparison.OrdinalIgnoreCase))
            .WithMessage("SortDirection must be ASC or DESC.");
    }
}

public sealed class SaveChannelRequestValidator : AbstractValidator<SaveChannelRequest>
{
    public SaveChannelRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20).Matches("^[A-Za-z0-9_-]+$");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class ChannelWarehouseQueryValidator : AbstractValidator<ChannelWarehouseQuery>
{
    public ChannelWarehouseQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).MaximumLength(50);
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || x.Equals("ASC", StringComparison.OrdinalIgnoreCase) || x.Equals("DESC", StringComparison.OrdinalIgnoreCase));
    }
}

public sealed class SaveChannelWarehouseRequestValidator : AbstractValidator<SaveChannelWarehouseRequest>
{
    public SaveChannelWarehouseRequestValidator()
    {
        RuleFor(x => x.ChannelId).GreaterThan(0);
        RuleFor(x => x.WarehouseCode).NotEmpty().MaximumLength(50).Matches("^[A-Za-z0-9_-]+$");
        RuleFor(x => x.WarehouseName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.AddressLine1).MaximumLength(250);
        RuleFor(x => x.AddressLine2).MaximumLength(250);
        RuleFor(x => x.PostalCode).MaximumLength(20).Matches("^[A-Za-z0-9 -]*$");
        RuleFor(x => x.Region).MaximumLength(100);
        RuleFor(x => x.Priority).GreaterThanOrEqualTo(0);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class ChannelItemMappingQueryValidator : AbstractValidator<ChannelItemMappingQuery>
{
    public ChannelItemMappingQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).MaximumLength(50);
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || x.Equals("ASC", StringComparison.OrdinalIgnoreCase) || x.Equals("DESC", StringComparison.OrdinalIgnoreCase));
    }
}

public sealed class SaveChannelItemMappingRequestValidator : AbstractValidator<SaveChannelItemMappingRequest>
{
    public SaveChannelItemMappingRequestValidator()
    {
        RuleFor(x => x.ChannelId).GreaterThan(0);
        RuleFor(x => x.ItemId).GreaterThan(0);
        RuleFor(x => x.ChannelSku).NotEmpty().MaximumLength(150);
        RuleFor(x => x.ChannelProductName).MaximumLength(300);
        RuleFor(x => x.ExternalItemId).MaximumLength(150);
        RuleFor(x => x).Must(x => !x.EffectiveFrom.HasValue || !x.EffectiveTo.HasValue || x.EffectiveFrom <= x.EffectiveTo)
            .WithMessage("EffectiveTo cannot precede EffectiveFrom.");
    }
}

public sealed class ItemPackagingProfileQueryValidator : AbstractValidator<ItemPackagingProfileQuery>
{
    public ItemPackagingProfileQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(200);
        RuleFor(x => x.ItemId).GreaterThan(0).When(x => x.ItemId.HasValue);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
        RuleFor(x => x.SortBy).MaximumLength(50);
        RuleFor(x => x.SortDirection).Must(x => string.IsNullOrWhiteSpace(x) || x.Equals("ASC", StringComparison.OrdinalIgnoreCase) || x.Equals("DESC", StringComparison.OrdinalIgnoreCase));
    }
}

public sealed class SaveItemPackagingProfileRequestValidator : AbstractValidator<SaveItemPackagingProfileRequest>
{
    private static readonly string[] DimensionUnits = ["CM", "MM"];
    private static readonly string[] WeightUnits = ["KG", "G"];

    public SaveItemPackagingProfileRequestValidator()
    {
        RuleFor(x => x.ItemId).GreaterThan(0);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.PackagingCode).NotEmpty().MaximumLength(50).Matches("^[A-Za-z0-9_-]+$");
        RuleFor(x => x.PackagingName).MaximumLength(150);
        RuleFor(x => x.UnitsPerBox).GreaterThan(0);
        RuleFor(x => x.Length).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Width).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Height).GreaterThanOrEqualTo(0);
        RuleFor(x => x.GrossWeight).GreaterThanOrEqualTo(0);
        RuleFor(x => x.NetWeight).GreaterThanOrEqualTo(0).LessThanOrEqualTo(x => x.GrossWeight);
        RuleFor(x => x.DimensionUnit).NotEmpty().Must(x => DimensionUnits.Contains(x.Trim().ToUpperInvariant())).WithMessage("DimensionUnit must be CM or MM.");
        RuleFor(x => x.WeightUnit).NotEmpty().Must(x => WeightUnits.Contains(x.Trim().ToUpperInvariant())).WithMessage("WeightUnit must be KG or G.");
        RuleFor(x => x.VolumetricDivisor).GreaterThan(0).When(x => x.VolumetricDivisor.HasValue);
        RuleFor(x => x).Must(x => !x.EffectiveFrom.HasValue || !x.EffectiveTo.HasValue || x.EffectiveFrom <= x.EffectiveTo)
            .WithMessage("EffectiveTo cannot precede EffectiveFrom.");
    }
}

public sealed class SupplyChainImportBatchQueryValidator : AbstractValidator<SupplyChainImportBatchQuery>
{
    public SupplyChainImportBatchQueryValidator()
    {
        RuleFor(x => x.ModuleType).MaximumLength(50);
        RuleFor(x => x.ImportType).MaximumLength(50);
        RuleFor(x => x.ChannelId).GreaterThan(0).When(x => x.ChannelId.HasValue);
        RuleFor(x => x.Status).InclusiveBetween(1, 6).When(x => x.Status.HasValue);
        RuleFor(x => x.PageNumber).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class CommitSupplyChainImportRequestValidator : AbstractValidator<CommitSupplyChainImportRequest>
{
    public CommitSupplyChainImportRequestValidator()
    {
        RuleFor(x => x.CorrectionReason).MaximumLength(1000);
        RuleFor(x => x).Must(x => !x.AllowDuplicate || !string.IsNullOrWhiteSpace(x.CorrectionReason))
            .WithMessage("CorrectionReason is required when AllowDuplicate is true.");
    }
}

public sealed class CancelSupplyChainImportRequestValidator : AbstractValidator<CancelSupplyChainImportRequest>
{
    public CancelSupplyChainImportRequestValidator() => RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
}
