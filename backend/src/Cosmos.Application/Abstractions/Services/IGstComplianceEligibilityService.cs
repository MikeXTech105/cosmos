using Cosmos.Application.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

/// <summary>
/// Read-only assessment for future statutory-document workflows. This does not
/// create a snapshot or change an invoice lifecycle state.
/// </summary>
public interface IGstComplianceEligibilityService
{
    Task<ApiResponse<GstComplianceSnapshotReadiness>> AssessSalesInvoiceAsync(long salesInvoiceId, CancellationToken cancellationToken);
}
