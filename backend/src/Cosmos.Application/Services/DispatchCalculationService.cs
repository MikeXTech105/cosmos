using Cosmos.Application.DispatchPlanning;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Domain.DispatchPlanning;

namespace Cosmos.Application.Services;

/// <summary>Pure Dispatch Planning calculation engine. It deliberately has no database or HTTP dependencies.</summary>
public sealed class DispatchCalculationService
{
    public const string CalculationVersion = "dispatch-planning-v1";
    private const int Scale = 6;

    public DispatchCalculationResult Calculate(long runId, IReadOnlyCollection<DispatchCalculationInput> inputs)
    {
        var lines = inputs
            .OrderBy(x => x.AllocationPriority)
            .ThenBy(x => x.Tier)
            .ThenBy(x => x.WarehousePriority)
            .ThenBy(x => x.ItemCode, StringComparer.OrdinalIgnoreCase)
            .Select(input => CalculateLine(runId, input))
            .ToArray();
        return new DispatchCalculationResult(lines);
    }

    private static DispatchRecommendationDto CalculateLine(long runId, DispatchCalculationInput input)
    {
        var sales = Q(input.SalesQuantity);
        var current = Q(input.CurrentSellableQuantity);
        var inbound = Q(input.EligibleInboundQuantity);
        var total = Q(current + inbound);
        var recurring = Q(sales * input.RecurringDemandFactor);
        var safety = Q(recurring * input.SafetyStockFactor);
        var reorderPoint = Q(recurring + safety);
        var rawShortage = Q(Math.Max(0m, reorderPoint - total));
        var preRounded = Q(Math.Max(rawShortage, input.MinimumDispatchQuantity));
        var recommendation = Round(preRounded, input.UnitsPerBox, (DispatchRoundingMode)input.RoundingMode, input.AllowLooseQuantity);
        var boxes = input.UnitsPerBox <= 0m ? 0m : Q(recommendation / input.UnitsPerBox);
        var explanation =
            $"Sales {sales} × recurring-demand factor {input.RecurringDemandFactor} = recurring demand {recurring}; " +
            $"recurring demand {recurring} × safety-stock factor {input.SafetyStockFactor} = safety stock {safety}; " +
            $"reorder point {reorderPoint}; sellable stock {current} + eligible inbound {inbound} = total warehouse stock {total}; " +
            $"shortage {rawShortage}; minimum dispatch {input.MinimumDispatchQuantity}; " +
            $"rounding mode {(DispatchRoundingMode)input.RoundingMode} with {input.UnitsPerBox} units/box = recommendation {recommendation}.";

        return new DispatchRecommendationDto(
            0, runId, input.ItemId, input.ItemCode, input.ItemName, input.WarehouseId, input.WarehouseCode,
            input.WarehouseName, input.WarehousePriority, input.ChannelItemMappingId, input.ChannelSku,
            input.DispatchSkuSettingId, input.Tier, input.AllocationPriority, input.PackagingProfileId,
            Q(input.UnitsPerBox), input.RoundingMode, input.AllowLooseQuantity, sales, current, inbound, total,
            recurring, safety, reorderPoint, rawShortage, recommendation, recommendation, 0m, boxes,
            null, null, null, explanation);
    }

    private static decimal Round(decimal quantity, decimal unitsPerBox, DispatchRoundingMode mode, bool allowLoose)
    {
        if (quantity <= 0m || allowLoose || mode == DispatchRoundingMode.Exact) return Q(quantity);
        if (unitsPerBox <= 0m) throw new InvalidOperationException("Units per box must be greater than zero when loose quantities are not allowed.");

        var boxes = quantity / unitsPerBox;
        var roundedBoxes = mode switch
        {
            DispatchRoundingMode.NearestBox => decimal.Round(boxes, 0, MidpointRounding.AwayFromZero),
            DispatchRoundingMode.RoundUpToBox => decimal.Ceiling(boxes),
            DispatchRoundingMode.RoundDownToBox => decimal.Floor(boxes),
            DispatchRoundingMode.ExactBelowOneBox => quantity < unitsPerBox ? boxes : decimal.Ceiling(boxes),
            DispatchRoundingMode.HalfBoxThreshold => boxes - decimal.Floor(boxes) >= .5m ? decimal.Ceiling(boxes) : decimal.Floor(boxes),
            _ => throw new InvalidOperationException("Unsupported dispatch rounding mode.")
        };
        return Q(roundedBoxes * unitsPerBox);
    }

    private static decimal Q(decimal value) => decimal.Round(value, Scale, MidpointRounding.AwayFromZero);
}
