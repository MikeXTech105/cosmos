namespace Cosmos.Tests.Database;

public sealed class RuntimeApiSqlContractTests
{
    [Fact]
    public void Party_list_migration_exposes_the_complete_sql_row_contract()
    {
        var migration = ReadBackendFile("database", "migrations", "20260720_backend_api_frontend_fixes.sql");

        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.sp_Party_GetList", migration, StringComparison.Ordinal);
        Assert.Contains("PartyType NVARCHAR(10) NOT NULL", migration, StringComparison.Ordinal);
        Assert.Contains("Id, PartyCode, PartyName, PartyType, MobileNo, Email, GSTTreatment, GSTIN", migration, StringComparison.Ordinal);
        Assert.Contains("CreatedOn, ModifiedOn, COUNT(1) OVER() AS TotalCount", migration, StringComparison.Ordinal);
    }

    [Fact]
    public void Purchase_bill_summary_accepts_only_business_filters()
    {
        var migration = ReadBackendFile("database", "migrations", "20260720_backend_api_frontend_fixes.sql");
        var start = migration.IndexOf("CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_GetListSummary", StringComparison.Ordinal);
        var end = migration.IndexOf("GO", start, StringComparison.Ordinal);
        var procedure = migration[start..end];

        Assert.Contains("@Search NVARCHAR(200) = NULL", procedure, StringComparison.Ordinal);
        Assert.Contains("@SupplierId UNIQUEIDENTIFIER = NULL", procedure, StringComparison.Ordinal);
        Assert.Contains("@Status INT = NULL", procedure, StringComparison.Ordinal);
        Assert.Contains("@FromDate DATE = NULL", procedure, StringComparison.Ordinal);
        Assert.Contains("@ToDate DATE = NULL", procedure, StringComparison.Ordinal);
        Assert.DoesNotContain("@PageNumber", procedure, StringComparison.Ordinal);
        Assert.DoesNotContain("@PageSize", procedure, StringComparison.Ordinal);
        Assert.DoesNotContain("@SortBy", procedure, StringComparison.Ordinal);
        Assert.DoesNotContain("@SortDirection", procedure, StringComparison.Ordinal);
    }

    [Fact]
    public void Employee_lifecycle_repair_keeps_status_and_active_flag_consistent()
    {
        var migration = ReadBackendFile("database", "migrations", "20260721_runtime_api_contract_fixes.sql");

        Assert.Contains("Status = 3, IsActive = 0", migration, StringComparison.Ordinal);
        Assert.Contains("Status = 1, IsActive = 1", migration, StringComparison.Ordinal);
        Assert.Contains("Resigned employees must be retained for lifecycle history.", migration, StringComparison.Ordinal);
        Assert.Contains("Reporting manager was not found or is inactive.", migration, StringComparison.Ordinal);
    }

    [Fact]
    public void Verification_script_fails_contract_drift_before_api_traffic()
    {
        var script = ReadBackendFile("database", "verify_runtime_api_contracts.sql");

        Assert.Contains("sp_PurchaseBill_GetListSummary parameter signature does not match the API contract.", script, StringComparison.Ordinal);
        Assert.Contains("sp_Party_GetList result contract does not match the API materialization contract.", script, StringComparison.Ordinal);
        Assert.Contains("sys.dm_exec_describe_first_result_set", script, StringComparison.Ordinal);
    }

    private static string ReadBackendFile(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine([directory.FullName, .. segments]);
            if (File.Exists(candidate)) return File.ReadAllText(candidate);
            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not locate backend file: {string.Join('/', segments)}");
    }
}
