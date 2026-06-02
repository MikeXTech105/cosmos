using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Parties;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IPartySettingsService
{
    Task<ApiResponse<PartySettingsDto>> GetAsync(GetPartySettingsQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PartySettingsDto>> UpdateAsync(UpdatePartySettingsCommand command, CancellationToken cancellationToken);
}
