using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Audit;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class AuditRepository : IAuditRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public AuditRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task AddAsync(AuditEntryRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_AuditLog_Create", request, cancellationToken);
    }
}
