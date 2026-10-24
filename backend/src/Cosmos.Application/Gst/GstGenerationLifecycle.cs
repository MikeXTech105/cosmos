using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Gst;

public enum GstGenerationState
{
    NotEligible,
    Ready,
    InProgress,
    OutcomeUnknown,
    Confirmed,
    RetryableFailure,
    PermanentFailure,
    ReconciliationRequired
}

/// <summary>State rules used by durable request processing. They do not authorize provider submission.</summary>
public static class GstGenerationLifecycle
{
    public static bool CanTransition(GstGenerationState from, GstGenerationState to) => (from, to) switch
    {
        (GstGenerationState.NotEligible, GstGenerationState.Ready) => true,
        (GstGenerationState.Ready, GstGenerationState.InProgress) => true,
        (GstGenerationState.InProgress, GstGenerationState.Confirmed or GstGenerationState.OutcomeUnknown or GstGenerationState.RetryableFailure or GstGenerationState.PermanentFailure or GstGenerationState.ReconciliationRequired) => true,
        (GstGenerationState.OutcomeUnknown, GstGenerationState.ReconciliationRequired) => true,
        (GstGenerationState.RetryableFailure, GstGenerationState.InProgress) => true,
        (GstGenerationState.ReconciliationRequired, GstGenerationState.Confirmed or GstGenerationState.PermanentFailure) => true,
        _ => false
    };

    public static void EnsureTransition(GstGenerationState from, GstGenerationState to)
    {
        if (!CanTransition(from, to))
        {
            throw new ConflictException($"Invalid GST generation state transition from {from} to {to}.", data: new { conflictCode = "GST_GENERATION_INVALID_STATE_TRANSITION", from, to });
        }
    }
}
