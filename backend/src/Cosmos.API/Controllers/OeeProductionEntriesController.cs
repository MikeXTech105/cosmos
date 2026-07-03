using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Oee;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Oee;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("OEE")]
[ApiExplorerSettings(GroupName = "OEE")]
[Route("api/v1/oee/production-entries")]
public sealed class OeeProductionEntriesController(IOeeService service) : ApiControllerBase
{
    [HttpPost("bulk")]
    [RequirePermission(OeePermissions.ProductionEntries, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<OeeProductionEntryDto>>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateBulk(BulkCreateOeeProductionEntriesRequest request, CancellationToken ct) =>
        FromResponse(await service.CreateBulkProductionEntriesAsync(request, ct), StatusCodes.Status201Created);

    [HttpGet]
    [RequirePermission(OeePermissions.ProductionEntries, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<OeeProductionEntryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] OeeProductionEntryListQuery query, CancellationToken ct) => FromResponse(await service.GetProductionEntriesAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(OeePermissions.ProductionEntries, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<OeeProductionEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetProductionEntryAsync(id, ct));

    [HttpPut("{id:long}")]
    [RequirePermission(OeePermissions.ProductionEntries, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<OeeProductionEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateOeeProductionEntryRequest request, CancellationToken ct) => FromResponse(await service.UpdateProductionEntryAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(OeePermissions.ProductionEntries, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteProductionEntryAsync(id, ct));
}
