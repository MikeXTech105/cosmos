using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Responses;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName="manufacturing"), Route("api/v1/manufacturing/boms")]
public sealed class ManufacturingBomsController(IManufacturingService service):ProductionWorkspaceApiControllerBase
{
 [ProducesResponseType(typeof(ApiResponse<PagedResult<ManufacturingBomListItemDto>>),200)]
 [HttpGet,RequirePermission(ManufacturingPermissions.Boms,PermissionAction.View)] public async Task<IActionResult> List([FromQuery] ManufacturingBomQuery q,CancellationToken ct)=>FromResponse(await service.GetBomsAsync(q,ct));
 [ProducesResponseType(typeof(ApiResponse<ManufacturingBomDto>),200)]
 [HttpGet("applicable"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.View)] public async Task<IActionResult> Applicable([FromQuery] ApplicableManufacturingBomQuery q,CancellationToken ct)=>FromResponse(await service.GetApplicableBomAsync(q,ct));
 [ProducesResponseType(typeof(ApiResponse<ManufacturingBomDto>),200)]
 [HttpGet("{id:long}"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.View)] public async Task<IActionResult> Get(long id,CancellationToken ct)=>FromResponse(await service.GetBomAsync(id,ct));
 [ProducesResponseType(typeof(ApiResponse<ManufacturingBomDto>),201)]
 [HttpPost,RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Create)] public async Task<IActionResult> Create(CreateManufacturingBomRequest r,CancellationToken ct)=>FromResponse(await service.CreateBomAsync(r,ct),201);
 [ProducesResponseType(typeof(ApiResponse<ManufacturingBomDto>),200)]
 [HttpPut("{id:long}"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Edit)] public async Task<IActionResult> Update(long id,UpdateManufacturingBomRequest r,CancellationToken ct)=>FromResponse(await service.UpdateBomAsync(id,r,ct));
 [ProducesResponseType(typeof(ApiResponse),200)]
 [HttpDelete("{id:long}"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Delete)] public async Task<IActionResult> Delete(long id,CancellationToken ct)=>FromResponse(await service.DeleteBomAsync(id,ct));
 [ProducesResponseType(typeof(ApiResponse),200)]
 [HttpPost("{id:long}/activate"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Edit)] public async Task<IActionResult> Activate(long id,CancellationToken ct)=>FromResponse(await service.SetBomStatusAsync(id,true,ct));
 [ProducesResponseType(typeof(ApiResponse),200)]
 [HttpPost("{id:long}/deactivate"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Edit)] public async Task<IActionResult> Deactivate(long id,CancellationToken ct)=>FromResponse(await service.SetBomStatusAsync(id,false,ct));
}
[Authorize, ApiExplorerSettings(GroupName="manufacturing"), Route("api/v1/manufacturing/productions")]
public sealed class ManufacturingProductionsController(IManufacturingService service):ProductionWorkspaceApiControllerBase
{
 [ProducesResponseType(typeof(ApiResponse<PagedResult<ManufacturingProductionListItemDto>>),200)]
 [HttpGet,RequirePermission(ManufacturingPermissions.Productions,PermissionAction.View)] public async Task<IActionResult> List([FromQuery] ManufacturingProductionQuery q,CancellationToken ct)=>FromResponse(await service.GetProductionsAsync(q,ct));
 [ProducesResponseType(typeof(ApiResponse<ManufacturingProductionDto>),200)]
 [HttpGet("{id:long}"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.View)] public async Task<IActionResult> Get(long id,CancellationToken ct)=>FromResponse(await service.GetProductionAsync(id,ct));
 [ProducesResponseType(typeof(ApiResponse<ManufacturingProductionDto>),201)]
 [HttpPost,RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Create)] public async Task<IActionResult> Create(CreateManufacturingProductionRequest r,CancellationToken ct)=>FromResponse(await service.CreateProductionAsync(r,ct),201);
 [ProducesResponseType(typeof(ApiResponse<ManufacturingProductionDto>),200)]
 [HttpPut("{id:long}"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Edit)] public async Task<IActionResult> Update(long id,UpdateManufacturingProductionRequest r,CancellationToken ct)=>FromResponse(await service.UpdateProductionAsync(id,r,ct));
 [ProducesResponseType(typeof(ApiResponse),200)]
 [HttpPost("{id:long}/post"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Approve)] public async Task<IActionResult> Post(long id,CancellationToken ct)=>FromResponse(await service.PostProductionAsync(id,ct));
 [ProducesResponseType(typeof(ApiResponse),200)]
 [HttpPost("{id:long}/cancel"),RequirePermission(ManufacturingPermissions.Productions,PermissionAction.Approve)] public async Task<IActionResult> Cancel(long id,CancelManufacturingProductionRequest r,CancellationToken ct)=>FromResponse(await service.CancelProductionAsync(id,r,ct));
}
