using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Pages;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[Authorize]
//[Tags("Settings")]
[ApiExplorerSettings(GroupName = "settings")]
[Route("api/pages")]
public sealed class PagesController : ApiControllerBase
{
    private readonly IPageService _service;

    public PagesController(IPageService service) => _service = service;

    /// <summary>Gets ERP navigation pages.</summary>
    [HttpGet]
    [RequirePermission("Pages", PermissionAction.View)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) => FromResponse(await _service.GetAllAsync(cancellationToken));

    /// <summary>Gets a page by id.</summary>
    [HttpGet("{id:int}")]
    [RequirePermission("Pages", PermissionAction.View)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => FromResponse(await _service.GetByIdAsync(id, cancellationToken));

    /// <summary>Creates an ERP navigation page.</summary>
    [HttpPost]
    [RequirePermission("Pages", PermissionAction.Create)]
    public async Task<IActionResult> Create(CreatePageRequest request, CancellationToken cancellationToken) => FromResponse(await _service.CreateAsync(request, cancellationToken), StatusCodes.Status201Created);

    /// <summary>Updates an ERP navigation page.</summary>
    [HttpPut("{id:int}")]
    [RequirePermission("Pages", PermissionAction.Edit)]
    public async Task<IActionResult> Update(int id, UpdatePageRequest request, CancellationToken cancellationToken) => FromResponse(await _service.UpdateAsync(id, request, cancellationToken));

    /// <summary>Deletes an ERP navigation page.</summary>
    [HttpDelete("{id:int}")]
    [RequirePermission("Pages", PermissionAction.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) => FromResponse(await _service.DeleteAsync(id, cancellationToken));
}
