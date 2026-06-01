namespace Cosmos.Domain.Entities;

public sealed class Page
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public int? ParentPageId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}
