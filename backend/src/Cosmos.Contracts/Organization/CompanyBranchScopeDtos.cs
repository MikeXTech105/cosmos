namespace Cosmos.Contracts.Organization;

public sealed record UserCompanyBranchScopeDto(long Id,int UserId,long CompanyId,long? BranchId,bool IsActive,DateTime CreatedAtUtc,DateTime? UpdatedAtUtc);
public sealed record EffectiveCompanyBranchScopeDto(long CompanyId,long? BranchId);
