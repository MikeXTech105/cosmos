namespace Cosmos.Application.Abstractions.Security;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    string? RoleName { get; }
    bool IsAuthenticated { get; }
}
