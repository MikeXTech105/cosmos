namespace Cosmos.Application.Abstractions.Persistence;

/// <summary>Database-backed record-scope check. A false result deliberately reveals no scope details.</summary>
public interface ICompanyBranchScopeRepository
{
    Task<bool> CanAccessAsync(int userId, long? companyId, long? branchId, CancellationToken cancellationToken);
}
