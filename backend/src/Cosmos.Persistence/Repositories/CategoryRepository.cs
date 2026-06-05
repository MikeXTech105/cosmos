using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class CategoryRepository : ICategoryRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public CategoryRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<CategoryDto?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<CategoryDto>(connection, "sp_Category_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<PagedResult<CategoryListItemDto>> GetListAsync(GetCategoriesQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<CategoryListItemDto>(connection, "sp_Category_GetList", query, cancellationToken);
        var totalCount = rows.FirstOrDefault()?.TotalCount ?? 0;
        return new PagedResult<CategoryListItemDto>(rows, query.PageNumber, query.PageSize, totalCount);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CategoryDto>(connection, "sp_Category_Create", new { Name = command.Name.Trim(), Description = TrimToNull(command.Description), command.IsActive }, cancellationToken);
    }

    public async Task<CategoryDto> UpdateAsync(long id, UpdateCategoryCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<CategoryDto>(connection, "sp_Category_Update", new { Id = id, Name = command.Name.Trim(), Description = TrimToNull(command.Description), command.IsActive }, cancellationToken);
    }

    public async Task<OperationResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Category_Delete", new { Id = id }, cancellationToken);
    }

    public async Task<bool> NameExistsAsync(string name, long? excludingId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("sp_Category_NameExists", new { Name = name, ExcludingId = excludingId }, commandType: System.Data.CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<bool>(command);
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
