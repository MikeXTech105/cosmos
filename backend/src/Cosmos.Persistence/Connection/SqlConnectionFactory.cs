using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Cosmos.Persistence.Connection;

public sealed class SqlConnectionFactory : ISqlConnectionFactory
{
    private readonly string _connectionString;
    private readonly string? _catalogCompanyKey;
    private readonly TimeZoneInfo? _businessTimeZone;
    private readonly DateOnly? _closedThroughDate;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("CosmosDb")
            ?? throw new InvalidOperationException("Connection string 'CosmosDb' is missing.");
        _catalogCompanyKey = configuration["Manufacturing:CatalogCompanyKey"];
        var zone = configuration["Manufacturing:BusinessTimeZone"];
        if (!string.IsNullOrWhiteSpace(zone)) _businessTimeZone = TimeZoneInfo.FindSystemTimeZoneById(zone);
        var closed = configuration["Manufacturing:ClosedThroughDate"];
        if (!string.IsNullOrWhiteSpace(closed))
            _closedThroughDate = DateOnly.ParseExact(closed,"yyyy-MM-dd",System.Globalization.CultureInfo.InvariantCulture);
    }

    public async Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        // Explicitly set or clear the trusted scope on every pooled connection.
        {
            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "EXEC sys.sp_set_session_context @key=N'Cosmos.CompanyKey',@value=@CompanyKey; EXEC sys.sp_set_session_context @key=N'Cosmos.BusinessDate',@value=@BusinessDate; EXEC sys.sp_set_session_context @key=N'Cosmos.ClosedThroughDate',@value=@ClosedThroughDate;";
                command.Parameters.Add("@CompanyKey", SqlDbType.NVarChar, 64).Value = (object?)_catalogCompanyKey ?? DBNull.Value;
                command.Parameters.Add("@BusinessDate",SqlDbType.Date).Value = _businessTimeZone is null ? DBNull.Value : TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,_businessTimeZone).Date;
                command.Parameters.Add("@ClosedThroughDate",SqlDbType.Date).Value = _closedThroughDate is null ? DBNull.Value : _closedThroughDate.Value.ToDateTime(TimeOnly.MinValue);
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            catch { await connection.DisposeAsync(); throw; }
        }
        return connection;
    }
}
