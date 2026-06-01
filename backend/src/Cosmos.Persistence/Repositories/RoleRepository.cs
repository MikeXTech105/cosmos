using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Roles;
using Cosmos.Domain.Entities;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class RoleRepository : IRoleRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public RoleRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<IReadOnlyCollection<RoleDetailDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<RoleDetailDto>(connection, "sp_Role_GetAll", null, cancellationToken);
    }

    public async Task<RoleDetailDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<RoleDetailDto>(connection, "sp_Role_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<Role?> GetEntityByIdAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<Role>(connection, "sp_Role_GetEntityById", new { Id = id }, cancellationToken);
    }

    public async Task<RoleDetailDto> CreateAsync(Role role, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<RoleDetailDto>(
            connection,
            "sp_Role_Create",
            new { role.Name, role.Description, role.IsActive },
            cancellationToken);
    }

    public async Task<RoleDetailDto> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<RoleDetailDto>(connection, "sp_Role_Update", new { Id = id, request.Name, request.Description, request.IsActive }, cancellationToken);
    }

    public async Task<OperationResult> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Role_Delete", new { Id = id }, cancellationToken);
    }
}
