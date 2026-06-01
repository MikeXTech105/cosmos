using Cosmos.Contracts.Pages;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IPageService
{
    Task<ApiResponse<IReadOnlyCollection<PageDto>>> GetAllAsync(CancellationToken cancellationToken);
    Task<ApiResponse<PageDto>> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<ApiResponse<PageDto>> CreateAsync(CreatePageRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<PageDto>> UpdateAsync(int id, UpdatePageRequest request, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken);
}
