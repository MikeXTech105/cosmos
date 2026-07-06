using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Pages;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class PageService : IPageService
{
    private readonly IPageRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IValidator<CreatePageRequest> _createValidator;
    private readonly IValidator<UpdatePageRequest> _updateValidator;

    public PageService(IPageRepository repository, IAuditRepository auditRepository, IValidator<CreatePageRequest> createValidator, IValidator<UpdatePageRequest> updateValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<ApiResponse<IReadOnlyCollection<PageDto>>> GetAllAsync(CancellationToken cancellationToken) =>
        ApiResponse<IReadOnlyCollection<PageDto>>.Success(await _repository.GetAllAsync(cancellationToken));

    public async Task<ApiResponse<PageDto>> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        ApiResponse<PageDto>.Success(await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Page was not found."));

    public async Task<ApiResponse<PageDto>> CreateAsync(CreatePageRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, cancellationToken);
        var page = new Page
        {
            Name = request.Name.Trim(),
            DisplayName = request.DisplayName.Trim(),
            Route = request.Route.Trim(),
            Icon = request.Icon?.Trim(),
            ParentPageId = request.ParentPageId,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive
        };
        var created = await _repository.CreateAsync(page, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Pages", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<PageDto>.Success(created, "Page created.");
    }

    public async Task<ApiResponse<PageDto>> UpdateAsync(int id, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Page was not found.");
        var updated = await _repository.UpdateAsync(id, request, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Pages", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<PageDto>.Success(updated, "Page updated.");
    }

    public async Task<ApiResponse> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Page was not found.");
        var result = await _repository.DeleteAsync(id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Pages", id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
