using Cosmos.Application.Validators;
using Cosmos.Contracts.Reports;

namespace Cosmos.Tests.Reports;

public sealed class ReportValidatorTests
{
    [Fact]
    public async Task Date_range_rejects_from_date_after_to_date()
    {
        var query = new ReportDateRangeQuery
        {
            FromDate = new DateOnly(2026, 7, 10),
            ToDate = new DateOnly(2026, 7, 9)
        };

        var result = await new ReportDateRangeQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.ErrorMessage == "fromDate cannot be greater than toDate.");
    }

    [Theory]
    [InlineData(0, 20, "DESC")]
    [InlineData(1, 0, "DESC")]
    [InlineData(1, 201, "DESC")]
    [InlineData(1, 20, "SIDEWAYS")]
    public async Task Paged_report_rejects_invalid_pagination_or_sort_direction(int pageNumber, int pageSize, string sortDirection)
    {
        var query = new SalesInvoiceRegisterReportQuery
        {
            PageNumber = pageNumber,
            PageSize = pageSize,
            SortDirection = sortDirection
        };

        var result = await new SalesInvoiceRegisterReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task Item_report_rejects_non_positive_item_id()
    {
        var query = new SalesByItemReportQuery { ItemId = 0 };

        var result = await new SalesByItemReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.ItemId));
    }

    [Fact]
    public async Task Expense_report_rejects_non_positive_category_id()
    {
        var query = new ExpenseReportQuery { CategoryId = 0 };

        var result = await new ExpenseReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.CategoryId));
    }
}
