namespace Cosmos.Contracts.Dashboard;

public sealed class DashboardOverviewDto
{
    public DashboardPeriodDto Period { get; set; } = new();
    public DashboardSalesSummaryDto Sales { get; set; } = new();
    public DashboardPurchaseSummaryDto Purchases { get; set; } = new();
    public DashboardExpenseSummaryDto Expenses { get; set; } = new();
    public DashboardOutstandingSummaryDto Receivables { get; set; } = new();
    public DashboardOutstandingSummaryDto Payables { get; set; } = new();
    public DashboardInventorySummaryDto Inventory { get; set; } = new();
    public DashboardGstSummaryDto Gst { get; set; } = new();
    public DashboardHrSummaryDto Hr { get; set; } = new();
    public DashboardAlertCountsDto Alerts { get; set; } = new();
    public DateTime GeneratedAtUtc { get; set; }
}

public sealed class DashboardPeriodDto
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public string ComparisonPeriod { get; set; } = "PreviousPeriod";
    public DateOnly PreviousFromDate { get; set; }
    public DateOnly PreviousToDate { get; set; }
    public string BusinessTimeZone { get; set; } = "UTC";
}

public sealed class DashboardSalesSummaryDto
{
    public decimal TodaySales { get; set; }
    public decimal CurrentMonthSales { get; set; }
    public decimal SelectedPeriodSales { get; set; }
    public decimal PreviousComparablePeriodSales { get; set; }
    public decimal? GrowthPercentage { get; set; }
    public int SalesInvoiceCount { get; set; }
    public decimal AmountReceived { get; set; }
    public decimal SalesOutstanding { get; set; }
}

public sealed class DashboardPurchaseSummaryDto
{
    public decimal TodayPurchases { get; set; }
    public decimal CurrentMonthPurchases { get; set; }
    public decimal SelectedPeriodPurchases { get; set; }
    public decimal PreviousComparablePeriodPurchases { get; set; }
    public decimal? GrowthPercentage { get; set; }
    public int PurchaseBillCount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal PurchaseOutstanding { get; set; }
}

public sealed class DashboardExpenseSummaryDto
{
    public decimal TodayExpenses { get; set; }
    public decimal CurrentMonthExpenses { get; set; }
    public decimal SelectedPeriodExpenses { get; set; }
    public string? HighestExpenseCategory { get; set; }
    public decimal HighestExpenseCategoryAmount { get; set; }
    public int ExpenseTransactionCount { get; set; }
}

public sealed class DashboardOutstandingSummaryDto
{
    public decimal TotalOutstanding { get; set; }
    public decimal OverdueAmount { get; set; }
    public int PartyCountWithOutstanding { get; set; }
    public int? OldestOverdueDays { get; set; }
    public int OverdueDocumentCount { get; set; }
}

public sealed class DashboardInventorySummaryDto
{
    public decimal CurrentStockValue { get; set; }
    public int TotalInventoryTrackedItems { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int NegativeStockCount { get; set; }
    public decimal? DeadStockValue { get; set; }
    public string ValuationMethod { get; set; } = "Items.CurrentStock x Items.PurchasePrice";
}

public sealed class DashboardGstSummaryDto
{
    public int PendingEInvoices { get; set; }
    public int FailedEInvoices { get; set; }
    public int CancelledEInvoices { get; set; }
    public int PendingEWayBills { get; set; }
    public int FailedEWayBills { get; set; }
    public int CancelledEWayBills { get; set; }
    public int ExpiringEWayBills { get; set; }
}

public sealed class DashboardHrSummaryDto
{
    public int ActiveEmployees { get; set; }
    public int PresentToday { get; set; }
    public int AbsentToday { get; set; }
    public int OnLeaveToday { get; set; }
    public int NotCheckedIn { get; set; }
    public int? LateArrivals { get; set; }
    public int ResignedEmployees { get; set; }
    public int NewJoinersThisMonth { get; set; }
    public DateOnly AttendanceDate { get; set; }
}

public sealed class DashboardAlertCountsDto
{
    public int InventoryAlerts { get; set; }
    public int ReceivableAlerts { get; set; }
    public int PayableAlerts { get; set; }
    public int GstAlerts { get; set; }
    public int TotalAlerts => InventoryAlerts + ReceivableAlerts + PayableAlerts + GstAlerts;
}

public sealed class DashboardTrendPointDto
{
    public string PeriodKey { get; set; } = string.Empty;
    public string PeriodLabel { get; set; } = string.Empty;
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal SalesAmount { get; set; }
    public decimal PurchaseAmount { get; set; }
    public decimal Difference { get; set; }
    public int SalesTransactionCount { get; set; }
    public int PurchaseTransactionCount { get; set; }
}

public sealed class DashboardRevenueExpenseTrendPointDto
{
    public string PeriodKey { get; set; } = string.Empty;
    public string PeriodLabel { get; set; } = string.Empty;
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal SalesRevenue { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal OperatingDifference { get; set; }
}

public sealed class DashboardTopSellingItemDto
{
    public int Rank { get; set; }
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal QuantitySold { get; set; }
    public decimal SalesAmount { get; set; }
    public int TransactionCount { get; set; }
    public decimal CurrentStock { get; set; }
}

public sealed class DashboardTopPartyDto
{
    public int Rank { get; set; }
    public Guid PartyId { get; set; }
    public string? PartyCode { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public string PartyType { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal ReceivedOrPaidAmount { get; set; }
    public decimal OutstandingAmount { get; set; }
}

public sealed class DashboardAlertsDto
{
    public DashboardAlertGroupDto Inventory { get; set; } = new();
    public DashboardAlertGroupDto Receivables { get; set; } = new();
    public DashboardAlertGroupDto Payables { get; set; } = new();
    public DashboardAlertGroupDto Gst { get; set; } = new();
    public DateTime GeneratedAtUtc { get; set; }
}

public sealed class DashboardAlertGroupDto
{
    public string AlertType { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal? Amount { get; set; }
    public int? OldestAgeDays { get; set; }
    public IReadOnlyCollection<DashboardAlertPreviewDto> PreviewRows { get; set; } = [];
}

public sealed class DashboardAlertPreviewDto
{
    public string Severity { get; set; } = "Info";
    public string Title { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? ReferenceNumber { get; set; }
    public decimal? Amount { get; set; }
    public int? AgeDays { get; set; }
    public string? RelatedRoute { get; set; }
}

public sealed class DashboardOverviewData
{
    public DashboardSalesSummaryDto Sales { get; set; } = new();
    public DashboardPurchaseSummaryDto Purchases { get; set; } = new();
    public DashboardExpenseSummaryDto Expenses { get; set; } = new();
    public DashboardOutstandingSummaryDto Receivables { get; set; } = new();
    public DashboardOutstandingSummaryDto Payables { get; set; } = new();
    public DashboardInventorySummaryDto Inventory { get; set; } = new();
    public DashboardGstSummaryDto Gst { get; set; } = new();
    public DashboardHrSummaryDto Hr { get; set; } = new();
    public DashboardAlertCountsDto Alerts { get; set; } = new();
}
