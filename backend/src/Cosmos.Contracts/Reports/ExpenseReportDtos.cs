namespace Cosmos.Contracts.Reports;

public sealed class ExpenseSummaryReportDto
{
    public int TotalExpenses { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public sealed class ExpenseByCategoryReportDto
{
    public long CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int ExpenseCount { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public sealed class ExpenseByPartyReportDto
{
    public Guid? PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public int ExpenseCount { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public sealed class MonthlyExpenseSummaryReportDto
{
    public int ExpenseYear { get; set; }
    public int ExpenseMonth { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public int ExpenseCount { get; set; }
    public decimal ExpenseAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}
