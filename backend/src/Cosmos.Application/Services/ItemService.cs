using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class ItemService : IItemService
{
    private readonly IItemRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly ILogger<ItemService> _logger;
    private readonly IValidator<CreateItemCommand> _createValidator;
    private readonly IValidator<UpdateItemCommand> _updateValidator;
    private readonly IValidator<GetItemsQuery> _getListValidator;

    public ItemService(
        IItemRepository repository,
        IAuditRepository auditRepository,
        ILogger<ItemService> logger,
        IValidator<CreateItemCommand> createValidator,
        IValidator<UpdateItemCommand> updateValidator,
        IValidator<GetItemsQuery> getListValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _getListValidator = getListValidator;
    }

    public async Task<ApiResponse<ItemDto>> GetByIdAsync(GetItemByIdQuery query, CancellationToken cancellationToken) =>
        ApiResponse<ItemDto>.Success(await _repository.GetByIdAsync(query.Id, cancellationToken) ?? throw new NotFoundException("Item was not found."));

    public async Task<ApiResponse<PagedResult<ItemListItemDto>>> GetListAsync(GetItemsQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_getListValidator, query, cancellationToken);
        return ApiResponse<PagedResult<ItemListItemDto>>.Success(await _repository.GetListAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<ItemDto>> CreateAsync(CreateItemCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, command, cancellationToken);
        var created = await _repository.CreateAsync(command, cancellationToken);
        _logger.LogInformation("Created item {ItemId} with code {ItemCode}.", created.Id, created.ItemCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Items", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<ItemDto>.Success(created, "Item created.");
    }

    public async Task<ApiResponse<ItemDto>> UpdateAsync(long id, UpdateItemCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, command, context => context.RootContextData["Id"] = id, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Item was not found.");
        var updated = await _repository.UpdateAsync(id, command, cancellationToken);
        _logger.LogInformation("Updated item {ItemId} with code {ItemCode}.", updated.Id, updated.ItemCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Items", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<ItemDto>.Success(updated, "Item updated.");
    }

    public async Task<ApiResponse> DeleteAsync(DeleteItemCommand command, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(command.Id, cancellationToken) ?? throw new NotFoundException("Item was not found.");
        var result = await _repository.DeleteAsync(command.Id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        _logger.LogInformation("Deleted item {ItemId} with code {ItemCode}.", old.Id, old.ItemCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Items", command.Id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
