using System.Data;
using Cosmos.Application.Sales;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.Sales;

/// <summary>Opt-in only: requires a disposable database populated with the base/GST/Phase 3 migrations.</summary>
public sealed class SalesInvoiceGstSqlIntegrationTests
{
    private const string ConnectionStringVariable = "COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";
    private const string Prefix = "ITGSTP3_";

    [RequiresDisposableSalesGstDatabaseFact]
    [Trait("Category", "SqlIntegration")]
    public async Task Draft_context_round_trips_and_confirm_cancel_preserve_it()
    {
        var value = Environment.GetEnvironmentVariable(ConnectionStringVariable);
        Assert.False(string.IsNullOrWhiteSpace(value), $"Set {ConnectionStringVariable} to run Sales GST SQL integration tests.");
        var builder = new SqlConnectionStringBuilder(value);
        Assert.StartsWith("CosmosSalesGstIntegrationTests_", builder.InitialCatalog, StringComparison.OrdinalIgnoreCase);

        await using var connection = new SqlConnection(value);
        await connection.OpenAsync();
        await CleanupAsync(connection);
        try
        {
            var fixture = await CreateFixtureAsync(connection);
            var repository = new SalesRepository(new TestConnectionFactory(value));
            var command = new CreateSalesInvoiceCommand(fixture.CustomerId, new DateOnly(2030, 1, 1), null,
                [new SalesInvoiceItemRequest(fixture.ItemId, 2m, 100m, 0m, 0m, null, 5m)], 0m, "ITGSTP3", null,
                fixture.RegistrationOne, "24", "CustomerBillingReviewed", SalesInvoicePriceBasis.TaxExclusive, null);
            var created = await repository.CreateAsync(command, null, CancellationToken.None);
            Assert.Equal(fixture.RegistrationOne, created.CompanyGstRegistrationId);
            Assert.Equal("24", created.PlaceOfSupplyStateCode);
            Assert.Equal("CustomerBillingReviewed", created.PlaceOfSupplySource);
            Assert.Equal(0, created.PriceBasis);
            Assert.Equal(210m, created.GrandTotal);
            Assert.Equal(10m, await connection.QuerySingleAsync<decimal>("SELECT CurrentStock FROM dbo.Items WHERE Id=@id", new { id = fixture.ItemId }));

            var updated = await repository.UpdateAsync(created.Id, new UpdateSalesInvoiceCommand(fixture.CustomerId, new DateOnly(2030, 1, 2), null,
                [new SalesInvoiceItemRequest(fixture.ItemId, 2m, 100m, 0m, 0m, null, 5m)], 0m, "ITGSTP3", null,
                fixture.RegistrationTwo, "27", "CustomerShippingReviewed", SalesInvoicePriceBasis.TaxInclusive), null, CancellationToken.None);
            Assert.Equal(fixture.RegistrationTwo, updated.CompanyGstRegistrationId);
            Assert.Equal("27", updated.PlaceOfSupplyStateCode);
            Assert.Equal(1, updated.PriceBasis);

            var confirmed = await repository.ConfirmAsync(created.Id, null, CancellationToken.None);
            Assert.Equal(2, confirmed.Status);
            Assert.Equal(fixture.RegistrationTwo, confirmed.CompanyGstRegistrationId);
            Assert.Equal(8m, await connection.QuerySingleAsync<decimal>("SELECT CurrentStock FROM dbo.Items WHERE Id=@id", new { id = fixture.ItemId }));
            await Assert.ThrowsAsync<Cosmos.Shared.Exceptions.CosmosException>(() => repository.UpdateAsync(created.Id, new UpdateSalesInvoiceCommand(fixture.CustomerId, new DateOnly(2030, 1, 2), null,
                [new SalesInvoiceItemRequest(fixture.ItemId, 2m, 100m, 0m, 0m, null, 5m)], 0m, "ITGSTP3", null, fixture.RegistrationOne, "24", "CustomerBillingReviewed", SalesInvoicePriceBasis.TaxExclusive), null, CancellationToken.None));
            var cancelled = await repository.CancelAsync(created.Id, null, CancellationToken.None);
            Assert.Equal(5, cancelled.Status);
            Assert.Equal(fixture.RegistrationTwo, cancelled.CompanyGstRegistrationId);
            Assert.Equal(10m, await connection.QuerySingleAsync<decimal>("SELECT CurrentStock FROM dbo.Items WHERE Id=@id", new { id = fixture.ItemId }));
        }
        finally { await CleanupAsync(connection); }
    }

