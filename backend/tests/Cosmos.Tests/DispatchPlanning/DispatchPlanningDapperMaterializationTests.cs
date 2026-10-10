using System.Data;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Persistence;
using Dapper;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Tests.DispatchPlanning;

public sealed class DispatchPlanningDapperMaterializationTests
{
    public DispatchPlanningDapperMaterializationTests() => new ServiceCollection().AddPersistence();

    [Fact]
    public void DispatchPlanningRunSummaryDto_materializes_paged_stored_procedure_row()
    {
        var result = Materialize<DispatchPlanningRunSummaryDto>(
            ("Id", typeof(long), 1L), ("RunNumber", typeof(string), "DPR-20260728-000001"),
            ("ChannelId", typeof(long), 2L), ("ChannelCode", typeof(string), "AMZ"),
            ("PlanningDate", typeof(DateTime), new DateTime(2026, 7, 28)), ("Status", typeof(int), 2),
            ("CreatedAtUtc", typeof(DateTime), new DateTime(2026, 7, 28, 8, 0, 0, DateTimeKind.Utc)),
            ("CreatedBy", typeof(long), 3L), ("CalculatedAtUtc", typeof(DateTime), null),
            ("AllocatedAtUtc", typeof(DateTime), null), ("FinalizedAtUtc", typeof(DateTime), null),
            ("LineCount", typeof(int), 4), ("TotalRecommendedQuantity", typeof(decimal), 12m),
            ("TotalAllocatedQuantity", typeof(decimal), 8m), ("TotalCount", typeof(int), 1));

        Assert.Equal("DPR-20260728-000001", result.RunNumber);
        Assert.Equal(new DateOnly(2026, 7, 28), result.PlanningDate);
        Assert.Equal(1, result.TotalCount);
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
