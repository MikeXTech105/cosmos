using Cosmos.Application.DTOs.Permissions;

namespace Cosmos.Application.Abstractions.Services;

public interface IPermissionService
{
    Task<IReadOnlyCollection<PermissionResponse>> GetByRoleAsync(Guid roleId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<string>> GetPermissionKeysByUserAsync(Guid userId, CancellationToken cancellationToken);
    Task UpsertAsync(UpsertRolePermissionRequest request, Guid? updatedBy, CancellationToken cancellationToken);
    Task<bool> UserHasPermissionAsync(Guid userId, string permissionKey, CancellationToken cancellationToken);
}
