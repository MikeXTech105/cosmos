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

    [Fact]
    public async Task Inventory_report_rejects_invalid_stock_status_and_sort_field()
    {
        var query = new InventoryReportQuery
        {
            StockStatus = "Dormant",
            SortBy = "DROP TABLE",
        };

        var result = await new InventoryReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.StockStatus));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.SortBy));
    }

    [Fact]
    public async Task Stock_ledger_rejects_invalid_movement_type()
    {
        var query = new StockLedgerReportQuery { MovementType = "AdjustmentIn" };

        var result = await new StockLedgerReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.MovementType));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(3651)]
    public async Task Dead_stock_rejects_invalid_inactivity_days(int inactiveDays)
    {
        var query = new StockAgeingReportQuery { InactiveDays = inactiveDays };

        var result = await new StockAgeingReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.InactiveDays));
    }

    [Fact]
    public async Task Moving_items_rejects_excessive_top()
    {
        var query = new MovingItemsReportQuery { Top = 101 };

        var result = await new MovingItemsReportQueryValidator().ValidateAsync(query);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(query.Top));
    }
}
