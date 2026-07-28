using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.DispatchPlanning;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class DispatchPlanningRepository : IDispatchPlanningRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly ISqlConnectionFactory _connectionFactory;

    public DispatchPlanningRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PagedResult<DispatchSkuSettingDto>> GetSkuSettingsAsync(DispatchSkuSettingQuery query, CancellationToken ct) =>
        Page(await QueryAsync<DispatchSkuSettingDto>("usp_DispatchPlanning_SkuSettings_List", query, ct), query.PageNumber, query.PageSize);

    public Task<DispatchSkuSettingDto?> GetSkuSettingAsync(long id, CancellationToken ct) => QuerySingleAsync<DispatchSkuSettingDto>("usp_DispatchPlanning_SkuSettings_Get", new { Id = id }, ct);

    public Task<DispatchSkuSettingDto> SaveSkuSettingAsync(long? id, SaveDispatchSkuSettingRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<DispatchSkuSettingDto>("usp_DispatchPlanning_SkuSettings_Save", new
        {
            Id = id, request.ItemId, request.ChannelId, request.PackagingProfileId, request.Tier,
            request.SafetyStockFactor, request.RecurringDemandFactor, request.MinimumDispatchQuantity,
            request.AllowLooseQuantity, request.RoundingMode, request.AllocationPriority, request.IsActive,
            request.EffectiveFrom, request.EffectiveTo, UserId = userId
        }, ct);

    public Task DeleteSkuSettingAsync(long id, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_DispatchPlanning_SkuSettings_Delete", new { Id = id, UserId = userId }, ct);

    public async Task<DispatchSnapshotImportValidationDto> ValidateSnapshotImportAsync(ValidateDispatchSnapshotImportRequest request, long? userId, string correlationId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command("usp_DispatchPlanning_Import_Validate", new
        {
            request.OriginalFileName, request.FileHash, request.ImportType, request.ChannelId,
            RowsJson = JsonSerializer.Serialize(request.Rows, JsonOptions), CorrelationId = correlationId, UserId = userId
        }, ct));
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        var header = await multi.ReadSingleAsync<DispatchImportValidationHeader>();
        var errors = (await multi.ReadAsync<DispatchSnapshotImportRowErrorDto>()).AsList();
        return new DispatchSnapshotImportValidationDto(header.BatchId, header.ImportType, header.TotalRows, header.ValidRows,
            header.InvalidRows, header.DuplicateRows, header.UnmatchedSkuCount, errors, header.CanCommit);
    }

    public Task<DispatchSnapshotImportBatchDto> CommitSnapshotImportAsync(long id, CommitDispatchSnapshotImportRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<DispatchSnapshotImportBatchDto>("usp_DispatchPlanning_Import_Commit", new { Id = id, request.AllowDuplicate, request.CorrectionReason, UserId = userId }, ct);

    public Task CancelSnapshotImportAsync(long id, string reason, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_DispatchPlanning_Import_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

    public async Task<PagedResult<DispatchSnapshotImportBatchDto>> GetSnapshotImportBatchesAsync(DispatchSnapshotImportBatchQuery query, CancellationToken ct) =>
        Page(await QueryAsync<DispatchSnapshotImportBatchDto>("usp_DispatchPlanning_Import_List", query, ct), query.PageNumber, query.PageSize);

    public Task<DispatchPlanningRunDto> CreateRunAsync(CreateDispatchPlanningRunRequest request, long? userId, CancellationToken ct) =>
        RunWithStatusAsync("usp_DispatchPlanning_Run_Create", new
        {
            request.ChannelId, request.PlanningDate, request.SalesImportBatchId, request.WarehouseStockImportBatchId,
            request.WarehouseInboundImportBatchId, request.CompanyStockSourceType, request.Notes, UserId = userId
        }, ct);

    public Task<IReadOnlyCollection<DispatchCalculationInput>> GetCalculationInputsAsync(long runId, CancellationToken ct) =>
        QueryAsync<DispatchCalculationInput>("usp_DispatchPlanning_Run_CalculationInputs", new { RunId = runId }, ct);

    public Task<DispatchPlanningRunDto> SaveCalculationAsync(long runId, IReadOnlyCollection<DispatchRecommendationDto> lines, long? userId, CancellationToken ct) =>
        RunWithStatusAsync("usp_DispatchPlanning_Run_SaveCalculation", new
        {
            RunId = runId,
            LinesJson = JsonSerializer.Serialize(lines.Select(x => new
            {
                x.ItemId, x.WarehouseId, x.ChannelItemMappingId, x.DispatchSkuSettingId, x.PackagingProfileId,
                x.Tier, x.AllocationPriority, x.UnitsPerBox, x.RoundingMode, x.AllowLooseQuantity,
                x.SalesQuantity, x.CurrentSellableQuantity, x.EligibleInboundQuantity, x.TotalWarehouseStock,
                x.RecurringDemand, x.SafetyStock, x.ReorderPoint, x.RawShortage, x.CalculatedRecommendationQuantity,
                x.FinalRecommendationQuantity, x.BoxCount, x.CalculationExplanation
            }), JsonOptions),
            UserId = userId
        }, ct);

    public async Task<PagedResult<DispatchPlanningRunSummaryDto>> GetRunsAsync(DispatchPlanningRunQuery query, CancellationToken ct) =>
        Page(await QueryAsync<DispatchPlanningRunSummaryDto>("usp_DispatchPlanning_Run_List", query, ct), query.PageNumber, query.PageSize);

    public Task<DispatchPlanningRunDto?> GetRunAsync(long id, CancellationToken ct) => RunAsync("usp_DispatchPlanning_Run_Get", new { Id = id }, ct);

    public Task<IReadOnlyCollection<DispatchRecommendationDto>> GetRecommendationsAsync(long runId, DispatchRecommendationQuery query, CancellationToken ct) =>
        QueryAsync<DispatchRecommendationDto>("usp_DispatchPlanning_Recommendation_List", new { RunId = runId, query.Search, query.WarehouseId, query.ItemId, query.Tier, query.AllocatedOnly }, ct);

    public Task<DispatchRecommendationDto> OverrideRecommendationAsync(long runId, long recommendationId, UpdateDispatchRecommendationRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<DispatchRecommendationDto>("usp_DispatchPlanning_Recommendation_Override", new
        {
            RunId = runId, RecommendationId = recommendationId, request.FinalRecommendationQuantity, request.OverrideReason, UserId = userId
        }, ct);

    public Task<DispatchPlanningRunDto> AllocateAsync(long id, IReadOnlyCollection<DispatchAllocationLine> allocations, string? notes, long? userId, CancellationToken ct) =>
        RunWithStatusAsync("usp_DispatchPlanning_Run_Allocate", new { Id = id, AllocationsJson = JsonSerializer.Serialize(allocations, JsonOptions), Notes = notes, UserId = userId }, ct);

    public Task<DispatchPlanningRunDto> FinalizeAsync(long id, long? userId, CancellationToken ct) =>
        RunWithStatusAsync("usp_DispatchPlanning_Run_Finalize", new { Id = id, UserId = userId }, ct);

    public Task<DispatchPlanningRunDto> CancelAsync(long id, string reason, long? userId, CancellationToken ct) =>
        RunWithStatusAsync("usp_DispatchPlanning_Run_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

    public async Task<PagedResult<DispatchRecommendationReportRowDto>> GetRecommendationReportAsync(DispatchRecommendationReportQuery query, CancellationToken ct) =>
        Page(await QueryAsync<DispatchRecommendationReportRowDto>("usp_DispatchPlanning_Report_Recommendations", query, ct), query.PageNumber, query.PageSize);

    private async Task<DispatchPlanningRunDto?> RunAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command(procedure, parameters, ct));
        var header = await multi.ReadSingleOrDefaultAsync<DispatchPlanningRunHeader>();
        if (header is null) return null;
        var recommendations = (await multi.ReadAsync<DispatchRecommendationDto>()).AsList();
        var stock = (await multi.ReadAsync<DispatchCompanyStockSnapshotDto>()).AsList();
        return header.ToDto(recommendations, stock);
    }

    private async Task<DispatchPlanningRunDto> RunWithStatusAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command(procedure, parameters, ct));
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        var header = await multi.ReadSingleAsync<DispatchPlanningRunHeader>();
        var recommendations = (await multi.ReadAsync<DispatchRecommendationDto>()).AsList();
        var stock = (await multi.ReadAsync<DispatchCompanyStockSnapshotDto>()).AsList();
        return header.ToDto(recommendations, stock);
    }

    private async Task<IReadOnlyCollection<T>> QueryAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T?> QuerySingleAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T> QueryWithStatusAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task ExecuteStatusOrThrowAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        ThrowIfFailed(await StoredProcedureExecutor.ExecuteStatusAsync(connection, procedure, parameters, ct));
    }

    private static CommandDefinition Command(string procedure, object? parameters, CancellationToken ct) => new(procedure, parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
    private static void ThrowIfFailed(OperationResult result) { if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode); }
    private static PagedResult<T> Page<T>(IReadOnlyCollection<T> rows, int page, int size) where T : class
    {
        var totalProperty = typeof(T).GetProperty("TotalCount");
        var total = rows.FirstOrDefault() is { } first && totalProperty?.GetValue(first) is int value ? value : 0;
        return new PagedResult<T>(rows, page, size, total);
    }

    private sealed record DispatchPlanningRunHeader(
        long Id,
        string RunNumber,
        long ChannelId,
        string ChannelCode,
        DateOnly PlanningDate,
        long SalesImportBatchId,
        long WarehouseStockImportBatchId,
        long? WarehouseInboundImportBatchId,
        int CompanyStockSourceType,
        int Status,
        string CalculationVersion,
        string? Notes,
        DateTime CreatedAtUtc,
        long? CreatedBy,
        DateTime? CalculatedAtUtc,
        long? CalculatedBy,
        DateTime? AllocatedAtUtc,
        long? AllocatedBy,
        DateTime? FinalizedAtUtc,
        long? FinalizedBy,
        string? CancellationReason)
    {
        public DispatchPlanningRunDto ToDto(IReadOnlyCollection<DispatchRecommendationDto> recommendations, IReadOnlyCollection<DispatchCompanyStockSnapshotDto> stock) =>
            new(Id, RunNumber, ChannelId, ChannelCode, PlanningDate, SalesImportBatchId, WarehouseStockImportBatchId, WarehouseInboundImportBatchId,
                CompanyStockSourceType, Status, CalculationVersion, Notes, CreatedAtUtc, CreatedBy, CalculatedAtUtc, CalculatedBy,
                AllocatedAtUtc, AllocatedBy, FinalizedAtUtc, FinalizedBy, CancellationReason, recommendations, stock);
    }

    private sealed record DispatchImportValidationHeader(
        long BatchId,
        string ImportType,
        int TotalRows,
        int ValidRows,
        int InvalidRows,
        int DuplicateRows,
        int UnmatchedSkuCount,
        bool CanCommit);
}
