using Cosmos.Contracts.Sales;

namespace Cosmos.Application.Abstractions.Services;

public interface ISalesInvoiceScopeAuthorizer
{
    Task DemandCreateOrUpdateAsync(long companyId, long? branchId, CancellationToken cancellationToken);
    Task DemandReadAsync(SalesInvoiceDto invoice, CancellationToken cancellationToken);
}
