using System.Data;
using Cosmos.Persistence.Repositories;
using Dapper;

namespace Cosmos.Tests.Parties;

public sealed class PartyListMaterializationTests
{
    [Fact]
    public void Party_list_sql_contract_materializes_and_preserves_party_type()
    {
        var row = Materialize<PartyRepository.PartyListItemRow>(
            ("Id", typeof(Guid), Guid.Parse("0e3a3e13-9d17-4dd7-bf9e-a955c3bdd156")),
            ("PartyCode", typeof(string), "SUP-001"),
            ("PartyName", typeof(string), "Northwind Supplies"),
            ("PartyType", typeof(string), "Supplier"),
            ("MobileNo", typeof(string), null),
            ("Email", typeof(string), "sales@example.com"),
            ("GSTTreatment", typeof(int), 2),
            ("GSTIN", typeof(string), null),
            ("OpeningBalance", typeof(decimal), 125m),
            ("OpeningBalanceType", typeof(int), 1),
            ("CreditLimit", typeof(decimal), 1000m),
            ("CreditPeriodDays", typeof(int), 30),
            ("IsActive", typeof(bool), true),
            ("CreatedOn", typeof(DateTime), new DateTime(2026, 7, 21, 6, 0, 0, DateTimeKind.Utc)),
            ("ModifiedOn", typeof(DateTime), null),
            ("TotalCount", typeof(int), 1));

        var dto = PartyRepository.MapListItem(row);

        Assert.Equal("Supplier", dto.PartyType);
        Assert.Equal("SUP-001", dto.PartyCode);
        Assert.Null(dto.MobileNo);
        Assert.Equal(1, dto.TotalCount);
    }

    [Fact]
    public void Empty_party_result_set_is_representable_without_a_default_dto()
    {
        var rows = Array.Empty<PartyRepository.PartyListItemRow>();

        Assert.Empty(rows.Select(PartyRepository.MapListItem));
    }

    private static T Materialize<T>(params (string Name, Type Type, object? Value)[] columns)
    {
        using var table = new DataTable();
        foreach (var column in columns) table.Columns.Add(column.Name, column.Type);
        var data = table.NewRow();
        for (var index = 0; index < columns.Length; index++) data[index] = columns[index].Value ?? DBNull.Value;
        table.Rows.Add(data);
        using var reader = table.CreateDataReader();
        var parser = reader.GetRowParser<T>();
        Assert.True(reader.Read());
        return parser(reader);
    }
}
