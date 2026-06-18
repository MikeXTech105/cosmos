using Cosmos.API.Security; using Cosmos.Application.Abstractions.Services; using Cosmos.Application.PurchaseExpense; using Cosmos.Domain.Security; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers;
[Authorize, Tags("PurchaseBillsController"), ApiExplorerSettings(GroupName="Purchase & Expense"), Route("api/purchase-bills")]
public sealed class PurchaseBillsController(IPurchaseExpenseService service):ApiControllerBase
{
 [HttpGet,RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.View)] public async Task<IActionResult> List([FromQuery]PurchaseBillListQuery q,CancellationToken ct)=>FromResponse(await service.GetPurchaseBillsAsync(q,ct));
 [HttpGet("{id:long}"),RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.View)] public async Task<IActionResult> Get(long id,CancellationToken ct)=>FromResponse(await service.GetPurchaseBillAsync(id,ct));
 [HttpGet("supplier/{supplierId:guid}"),RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.View)] public async Task<IActionResult> Supplier(Guid supplierId,[FromQuery]PurchaseBillListQuery q,CancellationToken ct)=>FromResponse(await service.GetPurchaseBillsAsync(q with{SupplierId=supplierId},ct));
 [HttpPost,RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.Create)] public async Task<IActionResult> Create(CreatePurchaseBillRequest r,CancellationToken ct)=>FromResponse(await service.CreatePurchaseBillAsync(r,ct),201);
 [HttpPut("{id:long}"),RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.Edit)] public async Task<IActionResult> Update(long id,UpdatePurchaseBillRequest r,CancellationToken ct)=>FromResponse(await service.UpdatePurchaseBillAsync(id,r,ct));
 [HttpDelete("{id:long}"),RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.Delete)] public async Task<IActionResult> Delete(long id,CancellationToken ct)=>FromResponse(await service.DeletePurchaseBillAsync(id,ct));
 [HttpPost("{id:long}/confirm"),RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.Approve)] public async Task<IActionResult> Confirm(long id,CancellationToken ct)=>FromResponse(await service.ConfirmPurchaseBillAsync(id,ct));
 [HttpPost("{id:long}/cancel"),RequirePermission("PurchaseExpense.PurchaseBill",PermissionAction.Delete)] public async Task<IActionResult> Cancel(long id,CancellationToken ct)=>FromResponse(await service.CancelPurchaseBillAsync(id,ct));
}
