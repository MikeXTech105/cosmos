namespace Cosmos.Contracts.Dashboard;

public sealed class DashboardOverviewRequest
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? ComparisonPeriod { get; set; } = "PreviousPeriod";
}

public sealed class DashboardTrendRequest
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string GroupBy { get; set; } = "Month";
}

public sealed class DashboardTopItemsRequest
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public long? CategoryId { get; set; }
    public int Top { get; set; } = 5;
}

public sealed class DashboardTopPartiesRequest
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string PartyType { get; set; } = "Customer";
    public int Top { get; set; } = 5;
}

public sealed class DashboardAlertsRequest
{
    public int PreviewLimit { get; set; } = 5;
    public decimal? MinimumAmount { get; set; }
}

public sealed class DashboardHrSummaryRequest
{
    public DateOnly? AttendanceDate { get; set; }
}

public sealed class DashboardOverviewParameters
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public DateOnly PreviousFromDate { get; set; }
    public DateOnly PreviousToDate { get; set; }
    public DateOnly Today { get; set; }
    public DateOnly MonthStart { get; set; }
}

public sealed class DashboardTrendParameters
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public string GroupBy { get; set; } = "Month";
}

public sealed class DashboardTopItemsParameters
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public long? CategoryId { get; set; }
    public int Top { get; set; }
}

public sealed class DashboardTopPartiesParameters
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public string PartyType { get; set; } = "Customer";
    public int Top { get; set; }
}

public sealed class DashboardAlertsParameters
{
    public DateOnly Today { get; set; }
    public int PreviewLimit { get; set; }
    public decimal? MinimumAmount { get; set; }
}
