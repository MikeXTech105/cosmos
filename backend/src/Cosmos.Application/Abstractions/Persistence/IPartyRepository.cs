using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Parties;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IPartyRepository
{
    Task<PartyDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PagedResult<PartyListItemDto>> GetListAsync(GetPartiesQuery query, CancellationToken cancellationToken);
    Task<PartyDto> CreateAsync(CreatePartyCommand command, CancellationToken cancellationToken);
    Task<PartyDto> UpdateAsync(Guid id, UpdatePartyCommand command, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<OperationResult> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken);
}
