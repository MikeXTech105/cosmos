using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Services;

public sealed class GstComplianceEligibilityService(ISalesRepository salesRepository) : IGstComplianceEligibilityService
{
    public async Task<ApiResponse<GstComplianceSnapshotReadiness>> AssessSalesInvoiceAsync(long salesInvoiceId, CancellationToken cancellationToken)
    {
        var invoice = await salesRepository.GetByIdAsync(salesInvoiceId, cancellationToken)
            ?? throw new NotFoundException("Sales invoice was not found.");

        // The evaluator intentionally receives only the persisted invoice. Reading
        // mutable Party, Item, registration, or rule masters here would make a
        // historical assessment look more complete than the original invoice was.
        return ApiResponse<GstComplianceSnapshotReadiness>.Success(
            GstComplianceSnapshotReadinessEvaluator.Evaluate(invoice),
            "GST compliance eligibility assessed from persisted invoice data.");
    }
}
