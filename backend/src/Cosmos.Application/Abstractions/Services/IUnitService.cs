using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IUnitService
{
    Task<ApiResponse<UnitDto>> GetByIdAsync(GetUnitByIdQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<UnitListItemDto>>> GetListAsync(GetUnitsQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<UnitDto>> CreateAsync(CreateUnitCommand command, CancellationToken cancellationToken);
    Task<ApiResponse<UnitDto>> UpdateAsync(long id, UpdateUnitCommand command, CancellationToken cancellationToken);
    Task<ApiResponse> DeleteAsync(DeleteUnitCommand command, CancellationToken cancellationToken);
}
