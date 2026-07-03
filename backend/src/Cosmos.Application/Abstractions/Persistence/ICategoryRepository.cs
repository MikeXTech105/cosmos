using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;

namespace Cosmos.Application.Abstractions.Persistence;

public interface ICategoryRepository
{
    Task<CategoryDto?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<CategoryListItemDto>> GetListAsync(GetCategoriesQuery query, CancellationToken cancellationToken);
    Task<CategoryDto> CreateAsync(CreateCategoryCommand command, CancellationToken cancellationToken);
    Task<CategoryDto> UpdateAsync(long id, UpdateCategoryCommand command, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(long id, CancellationToken cancellationToken);
    Task<bool> NameExistsAsync(string name, long? excludingId, CancellationToken cancellationToken);
}
