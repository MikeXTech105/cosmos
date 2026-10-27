using Cosmos.Application.ProcurementPlanning;
using Cosmos.Application.Services;
using Cosmos.Domain.Items;

namespace Cosmos.Tests.ProcurementPlanning;

public sealed class ProcurementVersion3Tests
{
    [Fact]
    public void Positive_genuine_multiple_applies_even_when_legacy_rounding_flag_is_exact()
    {
        var data=Data(3000m,2845m,50m,12m);
        data=data with { BomComponents=[Assert.Single(data.BomComponents) with {RoundingRule=1}] };
        var result=new ProcurementCalculationService().Calculate(data,new(2026,10,1),new(2026,10,30));
        Assert.Equal(60m,Assert.Single(result.Lines).CalculatedSuggestedQuantity);
    }
    [Theory]
    [InlineData(2,true)]
    [InlineData(1,false)]
    public void Ambiguous_canonical_BOM_or_unverified_component_unit_blocks_calculation(int count,bool verified)
    {
        var data=Data(3000m,0,0,null);
        data=data with {BomComponents=[Assert.Single(data.BomComponents) with {BomSelectionCount=count,UnitVerified=verified}]};
        var result=new ProcurementCalculationService().Calculate(data,new(2026,10,1),new(2026,10,30));
        Assert.False(result.Validation.CanCalculate);
        Assert.Contains(result.Validation.BlockingErrors,x=>x.Code=="AMBIGUOUS_BOM_OR_UNIT");
    }
    [Fact]
    public void Rational_BOM_basis_is_multiplied_before_final_rounding_for_large_output()
    {
        var data=Data(1_000_000m,0,0,null);
        var component=Assert.Single(data.BomComponents) with {QuantityRequired=0.333333m,SourceComponentQuantity=1m,BomOutputBaseQuantity=3m,BomWastePercentage=0m};
        var result=new ProcurementCalculationService().Calculate(data with {BomComponents=[component]},new(2026,10,1),new(2026,10,30));
        Assert.Equal(333333.333333m,Assert.Single(result.Lines).MaterialRequirement);
    }
    [Theory]
    [InlineData(30, 3000)]
    [InlineData(10, 1000)]
    [InlineData(45, 4500)]
    public void Fourteen_day_lead_plus_half_normalized_month_is_2900(int observedDays, decimal requirement)
    {
        var line = Calculate(observedDays, requirement, 0, 0, null);
        Assert.Equal(100m, line.AverageDailyUsage); Assert.Equal(1400m, line.LeadTimeDemand);
        Assert.Equal(1500m, line.SafetyStock); Assert.Equal(2900m, line.ReorderPoint);
        Assert.Equal(2900m, line.CalculatedSuggestedQuantity);
    }
    [Theory]
    [InlineData(2900, 50, 0, 0)]
    [InlineData(2899, 50, 0, 50)]
    [InlineData(2845, 50, 12, 60)]
    [InlineData(2899.9999999, 50, 0, 50)]
    public void Equality_and_tiny_positive_shortage_have_distinct_MOQ_behavior(decimal stock, decimal moq, decimal multiple, decimal expected) =>
        Assert.Equal(expected, Calculate(30, 3000, stock, moq, multiple == 0 ? null : multiple).CalculatedSuggestedQuantity);

    [Fact]
    public void No_demand_negative_stock_is_reported_for_reconciliation()
    {
        var data = Data(0, -1, 0, null);
        var result = new ProcurementCalculationService().Calculate(data, new(2026, 10, 1), new(2026, 10, 30));
        Assert.Contains(result.Validation.Warnings, x => x.Code == "NEGATIVE_STOCK_RECONCILIATION");
        Assert.Equal(1m, Assert.Single(result.Lines).CalculatedSuggestedQuantity);
    }
    private static Cosmos.Contracts.ProcurementPlanning.PlanningCalculationLineDto Calculate(int days, decimal requirement, decimal stock, decimal moq, decimal? multiple)
    {
        var from = new DateOnly(2026, 9, 1);
        return Assert.Single(new ProcurementCalculationService().Calculate(Data(requirement, stock, moq, multiple), from, from.AddDays(days - 1)).Lines);
    }
    private static ProcurementCalculationData Data(decimal requirement, decimal stock, decimal moq, decimal? multiple) => new(
        [new ProductSalesInput(1, "FG", "Finished", true, (int)ProcurementItemClassification.FinishedProduct, requirement)],
        [ProcurementCalculationServiceTests.Bom(1, 2, 1, stock, 14, 0.5m, moq, multiple)], []);
}
