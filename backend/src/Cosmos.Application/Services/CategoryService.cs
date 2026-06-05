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

public sealed class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly ILogger<CategoryService> _logger;
    private readonly IValidator<CreateCategoryCommand> _createValidator;
    private readonly IValidator<UpdateCategoryCommand> _updateValidator;
    private readonly IValidator<GetCategoriesQuery> _getListValidator;

    public CategoryService(
        ICategoryRepository repository,
        IAuditRepository auditRepository,
        ILogger<CategoryService> logger,
        IValidator<CreateCategoryCommand> createValidator,
        IValidator<UpdateCategoryCommand> updateValidator,
        IValidator<GetCategoriesQuery> getListValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _getListValidator = getListValidator;
    }

    public async Task<ApiResponse<CategoryDto>> GetByIdAsync(GetCategoryByIdQuery query, CancellationToken cancellationToken) =>
        ApiResponse<CategoryDto>.Success(await _repository.GetByIdAsync(query.Id, cancellationToken) ?? throw new NotFoundException("Category was not found."));

    public async Task<ApiResponse<PagedResult<CategoryListItemDto>>> GetListAsync(GetCategoriesQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_getListValidator, query, cancellationToken);
        return ApiResponse<PagedResult<CategoryListItemDto>>.Success(await _repository.GetListAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, command, cancellationToken);
        var created = await _repository.CreateAsync(command, cancellationToken);
        _logger.LogInformation("Created category {CategoryId} named {CategoryName}.", created.Id, created.Name);
        await _auditRepository.AddAsync(new AuditEntryRequest("Categories", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<CategoryDto>.Success(created, "Category created.");
    }

    public async Task<ApiResponse<CategoryDto>> UpdateAsync(long id, UpdateCategoryCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, command, context => context.RootContextData["Id"] = id, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Category was not found.");
        var updated = await _repository.UpdateAsync(id, command, cancellationToken);
        _logger.LogInformation("Updated category {CategoryId} named {CategoryName}.", updated.Id, updated.Name);
        await _auditRepository.AddAsync(new AuditEntryRequest("Categories", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<CategoryDto>.Success(updated, "Category updated.");
    }

    public async Task<ApiResponse> DeleteAsync(DeleteCategoryCommand command, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(command.Id, cancellationToken) ?? throw new NotFoundException("Category was not found.");
        var result = await _repository.DeleteAsync(command.Id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        _logger.LogInformation("Deleted category {CategoryId} named {CategoryName}.", old.Id, old.Name);
        await _auditRepository.AddAsync(new AuditEntryRequest("Categories", command.Id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
