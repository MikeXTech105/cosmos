namespace Cosmos.Contracts.Audit;

public sealed record AuditEntryRequest(string TableName, string RecordId, string ActionType, string? OldValues, string? NewValues, int? CreatedBy);
