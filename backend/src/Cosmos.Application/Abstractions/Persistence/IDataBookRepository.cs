using Cosmos.Contracts.Common;
using Cosmos.Contracts.DataBook;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IDataBookRepository
{
    Task<PagedResult<DataBookEntryListItemDto>> GetListAsync(DataBookEntryListQuery query, int currentUserId, CancellationToken ct);
    Task<DataBookEntryDto?> GetByIdAsync(long id, int currentUserId, CancellationToken ct);
    Task<DataBookEntryDto> CreateAsync(CreateDataBookEntryRequest request, int currentUserId, string? correlationId, CancellationToken ct);
    Task<DataBookEntryDto> UpdateAsync(long id, UpdateDataBookEntryRequest request, byte[] expectedRowVersion, int currentUserId, string? correlationId, CancellationToken ct);
    Task<OperationResult> DeleteAsync(long id, byte[] expectedRowVersion, int currentUserId, string? correlationId, CancellationToken ct);
    Task<IReadOnlyCollection<DataBookEntryHistoryDto>> GetHistoryAsync(long id, int currentUserId, CancellationToken ct);
    Task<IReadOnlyCollection<DataBookExportDto>> ExportAsync(DataBookExportRequest request, int currentUserId, CancellationToken ct);
}
