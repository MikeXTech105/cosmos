using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.DispatchPlanning;

public sealed record DispatchSkuSettingQuery(
    string? Search = null,
    long? ItemId = null,
    long? ChannelId = null,
    bool? IsActive = null,
    DateOnly? EffectiveOn = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record DispatchSkuSettingDto(
    long Id,
    long ItemId,
    string ItemCode,
    string ItemName,
    long? ChannelId,
    string? ChannelCode,
    long? PackagingProfileId,
    string? PackagingCode,
    int Tier,
    decimal SafetyStockFactor,
    decimal RecurringDemandFactor,
    decimal MinimumDispatchQuantity,
    bool AllowLooseQuantity,
    int RoundingMode,
    int AllocationPriority,
    bool IsActive,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? UpdatedAtUtc,
    long? UpdatedBy,
    int TotalCount = 0)
{
    public DispatchSkuSettingDto() : this(0, 0, string.Empty, string.Empty, null, null, null, null, 0, 0, 0, 0, false, 0, 0, false, null, null, default, null, null, null, 0) { }
}

public sealed record SaveDispatchSkuSettingRequest(
    long ItemId,
    long? ChannelId,
    long? PackagingProfileId,
    int Tier,
    decimal SafetyStockFactor,
    decimal RecurringDemandFactor,
    decimal MinimumDispatchQuantity,
    bool AllowLooseQuantity,
    int RoundingMode,
    int AllocationPriority,
    bool IsActive = true,
    DateOnly? EffectiveFrom = null,
    DateOnly? EffectiveTo = null);

public sealed record DispatchSnapshotImportRowRequest(
    int RowNumber,
    long WarehouseId,
    string ChannelSku,
    DateOnly? PeriodFrom = null,
    DateOnly? PeriodTo = null,
    DateOnly? SnapshotDate = null,
    decimal? SalesQuantity = null,
    decimal? AvailableQuantity = null,
    decimal? ReservedQuantity = null,
    decimal? DamagedQuantity = null,
    decimal? InboundQuantity = null,
    DateOnly? ExpectedArrivalDate = null,
    int? InboundStatus = null,
    string? ReferenceNumber = null,
    string? SourceReference = null);

public sealed record ValidateDispatchSnapshotImportRequest(
    string OriginalFileName,
    string? FileHash,
    int ImportType,
    long ChannelId,
    IReadOnlyCollection<DispatchSnapshotImportRowRequest> Rows);

public sealed record ValidateManualDispatchSnapshotRequest(
    int ImportType,
    long ChannelId,
    DispatchSnapshotImportRowRequest Row);

public sealed record DispatchSnapshotImportValidationDto(
    long BatchId,
    string ImportType,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int DuplicateRows,
    int UnmatchedSkuCount,
    IReadOnlyCollection<DispatchSnapshotImportRowErrorDto> RowErrors,
    bool CanCommit);

public sealed record DispatchSnapshotImportRowErrorDto(int RowNumber, string Field, string Message, string? OriginalValue = null);

public sealed record DispatchSnapshotImportBatchDto(
    long Id,
    string ImportType,
    long ChannelId,
    string ChannelCode,
    string OriginalFileName,
    string FileHash,
    int Status,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int CommittedRows,
    DateTime UploadedAtUtc,
    long? UploadedBy,
    DateTime? CommittedAtUtc,
    long? CommittedBy,
    int TotalCount = 0)
{
    public DispatchSnapshotImportBatchDto() : this(0, string.Empty, 0, string.Empty, string.Empty, string.Empty, 0, 0, 0, 0, 0, default, null, null, null, 0) { }
}

public sealed record DispatchSnapshotImportBatchQuery(
    int? ImportType = null,
    long? ChannelId = null,
    int? Status = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record CommitDispatchSnapshotImportRequest(bool AllowDuplicate = false, string? CorrectionReason = null);
public sealed record CancelDispatchSnapshotImportRequest(string Reason);

public sealed record CreateDispatchPlanningRunRequest(
    long ChannelId,
    DateOnly PlanningDate,
    long SalesImportBatchId,
    long WarehouseStockImportBatchId,
    long? WarehouseInboundImportBatchId = null,
    int CompanyStockSourceType = 1,
    string? Notes = null);

public sealed record DispatchPlanningRunQuery(
    long? ChannelId = null,
    int? Status = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record DispatchPlanningRunSummaryDto(
    long Id,
    string RunNumber,
    long ChannelId,
    string ChannelCode,
    DateOnly PlanningDate,
    int Status,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? CalculatedAtUtc,
    DateTime? AllocatedAtUtc,
    DateTime? FinalizedAtUtc,
    int LineCount,
    decimal TotalRecommendedQuantity,
    decimal TotalAllocatedQuantity,
    int TotalCount = 0)
{
    public DispatchPlanningRunSummaryDto() : this(0, string.Empty, 0, string.Empty, default, 0, default, null, null, null, null, 0, 0, 0, 0) { }
}

public sealed record DispatchPlanningRunDto(
    long Id,
    string RunNumber,
    long ChannelId,
    string ChannelCode,
    DateOnly PlanningDate,
    long SalesImportBatchId,
    long WarehouseStockImportBatchId,
    long? WarehouseInboundImportBatchId,
    int CompanyStockSourceType,
    int Status,
    string CalculationVersion,
    string? Notes,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? CalculatedAtUtc,
    long? CalculatedBy,
    DateTime? AllocatedAtUtc,
    long? AllocatedBy,
    DateTime? FinalizedAtUtc,
    long? FinalizedBy,
    string? CancellationReason,
    IReadOnlyCollection<DispatchRecommendationDto> Recommendations,
    IReadOnlyCollection<DispatchCompanyStockSnapshotDto> CompanyStockSnapshots);

public sealed record DispatchRecommendationDto(
    long Id,
    long PlanningRunId,
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
    decimal SalesQuantity,
    decimal CurrentSellableQuantity,
    decimal EligibleInboundQuantity,
    decimal TotalWarehouseStock,
    decimal RecurringDemand,
    decimal SafetyStock,
    decimal ReorderPoint,
    decimal RawShortage,
    decimal CalculatedRecommendationQuantity,
    decimal FinalRecommendationQuantity,
    decimal AllocatedQuantity,
    decimal BoxCount,
    string? OverrideReason,
    DateTime? OverriddenAtUtc,
    long? OverriddenBy,
    string CalculationExplanation);

public sealed record DispatchCompanyStockSnapshotDto(
    long Id,
    long PlanningRunId,
    long ItemId,
    string ItemCode,
    decimal AvailableQuantity,
    decimal ReservedForOtherOperations,
    decimal AllocatableQuantity,
    decimal AllocatedQuantity,
    int SourceType,
    string? SourceReference,
    DateTime CapturedAtUtc,
    long? CapturedBy);

public sealed record UpdateDispatchRecommendationRequest(decimal FinalRecommendationQuantity, string OverrideReason);
public sealed record AllocateDispatchPlanningRunRequest(string? Notes = null);
public sealed record CancelDispatchPlanningRunRequest(string Reason);

public sealed record DispatchRecommendationQuery(
    string? Search = null,
    long? WarehouseId = null,
    long? ItemId = null,
    int? Tier = null,
    bool? AllocatedOnly = null);

public sealed record DispatchRecommendationReportQuery(
    long? ChannelId = null,
    long? WarehouseId = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int? Status = 4,
    int PageNumber = 1,
    int PageSize = 200);

public sealed record DispatchRecommendationReportRowDto(
    string RunNumber,
    DateOnly PlanningDate,
    string ChannelCode,
    string WarehouseCode,
    string WarehouseName,
    string ItemCode,
    string ItemName,
    string ChannelSku,
    int Tier,
    decimal RecommendedQuantity,
    decimal AllocatedQuantity,
    decimal BoxCount,
    int RunStatus,
    int TotalCount = 0)
{
    public DispatchRecommendationReportRowDto() : this(string.Empty, default, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, 0, 0, 0, 0, 0, 0) { }
}
