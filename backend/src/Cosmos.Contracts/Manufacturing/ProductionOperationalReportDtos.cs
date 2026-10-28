namespace Cosmos.Contracts.Manufacturing;

public sealed record ProductionOperationalReportRow(long SourceId, string SourceType, DateOnly? BusinessDate,
    long ItemId, long? UnitId, long? ChannelId, decimal? GoodOutput, decimal? RejectedOutput,
    decimal? DispatchedQuantity, decimal? ReturnedQuantity, decimal? PlannedQuantity,
    decimal? OnHandQuantity, decimal? ReservedQuantity, decimal? AvailableQuantity,
    decimal? ReconciliationDifference, string? DataQualityFlag)
{
    public string CalculationVersion {get;init;}="business-ledger-events-v1";
    public string? ItemCode { get; init; }
    public string? ItemName { get; init; }
    public string? UnitName { get; init; }
    public long? SourceLineId { get; init; }
    public decimal? SignedQuantity { get; init; }
    public decimal? OwnedReservedQuantity { get; init; }
    public decimal? RequiredMinutes { get; init; }
    public DateOnly? DueDate { get; init; }
    public bool? OnTime { get; init; }
    public long? SourceDocumentId { get; init; }
    public string? SourceDocumentType { get; init; }
}
