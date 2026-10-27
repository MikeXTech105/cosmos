using System.Data;
using System.Text.Json;
using Cosmos.Application.DispatchPlanning;
using Cosmos.Application.Services;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Cosmos.Tests.DispatchPlanning;

public sealed class DispatchConfiguredPolicySqlIntegrationTests
{
    private const string ConnectionStringVariable = "COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING";

    [DispatchSqlFact]
    [Trait("Category", "SqlIntegration")]
    public async Task Configured_policy_calculates_and_persists_against_explicit_test_database()
    {
        var connectionString = Environment.GetEnvironmentVariable(ConnectionStringVariable);
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException($"Explicit {ConnectionStringVariable} is required.");

        var builder = new SqlConnectionStringBuilder(connectionString);
        Assert.StartsWith("CosmosDispatchIntegrationTests_", builder.InitialCatalog, StringComparison.OrdinalIgnoreCase);

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        const string fixtureNotes = "IT-Dispatch C# configured-policy calculation run";
        var fixture = await connection.QuerySingleAsync<(long ChannelId, long SalesBatchId, long StockBatchId, long InboundBatchId)>(
            """
            SELECT TOP(1) c.Id AS ChannelId,
                   (SELECT Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-sales.json') AS SalesBatchId,
                   (SELECT Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-stock.json') AS StockBatchId,
                   (SELECT Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-inbound-sales.json') AS InboundBatchId
            FROM dbo.SalesChannels c WHERE c.Code=N'ITDSP';
            """);

        await connection.ExecuteAsync(
            "EXEC dbo.usp_DispatchPlanning_Run_Create @ChannelId,@PlanningDate,@SalesImportBatchId,@WarehouseStockImportBatchId,@WarehouseInboundImportBatchId,@CompanyStockSourceType,@Notes,@UserId;",
            new
            {
                fixture.ChannelId,
                PlanningDate = new DateTime(2026, 10, 7),
                SalesImportBatchId = fixture.SalesBatchId,
                WarehouseStockImportBatchId = fixture.StockBatchId,
                WarehouseInboundImportBatchId = fixture.InboundBatchId,
                CompanyStockSourceType = 1,
                Notes = fixtureNotes,
                UserId = (long?)null
            });
        var runId = await connection.QuerySingleAsync<long>("SELECT Id FROM dbo.DispatchPlanningRuns WHERE Notes=@fixtureNotes;", new { fixtureNotes });

        var inputs = (await connection.QueryAsync<DispatchCalculationInput>(
            "dbo.usp_DispatchPlanning_Run_CalculationInputs", new { RunId = runId }, commandType: CommandType.StoredProcedure)).AsList();
        Assert.Equal(2, inputs.Count);

        var recommendations = new DispatchCalculationService().Calculate(runId, inputs).Recommendations;
        var linesJson = JsonSerializer.Serialize(recommendations.Select(x => new
        {
            x.ItemId, x.WarehouseId, x.ChannelItemMappingId, x.DispatchSkuSettingId, x.PackagingProfileId,
            x.Tier, x.AllocationPriority, x.UnitsPerBox, x.RoundingMode, x.AllowLooseQuantity,
            x.SalesQuantity, x.CurrentSellableQuantity, x.EligibleInboundQuantity, x.TotalWarehouseStock,
            x.RecurringDemand, x.SafetyStock, x.ReorderPoint, x.RawShortage, x.CalculatedRecommendationQuantity,
            x.FinalRecommendationQuantity, x.BoxCount, x.CalculationExplanation
        }), new JsonSerializerOptions(JsonSerializerDefaults.Web));

        var status = await connection.QuerySingleAsync<(int StatusCode, string Message)>(
            "dbo.usp_DispatchPlanning_Run_SaveCalculation",
            new { RunId = runId, LinesJson = linesJson, UserId = (long?)null },
            commandType: CommandType.StoredProcedure);
        Assert.Equal(200, status.StatusCode);

        var persisted = (await connection.QueryAsync<(decimal SalesQuantity, decimal EligibleInboundQuantity, decimal CalculatedRecommendationQuantity)>(
            "SELECT SalesQuantity,EligibleInboundQuantity,CalculatedRecommendationQuantity FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@runId ORDER BY SalesQuantity;",
            new { runId })).AsList();
        Assert.Collection(persisted,
            row => { Assert.Equal(10m, row.SalesQuantity); Assert.Equal(3m, row.EligibleInboundQuantity); Assert.Equal(6m, row.CalculatedRecommendationQuantity); },
            row => { Assert.Equal(20m, row.SalesQuantity); Assert.Equal(0m, row.EligibleInboundQuantity); Assert.Equal(21m, row.CalculatedRecommendationQuantity); });
        Assert.Equal("dispatch-planning-v1", await connection.QuerySingleAsync<string>("SELECT CalculationVersion FROM dbo.DispatchPlanningRuns WHERE Id=@runId;", new { runId }));
    }
}
