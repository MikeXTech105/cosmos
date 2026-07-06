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
[Route("api/v1/oee/machines")]
public sealed class OeeMachinesController(IOeeService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(OeePermissions.Machines, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<OeeMachineDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] OeeMasterListQuery query, CancellationToken ct) => FromResponse(await service.GetMachinesAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(OeePermissions.Machines, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<OeeMachineDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetMachineAsync(id, ct));

    [HttpPost]
    [RequirePermission(OeePermissions.Machines, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<OeeMachineDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateOeeMachineRequest request, CancellationToken ct) => FromResponse(await service.CreateMachineAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(OeePermissions.Machines, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<OeeMachineDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateOeeMachineRequest request, CancellationToken ct) => FromResponse(await service.UpdateMachineAsync(id, request, ct));

    [HttpDelete("{id:long}")]
    [RequirePermission(OeePermissions.Machines, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) => FromResponse(await service.DeleteMachineAsync(id, ct));
}
