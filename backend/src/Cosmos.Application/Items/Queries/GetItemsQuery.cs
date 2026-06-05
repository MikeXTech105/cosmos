namespace Cosmos.Application.Items.Queries;

public sealed record GetItemsQuery(
    string? Search,
    string? Barcode,
    string? ItemCode,
    long? CategoryId,
    bool? IsActive,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "Name",
    string? SortDirection = "ASC");
