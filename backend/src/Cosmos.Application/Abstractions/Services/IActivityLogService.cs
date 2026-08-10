using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IActivityLogService
{
    Task<ApiResponse<PagedResult<ActivityLogListItemDto>>> GetListAsync(ActivityLogListQuery query, CancellationToken ct);
    Task<ApiResponse<ActivityLogDetailDto>> GetByIdAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<ActivityLogExportDto>>> ExportAsync(ActivityLogExportRequest request, CancellationToken ct);
}
