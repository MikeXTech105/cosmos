using Cosmos.Application.Gst;
using Cosmos.Contracts.Gst;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IEWayBillService
{
    Task<ApiResponse<EWayBillResponse>> GenerateAsync(GenerateEWayBillRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<EWayBillResponse>> CancelAsync(CancelEWayBillRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<EWayBillResponse>> UpdateVehicleAsync(UpdateEWayBillVehicleRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<EWayBillResponse>> ExtendAsync(ExtendEWayBillRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<EWayBillResponse>> GetByNumberAsync(string ewayBillNumber, CancellationToken cancellationToken);
    Task<ApiResponse<EWayBillResponse>> GetDetailsAsync(GetEWayBillDetailsRequest request, CancellationToken cancellationToken);
}
