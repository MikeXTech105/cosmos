namespace Cosmos.Contracts.Manufacturing;
public sealed record ProductionOrderLabelsDto(string? ItemName, string? MachineName, string? MouldName, string? ShiftName,
    string? ChannelName, string? BomNumber, string? RoutingRevision, string LabelSource, IReadOnlyCollection<ProductionOrderStepLabelDto> Steps);
public sealed record ProductionOrderStepLabelDto(int Sequence, string? OperationName, string? WorkCentreName, string? MachineName, string? MouldName);
