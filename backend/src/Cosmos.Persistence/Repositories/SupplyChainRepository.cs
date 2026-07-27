using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.SupplyChain;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class SupplyChainRepository : ISupplyChainRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public SupplyChainRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PagedResult<ChannelDto>> GetChannelsAsync(SupplyChainListQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ChannelDto>("usp_SupplyChain_Channel_List", query, ct), query.PageNumber, query.PageSize);
    public Task<ChannelDto?> GetChannelAsync(long id, CancellationToken ct) => QuerySingleAsync<ChannelDto>("usp_SupplyChain_Channel_Get", new { Id = id }, ct);
    public Task<ChannelDto> SaveChannelAsync(long? id, SaveChannelRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ChannelDto>("usp_SupplyChain_Channel_Save", new { Id = id, request.Code, request.Name, request.Description, request.SortOrder, request.IsActive, UserId = userId }, ct);
    public Task SetChannelStatusAsync(long id, bool isActive, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_Channel_SetStatus", new { Id = id, IsActive = isActive, UserId = userId }, ct);
    public Task DeleteChannelAsync(long id, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_Channel_Delete", new { Id = id, UserId = userId }, ct);

    public async Task<PagedResult<ChannelWarehouseDto>> GetWarehousesAsync(ChannelWarehouseQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ChannelWarehouseDto>("usp_SupplyChain_Warehouse_List", query, ct), query.PageNumber, query.PageSize);
    public Task<ChannelWarehouseDto?> GetWarehouseAsync(long id, CancellationToken ct) => QuerySingleAsync<ChannelWarehouseDto>("usp_SupplyChain_Warehouse_Get", new { Id = id }, ct);
    public Task<ChannelWarehouseDto> SaveWarehouseAsync(long? id, SaveChannelWarehouseRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ChannelWarehouseDto>("usp_SupplyChain_Warehouse_Save", new
        {
            Id = id, request.ChannelId, request.WarehouseCode, request.WarehouseName, request.City, request.State, request.AddressLine1,
            request.AddressLine2, request.PostalCode, request.Region, request.Priority, request.SortOrder, request.IsActive, UserId = userId
        }, ct);
    public Task SetWarehouseStatusAsync(long id, bool isActive, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_Warehouse_SetStatus", new { Id = id, IsActive = isActive, UserId = userId }, ct);
    public Task DeleteWarehouseAsync(long id, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_Warehouse_Delete", new { Id = id, UserId = userId }, ct);
    public Task<IReadOnlyCollection<ChannelWarehouseDropdownDto>> GetWarehouseDropdownAsync(long? channelId, CancellationToken ct) =>
        QueryAsync<ChannelWarehouseDropdownDto>("usp_SupplyChain_Warehouse_Dropdown", new { ChannelId = channelId }, ct);

    public async Task<PagedResult<ChannelItemMappingDto>> GetItemMappingsAsync(ChannelItemMappingQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ChannelItemMappingDto>("usp_SupplyChain_ItemMapping_List", query, ct), query.PageNumber, query.PageSize);
    public Task<ChannelItemMappingDto?> GetItemMappingAsync(long id, CancellationToken ct) => QuerySingleAsync<ChannelItemMappingDto>("usp_SupplyChain_ItemMapping_Get", new { Id = id }, ct);
    public Task<ChannelItemMappingDto> SaveItemMappingAsync(long? id, SaveChannelItemMappingRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ChannelItemMappingDto>("usp_SupplyChain_ItemMapping_Save", new
        {
            Id = id, request.ChannelId, request.ItemId, request.ChannelSku, request.ChannelProductName, request.ExternalItemId,
            request.IsPrimary, request.IsActive, request.EffectiveFrom, request.EffectiveTo, UserId = userId
        }, ct);
    public Task SetItemMappingStatusAsync(long id, bool isActive, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_ItemMapping_SetStatus", new { Id = id, IsActive = isActive, UserId = userId }, ct);
    public Task DeleteItemMappingAsync(long id, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_ItemMapping_Delete", new { Id = id, UserId = userId }, ct);
    public Task<IReadOnlyCollection<UnmatchedChannelItemDto>> GetUnmatchedItemsAsync(CancellationToken ct) =>
        QueryAsync<UnmatchedChannelItemDto>("usp_SupplyChain_ItemMapping_Unmatched", null, ct);

    public async Task<PagedResult<ItemPackagingProfileDto>> GetPackagingProfilesAsync(ItemPackagingProfileQuery query, CancellationToken ct) =>
        Page(await QueryAsync<ItemPackagingProfileDto>("usp_SupplyChain_PackagingProfile_List", query, ct), query.PageNumber, query.PageSize);
    public Task<ItemPackagingProfileDto?> GetPackagingProfileAsync(long id, CancellationToken ct) => QuerySingleAsync<ItemPackagingProfileDto>("usp_SupplyChain_PackagingProfile_Get", new { Id = id }, ct);
    public Task<ItemPackagingProfileDto> SavePackagingProfileAsync(long? id, SaveItemPackagingProfileRequest request, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ItemPackagingProfileDto>("usp_SupplyChain_PackagingProfile_Save", new
        {
            Id = id, request.ItemId, request.ChannelId, request.PackagingCode, request.PackagingName, request.UnitsPerBox,
            request.Length, request.Width, request.Height, request.DimensionUnit, request.GrossWeight, request.NetWeight,
            request.WeightUnit, request.VolumetricDivisor, request.IsDefault, request.IsActive, request.EffectiveFrom, request.EffectiveTo, UserId = userId
        }, ct);
    public Task<ItemPackagingProfileDto> SetPackagingProfileDefaultAsync(long id, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<ItemPackagingProfileDto>("usp_SupplyChain_PackagingProfile_SetDefault", new { Id = id, UserId = userId }, ct);
    public Task DeletePackagingProfileAsync(long id, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_PackagingProfile_Delete", new { Id = id, UserId = userId }, ct);

    public async Task<SupplyChainImportValidationDto> SaveImportValidationAsync(string originalFileName, string fileHash, string importType, long? channelId, DateOnly? periodFrom, DateOnly? periodTo, IReadOnlyCollection<SupplyChainImportStagedRow> rows, string correlationId, long? userId, CancellationToken ct)
    {
        var row = await QueryWithStatusAsync<ImportValidationRow>("usp_SupplyChain_Import_Validate", new
        {
            OriginalFileName = originalFileName,
            FileHash = fileHash,
            ImportType = importType,
            ChannelId = channelId,
            PeriodFrom = periodFrom,
            PeriodTo = periodTo,
            RowsJson = JsonSerializer.Serialize(rows, JsonOptions),
            CorrelationId = correlationId,
            UserId = userId
        }, ct);
        var warnings = JsonSerializer.Deserialize<string[]>(row.WarningsJson, JsonOptions) ?? [];
        var errors = JsonSerializer.Deserialize<SupplyChainImportRowErrorDto[]>(row.RowErrorsJson, JsonOptions) ?? [];
        return new SupplyChainImportValidationDto(row.BatchId, row.FileName, row.ImportType, row.TotalRows, row.ValidRows, row.InvalidRows,
            row.DuplicateRows, row.UnmatchedItemCount, row.UnmatchedChannelCount, row.UnmatchedWarehouseCount, warnings, errors, row.CanCommit);
    }
    public async Task<PagedResult<SupplyChainImportBatchDto>> GetImportBatchesAsync(SupplyChainImportBatchQuery query, CancellationToken ct) =>
        Page(await QueryAsync<SupplyChainImportBatchDto>("usp_SupplyChain_Import_List", query, ct), query.PageNumber, query.PageSize);
    public Task<SupplyChainImportBatchDto?> GetImportBatchAsync(long id, CancellationToken ct) => QuerySingleAsync<SupplyChainImportBatchDto>("usp_SupplyChain_Import_Get", new { Id = id }, ct);
    public Task<IReadOnlyCollection<SupplyChainImportRowErrorDto>> GetImportErrorsAsync(long id, CancellationToken ct) => QueryAsync<SupplyChainImportRowErrorDto>("usp_SupplyChain_Import_Errors", new { Id = id }, ct);
    public Task<SupplyChainImportBatchDto> CommitImportAsync(long id, bool allowDuplicate, string? correctionReason, long? userId, CancellationToken ct) =>
        QueryWithStatusAsync<SupplyChainImportBatchDto>("usp_SupplyChain_Import_Commit", new { Id = id, AllowDuplicate = allowDuplicate, CorrectionReason = correctionReason, UserId = userId }, ct);
    public Task CancelImportAsync(long id, string reason, long? userId, CancellationToken ct) =>
        ExecuteStatusOrThrowAsync("usp_SupplyChain_Import_Cancel", new { Id = id, Reason = reason, UserId = userId }, ct);

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
        var status = await StoredProcedureExecutor.ExecuteStatusAsync(connection, procedure, parameters, ct);
        if (!status.Succeeded) throw new CosmosException(status.Message, status.StatusCode);
    }

    private static PagedResult<T> Page<T>(IReadOnlyCollection<T> rows, int page, int size) where T : class
    {
        var property = typeof(T).GetProperty("TotalCount");
        var total = rows.FirstOrDefault() is { } first && property?.GetValue(first) is int count ? count : 0;
        return new PagedResult<T>(rows, page, size, total);
    }

    private sealed record ImportValidationRow(
        long BatchId,
        string FileName,
        string ImportType,
        int TotalRows,
        int ValidRows,
        int InvalidRows,
        int DuplicateRows,
        int UnmatchedItemCount,
        int UnmatchedChannelCount,
        int UnmatchedWarehouseCount,
        string WarningsJson,
        string RowErrorsJson,
        bool CanCommit);
}
