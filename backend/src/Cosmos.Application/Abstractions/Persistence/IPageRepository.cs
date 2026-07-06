using Cosmos.Contracts.Common;
using Cosmos.Contracts.Pages;
using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IPageRepository
{
    Task<IReadOnlyCollection<PageDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<PageDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<Page?> GetEntityByIdAsync(int id, CancellationToken cancellationToken);
    Task<PageDto> CreateAsync(Page page, CancellationToken cancellationToken);
    Task<PageDto> UpdateAsync(int id, UpdatePageRequest request, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(int id, CancellationToken cancellationToken);
}
