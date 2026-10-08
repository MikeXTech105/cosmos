using Cosmos.Application.DispatchPlanning;
using Cosmos.Application.Services;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Domain.DispatchPlanning;

namespace Cosmos.Tests.DispatchPlanning;

public sealed class DispatchPlanningEngineTests
{
    private readonly DispatchCalculationService _calculation = new();
    private readonly DispatchAllocationService _allocation = new();

    [Fact]
    public void Calculate_UsesWarehouseSalesInboundAndRoundsUpToBox()
    {
        var result = _calculation.Calculate(7, [Input(sales: 10m, current: 4m, inbound: 0m, unitsPerBox: 6m, rounding: DispatchRoundingMode.RoundUpToBox)]);

        var line = Assert.Single(result.Recommendations);
        Assert.Equal(11m, line.ReorderPoint);
        Assert.Equal(7m, line.RawShortage);
        Assert.Equal(12m, line.CalculatedRecommendationQuantity);
        Assert.Equal(2m, line.BoxCount);
    }

    [Fact]
    public void Calculate_AllowsLooseQuantityWithoutBoxRounding()
    {
        var input = Input(sales: 10m, current: 4m, inbound: 0m, unitsPerBox: 6m, rounding: DispatchRoundingMode.RoundUpToBox) with { AllowLooseQuantity = true };

        var line = Assert.Single(_calculation.Calculate(7, [input]).Recommendations);
        Assert.Equal(7m, line.FinalRecommendationQuantity);
    }

    [Theory]
    [InlineData(DispatchRoundingMode.Exact, 15)]
    [InlineData(DispatchRoundingMode.NearestBox, 20)]
    [InlineData(DispatchRoundingMode.RoundUpToBox, 20)]
    [InlineData(DispatchRoundingMode.RoundDownToBox, 10)]
    [InlineData(DispatchRoundingMode.ExactBelowOneBox, 20)]
    [InlineData(DispatchRoundingMode.HalfBoxThreshold, 20)]
    public void Calculate_AppliesEachBoxRoundingModeDeterministically(DispatchRoundingMode rounding, decimal expected)
    {
        var input = Input(sales: 15m, current: 0m, inbound: 0m, unitsPerBox: 10m, rounding: rounding) with { SafetyStockFactor = 0m };

        var line = Assert.Single(_calculation.Calculate(7, [input]).Recommendations);

        Assert.Equal(expected, line.FinalRecommendationQuantity);
    }

    [Fact]
    public void Calculate_ExactBelowOneBoxRetainsAPartialBox()
    {
        var input = Input(sales: 4m, current: 0m, inbound: 0m, unitsPerBox: 10m, rounding: DispatchRoundingMode.ExactBelowOneBox) with { SafetyStockFactor = 0m };

        var line = Assert.Single(_calculation.Calculate(7, [input]).Recommendations);

        Assert.Equal(4m, line.FinalRecommendationQuantity);
    }

    [Fact]
    public void Calculate_UsesInboundToCoverTheWarehouseShortage()
    {
        var input = Input(sales: 10m, current: 2m, inbound: 9m, unitsPerBox: 1m, rounding: DispatchRoundingMode.Exact) with { SafetyStockFactor = 0m };

        var line = Assert.Single(_calculation.Calculate(7, [input]).Recommendations);

        Assert.Equal(11m, line.TotalWarehouseStock);
        Assert.Equal(0m, line.RawShortage);
        Assert.Equal(0m, line.FinalRecommendationQuantity);
    }

    [Fact]
    public void Calculate_RejectsNonLooseBoxRoundingWithoutAPositiveBoxSize()
    {
        var input = Input(sales: 1m, current: 0m, inbound: 0m, unitsPerBox: 0m, rounding: DispatchRoundingMode.RoundUpToBox) with { SafetyStockFactor = 0m };

        Assert.Throws<InvalidOperationException>(() => _calculation.Calculate(7, [input]));
    }

    [Fact]
    public void Allocate_PrioritizesAllocationPriorityThenTierAndNeverExceedsStock()
    {
        var recommendations = new[]
        {
            Recommendation(1, priority: 0, tier: 2, quantity: 8m, warehousePriority: 2),
            Recommendation(2, priority: 1, tier: 1, quantity: 5m, warehousePriority: 1),
            Recommendation(3, priority: 1, tier: 2, quantity: 7m, warehousePriority: 1)
        };
        var stock = new[] { Stock(101, 10m) };

        var result = _allocation.Allocate(recommendations, stock);

        Assert.Collection(result.Lines,
            x => { Assert.Equal(1, x.RecommendationId); Assert.Equal(8m, x.AllocatedQuantity); },
            x => { Assert.Equal(2, x.RecommendationId); Assert.Equal(2m, x.AllocatedQuantity); });
        Assert.Equal(10m, result.Lines.Sum(x => x.AllocatedQuantity));
    }

    [Fact]
    public void CalculateAndAllocate_KeepDistinctChannelSkusForTheSameItemAndWarehouse()
    {
        var firstSku = Input(sales: 10m, current: 0m, inbound: 0m, unitsPerBox: 1m, rounding: DispatchRoundingMode.Exact) with { ChannelItemMappingId = 100 };
        var secondSku = Input(sales: 4m, current: 0m, inbound: 0m, unitsPerBox: 1m, rounding: DispatchRoundingMode.Exact) with { ChannelItemMappingId = 101, ChannelSku = "SKU-2" };

        var recommendations = _calculation.Calculate(7, [firstSku, secondSku]).Recommendations.ToArray();
        Assert.Equal(2, recommendations.Length);
        Assert.Equal(new long[] { 100, 101 }, recommendations.Select(x => x.ChannelItemMappingId).Order());

        var persisted = recommendations.Select((x, index) => x with { Id = index + 1L }).ToArray();
        var allocation = _allocation.Allocate(persisted, [Stock(101, 20m)]);

        Assert.Equal(2, allocation.Lines.Count);
        Assert.Equal(15.4m, allocation.Lines.Sum(x => x.AllocatedQuantity));
    }

    private static DispatchCalculationInput Input(decimal sales, decimal current, decimal inbound, decimal unitsPerBox, DispatchRoundingMode rounding) =>
        new(1, "ITEM-1", "Item 1", 10, "WH-1", "Warehouse 1", 0, 100, "SKU-1", 11,
            (int)DispatchTier.Tier1, 0, 22, unitsPerBox, (int)rounding, false, .1m, 1m, 0m,
            sales, current, inbound);

    private static DispatchRecommendationDto Recommendation(long id, int priority, int tier, decimal quantity, int warehousePriority) =>
        new(id, 1, 1, "ITEM-1", "Item 1", 10 + id, $"WH-{id}", "Warehouse", warehousePriority, 100 + id, $"SKU-{id}",
            11, tier, priority, 22, 6m, (int)DispatchRoundingMode.RoundUpToBox, false,
            0m, 0m, 0m, 0m, 0m, 0m, 0m, 0m, quantity, quantity, 0m, quantity / 6m, null, null, null, "test");

    private static DispatchCompanyStockSnapshotDto Stock(long id, decimal quantity) =>
        new(id, 1, 1, "ITEM-1", quantity, 0m, quantity, 0m, (int)DispatchCompanyStockSourceType.SystemStock, "test", DateTime.UtcNow, 1);
}
