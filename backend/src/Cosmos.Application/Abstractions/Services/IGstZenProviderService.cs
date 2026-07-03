using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;

namespace Cosmos.Application.Abstractions.Services;

public interface IGstZenProviderService
{
    GstConfigurationStatusResponse GetConfigurationStatus();
    Task<GstinVerificationResponse> VerifyGstinAsync(VerifyGstinRequest request, long? companyGstRegistrationId, CancellationToken cancellationToken);
    Task<EWayBillResponse> GenerateEWayBillAsync(GenerateEWayBillRequest request, CancellationToken cancellationToken);
    Task<EWayBillResponse> CancelEWayBillAsync(CancelEWayBillRequest request, CancellationToken cancellationToken);
    Task<EWayBillResponse> UpdateEWayBillVehicleAsync(UpdateEWayBillVehicleRequest request, CancellationToken cancellationToken);
    Task<EWayBillResponse> ExtendEWayBillAsync(ExtendEWayBillRequest request, CancellationToken cancellationToken);
    Task<EWayBillResponse> GetEWayBillAsync(long companyGstRegistrationId, string ewayBillNumber, CancellationToken cancellationToken);
    Task<EInvoiceResponse> GenerateEInvoiceAsync(GenerateEInvoiceRequest request, CancellationToken cancellationToken);
    Task<EInvoiceResponse> CancelEInvoiceAsync(CancelEInvoiceRequest request, CancellationToken cancellationToken);
    Task<EInvoiceResponse> GetEInvoiceAsync(long companyGstRegistrationId, string irn, CancellationToken cancellationToken);
    Task<GstSessionResponse> GenerateOtpAsync(GenerateGstOtpRequest request, CancellationToken cancellationToken);
    Task<GstSessionResponse> AuthenticateOtpAsync(AuthenticateGstOtpRequest request, CancellationToken cancellationToken);
}
