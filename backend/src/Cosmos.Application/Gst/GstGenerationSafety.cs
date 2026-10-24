using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Gst;

/// <summary>
/// Protects the statutory-document boundary until generation can be built solely
/// from a persisted, immutable compliance snapshot and durable request record.
/// </summary>
public static class GstGenerationSafety
{
    public static void ThrowUnavailable(string documentType) => throw new ConflictException(
        $"{documentType} generation is unavailable because Cosmos has not yet produced a validated immutable compliance snapshot and durable idempotent request for this invoice.",
        data: new
        {
            conflictCode = "GST_SERVER_GENERATION_NOT_AVAILABLE",
            documentType,
            retrySafe = false,
            action = "Use lookup and reconciliation only. Do not resubmit the document to the provider."
        });
}
