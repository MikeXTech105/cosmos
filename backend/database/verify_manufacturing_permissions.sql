/* Read-only Manufacturing authorization diagnosis. Change @UserId only for another account. */
SET NOCOUNT ON;
DECLARE @UserId INT = 1;

SELECT u.Id AS UserId, u.Username, u.IsSystemUser, u.IsActive
FROM dbo.Users u
WHERE u.Id = @UserId;

SELECT r.Id AS RoleId, r.Name AS RoleName, r.IsSystemRole
FROM dbo.UserRoles ur
JOIN dbo.Roles r ON r.Id = ur.RoleId
WHERE ur.UserId = @UserId;

SELECT ur.UserId, ur.RoleId, r.Name AS RoleName
FROM dbo.UserRoles ur
JOIN dbo.Roles r ON r.Id = ur.RoleId
WHERE ur.UserId = @UserId;

SELECT p.Id AS PageId, p.Name, p.DisplayName, p.Route, p.IsActive
FROM dbo.Pages p
WHERE p.Name IN (N'Manufacturing', N'Manufacturing.Boms', N'Manufacturing.Productions')
ORDER BY p.SortOrder, p.Name;

SELECT r.Name AS RoleName, p.Name AS PageName, rp.CanView, rp.CanCreate, rp.CanEdit, rp.CanDelete, rp.CanExport, rp.CanApprove
FROM dbo.Roles r
JOIN dbo.RolePermissions rp ON rp.RoleId = r.Id
JOIN dbo.Pages p ON p.Id = rp.PageId
WHERE r.Name = N'SuperAdmin'
  AND p.Name IN (N'Manufacturing', N'Manufacturing.Boms', N'Manufacturing.Productions')
ORDER BY p.Name;

;WITH RequiredPermissions AS
(
    SELECT N'Manufacturing' AS PageName, N'View' AS PermissionAction, CAST(1 AS bit) AS RequiredValue
    UNION ALL SELECT N'Manufacturing.Boms', N'View', 1
    UNION ALL SELECT N'Manufacturing.Boms', N'Create', 1
    UNION ALL SELECT N'Manufacturing.Boms', N'Edit', 1
    UNION ALL SELECT N'Manufacturing.Boms', N'Delete', 1
    UNION ALL SELECT N'Manufacturing.Productions', N'View', 1
    UNION ALL SELECT N'Manufacturing.Productions', N'Create', 1
    UNION ALL SELECT N'Manufacturing.Productions', N'Edit', 1
)
SELECT required.PageName, required.PermissionAction,
       CASE WHEN p.Id IS NULL THEN N'MISSING PAGE'
            WHEN rp.RoleId IS NULL THEN N'MISSING ROLE PERMISSION'
            WHEN (required.PermissionAction = N'View' AND rp.CanView = 1)
              OR (required.PermissionAction = N'Create' AND rp.CanCreate = 1)
              OR (required.PermissionAction = N'Edit' AND rp.CanEdit = 1)
              OR (required.PermissionAction = N'Delete' AND rp.CanDelete = 1) THEN N'PRESENT'
            ELSE N'MISSING ACTION' END AS Status
FROM RequiredPermissions required
LEFT JOIN dbo.Pages p ON p.Name = required.PageName AND p.IsActive = 1
LEFT JOIN dbo.Roles r ON r.Name = N'SuperAdmin'
LEFT JOIN dbo.RolePermissions rp ON rp.RoleId = r.Id AND rp.PageId = p.Id
ORDER BY required.PageName, required.PermissionAction;

SELECT CAST(CASE WHEN EXISTS
(
    SELECT 1 FROM dbo.Users u
    JOIN dbo.UserRoles ur ON ur.UserId = u.Id
    JOIN dbo.Roles r ON r.Id = ur.RoleId
    WHERE u.Id = @UserId AND u.IsSystemUser = 1 AND u.IsActive = 1 AND u.IsDeleted = 0 AND r.IsSystemRole = 1 AND r.IsActive = 1
) THEN 1 ELSE 0 END AS bit) AS IsProtectedSystemOwner;

;WITH RequiredProcedures AS
(
    SELECT N'sp_ManufacturingBom_GetById' AS ProcedureName UNION ALL
    SELECT N'sp_ManufacturingBom_GetList' UNION ALL
    SELECT N'sp_ManufacturingBom_Create' UNION ALL
    SELECT N'sp_ManufacturingBom_Update' UNION ALL
    SELECT N'sp_ManufacturingBom_Activate' UNION ALL
    SELECT N'sp_ManufacturingBom_Deactivate' UNION ALL
    SELECT N'sp_ManufacturingBom_Delete' UNION ALL
    SELECT N'sp_ManufacturingProduction_GetById' UNION ALL
    SELECT N'sp_ManufacturingProduction_GetList' UNION ALL
    SELECT N'sp_ManufacturingProduction_Create' UNION ALL
    SELECT N'sp_ManufacturingProduction_Update' UNION ALL
    SELECT N'sp_ManufacturingProduction_Post' UNION ALL
    SELECT N'sp_ManufacturingProduction_Cancel'
)
SELECT required.ProcedureName,
       CASE WHEN procedureObject.object_id IS NULL THEN N'MISSING' ELSE N'PRESENT' END AS Status
FROM RequiredProcedures required
LEFT JOIN sys.procedures procedureObject ON procedureObject.name = required.ProcedureName
ORDER BY required.ProcedureName;
