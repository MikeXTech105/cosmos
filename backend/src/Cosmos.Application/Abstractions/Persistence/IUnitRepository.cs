using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IUnitRepository
{
    Task<UnitDto?> GetByIdAsync(long id, CancellationToken cancellationToken);
    Task<PagedResult<UnitListItemDto>> GetListAsync(GetUnitsQuery query, CancellationToken cancellationToken);
    Task<UnitDto> CreateAsync(CreateUnitCommand command, CancellationToken cancellationToken);
    Task<UnitDto> UpdateAsync(long id, UpdateUnitCommand command, CancellationToken cancellationToken);
    Task<OperationResult> DeleteAsync(long id, CancellationToken cancellationToken);
    Task<bool> NameExistsAsync(string name, long? excludingId, CancellationToken cancellationToken);
}
