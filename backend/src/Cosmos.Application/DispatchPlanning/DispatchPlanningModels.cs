using Cosmos.Contracts.DispatchPlanning;

namespace Cosmos.Application.DispatchPlanning;

public sealed record DispatchCalculationInput(
    long ItemId,
    string ItemCode,
    string ItemName,
    long WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    int WarehousePriority,
    long ChannelItemMappingId,
    string ChannelSku,
    long DispatchSkuSettingId,
    int Tier,
    int AllocationPriority,
    long PackagingProfileId,
    decimal UnitsPerBox,
    int RoundingMode,
    bool AllowLooseQuantity,
    decimal SafetyStockFactor,
    decimal RecurringDemandFactor,
    decimal MinimumDispatchQuantity,
    decimal SalesQuantity,
    decimal CurrentSellableQuantity,
    decimal EligibleInboundQuantity);

public sealed record DispatchCalculationResult(IReadOnlyCollection<DispatchRecommendationDto> Recommendations);

public sealed record DispatchAllocationLine(long RecommendationId, long CompanyStockSnapshotId, decimal AllocatedQuantity);

public sealed record DispatchAllocationResult(IReadOnlyCollection<DispatchAllocationLine> Lines);
