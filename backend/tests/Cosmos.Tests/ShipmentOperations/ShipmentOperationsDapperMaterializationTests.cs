using System.Data;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.ShipmentOperations;
using Cosmos.Persistence;
using Dapper;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Tests.ShipmentOperations;

public sealed class ShipmentOperationsDapperMaterializationTests
{
    public ShipmentOperationsDapperMaterializationTests() => new ServiceCollection().AddPersistence();

    [Fact]
    public void ShipmentSummary_materializes_namedEnumAndDateColumns()
    {
        var result = Materialize<ShipmentSummaryDto>(
            ("Id", typeof(long), 1L), ("ShipmentNumber", typeof(string), "SHP-000001"), ("SourceType", typeof(int), 2),
            ("ChannelId", typeof(long), 2L), ("ChannelCode", typeof(string), "AMZ"), ("WarehouseId", typeof(long), 3L),
            ("WarehouseCode", typeof(string), "BLR-01"), ("WarehouseName", typeof(string), "Bengaluru"),
            ("ShipmentDate", typeof(DateTime), new DateTime(2026, 7, 29)), ("Status", typeof(int), 6), ("Priority", typeof(int), 2),
            ("InvoiceNumber", typeof(string), "INV-1"), ("StoNumber", typeof(string), "STO-1"), ("TransporterName", typeof(string), "Carrier"),
            ("TotalPlannedQuantity", typeof(decimal), 12m), ("TotalPackedQuantity", typeof(decimal), 12m), ("TotalDispatchedQuantity", typeof(decimal), 12m),
            ("TotalReceivedQuantity", typeof(decimal), 0m), ("TotalReturnedQuantity", typeof(decimal), 0m), ("TotalPackages", typeof(int), 1),
            ("CreatedAtUtc", typeof(DateTime), new DateTime(2026, 7, 29, 8, 0, 0, DateTimeKind.Utc)), ("TotalCount", typeof(int), 1));

        Assert.Equal(ShipmentSourceType.DispatchPlanning, result.SourceType);
        Assert.Equal(ShipmentStatus.Dispatched, result.Status);
        Assert.Equal(new DateOnly(2026, 7, 29), result.ShipmentDate);
    }

    private static T Materialize<T>(params (string Name, Type Type, object? Value)[] columns)
    {
        using var table = new DataTable();
        foreach (var column in columns) table.Columns.Add(column.Name, column.Type);
        var row = table.NewRow();
        for (var index = 0; index < columns.Length; index++) row[index] = columns[index].Value ?? DBNull.Value;
        table.Rows.Add(row);
        using var reader = table.CreateDataReader();
        var parser = reader.GetRowParser<T>();
        Assert.True(reader.Read());
        return parser(reader);
    }
}
