using Cosmos.Contracts.Common;
using Cosmos.Contracts.DataBook;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IDataBookService
{
    Task<ApiResponse<PagedResult<DataBookEntryListItemDto>>> GetListAsync(DataBookEntryListQuery query, CancellationToken ct);
    Task<ApiResponse<DataBookEntryDto>> GetByIdAsync(long id, CancellationToken ct);
    Task<ApiResponse<DataBookEntryDto>> CreateAsync(CreateDataBookEntryRequest request, string? correlationId, CancellationToken ct);
    Task<ApiResponse<DataBookEntryDto>> UpdateAsync(long id, UpdateDataBookEntryRequest request, string? correlationId, CancellationToken ct);
    Task<ApiResponse> DeleteAsync(long id, DeleteDataBookEntryRequest request, string? correlationId, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<DataBookEntryHistoryDto>>> GetHistoryAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<DataBookExportDto>>> ExportAsync(DataBookExportRequest request, CancellationToken ct);
}
