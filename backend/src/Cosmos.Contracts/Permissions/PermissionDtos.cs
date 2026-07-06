namespace Cosmos.Contracts.Permissions;

public sealed record PermissionDto(
    int RoleId,
    int PageId,
    string PageName,
    string DisplayName,
    string Route,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanExport,
    bool CanApprove);

public sealed record PermissionUpsertDto(
    int PageId,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanExport,
    bool CanApprove);

public sealed record SaveRolePermissionsRequest(IReadOnlyCollection<PermissionUpsertDto> Permissions);
