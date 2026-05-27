using System.Data;

namespace Cosmos.Infrastructure.Database;

public interface IDbConnectionFactory
{
    Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken);
}
