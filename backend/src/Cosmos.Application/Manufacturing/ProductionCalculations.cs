using Cosmos.Domain.Manufacturing;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Manufacturing;

/// <summary>Quantity arithmetic keeps source precision until the six-place posting boundary.</summary>
public static class ProductionCalculations
{
    public const string Version = "production-material-v1-21day-normalized30";
    public static decimal Quantity(decimal value) => decimal.Round(value, 6, MidpointRounding.AwayFromZero);
    public static bool IsPostingQuantity(decimal value) => Math.Abs(value) < 10000000000000000m && Quantity(value) == value;

    public static decimal Normalize(decimal source, decimal factor, string sourceDimension, string baseDimension)
    {
        if (factor <= 0 || string.IsNullOrWhiteSpace(sourceDimension) || sourceDimension != baseDimension)
            throw new CosmosException("A verified positive conversion within the same dimension is required.");
        return Quantity(checked(source * factor));
    }
    public static decimal NormalizeRatio(decimal source,decimal sourceBasis,decimal baseBasis,string sourceDimension,string baseDimension)
    {
        if(sourceBasis<=0 || baseBasis<=0 || string.IsNullOrWhiteSpace(sourceDimension) || sourceDimension!=baseDimension)
            throw new CosmosException("A verified positive same-dimension conversion ratio is required.");
        return Quantity(checked(source*baseBasis)/sourceBasis);
    }

    public static decimal ExpectedMaterial(decimal output, decimal outputBasis, decimal component, decimal wastePercent)
    {
        if (output < 0 || outputBasis <= 0 || component <= 0 || wastePercent is < 0 or > 100)
            throw new CosmosException("Invalid BOM output basis, component quantity or additive waste.");
        return Quantity(output / outputBasis * component * (1 + wastePercent / 100));
    }

    public static FinishedDemandResult FinishedDemand(decimal? demand, int days, DateOnly? refreshedOn,
        DateOnly asOf, int freshnessDays, decimal eligibleStock, decimal distinctOpenOutput, decimal distinctCommitments = 0)
    {
        if (days <= 0 || freshnessDays < 0 || distinctOpenOutput < 0 || distinctCommitments < 0 || demand < 0)
            throw new CosmosException("Demand period, freshness and supply inputs are invalid.");
        if (demand is null || refreshedOn is null) return new(DemandFreshness.Missing, null, null, null, null, null, null, null);
        if (refreshedOn > asOf) throw new CosmosException("Demand refresh cannot be in the future of the planning date.");
        var daily = demand.Value / days;
        var state = asOf.DayNumber - refreshedOn.Value.DayNumber > freshnessDays ? DemandFreshness.Stale
            : demand == 0 ? DemandFreshness.NoDemand : DemandFreshness.Current;
        return new(state, Quantity(daily), Quantity(daily * 30), Quantity(daily * 7), Quantity(daily * 30 / 4),
            Quantity(daily * 21), Quantity(daily * 15), daily > 0 ? Quantity(eligibleStock / daily) : null,
            state == DemandFreshness.Stale ? null : Quantity(Math.Max(0, daily * 21 + distinctCommitments - eligibleStock - distinctOpenOutput)));
    }

    public static decimal Purchase(decimal reorderPoint, decimal position, decimal moq, decimal? multiple)
    {
        if (reorderPoint < 0 || moq < 0 || multiple <= 0) throw new CosmosException("Invalid reorder, MOQ or order multiple.");
        var shortage = Math.Max(0, reorderPoint - position);
        if (shortage <= 0) return 0;
        var baseline = Math.Max(shortage, moq);
        return Math.Max(0.000001m, Quantity(multiple is > 0 ? decimal.Ceiling(baseline / multiple.Value) * multiple.Value : baseline));
    }

    public static decimal LeadDays(decimal duration, string unit) => duration < 0 ? throw new CosmosException("Lead time cannot be negative.")
        : unit switch { "CalendarDays" => duration, "Weeks" => duration * 7, _ => throw new CosmosException("Lead-time unit must be CalendarDays or Weeks; working days require a calendar.") };

    public static decimal? RequiredMinutes(decimal remaining, decimal setup, decimal? rate, ProductionRateBasis basis, decimal? verifiedSkuCavities)
    {
        if (remaining < 0 || setup < 0) throw new CosmosException("Remaining output and setup cannot be negative.");
        if (rate is null or <= 0) return null;
        if (remaining == 0) return 0;
        return basis switch
        {
            ProductionRateBasis.UnitsPerMinute => Quantity(setup + remaining / rate.Value),
            ProductionRateBasis.SecondsPerUnit => Quantity(setup + remaining * rate.Value / 60),
            ProductionRateBasis.ShotsPerMinute when verifiedSkuCavities is > 0 => Quantity(setup + remaining / (rate.Value * verifiedSkuCavities.Value)),
            ProductionRateBasis.ShotsPerMinute => null,
            _ => throw new CosmosException("Unsupported operation rate basis.")
        };
    }

    public static decimal UsableMinutes(DateOnly date, TimeOnly start, TimeOnly end, TimeZoneInfo timezone,
        IReadOnlyCollection<(DateTimeOffset From, DateTimeOffset To)> exclusions,
        IReadOnlyCollection<(DateTimeOffset From, DateTimeOffset To)> reserved)
    {
        var localStart = date.ToDateTime(start, DateTimeKind.Unspecified);
        var localEnd = (end <= start ? date.AddDays(1) : date).ToDateTime(end, DateTimeKind.Unspecified);
        if (timezone.IsInvalidTime(localStart) || timezone.IsInvalidTime(localEnd) || timezone.IsAmbiguousTime(localStart) || timezone.IsAmbiguousTime(localEnd))
            throw new CosmosException("Shift boundary needs an explicit offset at a daylight-saving transition.");
        var from = new DateTimeOffset(localStart, timezone.GetUtcOffset(localStart));
        var to = new DateTimeOffset(localEnd, timezone.GetUtcOffset(localEnd));
        var intervals = exclusions.Concat(reserved).Select(x =>
            (From: x.From > from ? x.From : from, To: x.To < to ? x.To : to)).Where(x => x.To > x.From).OrderBy(x => x.From).ToArray();
        var blocked = TimeSpan.Zero;
        DateTimeOffset? previousStart = null, previousEnd = null;
        foreach (var interval in intervals)
        {
            if (previousEnd is null) { previousStart = interval.From; previousEnd = interval.To; }
            else if (interval.From <= previousEnd) { if (interval.To > previousEnd) previousEnd = interval.To; }
            else { blocked += previousEnd.Value - previousStart!.Value; previousStart = interval.From; previousEnd = interval.To; }
        }
        if (previousEnd is not null) blocked += previousEnd.Value - previousStart!.Value;
        return Quantity((decimal)((to - from - blocked).TotalMinutes));
    }
}

public sealed record FinishedDemandResult(DemandFreshness Freshness, decimal? DailyDemand, decimal? Monthly30,
    decimal? SevenDayDemand, decimal? FourWeekSlice, decimal? Target21, decimal? Warning15, decimal? CoverageDays,
    decimal? SuggestedProduction = null);
