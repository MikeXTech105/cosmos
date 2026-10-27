namespace Cosmos.Tests.DispatchPlanning;

public sealed class DispatchSqlFactAttribute:FactAttribute
{
    public DispatchSqlFactAttribute()
    {
        if(string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING")))
            Skip="No explicitly configured CosmosDispatchIntegrationTests_* catalog; no application connection is used.";
    }
}
