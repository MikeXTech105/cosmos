using Cosmos.Domain.DispatchPlanning;

namespace Cosmos.Application.DispatchPlanning;

/// <summary>
/// Explicit input for the verified primary calculation path in the Dispatch Scheduling workbook.
/// This model is intentionally separate from <see cref="DispatchCalculationInput"/> until a business
/// owner approves its sales-period source and production policy selection.
/// </summary>
public sealed record DispatchExcelParityCalculationInput(
    decimal LastThirtyDaySalesQuantity,
    decimal WarehouseWeeklySalesQuantity,
    decimal NetworkWeeklySalesQuantity,
    decimal CurrentStockQuantity,
    decimal InboundQuantity,
    decimal UnitsPerBox);

/// <summary>Deterministic result of the workbook-derived calculation policy.</summary>
public sealed record DispatchExcelParityCalculationResult(
    DispatchTier Tier,
    decimal SafetyStockFactor,
    decimal RecurringDemandFactor,
    decimal TotalWarehouseStock,
    decimal RecurringDemand,
    decimal SafetyStock,
    decimal ReorderPoint,
    decimal RawShortage,
    bool IsDispatchEligible,
    decimal RecommendedDispatchQuantity,
    string CalculationPolicyVersion,
    string CalculationExplanation);
