using Cosmos.Contracts.Common;
using Cosmos.Contracts.Roles;
using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IRoleRepository
{
    Task<IReadOnlyCollection<RoleDetailDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<RoleDetailDto?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<Role?> GetEntityByIdAsync(int id, CancellationToken cancellationToken);
    Task<RoleDetailDto> CreateAsync(Role role, CancellationToken cancellationToken);
    Task<RoleDetailDto> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(int id, CancellationToken cancellationToken);
}
