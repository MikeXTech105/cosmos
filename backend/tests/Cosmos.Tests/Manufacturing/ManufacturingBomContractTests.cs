using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Manufacturing;

namespace Cosmos.Tests.Manufacturing;

public sealed class ManufacturingBomContractTests
{
    [Fact]
    public void List_item_exposes_effectivity_activity_and_actual_component_count()
    {
        var item = new ManufacturingBomListItemDto(
            6, "MB-000006", 12, "WOOD-310873", "Wooden Chair", "2",
            ManufacturingBomStatus.Active, new DateOnly(2026, 10, 6), new DateOnly(2026, 10, 31),
            true, true, 2, 2);

        Assert.True(item.IsDefault);
        Assert.True(item.IsActive);
        Assert.Equal(2, item.ComponentCount);
        Assert.Equal(new DateOnly(2026, 10, 31), item.EffectiveTo);
    }

    [Fact]
    public void Consolidation_migration_uses_one_applicable_manufacturing_bom_resolver()
    {
        var source = File.ReadAllText(MigrationPath());

        Assert.Contains("ufn_ManufacturingBom_Applicable", source, StringComparison.Ordinal);
        Assert.Contains("b.IsDefault DESC, b.EffectiveFrom DESC, b.Version DESC", source, StringComparison.Ordinal);
        Assert.Contains("sp_ManufacturingBom_GetApplicable", source, StringComparison.Ordinal);
        Assert.Contains("sp_ProcurementPlanning_CalculationInputs", source, StringComparison.Ordinal);
        Assert.DoesNotContain("JOIN dbo.ProductBomComponents b ON b.FinishedProductItemId=sales.ItemId", source, StringComparison.Ordinal);
    }

    [Fact]
    public void Consolidation_migration_distinguishes_missing_bom_from_empty_applicable_bom()
    {
        var source = File.ReadAllText(MigrationPath());

        Assert.Contains("MISSING_BOM", source, StringComparison.Ordinal);
        Assert.Contains("BOM_HAS_NO_COMPONENTS", source, StringComparison.Ordinal);
        Assert.Contains("Procurement BOM editing has moved to Manufacturing BOMs", source, StringComparison.Ordinal);
    }

    private static string MigrationPath()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Cosmos.slnx"))) directory = directory.Parent;
        return Path.Combine(directory!.FullName, "database", "migrations", "20261006_unify_procurement_with_manufacturing_boms.sql");
    }
}
