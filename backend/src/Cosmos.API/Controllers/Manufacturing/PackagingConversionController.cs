using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize,ApiExplorerSettings(GroupName="supply-chain"),Route("api/v1/supply-chain/packaging-profiles")]
public sealed class PackagingConversionController(IProductionWorkspaceService service):ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:long}/conversion"),RequirePermission(SupplyChainPermissions.PackagingProfiles,PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PackagingConversionDto>),200)]
    public async Task<IActionResult> Get(long id,CancellationToken ct) => FromResponse(await service.PackagingConversionAsync(id,null,ct));
    [HttpPut("{id:long}/conversion"),RequirePermission(SupplyChainPermissions.PackagingProfiles,PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<PackagingConversionDto>),200)]
    public async Task<IActionResult> Save(long id,PackagingConversionRequest r,CancellationToken ct) => FromResponse(await service.PackagingConversionAsync(id,r,ct));
}
