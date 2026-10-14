using Cosmos.Application.DispatchPlanning;
using Cosmos.Domain.DispatchPlanning;

namespace Cosmos.Application.Services;

/// <summary>
/// Implements the verified primary formula path from the Dispatch Scheduling workbook.
/// It is an explicitly selected parity strategy and is not the default production policy.
/// </summary>
public sealed class DispatchExcelParityCalculationService
{
    public const string CalculationPolicyVersion = "dispatch-excel-parity-v1";
    private const int Scale = 6;

    public DispatchExcelParityCalculationResult Calculate(DispatchExcelParityCalculationInput input)
    {
        Validate(input);

        var tier = ResolveTier(input.LastThirtyDaySalesQuantity, input.UnitsPerBox);
        var (safetyFactor, recurringFactor) = Factors(tier);
        var totalStock = Q(input.CurrentStockQuantity + input.InboundQuantity);
        var recurring = Q(input.WarehouseWeeklySalesQuantity * recurringFactor);
        var safety = input.LastThirtyDaySalesQuantity == 0m
            ? 0m
            : Q(input.LastThirtyDaySalesQuantity * (input.WarehouseWeeklySalesQuantity / input.NetworkWeeklySalesQuantity) * (safetyFactor / 4m));
        var reorderPoint = Q(recurring + safety);
        var rawShortage = Q(Math.Max(0m, reorderPoint - totalStock));
        var isEligible = safety > 0m && rawShortage > 0m;
        var recommendation = isEligible ? QuantityForTier(tier, rawShortage, input.UnitsPerBox) : 0m;
        var explanation =
            $"Excel parity policy {CalculationPolicyVersion}; tier {(int)tier} from 30-day sales {Q(input.LastThirtyDaySalesQuantity)} and {Q(input.UnitsPerBox)} units/box; " +
            $"warehouse weekly sales {Q(input.WarehouseWeeklySalesQuantity)} / network weekly sales {Q(input.NetworkWeeklySalesQuantity)}; " +
            $"recurring demand {recurring}; safety stock {safety}; reorder point {reorderPoint}; " +
            $"current stock {Q(input.CurrentStockQuantity)} + inbound {Q(input.InboundQuantity)} = total stock {totalStock}; " +
            $"shortage {rawShortage}; eligible {isEligible}; recommendation {recommendation}.";

        return new DispatchExcelParityCalculationResult(
            tier, safetyFactor, recurringFactor, totalStock, recurring, safety, reorderPoint, rawShortage,
            isEligible, recommendation, CalculationPolicyVersion, explanation);
    }

    public static DispatchTier ResolveTier(decimal lastThirtyDaySalesQuantity, decimal unitsPerBox)
    {
        if (lastThirtyDaySalesQuantity < 0m) throw new ArgumentOutOfRangeException(nameof(lastThirtyDaySalesQuantity));
        if (unitsPerBox <= 0m) throw new ArgumentOutOfRangeException(nameof(unitsPerBox), "Units per box must be greater than zero.");

        if (lastThirtyDaySalesQuantity > 20m * unitsPerBox) return DispatchTier.Tier1;
        return lastThirtyDaySalesQuantity > 7m * unitsPerBox ? DispatchTier.Tier2 : DispatchTier.Tier3;
    }

    private static (decimal Safety, decimal Recurring) Factors(DispatchTier tier) => tier switch
    {
        DispatchTier.Tier1 => (3m, 4m),
        DispatchTier.Tier2 => (4m, 2m),
        DispatchTier.Tier3 => (4m, 4m),
        _ => throw new ArgumentOutOfRangeException(nameof(tier))
    };

    private static decimal QuantityForTier(DispatchTier tier, decimal shortage, decimal unitsPerBox)
    {
        if (shortage <= 0m) return 0m;

        return tier switch
        {
            DispatchTier.Tier1 when shortage < unitsPerBox => 0m,
            DispatchTier.Tier2 when shortage < unitsPerBox / 2m => 0m,
            DispatchTier.Tier3 when shortage < unitsPerBox => Q(shortage),
            _ => Q(decimal.Round(shortage / unitsPerBox, 0, MidpointRounding.AwayFromZero) * unitsPerBox)
        };
    }

    private static void Validate(DispatchExcelParityCalculationInput input)
    {
        ArgumentNullException.ThrowIfNull(input);
        if (input.LastThirtyDaySalesQuantity < 0m) throw new ArgumentOutOfRangeException(nameof(input.LastThirtyDaySalesQuantity));
        if (input.WarehouseWeeklySalesQuantity < 0m) throw new ArgumentOutOfRangeException(nameof(input.WarehouseWeeklySalesQuantity));
        if (input.NetworkWeeklySalesQuantity < 0m) throw new ArgumentOutOfRangeException(nameof(input.NetworkWeeklySalesQuantity));
        if (input.CurrentStockQuantity < 0m) throw new ArgumentOutOfRangeException(nameof(input.CurrentStockQuantity));
        if (input.InboundQuantity < 0m) throw new ArgumentOutOfRangeException(nameof(input.InboundQuantity));
        if (input.UnitsPerBox <= 0m) throw new ArgumentOutOfRangeException(nameof(input.UnitsPerBox), "Units per box must be greater than zero.");
        if (input.LastThirtyDaySalesQuantity > 0m && input.NetworkWeeklySalesQuantity <= 0m)
            throw new InvalidOperationException("Network weekly sales must be greater than zero when 30-day sales are positive.");
        if (input.WarehouseWeeklySalesQuantity > input.NetworkWeeklySalesQuantity)
            throw new InvalidOperationException("Warehouse weekly sales cannot exceed network weekly sales.");
    }

    private static decimal Q(decimal value) => decimal.Round(value, Scale, MidpointRounding.AwayFromZero);
}
