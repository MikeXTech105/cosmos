using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Gst;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Cosmos.API.Controllers;
[Authorize,ApiExplorerSettings(GroupName="gst"),Route("api/v1/gst/invoices/{invoiceId:long:min(1)}/snapshots")]
[RequirePermission("Sales.Invoice",PermissionAction.View)]
public sealed class GstComplianceSnapshotsController(IGstComplianceSnapshotService service):ApiControllerBase
{
    [HttpGet("preparation"),RequirePermission("GST.EInvoice",PermissionAction.View)]
    public async Task<IActionResult> Read(long invoiceId,CancellationToken ct)=>FromResponse(await service.ReadAsync(invoiceId,ct));
    [HttpPost("prepare"),RequirePermission("GST.EInvoice",PermissionAction.Create)]
    public async Task<IActionResult> Prepare(long invoiceId,GstPrepareSnapshotRequest request,CancellationToken ct)=>FromResponse(await service.PrepareAsync(invoiceId,request,ct),201);
    [HttpGet("preparations/{requestKey:guid}"),RequirePermission("GST.EInvoice",PermissionAction.View)]
    public async Task<IActionResult> GetPrepared(long invoiceId,Guid requestKey,CancellationToken ct)=>FromResponse(await service.GetPreparedAsync(invoiceId,requestKey,ct));
}
