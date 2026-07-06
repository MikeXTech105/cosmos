using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Parties;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class PartySettingsService : IPartySettingsService
{
    private readonly IPartySettingsRepository _repository;
    private readonly IAuditRepository _auditRepository;
    private readonly IValidator<UpdatePartySettingsCommand> _validator;

    public PartySettingsService(IPartySettingsRepository repository, IAuditRepository auditRepository, IValidator<UpdatePartySettingsCommand> validator)
    {
        _repository = repository;
        _auditRepository = auditRepository;
        _validator = validator;
    }

    public async Task<ApiResponse<PartySettingsDto>> GetAsync(GetPartySettingsQuery query, CancellationToken cancellationToken) =>
        ApiResponse<PartySettingsDto>.Success(await _repository.GetAsync(cancellationToken));

    public async Task<ApiResponse<PartySettingsDto>> UpdateAsync(UpdatePartySettingsCommand command, CancellationToken cancellationToken)
    {
        await ValidationRunner.ValidateAsync(_validator, command, cancellationToken);
        var old = await _repository.GetAsync(cancellationToken);
        var updated = await _repository.UpdateAsync(command, cancellationToken);
        await _auditRepository.AddAsync(new AuditEntryRequest("PartySettings", updated.Id.ToString(), "Update", AuditSerializer.Serialize(old), AuditSerializer.Serialize(updated), null), cancellationToken);
        return ApiResponse<PartySettingsDto>.Success(updated, "Party settings updated.");
    }
}
