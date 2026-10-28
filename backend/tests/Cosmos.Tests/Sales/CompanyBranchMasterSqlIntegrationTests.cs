using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.Sales;

/// <summary>Exercises the Company and Branch procedures against the guarded disposable SQL database.</summary>
[Collection("SalesSqlIntegration")]
public sealed class CompanyBranchMasterSqlIntegrationTests
{
    private const string Variable = "COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";
    private const string Prefix = "ITP42";

    [RequiresDisposableMasterDatabaseFact]
    [Trait("Category", "SqlIntegration")]
    public async Task Company_and_branch_procedures_enforce_master_rules_and_roll_back_rejected_writes()
    {
        var connectionString = RequiredConnectionString();
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        await CleanupAsync(connection);

        try
        {
            var repository = new CompanyBranchMasterRepository(new TestConnectionFactory(connectionString));
            var ownerId = await CreateSystemOwnerAsync(connection);
            var companyA = await repository.SaveCompanyAsync(null, Prefix + "A", "Integration Company A", true, ownerId, CancellationToken.None);
            var companyB = await repository.SaveCompanyAsync(null, Prefix + "B", "Integration Company B", true, ownerId, CancellationToken.None);
            Assert.Equal(1, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE TableName=N'Companies' AND RecordId=CONVERT(NVARCHAR(100),@id) AND ActionType=N'Create';", new { id = companyA.Id }));

            var updatedCompany = await repository.SaveCompanyAsync(companyA.Id, companyA.Code, "Integration Company A Updated", true, ownerId, CancellationToken.None);
            Assert.Equal("Integration Company A Updated", updatedCompany.Name);
            Assert.Equal(1, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE TableName=N'Companies' AND RecordId=CONVERT(NVARCHAR(100),@id) AND OldValues LIKE N'%Integration Company A%' AND NewValues LIKE N'%Updated%';", new { id = companyA.Id }));
            Assert.Contains(await repository.CompaniesAsync(Prefix, false, CancellationToken.None), item => item.Id == companyA.Id);
            await AssertConflictAsync(() => repository.SaveCompanyAsync(null, companyA.Code, "Duplicate", true, ownerId, CancellationToken.None));

            var branch = await repository.SaveBranchAsync(null, companyA.Id, Prefix + "BR", "Integration Branch", true, ownerId, CancellationToken.None);
            var updatedBranch = await repository.SaveBranchAsync(branch.Id, companyA.Id, branch.Code, "Integration Branch Updated", true, ownerId, CancellationToken.None);
            Assert.Equal("Integration Branch Updated", updatedBranch.Name);
            Assert.Equal(1, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE TableName=N'Branches' AND RecordId=CONVERT(NVARCHAR(100),@id) AND ActionType=N'Create';", new { id = branch.Id }));
            Assert.Contains(await repository.BranchesAsync(companyA.Id, Prefix, false, CancellationToken.None), item => item.Id == branch.Id);
            await AssertConflictAsync(() => repository.SaveCompanyAsync(companyA.Id, companyA.Code, companyA.Name, false, ownerId, CancellationToken.None));

            var delegatedUser = await connection.QuerySingleAsync<int>("INSERT dbo.Users(Username,Email,PasswordHash,FullName,IsActive,IsDeleted,IsSystemUser) OUTPUT INSERTED.Id VALUES(N'ITP42-delegated',N'ITP42-delegated@example.test',N'not-a-login',N'ITP42 delegated',1,0,0);");
            await connection.ExecuteAsync("INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) VALUES(@delegatedUser,@companyId,NULL);", new { delegatedUser, companyId = companyA.Id });
            await repository.SaveCompanyAsync(companyA.Id, companyA.Code, "Delegated update", true, delegatedUser, CancellationToken.None);
            await connection.ExecuteAsync("UPDATE dbo.UserCompanyBranchScopes SET IsActive=0 WHERE UserId=@delegatedUser AND CompanyId=@companyId;", new { delegatedUser, companyId = companyA.Id });
            await AssertNotFoundAsync(() => repository.SaveCompanyAsync(companyA.Id, companyA.Code, "Revoked update", true, delegatedUser, CancellationToken.None));

            await connection.ExecuteAsync("INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) VALUES(@delegatedUser,@companyId,@branchId);", new { delegatedUser, companyId = companyA.Id, branchId = branch.Id });
            await AssertNotFoundAsync(() => repository.SaveBranchAsync(null, companyA.Id, Prefix + "BLOCKED", "Blocked branch", true, delegatedUser, CancellationToken.None));
            var branchUpdate = await repository.SaveBranchAsync(branch.Id, companyA.Id, branch.Code, "Branch scoped update", true, delegatedUser, CancellationToken.None);
            Assert.Equal("Branch scoped update", branchUpdate.Name);
            await AssertConflictAsync(() => repository.SaveBranchAsync(branch.Id, companyA.Id, branch.Code, branchUpdate.Name, false, ownerId, CancellationToken.None));

            await AssertConflictAsync(() => repository.SaveBranchAsync(null, companyA.Id, branch.Code, "Duplicate", true, ownerId, CancellationToken.None));
            await AssertConflictAsync(() => repository.SaveBranchAsync(branch.Id, companyB.Id, branch.Code, branch.Name, true, ownerId, CancellationToken.None));
            await AssertConflictAsync(() => repository.SaveBranchAsync(null, long.MaxValue, Prefix + "FAIL", "Rejected Branch", true, ownerId, CancellationToken.None));

            Assert.Equal(1, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.Branches WHERE CompanyId = @companyId AND Code LIKE @prefix;", new { companyId = companyA.Id, prefix = Prefix + "%" }));
            Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.Branches WHERE Code = @code;", new { code = Prefix + "FAIL" }));

            await connection.ExecuteAsync("""
                CREATE OR ALTER TRIGGER dbo.trg_ITP42_ForceAuditFailure ON dbo.AuditLogs AFTER INSERT AS
                BEGIN
                    IF EXISTS(SELECT 1 FROM inserted WHERE EntityDisplayValue IN (N'ITP42-AUDIT-COMPANY',N'ITP42-AUDIT-BRANCH'))
                        THROW 51342,N'Intentional disposable-test audit failure.',1;
                END;
                """);
            await Assert.ThrowsAsync<SqlException>(() => repository.SaveCompanyAsync(null, Prefix + "-AUDIT-COMPANY", "Audit failure", true, ownerId, CancellationToken.None));
            await Assert.ThrowsAsync<SqlException>(() => repository.SaveBranchAsync(null, companyA.Id, Prefix + "-AUDIT-BRANCH", "Audit failure", true, ownerId, CancellationToken.None));
            Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.Companies WHERE Code=@code;", new { code = Prefix + "-AUDIT-COMPANY" }));
            Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.Branches WHERE Code=@code;", new { code = Prefix + "-AUDIT-BRANCH" }));
        }
        finally
        {
            await CleanupAsync(connection);
        }
    }

    private static async Task AssertConflictAsync(Func<Task> action)
    {
        var exception = await Assert.ThrowsAsync<CosmosException>(action);
        Assert.Equal(409, exception.StatusCode);
    }

    private static async Task AssertNotFoundAsync(Func<Task> action)
    {
        var exception = await Assert.ThrowsAsync<CosmosException>(action);
        Assert.Equal(404, exception.StatusCode);
    }

    private static Task CleanupAsync(SqlConnection connection) => connection.ExecuteAsync("""
        DROP TRIGGER IF EXISTS dbo.trg_ITP42_ForceAuditFailure;
        DELETE FROM dbo.UserCompanyBranchScopes WHERE UserId IN (SELECT Id FROM dbo.Users WHERE Username LIKE N'ITP42%');
        DELETE ur FROM dbo.UserRoles ur JOIN dbo.Users u ON u.Id = ur.UserId WHERE u.Username LIKE N'ITP42%';
        DELETE ur FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id = ur.RoleId WHERE r.Name = N'ITP42-SystemOwner';
        DELETE FROM dbo.Branches WHERE Code LIKE N'ITP42%';
        DELETE FROM dbo.Companies WHERE Code LIKE N'ITP42%';
        DELETE FROM dbo.Users WHERE Username LIKE N'ITP42%';
        DELETE FROM dbo.Roles WHERE Name = N'ITP42-SystemOwner';
        DELETE FROM dbo.AuditLogs WHERE EntityDisplayValue LIKE N'ITP42%';
        """);

    private static async Task<int> CreateSystemOwnerAsync(SqlConnection connection)
    {
        var ownerId = await connection.QuerySingleOrDefaultAsync<int?>("SELECT TOP (1) Id FROM dbo.Users WHERE IsSystemUser=1 AND IsActive=1 AND IsDeleted=0 ORDER BY Id;");
        if (ownerId is null)
            ownerId = await connection.QuerySingleAsync<int>("INSERT dbo.Users(Username,Email,PasswordHash,FullName,IsActive,IsDeleted,IsSystemUser) OUTPUT INSERTED.Id VALUES(N'ITP42-owner',N'ITP42-owner@example.test',N'not-a-login',N'ITP42 owner',1,0,1);");
        var roleId = await connection.QuerySingleAsync<int>("INSERT dbo.Roles(Name,Description,IsActive,IsSystemRole) OUTPUT INSERTED.Id VALUES(N'ITP42-SystemOwner',N'Integration protected owner',1,1);");
        await connection.ExecuteAsync("INSERT dbo.UserRoles(UserId,RoleId) VALUES(@ownerId,@roleId);", new { ownerId, roleId });
        return ownerId.Value;
    }

    private static string RequiredConnectionString() => Environment.GetEnvironmentVariable(Variable)
        ?? throw new InvalidOperationException($"Set {Variable}.");

    private sealed class TestConnectionFactory(string connectionString) : ISqlConnectionFactory
    {
        public async Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken)
        {
            var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            return connection;
        }
    }

    private sealed class RequiresDisposableMasterDatabaseFactAttribute : FactAttribute
    {
        public RequiresDisposableMasterDatabaseFactAttribute()
        {
            var value = Environment.GetEnvironmentVariable(Variable);
            if (string.IsNullOrWhiteSpace(value) || !new SqlConnectionStringBuilder(value).InitialCatalog.StartsWith("CosmosSalesGstIntegrationTests_", StringComparison.OrdinalIgnoreCase))
                Skip = "Requires the disposable Sales GST database.";
        }
    }
}
