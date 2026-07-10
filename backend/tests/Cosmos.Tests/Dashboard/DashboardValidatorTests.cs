using Cosmos.Application.Validators;
using Cosmos.Contracts.Dashboard;
using Cosmos.Shared.Options;
using Microsoft.Extensions.Options;

namespace Cosmos.Tests.Dashboard;

public sealed class DashboardValidatorTests
{
    private static readonly IOptions<DashboardOptions> Options = Microsoft.Extensions.Options.Options.Create(new DashboardOptions
    {
        MaxDateRangeDays = 30,
        MaxTopRows = 20,
        MaxAlertPreviewRows = 20
    });

    [Fact]
    public async Task Overview_rejects_invalid_date_range()
    {
        var request = new DashboardOverviewRequest
        {
            FromDate = new DateOnly(2026, 7, 10),
            ToDate = new DateOnly(2026, 7, 9)
        };

        var result = await new DashboardOverviewRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Overview_rejects_invalid_comparison_period()
    {
        var request = new DashboardOverviewRequest { ComparisonPeriod = "SameQuarter" };

        var result = await new DashboardOverviewRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.ComparisonPeriod));
    }

    [Fact]
    public async Task Trend_rejects_excessive_date_range_and_invalid_grouping()
    {
        var request = new DashboardTrendRequest
        {
            FromDate = new DateOnly(2026, 1, 1),
            ToDate = new DateOnly(2026, 3, 1),
            GroupBy = "Quarter"
        };

        var result = await new DashboardTrendRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.GroupBy));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public async Task Top_items_rejects_top_outside_safe_bounds(int top)
    {
        var request = new DashboardTopItemsRequest { Top = top };

        var result = await new DashboardTopItemsRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.Top));
    }

    [Fact]
    public async Task Top_items_rejects_invalid_category_id()
    {
        var request = new DashboardTopItemsRequest { CategoryId = 0 };

        var result = await new DashboardTopItemsRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.CategoryId));
    }

    [Fact]
    public async Task Top_parties_rejects_invalid_party_type()
    {
        var request = new DashboardTopPartiesRequest { PartyType = "VendorCustomer" };

        var result = await new DashboardTopPartiesRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.PartyType));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public async Task Alerts_rejects_invalid_preview_limit(int previewLimit)
    {
        var request = new DashboardAlertsRequest { PreviewLimit = previewLimit };

        var result = await new DashboardAlertsRequestValidator(Options).ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(request.PreviewLimit));
    }
}
