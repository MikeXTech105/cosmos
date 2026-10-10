using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Auth;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Users;
using Cosmos.Domain.Entities;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public UserRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<IReadOnlyCollection<UserDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<UserDto>(connection, "sp_User_GetAll", null, cancellationToken);
    }

    public async Task<User?> GetEntityByIdAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<User>(connection, "sp_User_GetEntityById", new { Id = id }, cancellationToken);
    }

    public async Task<IReadOnlyCollection<UserExportDto>> ExportAsync(string? search, bool? isActive, int? roleId, string? sortBy, string? sortDirection, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<UserExportDto>(
            connection,
            "sp_User_Export",
            new { Search = search, IsActive = isActive, RoleId = roleId, SortBy = sortBy, SortDirection = sortDirection },
            cancellationToken);
    }

    public async Task<bool> IsSystemOwnerAsync(int userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await StoredProcedureExecutor.QuerySingleOrDefaultAsync<int>(
            connection,
            "sp_User_IsSystemOwner",
            new { UserId = userId },
            cancellationToken);
        return result == 1;
    }

    public async Task<bool> IsPrivilegedAdministratorAsync(int userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var result = await StoredProcedureExecutor.QuerySingleOrDefaultAsync<int>(
            connection,
            "sp_User_IsPrivilegedAdministrator",
            new { UserId = userId },
            cancellationToken);
        return result == 1;
    }

    public async Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<UserDto>(connection, "sp_User_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<UserDto> CreateAsync(User user, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<UserDto>(
            connection,
            "sp_User_Create",
            new { user.Username, user.Email, user.PasswordHash, user.FullName, user.IsActive },
            cancellationToken);
    }

    public async Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<UserDto>(connection, "sp_User_Update", new { Id = id, request.Email, request.FullName, request.IsActive }, cancellationToken);
    }

    public async Task<UserDto> UpdateSelfAsync(int id, string email, string fullName, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "sp_User_UpdateSelf",
            new { Id = id, Email = email, FullName = fullName },
            commandType: System.Data.CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        using var results = await connection.QueryMultipleAsync(command);
        var status = await results.ReadSingleAsync<OperationResult>();
        if (!status.Succeeded)
        {
            if (status.StatusCode == 409)
            {
                throw new Cosmos.Shared.Exceptions.ConflictException(
                    "This email is already in use.",
                    new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
                    {
                        ["Email"] = new[] { "This email is already in use." }
                    },
                    new { conflictCode = "USER_EMAIL_EXISTS", field = "Email" });
            }

            throw new Cosmos.Shared.Exceptions.CosmosException(status.Message, status.StatusCode);
        }

        return await results.ReadSingleAsync<UserDto>();
    }

    public async Task<OperationResult> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_User_Delete", new { Id = id }, cancellationToken);
    }

    public async Task<OperationResult> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_User_SetActive", new { Id = id, IsActive = isActive }, cancellationToken);
    }

    public async Task<OperationResult> AssignRolesAsync(int userId, IReadOnlyCollection<int> roleIds, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);
        parameters.Add("RoleIds", TableValuedParameters.IntIdList(roleIds).AsTableValuedParameter("dbo.IntIdList"));
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_User_AssignRoles", parameters, cancellationToken);
    }

    public async Task<IReadOnlyCollection<RoleDto>> GetRolesByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<RoleDto>(connection, "sp_User_GetRoles", new { UserId = userId }, cancellationToken);
    }

    public async Task<IReadOnlyCollection<LoginPagePermissionDto>> GetPagePermissionsByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<LoginPagePermissionDto>(connection, "sp_User_GetPagePermissions", new { UserId = userId }, cancellationToken);
    }
}
