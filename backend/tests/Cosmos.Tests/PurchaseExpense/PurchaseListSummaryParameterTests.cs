using System.Reflection;
using Cosmos.Persistence.Repositories;

namespace Cosmos.Tests.PurchaseExpense;

public sealed class PurchaseListSummaryParameterTests
{
    [Fact]
    public void Purchase_bill_summary_with_no_filters_never_contains_paging_or_sorting_parameters()
    {
        var parameters = new PurchaseExpenseRepository.PurchaseBillListSummaryParameters(null, null, null, null, null);

        Assert.Null(parameters.Search);
        Assert.Null(parameters.SupplierId);
        Assert.Null(parameters.Status);
        var propertyNames = typeof(PurchaseExpenseRepository.PurchaseBillListSummaryParameters).GetProperties().Select(x => x.Name);
        Assert.DoesNotContain("PageNumber", propertyNames);
        Assert.DoesNotContain("PageSize", propertyNames);
        Assert.DoesNotContain("SortBy", propertyNames);
        Assert.DoesNotContain("SortDirection", propertyNames);
    }

    [Fact]
    public void Purchase_bill_summary_preserves_every_business_filter()
    {
        var supplierId = Guid.NewGuid();
        var fromDate = new DateOnly(2026, 1, 1);
        var toDate = new DateOnly(2026, 1, 31);
        var parameters = new PurchaseExpenseRepository.PurchaseBillListSummaryParameters("supplier", supplierId, 3, fromDate, toDate);

        Assert.Equal("supplier", parameters.Search);
        Assert.Equal(supplierId, parameters.SupplierId);
        Assert.Equal(3, parameters.Status);
        Assert.Equal(fromDate, parameters.FromDate);
        Assert.Equal(toDate, parameters.ToDate);
    }

    [Fact]
    public void Paged_with_summary_accepts_distinct_list_and_summary_parameter_objects()
    {
        var method = typeof(PurchaseExpenseRepository).GetMethod("PagedWithSummary", BindingFlags.Instance | BindingFlags.NonPublic)!;
        var parameterNames = method.GetParameters().Select(x => x.Name).ToArray();

        Assert.Contains("listParameters", parameterNames);
        Assert.Contains("summaryParameters", parameterNames);
    }
}
