using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IManufacturingRepository
{
    Task<PagedResult<ManufacturingBomListItemDto>> GetBomsAsync(ManufacturingBomQuery query, CancellationToken ct);
    Task<ManufacturingBomDto?> GetBomAsync(long id, CancellationToken ct);
    Task<ManufacturingBomDto> CreateBomAsync(CreateManufacturingBomRequest request, long? userId, CancellationToken ct);
    Task<ManufacturingBomDto> UpdateBomAsync(long id, UpdateManufacturingBomRequest request, long? userId, CancellationToken ct);
    Task SetBomStatusAsync(long id, bool active, long? userId, CancellationToken ct);
    Task DeleteBomAsync(long id, long? userId, CancellationToken ct);
    Task<PagedResult<ManufacturingProductionListItemDto>> GetProductionsAsync(ManufacturingProductionQuery query, CancellationToken ct);
    Task<ManufacturingProductionDto?> GetProductionAsync(long id, CancellationToken ct);
    Task<ManufacturingProductionDto> CreateProductionAsync(CreateManufacturingProductionRequest request, long? userId, CancellationToken ct);
    Task<ManufacturingProductionDto> UpdateProductionAsync(long id, UpdateManufacturingProductionRequest request, long? userId, CancellationToken ct);
    Task PostProductionAsync(long id, long? userId, CancellationToken ct);
    Task CancelProductionAsync(long id, string reason, long? userId, CancellationToken ct);
}
