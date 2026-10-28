namespace Cosmos.Contracts.Manufacturing;

public sealed record PackagingConversionRequest(string Version,string IdempotencyKey,long SourceUnitId,
    decimal SourceQuantityBasis,decimal BaseQuantityBasis,string SourceReference);
public sealed record PackagingConversionDto(long Id,string Version,long ItemId,long? SourceUnitId,long? BaseUnitId,
    decimal? SourceQuantityBasis,decimal? BaseQuantityBasis,string? SourceReference);

public enum ProductionImportDisposition { HistoricalProduction = 1, HistoricalDispatch = 2, DemandAggregate = 3, Opening = 4, MasterReference = 5, PendingPurchase = 6, EvidenceOnly = 7 }
public sealed record ProductionImportMappingRequest(string Version, string IdempotencyKey, long RowId,
    ProductionImportDisposition Disposition, long? ItemId, long? SourceUnitId, decimal? SourceQuantity,
    DateOnly? BusinessDate, string SourceReference, string Reason, long? ChannelId = null,
    DateOnly? ObservedFrom = null, DateOnly? ObservedTo = null, DateOnly? RefreshedOn = null,
    long? PackagingProfileId = null, decimal? SourceUnitCost = null, long? PurchaseOrderLineId = null, Guid? SupplierId = null);
public sealed record ProductionImportActionRequest(string Version, string IdempotencyKey,
    IReadOnlyCollection<long> RowIds, string Reason);
public sealed record ProductionImportPreviewRow(long Id, string Tab, int RowNumber, string ColumnName,
    string EventFingerprint, string OriginalJson, string? NormalizedJson, string? ExceptionCode,
    ProductionImportDisposition? Disposition, string RowStatus, decimal? ReconciliationDifference);
public sealed record ProductionImportPreview(Guid BatchId, string Version, string Status,
    Cosmos.Contracts.Common.PagedResult<ProductionImportPreviewRow> Rows)
{
    public DateOnly? CutoverDate { get; init; }
    public string? FileName { get; init; }
    public string? FileFingerprint { get; init; }
}
