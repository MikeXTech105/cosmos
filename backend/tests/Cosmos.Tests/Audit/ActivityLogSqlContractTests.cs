namespace Cosmos.Tests.Audit;

public sealed class ActivityLogSqlContractTests
{
    [Fact]
    public void Migration_extends_the_existing_audit_table_and_exposes_safe_query_contracts()
    {
        var script = ReadBackendFile("database", "migrations", "20260810_activity_logs_module.sql");

        Assert.Contains("ALTER TABLE dbo.AuditLogs ADD Module", script, StringComparison.Ordinal);
        Assert.DoesNotContain("CREATE TABLE dbo.ActivityLogs", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER VIEW dbo.vw_ActivityLogs", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_ActivityLog_GetList", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_ActivityLog_GetById", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_ActivityLog_Export", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_Dashboard_GetRecentActivity", script, StringComparison.Ordinal);
        Assert.Contains("v.TableName <> N'HttpRequests'", script, StringComparison.Ordinal);
        Assert.Contains("@SortBy IN", script, StringComparison.Ordinal);
        Assert.DoesNotContain("EXEC(@", script, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Migration_adds_a_view_and_export_only_page_for_super_admin()
    {
        var script = ReadBackendFile("database", "migrations", "20260810_activity_logs_module.sql");

        Assert.Contains("N'ActivityLogs', N'Activity Logs', N'/activity-logs'", script, StringComparison.Ordinal);
        Assert.Contains("CanView = 1, CanCreate = 0, CanEdit = 0, CanDelete = 0, CanExport = 1, CanApprove = 0", script, StringComparison.Ordinal);
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
