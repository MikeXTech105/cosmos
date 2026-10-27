using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName="manufacturing"), Route("api/v1/manufacturing/boms")]
public sealed class ProductionBomEffectivityController(IProductionWorkspaceService service):ProductionWorkspaceApiControllerBase
{
    [HttpPost("{id:long}/effectivity"),RequirePermission(ManufacturingPermissions.Boms,PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> End(long id,ProductionEffectivityRequest r,CancellationToken ct)=>FromResponse(await service.EndEffectivityAsync("bom",id,r,ct));
}
