namespace Cosmos.Tests.DispatchPlanning;

public sealed class DispatchPlanningSqlContractTests
{
    [Fact]
    public void Sku_snapshot_integrity_migration_preserves_warehouse_and_mapping_identity()
    {
        var migration = ReadBackendFile("database", "migrations", "20261008_dispatch_planning_sku_snapshot_integrity.sql");

        Assert.Contains("UNIQUE(PlanningRunId, ItemId, WarehouseId, ChannelItemMappingId)", migration, StringComparison.Ordinal);
        Assert.Contains("GROUP BY WarehouseId,ItemId,ChannelItemMappingId", migration, StringComparison.Ordinal);
        Assert.Contains("ib.ChannelItemMappingId=sa.ChannelItemMappingId", migration, StringComparison.Ordinal);
        Assert.Contains("GROUP BY ItemId,WarehouseId,ChannelItemMappingId", migration, StringComparison.Ordinal);
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
