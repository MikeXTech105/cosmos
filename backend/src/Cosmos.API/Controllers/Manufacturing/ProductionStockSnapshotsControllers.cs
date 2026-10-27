using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize,ApiExplorerSettings(GroupName="manufacturing"),Route("api/v1/manufacturing/planning/snapshots")]
public sealed class ProductionSnapshotsController(IProductionWorkspaceService service):ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:guid}"),RequirePermission(ManufacturingPermissions.Orders,PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<FinishedPlanningSnapshotPage>),200)]
    public async Task<IActionResult> Get(Guid id,[FromQuery] ProductionWorkspaceQuery q,CancellationToken ct) => FromResponse(await service.SnapshotAsync(id,q,ct));
}

[Authorize,ApiExplorerSettings(GroupName="manufacturing"),Route("api/items")]
public sealed class ProductionStockAdjustmentsController(IProductionWorkspaceService service):ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:long}/stock-balance"),RequirePermission("Items",PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<StockBalanceDto>),200)]
    public async Task<IActionResult> Get(long id,CancellationToken ct) => FromResponse(await service.StockAsync(id,ct));
    [HttpPost("{id:long}/stock-adjustments"),RequirePermission("Items",PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> Adjust(long id,StockAdjustmentRequest r,CancellationToken ct) => FromResponse(await service.AdjustStockAsync(id,r,ct));
}
