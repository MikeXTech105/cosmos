using Cosmos.Contracts.Common;
using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Security;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IPermissionRepository
{
    Task<IReadOnlyCollection<PermissionDto>> GetByRoleIdAsync(int roleId, CancellationToken cancellationToken);
    Task<OperationResult> SaveAsync(int roleId, IReadOnlyCollection<PermissionUpsertDto> permissions, CancellationToken cancellationToken);
    Task<bool> UserHasPermissionAsync(int userId, string pageName, PermissionAction action, CancellationToken cancellationToken);
}
