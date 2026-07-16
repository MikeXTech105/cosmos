using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class SystemOwnerRepository : ISystemOwnerRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public SystemOwnerRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<SystemOwnerProvisioningState> GetProvisioningStateAsync(CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<SystemOwnerProvisioningState>(
                   connection,
                   "sp_SystemOwner_GetState",
                   null,
                   cancellationToken)
               ?? new SystemOwnerProvisioningState(0, 0, 0, 0, 0);
    }

    public async Task<SystemOwnerProvisioningResult> ProvisionAsync(
        string username,
        string email,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<SystemOwnerProvisioningResult>(
            connection,
            "sp_SystemOwner_Provision",
            new { Username = username, Email = email, PasswordHash = passwordHash },
            cancellationToken);
    }
}
