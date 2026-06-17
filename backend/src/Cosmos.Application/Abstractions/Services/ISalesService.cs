using Cosmos.Application.Sales;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Sales;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface ISalesService
{
    Task<ApiResponse<SalesInvoiceDetailDto>> GetByIdAsync(GetSalesInvoiceByIdQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<SalesInvoiceDto>>> GetListAsync(GetSalesInvoicesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<SalesInvoiceDetailDto>> CreateAsync(CreateSalesInvoiceCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<SalesInvoiceDetailDto>> UpdateAsync(long id, UpdateSalesInvoiceCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<SalesInvoiceDetailDto>> ConfirmAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<SalesInvoiceDetailDto>> CancelAsync(long id, CancellationToken cancellationToken);
    Task<ApiResponse<SalesPaymentDto>> AddPaymentAsync(long id, AddSalesPaymentCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<SalesPaymentDto>>> GetPaymentsAsync(GetSalesPaymentsQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<SalesSummaryReportDto>> GetSummaryReportAsync(GetSalesSummaryReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>> GetCustomerReceivablesAsync(GetCustomerReceivablesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<ItemWiseSalesReportDto>>> GetItemWiseSalesAsync(GetItemWiseSalesReportQuery query, CancellationToken cancellationToken);
}
