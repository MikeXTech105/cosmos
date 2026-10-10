namespace Cosmos.Contracts.Audit;

public static class ActivityLogMapper
{
    public static ActivityLogDetailDto ToDetail(ActivityLogDetailRow row) => new(
        row.Id,
        DateTime.SpecifyKind(row.TimestampUtc, DateTimeKind.Utc),
        row.UserId,
        row.Username,
        row.UserDisplayName,
        row.Action,
        row.Module,
        row.EntityType,
        row.EntityId,
        row.EntityDisplayValue,
        row.Description,
        AuditPayloadSanitizer.ParseForResponse(row.OldValues),
        AuditPayloadSanitizer.ParseForResponse(row.NewValues),
        AuditPayloadSanitizer.ParseChangedFields(row.ChangedFieldsJson),
        row.HttpMethod,
        row.RequestPath,
        row.HttpStatusCode,
        row.CorrelationId,
        row.IpAddress,
        row.UserAgent,
        row.Source);
}
