using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Repositories;

public interface IPermissionRepository
{
    Task<IReadOnlyCollection<RolePermission>> GetByRoleAsync(Guid roleId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<string>> GetPermissionKeysByUserAsync(Guid userId, CancellationToken cancellationToken);
    Task UpsertAsync(RolePermission permission, Guid? updatedBy, CancellationToken cancellationToken);
    Task<bool> UserHasPermissionAsync(Guid userId, string permissionKey, CancellationToken cancellationToken);
}
