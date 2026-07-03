using Cosmos.Application.Gst;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IGstApiLogService
{
    Task<ApiResponse<PagedResult<GstApiLogResponse>>> GetListAsync(GstApiLogListRequest request, CancellationToken cancellationToken);
    Task AddAsync(AddGstApiLogRequest request, CancellationToken cancellationToken);
}
