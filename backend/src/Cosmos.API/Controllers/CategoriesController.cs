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
[Tags("Masters")]
[ApiExplorerSettings(GroupName = "masters")]
[Route("api/categories")]
public sealed class CategoriesController : ApiControllerBase
{
    private readonly ICategoryService _service;

    public CategoriesController(ICategoryService service) => _service = service;

    /// <summary>Gets a paginated category list.</summary>
    [HttpGet]
    [RequirePermission("Categories", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<CategoryListItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList([FromQuery] GetCategoriesQuery query, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetListAsync(query, cancellationToken));

    /// <summary>Gets a category by id.</summary>
    [HttpGet("{id:long}")]
    [RequirePermission("Categories", PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.GetByIdAsync(new GetCategoryByIdQuery(id), cancellationToken));

    /// <summary>Creates a category.</summary>
    [HttpPost]
    [RequirePermission("Categories", PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateCategoryCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.CreateAsync(command, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates a category.</summary>
    [HttpPut("{id:long}")]
    [RequirePermission("Categories", PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, UpdateCategoryCommand command, CancellationToken cancellationToken) =>
        FromResponse(await _service.UpdateAsync(id, command, cancellationToken));

    /// <summary>Soft deletes a category.</summary>
    [HttpDelete("{id:long}")]
    [RequirePermission("Categories", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken) =>
        FromResponse(await _service.DeleteAsync(new DeleteCategoryCommand(id), cancellationToken));
}
