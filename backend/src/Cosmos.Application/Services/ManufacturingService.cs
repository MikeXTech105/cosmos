using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
namespace Cosmos.Application.Services;

public sealed class ManufacturingService(IManufacturingRepository repository, ICurrentUser user) : IManufacturingService
{
    private long? UserId => user.UserId;
    public Task<ApiResponse<PagedResult<ManufacturingBomListItemDto>>> GetBomsAsync(ManufacturingBomQuery q, CancellationToken ct) => Wrap(repository.GetBomsAsync(q, ct));
    public async Task<ApiResponse<ManufacturingBomDto>> GetBomAsync(long id, CancellationToken ct) => ApiResponse<ManufacturingBomDto>.Success(await Bom(id, ct));
    public async Task<ApiResponse<ManufacturingBomDto>> CreateBomAsync(CreateManufacturingBomRequest r, CancellationToken ct) { Validate(r.Components, r.EffectiveFrom, r.EffectiveTo); return ApiResponse<ManufacturingBomDto>.Success(await repository.CreateBomAsync(r, UserId, ct), "Manufacturing BOM created."); }
    public async Task<ApiResponse<ManufacturingBomDto>> UpdateBomAsync(long id, UpdateManufacturingBomRequest r, CancellationToken ct) { Validate(r.Components, r.EffectiveFrom, r.EffectiveTo); return ApiResponse<ManufacturingBomDto>.Success(await repository.UpdateBomAsync(id, r, UserId, ct), "Manufacturing BOM updated."); }
    public async Task<ApiResponse> SetBomStatusAsync(long id, bool active, CancellationToken ct) { await repository.SetBomStatusAsync(id, active, UserId, ct); return ApiResponse.Success(active ? "Manufacturing BOM activated." : "Manufacturing BOM deactivated."); }
    public async Task<ApiResponse> DeleteBomAsync(long id, CancellationToken ct) { await repository.DeleteBomAsync(id, UserId, ct); return ApiResponse.Success("Manufacturing BOM deleted."); }
    public Task<ApiResponse<PagedResult<ManufacturingProductionListItemDto>>> GetProductionsAsync(ManufacturingProductionQuery q, CancellationToken ct) => Wrap(repository.GetProductionsAsync(q, ct));
    public async Task<ApiResponse<ManufacturingProductionDto>> GetProductionAsync(long id, CancellationToken ct) => ApiResponse<ManufacturingProductionDto>.Success(await Production(id, ct));
    public async Task<ApiResponse<ManufacturingProductionDto>> CreateProductionAsync(CreateManufacturingProductionRequest r, CancellationToken ct) { Quantity(r.PlannedQuantity, r.ProducedQuantity); return ApiResponse<ManufacturingProductionDto>.Success(await repository.CreateProductionAsync(r, UserId, ct), "Manufacturing production draft created."); }
    public async Task<ApiResponse<ManufacturingProductionDto>> UpdateProductionAsync(long id, UpdateManufacturingProductionRequest r, CancellationToken ct) { Quantity(r.PlannedQuantity, r.ProducedQuantity); return ApiResponse<ManufacturingProductionDto>.Success(await repository.UpdateProductionAsync(id, r, UserId, ct), "Manufacturing production updated."); }
    public async Task<ApiResponse> PostProductionAsync(long id, CancellationToken ct) { await repository.PostProductionAsync(id, UserId, ct); return ApiResponse.Success("Manufacturing production posted."); }
    public async Task<ApiResponse> CancelProductionAsync(long id, CancelManufacturingProductionRequest r, CancellationToken ct) { if(string.IsNullOrWhiteSpace(r.Reason)) throw new CosmosException("Cancellation reason is required."); await repository.CancelProductionAsync(id,r.Reason,UserId,ct); return ApiResponse.Success("Manufacturing production cancelled."); }
    private async Task<ManufacturingBomDto> Bom(long id,CancellationToken ct)=>await repository.GetBomAsync(id,ct)??throw new NotFoundException("Manufacturing BOM was not found.");
    private async Task<ManufacturingProductionDto> Production(long id,CancellationToken ct)=>await repository.GetProductionAsync(id,ct)??throw new NotFoundException("Manufacturing production was not found.");
    private static async Task<ApiResponse<T>> Wrap<T>(Task<T> t) => ApiResponse<T>.Success(await t);
    private static void Quantity(decimal planned,decimal produced){if(planned<0||produced<=0)throw new CosmosException("Planned quantity must be non-negative and produced quantity must be greater than zero.");}
    private static void Validate(IReadOnlyCollection<ManufacturingBomComponentRequest> c,DateOnly from,DateOnly? to){if(c.Count==0)throw new CosmosException("A BOM must contain at least one component.");if(to is not null&&to<from)throw new CosmosException("EffectiveTo cannot be earlier than EffectiveFrom.");if(c.Any(x=>x.Quantity<=0||x.WastagePercentage<0||x.WastagePercentage>100)||c.Select(x=>x.ComponentItemId).Distinct().Count()!=c.Count)throw new CosmosException("Components must have unique items, positive quantities, and wastage between 0 and 100.");}
}
