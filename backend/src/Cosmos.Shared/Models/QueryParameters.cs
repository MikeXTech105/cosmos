namespace Cosmos.Shared.Models;

/// <summary>
/// Common paging, filtering, and sorting parameters for list endpoints.
/// </summary>
public class QueryParameters
{
    private const int MaximumPageSize = 100;
    private int _pageSize = 20;

    public int PageNumber { get; init; } = 1;

    public int PageSize
    {
        get => _pageSize;
        init => _pageSize = Math.Clamp(value, 1, MaximumPageSize);
    }

    public string? SearchTerm { get; init; }
    public string? SortBy { get; init; }
    public string SortDirection { get; init; } = "asc";
    public bool? IsActive { get; init; }
}
