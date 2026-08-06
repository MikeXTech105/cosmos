using System.ComponentModel;
using System.Text.Json.Serialization;

namespace Cosmos.Contracts.DataBook;

public sealed record DataBookEntryDto(
    long Id,
    string Name,
    string Value,
    string? Description,
    string? Category,
    bool IsPrivate,
    int OwnerUserId,
    string? OwnerUserName,
    int CreatedBy,
    string? CreatedByName,
    DateTime CreatedAtUtc,
    int? UpdatedBy,
    string? UpdatedByName,
    DateTime? UpdatedAtUtc,
    byte[] RowVersion)
{
    public bool CanEdit { get; init; }
    public bool CanDelete { get; init; }
}

public sealed record DataBookEntryListItemDto(
    long Id,
    string Name,
    string ValuePreview,
    string? Description,
    string? Category,
    bool IsPrivate,
    [property: JsonIgnore] int OwnerUserId,
    string? OwnerUserName,
    string? CreatedByName,
    DateTime CreatedAtUtc,
    string? UpdatedByName,
    DateTime? UpdatedAtUtc,
    byte[] RowVersion,
    int TotalCount)
{
    public bool CanEdit { get; init; }
    public bool CanDelete { get; init; }
}

public sealed record DataBookEntryHistoryDto(
    long Id,
    long EntryId,
    string ActionType,
    int ChangedByUserId,
    string? ChangedByName,
    DateTime ChangedAtUtc,
    string ChangedFieldsJson,
    string? OldDataJson,
    string? NewDataJson,
    string? CorrelationId);

public sealed record CreateDataBookEntryRequest(
    string Name,
    string Value,
    string? Description,
    string? Category,
    bool IsPrivate);

public sealed record UpdateDataBookEntryRequest(
    string Name,
    string Value,
    string? Description,
    string? Category,
    bool IsPrivate,
    string RowVersion);

public sealed record DeleteDataBookEntryRequest(string RowVersion);

public sealed record DataBookEntryListQuery(
    string? Search = null,
    string? Category = null,
    string? Visibility = null,
    int? CreatedByUserId = null,
    int? UpdatedByUserId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record DataBookExportRequest(
    string? Search = null,
    string? Category = null,
    string? Visibility = null,
    int? CreatedByUserId = null,
    int? UpdatedByUserId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record DataBookExportDto(
    [property: DisplayName("Name")] string Name,
    [property: DisplayName("Value")] string Value,
    [property: DisplayName("Description")] string? Description,
    [property: DisplayName("Category")] string? Category,
    [property: DisplayName("Visibility")] string Visibility,
    [property: DisplayName("Created By")] string? CreatedByName,
    [property: DisplayName("Created At (UTC)")] DateTime CreatedAtUtc,
    [property: DisplayName("Updated By")] string? UpdatedByName,
    [property: DisplayName("Updated At (UTC)")] DateTime? UpdatedAtUtc);
