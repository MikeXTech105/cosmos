using System.Data;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Oee;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Oee;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class OeeRepository(ISqlConnectionFactory factory) : IOeeRepository
{
    public Task<bool> MachineExistsAsync(long id, CancellationToken ct) => Scalar<bool>("sp_OeeMachine_Exists", new { Id = id }, ct);
    public Task<bool> MouldExistsAsync(long id, CancellationToken ct) => Scalar<bool>("sp_OeeMould_Exists", new { Id = id }, ct);
    public Task<bool> DowntimeReasonExistsAsync(long? id, CancellationToken ct) => id is null ? Task.FromResult(true) : Scalar<bool>("sp_OeeDowntimeReason_Exists", new { Id = id }, ct);

    public Task<PagedResult<OeeMachineDto>> GetMachinesAsync(OeeMasterListQuery query, CancellationToken ct) => Paged<OeeMachineDto>("sp_OeeMachine_GetList", query, query.Page, query.PageSize, ct);
    public Task<OeeMachineDto?> GetMachineAsync(long id, CancellationToken ct) => Single<OeeMachineDto>("sp_OeeMachine_GetById", new { Id = id }, ct);
    public Task<OeeMachineDto> SaveMachineAsync(long? id, CreateOeeMachineRequest request, long? userId, CancellationToken ct) => Save<OeeMachineDto>("sp_OeeMachine_Save", new { Id = id, request.MachineCode, request.MachineName, request.Tonnage, request.Location, request.DisplayOrder, request.IsActive, UserId = userId }, ct);
    public Task DeleteMachineAsync(long id, long? userId, CancellationToken ct) => Status("sp_OeeMachine_Delete", new { Id = id, UserId = userId }, ct);

    public Task<PagedResult<OeeMouldDto>> GetMouldsAsync(OeeMasterListQuery query, CancellationToken ct) => Paged<OeeMouldDto>("sp_OeeMould_GetList", query, query.Page, query.PageSize, ct);
    public Task<OeeMouldDto?> GetMouldAsync(long id, CancellationToken ct) => Single<OeeMouldDto>("sp_OeeMould_GetById", new { Id = id }, ct);
    public Task<OeeMouldDto> SaveMouldAsync(long? id, CreateOeeMouldRequest request, long? userId, CancellationToken ct) => Save<OeeMouldDto>("sp_OeeMould_Save", new { Id = id, request.MouldName, request.TargetShotPerDay, request.Cavity, request.CycleTime, request.IsActive, UserId = userId }, ct);
    public Task DeleteMouldAsync(long id, long? userId, CancellationToken ct) => Status("sp_OeeMould_Delete", new { Id = id, UserId = userId }, ct);

    public Task<PagedResult<OeeDowntimeReasonDto>> GetDowntimeReasonsAsync(OeeMasterListQuery query, CancellationToken ct) => Paged<OeeDowntimeReasonDto>("sp_OeeDowntimeReason_GetList", query, query.Page, query.PageSize, ct);
    public Task<OeeDowntimeReasonDto?> GetDowntimeReasonAsync(long id, CancellationToken ct) => Single<OeeDowntimeReasonDto>("sp_OeeDowntimeReason_GetById", new { Id = id }, ct);
    public Task<OeeDowntimeReasonDto> SaveDowntimeReasonAsync(long? id, CreateOeeDowntimeReasonRequest request, long? userId, CancellationToken ct) => Save<OeeDowntimeReasonDto>("sp_OeeDowntimeReason_Save", new { Id = id, request.ReasonName, request.IsActive, UserId = userId }, ct);
    public Task DeleteDowntimeReasonAsync(long id, long? userId, CancellationToken ct) => Status("sp_OeeDowntimeReason_Delete", new { Id = id, UserId = userId }, ct);

    public Task<PagedResult<OeeProductionEntryDto>> GetProductionEntriesAsync(OeeProductionEntryListQuery query, CancellationToken ct) => Paged<OeeProductionEntryDto>("sp_OeeProductionEntry_GetList", query, query.Page, query.PageSize, ct);
    public Task<OeeProductionEntryDto?> GetProductionEntryAsync(long id, CancellationToken ct) => Single<OeeProductionEntryDto>("sp_OeeProductionEntry_GetById", new { Id = id }, ct);

    public async Task<IReadOnlyCollection<OeeProductionEntryDto>> SaveBulkProductionEntriesAsync(BulkCreateOeeProductionEntriesRequest request, long? userId, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        var parameters = new
        {
            request.ProductionDate,
            Entries = ProductionEntries(request.Entries).AsTableValuedParameter("dbo.OeeProductionEntryInput"),
            UserId = userId
        };
        using var multi = await connection.QueryMultipleAsync(new CommandDefinition("sp_OeeProductionEntry_SaveBulk", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct));
        var status = await multi.ReadSingleAsync<OperationResult>();
        if (!status.Succeeded)
        {
            throw new CosmosException(status.Message, status.StatusCode);
        }

        return (await multi.ReadAsync<OeeProductionEntryDto>()).AsList();
    }

    public Task<OeeProductionEntryDto> SaveProductionEntryAsync(long id, UpdateOeeProductionEntryRequest request, long? userId, CancellationToken ct) =>
        Save<OeeProductionEntryDto>("sp_OeeProductionEntry_Save", new { Id = id, request.ProductionDate, request.MachineId, request.MouldId, request.MachineOnTime, request.ShotCount, request.DowntimeReasonId, request.Remarks, UserId = userId }, ct);

    public Task DeleteProductionEntryAsync(long id, long? userId, CancellationToken ct) => Status("sp_OeeProductionEntry_Delete", new { Id = id, UserId = userId }, ct);

    public Task<OeeDashboardSummaryDto> GetDashboardSummaryAsync(OeeDashboardQuery query, CancellationToken ct) => SingleRequired<OeeDashboardSummaryDto>("sp_OeeDashboard_Summary", query, ct);
    public Task<IReadOnlyCollection<OeeMachineWiseDto>> GetMachineWiseAsync(OeeDashboardQuery query, CancellationToken ct) => Many<OeeMachineWiseDto>("sp_OeeDashboard_MachineWise", query, ct);
    public Task<IReadOnlyCollection<OeeMouldWiseDto>> GetMouldWiseAsync(OeeDashboardQuery query, CancellationToken ct) => Many<OeeMouldWiseDto>("sp_OeeDashboard_MouldWise", query, ct);
    public Task<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>> GetTopDowntimeReasonsAsync(OeeDashboardQuery query, CancellationToken ct) => Many<OeeDowntimeReasonSummaryDto>("sp_OeeDashboard_TopDowntimeReasons", query, ct);
    public Task<IReadOnlyCollection<OeeDailyTrendDto>> GetDailyTrendAsync(OeeDashboardQuery query, CancellationToken ct) => Many<OeeDailyTrendDto>("sp_OeeDashboard_DailyTrend", query, ct);

    public Task<IReadOnlyCollection<OeeDailyReportDto>> GetDailyReportAsync(OeeReportQuery query, CancellationToken ct) => Many<OeeDailyReportDto>("sp_OeeReport_Daily", query, ct);
    public Task<IReadOnlyCollection<OeeMachineWiseDto>> GetMachinePerformanceReportAsync(OeeReportQuery query, CancellationToken ct) => Many<OeeMachineWiseDto>("sp_OeeReport_MachinePerformance", query, ct);
    public Task<IReadOnlyCollection<OeeMouldWiseDto>> GetMouldPerformanceReportAsync(OeeReportQuery query, CancellationToken ct) => Many<OeeMouldWiseDto>("sp_OeeReport_MouldPerformance", query, ct);
    public Task<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>> GetDowntimeReportAsync(OeeReportQuery query, CancellationToken ct) => Many<OeeDowntimeReasonSummaryDto>("sp_OeeReport_Downtime", query, ct);

    private async Task<PagedResult<T>> Paged<T>(string sp, object parameters, int page, int pageSize, CancellationToken ct)
    {
        var rows = await Many<T>(sp, parameters, ct);
        var count = rows.FirstOrDefault() is null ? 0 : (int)(typeof(T).GetProperty("TotalCount")?.GetValue(rows.First()) ?? 0);
        return new PagedResult<T>(rows, page, pageSize, count);
    }

    private async Task<IReadOnlyCollection<T>> Many<T>(string sp, object? parameters, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<T>(connection, sp, parameters, ct);
    }

    private async Task<T?> Single<T>(string sp, object? parameters, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<T>(connection, sp, parameters, ct);
    }

    private async Task<T> SingleRequired<T>(string sp, object? parameters, CancellationToken ct) => await Single<T>(sp, parameters, ct) ?? throw new InvalidOperationException($"{sp} returned no row.");

    private async Task<T> Save<T>(string sp, object parameters, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<T>(connection, sp, parameters, ct);
    }

    private async Task Status(string sp, object parameters, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        var result = await StoredProcedureExecutor.ExecuteStatusAsync(connection, sp, parameters, ct);
        if (!result.Succeeded)
        {
            throw new CosmosException(result.Message, result.StatusCode);
        }
    }

    private async Task<T> Scalar<T>(string sp, object parameters, CancellationToken ct)
    {
        using var connection = await factory.CreateOpenConnectionAsync(ct);
        return (await connection.ExecuteScalarAsync<T>(new CommandDefinition(sp, parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct)))!;
    }

    private static DataTable ProductionEntries(IEnumerable<OeeProductionEntryLineRequest> entries)
    {
        var table = new DataTable();
        table.Columns.Add("MachineId", typeof(long));
        table.Columns.Add("MachineOnTime", typeof(string));
        table.Columns.Add("MouldId", typeof(long));
        table.Columns.Add("ShotCount", typeof(int));
        table.Columns.Add("DowntimeReasonId", typeof(long));
        table.Columns.Add("Remarks", typeof(string));

        foreach (var entry in entries)
        {
            table.Rows.Add(entry.MachineId, entry.MachineOnTime, entry.MouldId, entry.ShotCount, entry.DowntimeReasonId ?? (object)DBNull.Value, entry.Remarks ?? (object)DBNull.Value);
        }

        return table;
    }
}
