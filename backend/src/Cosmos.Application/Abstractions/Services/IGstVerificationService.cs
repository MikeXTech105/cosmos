using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IGstVerificationService
{
    Task<ApiResponse<GstinVerificationResponse>> VerifyAsync(VerifyGstinRequest request, CancellationToken cancellationToken);
}
