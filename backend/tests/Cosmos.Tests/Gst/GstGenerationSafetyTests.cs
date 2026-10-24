using Cosmos.Application.Gst;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Gst;

public sealed class GstGenerationSafetyTests
{
    [Fact]
    public void ThrowUnavailable_ReturnsStructuredNonRetryableConflict()
    {
        var exception = Assert.Throws<ConflictException>(() => GstGenerationSafety.ThrowUnavailable("E-Invoice"));

        Assert.Equal(409, exception.StatusCode);
        Assert.Contains("immutable compliance snapshot", exception.Message);
        Assert.Equal("GST_SERVER_GENERATION_NOT_AVAILABLE", exception.ResponseData?.GetType().GetProperty("conflictCode")?.GetValue(exception.ResponseData));
    }
}
