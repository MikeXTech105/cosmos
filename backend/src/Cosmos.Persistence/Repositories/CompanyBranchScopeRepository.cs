using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class CompanyBranchScopeRepository(ISqlConnectionFactory connectionFactory) : ICompanyBranchScopeRepository
{
    public async Task<bool> CanAccessAsync(int userId, long? companyId, long? branchId, CancellationToken cancellationToken)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("sp_CompanyBranchScope_CanAccess", new { UserId = userId, CompanyId = companyId, BranchId = branchId }, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<bool>(command);
    }
}
