using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class ProcurementPlanningRepository : IProcurementPlanningRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public ProcurementPlanningRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PagedResult<SalesChannelDto>> GetChannelsAsync(ProcurementListQuery query, CancellationToken ct)
    {
        var rows = await QueryAsync<SalesChannelDto>("sp_ProcurementPlanning_Channel_List", query, ct);
        return Page(rows, query.PageNumber, query.PageSize);
    }

    public Task<SalesChannelDto?> GetChannelAsync(long id, CancellationToken ct) => QuerySingleAsync<SalesChannelDto>("sp_ProcurementPlanning_Channel_Get", new { Id = id }, ct);
    public Task<SalesChannelDto> SaveChannelAsync(long? id, SaveSalesChannelRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<SalesChannelDto>("sp_ProcurementPlanning_Channel_Save", new { Id = id, request.Code, request.Name, request.DisplayOrder, request.IsActive, UserId = userId }, ct);
    public Task SetChannelStatusAsync(long id, bool isActive, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("sp_ProcurementPlanning_Channel_SetStatus", new { Id = id, IsActive = isActive, UserId = userId }, ct);

    public async Task<PagedResult<ChannelSkuMappingDto>> GetSkuMappingsAsync(ChannelSkuMappingQuery query, CancellationToken ct)
    {
        var rows = await QueryAsync<ChannelSkuMappingDto>("sp_ProcurementPlanning_SkuMapping_List", query, ct);
        return Page(rows, query.PageNumber, query.PageSize);
    }

    public Task<ChannelSkuMappingDto?> GetSkuMappingAsync(long id, CancellationToken ct) => QuerySingleAsync<ChannelSkuMappingDto>("sp_ProcurementPlanning_SkuMapping_Get", new { Id = id }, ct);
    public Task<ChannelSkuMappingDto> SaveSkuMappingAsync(long? id, SaveChannelSkuMappingRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ChannelSkuMappingDto>("sp_ProcurementPlanning_SkuMapping_Save", new { Id = id, request.SalesChannelId, request.ChannelSku, request.ChannelProductName, request.ItemId, request.IsActive, UserId = userId }, ct);
    public Task SetSkuMappingStatusAsync(long id, bool isActive, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("sp_ProcurementPlanning_SkuMapping_SetStatus", new { Id = id, IsActive = isActive, UserId = userId }, ct);
    public Task<IReadOnlyCollection<UnmappedChannelSkuDto>> GetUnmappedSkusAsync(CancellationToken ct) => QueryAsync<UnmappedChannelSkuDto>("sp_ProcurementPlanning_SkuMapping_Unmapped", null, ct);

    public Task<IReadOnlyCollection<ImportLookupRow>> GetImportLookupAsync(CancellationToken ct) => QueryAsync<ImportLookupRow>("sp_ProcurementPlanning_Import_Lookup", null, ct);
    public async Task<bool> ImportFileExistsAsync(string fileHash, CancellationToken ct) =>
        await QuerySingleAsync<bool>("sp_ProcurementPlanning_Import_FileExists", new { FileHash = fileHash }, ct);

    public Task<SalesImportConfirmResultDto> ConfirmImportAsync(string originalFileName, string fileHash, bool allowDuplicate, string? correctionReason, IReadOnlyCollection<ConfirmedSalesImportRow> rows, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<SalesImportConfirmResultDto>("sp_ProcurementPlanning_Import_Confirm", new
        {
            OriginalFileName = originalFileName,
            FileHash = fileHash,
            AllowDuplicate = allowDuplicate,
            CorrectionReason = correctionReason,
            RowsJson = JsonSerializer.Serialize(rows, JsonOptions),
            UserId = userId
        }, ct);

    public async Task<PagedResult<SalesImportBatchDto>> GetImportBatchesAsync(SalesImportBatchQuery query, CancellationToken ct)
    {
        var rows = await QueryAsync<SalesImportBatchDto>("sp_ProcurementPlanning_ImportBatch_List", query, ct);
        return Page(rows, query.PageNumber, query.PageSize);
    }

    public Task<SalesImportBatchDto?> GetImportBatchAsync(long id, CancellationToken ct) => QuerySingleAsync<SalesImportBatchDto>("sp_ProcurementPlanning_ImportBatch_Get", new { Id = id }, ct);
    public Task<IReadOnlyCollection<SalesHistoryDto>> GetImportBatchRowsAsync(long id, CancellationToken ct) => QueryAsync<SalesHistoryDto>("sp_ProcurementPlanning_ImportBatch_Rows", new { Id = id }, ct);
    public Task CancelImportBatchAsync(long id, string reason, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("sp_ProcurementPlanning_ImportBatch_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

    public Task<SalesHistoryDto> SaveManualSalesAsync(long? id, ManualSalesEntryRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<SalesHistoryDto>("sp_ProcurementPlanning_Sales_ManualSave", new
        {
            Id = id,
            request.SalesDate,
            request.SalesChannelId,
            request.ChannelSku,
            request.ChannelProductName,
            request.ItemId,
            request.Quantity,
            request.Notes,
            UserId = userId
        }, ct);
    public Task<SalesHistoryDto?> GetSalesHistoryByIdAsync(long id, CancellationToken ct) => QuerySingleAsync<SalesHistoryDto>("sp_ProcurementPlanning_Sales_Get", new { Id = id }, ct);
    public Task DeleteManualSalesAsync(long id, long? userId, CancellationToken ct) => ExecuteStatusOrThrowAsync("sp_ProcurementPlanning_Sales_ManualDelete", new { Id = id, UserId = userId }, ct);

    public async Task<PagedResult<SalesHistoryDto>> GetSalesHistoryAsync(SalesHistoryQuery query, CancellationToken ct)
    {
        var rows = await QueryAsync<SalesHistoryDto>("sp_ProcurementPlanning_Sales_List", query, ct);
        return Page(rows, query.PageNumber, query.PageSize);
    }

    public Task<IReadOnlyCollection<SalesSummaryChannelDto>> GetSummaryChannelsAsync(CancellationToken ct) => QueryAsync<SalesSummaryChannelDto>("sp_ProcurementPlanning_Sales_SummaryChannels", null, ct);
    public Task<IReadOnlyCollection<SalesSummaryFlatRow>> GetSalesSummaryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct) => QueryAsync<SalesSummaryFlatRow>("sp_ProcurementPlanning_Sales_Summary", new { FromDate = fromDate, ToDate = toDate }, ct);

    public async Task<ProductBomDto?> GetProductBomAsync(long finishedProductItemId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        var command = Command("sp_ProcurementPlanning_Bom_Get", new { FinishedProductItemId = finishedProductItemId }, ct);
        using var multi = await connection.QueryMultipleAsync(command);
        var header = await multi.ReadSingleOrDefaultAsync<ProductBomHeader>();
        if (header is null) return null;
        var components = (await multi.ReadAsync<BomComponentDto>()).AsList();
        return header.ToDto(components);
    }

    public async Task<ProductBomDto> SaveProductBomAsync(long finishedProductItemId, SaveProductBomRequest request, long? userId, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        var command = Command("sp_ProcurementPlanning_Bom_Save", new { FinishedProductItemId = finishedProductItemId, ComponentsJson = JsonSerializer.Serialize(request.Components, JsonOptions), UserId = userId }, ct);
        using var multi = await connection.QueryMultipleAsync(command);
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        var header = await multi.ReadSingleAsync<ProductBomHeader>();
        return header.ToDto((await multi.ReadAsync<BomComponentDto>()).AsList());
    }

    public Task<IReadOnlyCollection<ProcurementConfigurationIssueDto>> GetBomIssuesAsync(CancellationToken ct) => QueryAsync<ProcurementConfigurationIssueDto>("sp_ProcurementPlanning_Bom_Issues", null, ct);

    public async Task<PagedResult<ProcurementSettingDto>> GetSettingsAsync(ProcurementSettingQuery query, CancellationToken ct)
    {
        var rows = await QueryAsync<ProcurementSettingDto>("sp_ProcurementPlanning_Settings_List", query, ct);
        return Page(rows, query.PageNumber, query.PageSize);
    }

    public Task<ProcurementSettingDto?> GetSettingByItemAsync(long itemId, CancellationToken ct) => QuerySingleAsync<ProcurementSettingDto>("sp_ProcurementPlanning_Settings_GetByItem", new { ItemId = itemId }, ct);
    public Task<ProcurementSettingDto> SaveSettingAsync(SaveProcurementSettingRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ProcurementSettingDto>("sp_ProcurementPlanning_Settings_Save", new
        {
            request.ItemId,
            request.ConfiguredLeadTimeDays,
            request.LeadTimeOverrideDays,
            request.SafetyFactor,
            request.MinimumOrderQuantity,
            request.OrderMultiple,
            request.AutomaticCalculationEnabled,
            request.ManualPlanning,
            request.RoundingRule,
            request.IsActive,
            UserId = userId
        }, ct);
    public Task<IReadOnlyCollection<ProcurementConfigurationIssueDto>> GetMissingSettingsAsync(CancellationToken ct) => QueryAsync<ProcurementConfigurationIssueDto>("sp_ProcurementPlanning_Settings_Missing", null, ct);
    public Task<LeadTimeHistoryDto> AddLeadTimeHistoryAsync(CreateLeadTimeHistoryRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<LeadTimeHistoryDto>("sp_ProcurementPlanning_LeadTime_Add", new { request.ItemId, request.Reference, request.OrderedDate, request.ReceivedDate, request.Notes, UserId = userId }, ct);
    public Task<IReadOnlyCollection<LeadTimeHistoryDto>> GetLeadTimeHistoryAsync(long itemId, CancellationToken ct) => QueryAsync<LeadTimeHistoryDto>("sp_ProcurementPlanning_LeadTime_List", new { ItemId = itemId }, ct);

    public async Task<ProcurementCalculationData> GetCalculationDataAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        var command = Command("sp_ProcurementPlanning_CalculationInputs", new { FromDate = fromDate, ToDate = toDate }, ct);
        using var multi = await connection.QueryMultipleAsync(command);
        var sales = (await multi.ReadAsync<ProductSalesInput>()).AsList();
        var bom = (await multi.ReadAsync<BomCalculationInput>()).AsList();
        var unmapped = (await multi.ReadAsync<UnmappedSalesInput>()).AsList();
        var revision = await multi.ReadSingleAsync<string>();
        return new ProcurementCalculationData(sales, bom, unmapped) { SourceRevision = revision };
    }

    public Task<PlanningRunDto> SavePlanningRunAsync(PlanningRunSaveModel model, long? userId, CancellationToken ct)
    {
        var lines = model.Lines.Select(x => new
        {
            x.MaterialItemId, x.MaterialItemCode, x.MaterialItemName, x.UnitId, x.UnitName, x.UnitShortName,
            x.MaterialRequirement, x.AverageDailyUsage, x.LeadTimeDays, x.LeadTimeSource, x.LeadTimeDemand,
            x.SafetyFactor, x.SafetyStock, x.ReorderPoint, x.PhysicalStock, x.Shortage, x.MinimumOrderQuantity,
            x.OrderMultiple, x.RoundingRule, x.AutomaticCalculationEnabled, x.ManualPlanning,
            x.CalculatedSuggestedQuantity, x.FinalQuantity, x.AdjustmentReason,
            WarningState = x.Warnings.Count == 0 ? null : string.Join("; ", x.Warnings), x.CalculationExplanation,
            x.InboundStock, x.ProjectedAvailableStock,x.ReservedStock,x.AvailableStock,x.Normalized30Requirement
        });
        return PlanningRunWithStatusAsync("sp_ProcurementPlanning_Run_Save", new
        {
            model.FromDate, model.ToDate, model.NumberOfDays, model.CalculatedAtUtc, model.Notes,
            model.CalculationVersion, model.InventoryBasis, model.SourceRevision, LinesJson = JsonSerializer.Serialize(lines, JsonOptions), UserId = userId
        }, ct);
    }

    public async Task<PagedResult<PlanningRunSummaryDto>> GetPlanningRunsAsync(PlanningRunQuery query, CancellationToken ct)
    {
        var rows = await QueryAsync<PlanningRunSummaryDto>("sp_ProcurementPlanning_Run_List", query, ct);
        return Page(rows, query.PageNumber, query.PageSize);
    }

    public Task<PlanningRunDto?> GetPlanningRunAsync(long id, CancellationToken ct) => PlanningRunAsync("sp_ProcurementPlanning_Run_Get", new { Id = id }, ct);
    public Task<IReadOnlyCollection<PlanningRunLineDto>> GetPlanningRunLinesAsync(long id, PlanningRunLineQuery query, CancellationToken ct) =>
        QueryAsync<PlanningRunLineDto>("sp_ProcurementPlanning_RunLine_List", new { RunId = id, query.Search, query.PurchaseOnly, query.HasWarnings, query.ManualPlanning }, ct);
    public Task<PlanningRunLineDto> UpdatePlanningLineAsync(long runId, long lineId, UpdatePlanningLineRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<PlanningRunLineDto>("sp_ProcurementPlanning_RunLine_Update", new { RunId = runId, LineId = lineId, request.FinalQuantity, request.AdjustmentReason, UserId = userId }, ct);
    public Task<PlanningRunDto> FinalizePlanningRunAsync(long id, long? userId, CancellationToken ct) => PlanningRunWithStatusAsync("sp_ProcurementPlanning_Run_Finalize", new { Id = id, UserId = userId }, ct);
    public Task<PlanningRunDto> CancelPlanningRunAsync(long id, string reason, long? userId, CancellationToken ct) =>
        PlanningRunWithStatusAsync("usp_ProcurementPlanning_Run_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

    private async Task<PlanningRunDto?> PlanningRunAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command(procedure, parameters, ct));
        var header = await multi.ReadSingleOrDefaultAsync<PlanningRunHeader>();
        if (header is null) return null;
        return header.ToDto((await multi.ReadAsync<PlanningRunLineDto>()).AsList());
    }

    private async Task<PlanningRunDto> PlanningRunWithStatusAsync(string procedure, object parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        using var multi = await connection.QueryMultipleAsync(Command(procedure, parameters, ct));
        ThrowIfFailed(await multi.ReadSingleAsync<OperationResult>());
        var header = await multi.ReadSingleAsync<PlanningRunHeader>();
        return header.ToDto((await multi.ReadAsync<PlanningRunLineDto>()).AsList());
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

    private async Task ExecuteStatusOrThrowAsync(string procedure, object? parameters, CancellationToken ct)
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

    private sealed record ProductBomHeader(long FinishedProductItemId, string FinishedProductItemCode, string FinishedProductItemName, int? ProcurementClassification)
    {
        public ProductBomDto ToDto(IReadOnlyCollection<BomComponentDto> components) => new(FinishedProductItemId, FinishedProductItemCode, FinishedProductItemName, ProcurementClassification, components);
    }

    private sealed record PlanningRunHeader(
        long Id, string RunNumber, DateOnly FromDate, DateOnly ToDate, int NumberOfDays, int Status,
        DateTime CalculatedAtUtc, string CalculationVersion, string InventoryBasis, string? Notes,
        DateTime CreatedAt, long? CreatedBy, DateTime? FinalizedAt, long? FinalizedBy)
    {
        public PlanningRunDto ToDto(IReadOnlyCollection<PlanningRunLineDto> lines) => new(Id, RunNumber, FromDate, ToDate, NumberOfDays, Status, CalculatedAtUtc, CalculationVersion, InventoryBasis, Notes, CreatedAt, CreatedBy, FinalizedAt, FinalizedBy, lines);
    }
}
