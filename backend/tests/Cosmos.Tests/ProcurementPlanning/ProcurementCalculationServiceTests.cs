using Cosmos.Application.ProcurementPlanning;
using Cosmos.Application.Services;
using Cosmos.Domain.Items;
using Cosmos.Domain.ProcurementPlanning;

namespace Cosmos.Tests.ProcurementPlanning;

public sealed class ProcurementCalculationServiceTests
{
    private readonly ProcurementCalculationService _service = new();
    private static readonly DateOnly From = new(2026, 6, 1);
    private static readonly DateOnly To = new(2026, 6, 30);

    [Fact]
    public void Calculate_MultipliesBomQuantityAndAppliesWorkbookFormula()
    {
        var result = Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 0m, safety: 1m, moq: 10m)]);
        var line = Assert.Single(result.Lines);
        Assert.Equal(20m, line.MaterialRequirement);
        Assert.Equal(20m, line.LeadTimeDemand);
        Assert.Equal(20m, line.SafetyStock);
        Assert.Equal(40m, line.ReorderPoint);
        Assert.Equal(40m, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_AggregatesMultipleProductsUsingSameComponent()
    {
        var result = Calculate([Sale(1, 10m), Sale(2, 5m)], [Bom(1, 101, 2m), Bom(2, 101, 3m)]);
        Assert.Equal(35m, Assert.Single(result.Lines).MaterialRequirement);
    }

    [Fact]
    public void Calculate_ExpandsOneProductToMultipleComponents()
    {
        var result = Calculate([Sale(1, 10m)], [Bom(1, 101, 2m), Bom(1, 102, 0.5m)]);
        Assert.Equal(2, result.Lines.Count);
        Assert.Equal(20m, result.Lines.Single(x => x.MaterialItemId == 101).MaterialRequirement);
        Assert.Equal(5m, result.Lines.Single(x => x.MaterialItemId == 102).MaterialRequirement);
    }

    [Fact]
    public void Calculate_ZeroSalesIsBlocking()
    {
        var result = Calculate([], []);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "NO_SALES");
    }

    [Fact]
    public void Calculate_MissingBomIsBlocking()
    {
        var result = Calculate([Sale(1, 1m)], []);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "MISSING_BOM");
    }

    [Fact]
    public void Calculate_MissingSettingsIsBlocking()
    {
        var result = Calculate([Sale(1, 1m)], [Bom(1, 101, 1m) with { SettingId = null }]);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "MISSING_PROCUREMENT_SETTINGS");
    }

    [Fact]
    public void Calculate_MissingLeadTimeIsBlocking()
    {
        var result = Calculate([Sale(1, 1m)], [Bom(1, 101, 1m) with { ConfiguredLeadTimeDays = null, LeadTimeOverrideDays = null, AverageHistoricalLeadTimeDays = null }]);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "MISSING_LEAD_TIME");
    }

    [Fact]
    public void Calculate_UnmappedSkuIsBlocking()
    {
        var data = new ProcurementCalculationData([Sale(1, 1m)], [Bom(1, 101, 1m)], [new UnmappedSalesInput("AMZ", "UNKNOWN", 2)]);
        var result = _service.Calculate(data, From, To);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "UNMAPPED_SKU" && x.ChannelCode == "AMZ");
    }

    [Fact]
    public void Calculate_ZeroStockReturnsReorderPointWhenMoqIsLower()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 0m, moq: 5m)]).Lines);
        Assert.Equal(line.ReorderPoint, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_StockAboveReorderPointReturnsZero()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 41m, safety: 1m, moq: 10m)]).Lines);
        Assert.Equal(0m, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_StockEqualToReorderPointDoesNotApplyMoqInVersion3()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 40m, safety: 1m, moq: 10m)]).Lines);
        Assert.Equal(0m, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_ShortageBelowMoqReturnsMoq()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 35m, safety: 1m, moq: 10m)]).Lines);
        Assert.Equal(10m, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_ShortageAboveMoqReturnsShortage()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 20m, safety: 1m, moq: 10m)]).Lines);
        Assert.Equal(20m, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_RoundsUpToOrderMultiple()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 23m, safety: 1m, moq: 10m, multiple: 6m)]).Lines);
        Assert.Equal(18m, line.CalculatedSuggestedQuantity);
    }

    [Fact]
    public void Calculate_PreservesDecimalUnits()
    {
        var line = Assert.Single(Calculate([Sale(1, 1.25m)], [Bom(1, 101, 0.4m, lead: 7.5m, safety: 0.25m, moq: 0m)]).Lines);
        Assert.Equal(0.5m, line.MaterialRequirement);
        Assert.Equal(0.125m, line.SafetyStock);
    }

    [Fact]
    public void Calculate_ManualPlanningItemIsIncludedWithZeroSuggestion()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 1m) with { ManualPlanning = true, ConfiguredLeadTimeDays = null }]).Lines);
        Assert.True(line.ManualPlanning);
        Assert.Equal(0m, line.CalculatedSuggestedQuantity);
        Assert.Contains(line.Warnings, x => x.Contains("Manual-planning", StringComparison.Ordinal));
    }

    [Fact]
    public void Calculate_InactiveComponentIsBlocking()
    {
        var result = Calculate([Sale(1, 1m)], [Bom(1, 101, 1m) with { ComponentIsActive = false }]);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "INACTIVE_COMPONENT");
    }

    [Fact]
    public void Calculate_InvalidDateRangeIsBlocking()
    {
        var result = _service.Calculate(new ProcurementCalculationData([], [], []), To, From);
        Assert.Contains(result.Validation.BlockingErrors, x => x.Code == "INVALID_DATE_RANGE");
    }

    [Fact]
    public void Calculate_UsesLeadTimeOverrideBeforeHistoryAndConfiguredValue()
    {
        var line = Assert.Single(Calculate([Sale(1, 30m)], [Bom(1, 101, 1m, lead: 20m) with { AverageHistoricalLeadTimeDays = 15m, LeadTimeOverrideDays = 10m }]).Lines);
        Assert.Equal(10m, line.LeadTimeDays);
        Assert.Equal("Override", line.LeadTimeSource);
    }

    [Fact]
    public void Calculate_UsesValidInboundStockInProjectedAvailability()
    {
        var line = Assert.Single(Calculate([Sale(1, 10m)], [Bom(1, 101, 2m, stock: 20m, safety: 1m, moq: 10m) with { ValidInboundQuantity = 15m }]).Lines);

        Assert.Equal(15m, line.InboundStock);
        Assert.Equal(35m, line.ProjectedAvailableStock);
        Assert.Equal(5m, line.Shortage);
        Assert.Equal(10m, line.CalculatedSuggestedQuantity);
    }

    private ProcurementCalculationResult Calculate(IReadOnlyCollection<ProductSalesInput> sales, IReadOnlyCollection<BomCalculationInput> bom) =>
        _service.Calculate(new ProcurementCalculationData(sales, bom, []), From, To);

    private static ProductSalesInput Sale(long id, decimal quantity) =>
        new(id, $"FP-{id}", $"Product {id}", true, (int)ProcurementItemClassification.FinishedProduct, quantity);

    internal static BomCalculationInput Bom(
        long productId,
        long componentId,
        decimal quantity,
        decimal stock = 0m,
        decimal lead = 30m,
        decimal safety = 1m,
        decimal moq = 0m,
        decimal? multiple = null) =>
        new(productId, componentId, $"RM-{componentId}", $"Material {componentId}", true, (int)ProcurementItemClassification.RawMaterial,
            componentId, "Pieces", "Pcs", quantity, true, stock, componentId, lead, null, null, safety, moq, multiple, true, false,
            (int)PlanningRoundingRule.UpToOrderMultiple, true);
}
