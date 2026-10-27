using Cosmos.Application.Manufacturing;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Manufacturing;

public sealed class MaterialFeasibilityTests
{
    [Fact]
    public void Multiple_products_share_one_component_pool_without_promising_stock_twice()
    {
        var result = MaterialFeasibilityCalculator.Calculate(Guid.NewGuid(), [Line(1, 80, 2, 100, 20), Line(2, 80, 2, 100, 20)]);
        Assert.Equal(40m, result.Products.Single(x => x.ItemId == 1).FeasibleOutput);
        Assert.Equal(0m, result.Products.Single(x => x.ItemId == 2).FeasibleOutput);
        var material = Assert.Single(result.Materials);
        Assert.Equal(80m, material.ProposedAllocation); Assert.Equal(240m, material.Shortage); Assert.Equal(0m, material.RemainingQuantity);
    }
    [Fact]
    public void Multiple_components_report_the_actual_bottleneck_and_preserve_fractional_units()
    {
        var one = Line(1, 10, 1.19m, 100, 0);
        var two = Line(1, 10, 0.125m, 0.625m, 0) with { MaterialItemId = 20, UnitId = 3 };
        var result = MaterialFeasibilityCalculator.Calculate(Guid.NewGuid(), [one, two]);
        Assert.Equal(5m, Assert.Single(result.Products).FeasibleOutput);
        Assert.Equal(20L, Assert.Single(result.Products).BottleneckItemId);
        Assert.Equal(0.625m, result.Materials.Single(x => x.UnitId == 3).ProposedAllocation);
    }
    [Fact]
    public void Duplicate_forecast_order_component_identity_is_rejected_instead_of_counted_twice()
    {
        var line = Line(1, 10, 1, 100, 0);
        Assert.Throws<CosmosException>(() => MaterialFeasibilityCalculator.Calculate(Guid.NewGuid(), [line, line]));
    }
    [Fact]
    public void Inconsistent_shared_units_or_stock_versions_require_refresh()
    {
        var one = Line(1, 10, 1, 100, 0);
        var two = Line(2, 10, 1, 90, 0);
        Assert.Throws<CosmosException>(() => MaterialFeasibilityCalculator.Calculate(Guid.NewGuid(), [one, two]));
    }
    private static MaterialFeasibilityInput Line(long product, decimal quantity, decimal perOutput, decimal stock, decimal reserved) =>
        new(product, quantity, 10, 2, perOutput, 0, stock, reserved, 100 + product, "1", 0.000001m);
}
