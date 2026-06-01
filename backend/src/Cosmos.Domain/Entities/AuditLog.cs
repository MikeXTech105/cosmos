namespace Cosmos.Domain.Entities;

public sealed class AuditLog
{
    public long Id { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RecordId { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedOn { get; set; }
}
