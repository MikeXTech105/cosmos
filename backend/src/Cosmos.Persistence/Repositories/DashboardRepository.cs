using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Dashboard;
using Cosmos.Persistence.Connection;
using Dapper;
using System.Data;

namespace Cosmos.Persistence.Repositories;

public sealed class DashboardRepository : IDashboardRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public DashboardRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<DashboardOverviewData> GetOverviewAsync(DashboardOverviewParameters parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = Command("sp_Dashboard_Overview", parameters, cancellationToken);
        using var multi = await connection.QueryMultipleAsync(command);

        return new DashboardOverviewData
        {
            Sales = await ReadSingleOrNew<DashboardSalesSummaryDto>(multi),
            Purchases = await ReadSingleOrNew<DashboardPurchaseSummaryDto>(multi),
            Expenses = await ReadSingleOrNew<DashboardExpenseSummaryDto>(multi),
            Receivables = await ReadSingleOrNew<DashboardOutstandingSummaryDto>(multi),
            Payables = await ReadSingleOrNew<DashboardOutstandingSummaryDto>(multi),
            Inventory = await ReadSingleOrNew<DashboardInventorySummaryDto>(multi),
            Gst = await ReadSingleOrNew<DashboardGstSummaryDto>(multi),
            Hr = await ReadSingleOrNew<DashboardHrSummaryDto>(multi),
            Alerts = await ReadSingleOrNew<DashboardAlertCountsDto>(multi)
        };
    }

    public async Task<IReadOnlyCollection<DashboardTrendPointDto>> GetSalesPurchaseTrendAsync(DashboardTrendParameters parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return (await connection.QueryAsync<DashboardTrendPointDto>(Command("sp_Dashboard_SalesPurchaseTrend", parameters, cancellationToken))).AsList();
    }

    public async Task<IReadOnlyCollection<DashboardRevenueExpenseTrendPointDto>> GetRevenueExpenseTrendAsync(DashboardTrendParameters parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return (await connection.QueryAsync<DashboardRevenueExpenseTrendPointDto>(Command("sp_Dashboard_RevenueExpenseTrend", parameters, cancellationToken))).AsList();
    }

    public async Task<IReadOnlyCollection<DashboardTopSellingItemDto>> GetTopSellingItemsAsync(DashboardTopItemsParameters parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return (await connection.QueryAsync<DashboardTopSellingItemDto>(Command("sp_Dashboard_TopSellingItems", parameters, cancellationToken))).AsList();
    }

    public async Task<IReadOnlyCollection<DashboardTopPartyDto>> GetTopPartiesAsync(DashboardTopPartiesParameters parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return (await connection.QueryAsync<DashboardTopPartyDto>(Command("sp_Dashboard_TopParties", parameters, cancellationToken))).AsList();
    }

    public async Task<DashboardAlertsDto> GetAlertsAsync(DashboardAlertsParameters parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = Command("sp_Dashboard_Alerts", parameters, cancellationToken);
        using var multi = await connection.QueryMultipleAsync(command);

        return new DashboardAlertsDto
        {
            Inventory = await ReadAlertGroup(multi, "Inventory"),
            Receivables = await ReadAlertGroup(multi, "Receivables"),
            Payables = await ReadAlertGroup(multi, "Payables"),
            Gst = await ReadAlertGroup(multi, "GST")
        };
    }

    public async Task<DashboardHrSummaryDto> GetHrSummaryAsync(DateOnly attendanceDate, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<DashboardHrSummaryDto>(Command("sp_Dashboard_HrSummary", new { AttendanceDate = attendanceDate }, cancellationToken))
            ?? new DashboardHrSummaryDto { AttendanceDate = attendanceDate };
    }

    public async Task<IReadOnlyCollection<DashboardRecentActivityDto>> GetRecentActivityAsync(int limit, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return (await connection.QueryAsync<DashboardRecentActivityDto>(Command("usp_Dashboard_GetRecentActivity", new { Limit = limit }, cancellationToken))).AsList();
    }

    private static CommandDefinition Command(string storedProcedure, object parameters, CancellationToken cancellationToken) =>
        new(storedProcedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);

    private static async Task<T> ReadSingleOrNew<T>(SqlMapper.GridReader multi) where T : new() =>
        await multi.ReadSingleOrDefaultAsync<T>() ?? new T();

    private static async Task<DashboardAlertGroupDto> ReadAlertGroup(SqlMapper.GridReader multi, string fallbackType)
    {
        var group = await multi.ReadSingleOrDefaultAsync<DashboardAlertGroupDto>() ?? new DashboardAlertGroupDto { AlertType = fallbackType };
        group.PreviewRows = (await multi.ReadAsync<DashboardAlertPreviewDto>()).AsList();
        return group;
    }
}
