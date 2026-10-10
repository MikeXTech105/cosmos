using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Domain.Items;
using Cosmos.Domain.ProcurementPlanning;

namespace Cosmos.Application.Services;

public sealed class ProcurementCalculationService : IProcurementCalculationService
{
    public const string CalculationVersion = "workbook-compatible-v2-inbound";
    public const string InventoryBasis = "Items.CurrentStock (global on-hand) + latest valid ProcurementInboundStockSnapshot; reservations are excluded";
    private const int QuantityScale = 6;

    public ProcurementCalculationResult Calculate(ProcurementCalculationData data, DateOnly fromDate, DateOnly toDate)
    {
        var messages = new List<PlanningValidationMessageDto>();
        if (toDate < fromDate)
        {
            messages.Add(Error("INVALID_DATE_RANGE", "FromDate must be on or before ToDate."));
            return Result(messages, []);
        }

        var numberOfDays = toDate.DayNumber - fromDate.DayNumber + 1;
        if (numberOfDays <= 0)
        {
            messages.Add(Error("INVALID_DATE_RANGE", "The selected period must contain at least one day."));
            return Result(messages, []);
        }

        if (data.ProductSales.Count == 0)
        {
            messages.Add(Error("NO_SALES", "No sales records exist for the selected period."));
        }

        foreach (var unmapped in data.UnmappedSales)
        {
            messages.Add(new PlanningValidationMessageDto(
                (int)PlanningMessageSeverity.BlockingError,
                "UNMAPPED_SKU",
                $"{unmapped.OccurrenceCount} sales row(s) use an unmapped channel SKU.",
                ChannelCode: unmapped.ChannelCode,
                ChannelSku: unmapped.ChannelSku));
        }

        var bomByProduct = data.BomComponents.GroupBy(x => x.FinishedProductItemId).ToDictionary(x => x.Key, x => x.ToArray());
        var materialRequirements = new Dictionary<long, MaterialAccumulator>();

        foreach (var sale in data.ProductSales)
        {
            if (!sale.IsActive)
            {
                messages.Add(Error("INACTIVE_FINISHED_PRODUCT", "A sold finished product is inactive.", sale.ItemId, sale.ItemCode));
                continue;
            }

            if (sale.ProcurementClassification.HasValue && sale.ProcurementClassification != (int)ProcurementItemClassification.FinishedProduct)
            {
                messages.Add(Error("INVALID_FINISHED_PRODUCT_CLASSIFICATION", "A sold item is not classified as a finished product.", sale.ItemId, sale.ItemCode));
            }
            else if (!sale.ProcurementClassification.HasValue)
            {
                messages.Add(Warning("MISSING_FINISHED_PRODUCT_CLASSIFICATION", "The sold item has no procurement classification; its active BOM is used.", sale.ItemId, sale.ItemCode));
            }

            if (!bomByProduct.TryGetValue(sale.ItemId, out var components) || components.Length == 0)
            {
                messages.Add(Error("MISSING_BOM", "No active BOM is configured for a sold finished product.", sale.ItemId, sale.ItemCode));
                continue;
            }

            foreach (var component in components)
            {
                if (component.QuantityRequired <= 0)
                {
                    messages.Add(Error("INVALID_BOM_QUANTITY", "A BOM component quantity must be greater than zero.", component.ComponentItemId, component.ComponentItemCode));
                    continue;
                }

                if (!materialRequirements.TryGetValue(component.ComponentItemId, out var accumulator))
                {
                    accumulator = new MaterialAccumulator(component);
                    materialRequirements.Add(component.ComponentItemId, accumulator);
                }

                accumulator.Requirement += sale.Quantity * component.QuantityRequired;
            }
        }

        var lines = new List<PlanningCalculationLineDto>();
        foreach (var accumulator in materialRequirements.Values.OrderBy(x => x.Input.ComponentItemCode, StringComparer.OrdinalIgnoreCase))
        {
            var input = accumulator.Input;
            var lineWarnings = new List<string>();

            if (!input.ComponentIsActive)
            {
                messages.Add(Error("INACTIVE_COMPONENT", "A required BOM component is inactive.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            if (input.ProcurementClassification == (int)ProcurementItemClassification.FinishedProduct)
            {
                messages.Add(Error("INVALID_COMPONENT_CLASSIFICATION", "A BOM component is classified as a finished product.", input.ComponentItemId, input.ComponentItemCode));
            }
            else if (!input.ProcurementClassification.HasValue)
            {
                messages.Add(Warning("MISSING_COMPONENT_CLASSIFICATION", "The component has no procurement classification.", input.ComponentItemId, input.ComponentItemCode));
                lineWarnings.Add("Missing material/component classification.");
            }

            if (!input.TrackInventory)
            {
                messages.Add(Error("STOCK_UNAVAILABLE", "The component does not track inventory, so physical stock cannot be resolved.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            if (!input.SettingId.HasValue)
            {
                messages.Add(Error("MISSING_PROCUREMENT_SETTINGS", "Procurement settings are missing for a required component.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            if (input.SettingIsActive != true)
            {
                messages.Add(Error("INACTIVE_PROCUREMENT_SETTINGS", "Procurement settings are inactive for a required component.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            var manualPlanning = input.ManualPlanning == true;
            var automaticEnabled = input.AutomaticCalculationEnabled == true;
            var leadTime = SelectLeadTime(input);
            if (!leadTime.Value.HasValue && !manualPlanning)
            {
                messages.Add(Error("MISSING_LEAD_TIME", "No effective lead time is configured for a required component.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            if (!input.SafetyFactor.HasValue)
            {
                messages.Add(Error("MISSING_SAFETY_FACTOR", "No safety factor is configured for a required component.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            if (!input.MinimumOrderQuantity.HasValue)
            {
                messages.Add(Error("MISSING_MINIMUM_ORDER_QUANTITY", "No MOQ/workbook EOQ value is configured for a required component.", input.ComponentItemId, input.ComponentItemCode));
                continue;
            }

            if (manualPlanning)
            {
                lineWarnings.Add("Manual-planning item: automatic suggested quantity is zero.");
                messages.Add(Warning("MANUAL_PLANNING", "The material is included for manual planning and is not automatically recommended.", input.ComponentItemId, input.ComponentItemCode));
            }
            else if (!automaticEnabled)
            {
                lineWarnings.Add("Automatic calculation is disabled: suggested quantity is zero.");
                messages.Add(Warning("AUTOMATIC_CALCULATION_DISABLED", "Automatic calculation is disabled for the material.", input.ComponentItemId, input.ComponentItemCode));
            }

            var rawMaterialRequirement = accumulator.Requirement;
            var rawAverageDailyUsage = rawMaterialRequirement / numberOfDays;
            var materialRequirement = Q(rawMaterialRequirement);
            var averageDailyUsage = Q(rawAverageDailyUsage);
            var effectiveLeadTime = leadTime.Value ?? 0m;
            var leadTimeDemand = Q(rawAverageDailyUsage * effectiveLeadTime);
            var safetyStock = Q(rawMaterialRequirement * input.SafetyFactor.Value);
            var reorderPoint = Q((rawAverageDailyUsage * effectiveLeadTime) + (rawMaterialRequirement * input.SafetyFactor.Value));
            var physicalStock = Q(input.CurrentStock);
            var inboundStock = Q(input.ValidInboundQuantity);
            var projectedAvailableStock = Q(physicalStock + inboundStock);
            var shortage = Q(Math.Max(0m, reorderPoint - projectedAvailableStock));
            var minimumOrderQuantity = Q(input.MinimumOrderQuantity.Value);
            var suggested = 0m;

            if (!manualPlanning && automaticEnabled)
            {
                // The workbook uses a strict greater-than comparison. Therefore stock equal
                // to the reorder point still applies the MOQ rule.
                suggested = projectedAvailableStock > reorderPoint ? 0m : Math.Max(shortage, minimumOrderQuantity);
                if (input.OrderMultiple is > 0m && input.RoundingRule == (int)PlanningRoundingRule.UpToOrderMultiple)
                {
                    suggested = decimal.Ceiling(suggested / input.OrderMultiple.Value) * input.OrderMultiple.Value;
                }

                suggested = Q(suggested);
            }

            var explanation =
                $"Requirement {materialRequirement} / {numberOfDays} days = ADU {averageDailyUsage}; " +
                $"ADU {averageDailyUsage} x lead time {effectiveLeadTime} = lead-time demand {leadTimeDemand}; " +
                $"requirement {materialRequirement} x safety factor {input.SafetyFactor.Value} = safety stock {safetyStock}; " +
                $"physical stock {physicalStock} + valid inbound {inboundStock} = projected available {projectedAvailableStock}; " +
                $"reorder point {reorderPoint} - projected available stock {projectedAvailableStock} = shortage {shortage}; " +
                $"MOQ/workbook EOQ {minimumOrderQuantity}" +
                (input.OrderMultiple is > 0m ? $", order multiple {input.OrderMultiple.Value}" : string.Empty) +
                $"; suggested quantity {suggested}.";

            lines.Add(new PlanningCalculationLineDto(
                input.ComponentItemId,
                input.ComponentItemCode,
                input.ComponentItemName,
                input.UnitId,
                input.UnitName,
                input.UnitShortName,
                materialRequirement,
                averageDailyUsage,
                Q(effectiveLeadTime),
                leadTime.Source,
                leadTimeDemand,
                Q(input.SafetyFactor.Value),
                safetyStock,
                reorderPoint,
                physicalStock,
                shortage,
                minimumOrderQuantity,
                input.OrderMultiple is null ? null : Q(input.OrderMultiple.Value),
                input.RoundingRule ?? (int)PlanningRoundingRule.UpToOrderMultiple,
                automaticEnabled,
                manualPlanning,
                suggested,
                suggested,
                null,
                lineWarnings,
                explanation,
                inboundStock,
                projectedAvailableStock));
        }

        if (lines.Count > 0)
        {
            messages.Add(new PlanningValidationMessageDto(
                (int)PlanningMessageSeverity.Information,
                "INVENTORY_BASIS",
                InventoryBasis));
        }

        return Result(messages, lines);
    }

    private static (decimal? Value, string Source) SelectLeadTime(BomCalculationInput input)
    {
        if (input.LeadTimeOverrideDays.HasValue) return (input.LeadTimeOverrideDays, "Override");
        if (input.AverageHistoricalLeadTimeDays.HasValue) return (input.AverageHistoricalLeadTimeDays, "History average");
        if (input.ConfiguredLeadTimeDays.HasValue) return (input.ConfiguredLeadTimeDays, "Configured");
        return (null, "Missing");
    }

    private static ProcurementCalculationResult Result(IReadOnlyCollection<PlanningValidationMessageDto> messages, IReadOnlyCollection<PlanningCalculationLineDto> lines)
    {
        var validation = new PlanningValidationDto(
            messages.Where(x => x.Severity == (int)PlanningMessageSeverity.BlockingError).ToArray(),
            messages.Where(x => x.Severity == (int)PlanningMessageSeverity.Warning).ToArray(),
            messages.Where(x => x.Severity == (int)PlanningMessageSeverity.Information).ToArray());
        return new ProcurementCalculationResult(validation, lines);
    }

    private static PlanningValidationMessageDto Error(string code, string message, long? itemId = null, string? itemCode = null) =>
        new((int)PlanningMessageSeverity.BlockingError, code, message, itemId, itemCode);

    private static PlanningValidationMessageDto Warning(string code, string message, long? itemId = null, string? itemCode = null) =>
        new((int)PlanningMessageSeverity.Warning, code, message, itemId, itemCode);

    private static decimal Q(decimal value) => decimal.Round(value, QuantityScale, MidpointRounding.AwayFromZero);

    private sealed class MaterialAccumulator
    {
        public MaterialAccumulator(BomCalculationInput input) => Input = input;
        public BomCalculationInput Input { get; }
        public decimal Requirement { get; set; }
    }
}
