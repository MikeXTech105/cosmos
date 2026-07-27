using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.SupplyChain;

public sealed record SupplyChainListQuery(
    string? Search = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record ChannelDto(
    long Id,
    string Code,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? UpdatedAtUtc,
    long? UpdatedBy,
    int TotalCount = 0)
{
    public ChannelDto() : this(0, string.Empty, string.Empty, null, 0, false, default, null, null, null, 0) { }
}

public sealed record SaveChannelRequest(string Code, string Name, string? Description, int SortOrder, bool IsActive = true);
public sealed record ChangeSupplyChainActiveStatusRequest(bool IsActive);

public sealed record ChannelWarehouseQuery(
    string? Search = null,
    long? ChannelId = null,
    bool? IsActive = null,
    string? City = null,
    string? State = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record ChannelWarehouseDto(
    long Id,
    long ChannelId,
    string ChannelCode,
    string ChannelName,
    string WarehouseCode,
    string WarehouseName,
    string? City,
    string? State,
    string? AddressLine1,
    string? AddressLine2,
    string? PostalCode,
    string? Region,
    int Priority,
    int SortOrder,
    bool IsActive,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? UpdatedAtUtc,
    long? UpdatedBy,
    int TotalCount = 0)
{
    public ChannelWarehouseDto() : this(0, 0, string.Empty, string.Empty, string.Empty, string.Empty, null, null, null, null, null, null, 0, 0, false, default, null, null, null, 0) { }
}

public sealed record SaveChannelWarehouseRequest(
    long ChannelId,
    string WarehouseCode,
    string WarehouseName,
    string? City,
    string? State,
    string? AddressLine1,
    string? AddressLine2,
    string? PostalCode,
    string? Region,
    int Priority,
    int SortOrder,
    bool IsActive = true);

public sealed record ChannelWarehouseDropdownDto(long Id, long ChannelId, string ChannelCode, string WarehouseCode, string WarehouseName);

public sealed record ChannelItemMappingQuery(
    string? Search = null,
    long? ChannelId = null,
    long? ItemId = null,
    bool? IsActive = null,
    bool? IsPrimary = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record ChannelItemMappingDto(
    long Id,
    long ChannelId,
    string ChannelCode,
    string ChannelName,
    long ItemId,
    string ItemCode,
    string ItemName,
    string ChannelSku,
    string? ChannelProductName,
    string? ExternalItemId,
    bool IsPrimary,
    bool IsActive,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? UpdatedAtUtc,
    long? UpdatedBy,
    int TotalCount = 0)
{
    public ChannelItemMappingDto() : this(0, 0, string.Empty, string.Empty, 0, string.Empty, string.Empty, string.Empty, null, null, false, false, null, null, default, null, null, null, 0) { }
}

public sealed record SaveChannelItemMappingRequest(
    long ChannelId,
    long ItemId,
    string ChannelSku,
    string? ChannelProductName,
    string? ExternalItemId,
    bool IsPrimary,
    bool IsActive,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo);

public sealed record UnmatchedChannelItemDto(
    long ChannelId,
    string ChannelCode,
    string ChannelSku,
    string? ChannelProductName,
    int OccurrenceCount,
    DateOnly FirstSeenDate,
    DateOnly LastSeenDate);

public sealed record ItemPackagingProfileQuery(
    string? Search = null,
    long? ItemId = null,
    long? ChannelId = null,
    bool? IsActive = null,
    bool? IsDefault = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record ItemPackagingProfileDto(
    long Id,
    long ItemId,
    string ItemCode,
    string ItemName,
    long? ChannelId,
    string? ChannelCode,
    string PackagingCode,
    string? PackagingName,
    decimal UnitsPerBox,
    decimal Length,
    decimal Width,
    decimal Height,
    string DimensionUnit,
    decimal GrossWeight,
    decimal NetWeight,
    string WeightUnit,
    decimal? VolumetricDivisor,
    decimal? CalculatedVolumetricWeight,
    bool IsDefault,
    bool IsActive,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    DateTime CreatedAtUtc,
    long? CreatedBy,
    DateTime? UpdatedAtUtc,
    long? UpdatedBy,
    int TotalCount = 0)
{
    public ItemPackagingProfileDto() : this(0, 0, string.Empty, string.Empty, null, null, string.Empty, null, 0, 0, 0, 0, string.Empty, 0, 0, string.Empty, null, null, false, false, null, null, default, null, null, null, 0) { }
}

public sealed record SaveItemPackagingProfileRequest(
    long ItemId,
    long? ChannelId,
    string PackagingCode,
    string? PackagingName,
    decimal UnitsPerBox,
    decimal Length,
    decimal Width,
    decimal Height,
    string DimensionUnit,
    decimal GrossWeight,
    decimal NetWeight,
    string WeightUnit,
    decimal? VolumetricDivisor,
    bool IsDefault,
    bool IsActive,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo);

public sealed record SupplyChainImportBatchQuery(
    string? ModuleType = null,
    string? ImportType = null,
    long? ChannelId = null,
    int? Status = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record SupplyChainImportRowErrorDto(int RowNumber, string Field, string Message, string? OriginalValue = null);

public sealed record SupplyChainImportValidationDto(
    long BatchId,
    string FileName,
    string ImportType,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int DuplicateRows,
    int UnmatchedItemCount,
    int UnmatchedChannelCount,
    int UnmatchedWarehouseCount,
    IReadOnlyCollection<string> Warnings,
    IReadOnlyCollection<SupplyChainImportRowErrorDto> RowErrors,
    bool CanCommit);

public sealed record SupplyChainImportBatchDto(
    long Id,
    string ModuleType,
    string ImportType,
    long? ChannelId,
    string? ChannelCode,
    string OriginalFileName,
    string FileHash,
    DateOnly? PeriodFrom,
    DateOnly? PeriodTo,
    DateOnly? SnapshotDate,
    int Status,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int DuplicateRows,
    int CommittedRows,
    string? ValidationSummaryJson,
    DateTime UploadedAtUtc,
    long? UploadedBy,
    DateTime? CommittedAtUtc,
    long? CommittedBy,
    DateTime? CancelledAtUtc,
    long? CancelledBy,
    string? CorrelationId,
    int TotalCount = 0)
{
    public SupplyChainImportBatchDto() : this(0, string.Empty, string.Empty, null, null, string.Empty, string.Empty, null, null, null, 0, 0, 0, 0, 0, 0, null, default, null, null, null, null, null, null, 0) { }
}

public sealed record SupplyChainImportBatchDetailsDto(SupplyChainImportBatchDto Batch, IReadOnlyCollection<SupplyChainImportRowErrorDto> Errors);
public sealed record CommitSupplyChainImportRequest(bool AllowDuplicate = false, string? CorrectionReason = null);
public sealed record CancelSupplyChainImportRequest(string Reason);
