using Asp.Versioning;
using Cosmos.API.Authorization;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Users;
using Cosmos.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[ApiVersion(1.0)]
[Authorize]
public sealed class UsersController(IUserService userService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpGet]
    [HasPermission("USERS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<PagedResult<UserResponse>>>> GetAll([FromQuery] UserQueryParameters query, CancellationToken cancellationToken) =>
        Success(await userService.GetPagedAsync(query, cancellationToken), "Users fetched successfully");

    [HttpGet("{id:guid}")]
    [HasPermission("USERS_PAGE_VIEW")]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetById(Guid id, CancellationToken cancellationToken) =>
        Success(await userService.GetByIdAsync(id, cancellationToken), "User fetched successfully");

    [HttpPost]
    [HasPermission("USERS_PAGE_CREATE")]
    public async Task<ActionResult<ApiResponse<Guid>>> Create(CreateUserRequest request, CancellationToken cancellationToken) =>
        Success(await userService.CreateAsync(request, CurrentUserId, cancellationToken), "User created successfully");

    [HttpPut("{id:guid}")]
    [HasPermission("USERS_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Update(Guid id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        await userService.UpdateAsync(id, request, CurrentUserId, cancellationToken);
        return SuccessMessage("User updated successfully");
    }

    [HttpPatch("{id:guid}/status")]
    [HasPermission("USERS_PAGE_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> SetStatus(Guid id, UpdateUserStatusRequest request, CancellationToken cancellationToken)
    {
        await userService.SetActiveStatusAsync(id, request.IsActive, CurrentUserId, cancellationToken);
        return SuccessMessage("User status updated successfully");
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("USERS_PAGE_DELETE")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await userService.DeleteAsync(id, CurrentUserId, cancellationToken);
        return SuccessMessage("User deleted successfully");
    }
}
