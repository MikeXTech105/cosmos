using Cosmos.Application.Abstractions.Security;
using Cosmos.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase(ICurrentUserService currentUserService) : ControllerBase
{
    protected Guid? CurrentUserId => currentUserService.UserId;

    protected ActionResult<ApiResponse<T>> Success<T>(T data, string message = "Request completed successfully") =>
        Ok(ApiResponse<T>.Ok(data, message));

    protected ActionResult<ApiResponse<object>> SuccessMessage(string message) =>
        Ok(ApiResponse<object>.Ok(null, message));
}
