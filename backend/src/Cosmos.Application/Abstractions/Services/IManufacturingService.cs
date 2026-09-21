using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Responses;
namespace Cosmos.Application.Abstractions.Services;
public interface IManufacturingService
{
 Task<ApiResponse<PagedResult<ManufacturingBomListItemDto>>> GetBomsAsync(ManufacturingBomQuery q,CancellationToken ct); Task<ApiResponse<ManufacturingBomDto>> GetBomAsync(long id,CancellationToken ct); Task<ApiResponse<ManufacturingBomDto>> CreateBomAsync(CreateManufacturingBomRequest r,CancellationToken ct); Task<ApiResponse<ManufacturingBomDto>> UpdateBomAsync(long id,UpdateManufacturingBomRequest r,CancellationToken ct); Task<ApiResponse> SetBomStatusAsync(long id,bool active,CancellationToken ct); Task<ApiResponse> DeleteBomAsync(long id,CancellationToken ct);
 Task<ApiResponse<PagedResult<ManufacturingProductionListItemDto>>> GetProductionsAsync(ManufacturingProductionQuery q,CancellationToken ct); Task<ApiResponse<ManufacturingProductionDto>> GetProductionAsync(long id,CancellationToken ct); Task<ApiResponse<ManufacturingProductionDto>> CreateProductionAsync(CreateManufacturingProductionRequest r,CancellationToken ct); Task<ApiResponse<ManufacturingProductionDto>> UpdateProductionAsync(long id,UpdateManufacturingProductionRequest r,CancellationToken ct); Task<ApiResponse> PostProductionAsync(long id,CancellationToken ct); Task<ApiResponse> CancelProductionAsync(long id,CancelManufacturingProductionRequest r,CancellationToken ct);
}
