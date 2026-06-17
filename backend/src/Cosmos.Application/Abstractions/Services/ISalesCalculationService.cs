using Cosmos.Application.Sales;
using Cosmos.Contracts.Sales;

namespace Cosmos.Application.Abstractions.Services;

public interface ISalesCalculationService
{
    SalesInvoiceCalculatedTotals CalculateInvoiceTotals(IReadOnlyCollection<SalesInvoiceItemRequest> items, decimal invoiceDiscount, decimal paidAmount);
}
