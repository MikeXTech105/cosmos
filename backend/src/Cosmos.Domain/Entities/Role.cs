using Cosmos.Domain.Common;

namespace Cosmos.Domain.Entities;

public class Role : AuditableEntity
{
    public string RoleName { get; init; } = string.Empty;
    public string? Description { get; init; }
}
