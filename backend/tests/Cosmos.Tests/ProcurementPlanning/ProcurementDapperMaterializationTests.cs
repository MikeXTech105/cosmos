using System.Data;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Persistence;
using Dapper;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Tests.ProcurementPlanning;

public sealed class ProcurementDapperMaterializationTests
{
    public ProcurementDapperMaterializationTests() => new ServiceCollection().AddPersistence();

    [Fact]
    public void ChannelSkuMappingDto_materializes_single_row_without_total_count()
    {
        var result = Materialize<ChannelSkuMappingDto>(
            ("Id", typeof(long), 1L),
            ("SalesChannelId", typeof(long), 2L),
            ("ChannelCode", typeof(string), "AMZ"),
            ("ChannelName", typeof(string), "Amazon"),
            ("ChannelSku", typeof(string), "SKU-1"),
            ("ChannelProductName", typeof(string), "Product"),
            ("ItemId", typeof(long), 3L),
            ("ItemCode", typeof(string), "ITEM-1"),
            ("ItemName", typeof(string), "Item"),
            ("ProcurementClassification", typeof(int), 1),
            ("IsActive", typeof(bool), true),
            ("CreatedAt", typeof(DateTime), new DateTime(2026, 7, 17, 6, 0, 0, DateTimeKind.Utc)),
            ("CreatedBy", typeof(long), 4L),
            ("ModifiedAt", typeof(DateTime), null),
            ("ModifiedBy", typeof(long), null));

        Assert.Equal(1L, result.Id);
        Assert.Equal("SKU-1", result.ChannelSku);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public void SalesHistoryDto_materializes_single_row_without_total_count()
    {
        var result = Materialize<SalesHistoryDto>(
            ("Id", typeof(long), 1L),
            ("SalesDate", typeof(DateTime), new DateTime(2026, 7, 17)),
            ("SalesChannelId", typeof(long), 2L),
            ("ChannelCode", typeof(string), "AMZ"),
            ("ChannelSku", typeof(string), "SKU-1"),
            ("ChannelProductName", typeof(string), null),
            ("ItemId", typeof(long), null),
            ("ItemCode", typeof(string), null),
            ("ItemName", typeof(string), null),
            ("Quantity", typeof(decimal), 5m),
            ("ImportBatchId", typeof(long), null),
            ("IsManual", typeof(bool), true),
            ("Notes", typeof(string), null),
            ("CreatedAt", typeof(DateTime), new DateTime(2026, 7, 17, 6, 0, 0, DateTimeKind.Utc)),
            ("CreatedBy", typeof(long), null));

        Assert.Equal(1L, result.Id);
        Assert.Equal(new DateOnly(2026, 7, 17), result.SalesDate);
        Assert.Equal(0, result.TotalCount);
    }

    private static T Materialize<T>(params (string Name, Type Type, object? Value)[] columns)
    {
        using var table = new DataTable();
        foreach (var column in columns)
        {
            table.Columns.Add(column.Name, column.Type);
        }

        var row = table.NewRow();
        for (var index = 0; index < columns.Length; index++)
        {
            row[index] = columns[index].Value ?? DBNull.Value;
        }

        table.Rows.Add(row);
        using var reader = table.CreateDataReader();
        var parser = reader.GetRowParser<T>();
        Assert.True(reader.Read());
        return parser(reader);
    }
}
