using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Dashboard;
using Cosmos.Shared.Options;
using Cosmos.Shared.Responses;
using FluentValidation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cosmos.Application.Services;

public sealed class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _repository;
    private readonly DashboardOptions _options;
    private readonly ILogger<DashboardService> _logger;
    private readonly IValidator<DashboardOverviewRequest> _overviewValidator;
    private readonly IValidator<DashboardTrendRequest> _trendValidator;
    private readonly IValidator<DashboardTopItemsRequest> _topItemsValidator;
    private readonly IValidator<DashboardTopPartiesRequest> _topPartiesValidator;
    private readonly IValidator<DashboardAlertsRequest> _alertsValidator;
    private readonly IValidator<DashboardHrSummaryRequest> _hrValidator;
    private readonly IValidator<DashboardRecentActivityRequest> _recentActivityValidator;

    public DashboardService(
        IDashboardRepository repository,
        IOptions<DashboardOptions> options,
        ILogger<DashboardService> logger,
        IValidator<DashboardOverviewRequest> overviewValidator,
        IValidator<DashboardTrendRequest> trendValidator,
        IValidator<DashboardTopItemsRequest> topItemsValidator,
        IValidator<DashboardTopPartiesRequest> topPartiesValidator,
        IValidator<DashboardAlertsRequest> alertsValidator,
        IValidator<DashboardHrSummaryRequest> hrValidator,
        IValidator<DashboardRecentActivityRequest> recentActivityValidator)
    {
        _repository = repository;
        _options = options.Value;
        _logger = logger;
        _overviewValidator = overviewValidator;
        _trendValidator = trendValidator;
        _topItemsValidator = topItemsValidator;
        _topPartiesValidator = topPartiesValidator;
        _alertsValidator = alertsValidator;
        _hrValidator = hrValidator;
        _recentActivityValidator = recentActivityValidator;
    }

    public async Task<ApiResponse<DashboardOverviewDto>> GetOverviewAsync(DashboardOverviewRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_overviewValidator, request, cancellationToken);
        var today = GetBusinessToday();
        var currentMonthStart = new DateOnly(today.Year, today.Month, 1);
        var fromDate = request.FromDate ?? currentMonthStart;
        var toDate = request.ToDate ?? today;
        var comparisonPeriod = NormalizeComparisonPeriod(request.ComparisonPeriod);
        var (previousFrom, previousTo) = GetComparisonRange(fromDate, toDate, comparisonPeriod, today);

        var parameters = new DashboardOverviewParameters
        {
            FromDate = fromDate,
            ToDate = toDate,
            PreviousFromDate = previousFrom,
            PreviousToDate = previousTo,
            Today = today,
            MonthStart = currentMonthStart
        };

        var data = await _repository.GetOverviewAsync(parameters, cancellationToken);
        data.Sales.GrowthPercentage = Growth(data.Sales.SelectedPeriodSales, data.Sales.PreviousComparablePeriodSales);
        data.Purchases.GrowthPercentage = Growth(data.Purchases.SelectedPeriodPurchases, data.Purchases.PreviousComparablePeriodPurchases);

        return ApiResponse<DashboardOverviewDto>.Success(new DashboardOverviewDto
        {
            Period = new DashboardPeriodDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                ComparisonPeriod = comparisonPeriod,
                PreviousFromDate = previousFrom,
                PreviousToDate = previousTo,
                BusinessTimeZone = _options.BusinessTimeZone
            },
            Sales = data.Sales,
            Purchases = data.Purchases,
            Expenses = data.Expenses,
            Receivables = data.Receivables,
            Payables = data.Payables,
            Inventory = data.Inventory,
            Gst = data.Gst,
            Hr = data.Hr,
            Alerts = data.Alerts,
            GeneratedAtUtc = DateTime.UtcNow
        });
    }

    public async Task<ApiResponse<IReadOnlyCollection<DashboardTrendPointDto>>> GetSalesPurchaseTrendAsync(DashboardTrendRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_trendValidator, request, cancellationToken);
        return ApiResponse<IReadOnlyCollection<DashboardTrendPointDto>>.Success(
            await _repository.GetSalesPurchaseTrendAsync(NormalizeTrend(request), cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<DashboardRevenueExpenseTrendPointDto>>> GetRevenueExpenseTrendAsync(DashboardTrendRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_trendValidator, request, cancellationToken);
        return ApiResponse<IReadOnlyCollection<DashboardRevenueExpenseTrendPointDto>>.Success(
            await _repository.GetRevenueExpenseTrendAsync(NormalizeTrend(request), cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<DashboardTopSellingItemDto>>> GetTopSellingItemsAsync(DashboardTopItemsRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_topItemsValidator, request, cancellationToken);
        var (fromDate, toDate) = NormalizeOptionalRange(request.FromDate, request.ToDate);
        return ApiResponse<IReadOnlyCollection<DashboardTopSellingItemDto>>.Success(
            await _repository.GetTopSellingItemsAsync(new DashboardTopItemsParameters
            {
                FromDate = fromDate,
                ToDate = toDate,
                CategoryId = request.CategoryId,
                Top = request.Top
            }, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<DashboardTopPartyDto>>> GetTopPartiesAsync(DashboardTopPartiesRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_topPartiesValidator, request, cancellationToken);
        var (fromDate, toDate) = NormalizeOptionalRange(request.FromDate, request.ToDate);
        return ApiResponse<IReadOnlyCollection<DashboardTopPartyDto>>.Success(
            await _repository.GetTopPartiesAsync(new DashboardTopPartiesParameters
            {
                FromDate = fromDate,
                ToDate = toDate,
                PartyType = NormalizePartyType(request.PartyType),
                Top = request.Top
            }, cancellationToken));
    }

    public async Task<ApiResponse<DashboardAlertsDto>> GetAlertsAsync(DashboardAlertsRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_alertsValidator, request, cancellationToken);
        var alerts = await _repository.GetAlertsAsync(new DashboardAlertsParameters
        {
            Today = GetBusinessToday(),
            PreviewLimit = request.PreviewLimit,
            MinimumAmount = request.MinimumAmount
        }, cancellationToken);
        alerts.GeneratedAtUtc = DateTime.UtcNow;
        return ApiResponse<DashboardAlertsDto>.Success(alerts);
    }

    public async Task<ApiResponse<DashboardHrSummaryDto>> GetHrSummaryAsync(DashboardHrSummaryRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_hrValidator, request, cancellationToken);
        return ApiResponse<DashboardHrSummaryDto>.Success(
            await _repository.GetHrSummaryAsync(request.AttendanceDate ?? GetBusinessToday(), cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<DashboardRecentActivityDto>>> GetRecentActivityAsync(DashboardRecentActivityRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_recentActivityValidator, request, cancellationToken);
        return ApiResponse<IReadOnlyCollection<DashboardRecentActivityDto>>.Success(
            await _repository.GetRecentActivityAsync(request.Limit, cancellationToken));
    }

    private DashboardTrendParameters NormalizeTrend(DashboardTrendRequest request)
    {
        var today = GetBusinessToday();
        var defaultToDate = today;
        var defaultFromDate = new DateOnly(today.AddMonths(-Math.Max(1, _options.DefaultTrendMonths) + 1).Year, today.AddMonths(-Math.Max(1, _options.DefaultTrendMonths) + 1).Month, 1);

        return new DashboardTrendParameters
        {
            FromDate = request.FromDate ?? defaultFromDate,
            ToDate = request.ToDate ?? defaultToDate,
            GroupBy = NormalizeGroupBy(request.GroupBy)
        };
    }

    private (DateOnly FromDate, DateOnly ToDate) NormalizeOptionalRange(DateOnly? fromDate, DateOnly? toDate)
    {
        var today = GetBusinessToday();
        return (fromDate ?? new DateOnly(today.Year, today.Month, 1), toDate ?? today);
    }

    private DateOnly GetBusinessToday()
    {
        try
        {
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById(string.IsNullOrWhiteSpace(_options.BusinessTimeZone) ? "UTC" : _options.BusinessTimeZone);
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone));
        }
        catch (TimeZoneNotFoundException ex)
        {
            _logger.LogWarning(ex, "Dashboard business time zone {BusinessTimeZone} was not found. Falling back to UTC.", _options.BusinessTimeZone);
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
        catch (InvalidTimeZoneException ex)
        {
            _logger.LogWarning(ex, "Dashboard business time zone {BusinessTimeZone} is invalid. Falling back to UTC.", _options.BusinessTimeZone);
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
    }

    internal static (DateOnly PreviousFrom, DateOnly PreviousTo) GetComparisonRange(DateOnly fromDate, DateOnly toDate, string comparisonPeriod, DateOnly today)
    {
        if (string.Equals(comparisonPeriod, "Yesterday", StringComparison.OrdinalIgnoreCase))
        {
            var yesterday = today.AddDays(-1);
            return (yesterday, yesterday);
        }

        if (string.Equals(comparisonPeriod, "PreviousMonth", StringComparison.OrdinalIgnoreCase))
        {
            var previousMonth = fromDate.AddMonths(-1);
            var previousStart = new DateOnly(previousMonth.Year, previousMonth.Month, 1);
            var previousEnd = previousStart.AddMonths(1).AddDays(-1);
            return (previousStart, previousEnd);
        }

        var days = toDate.DayNumber - fromDate.DayNumber + 1;
        var previousTo = fromDate.AddDays(-1);
        return (previousTo.AddDays(-days + 1), previousTo);
    }

    internal static decimal? Growth(decimal current, decimal previous)
    {
        if (previous == 0)
        {
            return current == 0 ? 0 : null;
        }

        return Math.Round((current - previous) / previous * 100, 2);
    }

    private static string NormalizeComparisonPeriod(string? comparisonPeriod) =>
        new[] { "PreviousMonth", "Yesterday" }.FirstOrDefault(x => string.Equals(x, comparisonPeriod, StringComparison.OrdinalIgnoreCase)) ?? "PreviousPeriod";

    private static string NormalizeGroupBy(string groupBy) =>
        new[] { "Day", "Week" }.FirstOrDefault(x => string.Equals(x, groupBy, StringComparison.OrdinalIgnoreCase)) ?? "Month";

    private static string NormalizePartyType(string partyType) =>
        string.Equals(partyType, "Supplier", StringComparison.OrdinalIgnoreCase) ? "Supplier" : "Customer";
}
