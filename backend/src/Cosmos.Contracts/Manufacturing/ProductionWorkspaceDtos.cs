using Cosmos.Domain.Manufacturing;

namespace Cosmos.Contracts.Manufacturing;

public sealed record ProductionWorkspaceQuery(string? Search = null, long? ItemId = null, int? Status = null,
    DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 50, long? FinishedItemId = null,
    DateOnly? AsOfDate = null, long? ChannelId = null);
public sealed record WorkCentreRequest(string Code, string Name, bool IsActive, long? DefaultShiftId,
    string CapacityBasis, string? Notes = null, string? Version = null);
public sealed record OperationRequest(string Code, string Name, bool IsActive, ProductionRateBasis RateBasis,
    decimal? DefaultRate, string? Notes = null, string? Version = null);
public sealed record ProductionMasterDto(long Id, string Code, string Name, bool IsActive, string Version)
{
    public long? DefaultShiftId { get; init; }
    public string? CapacityBasis { get; init; }
    public ProductionRateBasis? RateBasis { get; init; }
    public decimal? DefaultRate { get; init; }
    public string? Notes { get; init; }
}
public sealed record RoutingStepRequest(int Sequence, long OperationId, long WorkCentreId, ProductionRateBasis RateBasis,
    decimal Rate, decimal SetupMinutes, decimal QuantityBasis, long? MachineId = null, long? MouldId = null);
public sealed record ItemRoutingRequest(string Revision, DateOnly EffectiveFrom, DateOnly? EffectiveTo,
    IReadOnlyCollection<RoutingStepRequest> Steps);
public sealed record ItemEligibilityRequest(long MachineId, long MouldId, decimal SkuOutputPerShot,
    DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive = true);
public sealed record WorkCentreShiftRequest(long ShiftId, DateOnly EffectiveFrom, DateOnly? EffectiveTo,
    int BreakMinutes, decimal CapacityFactor = 1, bool IsActive = true);
public sealed record ProductionOrderDraftRequest(DateOnly BusinessDate, DateOnly PlannedStart, DateOnly DueDate,
    long ItemId, long BomId, long RoutingId, decimal PlannedQuantity, long MachineId, long MouldId, long ShiftId,
    string? Reference = null, string? Notes = null, long? ChannelId = null, Guid? SourcePlanId = null,
    string? SourceLineId = null, string? Version = null);
public sealed record ProductionOrderReleaseRequest(string Version, decimal Quantity, string IdempotencyKey);
public sealed record ProductionOrderActionRequest(string Version, string Reason, string IdempotencyKey);
public sealed record ProductionConsumptionRequest(long ItemId, long UnitId, decimal ConsumedQuantity,
    decimal ScrapQuantity = 0, decimal ReturnedQuantity = 0);
public sealed record ProductionCompletionRequest(string Version, string IdempotencyKey, DateOnly BusinessDate,
    DateTimeOffset OccurredAt, decimal GoodOutput, decimal RejectedOutput, long MachineId, long MouldId,
    long ShiftId, IReadOnlyCollection<ProductionConsumptionRequest> Materials, string? VarianceReason = null,
    string? SourceReference = null);
public sealed record ProductionOrderDto(long Id, string OrderNumber, ProductionOrderStatus Status,
    DateOnly BusinessDate, DateOnly PlannedStart, DateOnly DueDate, long ItemId, long UnitId, long BomId,
    long RoutingId, decimal PlannedQuantity, decimal ReleasedQuantity, decimal CompletedQuantity,
    decimal RejectedQuantity, decimal RemainingQuantity, string Version, string? Notes)
{
    public int Revision { get; init; } = 1;
}
public sealed record ProductionCommandResult(long Id, string Version, string Status, long? CompletionId = null);
public sealed record ProductionReportRow(long SourceId, string SourceType, DateOnly BusinessDate, long ItemId,
    string ItemCode, long? UnitId, decimal? RequiredQuantity, decimal? ExpectedConsumption,
    decimal? ActualConsumedQuantity, decimal? MaterialWasteQuantity, decimal? GoodOutput,
    decimal? RejectedOutput, decimal? WastePercent, string? DataQualityFlag)
{
    public string CalculationVersion {get;init;}="production-actual-v1";
    public string? ItemName { get; init; }
    public string? UnitName { get; init; }
    public long? FinishedItemId { get; init; }
}
public sealed record ProductionUnitTotal(long UnitId, decimal? RequiredQuantity, decimal? ExpectedConsumption,
    decimal? ActualConsumedQuantity, decimal? MaterialWasteQuantity, decimal? GoodOutput, decimal? RejectedOutput);
