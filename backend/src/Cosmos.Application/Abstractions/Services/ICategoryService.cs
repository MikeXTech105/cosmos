using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface ICategoryService
{
    Task<ApiResponse<CategoryDto>> GetByIdAsync(GetCategoryByIdQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<CategoryListItemDto>>> GetListAsync(GetCategoriesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<CategoryDto>> UpdateAsync(long id, UpdateCategoryCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(DeleteCategoryCommand command, CancellationToken cancellationToken);
}
