namespace Cosmos.Application.Items.Queries;

public sealed record GetUnitsQuery(
    string? Search,
    bool? IsActive,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "Name",
    string? SortDirection = "ASC");
