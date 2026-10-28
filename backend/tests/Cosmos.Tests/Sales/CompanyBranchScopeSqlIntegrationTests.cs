using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Services;
using Cosmos.Contracts.Sales;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Dapper;
using Microsoft.Data.SqlClient;
using Moq;

namespace Cosmos.Tests.Sales;

/// <summary>Real SQL coverage for scope resolution. The database-name guard prevents retained-data use.</summary>
[Collection("SalesSqlIntegration")]
public sealed class CompanyBranchScopeSqlIntegrationTests
{
    private const string Variable = "COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";
    private const string Prefix = "ITP4SCOPE_";

    [RequiresDisposableScopeDatabaseFact]
    [Trait("Category", "SqlIntegration")]
    public async Task Company_branch_legacy_and_system_owner_scope_rules_are_enforced()
    {
        var value = RequiredConnectionString();
        await using var connection = new SqlConnection(value);
        await connection.OpenAsync();
        await CleanupAsync(connection);
        try
        {
            var fixture = await CreateFixtureAsync(connection);
            var scopes = new CompanyBranchScopeRepository(new TestConnectionFactory(value));

            Assert.True(await scopes.CanAccessAsync(fixture.CompanyUser, fixture.CompanyA, fixture.BranchA, CancellationToken.None));
            Assert.True(await scopes.CanAccessAsync(fixture.CompanyUser, fixture.CompanyA, null, CancellationToken.None));
            Assert.False(await scopes.CanAccessAsync(fixture.CompanyUser, fixture.CompanyB, fixture.BranchB, CancellationToken.None));
            Assert.True(await scopes.CanAccessAsync(fixture.BranchUser, fixture.CompanyA, fixture.BranchA, CancellationToken.None));
            Assert.False(await scopes.CanAccessAsync(fixture.BranchUser, fixture.CompanyA, null, CancellationToken.None));
            Assert.False(await scopes.CanAccessAsync(fixture.BranchUser, fixture.CompanyA, fixture.BranchOther, CancellationToken.None));
            Assert.False(await scopes.CanAccessAsync(fixture.UnassignedUser, fixture.CompanyA, fixture.BranchA, CancellationToken.None));
            Assert.False(await scopes.CanAccessAsync(fixture.CompanyUser, null, null, CancellationToken.None));
            Assert.True(await scopes.CanAccessAsync(fixture.SystemOwner, null, null, CancellationToken.None));

            var current = new Mock<ICurrentUser>();
            current.SetupGet(x => x.UserId).Returns(fixture.BranchUser);
            var authorizer = new SalesInvoiceScopeAuthorizer(scopes, current.Object);
            await authorizer.DemandReadAsync(new SalesInvoiceDto { CompanyId = fixture.CompanyA, BranchId = fixture.BranchA }, CancellationToken.None);
            await Assert.ThrowsAsync<NotFoundException>(() => authorizer.DemandReadAsync(new SalesInvoiceDto { CompanyId = fixture.CompanyA, BranchId = fixture.BranchOther }, CancellationToken.None));

            await Assert.ThrowsAnyAsync<SqlException>(() => connection.ExecuteAsync("INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) VALUES(@userId,@companyId,@branchId);", new { userId = fixture.BranchUser, companyId = fixture.CompanyB, branchId = fixture.BranchA }));
            await Assert.ThrowsAnyAsync<SqlException>(() => connection.ExecuteAsync("INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) VALUES(@userId,@companyId,@branchId);", new { userId = fixture.BranchUser, companyId = fixture.CompanyA, branchId = fixture.BranchA }));
        }
        finally { await CleanupAsync(connection); }
    }

