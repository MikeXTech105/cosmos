using Cosmos.Application.Manufacturing;
using Cosmos.Domain.Manufacturing;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionCalculationsTests
{
    [Theory]
    [InlineData(330,11,1,30)]
    [InlineData(10,1,11,110)]
    [InlineData(1000000,3,1,333333.333333)]
    public void Verified_rational_conversion_preserves_source_precision_until_posting(decimal source,decimal sourceBasis,decimal baseBasis,decimal expected) =>
        Assert.Equal(expected,ProductionCalculations.NormalizeRatio(source,sourceBasis,baseBasis,"Count","Count"));

    [Fact]
    public void Rational_conversion_rejects_cross_dimension_and_missing_basis()
    {
        Assert.Throws<Cosmos.Shared.Exceptions.CosmosException>(()=>ProductionCalculations.NormalizeRatio(10,1,11,"Mass","Count"));
        Assert.Throws<Cosmos.Shared.Exceptions.CosmosException>(()=>ProductionCalculations.NormalizeRatio(10,0,11,"Count","Count"));
    }
    private static readonly DateOnly AsOf = new(2026, 10, 27);

    [Theory]
    [InlineData(10, 11, 110)]
    [InlineData(330, 0.0909090909090909090909090909, 30)]
    [InlineData(1.25, 1, 1.25)]
    [InlineData(0.125, 1, 0.125)]
    public void Item_context_conversion_preserves_fractional_base_quantity(decimal source, decimal factor, decimal expected) =>
        Assert.Equal(expected, ProductionCalculations.Normalize(source, factor, "Count", "Count"));

    [Fact]
    public void Conversion_cannot_invent_a_factor_or_cross_dimensions()
    {
        Assert.Throws<CosmosException>(() => ProductionCalculations.Normalize(10, 0, "Count", "Count"));
        Assert.Throws<CosmosException>(() => ProductionCalculations.Normalize(10, 1, "Mass", "Count"));
        // Changing the pack only changes a new conversion, not the earlier persisted result.
        var oldBase = ProductionCalculations.Normalize(10, 11, "Count", "Count");
        var newBase = ProductionCalculations.Normalize(10, 12, "Count", "Count");
        Assert.Equal(110, oldBase); Assert.Equal(120, newBase);
    }

    [Fact]
    public void Conditional_BH25_box_basis_and_additive_waste_are_applied_once()
    {
        Assert.Equal(130.900m, ProductionCalculations.ExpectedMaterial(110, 11, 13.090m, 0));
        Assert.Equal(133.518m, ProductionCalculations.ExpectedMaterial(110, 11, 13.090m, 2));
        Assert.Equal(110m, ProductionCalculations.ExpectedMaterial(110, 11, 11, 0));
        Assert.Throws<CosmosException>(() => ProductionCalculations.ExpectedMaterial(110, 0, 13.090m, 2));
    }

    [Fact]
    public void Finished_target_is_21_total_and_warning_is_15_with_true_seven_day_demand()
    {
        var x = ProductionCalculations.FinishedDemand(330, 30, AsOf, AsOf, 30, 100, 40);
        Assert.Equal(11m, x.DailyDemand); Assert.Equal(231m, x.Target21); Assert.Equal(165m, x.Warning15);
        Assert.Equal(77m, x.SevenDayDemand); Assert.Equal(82.5m, x.FourWeekSlice);
        Assert.Equal(91m, x.SuggestedProduction);
    }

    [Fact]
    public void Non_30_day_observation_normalizes_without_rounding_daily_first()
    {
        var x = ProductionCalculations.FinishedDemand(100, 10, AsOf, AsOf, 10, 0, 0);
        Assert.Equal(300m, x.Monthly30); Assert.Equal(210m, x.Target21);
        var repeating = ProductionCalculations.FinishedDemand(1, 3, AsOf, AsOf, 10, 0, 0);
        Assert.Equal(7m, repeating.Target21);
    }

    [Fact]
    public void Missing_stale_and_no_demand_are_distinct_and_never_report_infinite_cover()
    {
        var missing = ProductionCalculations.FinishedDemand(null, 30, null, AsOf, 30, 100, 0);
        Assert.Equal(DemandFreshness.Missing, missing.Freshness); Assert.Null(missing.Target21);
        var stale = ProductionCalculations.FinishedDemand(330, 30, AsOf.AddDays(-31), AsOf, 30, 100, 0);
        Assert.Equal(DemandFreshness.Stale, stale.Freshness); Assert.Null(stale.SuggestedProduction);
        var zero = ProductionCalculations.FinishedDemand(0, 30, AsOf, AsOf, 30, 100, 0);
        Assert.Equal(DemandFreshness.NoDemand, zero.Freshness); Assert.Null(zero.CoverageDays); Assert.Equal(0m, zero.SuggestedProduction);
    }

    [Theory]
    [InlineData(100, 100, 50, 0, 0)]
    [InlineData(100, 101, 50, 0, 0)]
    [InlineData(100, 99, 50, 0, 50)]
    [InlineData(100, 45, 50, 12, 60)]
    [InlineData(1, 0.9999999, 50, 0, 50)]
    [InlineData(1, 0.9999999, 0, 0, 0.000001)]
    [InlineData(0, 0, 50, 0, 0)]
    [InlineData(0, -1, 50, 0, 50)]
    public void Purchase_positive_shortage_precedes_MOQ_and_multiple(decimal rop, decimal position, decimal moq, decimal multiple, decimal expected) =>
        Assert.Equal(expected, ProductionCalculations.Purchase(rop, position, moq, multiple == 0 ? null : multiple));

    [Fact]
    public void Typed_two_week_lead_is_14_calendar_days()
    {
        Assert.Equal(14, ProductionCalculations.LeadDays(2, "Weeks"));
        Assert.Equal(2, ProductionCalculations.LeadDays(2, "CalendarDays"));
        Assert.Throws<CosmosException>(() => ProductionCalculations.LeadDays(2, "WorkingDays"));
    }

    [Fact]
    public void Unknown_rates_and_unverified_family_cavities_are_capacity_unavailable()
    {
        Assert.Null(ProductionCalculations.RequiredMinutes(100, 5, null, ProductionRateBasis.UnitsPerMinute, null));
        Assert.Null(ProductionCalculations.RequiredMinutes(100, 5, 2, ProductionRateBasis.ShotsPerMinute, null));
        Assert.Equal(30m, ProductionCalculations.RequiredMinutes(100, 5, 2, ProductionRateBasis.ShotsPerMinute, 2));
        Assert.Equal(55m, ProductionCalculations.RequiredMinutes(100, 5, 30, ProductionRateBasis.SecondsPerUnit, null));
    }

    [Fact]
    public void Overnight_shift_unions_breaks_downtime_and_conflicting_reservations_once()
    {
        var tz = TimeZoneInfo.CreateCustomTimeZone("test-business", TimeSpan.FromHours(5.5), "Test", "Test");
        var from = new DateTimeOffset(2026, 10, 27, 22, 0, 0, TimeSpan.FromHours(5.5));
        var exclusions = new[] { (from.AddHours(2), from.AddHours(2.5)), (from.AddHours(2.25), from.AddHours(3)) };
        var jobs = new[] { (from.AddHours(4), from.AddHours(5)), (from.AddHours(4.5), from.AddHours(5.5)) };
        Assert.Equal(330, ProductionCalculations.UsableMinutes(AsOf, new TimeOnly(22, 0), new TimeOnly(6, 0), tz, exclusions, jobs));
    }

    [Fact]
    public void Legacy_production_numeric_statuses_remain_unchanged()
    {
        Assert.Equal(1, (int)ManufacturingProductionStatus.Draft);
        Assert.Equal(2, (int)ManufacturingProductionStatus.Posted);
        Assert.Equal(3, (int)ManufacturingProductionStatus.Cancelled);
        Assert.Equal(3, (int)ProductionOrderStatus.InProgress);
    }
}
