using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Parties;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IPartyService
{
    Task<ApiResponse<PartyDto>> GetByIdAsync(GetPartyByIdQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<PartyListItemDto>>> GetListAsync(GetPartiesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PartyExportDto>>> ExportAsync(GetPartiesQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PartyDto>> CreateAsync(CreatePartyCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<PartyDto>> UpdateAsync(Guid id, UpdatePartyCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(DeletePartyCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> ChangeStatusAsync(Guid id, ChangePartyStatusCommand command, CancellationToken cancellationToken);
}
