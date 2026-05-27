using Cosmos.Domain.Entities;
using Cosmos.Shared.Models;

namespace Cosmos.Application.Abstractions.Repositories;

public interface IRoleRepository
{
    Task<PagedResult<Role>> GetPagedAsync(QueryParameters query, CancellationToken cancellationToken);
    Task<Role?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(Role role, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(Role role, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}
