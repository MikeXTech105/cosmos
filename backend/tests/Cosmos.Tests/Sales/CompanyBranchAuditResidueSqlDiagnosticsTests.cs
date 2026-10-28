using Dapper;
using Microsoft.Data.SqlClient;
using Xunit.Abstractions;

namespace Cosmos.Tests.Sales;

public sealed class CompanyBranchAuditResidueSqlDiagnosticsTests(ITestOutputHelper output)
{
    private const string Variable = "COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";
    private const string Database = "CosmosSalesGstIntegrationTests_Local";

    [Fact]
    public async Task Read_only_fixture_audit_residue_is_reported_from_the_guarded_test_catalog()
    {
        var value = Environment.GetEnvironmentVariable(Variable);
        Assert.False(string.IsNullOrWhiteSpace(value), $"Set {Variable}.");
        var builder = new SqlConnectionStringBuilder(value);
        Assert.Equal(Database, builder.InitialCatalog, ignoreCase: true);
        Assert.True(builder.Encrypt);
        Assert.False(builder.TrustServerCertificate);

        await using var connection = new SqlConnection(builder.ConnectionString);
        await connection.OpenAsync();
        Assert.Equal(Database, await connection.QuerySingleAsync<string>("SELECT DB_NAME()"), ignoreCase: true);
        var login = await connection.QuerySingleAsync<string>("SELECT ORIGINAL_LOGIN()");
        Assert.Equal("cosmos_gst_test", login, ignoreCase: true);

        var assignment = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityDisplayValue LIKE N'ITP43%'");
        var scopeCompanies = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityDisplayValue IN (N'ITP4A', N'ITP4B')");
        var scopeBranches = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityDisplayValue IN (N'A1', N'A2', N'B1') AND EntityType IN (N'Branches', N'Branch')");
        output.WriteLine($"DB={Database}; LOGIN={login}; ITP43_AUDIT_ROWS={assignment}; ITP4_COMPANY_AUDIT_ROWS={scopeCompanies}; ITP4_BRANCH_AUDIT_ROWS={scopeBranches}");
    }
}
