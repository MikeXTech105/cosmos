using Cosmos.Application.Sales;
using Cosmos.Application.Services;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Sales;

public sealed class SalesCalculationServiceTests
{
    [Fact]
    public void CalculateInvoiceTotals_ComputesDiscountTaxAndDueAmount()
    {
        var service = new SalesCalculationService();
        var items = new[]
        {
            new SalesInvoiceItemRequest(1, 2m, 100m, 10m, 0m, null, 5m),
            new SalesInvoiceItemRequest(2, 1m, 50m, 0m, 5m, null, 0m)
        };

        var totals = service.CalculateInvoiceTotals(items, invoiceDiscount: 10m, paidAmount: 50m);

        Assert.Equal(250m, totals.SubTotal);
        Assert.Equal(35m, totals.DiscountAmount);
        Assert.Equal(9m, totals.TaxAmount);
        Assert.Equal(224m, totals.GrandTotal);
        Assert.Equal(50m, totals.PaidAmount);
        Assert.Equal(174m, totals.DueAmount);
        Assert.Equal(2, totals.PaymentStatus);
    }

    [Fact]
    public void CalculateInvoiceTotals_RejectsPaymentGreaterThanGrandTotal()
    {
        var service = new SalesCalculationService();
        var items = new[] { new SalesInvoiceItemRequest(1, 1m, 100m, 0m, 0m, null, 0m) };

        Assert.Throws<CosmosException>(() => service.CalculateInvoiceTotals(items, invoiceDiscount: 0m, paidAmount: 101m));
    }
}
