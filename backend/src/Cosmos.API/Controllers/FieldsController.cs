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
public sealed class FieldsController(IFieldService fieldService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpGet]
    [HasPermission("FIELDS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<PagedResult<FieldResponse>>>> GetAll([FromQuery] FieldQueryParameters query, CancellationToken cancellationToken) =>
        Success(await fieldService.GetPagedAsync(query, cancellationToken), "Fields fetched successfully");

    [HttpGet("{id:guid}")]
    [HasPermission("FIELDS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<FieldResponse>>> GetById(Guid id, CancellationToken cancellationToken) =>
        Success(await fieldService.GetByIdAsync(id, cancellationToken), "Field fetched successfully");

    [HttpPost]
    [HasPermission("FIELDS_PAGE_CREATE")]
    public async Task<ActionResult<ApiResponse<Guid>>> Create(CreateFieldRequest request, CancellationToken cancellationToken) =>
        Success(await fieldService.CreateAsync(request, CurrentUserId, cancellationToken), "Field created successfully");

    [HttpPut("{id:guid}")]
    [HasPermission("FIELDS_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Update(Guid id, UpdateFieldRequest request, CancellationToken cancellationToken)
    {
        await fieldService.UpdateAsync(id, request, CurrentUserId, cancellationToken);
        return SuccessMessage("Field updated successfully");
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("FIELDS_PAGE_DELETE")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await fieldService.DeleteAsync(id, CurrentUserId, cancellationToken);
        return SuccessMessage("Field deleted successfully");
    }
}
