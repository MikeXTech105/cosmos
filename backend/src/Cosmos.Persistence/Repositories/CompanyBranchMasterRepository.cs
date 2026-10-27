using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Organization;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class CompanyBranchMasterRepository(ISqlConnectionFactory factory) : ICompanyBranchMasterRepository
{
    public async Task<IReadOnlyCollection<CompanyDto>> CompaniesAsync(string? search, bool activeOnly, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<CompanyDto>(connection, "sp_Company_GetList", new { Search = search, ActiveOnly = activeOnly }, ct);
    }

    public async Task<CompanyDto?> CompanyAsync(long id, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<CompanyDto>(connection, "sp_Company_GetById", new { Id = id }, ct);
    }

    public async Task<CompanyDto> SaveCompanyAsync(long? id, string code, string name, bool active, long? userId, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CompanyDto>(connection, "sp_Company_Save", new { Id = id, Code = code, Name = name, IsActive = active, UserId = userId }, ct);
    }

    public async Task<IReadOnlyCollection<BranchDto>> BranchesAsync(long? companyId, string? search, bool activeOnly, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<BranchDto>(connection, "sp_Branch_GetList", new { CompanyId = companyId, Search = search, ActiveOnly = activeOnly }, ct);
    }

    public async Task<BranchDto?> BranchAsync(long id, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<BranchDto>(connection, "sp_Branch_GetById", new { Id = id }, ct);
    }

    public async Task<BranchDto> SaveBranchAsync(long? id, long companyId, string code, string name, bool active, long? userId, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<BranchDto>(connection, "sp_Branch_Save", new { Id = id, CompanyId = companyId, Code = code, Name = name, IsActive = active, UserId = userId }, ct);
    }
}
