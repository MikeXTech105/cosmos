using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Organization;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
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

    public async Task<IReadOnlyCollection<UserCompanyBranchScopeDto>> GetByUserAsync(int userId, CancellationToken cancellationToken)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<UserCompanyBranchScopeDto>(connection,"sp_UserCompanyBranchScope_GetByUser",new { UserId=userId },cancellationToken);
    }
    public async Task<IReadOnlyCollection<EffectiveCompanyBranchScopeDto>> GetEffectiveAsync(int userId, CancellationToken cancellationToken)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<EffectiveCompanyBranchScopeDto>(connection,"sp_UserCompanyBranchScope_GetEffective",new { UserId=userId },cancellationToken);
    }
    public async Task<UserCompanyBranchScopeDto> GrantAsync(int actorUserId,int targetUserId,long companyId,long? branchId,CancellationToken cancellationToken)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<UserCompanyBranchScopeDto>(connection,"sp_UserCompanyBranchScope_Grant",new { ActorUserId=actorUserId,TargetUserId=targetUserId,CompanyId=companyId,BranchId=branchId },cancellationToken);
    }
    public async Task RevokeAsync(int actorUserId,long assignmentId,CancellationToken cancellationToken)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var status=await StoredProcedureExecutor.ExecuteStatusAsync(connection,"sp_UserCompanyBranchScope_Revoke",new { ActorUserId=actorUserId,AssignmentId=assignmentId },cancellationToken);
        if(!status.Succeeded) throw new Cosmos.Shared.Exceptions.CosmosException(status.Message,status.StatusCode);
    }
}
