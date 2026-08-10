using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IAuditRepository
{
    Task AddAsync(AuditEntryRequest request, CancellationToken cancellationToken);
    Task<PagedResult<ActivityLogListItemDto>> GetListAsync(ActivityLogListQuery query, CancellationToken cancellationToken);
    Task<ActivityLogDetailRow?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ActivityLogExportDto>> ExportAsync(ActivityLogExportRequest request, int maxRows, CancellationToken cancellationToken);
}
