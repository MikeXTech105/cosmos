using System.Data;
using Cosmos.Application.Validators;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Tests.Manufacturing;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.SqlServer.TransactSql.ScriptDom;

namespace Cosmos.Tests.ShipmentOperations;

public sealed class ShipmentPackingRecoveryTests
{
    [Fact]
    public void Packing_recovery_migration_parses_as_SQL_Server()
    {
        var path = Path.Combine(ProductionMigrationSyntaxTests.FindRoot(), "backend", "database", "migrations", "20261028_01_draft_packing_recovery.sql");
        new TSql160Parser(true).Parse(new StringReader(File.ReadAllText(path)), out var errors);
        Assert.True(errors.Count == 0, string.Join("; ", errors.Select(x => $"line {x.Line}: {x.Message}")));
    }

    [Fact]
    public void Removal_requires_a_reviewed_version_command_identity_and_reason()
    {
        var validator = new RemoveShipmentPackageRequestValidator();
        Assert.False(validator.Validate(new RemoveShipmentPackageRequest("", Guid.Empty, "")).IsValid);
        Assert.False(validator.Validate(new RemoveShipmentPackageRequest("v1", Guid.NewGuid(), "Wrong carton")).IsValid);
        Assert.True(validator.Validate(new RemoveShipmentPackageRequest("0x00000000000000A1", Guid.NewGuid(), "Wrong conversion; review and repack")).IsValid);
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Removal_reconciles_exact_allocations_once_retains_history_and_rejects_stale_or_dispatched_work()
    {
        var configured = Environment.GetEnvironmentVariable(ProductionSqlIntegrationTests.Variable)!;
        var target = new SqlConnectionStringBuilder(configured);
        Assert.StartsWith("CosmosProductionIntegrationTests_", target.InitialCatalog, StringComparison.OrdinalIgnoreCase);
        await using var db = new SqlConnection(configured);
        await db.OpenAsync();
        Assert.Equal(target.InitialCatalog, await db.QuerySingleAsync<string>("SELECT DB_NAME()"));
        var fixture = await db.QuerySingleAsync<(long Shipment, long Line, long Package, long Item)>("""
            SET XACT_ABORT ON;BEGIN TRAN;
            INSERT dbo.Units(Name,ShortName) VALUES(@Tag,N'PCS');DECLARE @Unit BIGINT=SCOPE_IDENTITY();
            INSERT dbo.Categories(Name) VALUES(@Tag);DECLARE @Category BIGINT=SCOPE_IDENTITY();
            INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,CurrentStock,OpeningStock) VALUES(@Tag,@Tag,@Category,@Unit,1,100,100);DECLARE @Item BIGINT=SCOPE_IDENTITY();
            INSERT dbo.SalesChannels(Code,Name) VALUES(LEFT(@Tag,20),@Tag);DECLARE @Channel BIGINT=SCOPE_IDENTITY();
            INSERT dbo.ChannelWarehouses(ChannelId,WarehouseCode,WarehouseName) VALUES(@Channel,N'WH',@Tag);DECLARE @Warehouse BIGINT=SCOPE_IDENTITY();
            INSERT dbo.Shipments(ShipmentNumber,ChannelId,WarehouseId,ChannelCodeSnapshot,WarehouseCodeSnapshot,WarehouseNameSnapshot,ShipmentDate,Status,TotalPlannedQuantity,TotalPackedQuantity,TotalPackages,TotalGrossWeight)
            VALUES(@Tag,@Channel,@Warehouse,N'TEST',N'WH',@Tag,'20261028',4,10.000001,6.000001,1,2);DECLARE @Shipment BIGINT=SCOPE_IDENTITY();
            INSERT dbo.ShipmentItems(ShipmentId,ItemId,PlannedQuantity,PackedQuantity,ItemCodeSnapshot,ItemNameSnapshot) VALUES(@Shipment,@Item,10.000001,6.000001,@Tag,@Tag);DECLARE @Line BIGINT=SCOPE_IDENTITY();
            INSERT dbo.ShipmentPackages(ShipmentId,PackageNumber,PackageType,GrossWeight) VALUES(@Shipment,N'BOX-1',N'Box',2);DECLARE @Package BIGINT=SCOPE_IDENTITY();
            INSERT dbo.ShipmentPackageItems(ShipmentPackageId,ShipmentItemId,Quantity) VALUES(@Package,@Line,6.000001);
            COMMIT;SELECT @Shipment,@Line,@Package,@Item;
            """, new { Tag = "pack-" + Guid.NewGuid().ToString("N") });
        var ids = new { fixture.Shipment, fixture.Line, fixture.Package, fixture.Item };
        var version = await db.QuerySingleAsync<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.Shipments WHERE Id=@Shipment", ids);
        var key = Guid.NewGuid();
        async Task<int> Remove(string expected, Guid command, string reason = "Wrong conversion") =>
            await db.QuerySingleAsync<int>("usp_ShipmentOperations_Package_Remove", new { ShipmentId = fixture.Shipment, PackageId = fixture.Package, Version = expected, CommandKey = command, Reason = reason, UserId = (long?)null }, commandType: CommandType.StoredProcedure);
        Assert.Equal(409, await Remove("0x0000000000000000", Guid.NewGuid()));
        Assert.Equal(1, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.ShipmentPackages WHERE Id=@Package AND IsDeleted=0", ids));
        // Force a late command failure after package/aggregate writes. The entire command must roll back.
        var trigger = "TR_PackingFixture_" + Guid.NewGuid().ToString("N");
        try
        {
            await db.ExecuteAsync($"CREATE TRIGGER dbo.[{trigger}] ON dbo.ShipmentTrackingEvents AFTER INSERT AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE ShipmentId={fixture.Shipment}) THROW 52991,N'Packing fixture rollback probe',1; END");
            await Assert.ThrowsAsync<SqlException>(() => Remove(version, key));
            Assert.Equal(1, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.ShipmentPackages WHERE Id=@Package AND IsDeleted=0", ids));
            Assert.Equal(6.000001m, await db.QuerySingleAsync<decimal>("SELECT TotalPackedQuantity FROM dbo.Shipments WHERE Id=@Shipment", ids));
            Assert.Equal(4, await db.QuerySingleAsync<int>("SELECT Status FROM dbo.Shipments WHERE Id=@Shipment", ids));
            Assert.Equal(0, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.ShipmentPackageRemovalCommands WHERE ShipmentId=@Shipment", ids));
        }
        finally { await db.ExecuteAsync($"DROP TRIGGER IF EXISTS dbo.[{trigger}]"); }
        // Two actual connections race the exact intent. Serialization must yield one mutation and two successful retries.
        async Task<int> RaceRemoval()
        {
            await using var concurrent = new SqlConnection(configured);
            await concurrent.OpenAsync();
            return await concurrent.QuerySingleAsync<int>("usp_ShipmentOperations_Package_Remove", new { ShipmentId = fixture.Shipment, PackageId = fixture.Package, Version = version, CommandKey = key, Reason = "Wrong conversion", UserId = (long?)null }, commandType: CommandType.StoredProcedure);
        }
        Assert.All(await Task.WhenAll(RaceRemoval(), RaceRemoval()), result => Assert.Equal(200, result));
        Assert.Equal(3, await db.QuerySingleAsync<int>("SELECT Status FROM dbo.Shipments WHERE Id=@Shipment", ids));
        Assert.Equal(200, await Remove(version, key));
        Assert.Equal(409, await Remove(version, key, "Different intent"));
        Assert.Equal(0m, await db.QuerySingleAsync<decimal>("SELECT PackedQuantity FROM dbo.ShipmentItems WHERE Id=@Line", ids));
        Assert.Equal(0m, await db.QuerySingleAsync<decimal>("SELECT TotalPackedQuantity+TotalGrossWeight+TotalPackages FROM dbo.Shipments WHERE Id=@Shipment", ids));
        Assert.Equal(6.000001m, await db.QuerySingleAsync<decimal>("SELECT Quantity FROM dbo.ShipmentPackageItems WHERE ShipmentPackageId=@Package", ids));
        Assert.Equal(1, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.ShipmentPackageRemovalCommands WHERE ShipmentId=@Shipment", ids));
        Assert.Equal(100m, await db.QuerySingleAsync<decimal>("SELECT CurrentStock FROM dbo.Items WHERE Id=@Item", ids));
        Assert.Equal(0, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.StockMovements WHERE ItemId=@Item", ids));
        // A persisted dispatch marker is authoritative even if a stale status still says packing.
        await db.ExecuteAsync("UPDATE dbo.Shipments SET DispatchedAtUtc=SYSUTCDATETIME() WHERE Id=@Shipment", ids);
        var dispatchedVersion = await db.QuerySingleAsync<string>("SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.Shipments WHERE Id=@Shipment", ids);
        Assert.Equal(409, await Remove(dispatchedVersion, Guid.NewGuid()));
    }
}


