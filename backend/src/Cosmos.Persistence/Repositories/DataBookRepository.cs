using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DataBook;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class DataBookRepository(ISqlConnectionFactory connectionFactory) : IDataBookRepository
{
    public async Task<PagedResult<DataBookEntryListItemDto>> GetListAsync(DataBookEntryListQuery query, int currentUserId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        var rows = await StoredProcedureExecutor.QueryAsync<DataBookEntryListItemDto>(connection, "usp_DataBookEntry_GetList", new
        {
            query.Search, query.Category, query.Visibility, query.CreatedByUserId, query.UpdatedByUserId, query.FromDate, query.ToDate,
            query.PageNumber, query.PageSize, query.SortBy, query.SortDirection, CurrentUserId = currentUserId
        }, ct);
        var totalCount = rows.FirstOrDefault()?.TotalCount ?? 0;
        return new PagedResult<DataBookEntryListItemDto>(rows, query.PageNumber, query.PageSize, totalCount);
    }

    public async Task<DataBookEntryDto?> GetByIdAsync(long id, int currentUserId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<DataBookEntryDto>(connection, "usp_DataBookEntry_GetById", new { Id = id, CurrentUserId = currentUserId }, ct);
    }

    public async Task<DataBookEntryDto> CreateAsync(CreateDataBookEntryRequest request, int currentUserId, string? correlationId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<DataBookEntryDto>(connection, "usp_DataBookEntry_Create", new
        {
            request.Name, request.Value, request.Description, request.Category, request.IsPrivate, CurrentUserId = currentUserId, CorrelationId = correlationId
        }, ct);
    }

    public async Task<DataBookEntryDto> UpdateAsync(long id, UpdateDataBookEntryRequest request, byte[] expectedRowVersion, int currentUserId, string? correlationId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<DataBookEntryDto>(connection, "usp_DataBookEntry_Update", new
        {
            Id = id, request.Name, request.Value, request.Description, request.Category, request.IsPrivate, ExpectedRowVersion = expectedRowVersion,
            CurrentUserId = currentUserId, CorrelationId = correlationId
        }, ct);
    }

    public async Task<OperationResult> DeleteAsync(long id, byte[] expectedRowVersion, int currentUserId, string? correlationId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "usp_DataBookEntry_Delete", new
        {
            Id = id, ExpectedRowVersion = expectedRowVersion, CurrentUserId = currentUserId, CorrelationId = correlationId
        }, ct);
    }

    public async Task<IReadOnlyCollection<DataBookEntryHistoryDto>> GetHistoryAsync(long id, int currentUserId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<DataBookEntryHistoryDto>(connection, "usp_DataBookEntry_GetHistory", new { Id = id, CurrentUserId = currentUserId }, ct);
    }

    public async Task<IReadOnlyCollection<DataBookExportDto>> ExportAsync(DataBookExportRequest request, int currentUserId, CancellationToken ct)
    {
        using var connection = await connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<DataBookExportDto>(connection, "usp_DataBookEntry_Export", new
        {
            request.Search, request.Category, request.Visibility, request.CreatedByUserId, request.UpdatedByUserId, request.FromDate, request.ToDate,
            request.SortBy, request.SortDirection, CurrentUserId = currentUserId
        }, ct);
    }
}
