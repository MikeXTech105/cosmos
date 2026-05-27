using Cosmos.Domain.Common;

namespace Cosmos.Domain.Entities;

public class Page : AuditableEntity
{
    public string PageName { get; init; } = string.Empty;
    public string RoutePath { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public string? MenuGroup { get; init; }
    public int DisplayOrder { get; init; }
    public bool ShowInMenu { get; init; }
}
