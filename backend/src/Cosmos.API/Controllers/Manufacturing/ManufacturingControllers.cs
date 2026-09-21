using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName="manufacturing"), Route("api/v1/manufacturing/boms")]
public sealed class ManufacturingBomsController(IManufacturingService service):ApiControllerBase
{
 [HttpGet,RequirePermission(ManufacturingPermissions.Boms,PermissionAction.View)] public async Task<IActionResult> List([FromQuery] ManufacturingBomQuery q,CancellationToken ct)=>FromResponse(await service.GetBomsAsync(q,ct));
 [HttpGet("{id:long}"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.View)] public async Task<IActionResult> Get(long id,CancellationToken ct)=>FromResponse(await service.GetBomAsync(id,ct));
 [HttpPost,RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Create)] public async Task<IActionResult> Create(CreateManufacturingBomRequest r,CancellationToken ct)=>FromResponse(await service.CreateBomAsync(r,ct),201);
 [HttpPut("{id:long}"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Edit)] public async Task<IActionResult> Update(long id,UpdateManufacturingBomRequest r,CancellationToken ct)=>FromResponse(await service.UpdateBomAsync(id,r,ct));
 [HttpDelete("{id:long}"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Delete)] public async Task<IActionResult> Delete(long id,CancellationToken ct)=>FromResponse(await service.DeleteBomAsync(id,ct));
 [HttpPost("{id:long}/activate"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Edit)] public async Task<IActionResult> Activate(long id,CancellationToken ct)=>FromResponse(await service.SetBomStatusAsync(id,true,ct));
 [HttpPost("{id:long}/deactivate"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Edit)] public async Task<IActionResult> Deactivate(long id,CancellationToken ct)=>FromResponse(await service.SetBomStatusAsync(id,false,ct));
}
[Authorize, ApiExplorerSettings(GroupName="manufacturing"), Route("api/v1/manufacturing/productions")]
public sealed class ManufacturingProductionsController(IManufacturingService service):ApiControllerBase
{
 [HttpGet,RequirePermission(ManufacturingPermissions.Productions,PermissionAction.View)] public async Task<IActionResult> List([FromQuery] ManufacturingProductionQuery q,CancellationToken ct)=>FromResponse(await service.GetProductionsAsync(q,ct));
 [HttpGet("{id:long}"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.View)] public async Task<IActionResult> Get(long id,CancellationToken ct)=>FromResponse(await service.GetProductionAsync(id,ct));
 [HttpPost,RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Create)] public async Task<IActionResult> Create(CreateManufacturingProductionRequest r,CancellationToken ct)=>FromResponse(await service.CreateProductionAsync(r,ct),201);
 [HttpPut("{id:long}"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Edit)] public async Task<IActionResult> Update(long id,UpdateManufacturingProductionRequest r,CancellationToken ct)=>FromResponse(await service.UpdateProductionAsync(id,r,ct));
 [HttpPost("{id:long}/post"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Edit)] public async Task<IActionResult> Post(long id,CancellationToken ct)=>FromResponse(await service.PostProductionAsync(id,ct));
 [HttpPost("{id:long}/cancel"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Edit)] public async Task<IActionResult> Cancel(long id,CancelManufacturingProductionRequest r,CancellationToken ct)=>FromResponse(await service.CancelProductionAsync(id,r,ct));
}
