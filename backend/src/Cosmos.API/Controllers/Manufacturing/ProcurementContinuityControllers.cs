using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName = "procurement-planning"), Route("api/v1/procurement-planning")]
public sealed class ProcurementContinuityController(IPhysicalInventoryService service) : ProductionWorkspaceApiControllerBase
{
    [HttpPost("plans/runs/{id:long}/purchase-orders")]
    [RequirePermission(ProcurementPlanningPermissions.PlanningHistory, PermissionAction.Approve)]
    [RequirePermission("PurchaseExpense.PurchaseOrder", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> Purchase(long id, ProcurementPurchaseDraftRequest r, CancellationToken ct) => FromResponse(await service.PurchaseDraftAsync(id,r,ct));

    [HttpGet("items/{id:long}/supplier-policy"), RequirePermission(ProcurementPlanningPermissions.Settings,PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProcurementSupplierPolicyDto>),200)]
    public async Task<IActionResult> Get(long id,CancellationToken ct) => FromResponse(await service.SupplierPolicyAsync(id,null,ct));
    [HttpPut("items/{id:long}/supplier-policy"), RequirePermission(ProcurementPlanningPermissions.Settings,PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProcurementSupplierPolicyDto>),200)]
    public async Task<IActionResult> Save(long id,ProcurementSupplierPolicyRequest r,CancellationToken ct) => FromResponse(await service.SupplierPolicyAsync(id,r,ct));
}

[Authorize, ApiExplorerSettings(GroupName = "Purchase & Expense"), Route("api/purchase-orders/supplier-performance")]
public sealed class PurchaseSupplierPerformanceController(IPhysicalInventoryService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet,RequirePermission("PurchaseExpense.PurchaseOrder",PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<SupplierPerformanceLine>>),200)]
    public async Task<IActionResult> Get([FromQuery] SupplierPerformanceQuery q,CancellationToken ct) => FromResponse(await service.SupplierPerformanceAsync(q,ct));
}
