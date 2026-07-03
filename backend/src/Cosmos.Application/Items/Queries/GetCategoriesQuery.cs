namespace Cosmos.Application.Items.Queries;

public sealed record GetCategoriesQuery(
    string? Search,
    bool? IsActive,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "Name",
    string? SortDirection = "ASC");
