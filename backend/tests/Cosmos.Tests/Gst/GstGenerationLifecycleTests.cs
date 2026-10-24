using Cosmos.Application.Gst;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Gst;

public sealed class GstGenerationLifecycleTests
{
    [Theory]
    [InlineData(GstGenerationState.Ready, GstGenerationState.InProgress)]
    [InlineData(GstGenerationState.InProgress, GstGenerationState.OutcomeUnknown)]
    [InlineData(GstGenerationState.OutcomeUnknown, GstGenerationState.ReconciliationRequired)]
    [InlineData(GstGenerationState.ReconciliationRequired, GstGenerationState.Confirmed)]
    public void AllowsOnlyDocumentedSafeTransitions(GstGenerationState from, GstGenerationState to) =>
        Assert.True(GstGenerationLifecycle.CanTransition(from, to));

    [Fact]
    public void RejectsBlindRetryAfterUnknownOutcome()
    {
        var exception = Assert.Throws<ConflictException>(() => GstGenerationLifecycle.EnsureTransition(GstGenerationState.OutcomeUnknown, GstGenerationState.InProgress));
        Assert.Equal(409, exception.StatusCode);
    }
}
