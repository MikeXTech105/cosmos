using Cosmos.Domain.Common;

namespace Cosmos.Domain.Entities;

public class RefreshToken : AuditableEntity
{
    public Guid UserId { get; init; }
    public string TokenHash { get; init; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
    public DateTime? RevokedAt { get; init; }
    public bool IsRevoked => RevokedAt.HasValue;
}
