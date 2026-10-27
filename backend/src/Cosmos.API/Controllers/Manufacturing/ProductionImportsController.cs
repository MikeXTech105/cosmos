using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[Authorize, ApiExplorerSettings(GroupName = "manufacturing"), Route("api/v1/manufacturing/imports")]
public sealed class ProductionImportsController(IProductionWorkspaceService service) : ProductionWorkspaceApiControllerBase
{
    [HttpGet("{id:guid}/preview"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportPreview>), 200)]
    public async Task<IActionResult> Preview(Guid id, [FromQuery] ProductionWorkspaceQuery q, CancellationToken ct) => FromResponse(await service.ImportPreviewAsync(id, q, ct));
    [HttpPost("{id:guid}/map"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportResult>), 200)]
    public async Task<IActionResult> Map(Guid id, ProductionImportMappingRequest r, CancellationToken ct) => FromResponse(await service.MapImportAsync(id, r, ct));
    [HttpPost("{id:guid}/validate"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportResult>), 200)]
    public async Task<IActionResult> Validate(Guid id, ProductionImportActionRequest r, CancellationToken ct) => FromResponse(await service.ImportActionAsync(id, "validate", r, ct));
    [HttpPost("{id:guid}/reconcile"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportResult>), 200)]
    public async Task<IActionResult> Reconcile(Guid id, ProductionImportActionRequest r, CancellationToken ct) => FromResponse(await service.ImportActionAsync(id, "reconcile", r, ct));
    [HttpPost("{id:guid}/approve"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportResult>), 200)]
    public async Task<IActionResult> Approve(Guid id, ProductionImportActionRequest r, CancellationToken ct) => FromResponse(await service.ImportActionAsync(id, "approve", r, ct));
    [HttpPost("{id:guid}/post"), RequirePermission(ManufacturingPermissions.Orders, PermissionAction.Approve)]
    [ProducesResponseType(typeof(ApiResponse<ProductionImportResult>), 200)]
    public async Task<IActionResult> Post(Guid id, ProductionImportActionRequest r, CancellationToken ct) => FromResponse(await service.ImportActionAsync(id, "post", r, ct));
}
