using Cosmos.Domain.Common;

namespace Cosmos.Domain.Entities;

public class RolePermission : AuditableEntity
{
    public Guid RoleId { get; init; }
    public Guid? PageId { get; init; }
    public Guid? SectionId { get; init; }
    public Guid? FieldId { get; init; }
    public string PermissionKey { get; init; } = string.Empty;
    public bool CanView { get; init; }
    public bool CanCreate { get; init; }
    public bool CanEdit { get; init; }
    public bool CanDelete { get; init; }
    public bool CanFullAccess { get; init; }
}
