using Cosmos.Application.DispatchPlanning;
using Cosmos.Application.Services;
using Cosmos.Domain.DispatchPlanning;

namespace Cosmos.Tests.DispatchPlanning;

public sealed class DispatchExcelParityCalculationServiceTests
{
    private readonly DispatchExcelParityCalculationService _service = new();

    [Theory]
    [InlineData(70, DispatchTier.Tier3)]
    [InlineData(70.000001, DispatchTier.Tier2)]
    [InlineData(200, DispatchTier.Tier2)]
    [InlineData(200.000001, DispatchTier.Tier1)]
    public void ResolveTier_UsesStrictWorkbookThresholds(decimal sales, DispatchTier expected)
    {
        Assert.Equal(expected, DispatchExcelParityCalculationService.ResolveTier(sales, 10m));
    }

    [Theory]
    [InlineData(300, 3, 4)]
    [InlineData(80, 4, 2)]
    [InlineData(70, 4, 4)]
    public void Calculate_AppliesWorkbookFactorsForEachTier(decimal lastThirtyDaySales, decimal expectedSafetyFactor, decimal expectedRecurringFactor)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: lastThirtyDaySales));

        Assert.Equal(expectedSafetyFactor, result.SafetyStockFactor);
        Assert.Equal(expectedRecurringFactor, result.RecurringDemandFactor);
    }

    [Fact]
    public void Calculate_UsesWarehouseShareForSafetyStockAndWeeklySalesForRecurringDemand()
    {
        var firstWarehouse = _service.Calculate(Input(lastThirtyDaySales: 100m, warehouseWeeklySales: 10m, networkWeeklySales: 40m));
        var secondWarehouse = _service.Calculate(Input(lastThirtyDaySales: 100m, warehouseWeeklySales: 30m, networkWeeklySales: 40m));

        Assert.Equal(20m, firstWarehouse.RecurringDemand);
        Assert.Equal(60m, secondWarehouse.RecurringDemand);
        Assert.Equal(25m, firstWarehouse.SafetyStock);
        Assert.Equal(75m, secondWarehouse.SafetyStock);
        Assert.Equal(100m, firstWarehouse.SafetyStock + secondWarehouse.SafetyStock);
    }

    [Theory]
    [InlineData(4, 0)]
    [InlineData(5, 10)]
    [InlineData(6, 10)]
    public void Calculate_Tier2SuppressesBelowHalfBoxThenUsesNearestBox(decimal shortage, decimal expected)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 80m, currentStock: 60m - shortage));

        Assert.Equal(expected, result.RecommendedDispatchQuantity);
    }

    [Theory]
    [InlineData(9, 0)]
    [InlineData(10, 10)]
    [InlineData(15, 20)]
    public void Calculate_Tier1SuppressesBelowOneBoxThenUsesNearestBox(decimal shortage, decimal expected)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 300m, currentStock: 152.5m - shortage));

        Assert.Equal(expected, result.RecommendedDispatchQuantity);
    }

    [Theory]
    [InlineData(5, 5)]
    [InlineData(15, 20)]
    public void Calculate_Tier3KeepsLooseShortageBelowBoxThenUsesNearestBox(decimal shortage, decimal expected)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 70m, currentStock: 75m - shortage));

        Assert.Equal(expected, result.RecommendedDispatchQuantity);
    }

    [Fact]
    public void Calculate_SuppressesRecommendationWhenSafetyStockIsZero()
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 0m, currentStock: 0m));

        Assert.False(result.IsDispatchEligible);
        Assert.Equal(0m, result.RecommendedDispatchQuantity);
    }

    [Theory]
    [InlineData(74, 1, true)]
    [InlineData(75, 0, false)]
    [InlineData(76, 0, false)]
    public void Calculate_HandlesStockBelowEqualAndAboveReorderPoint(decimal currentStock, decimal expected, bool isEligible)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 70m, currentStock: currentStock));

        Assert.Equal(expected, result.RecommendedDispatchQuantity);
        Assert.Equal(isEligible, result.IsDispatchEligible);
    }

    [Fact]
    public void Calculate_IncludesTheExplicitParityInboundQuantityOnce()
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 70m, currentStock: 70m, inbound: 5m));

        Assert.Equal(75m, result.TotalWarehouseStock);
        Assert.Equal(0m, result.RecommendedDispatchQuantity);
    }

    [Fact]
    public void Calculate_RejectsPositiveThirtyDaySalesWithoutNetworkWeeklySales()
    {
        Assert.Throws<InvalidOperationException>(() => _service.Calculate(Input(lastThirtyDaySales: 70m, networkWeeklySales: 0m)));
    }

    [Fact]
    public void Calculate_AllowsZeroThirtyDaySalesWithZeroNetworkSalesAndSuppressesDispatch()
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 0m, warehouseWeeklySales: 0m, networkWeeklySales: 0m));

        Assert.Equal(0m, result.SafetyStock);
        Assert.False(result.IsDispatchEligible);
        Assert.Equal(0m, result.RecommendedDispatchQuantity);
    }

    [Fact]
    public void Calculate_HandlesZeroWarehouseShareWithoutDispatch()
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 70m, warehouseWeeklySales: 0m, networkWeeklySales: 20m));

        Assert.Equal(0m, result.RecurringDemand);
        Assert.Equal(0m, result.SafetyStock);
        Assert.False(result.IsDispatchEligible);
        Assert.Equal(0m, result.RecommendedDispatchQuantity);
    }

    [Fact]
    public void Calculate_Tier3UsesNearestBoxAtExactlyOneBox()
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 70m, currentStock: 65m));

        Assert.True(result.IsDispatchEligible);
        Assert.Equal(10m, result.RawShortage);
        Assert.Equal(10m, result.RecommendedDispatchQuantity);
    }

    [Theory]
    [InlineData(55.0000006, 0)]
    [InlineData(54.9999996, 10)]
    public void Calculate_SixDecimalPrecisionPreservesTier2HalfBoxThreshold(decimal currentStock, decimal expected)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 80m, currentStock: currentStock));

        Assert.Equal(expected, result.RecommendedDispatchQuantity);
    }

    [Theory]
    [InlineData(142.5000006, 0)]
    [InlineData(142.4999996, 10)]
    [InlineData(137.5, 20)]
    public void Calculate_SixDecimalPrecisionPreservesTier1OneBoxAndMidpointRounding(decimal currentStock, decimal expected)
    {
        var result = _service.Calculate(Input(lastThirtyDaySales: 300m, currentStock: currentStock));

        Assert.Equal(expected, result.RecommendedDispatchQuantity);
    }

    [Theory]
    [MemberData(nameof(InvalidNegativeInputs))]
    public void Calculate_RejectsEveryNegativeQuantity(DispatchExcelParityCalculationInput input)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => _service.Calculate(input));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-0.000001)]
    public void Calculate_RejectsZeroOrNegativeUnitsPerBox(decimal unitsPerBox)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => _service.Calculate(Input() with { UnitsPerBox = unitsPerBox }));
    }

    [Fact]
    public void Calculate_RejectsWarehouseSalesThatExceedNetworkSales()
    {
        Assert.Throws<InvalidOperationException>(() => _service.Calculate(Input(warehouseWeeklySales: 21m, networkWeeklySales: 20m)));
    }

    [Fact]
    public void Calculate_RejectsNullInput()
    {
        Assert.Throws<ArgumentNullException>(() => _service.Calculate(null!));
    }

    public static IEnumerable<object[]> InvalidNegativeInputs =>
    [
        [Input() with { LastThirtyDaySalesQuantity = -0.000001m }],
        [Input() with { WarehouseWeeklySalesQuantity = -0.000001m }],
        [Input() with { NetworkWeeklySalesQuantity = -0.000001m }],
        [Input() with { CurrentStockQuantity = -0.000001m }],
        [Input() with { InboundQuantity = -0.000001m }]
    ];

    private static DispatchExcelParityCalculationInput Input(
        decimal lastThirtyDaySales = 70m,
        decimal warehouseWeeklySales = 10m,
        decimal networkWeeklySales = 20m,
        decimal currentStock = 0m,
        decimal inbound = 0m) =>
        new(lastThirtyDaySales, warehouseWeeklySales, networkWeeklySales, currentStock, inbound, 10m);
}
