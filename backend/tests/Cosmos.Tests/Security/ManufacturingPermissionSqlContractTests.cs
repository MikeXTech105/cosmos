namespace Cosmos.Tests.Security;

public sealed class ManufacturingPermissionSqlContractTests
{
    [Theory]
    [InlineData("database", "migrations", "20260921_manufacturing_module.sql")]
    [InlineData("database", "migrations", "20260922_manufacturing_permissions_fix.sql")]
    public void ManufacturingPermissionSeedUsesControllerPageNamesAndNamedSuperAdmin(params string[] path)
    {
        var sql = ReadBackendFile(path);

        Assert.Contains("Manufacturing.Boms", sql, StringComparison.Ordinal);
        Assert.Contains("Manufacturing.Productions", sql, StringComparison.Ordinal);
        Assert.Contains("r.Name = N'SuperAdmin'", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("Manufacturing.BOM", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("UserId = 1", sql, StringComparison.Ordinal);
        Assert.Contains("CanView", sql, StringComparison.Ordinal);
        Assert.Contains("CanCreate", sql, StringComparison.Ordinal);
        Assert.Contains("CanEdit", sql, StringComparison.Ordinal);
        Assert.Contains("CanDelete", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void VerificationScriptIsReadOnlyAndChecksRequiredPermissionMatrix()
    {
        var sql = ReadBackendFile("database", "verify_manufacturing_permissions.sql");

        Assert.Contains("MISSING PAGE", sql, StringComparison.Ordinal);
        Assert.Contains("MISSING ROLE PERMISSION", sql, StringComparison.Ordinal);
        Assert.Contains("MISSING ACTION", sql, StringComparison.Ordinal);
        Assert.Contains("IsProtectedSystemOwner", sql, StringComparison.Ordinal);
        Assert.Contains("sp_ManufacturingBom_GetList", sql, StringComparison.Ordinal);
        Assert.Contains("sp_ManufacturingProduction_Update", sql, StringComparison.Ordinal);
        Assert.DoesNotMatch("(?im)^\\s*(INSERT|UPDATE|DELETE|MERGE)\\b", sql);
    }

    [Fact]
    public void StoredProcedureRepairContainsEveryRepositoryProcedure()
    {
        var sql = ReadBackendFile("database", "migrations", "20260923_manufacturing_stored_procedures_fix.sql");

        foreach (var procedure in new[]
        {
            "sp_ManufacturingBom_GetById", "sp_ManufacturingBom_GetList", "sp_ManufacturingBom_Create",
            "sp_ManufacturingBom_Update", "sp_ManufacturingBom_Activate", "sp_ManufacturingBom_Deactivate",
            "sp_ManufacturingBom_Delete", "sp_ManufacturingProduction_GetById", "sp_ManufacturingProduction_GetList",
            "sp_ManufacturingProduction_Create", "sp_ManufacturingProduction_Update", "sp_ManufacturingProduction_Post",
            "sp_ManufacturingProduction_Cancel"
        })
        {
            Assert.Contains($"CREATE OR ALTER PROCEDURE dbo.{procedure}", sql, StringComparison.Ordinal);
        }
    }

    [Fact]
    public void CreateRepositoryCallsDoNotPassAnIdParameter()
    {
        var source = ReadBackendFile("src", "Cosmos.Persistence", "Repositories", "ManufacturingRepository.cs");

        Assert.Contains("CreateManufacturingBomRequest x?new {x.FinishedItemId", source, StringComparison.Ordinal);
        Assert.Contains("CreateManufacturingProductionRequest x?new {x.ProductionDate", source, StringComparison.Ordinal);
        Assert.DoesNotContain("CreateManufacturingBomRequest x?new {Id=id", source, StringComparison.Ordinal);
        Assert.DoesNotContain("CreateManufacturingProductionRequest x?new {Id=id", source, StringComparison.Ordinal);
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
