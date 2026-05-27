using Cosmos.Domain.Common;

namespace Cosmos.Domain.Entities;

public class Field : AuditableEntity
{
    public Guid SectionId { get; init; }
    public string SectionName { get; init; } = string.Empty;
    public string FieldName { get; init; } = string.Empty;
    public string FieldKey { get; init; } = string.Empty;
    public string FieldType { get; init; } = string.Empty;
}
