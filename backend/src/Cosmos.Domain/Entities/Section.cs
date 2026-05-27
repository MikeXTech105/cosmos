using Cosmos.Domain.Common;

namespace Cosmos.Domain.Entities;

public class Section : AuditableEntity
{
    public Guid PageId { get; init; }
    public string PageName { get; init; } = string.Empty;
    public string SectionName { get; init; } = string.Empty;
    public string SectionKey { get; init; } = string.Empty;
}
