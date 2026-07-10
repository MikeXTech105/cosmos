namespace Cosmos.Shared.Options;

public sealed class DashboardOptions
{
    public string BusinessTimeZone { get; set; } = "UTC";
    public int MaxDateRangeDays { get; set; } = 366;
    public int DefaultTrendMonths { get; set; } = 6;
    public int MaxTopRows { get; set; } = 20;
    public int MaxAlertPreviewRows { get; set; } = 20;
}
