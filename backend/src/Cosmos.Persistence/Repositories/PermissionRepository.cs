using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Security;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class PermissionRepository : IPermissionRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public PermissionRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<IReadOnlyCollection<PermissionDto>> GetByRoleIdAsync(int roleId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<PermissionDto>(connection, "sp_Permission_GetByRoleId", new { RoleId = roleId }, cancellationToken);
    }

    public async Task<OperationResult> SaveAsync(int roleId, IReadOnlyCollection<PermissionUpsertDto> permissions, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = new DynamicParameters();
        parameters.Add("RoleId", roleId);
        parameters.Add("Permissions", TableValuedParameters.Permissions(permissions).AsTableValuedParameter("dbo.PermissionList"));
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Permission_Save", parameters, cancellationToken);
    }

    public async Task<bool> UserHasPermissionAsync(int userId, string pageName, PermissionAction action, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await StoredProcedureExecutor.QuerySingleOrDefaultAsync<int>(connection, "sp_Permission_UserHasAccess", new { UserId = userId, PageName = pageName, PermissionAction = action.ToString() }, cancellationToken);
        return result == 1;
    }
}
