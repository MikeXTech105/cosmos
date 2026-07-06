using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IGstSessionService
{
    Task<ApiResponse<GstSessionResponse>> GenerateOtpAsync(GenerateGstOtpRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<GstSessionResponse>> AuthenticateOtpAsync(AuthenticateGstOtpRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<GstSessionResponse>> GetStatusAsync(long companyGstRegistrationId, CancellationToken cancellationToken);
}
