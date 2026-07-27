using Cosmos.Application.Validators;
using Cosmos.Contracts.SupplyChain;
using Cosmos.Contracts.ProcurementPlanning;

namespace Cosmos.Tests.SupplyChain;

public sealed class SupplyChainValidatorTests
{
    [Fact]
    public async Task WarehouseValidator_RejectsNegativePriorityAndInvalidCode()
    {
        var validator = new SaveChannelWarehouseRequestValidator();
        var result = await validator.ValidateAsync(new SaveChannelWarehouseRequest(1, "bad code", "Warehouse", null, null, null, null, null, null, -1, 0));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == "WarehouseCode");
        Assert.Contains(result.Errors, x => x.PropertyName == "Priority");
    }

    [Fact]
    public async Task MappingValidator_RejectsInvalidEffectiveRange()
    {
        var validator = new SaveChannelItemMappingRequestValidator();
        var result = await validator.ValidateAsync(new SaveChannelItemMappingRequest(1, 2, "SKU", null, null, true, true, new DateOnly(2026, 7, 2), new DateOnly(2026, 7, 1)));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("EffectiveTo", StringComparison.Ordinal));
    }

    [Fact]
    public async Task PackagingValidator_RejectsInvalidUnitsAndWeightRelationship()
    {
        var validator = new SaveItemPackagingProfileRequestValidator();
        var result = await validator.ValidateAsync(new SaveItemPackagingProfileRequest(1, null, "BOX", null, 12, 10, 10, 10, "IN", 1, 2, "LB", 5000, true, true, null, null));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == "DimensionUnit");
        Assert.Contains(result.Errors, x => x.PropertyName == "WeightUnit");
        Assert.Contains(result.Errors, x => x.PropertyName == "NetWeight");
    }

    [Fact]
    public async Task ImportCommitValidator_RequiresReasonForDuplicate()
    {
        var validator = new CommitSupplyChainImportRequestValidator();
        var result = await validator.ValidateAsync(new CommitSupplyChainImportRequest(true));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("CorrectionReason", StringComparison.Ordinal));
    }

    [Fact]
    public async Task PlanningRunCancelValidator_RequiresReason()
    {
        var validator = new CancelPlanningRunRequestValidator();
        var result = await validator.ValidateAsync(new CancelPlanningRunRequest(""));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == "Reason");
    }
}
