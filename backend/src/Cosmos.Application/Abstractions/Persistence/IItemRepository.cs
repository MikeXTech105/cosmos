using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IItemRepository
{
    Task<ItemDto?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<ItemListItemDto>> GetListAsync(GetItemsQuery query, CancellationToken cancellationToken);
    Task<ItemDto> CreateAsync(CreateItemCommand command, CancellationToken cancellationToken);
    Task<ItemDto> UpdateAsync(long id, UpdateItemCommand command, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(long id, CancellationToken cancellationToken);
    Task<bool> ItemCodeExistsAsync(string itemCode, long? excludingId, CancellationToken cancellationToken);
    Task<bool> CategoryExistsAsync(long categoryId, CancellationToken cancellationToken);
    Task<bool> UnitExistsAsync(long unitId, CancellationToken cancellationToken);
}
