using Cosmos.Application.DispatchPlanning;
using Cosmos.Contracts.DispatchPlanning;

namespace Cosmos.Application.Services;

/// <summary>Pure, deterministic allocation engine; it does not mutate inventory or persistence state.</summary>
public sealed class DispatchAllocationService
{
    public DispatchAllocationResult Allocate(
        IReadOnlyCollection<DispatchRecommendationDto> recommendations,
        IReadOnlyCollection<DispatchCompanyStockSnapshotDto> companyStock)
    {
        var stockByItem = companyStock
            .GroupBy(x => x.ItemId)
            .ToDictionary(x => x.Key, x => x.OrderBy(y => y.Id).ToArray());
        var lines = new List<DispatchAllocationLine>();

        foreach (var itemGroup in recommendations.GroupBy(x => x.ItemId))
        {
            if (!stockByItem.TryGetValue(itemGroup.Key, out var snapshots)) continue;
            var remaining = snapshots.ToDictionary(x => x.Id, x => x.AllocatableQuantity);
            foreach (var recommendation in itemGroup
                         .OrderBy(x => x.AllocationPriority)
                         .ThenBy(x => x.Tier)
                         .ThenBy(x => x.WarehousePriority)
                         .ThenBy(x => x.Id))
            {
                var required = recommendation.FinalRecommendationQuantity;
                foreach (var snapshot in snapshots)
                {
                    if (required <= 0m) break;
                    var quantity = Math.Min(required, remaining[snapshot.Id]);
                    if (quantity <= 0m) continue;
                    lines.Add(new DispatchAllocationLine(recommendation.Id, snapshot.Id, quantity));
                    required -= quantity;
                    remaining[snapshot.Id] -= quantity;
                }
            }
        }
        return new DispatchAllocationResult(lines);
    }
}
