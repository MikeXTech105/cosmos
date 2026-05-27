namespace Cosmos.Domain.Common;

/// <summary>
/// Base type for PostgreSQL-backed entities with audit and soft-delete columns.
/// </summary>
public abstract class AuditableEntity
{
    public Guid Id { get; init; }
    public bool IsActive { get; init; }
    public bool IsDeleted { get; init; }
    public DateTime CreatedAt { get; init; }
    public Guid? CreatedBy { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public Guid? UpdatedBy { get; init; }
}
