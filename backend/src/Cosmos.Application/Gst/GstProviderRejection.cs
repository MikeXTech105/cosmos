namespace Cosmos.Application.Gst;

// Only constructed after a definite provider rejection; transport failures never carry this marker.
public sealed record GstProviderRejection(string Code = "GST_PROVIDER_REJECTED", bool RetrySafe = true);
