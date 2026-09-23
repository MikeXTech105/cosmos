using System.Data;
using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;
using Dapper;
namespace Cosmos.Persistence.Repositories;
public sealed class ManufacturingRepository(ISqlConnectionFactory factory) : IManufacturingRepository
{
 static ManufacturingRepository()=>TemporalTypeHandlers.Configure();
 public Task<PagedResult<ManufacturingBomListItemDto>> GetBomsAsync(ManufacturingBomQuery q,CancellationToken ct)=>Page<ManufacturingBomListItemDto>("sp_ManufacturingBom_GetList",q,q.PageNumber,q.PageSize,ct);
 public Task<ManufacturingBomDto?> GetBomAsync(long id,CancellationToken ct)=>Detail<ManufacturingBomDto,ManufacturingBomComponentDto>("sp_ManufacturingBom_GetById",id,(h,l)=>h with { Components=l },ct);
 public Task<ManufacturingBomDto> CreateBomAsync(CreateManufacturingBomRequest r,long? u,CancellationToken ct)=>SaveBom("sp_ManufacturingBom_Create",null,r,u,ct);
 public Task<ManufacturingBomDto> UpdateBomAsync(long id,UpdateManufacturingBomRequest r,long? u,CancellationToken ct)=>SaveBom("sp_ManufacturingBom_Update",id,r,u,ct);
 public Task SetBomStatusAsync(long id,bool active,long? u,CancellationToken ct)=>Status(active?"sp_ManufacturingBom_Activate":"sp_ManufacturingBom_Deactivate",new {Id=id,UserId=u},ct);
 public Task DeleteBomAsync(long id,long? u,CancellationToken ct)=>Status("sp_ManufacturingBom_Delete",new {Id=id,UserId=u},ct);
 public Task<PagedResult<ManufacturingProductionListItemDto>> GetProductionsAsync(ManufacturingProductionQuery q,CancellationToken ct)=>Page<ManufacturingProductionListItemDto>("sp_ManufacturingProduction_GetList",q,q.PageNumber,q.PageSize,ct);
 public Task<ManufacturingProductionDto?> GetProductionAsync(long id,CancellationToken ct)=>Detail<ManufacturingProductionDto,ManufacturingProductionMaterialDto>("sp_ManufacturingProduction_GetById",id,(h,l)=>h with { Materials=l },ct);
 public Task<ManufacturingProductionDto> CreateProductionAsync(CreateManufacturingProductionRequest r,long? u,CancellationToken ct)=>SaveProduction("sp_ManufacturingProduction_Create",null,r,u,ct);
 public Task<ManufacturingProductionDto> UpdateProductionAsync(long id,UpdateManufacturingProductionRequest r,long? u,CancellationToken ct)=>SaveProduction("sp_ManufacturingProduction_Update",id,r,u,ct);
 public Task PostProductionAsync(long id,long? u,CancellationToken ct)=>Status("sp_ManufacturingProduction_Post",new {Id=id,UserId=u},ct);
 public Task CancelProductionAsync(long id,string reason,long? u,CancellationToken ct)=>Status("sp_ManufacturingProduction_Cancel",new {Id=id,Reason=reason,UserId=u},ct);
 private async Task<T?> Detail<T,L>(string sp,long id,Func<T,IReadOnlyCollection<L>,T> map,CancellationToken ct){using var c=await factory.CreateOpenConnectionAsync(ct);using var m=await c.QueryMultipleAsync(Cmd(sp,new {Id=id},ct));var h=await m.ReadSingleOrDefaultAsync<T>();return h is null?default:map(h,(await m.ReadAsync<L>()).AsList());}
 private async Task<ManufacturingBomDto> SaveBom(string sp,long? id,object r,long? u,CancellationToken ct){using var c=await factory.CreateOpenConnectionAsync(ct); object p=r is CreateManufacturingBomRequest x?new {x.FinishedItemId,x.Version,x.EffectiveFrom,x.EffectiveTo,x.Notes,x.IsDefault,ComponentsJson=JsonSerializer.Serialize(x.Components),UserId=u}:new {Id=id,EffectiveFrom=((UpdateManufacturingBomRequest)r).EffectiveFrom,EffectiveTo=((UpdateManufacturingBomRequest)r).EffectiveTo,Notes=((UpdateManufacturingBomRequest)r).Notes,IsDefault=((UpdateManufacturingBomRequest)r).IsDefault,ComponentsJson=JsonSerializer.Serialize(((UpdateManufacturingBomRequest)r).Components),UserId=u};using var m=await c.QueryMultipleAsync(Cmd(sp,p,ct));Check(await m.ReadSingleAsync<OperationResult>());var h=await m.ReadSingleAsync<ManufacturingBomDto>();return h with {Components=(await m.ReadAsync<ManufacturingBomComponentDto>()).AsList()};}
 private async Task<ManufacturingProductionDto> SaveProduction(string sp,long? id,object r,long? u,CancellationToken ct){using var c=await factory.CreateOpenConnectionAsync(ct);object p=r is CreateManufacturingProductionRequest x?new {x.ProductionDate,x.FinishedItemId,x.BomId,x.PlannedQuantity,x.ProducedQuantity,x.Notes,x.ReferenceNumber,UserId=u}:new {Id=id,ProductionDate=((UpdateManufacturingProductionRequest)r).ProductionDate,PlannedQuantity=((UpdateManufacturingProductionRequest)r).PlannedQuantity,ProducedQuantity=((UpdateManufacturingProductionRequest)r).ProducedQuantity,Notes=((UpdateManufacturingProductionRequest)r).Notes,ReferenceNumber=((UpdateManufacturingProductionRequest)r).ReferenceNumber,UserId=u};using var m=await c.QueryMultipleAsync(Cmd(sp,p,ct));Check(await m.ReadSingleAsync<OperationResult>());var h=await m.ReadSingleAsync<ManufacturingProductionDto>();return h with {Materials=(await m.ReadAsync<ManufacturingProductionMaterialDto>()).AsList()};}
 private async Task<PagedResult<T>> Page<T>(string sp,object p,int n,int s,CancellationToken ct){using var c=await factory.CreateOpenConnectionAsync(ct);var rows=(await StoredProcedureExecutor.QueryAsync<T>(c,sp,p,ct)).ToArray();var total=rows.FirstOrDefault() is null?0:(int)(typeof(T).GetProperty("TotalCount")?.GetValue(rows[0])??0);return new(rows,n,s,total);}
 private async Task Status(string sp,object p,CancellationToken ct){using var c=await factory.CreateOpenConnectionAsync(ct);Check(await StoredProcedureExecutor.ExecuteStatusAsync(c,sp,p,ct));}
 private static CommandDefinition Cmd(string s,object p,CancellationToken ct)=>new(s,p,commandType:CommandType.StoredProcedure,cancellationToken:ct); private static void Check(OperationResult r){if(!r.Succeeded)throw new CosmosException(r.Message,r.StatusCode,data:new {conflictCode="MANUFACTURING_OPERATION_FAILED"});}
}
