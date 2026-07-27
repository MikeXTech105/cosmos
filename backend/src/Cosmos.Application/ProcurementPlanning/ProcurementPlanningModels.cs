using Cosmos.Contracts.ProcurementPlanning;

namespace Cosmos.Application.ProcurementPlanning;

public sealed record ImportLookupRow(long SalesChannelId, string ChannelCode, long? MappingId, string? ChannelSku, long? ItemId, string? ItemCode, string? ItemName);

public sealed record ParsedSalesImportRow(
    int RowNumber,
    DateOnly? SalesDate,
    string? ChannelCode,
    string? ChannelSku,
    string? ChannelProductName,
    decimal? Quantity,
    IReadOnlyCollection<string> Errors);

public sealed record ConfirmedSalesImportRow(
    int RowNumber,
    DateOnly SalesDate,
    long SalesChannelId,
    string ChannelSku,
    string? ChannelProductName,
    long? ItemId,
    decimal Quantity,
    string SourceRowJson);

public sealed record ProductSalesInput(
    long ItemId,
    string ItemCode,
    string ItemName,
    bool IsActive,
    int? ProcurementClassification,
    decimal Quantity);

public sealed record BomCalculationInput(
    long FinishedProductItemId,
    long ComponentItemId,
    string ComponentItemCode,
    string ComponentItemName,
    bool ComponentIsActive,
    int? ProcurementClassification,
    long UnitId,
    string UnitName,
    string UnitShortName,
    decimal QuantityRequired,
    bool TrackInventory,
    decimal CurrentStock,
    long? SettingId,
    decimal? ConfiguredLeadTimeDays,
    decimal? LeadTimeOverrideDays,
    decimal? AverageHistoricalLeadTimeDays,
    decimal? SafetyFactor,
    decimal? MinimumOrderQuantity,
    decimal? OrderMultiple,
    bool? AutomaticCalculationEnabled,
    bool? ManualPlanning,
    int? RoundingRule,
    bool? SettingIsActive,
    decimal ValidInboundQuantity = 0m);

public sealed record UnmappedSalesInput(string ChannelCode, string ChannelSku, int OccurrenceCount);

public sealed record ProcurementCalculationData(
    IReadOnlyCollection<ProductSalesInput> ProductSales,
    IReadOnlyCollection<BomCalculationInput> BomComponents,
    IReadOnlyCollection<UnmappedSalesInput> UnmappedSales);

public sealed record ProcurementCalculationResult(
    PlanningValidationDto Validation,
    IReadOnlyCollection<PlanningCalculationLineDto> Lines);

public sealed record SalesSummaryFlatRow(long ItemId, string ItemCode, string ItemName, long SalesChannelId, string ChannelCode, decimal Quantity);

public sealed record PlanningRunSaveModel(
    DateOnly FromDate,
    DateOnly ToDate,
    int NumberOfDays,
    DateTime CalculatedAtUtc,
    string? Notes,
    string CalculationVersion,
    string InventoryBasis,
    IReadOnlyCollection<PlanningCalculationLineDto> Lines);
