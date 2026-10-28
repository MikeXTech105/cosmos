namespace Cosmos.Contracts.Oee;

// These attestations are operational evidence, never zero-valued OEE readings.
public sealed record OeeDayAcknowledgementDto(long Id, DateOnly ProductionDate, long MachineId, string MachineCode,
    string MachineName, string State, string Reason, long? PreviousId, DateTime CreatedAt, long? CreatedBy, int TotalCount = 0);
public sealed record OeeDayAcknowledgementQuery(DateOnly FromDate, DateOnly ToDate, long? MachineId = null, int PageNumber = 1, int PageSize = 100);
public sealed record SaveOeeDayAcknowledgementRequest(DateOnly ProductionDate, long MachineId, string State, string Reason,
    long? PreviousId, Guid CommandKey);
