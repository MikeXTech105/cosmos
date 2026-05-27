using Asp.Versioning;
using Cosmos.API.Authorization;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Navigation;
using Cosmos.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[ApiVersion(1.0)]
[Authorize]
public sealed class PagesController(IPageService pageService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpGet]
    [HasPermission("PAGES_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<PagedResult<PageResponse>>>> GetAll([FromQuery] QueryParameters query, CancellationToken cancellationToken) =>
        Success(await pageService.GetPagedAsync(query, cancellationToken), "Pages fetched successfully");

    [HttpGet("{id:guid}")]
    [HasPermission("PAGES_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<PageResponse>>> GetById(Guid id, CancellationToken cancellationToken) =>
        Success(await pageService.GetByIdAsync(id, cancellationToken), "Page fetched successfully");

    [HttpPost]
    [HasPermission("PAGES_PAGE_CREATE")]
    public async Task<ActionResult<ApiResponse<Guid>>> Create(CreatePageRequest request, CancellationToken cancellationToken) =>
        Success(await pageService.CreateAsync(request, CurrentUserId, cancellationToken), "Page created successfully");

    [HttpPut("{id:guid}")]
    [HasPermission("PAGES_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Update(Guid id, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        await pageService.UpdateAsync(id, request, CurrentUserId, cancellationToken);
        return SuccessMessage("Page updated successfully");
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("PAGES_PAGE_DELETE")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await pageService.DeleteAsync(id, CurrentUserId, cancellationToken);
        return SuccessMessage("Page deleted successfully");
    }
}
