using System.Data;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Dapper;

internal static class StoredProcedureExecutor
{
    public static async Task<IReadOnlyCollection<T>> QueryAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        var rows = await connection.QueryAsync<T>(command);
        return rows.AsList();
    }

    public static async Task<T?> QuerySingleOrDefaultAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<T>(command);
    }

    public static async Task<OperationResult> ExecuteStatusAsync(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<OperationResult>(command);
    }

    public static async Task<T> QueryWithStatusAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        using var multi = await connection.QueryMultipleAsync(command);
        var status = await multi.ReadSingleAsync<OperationResult>();
        if (!status.Succeeded)
        {
            throw new CosmosException(status.Message, status.StatusCode);
        }

        return await multi.ReadSingleAsync<T>();
    }

    public static async Task<T?> QuerySingleWithStatusAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        using var multi = await connection.QueryMultipleAsync(command);
        var status = await multi.ReadSingleAsync<OperationResult>();
        if (!status.Succeeded)
        {
            return default;
        }

        return await multi.ReadSingleOrDefaultAsync<T>();
    }
}
