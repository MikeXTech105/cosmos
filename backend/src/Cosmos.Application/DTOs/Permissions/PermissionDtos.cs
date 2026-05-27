namespace Cosmos.Application.DTOs.Permissions;

public sealed record UpsertRolePermissionRequest(
    Guid RoleId,
    Guid? PageId,
    Guid? SectionId,
    Guid? FieldId,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanFullAccess);

public sealed record PermissionResponse(
    Guid Id,
    Guid RoleId,
    Guid? PageId,
    Guid? SectionId,
    Guid? FieldId,
    string PermissionKey,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanFullAccess);
