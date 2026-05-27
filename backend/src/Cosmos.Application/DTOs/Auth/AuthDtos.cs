namespace Cosmos.Application.DTOs.Auth;

/// <summary>
/// Login payload accepted by the authentication endpoint.
/// </summary>
public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record TokenResult(string AccessToken, DateTime ExpiresAt);

public sealed record AuthResponse(
    Guid UserId,
    string Email,
    string FullName,
    string RoleName,
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt,
    IReadOnlyCollection<string> Permissions);

public sealed record CurrentUserResponse(
    Guid UserId,
    string Email,
    string FullName,
    string RoleName,
    IReadOnlyCollection<string> Permissions);
