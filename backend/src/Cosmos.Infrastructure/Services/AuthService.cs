using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DTOs.Auth;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Configuration;
using Cosmos.Infrastructure.Security;
using Cosmos.Shared.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cosmos.Infrastructure.Services;

public sealed class AuthService(
    IAuthRepository authRepository,
    IPermissionRepository permissionRepository,
    IJwtTokenService jwtTokenService,
    IPasswordHasher passwordHasher,
    IOptions<JwtOptions> jwtOptions,
    ILogger<AuthService> logger) : IAuthService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await authRepository.GetUserByEmailAsync(request.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (user is null || !user.IsActive || user.IsDeleted || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            logger.LogWarning("Failed login attempt for {Email}", request.Email);
            throw new UnauthorizedApiException("Invalid email or password.");
        }

        logger.LogInformation("Successful login for user {UserId}", user.Id);
        return await CreateSessionAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenFactory.HashToken(request.RefreshToken);
        var refreshToken = await authRepository.GetRefreshTokenAsync(tokenHash, cancellationToken);
        if (refreshToken is null || refreshToken.IsRevoked || refreshToken.ExpiresAt <= DateTime.UtcNow)
        {
            throw new UnauthorizedApiException("Refresh token is invalid or expired.");
        }

        var user = await authRepository.GetUserByIdAsync(refreshToken.UserId, cancellationToken)
            ?? throw new UnauthorizedApiException("Refresh token user is no longer available.");

        await authRepository.RevokeRefreshTokenAsync(tokenHash, user.Id, cancellationToken);
        return await CreateSessionAsync(user, cancellationToken);
    }

    public async Task LogoutAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenFactory.HashToken(request.RefreshToken);
        await authRepository.RevokeRefreshTokenAsync(tokenHash, null, cancellationToken);
    }

    public async Task<CurrentUserResponse> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await authRepository.GetUserByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User", userId);
        var permissions = await permissionRepository.GetPermissionKeysByUserAsync(user.Id, cancellationToken);
        return new CurrentUserResponse(user.Id, user.Email, $"{user.FirstName} {user.LastName}".Trim(), user.RoleName, permissions);
    }

    private async Task<AuthResponse> CreateSessionAsync(User user, CancellationToken cancellationToken)
    {
        var permissions = await permissionRepository.GetPermissionKeysByUserAsync(user.Id, cancellationToken);
        var accessToken = jwtTokenService.CreateAccessToken(user, permissions);
        var refreshToken = RefreshTokenFactory.CreateToken();
        var refreshTokenHash = RefreshTokenFactory.HashToken(refreshToken);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);

        await authRepository.SaveRefreshTokenAsync(user.Id, refreshTokenHash, refreshExpiresAt, user.Id, cancellationToken);

        return new AuthResponse(
            user.Id,
            user.Email,
            $"{user.FirstName} {user.LastName}".Trim(),
            user.RoleName,
            accessToken.AccessToken,
            accessToken.ExpiresAt,
            refreshToken,
            refreshExpiresAt,
            permissions);
    }
}
