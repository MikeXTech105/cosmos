using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DispatchPlanning;
using Cosmos.Application.ProcurementPlanning;
using Cosmos.Application.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Manufacturing;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Manufacturing;
public static class PlanningPolicyExamples
{
    private const string Scope = "Illustrative quantities using the existing calculation engine; no settings, masters, plan, purchase or stock are saved.";
    public static PlanningPolicyExampleDto Dispatch(DispatchPolicyExampleRequest r, DispatchCalculationService calculator)
    {
        Validate(r.SalesQuantity, r.CurrentStock, r.Inbound, r.UnitsPerBox, r.MinimumDispatchQuantity);
        if (r.UnitsPerBox <= 0 || r.SafetyStockFactor is < 0 or > 1000 || r.RecurringDemandFactor is < 0 or > 1000 || r.RoundingMode is < 1 or > 6)
            throw new CosmosException("Choose a positive units-per-box basis, supported rounding and nonnegative example factors.");
        var line = calculator.Calculate(0, [new DispatchCalculationInput(0, "Example", "Example item", 0, "Example", "Example destination", 0, 0, "Example", 0, 1, 0, 0,
            r.UnitsPerBox, r.RoundingMode, r.AllowLooseQuantity, r.SafetyStockFactor, r.RecurringDemandFactor, r.MinimumDispatchQuantity, r.SalesQuantity, r.CurrentStock, r.Inbound)]).Recommendations.Single();
        return new(line.FinalRecommendationQuantity, line.CalculationExplanation, DispatchCalculationService.CalculationVersion, Scope);
    }
    public static PlanningPolicyExampleDto Procurement(ProcurementPolicyExampleRequest r, IProcurementCalculationService calculator)
    {
        Validate(r.MaterialRequirement, r.CurrentStock, r.Inbound, r.MinimumOrderQuantity ?? 0, r.OrderMultiple ?? 0);
        if (r.PeriodDays is < 1 or > 366 || r.SafetyFactor is < 0 or > 1000 || r.ConfiguredLeadTimeDays is < 0 or > 3660 || r.LeadTimeOverrideDays is < 0 or > 3660 || r.HistoryAverageLeadTimeDays is < 0 or > 3660)
            throw new CosmosException("Choose a valid example period, safety factor and nonnegative lead durations.");
        var component = new BomCalculationInput(1, 2, "Example", "Example material", true, 2, 1, "Base units", "unit", 1, true, r.CurrentStock, 1,
            r.ConfiguredLeadTimeDays, r.LeadTimeOverrideDays, r.HistoryAverageLeadTimeDays, r.SafetyFactor, r.MinimumOrderQuantity, r.OrderMultiple,
            r.AutomaticCalculationEnabled, r.ManualPlanning, 1, true, r.Inbound);
        var start = new DateOnly(2000, 1, 1);
        var result = calculator.Calculate(new ProcurementCalculationData([new(1, "Example", "Example output", true, 1, r.MaterialRequirement)], [component], []), start, start.AddDays(r.PeriodDays - 1));
        var line = result.Lines.SingleOrDefault() ?? throw new CosmosException("Complete the lead time and minimum order quantity before previewing this policy.");
        return new(line.CalculatedSuggestedQuantity, $"Effective lead: {line.LeadTimeDays} days ({line.LeadTimeSource}). {line.CalculationExplanation}", ProcurementCalculationService.CalculationVersion, Scope);
    }
    public static RoutingPolicyExampleDto Routing(RoutingPolicyExampleRequest r)
    {
        Validate(r.OutputQuantity, r.Rate, r.QuantityBasis, r.SetupMinutes, r.VerifiedOutputPerShot ?? 0);
        if (r.Rate <= 0 || r.QuantityBasis <= 0 || r.RateBasis is < 1 or > 3)
            throw new CosmosException("Use a positive rate and quantity basis with a supported rate type.");
        var basis = (ProductionRateBasis)r.RateBasis;
        // Capacity SQL normalizes units/min and seconds/unit by the routing quantity basis.
        // Shot rates instead use the verified Item-specific output/shot, never total mould cavities.
        var normalizedOutput = basis == ProductionRateBasis.ShotsPerMinute ? r.OutputQuantity : r.OutputQuantity / r.QuantityBasis;
        var minutes = ProductionCalculations.RequiredMinutes(normalizedOutput, r.SetupMinutes, r.Rate, basis, r.VerifiedOutputPerShot);
        var explanation = basis switch
        {
            ProductionRateBasis.UnitsPerMinute => $"{r.SetupMinutes} setup minutes + {r.OutputQuantity} base units ÷ {r.QuantityBasis} quantity basis ÷ {r.Rate} units/minute.",
            ProductionRateBasis.SecondsPerUnit => $"{r.SetupMinutes} setup minutes + {r.OutputQuantity} base units ÷ {r.QuantityBasis} quantity basis × {r.Rate} seconds/unit ÷ 60.",
            _ when r.VerifiedOutputPerShot is > 0 => $"{r.SetupMinutes} setup minutes + {r.OutputQuantity} base units ÷ {r.Rate} shots/minute ÷ {r.VerifiedOutputPerShot} verified Item base units/shot. Routing quantity basis does not scale shot rates.",
            _ => "A shot rate needs verified Item output per shot from machine–mould eligibility. Mould cavity count alone is insufficient; duration remains unknown."
        };
        if (r.OutputQuantity == 0) explanation = "Zero remaining output requires zero minutes; setup is not added to completed work.";
        return new(minutes, explanation, "production-capacity-rate-v1", Scope);
    }
    private static void Validate(params decimal[] quantities)
    {
        if (quantities.Any(value => value < 0 || value > 1000000000 || decimal.Round(value, 6) != value))
            throw new CosmosException("Use nonnegative illustrative quantities up to 1,000,000,000 with at most six decimal places.");
    }
}
