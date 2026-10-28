namespace Cosmos.Contracts.Manufacturing;
public sealed record DispatchPolicyExampleRequest(decimal SalesQuantity, decimal CurrentStock, decimal Inbound, decimal UnitsPerBox,
    decimal SafetyStockFactor, decimal RecurringDemandFactor, decimal MinimumDispatchQuantity, int RoundingMode, bool AllowLooseQuantity);
public sealed record ProcurementPolicyExampleRequest(decimal MaterialRequirement, int PeriodDays, decimal CurrentStock, decimal Inbound,
    decimal? ConfiguredLeadTimeDays, decimal? LeadTimeOverrideDays, decimal? HistoryAverageLeadTimeDays, decimal SafetyFactor,
    decimal? MinimumOrderQuantity, decimal? OrderMultiple, bool AutomaticCalculationEnabled, bool ManualPlanning);
public sealed record PlanningPolicyExampleDto(decimal RecommendedQuantity, string Explanation, string CalculationVersion, string Scope);
public sealed record RoutingPolicyExampleRequest(decimal OutputQuantity, decimal Rate, int RateBasis, decimal QuantityBasis,
    decimal SetupMinutes, decimal? VerifiedOutputPerShot);
public sealed record RoutingPolicyExampleDto(decimal? RequiredMinutes, string Explanation, string CalculationVersion, string Scope);
