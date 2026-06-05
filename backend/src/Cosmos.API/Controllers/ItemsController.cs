using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Items.Commands;
using Cosmos.Application.Items.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Items;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
[Route("api/items")]
public sealed class ItemsController : ApiControllerBase
{
    private readonly IItemService _service;

    public ItemsController(IItemService service) => _service = service;

    /// <summary>Gets a paginated item list.</summary>
    [HttpGet]
    [RequirePermission("Items", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ItemListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetItemsQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(query, cancellationToken));

    /// <summary>Gets an item by id.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission("Items", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(new GetItemByIdQuery(id), cancellationToken));

    /// <summary>Creates an item.</summary>
    [HttpPost]
    [RequirePermission("Items", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateItemCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates an item.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission("Items", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateItemCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, command, cancellationToken));

    /// <summary>Soft deletes an item.</summary>
    [HttpDelete("{id:long}")]
    [RequirePermission("Items", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.DeleteAsync(new DeleteItemCommand(id), cancellationToken));
}
