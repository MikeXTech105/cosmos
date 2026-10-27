using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Persistence.Repositories;

public sealed class ProductionWorkspaceRepository(ISqlConnectionFactory factory) : IProductionWorkspaceRepository
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<T> ExecuteAsync<T>(string procedure, string companyKey, long? actorId, object request, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        try
        {
            var result = await connection.QuerySingleAsync<WorkspaceResult>(new CommandDefinition(procedure,
                new { CompanyKey = companyKey, UserId = actorId, RequestJson = JsonSerializer.Serialize(request, Json) },
                commandType: CommandType.StoredProcedure, cancellationToken: ct));
            if (result.StatusCode >= 400)
                throw new CosmosException(result.Message, result.StatusCode, data: new
                {
                    conflictCode = result.Code, currentVersion = result.Version,
                    reloadRequired = result.Code is "STALE_VERSION" or "STALE_PLAN"
                });
            return JsonSerializer.Deserialize<T>(result.DataJson ?? "null", Json)
                ?? throw new InvalidOperationException($"{procedure} returned no data.");
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            throw new ConflictException("The code, source line or event identity already exists.", data: new { conflictCode = "DUPLICATE_IDENTITY" });
        }
        catch (SqlException ex) when (ex.Number is 1205 or 1222)
        {
            throw new ConflictException("The transaction conflicted with another stock command. Reload and retry using the same idempotency key.", data: new { conflictCode = "CONCURRENT_COMMAND" });
        }
        catch (SqlException ex) when (ex.Number == 547)
        {
            throw new CosmosException("A referenced resource, unit or quantity is invalid.");
        }
        catch (SqlException ex) when (ex.Number == 8115)
        {
            throw new CosmosException("Quantity arithmetic exceeds the supported decimal range; reconcile the output basis and unit conversions.");
        }
        catch (SqlException ex) when (ex.Number is >= 51100 and <= 51199)
        {
            var parts = ex.Message.Split('|', 3);
            var code = parts[0];
            throw new CosmosException(parts.Length > 2 ? parts[2] : parts.Last(),
                ex.Number == 51104 ? 404 : ex.Number == 51103 ? 403 : ex.Number == 51100 ? 400 : 409,
                data: new { conflictCode = code, currentVersion = code == "STALE_VERSION" && parts.Length == 3 ? parts[1] : null,
                    reloadRequired = code is "STALE_VERSION" or "STALE_PLAN" });
        }
    }

    private sealed record WorkspaceResult(int StatusCode, string Message, string? Code, string? Version, string? DataJson);
}
