using Cosmos.Application.Gst;
using Cosmos.Shared.Responses;
namespace Cosmos.Application.Abstractions.Services;
public interface IGstComplianceSnapshotService
{
    Task<ApiResponse<GstSnapshotPreparation>> ReadAsync(long invoiceId,CancellationToken ct);
    Task<ApiResponse<GstPendingSnapshot>> PrepareAsync(long invoiceId,GstPrepareSnapshotRequest request,CancellationToken ct);
    Task<ApiResponse<GstPendingSnapshot>> GetPreparedAsync(long invoiceId,Guid requestKey,CancellationToken ct);
}
