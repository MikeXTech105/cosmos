using Cosmos.Application.Parties.Commands;
using Cosmos.Contracts.Parties;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IPartySettingsRepository
{
    Task<PartySettingsDto> GetAsync(CancellationToken cancellationToken);
    Task<PartySettingsDto> UpdateAsync(UpdatePartySettingsCommand command, CancellationToken cancellationToken);
}
