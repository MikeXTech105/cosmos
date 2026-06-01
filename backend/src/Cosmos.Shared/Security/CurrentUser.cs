using System.Security.Claims;

namespace Cosmos.Shared.Security;

public interface ICurrentUser
{
    int? UserId { get; }
    string? Username { get; }
    string? Email { get; }
}

public sealed class CurrentUser : ICurrentUser
{
    private readonly ClaimsPrincipal? _principal;

    public CurrentUser(ClaimsPrincipal? principal)
    {
        _principal = principal;
    }

    public int? UserId => int.TryParse(_principal?.FindFirst("UserId")?.Value, out var value) ? value : null;
    public string? Username => _principal?.FindFirst("Username")?.Value;
    public string? Email => _principal?.FindFirst("Email")?.Value;
}
