namespace Cosmos.Contracts.Manufacturing;

public sealed record ProductionDemandObservationRequest(long ItemId, long UnitId, long? ChannelId,
    DateOnly ObservedFrom, DateOnly ObservedTo, DateOnly RefreshedOn, decimal SourceQuantity,
    string SourceReference, string IdempotencyKey);
public sealed record ProductionDemandObservationDto(long Id, long ItemId, long UnitId, long? ChannelId,
    DateOnly ObservedFrom, DateOnly ObservedTo, DateOnly RefreshedOn, decimal SourceQuantity,
    decimal BaseQuantity, decimal ConversionFactor, string SourceReference, bool IsSuperseded, string Version);
