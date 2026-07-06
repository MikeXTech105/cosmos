using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IPermissionService
{
    Task<ApiResponse<IReadOnlyCollection<PermissionDto>>> GetByRoleIdAsync(int roleId, CancellationToken cancellationToken);
    Task<ApiResponse> SaveAsync(int roleId, SaveRolePermissionsRequest request, CancellationToken cancellationToken);
    Task<bool> UserHasPermissionAsync(int userId, string pageName, PermissionAction action, CancellationToken cancellationToken);
}
