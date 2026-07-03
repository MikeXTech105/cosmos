using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IEInvoiceService
{
    Task<ApiResponse<EInvoiceResponse>> GenerateAsync(GenerateEInvoiceRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<EInvoiceResponse>> CancelAsync(CancelEInvoiceRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<EInvoiceResponse>> GetByIrnAsync(string irn, CancellationToken cancellationToken);
}
