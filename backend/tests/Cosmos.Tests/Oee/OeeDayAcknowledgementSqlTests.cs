using System.Data;
using Cosmos.Tests.Manufacturing;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.SqlServer.TransactSql.ScriptDom;

namespace Cosmos.Tests.Oee;

public sealed class OeeDayAcknowledgementSqlTests
{
    [Fact]
    public void Additive_acknowledgement_batches_parse_as_SQL_Server()
    {
        var source = File.ReadAllText(Path.Combine(ProductionMigrationSyntaxTests.FindRoot(), "backend", "database", "migrations", "20261028_02_oee_day_acknowledgements.sql"));
        new TSql160Parser(true).Parse(new StringReader(source), out var errors);
        Assert.True(errors.Count == 0, string.Join("; ", errors.Select(x => $"line {x.Line}: {x.Message}")));
    }

    [ProductionSqlFact, Trait("Category", "SqlIntegration")]
    public async Task Stopped_day_is_append_only_idempotent_and_never_creates_a_reading_or_stock_event()
    {
        var configured = Environment.GetEnvironmentVariable(ProductionSqlIntegrationTests.Variable)!;
        var target = new SqlConnectionStringBuilder(configured);
        Assert.StartsWith("CosmosProductionIntegrationTests_", target.InitialCatalog, StringComparison.OrdinalIgnoreCase);
        await using var db = new SqlConnection(configured); await db.OpenAsync();
        Assert.Equal(target.InitialCatalog, await db.QuerySingleAsync<string>("SELECT DB_NAME()"));
        var machine = await db.QuerySingleAsync<long>("INSERT dbo.OeeMachines(MachineCode,MachineName) VALUES(@Tag,@Tag);SELECT CONVERT(BIGINT,SCOPE_IDENTITY())", new { Tag = "ack-" + Guid.NewGuid().ToString("N") });
        var key = Guid.NewGuid(); var date = new DateTime(2026, 10, 28);
        async Task<(int Status, long? Id)> Save(Guid command, long? previous, string state = "PlannedStop", string reason = "Scheduled maintenance")
        {
            using var result = await db.QueryMultipleAsync("sp_OeeDayAcknowledgement_Save", new { ProductionDate = date, MachineId = machine, State = state, Reason = reason, PreviousId = previous, CommandKey = command, UserId = (long?)null }, commandType: CommandType.StoredProcedure);
            var status = await result.ReadSingleAsync<StatusRow>();
            var id = status.StatusCode == 200 ? (await result.ReadSingleAsync<IdRow>()).Id : (long?)null;
            return (status.StatusCode, id);
        }
        var first = await Save(key, null);
        Assert.Equal(200, first.Status);
        Assert.Equal(first, await Save(key, null));
        Assert.Equal(409, (await Save(key, null, reason: "Different intent")).Status);
        Assert.Equal(409, (await Save(Guid.NewGuid(), null)).Status);
        var resourceTag = "ack-resource-" + Guid.NewGuid().ToString("N");
        var resources = await db.QuerySingleAsync<(long Mould, long Reason)>("INSERT dbo.OeeMoulds(MouldName,TargetShotPerDay) VALUES(@Tag,200);DECLARE @M BIGINT=SCOPE_IDENTITY();INSERT dbo.OeeDowntimeReasons(ReasonName) VALUES(@Tag);SELECT @M,CONVERT(BIGINT,SCOPE_IDENTITY());", new { Tag = resourceTag });
        Task InsertReading() => db.ExecuteAsync("INSERT dbo.OeeProductionEntries(ProductionDate,MachineId,MouldId,MachineOnTime,ShotCount,DowntimeReasonId) VALUES(@Date,@Machine,@Mould,N'12 HR',100,@Reason)", new { Date = date, Machine = machine, resources.Mould, resources.Reason });
        await Assert.ThrowsAsync<SqlException>(InsertReading);
        var withdrawal = await Save(Guid.NewGuid(), first.Id, "Withdrawn", "Machine returned to service");
        Assert.Equal(200, withdrawal.Status);
        Assert.Equal(2, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.OeeMachineDayAcknowledgements WHERE MachineId=@Machine", new { Machine = machine }));
        Assert.Equal(0, await db.QuerySingleAsync<int>("SELECT COUNT(*) FROM dbo.OeeProductionEntries WHERE MachineId=@Machine", new { Machine = machine }));
        await InsertReading();
        Assert.Equal(409, (await Save(Guid.NewGuid(), withdrawal.Id, "NotRun", "Conflicting stopped state")).Status);
        await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE dbo.OeeMachineDayAcknowledgements SET Reason=N'rewrite' WHERE MachineId=@Machine", new { Machine = machine }));
        var latest = await db.QuerySingleAsync<string>("SELECT TOP(1) State FROM dbo.OeeMachineDayAcknowledgements WHERE MachineId=@Machine ORDER BY Id DESC", new { Machine = machine });
        Assert.Equal("Withdrawn", latest);
    }
    private sealed record StatusRow(int StatusCode, string Message);
    private sealed record IdRow(long Id);
}
