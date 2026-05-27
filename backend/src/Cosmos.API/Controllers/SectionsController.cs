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
public sealed class SectionsController(ISectionService sectionService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpGet]
    [HasPermission("SECTIONS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<PagedResult<SectionResponse>>>> GetAll([FromQuery] SectionQueryParameters query, CancellationToken cancellationToken) =>
        Success(await sectionService.GetPagedAsync(query, cancellationToken), "Sections fetched successfully");

    [HttpGet("{id:guid}")]
    [HasPermission("SECTIONS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<SectionResponse>>> GetById(Guid id, CancellationToken cancellationToken) =>
        Success(await sectionService.GetByIdAsync(id, cancellationToken), "Section fetched successfully");

    [HttpPost]
    [HasPermission("SECTIONS_PAGE_CREATE")]
    public async Task<ActionResult<ApiResponse<Guid>>> Create(CreateSectionRequest request, CancellationToken cancellationToken) =>
        Success(await sectionService.CreateAsync(request, CurrentUserId, cancellationToken), "Section created successfully");

    [HttpPut("{id:guid}")]
    [HasPermission("SECTIONS_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Update(Guid id, UpdateSectionRequest request, CancellationToken cancellationToken)
    {
        await sectionService.UpdateAsync(id, request, CurrentUserId, cancellationToken);
        return SuccessMessage("Section updated successfully");
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("SECTIONS_PAGE_DELETE")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await sectionService.DeleteAsync(id, CurrentUserId, cancellationToken);
        return SuccessMessage("Section deleted successfully");
    }
}
