using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Manufacturing;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
namespace Cosmos.Application.Services;

public sealed class ManufacturingService(IManufacturingRepository repository, ICurrentUser user, IAuditRepository audit, IValidator<CreateManufacturingBomRequest> bomValidator, IValidator<CreateManufacturingProductionRequest> productionValidator) : IManufacturingService
{
    private long? UserId => user.UserId;
    public Task<ApiResponse<PagedResult<ManufacturingBomListItemDto>>> GetBomsAsync(ManufacturingBomQuery q, CancellationToken ct) => Wrap(repository.GetBomsAsync(q, ct));
    public async Task<ApiResponse<ManufacturingBomDto>> GetBomAsync(long id, CancellationToken ct) => ApiResponse<ManufacturingBomDto>.Success(await Bom(id, ct));
    public async Task<ApiResponse<ManufacturingBomDto>> GetApplicableBomAsync(ApplicableManufacturingBomQuery q, CancellationToken ct)
    {
        if (q.FinishedItemId <= 0) throw new CosmosException("Finished item is required.");
        var bom = await repository.GetApplicableBomAsync(q.FinishedItemId, q.AsOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow), ct);
        if (bom is null) throw new NotFoundException("No active effective Manufacturing BOM was found for the finished item.");
        return ApiResponse<ManufacturingBomDto>.Success(bom);
    }
    public async Task<ApiResponse<ManufacturingBomDto>> CreateBomAsync(CreateManufacturingBomRequest r, CancellationToken ct) { await ValidationRunner.ValidateAsync(bomValidator,r,ct); if (string.IsNullOrWhiteSpace(r.Version)) throw new CosmosException("Manufacturing BOM version is required."); Validate(r.Components, r.EffectiveFrom, r.EffectiveTo); if(r.OutputBaseQuantity is <= 0 || (r.OutputBaseQuantity is decimal basis && !ProductionCalculations.IsPostingQuantity(basis))) throw new CosmosException("BOM output base quantity must be positive."); var saved=await repository.CreateBomAsync(r, UserId, ct); await Audit("ManufacturingBoms",saved.Id,"Create",null,saved,ct); return ApiResponse<ManufacturingBomDto>.Success(saved, "Manufacturing BOM created."); }
    public async Task<ApiResponse<ManufacturingBomDto>> UpdateBomAsync(long id, UpdateManufacturingBomRequest r, CancellationToken ct) { Validate(r.Components, r.EffectiveFrom, r.EffectiveTo); if(r.OutputBaseQuantity is <= 0 || (r.OutputBaseQuantity is decimal basis && !ProductionCalculations.IsPostingQuantity(basis))) throw new CosmosException("BOM output base quantity must be positive."); var before=await Bom(id,ct);var saved=await repository.UpdateBomAsync(id, r, UserId, ct);await Audit("ManufacturingBoms",id,"Update",before,saved,ct); return ApiResponse<ManufacturingBomDto>.Success(saved, "Manufacturing BOM updated."); }
    public async Task<ApiResponse> SetBomStatusAsync(long id, bool active, CancellationToken ct) { await repository.SetBomStatusAsync(id, active, UserId, ct); return ApiResponse.Success(active ? "Manufacturing BOM activated." : "Manufacturing BOM deactivated."); }
    public async Task<ApiResponse> DeleteBomAsync(long id, CancellationToken ct) { await repository.DeleteBomAsync(id, UserId, ct); return ApiResponse.Success("Manufacturing BOM deleted."); }
    public Task<ApiResponse<PagedResult<ManufacturingProductionListItemDto>>> GetProductionsAsync(ManufacturingProductionQuery q, CancellationToken ct) => Wrap(repository.GetProductionsAsync(q, ct));
    public async Task<ApiResponse<ManufacturingProductionDto>> GetProductionAsync(long id, CancellationToken ct) => ApiResponse<ManufacturingProductionDto>.Success(await Production(id, ct));
    public async Task<ApiResponse<ManufacturingProductionDto>> CreateProductionAsync(CreateManufacturingProductionRequest r, CancellationToken ct) { await ValidationRunner.ValidateAsync(productionValidator,r,ct); Date(r.ProductionDate, "Production date"); Quantity(r.PlannedQuantity, r.ProducedQuantity); return ApiResponse<ManufacturingProductionDto>.Success(await repository.CreateProductionAsync(r, UserId, ct), "Manufacturing production draft created."); }
    public async Task<ApiResponse<ManufacturingProductionDto>> UpdateProductionAsync(long id, UpdateManufacturingProductionRequest r, CancellationToken ct) { Date(r.ProductionDate, "Production date"); Quantity(r.PlannedQuantity, r.ProducedQuantity); return ApiResponse<ManufacturingProductionDto>.Success(await repository.UpdateProductionAsync(id, r, UserId, ct), "Manufacturing production updated."); }
    public async Task<ApiResponse> PostProductionAsync(long id, CancellationToken ct) { var before=await Production(id,ct);await repository.PostProductionAsync(id, UserId, ct); await Audit("ManufacturingProductions",id,"Post",before,null,ct);return ApiResponse.Success("Manufacturing production posted."); }
    public async Task<ApiResponse> CancelProductionAsync(long id, CancelManufacturingProductionRequest r, CancellationToken ct) { if(string.IsNullOrWhiteSpace(r.Reason)) throw new CosmosException("Cancellation reason is required."); await repository.CancelProductionAsync(id,r.Reason,UserId,ct); return ApiResponse.Success("Manufacturing production cancelled."); }
    private async Task<ManufacturingBomDto> Bom(long id,CancellationToken ct)=>await repository.GetBomAsync(id,ct)??throw new NotFoundException("Manufacturing BOM was not found.");
    private async Task<ManufacturingProductionDto> Production(long id,CancellationToken ct)=>await repository.GetProductionAsync(id,ct)??throw new NotFoundException("Manufacturing production was not found.");
    private static async Task<ApiResponse<T>> Wrap<T>(Task<T> t) => ApiResponse<T>.Success(await t);
    private static void Quantity(decimal planned,decimal produced){if(planned<0||produced<=0||!ProductionCalculations.IsPostingQuantity(planned)||!ProductionCalculations.IsPostingQuantity(produced))throw new CosmosException("Planned quantity must be non-negative and produced quantity must be greater than zero.");}
    private static void Validate(IReadOnlyCollection<ManufacturingBomComponentRequest> c,DateOnly from,DateOnly? to){Date(from, "Effective from date");if(c.Count==0)throw new CosmosException("A BOM must contain at least one component.");if(to is not null&&to<from)throw new CosmosException("EffectiveTo cannot be earlier than EffectiveFrom.");if(c.Any(x=>x.Quantity<=0||!ProductionCalculations.IsPostingQuantity(x.Quantity)||!ProductionCalculations.IsPostingQuantity(x.WastagePercentage)||x.WastagePercentage<0||x.WastagePercentage>100)||c.Select(x=>x.ComponentItemId).Distinct().Count()!=c.Count)throw new CosmosException("Components must have unique items, positive quantities, and wastage between 0 and 100.");}
    private static void Date(DateOnly value,string name){if(value==default)throw new CosmosException($"{name} is required.");}
    private Task Audit(string table,long id,string action,object? before,object? after,CancellationToken ct)=>audit.AddAsync(new AuditEntryRequest(table,id.ToString(),action,before is null?null:AuditSerializer.Serialize(before),after is null?null:AuditSerializer.Serialize(after),UserId is null?null:checked((int)UserId.Value)),ct);
}
