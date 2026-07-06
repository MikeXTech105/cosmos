using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId => int.TryParse(User.FindFirst("UserId")?.Value, out var value) ? value : 0;

    protected IActionResult FromResponse<T>(ApiResponse<T> response, int successStatusCode = StatusCodes.Status200OK) =>
        StatusCode(response.Succeeded ? successStatusCode : StatusCodes.Status400BadRequest, response);

    protected IActionResult FromResponse(ApiResponse response, int successStatusCode = StatusCodes.Status200OK) =>
        StatusCode(response.Succeeded ? successStatusCode : StatusCodes.Status400BadRequest, response);
}
