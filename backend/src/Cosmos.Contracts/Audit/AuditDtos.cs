namespace Cosmos.Contracts.Audit;

/// <summary>Backward-compatible business audit write contract used by application services.</summary>
public sealed record AuditEntryRequest(
    string TableName,
    string RecordId,
    string ActionType,
    string? OldValues,
    string? NewValues,
    int? CreatedBy,
    string? Module = null,
    string? EntityType = null,
    string? EntityDisplayValue = null,
    string? Description = null,
    string? ChangedFieldsJson = null,
    string? RequestPath = null,
    string? HttpMethod = null,
    int? HttpStatusCode = null,
    string? CorrelationId = null,
    string? IpAddress = null,
    string? UserAgent = null,
    string? Source = null,
    string? ActorUsername = null,
    string? ActorDisplayName = null);

/// <summary>Safe request metadata supplied by the API boundary without coupling application services to HttpContext.</summary>
public sealed record AuditRequestContext(
    int? UserId,
    string? Username,
    string? UserDisplayName,
    string? RequestPath,
    string? HttpMethod,
    string? CorrelationId,
    string? IpAddress,
    string? UserAgent,
    string? Source);

public interface IAuditRequestContext
{
    AuditRequestContext GetCurrent();
}
