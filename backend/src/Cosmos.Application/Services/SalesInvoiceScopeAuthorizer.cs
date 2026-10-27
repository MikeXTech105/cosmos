using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Sales;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;

namespace Cosmos.Application.Services;

/// <summary>
/// Enforces an additional database-backed company/branch boundary after global RBAC.
/// Unscoped legacy invoices are intentionally visible only to the protected System Owner.
/// </summary>
public sealed class SalesInvoiceScopeAuthorizer(ICompanyBranchScopeRepository scopes, ICurrentUser currentUser) : ISalesInvoiceScopeAuthorizer
{
    public async Task DemandCreateOrUpdateAsync(long companyId, long? branchId, CancellationToken cancellationToken)
    {
        if (companyId <= 0 || currentUser.UserId is not { } userId || !await scopes.CanAccessAsync(userId, companyId, branchId, cancellationToken))
            throw new NotFoundException("Sales invoice was not found.");
    }

    public async Task DemandReadAsync(SalesInvoiceDto invoice, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId || !await scopes.CanAccessAsync(userId, invoice.CompanyId, invoice.BranchId, cancellationToken))
            throw new NotFoundException("Sales invoice was not found.");
    }
}
