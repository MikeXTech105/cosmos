using System.Data;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Persistence;
using Dapper;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Tests.Manufacturing;

public sealed class ManufacturingDapperMaterializationTests
{
    public ManufacturingDapperMaterializationTests() => new ServiceCollection().AddPersistence();

    [Fact]
    public void Bom_response_rows_materialize_sql_dates_and_nullable_dates()
    {
        var detail = Materialize<ManufacturingBomDto>(
            ("Id", typeof(long), 1L), ("BomNumber", typeof(string), "MB-000001"),
            ("FinishedItemId", typeof(long), 4L), ("FinishedItemCode", typeof(string), "FG-001"),
            ("FinishedItemName", typeof(string), "Finished good"), ("Version", typeof(string), "1"),
            ("Status", typeof(int), 1), ("EffectiveFrom", typeof(DateTime), new DateTime(2026, 9, 23)),
            ("EffectiveTo", typeof(DateTime), null), ("Notes", typeof(string), null),
            ("IsDefault", typeof(bool), true), ("IsActive", typeof(bool), false));
        var list = Materialize<ManufacturingBomListItemDto>(
            ("Id", typeof(long), 1L), ("BomNumber", typeof(string), "MB-000001"),
            ("FinishedItemId", typeof(long), 4L), ("FinishedItemCode", typeof(string), "FG-001"),
            ("FinishedItemName", typeof(string), "Finished good"), ("Version", typeof(string), "1"),
            ("Status", typeof(int), 1), ("EffectiveFrom", typeof(DateTime), new DateTime(2026, 9, 23)),
            ("EffectiveTo", typeof(DateTime), DBNull.Value), ("IsDefault", typeof(bool), true),
            ("IsActive", typeof(bool), false), ("ComponentCount", typeof(int), 2), ("TotalCount", typeof(int), 1));

        Assert.Equal(new DateOnly(2026, 9, 23), detail.EffectiveFrom);
        Assert.Null(detail.EffectiveTo);
        Assert.Equal(new DateOnly(2026, 9, 23), list.EffectiveFrom);
        Assert.Null(list.EffectiveTo);
        Assert.Equal(2, list.ComponentCount);
    }

    [Fact]
    public void Production_response_rows_materialize_sql_dates()
    {
        var detail = Materialize<ManufacturingProductionDto>(
            ("Id", typeof(long), 1L), ("ProductionNumber", typeof(string), "MFG-000001"),
            ("ProductionDate", typeof(DateTime), new DateTime(2026, 9, 23)),
            ("FinishedItemId", typeof(long), 4L), ("FinishedItemCode", typeof(string), "FG-001"),
            ("FinishedItemName", typeof(string), "Finished good"), ("BomId", typeof(long), 1L),
            ("BomVersion", typeof(string), "1"), ("PlannedQuantity", typeof(decimal), 10m),
            ("ProducedQuantity", typeof(decimal), 10m), ("Status", typeof(int), 1),
            ("Notes", typeof(string), null), ("ReferenceNumber", typeof(string), null));
        var list = Materialize<ManufacturingProductionListItemDto>(
            ("Id", typeof(long), 1L), ("ProductionNumber", typeof(string), "MFG-000001"),
            ("ProductionDate", typeof(DateTime), new DateTime(2026, 9, 23)),
            ("FinishedItemId", typeof(long), 4L), ("FinishedItemCode", typeof(string), "FG-001"),
            ("FinishedItemName", typeof(string), "Finished good"), ("BomVersion", typeof(string), "1"),
            ("PlannedQuantity", typeof(decimal), 10m), ("ProducedQuantity", typeof(decimal), 10m),
            ("Status", typeof(int), 1), ("TotalCount", typeof(int), 1));

        Assert.Equal(new DateOnly(2026, 9, 23), detail.ProductionDate);
        Assert.Equal(new DateOnly(2026, 9, 23), list.ProductionDate);
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
