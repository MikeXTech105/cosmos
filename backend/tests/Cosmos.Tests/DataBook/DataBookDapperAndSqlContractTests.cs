using System.Data;
using Cosmos.Contracts.DataBook;
using Dapper;

namespace Cosmos.Tests.DataBook;

public sealed class DataBookDapperAndSqlContractTests
{
    [Fact]
    public void List_contract_materializes_hidden_owner_id_for_service_level_privacy_enforcement()
    {
        var row = Materialize<DataBookEntryListItemDto>(
            ("Id", typeof(long), 9L), ("Name", typeof(string), "Dispatch Contact"), ("ValuePreview", typeof(string), "9876543210"),
            ("Description", typeof(string), DBNull.Value), ("Category", typeof(string), "Dispatch"), ("IsPrivate", typeof(bool), true),
            ("OwnerUserId", typeof(int), 2), ("OwnerUserName", typeof(string), "User A"), ("CreatedByName", typeof(string), "User A"),
            ("CreatedAtUtc", typeof(DateTime), new DateTime(2026, 8, 6, 0, 0, 0, DateTimeKind.Utc)), ("UpdatedByName", typeof(string), DBNull.Value),
            ("UpdatedAtUtc", typeof(DateTime), DBNull.Value), ("RowVersion", typeof(byte[]), new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }), ("TotalCount", typeof(int), 1));

        Assert.True(row.IsPrivate);
        Assert.Equal(2, row.OwnerUserId);
        Assert.Null(row.UpdatedAtUtc);
    }

    [Fact]
    public void Migration_contains_scoped_visibility_predicates_for_list_detail_history_and_export()
    {
        var script = ReadBackendFile("database", "migrations", "20260806_data_book_module.sql");

        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_GetList", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_GetById", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_GetHistory", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER PROCEDURE dbo.usp_DataBookEntry_Export", script, StringComparison.Ordinal);
        Assert.True(Count(script, "AND (e.IsPrivate=0 OR e.OwnerUserId=@CurrentUserId)") >= 4);
        Assert.Contains("IF @ExistingIsPrivate=1 AND @ExistingOwnerUserId<>@CurrentUserId", script, StringComparison.Ordinal);
        Assert.Contains("CREATE OR ALTER TRIGGER dbo.TR_DataBookEntryHistory_AppendOnly", script, StringComparison.Ordinal);
    }

    private static int Count(string value, string token)
    {
        var count = 0;
        for (var start = 0; (start = value.IndexOf(token, start, StringComparison.Ordinal)) >= 0; start += token.Length) count++;
        return count;
    }

    private static T Materialize<T>(params (string Name, Type Type, object Value)[] columns)
    {
        using var table = new DataTable();
        foreach (var column in columns) table.Columns.Add(column.Name, column.Type);
        var data = table.NewRow();
        for (var i = 0; i < columns.Length; i++) data[i] = columns[i].Value;
        table.Rows.Add(data);
        using var reader = table.CreateDataReader();
        var parser = reader.GetRowParser<T>();
        Assert.True(reader.Read());
        return parser(reader);
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
