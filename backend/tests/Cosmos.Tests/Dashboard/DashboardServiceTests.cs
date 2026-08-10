using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Dashboard;
using Cosmos.Shared.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Cosmos.Tests.Dashboard;

public sealed class DashboardServiceTests
{
    private static readonly DashboardOptions DashboardOptions = new()
    {
        BusinessTimeZone = "UTC",
        MaxDateRangeDays = 366,
        DefaultTrendMonths = 6,
        MaxTopRows = 20,
        MaxAlertPreviewRows = 20,
        MaxRecentActivityRows = 50
    };

    [Fact]
    public async Task Overview_uses_current_month_defaults_and_calculates_growth()
    {
        DashboardOverviewParameters? captured = null;
        var repository = new Mock<IDashboardRepository>();
        repository
            .Setup(x => x.GetOverviewAsync(It.IsAny<DashboardOverviewParameters>(), It.IsAny<CancellationToken>()))
            .Callback<DashboardOverviewParameters, CancellationToken>((p, _) => captured = p)
            .ReturnsAsync(new DashboardOverviewData
            {
                Sales = new DashboardSalesSummaryDto { SelectedPeriodSales = 150, PreviousComparablePeriodSales = 100 },
                Purchases = new DashboardPurchaseSummaryDto { SelectedPeriodPurchases = 50, PreviousComparablePeriodPurchases = 0 }
            });

        var response = await CreateService(repository.Object).GetOverviewAsync(new DashboardOverviewRequest(), CancellationToken.None);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        Assert.NotNull(captured);
        Assert.Equal(new DateOnly(today.Year, today.Month, 1), captured!.FromDate);
        Assert.Equal(today, captured.ToDate);
        Assert.Equal(50, response.Data!.Sales.GrowthPercentage);
        Assert.Null(response.Data.Purchases.GrowthPercentage);
    }

    [Fact]
    public async Task Sales_purchase_trend_delegates_normalized_grouping()
    {
        DashboardTrendParameters? captured = null;
        var repository = new Mock<IDashboardRepository>();
        repository
            .Setup(x => x.GetSalesPurchaseTrendAsync(It.IsAny<DashboardTrendParameters>(), It.IsAny<CancellationToken>()))
            .Callback<DashboardTrendParameters, CancellationToken>((p, _) => captured = p)
            .ReturnsAsync([]);

        await CreateService(repository.Object).GetSalesPurchaseTrendAsync(new DashboardTrendRequest
        {
            FromDate = new DateOnly(2026, 1, 1),
            ToDate = new DateOnly(2026, 1, 31),
            GroupBy = "week"
        }, CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal("Week", captured!.GroupBy);
    }

    [Fact]
    public async Task Top_parties_maps_supplier_request()
    {
        DashboardTopPartiesParameters? captured = null;
        var repository = new Mock<IDashboardRepository>();
        repository
            .Setup(x => x.GetTopPartiesAsync(It.IsAny<DashboardTopPartiesParameters>(), It.IsAny<CancellationToken>()))
            .Callback<DashboardTopPartiesParameters, CancellationToken>((p, _) => captured = p)
            .ReturnsAsync([]);

        await CreateService(repository.Object).GetTopPartiesAsync(new DashboardTopPartiesRequest
        {
            FromDate = new DateOnly(2026, 7, 1),
            ToDate = new DateOnly(2026, 7, 10),
            PartyType = "supplier",
            Top = 10
        }, CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal("Supplier", captured!.PartyType);
        Assert.Equal(10, captured.Top);
    }

    [Fact]
    public async Task Alerts_and_hr_summary_return_repository_data()
    {
        var repository = new Mock<IDashboardRepository>();
        repository
            .Setup(x => x.GetAlertsAsync(It.IsAny<DashboardAlertsParameters>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardAlertsDto
            {
                Inventory = new DashboardAlertGroupDto { AlertType = "Inventory", Count = 2 }
            });
        repository
            .Setup(x => x.GetHrSummaryAsync(new DateOnly(2026, 7, 10), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DashboardHrSummaryDto { AttendanceDate = new DateOnly(2026, 7, 10), ActiveEmployees = 5 });

        var service = CreateService(repository.Object);

        var alerts = await service.GetAlertsAsync(new DashboardAlertsRequest { PreviewLimit = 5 }, CancellationToken.None);
        var hr = await service.GetHrSummaryAsync(new DashboardHrSummaryRequest { AttendanceDate = new DateOnly(2026, 7, 10) }, CancellationToken.None);

        Assert.Equal(2, alerts.Data!.Inventory.Count);
        Assert.Equal(5, hr.Data!.ActiveEmployees);
    }

    [Fact]
    public async Task Recent_activity_uses_the_bounded_requested_limit()
    {
        var repository = new Mock<IDashboardRepository>();
        repository.Setup(x => x.GetRecentActivityAsync(12, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new DashboardRecentActivityDto { ActivityId = 4, Action = "Created", Module = "Items" }]);

        var response = await CreateService(repository.Object).GetRecentActivityAsync(new DashboardRecentActivityRequest { Limit = 12 }, CancellationToken.None);

        Assert.Equal(4, Assert.Single(response.Data!).ActivityId);
        repository.Verify(x => x.GetRecentActivityAsync(12, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static DashboardService CreateService(IDashboardRepository repository)
    {
        var options = Options.Create(DashboardOptions);
        return new DashboardService(
            repository,
            options,
            NullLogger<DashboardService>.Instance,
            new DashboardOverviewRequestValidator(options),
            new DashboardTrendRequestValidator(options),
            new DashboardTopItemsRequestValidator(options),
            new DashboardTopPartiesRequestValidator(options),
            new DashboardAlertsRequestValidator(options),
            new DashboardHrSummaryRequestValidator(),
            new DashboardRecentActivityRequestValidator(options));
    }
}
