using Cosmos.Contracts.Auth;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Users;
using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IUserRepository
{
    Task<IReadOnlyCollection<UserDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<User?> GetEntityByIdAsync(int id, CancellationToken cancellationToken);
    Task<bool> IsSystemOwnerAsync(int userId, CancellationToken cancellationToken);
    Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<UserDto> CreateAsync(User user, CancellationToken cancellationToken);
    Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(int id, CancellationToken cancellationToken);
    Task<OperationResult> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken);
    Task<OperationResult> AssignRolesAsync(int userId, IReadOnlyCollection<int> roleIds, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<RoleDto>> GetRolesByUserIdAsync(int userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<LoginPagePermissionDto>> GetPagePermissionsByUserIdAsync(int userId, CancellationToken cancellationToken);
}
