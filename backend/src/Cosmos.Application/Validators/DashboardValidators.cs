using Cosmos.Contracts.Dashboard;
using Cosmos.Shared.Options;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace Cosmos.Application.Validators;

public abstract class DashboardDateRangeValidator<T> : AbstractValidator<T>
{
    private readonly int _maxDateRangeDays;

    protected DashboardDateRangeValidator(IOptions<DashboardOptions> options)
    {
        _maxDateRangeDays = Math.Max(1, options.Value.MaxDateRangeDays);
    }

    protected void ValidateDateRange(Func<T, DateOnly?> fromDate, Func<T, DateOnly?> toDate)
    {
        RuleFor(x => x)
            .Must(x => !fromDate(x).HasValue || !toDate(x).HasValue || fromDate(x) <= toDate(x))
            .WithMessage("fromDate cannot be greater than toDate.");

        RuleFor(x => x)
            .Must(x => !fromDate(x).HasValue || !toDate(x).HasValue || toDate(x)!.Value.DayNumber - fromDate(x)!.Value.DayNumber + 1 <= _maxDateRangeDays)
            .WithMessage($"Date range cannot exceed {_maxDateRangeDays} days.");
    }
}

public sealed class DashboardOverviewRequestValidator : DashboardDateRangeValidator<DashboardOverviewRequest>
{
    public DashboardOverviewRequestValidator(IOptions<DashboardOptions> options) : base(options)
    {
        ValidateDateRange(x => x.FromDate, x => x.ToDate);
        RuleFor(x => x.ComparisonPeriod)
            .Must(x => string.IsNullOrWhiteSpace(x) || new[] { "PreviousPeriod", "PreviousMonth", "Yesterday" }.Contains(x, StringComparer.OrdinalIgnoreCase))
            .WithMessage("comparisonPeriod must be PreviousPeriod, PreviousMonth, or Yesterday.");
    }
}

public sealed class DashboardTrendRequestValidator : DashboardDateRangeValidator<DashboardTrendRequest>
{
    public DashboardTrendRequestValidator(IOptions<DashboardOptions> options) : base(options)
    {
        ValidateDateRange(x => x.FromDate, x => x.ToDate);
        RuleFor(x => x.GroupBy)
            .Must(x => new[] { "Day", "Week", "Month" }.Contains(x, StringComparer.OrdinalIgnoreCase))
            .WithMessage("groupBy must be Day, Week, or Month.");
    }
}

public sealed class DashboardTopItemsRequestValidator : DashboardDateRangeValidator<DashboardTopItemsRequest>
{
    public DashboardTopItemsRequestValidator(IOptions<DashboardOptions> options) : base(options)
    {
        var maxTop = Math.Max(1, options.Value.MaxTopRows);
        ValidateDateRange(x => x.FromDate, x => x.ToDate);
        RuleFor(x => x.Top).InclusiveBetween(1, maxTop);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
    }
}

public sealed class DashboardTopPartiesRequestValidator : DashboardDateRangeValidator<DashboardTopPartiesRequest>
{
    public DashboardTopPartiesRequestValidator(IOptions<DashboardOptions> options) : base(options)
    {
        var maxTop = Math.Max(1, options.Value.MaxTopRows);
        ValidateDateRange(x => x.FromDate, x => x.ToDate);
        RuleFor(x => x.Top).InclusiveBetween(1, maxTop);
        RuleFor(x => x.PartyType)
            .Must(x => new[] { "Customer", "Supplier" }.Contains(x, StringComparer.OrdinalIgnoreCase))
            .WithMessage("partyType must be Customer or Supplier.");
    }
}

public sealed class DashboardAlertsRequestValidator : AbstractValidator<DashboardAlertsRequest>
{
    public DashboardAlertsRequestValidator(IOptions<DashboardOptions> options)
    {
        var maxPreviewRows = Math.Max(1, options.Value.MaxAlertPreviewRows);
        RuleFor(x => x.PreviewLimit).InclusiveBetween(1, maxPreviewRows);
        RuleFor(x => x.MinimumAmount).GreaterThanOrEqualTo(0).When(x => x.MinimumAmount.HasValue);
    }
}

public sealed class DashboardHrSummaryRequestValidator : AbstractValidator<DashboardHrSummaryRequest>
{
}

public sealed class DashboardRecentActivityRequestValidator : AbstractValidator<DashboardRecentActivityRequest>
{
    public DashboardRecentActivityRequestValidator(IOptions<DashboardOptions> options) =>
        RuleFor(x => x.Limit).InclusiveBetween(1, Math.Max(1, options.Value.MaxRecentActivityRows));
}
