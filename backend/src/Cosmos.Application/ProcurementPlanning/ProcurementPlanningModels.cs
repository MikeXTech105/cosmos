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
    decimal ValidInboundQuantity = 0m)
{
    public decimal? SourceComponentQuantity { get; init; }
    public decimal? BomOutputBaseQuantity { get; init; }
    public decimal? BomWastePercentage { get; init; }
    public int BomSelectionCount { get; init; } = 1;
    public bool UnitVerified { get; init; } = true;
    public decimal ReservedStock { get; init; }
    public BomCalculationInput() : this(0,0,string.Empty,string.Empty,false,null,0,string.Empty,string.Empty,0,false,0,null,null,null,null,null,null,null,null,null,null,null) { }
}

public sealed record UnmappedSalesInput(string ChannelCode, string ChannelSku, int OccurrenceCount);

public sealed record ProcurementCalculationData(
    IReadOnlyCollection<ProductSalesInput> ProductSales,
    IReadOnlyCollection<BomCalculationInput> BomComponents,
    IReadOnlyCollection<UnmappedSalesInput> UnmappedSales)
{
    public string? SourceRevision { get; init; }
}

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
    IReadOnlyCollection<PlanningCalculationLineDto> Lines)
{
    public string? SourceRevision { get; init; }
}
