using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName = "sales"), Route("api/v1/sales/invoices")]
public sealed class InvoiceInventoryOwnershipController(IPhysicalInventoryService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:long}/inventory-ownership"), RequirePermission("Sales.Invoice", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PhysicalOwnershipSnapshot>), 200)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.ReadAsync(id, "invoice", ct));
    [HttpPut("{id:long}/inventory-ownership"), RequirePermission("Sales.Invoice", PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Ownership(long id, InvoiceOwnershipRequest r, CancellationToken ct) => FromResponse(await service.InvoiceOwnershipAsync(id, r, ct));
}

[Authorize, ApiExplorerSettings(GroupName = "shipment-operations"), Route("api/v1/shipment-operations/shipments")]
public sealed class ShipmentInvoiceOwnershipController(IPhysicalInventoryService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:long}/packing-verification"),RequirePermission(ShipmentOperationsPermissions.Shipments,PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PhysicalOwnershipSnapshot>),200)]
    public async Task<IActionResult> PackingContext(long id,CancellationToken ct) => FromResponse(await service.ReadAsync(id,"packing",ct));
    [HttpPut("{id:long}/packing-verification"),RequirePermission(ShipmentOperationsPermissions.Shipments,PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>),200)]
    public async Task<IActionResult> VerifyPacking(long id,ShipmentPackingVerificationRequest r,CancellationToken ct) => FromResponse(await service.VerifyPackingAsync(id,r,ct));
    [HttpGet("{id:long}/invoice-lines"), RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.View)]
    [RequirePermission("Sales.Invoice", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PhysicalOwnershipSnapshot>), 200)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.ReadAsync(id, "shipment", ct));
    [HttpPut("{id:long}/invoice-lines"), RequirePermission(ShipmentOperationsPermissions.Shipments, PermissionAction.Approve)]
    [RequirePermission("Sales.Invoice", PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionCommandResult>), 200)]
    public async Task<IActionResult> Links(long id, ShipmentInvoiceLinkRequest r, CancellationToken ct) => FromResponse(await service.ShipmentLinksAsync(id, r, ct));
}
