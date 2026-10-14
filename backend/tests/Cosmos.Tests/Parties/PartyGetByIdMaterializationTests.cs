using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Parties.Queries;
using Cosmos.Application.Services;
using Cosmos.Contracts.Parties;
using Cosmos.Shared.Exceptions;
using Dapper;
using Moq;

namespace Cosmos.Tests.Parties;

public sealed class PartyGetByIdMaterializationTests
{
    [Fact]
    public void Party_get_by_id_result_materializes_nullable_fields_and_party_type()
    {
        var party = Materialize<PartyDto>(
            ("Id", typeof(Guid), Guid.Parse("6674e5ca-6e8d-49c2-b707-e7c5ea2679eb")),
            ("PartyCode", typeof(string), "CUS-001"),
            ("PartyName", typeof(string), "Contoso Retail"),
            ("PartyType", typeof(string), "Customer"),
            ("MobileNo", typeof(string), null),
            ("Email", typeof(string), null),
            ("GSTTreatment", typeof(int), 1),
            ("GSTIN", typeof(string), null),
            ("LegalName", typeof(string), null),
            ("TradeName", typeof(string), null),
            ("BillingAddressLine1", typeof(string), null),
            ("BillingAddressLine2", typeof(string), null),
            ("BillingCity", typeof(string), null),
            ("BillingState", typeof(string), null),
            ("BillingCountry", typeof(string), null),
            ("BillingPincode", typeof(string), null),
            ("ShippingAddressLine1", typeof(string), null),
            ("ShippingAddressLine2", typeof(string), null),
            ("ShippingCity", typeof(string), null),
            ("ShippingState", typeof(string), null),
            ("ShippingCountry", typeof(string), null),
            ("ShippingPincode", typeof(string), null),
            ("OpeningBalance", typeof(decimal), 25m),
            ("OpeningBalanceType", typeof(int), 1),
            ("CreditLimit", typeof(decimal), 500m),
            ("CreditPeriodDays", typeof(int), 30),
            ("IsActive", typeof(bool), true),
            ("CreatedOn", typeof(DateTime), new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc)),
            ("CreatedBy", typeof(Guid), null),
            ("ModifiedOn", typeof(DateTime), null),
            ("ModifiedBy", typeof(Guid), null),
            ("IsDeleted", typeof(bool), false),
            ("DeletedOn", typeof(DateTime), null),
            ("RowVersion", typeof(byte[]), new byte[] { 1, 2, 3, 4 }));

        Assert.Equal("CUS-001", party.PartyCode);
        Assert.Null(party.MobileNo);
        Assert.Null(party.Email);
        Assert.Null(party.GSTIN);
        Assert.Equal("Customer", party.PartyType);
    }

    [Fact]
    public async Task Party_get_by_id_not_found_preserves_not_found_behavior()
    {
        var repository = new Mock<IPartyRepository>();
        var id = Guid.NewGuid();
        repository.Setup(x => x.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync((PartyDto?)null);
        var service = new PartyService(repository.Object, null!, null!, null!, null!, null!);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() => service.GetByIdAsync(new GetPartyByIdQuery(id), CancellationToken.None));

        Assert.Equal("Party was not found.", exception.Message);
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
