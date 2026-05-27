using Cosmos.Infrastructure.Database;
using Dapper;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Cosmos.API.Health;

public sealed class PostgresHealthCheck(IDbConnectionFactory connectionFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = await connectionFactory.CreateOpenConnectionAsync(cancellationToken);
            var result = await connection.ExecuteScalarAsync<int>(new CommandDefinition("select 1;", cancellationToken: cancellationToken));
            return result == 1 ? HealthCheckResult.Healthy("PostgreSQL is reachable.") : HealthCheckResult.Unhealthy("Unexpected PostgreSQL health response.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL is unavailable.", ex);
        }
    }
}
