using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Parties;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class PartyService : IPartyService
{
    private readonly IPartyRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IValidator<CreatePartyCommand> _createValidator;
    private readonly IValidator<UpdatePartyCommand> _updateValidator;
    private readonly IValidator<GetPartiesQuery> _getListValidator;
    private readonly IValidator<ChangePartyStatusCommand> _statusValidator;

    public PartyService(
        IPartyRepository repository,
        IAuditRepository auditRepository,
        IValidator<CreatePartyCommand> createValidator,
        IValidator<UpdatePartyCommand> updateValidator,
        IValidator<GetPartiesQuery> getListValidator,
        IValidator<ChangePartyStatusCommand> statusValidator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _getListValidator = getListValidator;
        _statusValidator = statusValidator;
    }

    public async Task<ApiResponse<PartyDto>> GetByIdAsync(GetPartyByIdQuery query, CancellationToken cancellationToken) =>
        ApiResponse<PartyDto>.Success(await _repository.GetByIdAsync(query.Id, cancellationToken) ?? throw new NotFoundException("Party was not found."));

    public async Task<ApiResponse<PagedResult<PartyListItemDto>>> GetListAsync(GetPartiesQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_getListValidator, query, cancellationToken);
        return ApiResponse<PagedResult<PartyListItemDto>>.Success(await _repository.GetListAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PartyExportDto>>> ExportAsync(GetPartiesQuery query, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_getListValidator, query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PartyExportDto>>.Success(await _repository.ExportAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PartyDto>> CreateAsync(CreatePartyCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_createValidator, command, cancellationToken);
        var created = await _repository.CreateAsync(command, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Parties", created.Id.ToString(), "Create", null, AuditSerializer.Serialize(created), null), cancellationToken);
        return ApiResponse<PartyDto>.Success(created, "Party created.");
    }

    public async Task<ApiResponse<PartyDto>> UpdateAsync(Guid id, UpdatePartyCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, command, cancellationToken);
        var old = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Party was not found.");
        var updated = await _repository.UpdateAsync(id, command, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("Parties", id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<PartyDto>.Success(updated, "Party updated.");
    }

    public async Task<ApiResponse> DeleteAsync(DeletePartyCommand command, CancellationToken cancellationToken)
    {
        var old = await _repository.GetByIdAsync(command.Id, cancellationToken) ?? throw new NotFoundException("Party was not found.");
        var result = await _repository.DeleteAsync(command.Id, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Parties", command.Id.ToString(), "Delete", AuditSerializer.Serialize(old), null, null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }

    public async Task<ApiResponse> ChangeStatusAsync(Guid id, ChangePartyStatusCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_statusValidator, command, cancellationToken);
        var result = await _repository.SetActiveAsync(id, command.IsActive, cancellationToken);
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
        await _auditRepository.AddAsync(new AuditEntryRequest("Parties", id.ToString(), command.IsActive ? "Activate" : "Deactivate", null, AuditSerializer.Serialize(command), null), cancellationToken);
        return ApiResponse.Success(result.Message);
    }
}
