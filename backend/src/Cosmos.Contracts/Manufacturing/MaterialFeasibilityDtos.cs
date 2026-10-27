namespace Cosmos.Contracts.Manufacturing;

public sealed record MaterialOutputRequest(long ItemId, decimal Quantity);
public sealed record MaterialFeasibilityRequest(Guid SnapshotId, IReadOnlyCollection<MaterialOutputRequest> Outputs);
public sealed record MaterialFeasibilityInput(long ProductItemId, decimal OutputQuantity, long MaterialItemId,
    long UnitId, decimal QuantityPerOutput, decimal WastePercent, decimal PhysicalStock, decimal ReservedStock,
    long BomId, string BomVersion, decimal OutputIncrement);
public sealed record ProductMaterialFeasibility(long ItemId, decimal RequestedOutput, decimal FeasibleOutput,
    long? BottleneckItemId, string? ConflictCode);
public sealed record SharedMaterialFeasibility(long ItemId, long UnitId, decimal RequiredQuantity,
    decimal ProposedAllocation, decimal AvailableQuantity, decimal RemainingQuantity, decimal Shortage);
public sealed record MaterialFeasibilityDto(Guid SourceSnapshotId, string CalculationVersion,
    IReadOnlyCollection<ProductMaterialFeasibility> Products, IReadOnlyCollection<SharedMaterialFeasibility> Materials);
