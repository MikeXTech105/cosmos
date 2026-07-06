using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;

namespace Cosmos.Persistence.UnitOfWork;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public UnitOfWork(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken)
    {
        await ExecuteInTransactionAsync<object?>(async token =>
        {
            await operation(token);
            return null;
        }, cancellationToken);
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction(IsolationLevel.ReadCommitted);
        try
        {
            var result = await operation(cancellationToken);
            transaction.Commit();
            return result;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
