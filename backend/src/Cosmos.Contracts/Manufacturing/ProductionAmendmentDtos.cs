namespace Cosmos.Contracts.Manufacturing;

public sealed record ProductionOrderAmendRequest(string Version, string IdempotencyKey, decimal ReleasedQuantity,
    DateOnly PlannedStart, DateOnly DueDate, string Reason, decimal? PlannedQuantity = null, Guid? SourcePlanId = null);
public sealed record ProductionEffectivityRequest(string Version, string IdempotencyKey, DateOnly EffectiveTo, string Reason);
