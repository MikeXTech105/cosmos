using Cosmos.Application.Gst;
namespace Cosmos.Application.Abstractions.Persistence;
public interface IGstComplianceSnapshotRepository
{
    Task<GstSnapshotSource> ReadSourceAsync(long invoiceId,string companyKey,CancellationToken ct);
    Task<GstPendingSnapshot> PrepareAsync(long invoiceId,string companyKey,GstPrepareSnapshotRequest request,long? userId,CancellationToken ct);
    Task<GstPendingSnapshot?> GetPreparedAsync(long invoiceId,string companyKey,Guid requestKey,CancellationToken ct);
}
