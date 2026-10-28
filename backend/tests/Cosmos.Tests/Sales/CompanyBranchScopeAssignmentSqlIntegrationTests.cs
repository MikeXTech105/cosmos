using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.Sales;

[Collection("SalesSqlIntegration")]
public sealed class CompanyBranchScopeAssignmentSqlIntegrationTests
{
    private const string Variable="COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";
    private const string Prefix="ITP43";

    [RequiresDisposableFact]
    [Trait("Category","SqlIntegration")]
    public async Task Assignment_grant_revoke_authorization_audit_and_failure_rollback_are_enforced()
    {
        var value=Required(); await using var connection=new SqlConnection(value); await connection.OpenAsync(); await Cleanup(connection);
        try
        {
            var owner=await Owner(connection);
            var target=await User(connection,"target",true); var delegatedTarget=await User(connection,"delegated-target",true); var inactive=await User(connection,"inactive",false); var delegated=await User(connection,"delegated",true); var branchOnly=await User(connection,"branch",true);
            var companyA=await Id(connection,"INSERT dbo.Companies(Code,Name) VALUES(N'ITP43A',N'ITP43 A');");
            var companyB=await Id(connection,"INSERT dbo.Companies(Code,Name) VALUES(N'ITP43B',N'ITP43 B');");
            var branchA=await Id(connection,"INSERT dbo.Branches(CompanyId,Code,Name) VALUES(@company,N'ITP43BR',N'ITP43 Branch');",new { company=companyA });
            await connection.ExecuteAsync("INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) VALUES(@user,@company,NULL),(@branchUser,@company,@branch);",new { user=delegated,company=companyA,branchUser=branchOnly,branch=branchA });
            var repo=new CompanyBranchScopeRepository(new Factory(value));

            var companyGrant=await repo.GrantAsync(owner,target,companyA,null,CancellationToken.None);
            var branchGrant=await repo.GrantAsync(owner,target,companyA,branchA,CancellationToken.None);
            Assert.Equal(2,(await repo.GetByUserAsync(target,CancellationToken.None)).Count);
            Assert.True(await repo.CanAccessAsync(target,companyA,branchA,CancellationToken.None));
            Assert.Equal(1,await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityType=N'UserCompanyBranchScope' AND RecordId=CONVERT(NVARCHAR(100),@id);",new { id=companyGrant.Id }));

            await repo.GrantAsync(delegated,delegatedTarget,companyA,null,CancellationToken.None);
            await Conflict(() => repo.GrantAsync(delegated,delegatedTarget,companyB,null,CancellationToken.None),404);
            await Conflict(() => repo.GrantAsync(branchOnly,delegatedTarget,companyA,null,CancellationToken.None),404);
            await Conflict(() => repo.GrantAsync(delegated,delegated,companyA,null,CancellationToken.None),403);
            await Conflict(() => repo.GrantAsync(owner,inactive,companyA,null,CancellationToken.None),404);
            await Conflict(() => repo.GrantAsync(owner,target,companyB,branchA,CancellationToken.None),409);
            await Conflict(() => repo.GrantAsync(owner,target,companyA,null,CancellationToken.None),409);

            await repo.RevokeAsync(owner,companyGrant.Id,CancellationToken.None);
            Assert.False(await repo.CanAccessAsync(target,companyA,null,CancellationToken.None));
            await Conflict(() => repo.RevokeAsync(owner,companyGrant.Id,CancellationToken.None),404);

            await connection.ExecuteAsync("CREATE OR ALTER TRIGGER dbo.trg_ITP43_ForceAuditFailure ON dbo.AuditLogs AFTER INSERT AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE EntityType=N'UserCompanyBranchScope') THROW 51343,N'Intentional assignment audit failure.',1; END;");
            await Assert.ThrowsAsync<SqlException>(()=>repo.GrantAsync(owner,target,companyB,null,CancellationToken.None));
            Assert.Equal(0,await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.UserCompanyBranchScopes WHERE UserId=@target AND CompanyId=@company AND IsActive=1;",new { target,company=companyB }));
        }
        finally { await Cleanup(connection); }
    }

    [RequiresDisposableFact]
    [Trait("Category","SqlIntegration")]
    public async Task Concurrent_grant_and_revoke_operations_preserve_one_active_scope_and_atomic_audit()
    {
        var value=Required(); await using var connection=new SqlConnection(value); await connection.OpenAsync(); await Cleanup(connection);
        try
        {
            var owner=await Owner(connection);
            var company=await Id(connection,"INSERT dbo.Companies(Code,Name) VALUES(N'ITP43C',N'ITP43 Concurrent');");
            var branch=await Id(connection,"INSERT dbo.Branches(CompanyId,Code,Name) VALUES(@company,N'ITP43CB',N'ITP43 Concurrent Branch');",new { company });
            var companyTarget=await User(connection,"concurrent-company",true);
            var branchTarget=await User(connection,"concurrent-branch",true);
            var mixedTarget=await User(connection,"concurrent-mixed",true);

            var companyResults=await Concurrent(
                () => new CompanyBranchScopeRepository(new Factory(value)).GrantAsync(owner,companyTarget,company,null,CancellationToken.None),
                () => new CompanyBranchScopeRepository(new Factory(value)).GrantAsync(owner,companyTarget,company,null,CancellationToken.None));
            Assert.Equal(1,companyResults.Count(result=>result is null));
            Assert.Single(companyResults.OfType<CosmosException>());
            Assert.Equal(409,companyResults.OfType<CosmosException>().Single().StatusCode);
            Assert.Equal(1,await ActiveCount(connection,companyTarget,company,null));

            var branchResults=await Concurrent(
                () => new CompanyBranchScopeRepository(new Factory(value)).GrantAsync(owner,branchTarget,company,branch,CancellationToken.None),
                () => new CompanyBranchScopeRepository(new Factory(value)).GrantAsync(owner,branchTarget,company,branch,CancellationToken.None));
            Assert.Equal(1,branchResults.Count(result=>result is null));
            Assert.Single(branchResults.OfType<CosmosException>());
            Assert.Equal(409,branchResults.OfType<CosmosException>().Single().StatusCode);
            Assert.Equal(1,await ActiveCount(connection,branchTarget,company,branch));

            var repo=new CompanyBranchScopeRepository(new Factory(value));
            var original=await repo.GrantAsync(owner,mixedTarget,company,null,CancellationToken.None);
            var grantAndRevoke=await Concurrent(
                () => new CompanyBranchScopeRepository(new Factory(value)).GrantAsync(owner,mixedTarget,company,null,CancellationToken.None),
                async () => { await new CompanyBranchScopeRepository(new Factory(value)).RevokeAsync(owner,original.Id,CancellationToken.None); });
            Assert.Contains(grantAndRevoke,result=>result is null);
            Assert.True(grantAndRevoke.Where(result=>result is not null).All(result=>result is CosmosException { StatusCode:409 }));
            Assert.InRange(await ActiveCount(connection,mixedTarget,company,null),0,1);

            var auditCount=await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityType=N'UserCompanyBranchScope' AND EntityDisplayValue LIKE @target;",new { target=$"{companyTarget}:%" });
            Assert.Equal(1,auditCount);
        }
        finally { await Cleanup(connection); }
    }

    private static async Task Conflict(Func<Task> action,int status){var e=await Assert.ThrowsAsync<CosmosException>(action);Assert.Equal(status,e.StatusCode);}
    private static async Task<Exception?[]> Concurrent(Func<Task> first,Func<Task> second)
    {
        var ready=new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        async Task<Exception?> Run(Func<Task> action){await ready.Task;try{await action();return null;}catch(Exception exception){return exception;}}
        var attempts=new[]{Task.Run(()=>Run(first)),Task.Run(()=>Run(second))};
        ready.SetResult();
        return await Task.WhenAll(attempts);
    }
    private static Task<int> ActiveCount(SqlConnection connection,int user,long company,long? branch)=>connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.UserCompanyBranchScopes WHERE UserId=@user AND CompanyId=@company AND ((@branch IS NULL AND BranchId IS NULL) OR BranchId=@branch) AND IsActive=1;",new { user,company,branch });
    private static async Task<int> User(SqlConnection c,string suffix,bool active)=>await c.QuerySingleAsync<int>("INSERT dbo.Users(Username,Email,PasswordHash,FullName,IsActive,IsDeleted,IsSystemUser) OUTPUT INSERTED.Id VALUES(@u,@e,N'x',@u,@active,0,0);",new { u=Prefix+suffix,e=Prefix+suffix+"@test",active });
    private static async Task<long> Id(SqlConnection c,string sql,object? p=null)=>await c.QuerySingleAsync<long>(sql+" SELECT CONVERT(bigint,SCOPE_IDENTITY());",p);
    private static async Task<int> Owner(SqlConnection c){var id=await c.QuerySingleOrDefaultAsync<int?>("SELECT TOP 1 Id FROM dbo.Users WHERE IsSystemUser=1 AND IsActive=1 AND IsDeleted=0;");if(id is null) id=await c.QuerySingleAsync<int>("INSERT dbo.Users(Username,Email,PasswordHash,FullName,IsActive,IsDeleted,IsSystemUser) OUTPUT INSERTED.Id VALUES(N'ITP43owner',N'ITP43owner@test',N'x',N'owner',1,0,1);");var role=await c.QuerySingleOrDefaultAsync<int?>("SELECT TOP 1 Id FROM dbo.Roles WHERE IsSystemRole=1;");if(role is null)role=await c.QuerySingleAsync<int>("INSERT dbo.Roles(Name,Description,IsActive,IsSystemRole) OUTPUT INSERTED.Id VALUES(N'ITP43Role',N'x',1,1);");if(await c.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.UserRoles WHERE UserId=@id AND RoleId=@role;",new{id,role})==0)await c.ExecuteAsync("INSERT dbo.UserRoles(UserId,RoleId) VALUES(@id,@role);",new{id,role});return id.Value;}
    private static Task Cleanup(SqlConnection c)=>c.ExecuteAsync("""DROP TRIGGER IF EXISTS dbo.trg_ITP43_ForceAuditFailure; DELETE FROM dbo.UserCompanyBranchScopes WHERE UserId IN(SELECT Id FROM dbo.Users WHERE Username LIKE N'ITP43%'); DELETE ur FROM dbo.UserRoles ur JOIN dbo.Users u ON u.Id=ur.UserId WHERE u.Username LIKE N'ITP43%'; DELETE ur FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE r.Name=N'ITP43Role'; DELETE FROM dbo.Branches WHERE Code LIKE N'ITP43%'; DELETE FROM dbo.Companies WHERE Code LIKE N'ITP43%'; DELETE FROM dbo.Users WHERE Username LIKE N'ITP43%'; DELETE FROM dbo.Roles WHERE Name=N'ITP43Role';""");
    private static string Required()=>Environment.GetEnvironmentVariable(Variable)??throw new InvalidOperationException("Missing test connection.");
    private sealed class Factory(string v):ISqlConnectionFactory { public async Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken ct){var c=new SqlConnection(v);await c.OpenAsync(ct);return c;} }
    private sealed class RequiresDisposableFactAttribute:FactAttribute { public RequiresDisposableFactAttribute(){var v=Environment.GetEnvironmentVariable(Variable);if(string.IsNullOrWhiteSpace(v)||!new SqlConnectionStringBuilder(v).InitialCatalog.StartsWith("CosmosSalesGstIntegrationTests_",StringComparison.OrdinalIgnoreCase))Skip="Requires disposable database.";} }
}
