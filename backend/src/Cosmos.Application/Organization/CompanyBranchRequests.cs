namespace Cosmos.Application.Organization;
public sealed record SaveCompanyRequest(string Code,string Name,bool IsActive=true);
public sealed record SaveBranchRequest(long CompanyId,string Code,string Name,bool IsActive=true);
