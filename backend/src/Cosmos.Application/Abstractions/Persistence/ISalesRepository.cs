using Cosmos.Application.Sales;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Sales;

namespace Cosmos.Application.Abstractions.Persistence;

public interface ISalesRepository
{
    Task<bool> CustomerExistsAsync(Guid customerPartyId, CancellationToken cancellationToken);
    Task<bool> ItemExistsAsync(long itemId, CancellationToken cancellationToken);
    Task<SalesInvoiceDetailDto?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<SalesInvoiceDto>> GetListAsync(GetSalesInvoicesQuery query, CancellationToken cancellationToken);
    Task<SalesInvoiceDetailDto> CreateAsync(CreateSalesInvoiceCommand command, long? userId, CancellationToken cancellationToken);
    Task<SalesInvoiceDetailDto> UpdateAsync(long id, UpdateSalesInvoiceCommand command, long? userId, CancellationToken cancellationToken);
    Task<SalesInvoiceDetailDto> ConfirmAsync(long id, long? userId, CancellationToken cancellationToken);
    Task<SalesInvoiceDetailDto> CancelAsync(long id, long? userId, CancellationToken cancellationToken);
    Task<SalesPaymentDto> AddPaymentAsync(long id, AddSalesPaymentCommand command, long? userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SalesPaymentDto>> GetPaymentsAsync(long salesInvoiceId, CancellationToken cancellationToken);
    Task<SalesSummaryReportDto> GetSummaryReportAsync(GetSalesSummaryReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CustomerReceivableReportDto>> GetCustomerReceivablesAsync(GetCustomerReceivablesQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ItemWiseSalesReportDto>> GetItemWiseSalesAsync(GetItemWiseSalesReportQuery query, CancellationToken cancellationToken);
}
