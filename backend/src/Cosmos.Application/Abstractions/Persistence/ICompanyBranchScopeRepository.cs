namespace Cosmos.Application.Abstractions.Persistence;

/// <summary>Database-backed record-scope check. A false result deliberately reveals no scope details.</summary>
public interface ICompanyBranchScopeRepository
{
    Task<bool> CanAccessAsync(int userId, long? companyId, long? branchId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Cosmos.Contracts.Organization.UserCompanyBranchScopeDto>> GetByUserAsync(int userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Cosmos.Contracts.Organization.EffectiveCompanyBranchScopeDto>> GetEffectiveAsync(int userId, CancellationToken cancellationToken);
    Task<Cosmos.Contracts.Organization.UserCompanyBranchScopeDto> GrantAsync(int actorUserId, int targetUserId, long companyId, long? branchId, CancellationToken cancellationToken);
    Task RevokeAsync(int actorUserId, long assignmentId, CancellationToken cancellationToken);
}
