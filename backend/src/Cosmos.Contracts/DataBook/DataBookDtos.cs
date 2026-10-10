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
    IReadOnlyList<string> ChangedFields,
    DataBookEntryHistorySnapshotDto? OldData,
    DataBookEntryHistorySnapshotDto? NewData,
    string? CorrelationId)
{
    /// <summary>Legacy JSON storage representation retained during the frontend contract transition.</summary>
    [Obsolete("Use ChangedFields. This property is retained temporarily for existing clients.")]
    public string? ChangedFieldsJson { get; init; }

    /// <summary>Legacy JSON storage representation retained during the frontend contract transition.</summary>
    [Obsolete("Use OldData. This property is retained temporarily for existing clients.")]
    public string? OldDataJson { get; init; }

    /// <summary>Legacy JSON storage representation retained during the frontend contract transition.</summary>
    [Obsolete("Use NewData. This property is retained temporarily for existing clients.")]
    public string? NewDataJson { get; init; }
}

/// <summary>Immutable Data Book entry snapshot exposed by a history record.</summary>
public sealed record DataBookEntryHistorySnapshotDto(
    [property: JsonPropertyName("Name")] string? Name,
    [property: JsonPropertyName("Value")] string? Value,
    [property: JsonPropertyName("Description")] string? Description,
    [property: JsonPropertyName("Category")] string? Category,
    [property: JsonPropertyName("IsPrivate")] bool? IsPrivate,
    [property: JsonPropertyName("OwnerUserId")] int? OwnerUserId,
    [property: JsonPropertyName("CreatedBy")] int? CreatedBy,
    [property: JsonPropertyName("CreatedAtUtc")] DateTime? CreatedAtUtc,
    [property: JsonPropertyName("UpdatedBy")] int? UpdatedBy,
    [property: JsonPropertyName("UpdatedAtUtc")] DateTime? UpdatedAtUtc,
    [property: JsonPropertyName("DeletedBy")] int? DeletedBy,
    [property: JsonPropertyName("DeletedAtUtc")] DateTime? DeletedAtUtc,
    [property: JsonPropertyName("IsDeleted")] bool? IsDeleted);

/// <summary>Raw Dapper row used only between the Data Book repository and application mapper.</summary>
public sealed record DataBookEntryHistoryRow(
    long Id,
    long EntryId,
    string ActionType,
    int ChangedByUserId,
    string? ChangedByName,
    DateTime ChangedAtUtc,
    string? ChangedFieldsJson,
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