    private static async Task<(Guid CustomerId, long ItemId, long RegistrationOne, long RegistrationTwo)> CreateFixtureAsync(SqlConnection connection)
    {
        var customer = Guid.NewGuid();
        await connection.ExecuteAsync("INSERT dbo.Parties(Id,PartyCode,PartyName,GSTTreatment,OpeningBalance,OpeningBalanceType,CreditLimit,CreditPeriodDays) VALUES(@id,N'ITGSTP3-CUSTOMER',N'Integration Customer',0,0,0,0,0);", new { id = customer });
        var unit = await connection.QuerySingleAsync<long>("INSERT dbo.Units(Name,ShortName,IsActive) OUTPUT INSERTED.Id VALUES(N'ITGSTP3 Unit',N'IT3',1);");
        var category = await connection.QuerySingleAsync<long>("INSERT dbo.Categories(Name,IsActive) OUTPUT INSERTED.Id VALUES(N'ITGSTP3 Category',1);");
        var item = await connection.QuerySingleAsync<long>("INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,CurrentStock,TrackInventory,IsActive) OUTPUT INSERTED.Id VALUES(N'ITGSTP3 Item',N'ITGSTP3-ITEM',@category,@unit,1,10,1,1);", new { category, unit });
        var one = await connection.QuerySingleAsync<long>("INSERT dbo.CompanyGstRegistrations(Gstin,LegalName,StateCode,Status) OUTPUT INSERTED.Id VALUES(N'24ITGSTP300001Z0',N'IT GST One',N'24',N'Active');");
        var two = await connection.QuerySingleAsync<long>("INSERT dbo.CompanyGstRegistrations(Gstin,LegalName,StateCode,Status) OUTPUT INSERTED.Id VALUES(N'27ITGSTP300002Z0',N'IT GST Two',N'27',N'Active');");
        return (customer, item, one, two);
    }

    private static Task CleanupAsync(SqlConnection connection) => connection.ExecuteAsync("""
        DELETE sm FROM dbo.StockMovements sm JOIN dbo.Items i ON i.Id=sm.ItemId WHERE i.ItemCode=N'ITGSTP3-ITEM';
        DELETE si FROM dbo.SalesInvoiceItems si JOIN dbo.SalesInvoices s ON s.Id=si.SalesInvoiceId WHERE s.Notes=N'ITGSTP3';
        DELETE FROM dbo.SalesInvoices WHERE Notes=N'ITGSTP3';
        DELETE FROM dbo.CompanyGstRegistrations WHERE Gstin LIKE N'%ITGSTP3%';
        DELETE FROM dbo.Items WHERE ItemCode=N'ITGSTP3-ITEM'; DELETE FROM dbo.Categories WHERE Name=N'ITGSTP3 Category'; DELETE FROM dbo.Units WHERE Name=N'ITGSTP3 Unit'; DELETE FROM dbo.Parties WHERE PartyCode=N'ITGSTP3-CUSTOMER';
        """);

    private sealed class TestConnectionFactory(string connectionString) : ISqlConnectionFactory
    {
        public async Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken) { var connection = new SqlConnection(connectionString); await connection.OpenAsync(cancellationToken); return connection; }
    }

    private sealed class RequiresDisposableSalesGstDatabaseFactAttribute : FactAttribute
    {
        public RequiresDisposableSalesGstDatabaseFactAttribute()
        {
            var value = Environment.GetEnvironmentVariable(ConnectionStringVariable);
            if (string.IsNullOrWhiteSpace(value))
            {
                Skip = $"Set {ConnectionStringVariable} to run Sales GST SQL integration tests.";
                return;
            }

            try
            {
                var builder = new SqlConnectionStringBuilder(value);
                if (!builder.InitialCatalog.StartsWith("CosmosSalesGstIntegrationTests_", StringComparison.OrdinalIgnoreCase))
                    Skip = "Sales GST SQL integration tests require a CosmosSalesGstIntegrationTests_* disposable database.";
            }
            catch (ArgumentException)
            {
                Skip = "Sales GST SQL integration tests require a valid disposable-database connection string.";
            }
        }
    }
}
