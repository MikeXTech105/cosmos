using Cosmos.Application.Gst;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IGstRepository
{
    Task<bool> GstinExistsAsync(string gstin, long? excludingId, CancellationToken cancellationToken);
    Task<CompanyGstRegistrationResponse?> GetRegistrationByIdAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<CompanyGstRegistrationResponse>> GetRegistrationsAsync(CompanyGstRegistrationListRequest request, CancellationToken cancellationToken);
    Task<CompanyGstRegistrationResponse> CreateRegistrationAsync(CreateCompanyGstRegistrationRequest request, long? userId, CancellationToken cancellationToken);
    Task<CompanyGstRegistrationResponse> UpdateRegistrationAsync(long id, UpdateCompanyGstRegistrationRequest request, long? userId, CancellationToken cancellationToken);
    Task DeleteRegistrationAsync(long id, long? userId, CancellationToken cancellationToken);
    Task<CompanyGstRegistrationResponse> SetDefaultRegistrationAsync(long id, long? companyId, long? userId, CancellationToken cancellationToken);
    Task<CompanyGstRegistrationResponse> UpdateRegistrationVerificationAsync(long id, GstinVerificationResponse verification, long? userId, CancellationToken cancellationToken);
    Task<GstinVerificationResponse?> GetCachedVerificationAsync(string gstin, CancellationToken cancellationToken);
    Task<GstinVerificationResponse> SaveVerificationLogAsync(GstinVerificationResponse response, long? userId, CancellationToken cancellationToken);
    Task<EWayBillResponse?> GetEWayBillByNumberAsync(string ewayBillNumber, CancellationToken cancellationToken);
    Task<EWayBillResponse> SaveEWayBillAsync(GenerateEWayBillRequest request, EWayBillResponse providerResponse, long? userId, CancellationToken cancellationToken);
    Task<EWayBillResponse> UpdateEWayBillStatusAsync(CancelEWayBillRequest request, EWayBillResponse providerResponse, long? userId, CancellationToken cancellationToken);
    Task<EInvoiceResponse?> GetEInvoiceByIrnAsync(string irn, CancellationToken cancellationToken);
    Task<EInvoiceResponse> SaveEInvoiceAsync(GenerateEInvoiceRequest request, EInvoiceResponse providerResponse, long? userId, CancellationToken cancellationToken);
    Task<EInvoiceResponse> UpdateEInvoiceStatusAsync(CancelEInvoiceRequest request, EInvoiceResponse providerResponse, long? userId, CancellationToken cancellationToken);
    Task<GstSessionResponse?> GetSessionAsync(long companyGstRegistrationId, CancellationToken cancellationToken);
    Task<GstSessionResponse> SaveSessionAsync(long companyGstRegistrationId, GstSessionResponse providerResponse, string? authToken, string? refreshToken, long? userId, CancellationToken cancellationToken);
    Task<PagedResult<GstApiLogResponse>> GetApiLogsAsync(GstApiLogListRequest request, CancellationToken cancellationToken);
    Task AddApiLogAsync(AddGstApiLogRequest request, CancellationToken cancellationToken);
}
