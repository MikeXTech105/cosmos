namespace Cosmos.Application.Parties.Queries;

public sealed record GetPartiesQuery(
    string? Search,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "PartyName",
    string? SortDirection = "ASC",
    bool? IsActive = null);
