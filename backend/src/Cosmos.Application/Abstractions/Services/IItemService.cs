using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IItemService
{
    Task<ApiResponse<ItemDto>> GetByIdAsync(GetItemByIdQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<ItemListItemDto>>> GetListAsync(GetItemsQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<ItemDto>> CreateAsync(CreateItemCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<ItemDto>> UpdateAsync(long id, UpdateItemCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(DeleteItemCommand command, CancellationToken cancellationToken);
}
