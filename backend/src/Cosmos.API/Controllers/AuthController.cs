using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Auth;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Cosmos.API.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly IAuthService _service;

    public AuthController(IAuthService service) => _service = service;

    /// <summary>Authenticates a Cosmos ERP user.</summary>
    /// <remarks>JWT contains only UserId, Username, and Email. Roles, pages, and permissions are returned in the response and must be treated as database-sourced authorization state.</remarks>
    [AllowAnonymous]
    [HttpPost("login")]
    [SwaggerOperation(Summary = "Login", Description = "Verifies BCrypt password hash, creates a 15-minute JWT access token, creates a 30-day refresh token, and returns roles plus page permissions.")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.LoginAsync(request, cancellationToken));

    /// <summary>Rotates a refresh token and issues a new access token.</summary>
    [AllowAnonymous]
    [HttpPost("refresh-token")]
    [SwaggerOperation(Summary = "Refresh token", Description = "Validates the refresh token from SQL Server, revokes it, and issues a rotated refresh token.")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RefreshToken(RefreshTokenRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.RefreshTokenAsync(request, cancellationToken));

    /// <summary>Revokes an active refresh token.</summary>
    [Authorize]
    [HttpPost("logout")]
    [SwaggerOperation(Summary = "Logout", Description = "Revokes the supplied refresh token.")]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.LogoutAsync(request, cancellationToken));

    /// <summary>Changes the password for the authenticated user.</summary>
    [Authorize]
    [HttpPost("change-password")]
    [SwaggerOperation(Summary = "Change password", Description = "Requires a valid JWT and verifies the current password before storing a new BCrypt hash.")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.ChangePasswordAsync(CurrentUserId, request, cancellationToken));

    /// <summary>Generates a reset token for a registered email address.</summary>
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [SwaggerOperation(Summary = "Forgot password", Description = "Creates a short-lived password reset token. Production email delivery can subscribe to this operation.")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.ForgotPasswordAsync(request, cancellationToken));

    /// <summary>Resets a password using a valid reset token.</summary>
    [AllowAnonymous]
    [HttpPost("reset-password")]
    [SwaggerOperation(Summary = "Reset password", Description = "Validates the password reset token and stores a new BCrypt hash.")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken) =>
        FromResponse(await _service.ResetPasswordAsync(request, cancellationToken));
}
