namespace Cosmos.Tests.Security;

public sealed class SystemOwnerSqlContractTests
{
    private readonly string _migration = ReadBackendFile("database", "migrations", "20260716_system_owner.sql");

    [Fact]
    public void MigrationEnforcesSingleOwnerAndConcurrentProvisioning()
    {
        Assert.Contains("UX_Users_OneSystemUser", _migration, StringComparison.Ordinal);
        Assert.Contains("WHERE IsSystemUser = 1", _migration, StringComparison.Ordinal);
        Assert.Contains("UX_Roles_OneSystemRole", _migration, StringComparison.Ordinal);
        Assert.Contains("WHERE IsSystemRole = 1", _migration, StringComparison.Ordinal);
        Assert.Contains("sys.sp_getapplock", _migration, StringComparison.Ordinal);
        Assert.Contains("UPDLOCK, HOLDLOCK", _migration, StringComparison.Ordinal);
        Assert.Contains("InvalidProtectedRoleLinkCount", _migration, StringComparison.Ordinal);
    }

    [Fact]
    public void OwnerPagePermissionsAreDynamicAndGrantEverySupportedFlag()
    {
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.sp_User_GetPagePermissions", _migration, StringComparison.Ordinal);
        Assert.Contains("FROM dbo.Pages p", _migration, StringComparison.Ordinal);
        Assert.Contains("WHERE p.IsActive = 1", _migration, StringComparison.Ordinal);
        Assert.Contains("CAST(1 AS BIT) AS CanView", _migration, StringComparison.Ordinal);
        Assert.Contains("CAST(1 AS BIT) AS CanCreate", _migration, StringComparison.Ordinal);
        Assert.Contains("CAST(1 AS BIT) AS CanEdit", _migration, StringComparison.Ordinal);
        Assert.Contains("CAST(1 AS BIT) AS CanDelete", _migration, StringComparison.Ordinal);
        Assert.Contains("CAST(1 AS BIT) AS CanExport", _migration, StringComparison.Ordinal);
        Assert.Contains("CAST(1 AS BIT) AS CanApprove", _migration, StringComparison.Ordinal);
    }

    [Fact]
    public void SqlHidesAndProtectsSystemRecords()
    {
        Assert.Contains("WHERE IsDeleted = 0 AND IsSystemUser = 0", _migration, StringComparison.Ordinal);
        Assert.Contains("WHERE Id = @Id AND IsSystemRole = 0", _migration, StringComparison.Ordinal);
        Assert.Contains("THROW 51040, 'User was not found.'", _migration, StringComparison.Ordinal);
        Assert.Contains("THROW 51041, 'Role was not found.'", _migration, StringComparison.Ordinal);
        Assert.Contains("THROW 51042, 'One or more roles were not found.'", _migration, StringComparison.Ordinal);
        Assert.Contains("AND u.IsSystemUser = 0", _migration, StringComparison.Ordinal);
    }

    [Fact]
    public void ProvisioningDoesNotSeedRolePermissionsOrEmbedASecret()
    {
        var provisionStart = _migration.IndexOf("CREATE OR ALTER PROCEDURE dbo.sp_SystemOwner_Provision", StringComparison.Ordinal);
        var loginStart = _migration.IndexOf("CREATE OR ALTER PROCEDURE dbo.sp_Auth_Login", StringComparison.Ordinal);
        var provisioningProcedure = _migration[provisionStart..loginStart];

        Assert.DoesNotContain("INSERT INTO dbo.RolePermissions", provisioningProcedure, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("$2a$", _migration, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("$2b$", _migration, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("$2y$", _migration, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CanonicalSetupContainsSameFinalSecurityOverrides()
    {
        var setup = ReadBackendFile("database", "001_Full_Database_Setup.sql");

        Assert.Contains("Protected System Owner final security overrides", setup, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.sp_SystemOwner_Provision", setup, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.sp_User_IsSystemOwner", setup, StringComparison.Ordinal);
        Assert.Contains("UX_Users_OneSystemUser", setup, StringComparison.Ordinal);
        Assert.Contains("UX_Roles_OneSystemRole", setup, StringComparison.Ordinal);
    }

    private static string ReadBackendFile(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine([directory.FullName, .. segments]);
            if (File.Exists(candidate))
            {
                return File.ReadAllText(candidate);
            }

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not locate backend file: {string.Join('/', segments)}");
    }
}
