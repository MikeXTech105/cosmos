using Asp.Versioning;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Auth;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers;

/// <summary>
/// Handles login, token refresh, logout, and current user profile.
/// </summary>
[ApiVersion(1.0)]
public sealed class AuthController(IAuthService authService, ICurrentUserService currentUserService)
    : ApiControllerBase(currentUserService)
{
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginRequest request, CancellationToken cancellationToken) =>
        Success(await authService.LoginAsync(request, cancellationToken), "Login successful");

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken(RefreshTokenRequest request, CancellationToken cancellationToken) =>
        Success(await authService.RefreshTokenAsync(request, cancellationToken), "Token refreshed successfully");

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> Logout(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        await authService.LogoutAsync(request, cancellationToken);
        return SuccessMessage("Logged out successfully");
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<CurrentUserResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> Me(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId ?? throw new UnauthorizedApiException();
        return Success(await authService.GetCurrentUserAsync(userId, cancellationToken), "Current user fetched successfully");
    }
}
