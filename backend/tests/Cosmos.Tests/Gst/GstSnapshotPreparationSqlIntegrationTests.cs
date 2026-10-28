using System.Data;
using Cosmos.Application.Gst;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Repositories;
using Cosmos.Shared.Exceptions;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.Gst;

// Append-only immutable fixtures intentionally remain in the guarded disposable test catalogue.
// Never disables an immutability trigger, deletes snapshots or invokes a GST provider.
public sealed class GstSnapshotPreparationSqlIntegrationTests
{
    private const string Variable="COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";
    [RequiresDisposableSnapshotFact,Trait("Category","SqlIntegration")]
    public async Task Transactional_preparation_freezes_reviewed_source_replays_exactly_and_rejects_changed_review()
    {
        var connectionString=Environment.GetEnvironmentVariable(Variable)!;
        Assert.StartsWith("CosmosSalesGstIntegrationTests_",new SqlConnectionStringBuilder(connectionString).InitialCatalog,StringComparison.OrdinalIgnoreCase);
        await using var connection=new SqlConnection(connectionString);await connection.OpenAsync();
        var token=Guid.NewGuid().ToString("N");var prefix="ITGSTSNAP_"+token;var customer=Guid.NewGuid();
        await connection.ExecuteAsync("INSERT dbo.Parties(Id,PartyCode,PartyName,GSTTreatment,OpeningBalance,OpeningBalanceType,CreditLimit,CreditPeriodDays,BillingAddressLine1) VALUES(@customer,@prefix,N'Snapshot Buyer',0,0,0,0,0,N'Original reviewed address');",new{customer,prefix});
        var unit=await connection.QuerySingleAsync<long>("INSERT dbo.Units(Name,ShortName,IsActive) OUTPUT INSERTED.Id VALUES(@prefix,N'GSN',1);",new{prefix});
        var category=await connection.QuerySingleAsync<long>("INSERT dbo.Categories(Name,IsActive) OUTPUT INSERTED.Id VALUES(@prefix,1);",new{prefix});
        var item=await connection.QuerySingleAsync<long>("INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,CurrentStock,TrackInventory,IsActive) OUTPUT INSERTED.Id VALUES(@prefix,@prefix,@category,@unit,1,10,1,1);",new{prefix,category,unit});
        var registration=await connection.QuerySingleAsync<long>("INSERT dbo.CompanyGstRegistrations(Gstin,LegalName,StateCode,Status,AddressLine1) OUTPUT INSERTED.Id VALUES(@gstin,@prefix,N'24',N'Active',N'Reviewed seller address');",new{gstin="24"+token[..10]+"1Z0",prefix});
        var invoice=await connection.QuerySingleAsync<long>("INSERT dbo.SalesInvoices(InvoiceNumber,InvoiceDate,CustomerPartyId,SubTotal,TaxAmount,GrandTotal,Status,CompanyGstRegistrationId,PlaceOfSupplyStateCode,PlaceOfSupplySource,PriceBasis,Notes) OUTPUT INSERTED.Id VALUES(@prefix,'2030-01-01',@customer,200,10,210,2,@registration,N'24',N'CustomerBillingReviewed',0,@prefix);",new{prefix,customer,registration});
        await connection.ExecuteAsync("INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,TaxPercentageSnapshot,TaxAmount,LineTotal) VALUES(@invoice,@item,@prefix,N'3923',2,@unit,N'unit',100,5,10,210);",new{invoice,item,prefix,unit});
        var repository=new GstComplianceSnapshotRepository(new Factory(connectionString));
        var source=await repository.ReadSourceAsync(invoice,"fixture-catalog",default);
        var request=new GstPrepareSnapshotRequest(Guid.NewGuid(),source.SourceVersion,source.SourceFingerprint,true);
        var saved=await repository.PrepareAsync(invoice,"fixture-catalog",request,null,default);
        Assert.Equal("PendingPolicy",saved.Status);Assert.False(saved.PolicyOptions.GetProperty("approved").GetBoolean());
        var before=await connection.QuerySingleAsync<string>("SELECT CanonicalPayloadJson FROM dbo.GstComplianceSnapshots WHERE Id=@id;",new{id=saved.Id});
        Assert.Contains("Original reviewed address",before);Assert.DoesNotContain("GstPortalUsername",before);
        await connection.ExecuteAsync("UPDATE dbo.Parties SET BillingAddressLine1=N'Changed current address' WHERE Id=@customer;",new{customer});
        var replay=await repository.PrepareAsync(invoice,"fixture-catalog",request,null,default);Assert.Equal(saved.Id,replay.Id);Assert.Equal("Original reviewed address",replay.FrozenSource!.Value.GetProperty("buyerCurrentMaster").GetProperty("BillingAddressLine1").GetString());
        await Assert.ThrowsAsync<ConflictException>(()=>repository.PrepareAsync(invoice,"fixture-catalog",request with{RequestKey=Guid.NewGuid()},null,default));
        var current=await repository.ReadSourceAsync(invoice,"fixture-catalog",default);Assert.NotEqual(source.SourceFingerprint,current.SourceFingerprint);
        var next=await repository.PrepareAsync(invoice,"fixture-catalog",request with{RequestKey=Guid.NewGuid(),SourceVersion=current.SourceVersion,SourceFingerprint=current.SourceFingerprint},null,default);Assert.Equal(2,next.SnapshotVersion);
        Assert.Equal(before,await connection.QuerySingleAsync<string>("SELECT CanonicalPayloadJson FROM dbo.GstComplianceSnapshots WHERE Id=@id;",new{id=saved.Id}));
        await Assert.ThrowsAsync<SqlException>(()=>connection.ExecuteAsync("UPDATE dbo.GstComplianceSnapshots SET Status=N'Validated' WHERE Id=@id;",new{id=saved.Id}));
        Assert.Null(await repository.GetPreparedAsync(invoice,"different-catalog",request.RequestKey,default));
        Assert.Equal(10m,await connection.QuerySingleAsync<decimal>("SELECT CurrentStock FROM dbo.Items WHERE Id=@item;",new{item}));
        Assert.Equal(210m,await connection.QuerySingleAsync<decimal>("SELECT GrandTotal FROM dbo.SalesInvoices WHERE Id=@invoice;",new{invoice}));
        Assert.Equal(0,await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.GstGenerationRequests WHERE ComplianceSnapshotId IN(@id,@second);",new{id=saved.Id,second=next.Id}));
    }
    private sealed class Factory(string connectionString):ISqlConnectionFactory
    {
        public async Task<IDbConnection> CreateOpenConnectionAsync(CancellationToken ct){var connection=new SqlConnection(connectionString);await connection.OpenAsync(ct);return connection;}
    }
    private sealed class RequiresDisposableSnapshotFactAttribute:FactAttribute
    {
        public RequiresDisposableSnapshotFactAttribute(){var value=Environment.GetEnvironmentVariable(Variable);try{if(string.IsNullOrWhiteSpace(value)||!new SqlConnectionStringBuilder(value).InitialCatalog.StartsWith("CosmosSalesGstIntegrationTests_",StringComparison.OrdinalIgnoreCase))Skip="A guarded disposable Sales GST test catalogue is required; immutable fixture rows remain in that catalogue.";}catch(ArgumentException){Skip="A valid guarded disposable Sales GST test connection is required.";}}
    }
}
