using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Sales;
using Cosmos.Contracts.Sales;
using Cosmos.Domain.Sales;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Services;

public sealed class SalesCalculationService : ISalesCalculationService
{
    public SalesInvoiceCalculatedTotals CalculateInvoiceTotals(IReadOnlyCollection<SalesInvoiceItemRequest> items, decimal invoiceDiscount, decimal paidAmount)
    {
        var subTotal = 0m;
        var itemDiscount = 0m;
        var taxAmount = 0m;

        foreach (var item in items)
        {
            var lineAmount = item.Quantity * item.Rate;
            var percentageDiscount = item.DiscountPercentage > 0
                ? decimal.Round(lineAmount * item.DiscountPercentage / 100m, 2)
                : 0m;
            var discount = item.DiscountAmount > 0 ? item.DiscountAmount : percentageDiscount;
            if (discount > lineAmount)
            {
                throw new CosmosException("Line discount cannot exceed line amount.");
            }

            var taxableAmount = lineAmount - discount;
            subTotal += lineAmount;
            itemDiscount += discount;
            taxAmount += decimal.Round(taxableAmount * item.TaxPercentage / 100m, 2);
        }

        if (invoiceDiscount < 0)
        {
            throw new CosmosException("Invoice discount cannot be negative.");
        }

        var totalDiscount = itemDiscount + invoiceDiscount;
        if (totalDiscount > subTotal)
        {
            throw new CosmosException("Discount cannot exceed invoice subtotal.");
        }

        var grandTotal = subTotal - totalDiscount + taxAmount;
        if (paidAmount < 0 || paidAmount > grandTotal)
        {
            throw new CosmosException("Paid amount cannot exceed invoice grand total.");
        }

        var dueAmount = grandTotal - paidAmount;
        var paymentStatus = paidAmount <= 0
            ? (int)SalesPaymentStatus.Unpaid
            : dueAmount <= 0 ? (int)SalesPaymentStatus.Paid : (int)SalesPaymentStatus.PartiallyPaid;

        return new SalesInvoiceCalculatedTotals(
            decimal.Round(subTotal, 2),
            decimal.Round(totalDiscount, 2),
            decimal.Round(taxAmount, 2),
            decimal.Round(grandTotal, 2),
            decimal.Round(paidAmount, 2),
            decimal.Round(dueAmount, 2),
            paymentStatus);
    }
}
