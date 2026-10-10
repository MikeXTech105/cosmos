using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.ProcurementPlanning;

public sealed record ProcurementListQuery(
    string? Search = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record SalesChannelDto(
    long Id,
    string Code,
    string Name,
    int DisplayOrder,
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    int TotalCount = 0)
{
    public SalesChannelDto() : this(0, string.Empty, string.Empty, 0, false, default, null, null, null, 0) { }
}

public sealed record SaveSalesChannelRequest(string Code, string Name, int DisplayOrder, bool IsActive = true);
public sealed record ChangeActiveStatusRequest(bool IsActive);

public sealed record ChannelSkuMappingDto(
    long Id,
    long SalesChannelId,
    string ChannelCode,
    string ChannelName,
    string ChannelSku,
    string? ChannelProductName,
    long ItemId,
    string ItemCode,
    string ItemName,
    int? ProcurementClassification,
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    int TotalCount = 0)
{
    public ChannelSkuMappingDto() : this(0, 0, string.Empty, string.Empty, string.Empty, null, 0, string.Empty, string.Empty, null, false, default, null, null, null, 0) { }
}

public sealed record ChannelSkuMappingQuery(
    string? Search = null,
    long? SalesChannelId = null,
    long? ItemId = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record SaveChannelSkuMappingRequest(
    long SalesChannelId,
    string ChannelSku,
    string? ChannelProductName,
    long ItemId,
    bool IsActive = true);

public sealed record UnmappedChannelSkuDto(
    long SalesChannelId,
    string ChannelCode,
    string ChannelSku,
    string? ChannelProductName,
    int OccurrenceCount,
    DateOnly FirstSalesDate,
    DateOnly LastSalesDate);

public sealed record SalesImportRowPreviewDto(
    int RowNumber,
    DateOnly? SalesDate,
    string? ChannelCode,
    string? ChannelSku,
    string? ChannelProductName,
    decimal? Quantity,
    long? SalesChannelId,
    long? ItemId,
    string? ItemCode,
    string? ItemName,
    IReadOnlyCollection<string> Errors)
{
    public bool IsValid => Errors.Count == 0;
    public bool IsMapped => ItemId.HasValue;
}

public sealed record SalesImportPreviewDto(
    string FileName,
    string FileHash,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int UnmappedRows,
    bool DuplicateFile,
    IReadOnlyCollection<SalesImportRowPreviewDto> Rows);

public sealed record SalesImportConfirmResultDto(
    long BatchId,
    string BatchNumber,
    int ImportedRows,
    int UnmappedRows,
    string FileHash);

public sealed record SalesImportBatchDto(
    long Id,
    string BatchNumber,
    string OriginalFileName,
    string FileHash,
    int TotalRows,
    int ImportedRows,
    int UnmappedRows,
    int Status,
    string? CorrectionReason,
    DateTime CreatedAt,
    long? CreatedBy,
    int TotalCount = 0)
{
    public SalesImportBatchDto() : this(0, string.Empty, string.Empty, string.Empty, 0, 0, 0, 0, null, default, null, 0) { }
}

public sealed record SalesImportBatchQuery(int PageNumber = 1, int PageSize = 20);

public sealed record ManualSalesEntryRequest(
    DateOnly SalesDate,
    long SalesChannelId,
    string ChannelSku,
    string? ChannelProductName,
    long? ItemId,
    decimal Quantity,
    string? Notes);

public sealed record SalesHistoryQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    long? SalesChannelId = null,
    long? ItemId = null,
    long? ImportBatchId = null,
    bool? IsMapped = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record SalesImportBatchDetailsDto(
    SalesImportBatchDto Batch,
    IReadOnlyCollection<SalesHistoryDto> Rows);

public sealed record CancelSalesImportBatchRequest(string Reason);

public sealed record SalesHistoryDto(
    long Id,
    DateOnly SalesDate,
    long SalesChannelId,
    string ChannelCode,
    string ChannelSku,
    string? ChannelProductName,
    long? ItemId,
    string? ItemCode,
    string? ItemName,
    decimal Quantity,
    long? ImportBatchId,
    bool IsManual,
    string? Notes,
    DateTime CreatedAt,
    long? CreatedBy,
    int TotalCount = 0)
{
    public SalesHistoryDto() : this(0, default, 0, string.Empty, string.Empty, null, null, null, null, 0, null, false, null, default, null, 0) { }
}

public sealed record SalesSummaryChannelDto(long Id, string Code, string Name, int DisplayOrder);
public sealed record ProductSalesSummaryRowDto(
    long ItemId,
    string ItemCode,
    string ItemName,
    IReadOnlyDictionary<string, decimal> ChannelQuantities,
    decimal TotalQuantity);
public sealed record ProductSalesSummaryDto(
    DateOnly FromDate,
    DateOnly ToDate,
    int NumberOfDays,
    IReadOnlyCollection<SalesSummaryChannelDto> Channels,
    IReadOnlyCollection<ProductSalesSummaryRowDto> Products);

public sealed record BomComponentDto(
    long Id,
    long FinishedProductItemId,
    long ComponentItemId,
    string ComponentItemCode,
    string ComponentItemName,
    long UnitId,
    string UnitName,
    string UnitShortName,
    decimal QuantityRequired,
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy);

public sealed record ProductBomDto(
    long FinishedProductItemId,
    string FinishedProductItemCode,
    string FinishedProductItemName,
    int? ProcurementClassification,
    IReadOnlyCollection<BomComponentDto> Components);

public sealed record SaveBomComponentRequest(long ComponentItemId, decimal QuantityRequired, long? UnitId = null, bool IsActive = true);
public sealed record SaveProductBomRequest(IReadOnlyCollection<SaveBomComponentRequest> Components);

public sealed record ProcurementConfigurationIssueDto(
    string Code,
    long? ItemId,
    string? ItemCode,
    string? ItemName,
    string Message);

public sealed record ProcurementSettingDto(
    long Id,
    long ItemId,
    string ItemCode,
    string ItemName,
    long UnitId,
    string UnitName,
    decimal? ConfiguredLeadTimeDays,
    decimal? LeadTimeOverrideDays,
    decimal? AverageHistoricalLeadTimeDays,
    decimal SafetyFactor,
    decimal MinimumOrderQuantity,
    decimal? OrderMultiple,
    bool AutomaticCalculationEnabled,
    bool ManualPlanning,
    int RoundingRule,
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    int TotalCount = 0)
{
    public ProcurementSettingDto() : this(0, 0, string.Empty, string.Empty, 0, string.Empty, null, null, null, 0, 0, null, false, false, 0, false, default, null, null, null, 0) { }
}

public sealed record ProcurementSettingQuery(
    string? Search = null,
    bool? AutomaticCalculationEnabled = null,
    bool? ManualPlanning = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record SaveProcurementSettingRequest(
    long ItemId,
    decimal? ConfiguredLeadTimeDays,
    decimal? LeadTimeOverrideDays,
    decimal SafetyFactor,
    decimal MinimumOrderQuantity,
    decimal? OrderMultiple,
    bool AutomaticCalculationEnabled,
    bool ManualPlanning,
    int RoundingRule,
    bool IsActive = true);

public sealed record LeadTimeHistoryDto(
    long Id,
    long ItemId,
    string ItemCode,
    string ItemName,
    string? Reference,
    DateOnly OrderedDate,
    DateOnly ReceivedDate,
    decimal LeadTimeDays,
    string? Notes,
    DateTime CreatedAt,
    long? CreatedBy);

public sealed record CreateLeadTimeHistoryRequest(
    long ItemId,
    string? Reference,
    DateOnly OrderedDate,
    DateOnly ReceivedDate,
    string? Notes);

public sealed record PlanningRequest(DateOnly FromDate, DateOnly ToDate, string? Notes = null);

public sealed record PlanningValidationMessageDto(
    int Severity,
    string Code,
    string Message,
    long? ItemId = null,
    string? ItemCode = null,
    string? ChannelCode = null,
    string? ChannelSku = null);

public sealed record PlanningValidationDto(
    IReadOnlyCollection<PlanningValidationMessageDto> BlockingErrors,
    IReadOnlyCollection<PlanningValidationMessageDto> Warnings,
    IReadOnlyCollection<PlanningValidationMessageDto> Information)
{
    public bool CanCalculate => BlockingErrors.Count == 0;
}

public sealed record PlanningCalculationLineDto(
    long MaterialItemId,
    string MaterialItemCode,
    string MaterialItemName,
    long UnitId,
    string UnitName,
    string UnitShortName,
    decimal MaterialRequirement,
    decimal AverageDailyUsage,
    decimal LeadTimeDays,
    string LeadTimeSource,
    decimal LeadTimeDemand,
    decimal SafetyFactor,
    decimal SafetyStock,
    decimal ReorderPoint,
    decimal PhysicalStock,
    decimal Shortage,
    decimal MinimumOrderQuantity,
    decimal? OrderMultiple,
    int RoundingRule,
    bool AutomaticCalculationEnabled,
    bool ManualPlanning,
    decimal CalculatedSuggestedQuantity,
    decimal FinalQuantity,
    string? AdjustmentReason,
    IReadOnlyCollection<string> Warnings,
    string CalculationExplanation,
    decimal InboundStock = 0m,
    decimal ProjectedAvailableStock = 0m);

public sealed record PlanningPreviewDto(
    DateOnly FromDate,
    DateOnly ToDate,
    int NumberOfDays,
    DateTime CalculatedAtUtc,
    PlanningValidationDto Validation,
    IReadOnlyCollection<PlanningCalculationLineDto> Lines);

public sealed record PlanningRunSummaryDto(
    long Id,
    string RunNumber,
    DateOnly FromDate,
    DateOnly ToDate,
    int NumberOfDays,
    int Status,
    DateTime CalculatedAtUtc,
    DateTime CreatedAt,
    long? CreatedBy,
    string? CreatedByName,
    string? Notes,
    int LineCount,
    int PurchaseLineCount,
    int TotalCount = 0);

public sealed record PlanningRunLineDto(
    long Id,
    long PlanningRunId,
    long MaterialItemId,
    string MaterialItemCode,
    string MaterialItemName,
    long UnitId,
    string UnitName,
    string UnitShortName,
    decimal MaterialRequirement,
    decimal AverageDailyUsage,
    decimal LeadTimeDays,
    string LeadTimeSource,
    decimal LeadTimeDemand,
    decimal SafetyFactor,
    decimal SafetyStock,
    decimal ReorderPoint,
    decimal PhysicalStock,
    decimal Shortage,
    decimal MinimumOrderQuantity,
    decimal? OrderMultiple,
    int RoundingRule,
    bool AutomaticCalculationEnabled,
    bool ManualPlanning,
    decimal CalculatedSuggestedQuantity,
    decimal FinalQuantity,
    string? AdjustmentReason,
    string? WarningState,
    string CalculationExplanation,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    decimal InboundStock = 0m,
    decimal ProjectedAvailableStock = 0m);

public sealed record PlanningRunDto(
    long Id,
    string RunNumber,
    DateOnly FromDate,
    DateOnly ToDate,
    int NumberOfDays,
    int Status,
    DateTime CalculatedAtUtc,
    string CalculationVersion,
    string InventoryBasis,
    string? Notes,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? FinalizedAt,
    long? FinalizedBy,
    IReadOnlyCollection<PlanningRunLineDto> Lines);

public sealed record PlanningRunQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int? Status = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record PlanningRunLineQuery(
    string? Search = null,
    bool? PurchaseOnly = null,
    bool? HasWarnings = null,
    bool? ManualPlanning = null);

public sealed record UpdatePlanningLineRequest(decimal FinalQuantity, string? AdjustmentReason);
public sealed record CancelPlanningRunRequest(string Reason);
public sealed record ProcurementExportFileDto(string FileName, string ContentType, byte[] Content);
