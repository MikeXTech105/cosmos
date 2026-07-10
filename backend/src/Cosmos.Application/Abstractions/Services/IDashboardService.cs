using Cosmos.Contracts.Dashboard;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IDashboardService
{
    Task<ApiResponse<DashboardOverviewDto>> GetOverviewAsync(DashboardOverviewRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<DashboardTrendPointDto>>> GetSalesPurchaseTrendAsync(DashboardTrendRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<DashboardRevenueExpenseTrendPointDto>>> GetRevenueExpenseTrendAsync(DashboardTrendRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<DashboardTopSellingItemDto>>> GetTopSellingItemsAsync(DashboardTopItemsRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<DashboardTopPartyDto>>> GetTopPartiesAsync(DashboardTopPartiesRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<DashboardAlertsDto>> GetAlertsAsync(DashboardAlertsRequest request, CancellationToken cancellationToken);
    Task<ApiResponse<DashboardHrSummaryDto>> GetHrSummaryAsync(DashboardHrSummaryRequest request, CancellationToken cancellationToken);
}
