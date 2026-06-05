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

public sealed class UnitService : IUnitService
{
    private readonly IUnitRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly ILogger<UnitService> _logger;
    private readonly IValidator<CreateUnitCommand> _createValidator;
    private readonly IValidator<UpdateUnitCommand> _updateValidator;
    private readonly IValidator<GetUnitsQuery> _getListValidator;

    public UnitService(
        IUnitRepository repository,
        IAuditRepository auditRepository,
        ILogger<UnitService> logger,
        IValidator<CreateUnitCommand> createValidator,
        IValidator<UpdateUnitCommand> updateValidator,
        IValidator<GetUnitsQuery> getListValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _getListValidator = getListValidator;
    }

    public async Task<ApiResponse<UnitDto>> GetByIdAsync(GetUnitByIdQuery query, CancellationToken cancellationToken) =>
        ApiResponse<UnitDto>.Success(await _repository.GetByIdAsync(query.Id, cancellationToken) ?? throw new NotFoundException("Unit was not found."));

    public async Task<ApiResponse<PagedResult<UnitListItemDto>>> GetListAsync(GetUnitsQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_getListValidator, query, cancellationToken);
        return ApiResponse<PagedResult<UnitListItemDto>>.Success(await _repository.GetListAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<UnitDto>> CreateAsync(CreateUnitCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, command, cancellationToken);
        var created = await _repository.CreateAsync(command, cancellationToken);
        _logger.LogInformation("Created unit {UnitId} named {UnitName}.", created.Id, created.Name);
        await _auditRepository.AddAsync(new AuditEntryRequest("Units", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<UnitDto>.Success(created, "Unit created.");
    }

    public async Task<ApiResponse<UnitDto>> UpdateAsync(long id, UpdateUnitCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, command, context => context.RootContextData["Id"] = id, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Unit was not found.");
        var updated = await _repository.UpdateAsync(id, command, cancellationToken);
        _logger.LogInformation("Updated unit {UnitId} named {UnitName}.", updated.Id, updated.Name);
        await _auditRepository.AddAsync(new AuditEntryRequest("Units", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<UnitDto>.Success(updated, "Unit updated.");
    }

    public async Task<ApiResponse> DeleteAsync(DeleteUnitCommand command, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(command.Id, cancellationToken) ?? throw new NotFoundException("Unit was not found.");
        var result = await _repository.DeleteAsync(command.Id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        _logger.LogInformation("Deleted unit {UnitId} named {UnitName}.", old.Id, old.Name);
        await _auditRepository.AddAsync(new AuditEntryRequest("Units", command.Id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
