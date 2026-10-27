using System.Data;
using Cosmos.Contracts.HsnGst;
using Dapper;

namespace Cosmos.Tests.HsnGst;

public sealed class HsnSacMaterializationTests
{
    [Fact]
    public void Hsn_sac_get_contract_materializes_the_required_total_count()
    {
        using var table = new DataTable();
        table.Columns.Add("Id", typeof(long));
        table.Columns.Add("Code", typeof(string));
        table.Columns.Add("CodeType", typeof(string));
        table.Columns.Add("Description", typeof(string));
        table.Columns.Add("IsActive", typeof(bool));
        table.Columns.Add("CreatedAtUtc", typeof(DateTime));
        table.Columns.Add("UpdatedAtUtc", typeof(DateTime));
        table.Columns.Add("TotalCount", typeof(int));
        table.Rows.Add(1L, "8471", "HSN", "Portable computers", true, new DateTime(2026, 10, 27, 0, 0, 0, DateTimeKind.Utc), DBNull.Value, 0);

        using var reader = table.CreateDataReader();
        var parser = reader.GetRowParser<HsnSacDto>();

        Assert.True(reader.Read());
        var dto = parser(reader);

        Assert.Equal("8471", dto.Code);
        Assert.Equal("HSN", dto.CodeType);
        Assert.Equal(0, dto.TotalCount);
        Assert.Null(dto.UpdatedAtUtc);
    }
}
