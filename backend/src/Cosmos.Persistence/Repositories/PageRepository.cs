using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Pages;
using Cosmos.Domain.Entities;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class PageRepository : IPageRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public PageRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<IReadOnlyCollection<PageDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<PageDto>(connection, "sp_Page_GetAll", null, cancellationToken);
    }

    public async Task<PageDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<PageDto>(connection, "sp_Page_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<Page?> GetEntityByIdAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<Page>(connection, "sp_Page_GetEntityById", new { Id = id }, cancellationToken);
    }

    public async Task<PageDto> CreateAsync(Page page, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<PageDto>(
            connection,
            "sp_Page_Create",
            new { page.Name, page.DisplayName, page.Route, page.Icon, page.ParentPageId, page.SortOrder, page.IsActive },
            cancellationToken);
    }

    public async Task<PageDto> UpdateAsync(int id, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<PageDto>(connection, "sp_Page_Update", new { Id = id, request.DisplayName, request.Route, request.Icon, request.ParentPageId, request.SortOrder, request.IsActive }, cancellationToken);
    }

    public async Task<OperationResult> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Page_Delete", new { Id = id }, cancellationToken);
    }
}