    private static async Task<(int CompanyUser, int BranchUser, int UnassignedUser, int SystemOwner, long CompanyA, long CompanyB, long BranchA, long BranchOther, long BranchB)> CreateFixtureAsync(SqlConnection connection)
    {
        async Task<int> User(string suffix) => await connection.QuerySingleAsync<int>("INSERT dbo.Users(Username,Email,PasswordHash,FullName,IsActive,IsDeleted,IsSystemUser) OUTPUT INSERTED.Id VALUES(@u,@e,N'not-a-login',@u,1,0,0);", new { u = Prefix + suffix, e = Prefix + suffix + "@example.test" });
        var companyUser = await User("company"); var branchUser = await User("branch"); var unassigned = await User("none");
        var owner = await connection.QuerySingleOrDefaultAsync<int?>("SELECT TOP (1) Id FROM dbo.Users WHERE IsSystemUser=1 AND IsActive=1 AND IsDeleted=0 ORDER BY Id;");
        if (owner is null)
            owner = await connection.QuerySingleAsync<int>("INSERT dbo.Users(Username,Email,PasswordHash,FullName,IsActive,IsDeleted,IsSystemUser) OUTPUT INSERTED.Id VALUES(N'ITP4SCOPE-owner',N'ITP4SCOPE-owner@example.test',N'not-a-login',N'ITP4SCOPE owner',1,0,1);");
        var ownerRole = await connection.QuerySingleAsync<int>("INSERT dbo.Roles(Name,Description,IsActive,IsSystemRole) OUTPUT INSERTED.Id VALUES(N'ITP4SCOPE-SystemOwner',N'Integration protected owner',1,1);");
        await connection.ExecuteAsync("INSERT dbo.UserRoles(UserId,RoleId) VALUES(@owner,@ownerRole);", new { owner, ownerRole });
        var a = await connection.QuerySingleAsync<long>("INSERT dbo.Companies(Code,Name) VALUES(N'ITP4A',N'Integration Company A'); SELECT CONVERT(bigint,SCOPE_IDENTITY());");
        var b = await connection.QuerySingleAsync<long>("INSERT dbo.Companies(Code,Name) VALUES(N'ITP4B',N'Integration Company B'); SELECT CONVERT(bigint,SCOPE_IDENTITY());");
        var a1 = await connection.QuerySingleAsync<long>("INSERT dbo.Branches(CompanyId,Code,Name) VALUES(@a,N'A1',N'Integration A1'); SELECT CONVERT(bigint,SCOPE_IDENTITY());", new { a });
        var a2 = await connection.QuerySingleAsync<long>("INSERT dbo.Branches(CompanyId,Code,Name) VALUES(@a,N'A2',N'Integration A2'); SELECT CONVERT(bigint,SCOPE_IDENTITY());", new { a });
        var b1 = await connection.QuerySingleAsync<long>("INSERT dbo.Branches(CompanyId,Code,Name) VALUES(@b,N'B1',N'Integration B1'); SELECT CONVERT(bigint,SCOPE_IDENTITY());", new { b });
        await connection.ExecuteAsync("INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) VALUES(@companyUser,@a,NULL),(@branchUser,@a,@a1);", new { companyUser, branchUser, a, a1 });
        return (companyUser, branchUser, unassigned, owner.Value, a, b, a1, a2, b1);
    }

    private static Task CleanupAsync(SqlConnection connection) => connection.ExecuteAsync($"""
        DELETE FROM dbo.UserCompanyBranchScopes WHERE UserId IN (SELECT Id FROM dbo.Users WHERE Username LIKE N'{Prefix}%');
        DELETE ur FROM dbo.UserRoles ur JOIN dbo.Users u ON u.Id=ur.UserId WHERE u.Username LIKE N'{Prefix}%';
        DELETE ur FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE r.Name=N'ITP4SCOPE-SystemOwner';
        DELETE FROM dbo.Branches WHERE Code IN (N'A1',N'A2',N'B1') AND Name LIKE N'Integration %';
        DELETE FROM dbo.Companies WHERE Code IN (N'ITP4A',N'ITP4B');
        DELETE FROM dbo.Users WHERE Username LIKE N'{Prefix}%';
        DELETE FROM dbo.Roles WHERE Name=N'ITP4SCOPE-SystemOwner';
        """);

    private static string RequiredConnectionString() => Environment.GetEnvironmentVariable(Variable) ?? throw new InvalidOperationException($"Set {Variable}.");
    private sealed class TestConnectionFactory(string value) : ISqlConnectionFactory { public async Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken ct) { var c = new SqlConnection(value); await c.OpenAsync(ct); return c; } }
    private sealed class RequiresDisposableScopeDatabaseFactAttribute : FactAttribute { public RequiresDisposableScopeDatabaseFactAttribute() { var value = Environment.GetEnvironmentVariable(Variable); if (string.IsNullOrWhiteSpace(value) || !new SqlConnectionStringBuilder(value).InitialCatalog.StartsWith("CosmosSalesGstIntegrationTests_", StringComparison.OrdinalIgnoreCase)) Skip = "Requires the disposable Sales GST database."; } }
}
