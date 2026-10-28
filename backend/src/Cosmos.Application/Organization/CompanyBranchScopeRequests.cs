namespace Cosmos.Application.Organization;

public sealed record GrantCompanyBranchScopeRequest(int UserId,long CompanyId,long? BranchId);
