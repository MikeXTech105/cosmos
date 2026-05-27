using Cosmos.Domain.Entities;
using Cosmos.Shared.Models;

namespace Cosmos.Application.Abstractions.Repositories;

public interface IUserRepository
{
    Task<PagedResult<User>> GetPagedAsync(QueryParameters query, Guid? roleId, CancellationToken cancellationToken);
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Guid> CreateAsync(User user, Guid? createdBy, CancellationToken cancellationToken);
    Task UpdateAsync(User user, Guid? updatedBy, CancellationToken cancellationToken);
    Task SetActiveStatusAsync(Guid id, bool isActive, Guid? updatedBy, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, Guid? deletedBy, CancellationToken cancellationToken);
}