public sealed record FinishedPlanningRequest(DateOnly AsOfDate, DateOnly DemandFrom, DateOnly DemandTo,
    int FreshnessDays = 30, long? ChannelId = null, IReadOnlyCollection<long>? ItemIds = null);
public sealed record FinishedPlanningLine(long ItemId, long UnitId, decimal? DemandQuantity, DateOnly? RefreshedOn,
    decimal PhysicalStock, decimal ReservedStock, decimal OpenReleasedOutput, decimal? DailyDemand,
    decimal? Target21, decimal? Warning15, decimal? SevenDayDemand, decimal? FourWeekSlice,
    decimal? CoverageDays, decimal? SuggestedProduction, DemandFreshness Freshness, string SourceRevision)
{
    public decimal? Monthly30Demand { get; init; }
    public decimal EligibleInboundQuantity { get; init; }
    public string? InboundDataQualityFlag { get; init; }
}
public sealed record FinishedPlanningSnapshot(Guid Id, DateOnly AsOfDate, string CalculationVersion,
    string InventoryBasis, IReadOnlyCollection<FinishedPlanningLine> Lines)
{
    public DateOnly DemandFrom {get;init;}
    public DateOnly DemandTo {get;init;}
    public int FreshnessDays {get;init;}
    public long? ChannelId {get;init;}
}
public sealed record FinishedPlanningSnapshotPage(Guid Id, DateOnly AsOfDate, string CalculationVersion,
    string InventoryBasis, Cosmos.Contracts.Common.PagedResult<FinishedPlanningLine> Lines)
{
    public DateOnly? DemandFrom {get;init;}
    public DateOnly? DemandTo {get;init;}
    public int? FreshnessDays {get;init;}
    public long? ChannelId {get;init;}
}
public sealed record StockBalanceDto(long Id,long UnitId,decimal CurrentStock,decimal ReservedStock,string Version);
public sealed record StockAdjustmentRequest(string Version,string IdempotencyKey,DateOnly BusinessDate,long UnitId,
    decimal SignedQuantity,string Reason,string SourceReference);
public sealed record ProductionImportRow(string Tab, int Row, string Column, string EventFingerprint,
    string OriginalJson, string? NormalizedJson, string? ExceptionCode);
public sealed record ProductionImportRequest(string FileFingerprint, string FileName, DateOnly CutoverDate,
    IReadOnlyCollection<ProductionImportRow> Rows);
public sealed record ProductionImportResult(Guid BatchId, int Rows, int Exceptions, string Status)
{
    public string? Version { get; init; }
}
public sealed record ProductionMaterialSnapshot(long Id, long ItemId, long UnitId, decimal QuantityPerOutput,
    decimal WastePercent, decimal RequiredQuantity, decimal ConsumedQuantity, decimal SourceComponentQuantity, decimal OutputBaseQuantity);
public sealed record ProductionCompletionDto(long Id, DateOnly BusinessDate, DateTimeOffset OccurredAt,
    decimal GoodOutput, decimal RejectedOutput, long MachineId, long MouldId, long ShiftId,
    long? ReversalOfId, long? ReversedById, string? SourceReference, string? VarianceReason);
public sealed record ProductionOrderContextDto(ProductionOrderDto Order, IReadOnlyCollection<ProductionMaterialSnapshot> Materials,
    string? BomSnapshotJson, string? RouteSnapshotJson, IReadOnlyCollection<ProductionCompletionDto> Completions);
public sealed record RoutingConfigurationDto(long Id, string Revision, DateOnly EffectiveFrom, DateOnly? EffectiveTo,
    bool IsActive, string Version, IReadOnlyCollection<RoutingStepRequest> Steps);
public sealed record EligibilityConfigurationDto(long Id, long MachineId, long MouldId, decimal SkuOutputPerShot,
    DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive, string Version);
public sealed record ShiftConfigurationDto(long Id, long ShiftId, DateOnly EffectiveFrom, DateOnly? EffectiveTo,
    int BreakMinutes, decimal CapacityFactor, bool IsActive, string Version);
public sealed record ProductionConfigurationDto(IReadOnlyCollection<RoutingConfigurationDto> Routings,
    IReadOnlyCollection<EligibilityConfigurationDto> Eligibility, IReadOnlyCollection<ShiftConfigurationDto> Shifts);
