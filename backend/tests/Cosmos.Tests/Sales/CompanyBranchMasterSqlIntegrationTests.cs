using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.Sales;

/// <summary>Exercises the Company and Branch procedures against the guarded disposable SQL database.</summary>
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
            var companyA = await repository.SaveCompanyAsync(null, Prefix + "A", "Integration Company A", true, null, CancellationToken.None);
            var companyB = await repository.SaveCompanyAsync(null, Prefix + "B", "Integration Company B", true, null, CancellationToken.None);

            var updatedCompany = await repository.SaveCompanyAsync(companyA.Id, companyA.Code, "Integration Company A Updated", true, null, CancellationToken.None);
            Assert.Equal("Integration Company A Updated", updatedCompany.Name);
            Assert.Contains(await repository.CompaniesAsync(Prefix, false, CancellationToken.None), item => item.Id == companyA.Id);
            await AssertConflictAsync(() => repository.SaveCompanyAsync(null, companyA.Code, "Duplicate", true, null, CancellationToken.None));

            var branch = await repository.SaveBranchAsync(null, companyA.Id, Prefix + "BR", "Integration Branch", true, null, CancellationToken.None);
            var updatedBranch = await repository.SaveBranchAsync(branch.Id, companyA.Id, branch.Code, "Integration Branch Updated", true, null, CancellationToken.None);
            Assert.Equal("Integration Branch Updated", updatedBranch.Name);
            Assert.Contains(await repository.BranchesAsync(companyA.Id, Prefix, false, CancellationToken.None), item => item.Id == branch.Id);

            await AssertConflictAsync(() => repository.SaveBranchAsync(null, companyA.Id, branch.Code, "Duplicate", true, null, CancellationToken.None));
            await AssertConflictAsync(() => repository.SaveBranchAsync(branch.Id, companyB.Id, branch.Code, branch.Name, true, null, CancellationToken.None));
            await AssertConflictAsync(() => repository.SaveBranchAsync(null, long.MaxValue, Prefix + "FAIL", "Rejected Branch", true, null, CancellationToken.None));

            Assert.Equal(1, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.Branches WHERE CompanyId = @companyId AND Code LIKE @prefix;", new { companyId = companyA.Id, prefix = Prefix + "%" }));
            Assert.Equal(0, await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.Branches WHERE Code = @code;", new { code = Prefix + "FAIL" }));
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

    private static Task CleanupAsync(SqlConnection connection) => connection.ExecuteAsync("""
        DELETE FROM dbo.Branches WHERE Code LIKE N'ITP42%';
        DELETE FROM dbo.Companies WHERE Code LIKE N'ITP42%';
        """);

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
