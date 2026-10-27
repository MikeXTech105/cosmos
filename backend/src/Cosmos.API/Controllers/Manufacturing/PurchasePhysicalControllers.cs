using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName = "Purchase & Expense"), Route("api/purchase-orders")]
public sealed class PurchasePhysicalController(IPhysicalInventoryService service) : ProductionWorkspaceApiControllerBase
{
    [HttpPost("{id:long}/close-remainder"),RequirePermission("PurchaseExpense.PurchaseOrder",PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> CloseRemainder(long id,ProductionOrderActionRequest r,CancellationToken ct) => FromResponse(await service.ClosePurchaseRemainderAsync(id,r,ct));
    [HttpPost("{id:long}/approve"),RequirePermission("PurchaseExpense.PurchaseOrder",PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> Approve(long id,ProductionOrderActionRequest r,CancellationToken ct) => FromResponse(await service.ApprovePurchaseAsync(id,r,ct));
    [HttpPost("receipts/returns/{id:long}/credit"),RequirePermission("PurchaseExpense.PurchaseReturn",PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> Credit(long id,PurchaseReceiptCreditRequest r,CancellationToken ct) => FromResponse(await service.ReceiptCreditAsync(id,r,ct));
    [HttpGet("follow-ups"), RequirePermission("PurchaseExpense.PurchaseOrder", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PurchaseFollowupLine>>), 200)]
    public async Task<IActionResult> Followups([FromQuery] PurchaseFollowupQuery q, CancellationToken ct) => FromResponse(await service.FollowupsAsync(q, ct));
    [HttpGet("{id:long}/receipt-context"), RequirePermission("PurchaseExpense.PurchaseOrder", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PurchasePhysicalContext>), 200)]
    public async Task<IActionResult> Order(long id, CancellationToken ct) => FromResponse(await service.PurchaseReadAsync(id, "order", ct));
    [HttpGet("receipts/{id:long}"), RequirePermission("PurchaseExpense.PurchaseOrder", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PurchasePhysicalContext>), 200)]
    public async Task<IActionResult> Receipt(long id, CancellationToken ct) => FromResponse(await service.PurchaseReadAsync(id, "receipt", ct));
    [HttpPost("{id:long}/receipts"), RequirePermission("PurchaseExpense.PurchaseOrder", PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Receive(long id, PurchaseReceiptRequest r, CancellationToken ct) => FromResponse(await service.ReceiptAsync(id, r, ct));
    [HttpPost("receipts/{id:long}/returns"), RequirePermission("PurchaseExpense.PurchaseReturn", PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Return(long id, PurchaseReceiptReturnRequest r, CancellationToken ct) => FromResponse(await service.SupplierReturnAsync(id, r, ct));
    [HttpPost("{id:long}/promise"), RequirePermission("PurchaseExpense.PurchaseOrder", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Promise(long id, PurchasePromiseRequest r, CancellationToken ct) => FromResponse(await service.PromiseAsync(id, r, ct));
}

[Authorize, ApiExplorerSettings(GroupName = "Purchase & Expense"), Route("api/purchase-bills")]
public sealed class PurchaseReceiptBillingController(IPhysicalInventoryService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:long}/receipt-context"), RequirePermission("PurchaseExpense.PurchaseBill", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PurchasePhysicalContext>), 200)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.PurchaseReadAsync(id, "bill", ct));
    [HttpPost("{id:long}/receipt-links"), RequirePermission("PurchaseExpense.PurchaseBill", PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Link(long id, PurchaseReceiptBillLinkRequest r, CancellationToken ct) => FromResponse(await service.BillLinksAsync(id, r, ct));
}
