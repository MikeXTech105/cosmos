using Cosmos.Contracts.Audit;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IAuditRepository
{
    Task AddAsync(AuditEntryRequest request, CancellationToken cancellationToken);
}
