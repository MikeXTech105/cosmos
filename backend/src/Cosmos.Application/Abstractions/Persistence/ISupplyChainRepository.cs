using Cosmos.Contracts.Common;
using Cosmos.Contracts.SupplyChain;

namespace Cosmos.Application.Abstractions.Persistence;

public interface ISupplyChainRepository
{
    Task<PagedResult<ChannelDto>> GetChannelsAsync(SupplyChainListQuery query, CancellationToken ct);
    Task<ChannelDto?> GetChannelAsync(long id, CancellationToken ct);
    Task<ChannelDto> SaveChannelAsync(long? id, SaveChannelRequest request, long? userId, CancellationToken ct);
    Task SetChannelStatusAsync(long id, bool isActive, long? userId, CancellationToken ct);
    Task DeleteChannelAsync(long id, long? userId, CancellationToken ct);

    Task<PagedResult<ChannelWarehouseDto>> GetWarehousesAsync(ChannelWarehouseQuery query, CancellationToken ct);
    Task<ChannelWarehouseDto?> GetWarehouseAsync(long id, CancellationToken ct);
    Task<ChannelWarehouseDto> SaveWarehouseAsync(long? id, SaveChannelWarehouseRequest request, long? userId, CancellationToken ct);
    Task SetWarehouseStatusAsync(long id, bool isActive, long? userId, CancellationToken ct);
    Task DeleteWarehouseAsync(long id, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<ChannelWarehouseDropdownDto>> GetWarehouseDropdownAsync(long? channelId, CancellationToken ct);

    Task<PagedResult<ChannelItemMappingDto>> GetItemMappingsAsync(ChannelItemMappingQuery query, CancellationToken ct);
    Task<ChannelItemMappingDto?> GetItemMappingAsync(long id, CancellationToken ct);
    Task<ChannelItemMappingDto> SaveItemMappingAsync(long? id, SaveChannelItemMappingRequest request, long? userId, CancellationToken ct);
    Task SetItemMappingStatusAsync(long id, bool isActive, long? userId, CancellationToken ct);
    Task DeleteItemMappingAsync(long id, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<UnmatchedChannelItemDto>> GetUnmatchedItemsAsync(CancellationToken ct);

    Task<PagedResult<ItemPackagingProfileDto>> GetPackagingProfilesAsync(ItemPackagingProfileQuery query, CancellationToken ct);
    Task<ItemPackagingProfileDto?> GetPackagingProfileAsync(long id, CancellationToken ct);
    Task<ItemPackagingProfileDto> SavePackagingProfileAsync(long? id, SaveItemPackagingProfileRequest request, long? userId, CancellationToken ct);
    Task<ItemPackagingProfileDto> SetPackagingProfileDefaultAsync(long id, long? userId, CancellationToken ct);
    Task DeletePackagingProfileAsync(long id, long? userId, CancellationToken ct);

    Task<SupplyChainImportValidationDto> SaveImportValidationAsync(
        string originalFileName,
        string fileHash,
        string importType,
        long? channelId,
        DateOnly? periodFrom,
        DateOnly? periodTo,
        IReadOnlyCollection<SupplyChainImportStagedRow> rows,
        string correlationId,
        long? userId,
        CancellationToken ct);
    Task<PagedResult<SupplyChainImportBatchDto>> GetImportBatchesAsync(SupplyChainImportBatchQuery query, CancellationToken ct);
    Task<SupplyChainImportBatchDto?> GetImportBatchAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<SupplyChainImportRowErrorDto>> GetImportErrorsAsync(long id, CancellationToken ct);
    Task<SupplyChainImportBatchDto> CommitImportAsync(long id, bool allowDuplicate, string? correctionReason, long? userId, CancellationToken ct);
    Task CancelImportAsync(long id, string reason, long? userId, CancellationToken ct);
}

public sealed record SupplyChainImportStagedRow(
    int RowNumber,
    DateOnly? SalesDate,
    string? ChannelCode,
    long? ChannelId,
    string? ChannelSku,
    string? ChannelProductName,
    long? ItemId,
    decimal? Quantity,
    bool IsDuplicate,
    IReadOnlyCollection<SupplyChainImportRowErrorDto> Errors,
    string SourceRowJson);
