namespace Cosmos.Contracts.Pages;

public sealed record PageDto(int Id, string Name, string DisplayName, string Route, string? Icon, int? ParentPageId, int SortOrder, bool IsActive);
public sealed record CreatePageRequest(string Name, string DisplayName, string Route, string? Icon, int? ParentPageId, int SortOrder, bool IsActive);
public sealed record UpdatePageRequest(string DisplayName, string Route, string? Icon, int? ParentPageId, int SortOrder, bool IsActive);
