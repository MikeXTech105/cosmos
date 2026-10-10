using Cosmos.Contracts.Common;
using Cosmos.Contracts.SupplyChain;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface ISupplyChainService
{
    Task<ApiResponse<PagedResult<ChannelDto>>> GetChannelsAsync(SupplyChainListQuery query, CancellationToken ct);
    Task<ApiResponse<ChannelDto>> GetChannelAsync(long id, CancellationToken ct);
    Task<ApiResponse<ChannelDto>> CreateChannelAsync(SaveChannelRequest request, CancellationToken ct);
    Task<ApiResponse<ChannelDto>> UpdateChannelAsync(long id, SaveChannelRequest request, CancellationToken ct);
    Task<ApiResponse> SetChannelStatusAsync(long id, ChangeSupplyChainActiveStatusRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteChannelAsync(long id, CancellationToken ct);

    Task<ApiResponse<PagedResult<ChannelWarehouseDto>>> GetWarehousesAsync(ChannelWarehouseQuery query, CancellationToken ct);
    Task<ApiResponse<ChannelWarehouseDto>> GetWarehouseAsync(long id, CancellationToken ct);
    Task<ApiResponse<ChannelWarehouseDto>> CreateWarehouseAsync(SaveChannelWarehouseRequest request, CancellationToken ct);
    Task<ApiResponse<ChannelWarehouseDto>> UpdateWarehouseAsync(long id, SaveChannelWarehouseRequest request, CancellationToken ct);
    Task<ApiResponse> SetWarehouseStatusAsync(long id, ChangeSupplyChainActiveStatusRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteWarehouseAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<ChannelWarehouseDropdownDto>>> GetWarehouseDropdownAsync(long? channelId, CancellationToken ct);

    Task<ApiResponse<PagedResult<ChannelItemMappingDto>>> GetItemMappingsAsync(ChannelItemMappingQuery query, CancellationToken ct);
    Task<ApiResponse<ChannelItemMappingDto>> GetItemMappingAsync(long id, CancellationToken ct);
    Task<ApiResponse<ChannelItemMappingDto>> CreateItemMappingAsync(SaveChannelItemMappingRequest request, CancellationToken ct);
    Task<ApiResponse<ChannelItemMappingDto>> UpdateItemMappingAsync(long id, SaveChannelItemMappingRequest request, CancellationToken ct);
    Task<ApiResponse> SetItemMappingStatusAsync(long id, ChangeSupplyChainActiveStatusRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteItemMappingAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<UnmatchedChannelItemDto>>> GetUnmatchedItemsAsync(CancellationToken ct);

    Task<ApiResponse<PagedResult<ItemPackagingProfileDto>>> GetPackagingProfilesAsync(ItemPackagingProfileQuery query, CancellationToken ct);
    Task<ApiResponse<ItemPackagingProfileDto>> GetPackagingProfileAsync(long id, CancellationToken ct);
    Task<ApiResponse<ItemPackagingProfileDto>> CreatePackagingProfileAsync(SaveItemPackagingProfileRequest request, CancellationToken ct);
    Task<ApiResponse<ItemPackagingProfileDto>> UpdatePackagingProfileAsync(long id, SaveItemPackagingProfileRequest request, CancellationToken ct);
    Task<ApiResponse<ItemPackagingProfileDto>> SetPackagingProfileDefaultAsync(long id, CancellationToken ct);
    Task<ApiResponse> DeletePackagingProfileAsync(long id, CancellationToken ct);

    Task<ApiResponse<SupplyChainImportValidationDto>> ValidateImportAsync(string fileName, string importType, long? channelId, byte[] content, string? correlationId, CancellationToken ct);
    Task<ApiResponse<PagedResult<SupplyChainImportBatchDto>>> GetImportBatchesAsync(SupplyChainImportBatchQuery query, CancellationToken ct);
    Task<ApiResponse<SupplyChainImportBatchDetailsDto>> GetImportBatchAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<SupplyChainImportRowErrorDto>>> GetImportErrorsAsync(long id, CancellationToken ct);
    Task<ApiResponse<SupplyChainImportBatchDto>> CommitImportAsync(long id, CommitSupplyChainImportRequest request, CancellationToken ct);
    Task<ApiResponse> CancelImportAsync(long id, CancelSupplyChainImportRequest request, CancellationToken ct);
}
