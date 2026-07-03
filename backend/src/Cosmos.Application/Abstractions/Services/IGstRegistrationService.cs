using Cosmos.Application.Gst;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IGstRegistrationService
{
    Task<ApiResponse<PagedResult<CompanyGstRegistrationResponse>>> GetListAsync(CompanyGstRegistrationListRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<CompanyGstRegistrationResponse>> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<CompanyGstRegistrationResponse>> CreateAsync(CreateCompanyGstRegistrationRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<CompanyGstRegistrationResponse>> UpdateAsync(long id, UpdateCompanyGstRegistrationRequest request, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<CompanyGstRegistrationResponse>> VerifyAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<CompanyGstRegistrationResponse>> SetDefaultAsync(long id, SetDefaultCompanyGstRegistrationRequest request, CancellationToken cancellationToken);
}
