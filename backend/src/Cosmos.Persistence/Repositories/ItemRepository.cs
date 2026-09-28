using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class ItemRepository : IItemRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public ItemRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<ItemDto?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<ItemDto>(connection, "sp_Item_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<PagedResult<ItemListItemDto>> GetListAsync(GetItemsQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<ItemListItemDto>(
            connection,
            "sp_Item_GetList",
            new
            {
                query.Search,
                query.Barcode,
                query.ItemCode,
                query.CategoryId,
                query.ProcurementClassification,
                query.IsActive,
                query.PageNumber,
                query.PageSize,
                query.SortBy,
                query.SortDirection
            },
            cancellationToken);

        var summary = await StoredProcedureExecutor.QuerySingleOrDefaultAsync<ItemListSummaryDto>(
            connection,
            "sp_Item_GetListSummary",
            new { query.Search, query.Barcode, query.ItemCode, query.CategoryId, query.ProcurementClassification, query.IsActive },
            cancellationToken) ?? new ItemListSummaryDto(0, 0, 0, 0);
        return new PagedResult<ItemListItemDto>(rows, query.PageNumber, query.PageSize, summary.TotalCount, summary);
    }

    public async Task<ItemDto> CreateAsync(CreateItemCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<ItemDto>(connection, "sp_Item_Create", ItemParameters(command), cancellationToken);
    }

    public async Task<ItemDto> UpdateAsync(long id, UpdateItemCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = ItemParameters(command);
        parameters.Add("Id", id);
        return await StoredProcedureExecutor.QueryWithStatusAsync<ItemDto>(connection, "sp_Item_Update", parameters, cancellationToken);
    }

    public async Task<OperationResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Item_Delete", new { Id = id }, cancellationToken);
    }

    public async Task<bool> ItemCodeExistsAsync(string itemCode, long? excludingId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("sp_Item_ItemCodeExists", new { ItemCode = itemCode, ExcludingId = excludingId }, commandType: System.Data.CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<bool>(command);
    }

    public async Task<bool> CategoryExistsAsync(long categoryId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("sp_Category_Exists", new { Id = categoryId }, commandType: System.Data.CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<bool>(command);
    }

    public async Task<bool> UnitExistsAsync(long unitId, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("sp_Unit_Exists", new { Id = unitId }, commandType: System.Data.CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<bool>(command);
    }

    private static DynamicParameters ItemParameters(CreateItemCommand command)
    {
        var parameters = new DynamicParameters();
        AddItemParameters(parameters, command);
        return parameters;
    }

    private static DynamicParameters ItemParameters(UpdateItemCommand command)
    {
        var parameters = new DynamicParameters();
        AddItemParameters(parameters, command);
        return parameters;
    }

    private static void AddItemParameters(DynamicParameters parameters, dynamic command)
    {
        parameters.Add("Name", command.Name?.Trim());
        parameters.Add("ItemCode", command.ItemCode?.Trim());
        parameters.Add("Barcode", TrimToNull(command.Barcode));
        parameters.Add("CategoryId", command.CategoryId);
        parameters.Add("UnitId", command.UnitId);
        parameters.Add("ItemType", command.ItemType);
        parameters.Add("ProcurementClassification", command.ProcurementClassification);
        parameters.Add("PurchasePrice", command.PurchasePrice);
        parameters.Add("SalesPrice", command.SalesPrice);
        parameters.Add("HSNCode", TrimToNull(command.HSNCode));
        parameters.Add("GSTRate", command.GSTRate);
        parameters.Add("TrackInventory", command.TrackInventory);
        parameters.Add("IsManufactured", command.IsManufactured);
        parameters.Add("OpeningStock", command.OpeningStock);
        parameters.Add("OpeningStockValue", command.OpeningStockValue);
        parameters.Add("CurrentStock", command.CurrentStock);
        parameters.Add("ReservedStock", command.ReservedStock);
        parameters.Add("MinimumStock", command.MinimumStock);
        parameters.Add("Description", TrimToNull(command.Description));
        parameters.Add("ImageUrl", TrimToNull(command.ImageUrl));
        parameters.Add("IsActive", command.IsActive);
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
