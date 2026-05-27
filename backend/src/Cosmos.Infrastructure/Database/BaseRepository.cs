using System.Data;
using Dapper;

namespace Cosmos.Infrastructure.Database;

/// <summary>
/// Shared Dapper repository functionality.
/// </summary>
public abstract class BaseRepository(IDbConnectionFactory connectionFactory)
{
    protected async Task<IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken) =>
        await connectionFactory.CreateOpenConnectionAsync(cancellationToken);

    protected static CommandDefinition Command(string sql, object? parameters, CancellationToken cancellationToken) =>
        new(sql, parameters, cancellationToken: cancellationToken);
}
