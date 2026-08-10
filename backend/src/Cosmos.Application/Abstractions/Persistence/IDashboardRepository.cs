using Cosmos.Contracts.Dashboard;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IDashboardRepository
{
    Task<DashboardOverviewData> GetOverviewAsync(DashboardOverviewParameters parameters, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DashboardTrendPointDto>> GetSalesPurchaseTrendAsync(DashboardTrendParameters parameters, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DashboardRevenueExpenseTrendPointDto>> GetRevenueExpenseTrendAsync(DashboardTrendParameters parameters, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DashboardTopSellingItemDto>> GetTopSellingItemsAsync(DashboardTopItemsParameters parameters, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DashboardTopPartyDto>> GetTopPartiesAsync(DashboardTopPartiesParameters parameters, CancellationToken cancellationToken);
    Task<DashboardAlertsDto> GetAlertsAsync(DashboardAlertsParameters parameters, CancellationToken cancellationToken);
    Task<DashboardHrSummaryDto> GetHrSummaryAsync(DateOnly attendanceDate, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DashboardRecentActivityDto>> GetRecentActivityAsync(int limit, CancellationToken cancellationToken);
}
