namespace Cosmos.Contracts.Organization;

public sealed record CompanyDto(long Id,string Code,string Name,bool IsActive);
public sealed record BranchDto(long Id,long CompanyId,string Code,string Name,bool IsActive);
