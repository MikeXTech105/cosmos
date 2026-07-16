using System.Data;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Persistence.Dapper;

internal static class StoredProcedureExecutor
{
    public static async Task<IReadOnlyCollection<T>> QueryAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        try
        {
            var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
            var rows = await connection.QueryAsync<T>(command);
            return rows.AsList();
        }
        catch (SqlException exception)
        {
            throw Translate(exception);
        }
    }

    public static async Task<T?> QuerySingleOrDefaultAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        try
        {
            var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
            return await connection.QuerySingleOrDefaultAsync<T>(command);
        }
        catch (SqlException exception)
        {
            throw Translate(exception);
        }
    }

    public static async Task<OperationResult> ExecuteStatusAsync(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        try
        {
            var command = new CommandDefinition(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
            return await connection.QuerySingleAsync<OperationResult>(command);
        }
        catch (SqlException exception)
        {
            throw Translate(exception);
        }
    }

    public static async Task<T> QueryWithStatusAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        try
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
        catch (SqlException exception)
        {
            throw Translate(exception);
        }
    }

    public static async Task<T?> QuerySingleWithStatusAsync<T>(IDbConnection connection, string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        try
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
        catch (SqlException exception)
        {
            throw Translate(exception);
        }
    }

    private static Exception Translate(SqlException exception) => exception.Number switch
    {
        51040 => new CosmosException("User was not found.", 404),
        51041 => new CosmosException("Role was not found.", 404),
        51042 => new CosmosException("One or more roles were not found.", 404),
        51043 => new CosmosException("Conflicting protected System Owner records were detected.", 500),
        _ => exception
    };
}
