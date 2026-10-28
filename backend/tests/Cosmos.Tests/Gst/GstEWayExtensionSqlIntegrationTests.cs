using System.Data;
using System.Security.Cryptography;
using System.Text;
using Cosmos.Contracts.Gst;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.Gst;

// Never invokes a provider. Synthetic rows are isolated to the guarded disposable Sales GST catalogue.
public sealed class GstEWayExtensionSqlIntegrationTests
{
    private const string Variable="COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING";

    [RequiresDisposableGstFact]
    [Trait("Category","SqlIntegration")]
    public async Task Extension_commands_reject_changed_retries_preserve_uncertainty_and_do_not_overwrite_concurrent_cancellation()
    {
        var connectionString=Environment.GetEnvironmentVariable(Variable)!;
        Assert.StartsWith("CosmosSalesGstIntegrationTests_",new SqlConnectionStringBuilder(connectionString).InitialCatalog,StringComparison.OrdinalIgnoreCase);
        await using var connection=new SqlConnection(connectionString);await connection.OpenAsync();
        Assert.NotNull(await connection.ExecuteScalarAsync<int?>("SELECT COL_LENGTH(N'dbo.EWayBills',N'ProviderCommandVersion');"));
        var token=Guid.NewGuid().ToString("N");
        var registration=await connection.QuerySingleAsync<long>("INSERT dbo.CompanyGstRegistrations(Gstin,LegalName,StateCode,Status,IsEWayBillEnabled) OUTPUT INSERTED.Id VALUES(@gstin,@name,N'24',N'Active',1);",new {gstin="24"+token[..10]+"1Z0",name="ITGSTEXT_"+token});
        long bill=0;
        try
        {
            var number="ITGSTEXT_"+token;var prior=new DateTime(2030,1,1,23,59,0);
            bill=await connection.QuerySingleAsync<long>("INSERT dbo.EWayBills(CompanyGstRegistrationId,EWayBillNumber,Status,ValidUpTo) OUTPUT INSERTED.Id VALUES(@registration,@number,N'ACT',@prior);",new {registration,number,prior});
            var version=await Version(connection,bill);var key=Guid.NewGuid();var fingerprint=SHA256.HashData(Encoding.UTF8.GetBytes("reviewed-fixture-intent"));
            var args=new {CompanyGstRegistrationId=registration,EWayBillNumber=number,IdempotencyKey=key,Version=version,PayloadFingerprint=fingerprint,PriorValidUpTo=prior};
            var first=await Reserve(connection,args);Assert.Equal(201,first.Status);Assert.True(first.Command!.IsNew);
            var replay=await Reserve(connection,args);Assert.Equal(200,replay.Status);Assert.False(replay.Command!.IsNew);
            var changed=await Reserve(connection,new {CompanyGstRegistrationId=registration,EWayBillNumber=number,IdempotencyKey=key,Version=version,PayloadFingerprint=SHA256.HashData(Encoding.UTF8.GetBytes("changed-intent")),PriorValidUpTo=prior});
            Assert.Equal(409,changed.Status);
            Assert.Equal(1,await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.GstEWayExtensionCommands WHERE EWayBillId=@bill;",new{bill}));

            Assert.Equal(200,await Complete(connection,new {IdempotencyKey=key,Confirmed=false}));
            Assert.Equal("OutcomeUnknown",await connection.QuerySingleAsync<string>("SELECT State FROM dbo.GstEWayExtensionCommands WHERE IdempotencyKey=@key;",new{key}));
            Assert.Equal(prior,await connection.QuerySingleAsync<DateTime>("SELECT ValidUpTo FROM dbo.EWayBills WHERE Id=@bill;",new{bill}));
            var blocked=await Reserve(connection,new {CompanyGstRegistrationId=registration,EWayBillNumber=number,IdempotencyKey=Guid.NewGuid(),Version=version,PayloadFingerprint=fingerprint,PriorValidUpTo=prior});Assert.Equal(409,blocked.Status);

            Assert.Equal(200,await Complete(connection,new {IdempotencyKey=key,Confirmed=true,ValidUpTo=prior.AddDays(1)}));
            Assert.Equal("Confirmed",await connection.QuerySingleAsync<string>("SELECT State FROM dbo.GstEWayExtensionCommands WHERE IdempotencyKey=@key;",new{key}));
            Assert.Equal(prior.AddDays(1),await connection.QuerySingleAsync<DateTime>("SELECT ValidUpTo FROM dbo.EWayBills WHERE Id=@bill;",new{bill}));
            var secondKey=Guid.NewGuid();var currentVersion=await Version(connection,bill);
            Assert.Equal(409,(await Reserve(connection,new {CompanyGstRegistrationId=registration,EWayBillNumber=number,IdempotencyKey=secondKey,Version=version,PayloadFingerprint=fingerprint,PriorValidUpTo=prior.AddDays(1)})).Status);
            Assert.Equal(201,(await Reserve(connection,new {CompanyGstRegistrationId=registration,EWayBillNumber=number,IdempotencyKey=secondKey,Version=currentVersion,PayloadFingerprint=fingerprint,PriorValidUpTo=prior.AddDays(1)})).Status);
            await connection.ExecuteAsync("UPDATE dbo.EWayBills SET ValidUpTo=@validity,VehicleNumber=N'READBACK' WHERE Id=@bill;",new{bill,validity=prior.AddDays(2)});
            Assert.Equal(200,await Complete(connection,new{IdempotencyKey=secondKey,Confirmed=true,ValidUpTo=prior.AddDays(2),VehicleNumber="DO-NOT-OVERWRITE"}));
            Assert.Equal("READBACK",await connection.QuerySingleAsync<string>("SELECT VehicleNumber FROM dbo.EWayBills WHERE Id=@bill;",new{bill}));
            var thirdKey=Guid.NewGuid();currentVersion=await Version(connection,bill);
            Assert.Equal(201,(await Reserve(connection,new{CompanyGstRegistrationId=registration,EWayBillNumber=number,IdempotencyKey=thirdKey,Version=currentVersion,PayloadFingerprint=fingerprint,PriorValidUpTo=prior.AddDays(2)})).Status);
            await connection.ExecuteAsync("UPDATE dbo.EWayBills SET Status=N'Cancelled',CancelledAt=SYSUTCDATETIME() WHERE Id=@bill;",new{bill});
            Assert.Equal(409,await Complete(connection,new {IdempotencyKey=thirdKey,Confirmed=true,ValidUpTo=prior.AddDays(3)}));
            Assert.Equal("Cancelled",await connection.QuerySingleAsync<string>("SELECT Status FROM dbo.EWayBills WHERE Id=@bill;",new{bill}));
            Assert.Equal(prior.AddDays(2),await connection.QuerySingleAsync<DateTime>("SELECT ValidUpTo FROM dbo.EWayBills WHERE Id=@bill;",new{bill}));
        }
        finally
        {
            if(bill>0){await connection.ExecuteAsync("DELETE dbo.GstEWayExtensionCommands WHERE EWayBillId=@bill;DELETE dbo.EWayBills WHERE Id=@bill;",new{bill});}
            await connection.ExecuteAsync("DELETE dbo.CompanyGstRegistrations WHERE Id=@registration;",new{registration});
        }
    }

    private static Task<string> Version(SqlConnection connection,long bill)=>connection.QuerySingleAsync<string>("SELECT CONVERT(VARCHAR(18),ProviderCommandVersion,1) FROM dbo.EWayBills WHERE Id=@bill;",new{bill});
    private static async Task<(int Status,GstEWayExtensionOperation? Command)> Reserve(SqlConnection connection,object parameters)
    {
        using var result=await connection.QueryMultipleAsync("dbo.sp_GstEWayExtension_Reserve",parameters,commandType:CommandType.StoredProcedure);
        var status=(await result.ReadSingleAsync<SqlStatus>()).StatusCode;
        return(status,status<400?await result.ReadSingleAsync<GstEWayExtensionOperation>():null);
    }
    private static async Task<int> Complete(SqlConnection connection,object parameters)
    {
        using var result=await connection.QueryMultipleAsync("dbo.sp_GstEWayExtension_Complete",parameters,commandType:CommandType.StoredProcedure);return(await result.ReadSingleAsync<SqlStatus>()).StatusCode;
    }
    private sealed class SqlStatus{public int StatusCode{get;set;}}
    private sealed class RequiresDisposableGstFactAttribute:FactAttribute
    {
        public RequiresDisposableGstFactAttribute()
        {
            var value=Environment.GetEnvironmentVariable(Variable);
            try{if(string.IsNullOrWhiteSpace(value)||!new SqlConnectionStringBuilder(value).InitialCatalog.StartsWith("CosmosSalesGstIntegrationTests_",StringComparison.OrdinalIgnoreCase))Skip=$"Set {Variable} to a guarded CosmosSalesGstIntegrationTests_* disposable catalogue.";}
            catch(ArgumentException){Skip=$"A valid guarded {Variable} is required.";}
        }
    }
}
