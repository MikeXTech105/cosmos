using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class UnitRepository : IUnitRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public UnitRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<UnitDto?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<UnitDto>(connection, "sp_Unit_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<PagedResult<UnitListItemDto>> GetListAsync(GetUnitsQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<UnitListItemDto>(connection, "sp_Unit_GetList", query, cancellationToken);
        var summary = await StoredProcedureExecutor.QuerySingleOrDefaultAsync<MasterListSummaryDto>(
            connection,
            "sp_Unit_GetListSummary",
            new { query.Search, query.IsActive },
            cancellationToken) ?? new MasterListSummaryDto(0, 0, 0);
        return new PagedResult<UnitListItemDto>(rows, query.PageNumber, query.PageSize, summary.TotalCount, summary);
    }

    public async Task<UnitDto> CreateAsync(CreateUnitCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<UnitDto>(connection, "sp_Unit_Create", new { Name = command.Name.Trim(), ShortName = command.ShortName.Trim(), Description = TrimToNull(command.Description), command.IsActive }, cancellationToken);
    }

    public async Task<UnitDto> UpdateAsync(long id, UpdateUnitCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<UnitDto>(connection, "sp_Unit_Update", new { Id = id, Name = command.Name.Trim(), ShortName = command.ShortName.Trim(), Description = TrimToNull(command.Description), command.IsActive }, cancellationToken);
    }

    public async Task<OperationResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Unit_Delete", new { Id = id }, cancellationToken);
    }

    public async Task<bool> NameExistsAsync(string name, long? excludingId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("sp_Unit_NameExists", new { Name = name, ExcludingId = excludingId }, commandType: System.Data.CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<bool>(command);
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
