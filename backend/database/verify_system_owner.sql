/*
    Run after 20260716_system_owner.sql and one successful API startup.
    This script reveals no configured username, email, password, hash, token, or database ID.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF COL_LENGTH(N'dbo.Users', N'IsSystemUser') IS NULL
    THROW 51043, 'Users.IsSystemUser is missing.', 1;

IF COL_LENGTH(N'dbo.Roles', N'IsSystemRole') IS NULL
    THROW 51043, 'Roles.IsSystemRole is missing.', 1;

IF (SELECT COUNT(*) FROM dbo.Users WHERE IsSystemUser = 1) <> 1
    THROW 51043, 'Exactly one protected system user must exist.', 1;

IF (SELECT COUNT(*) FROM dbo.Roles WHERE IsSystemRole = 1) <> 1
    THROW 51043, 'Exactly one protected system role must exist.', 1;

IF
(
    SELECT COUNT(*)
    FROM dbo.Users u
    JOIN dbo.UserRoles ur ON ur.UserId = u.Id
    JOIN dbo.Roles r ON r.Id = ur.RoleId
    WHERE u.IsSystemUser = 1 AND r.IsSystemRole = 1
) <> 1
    THROW 51043, 'The protected system user-role link is invalid.', 1;

IF EXISTS
(
    SELECT 1
    FROM dbo.RolePermissions rp
    JOIN dbo.Roles r ON r.Id = rp.RoleId
    WHERE r.IsSystemRole = 1
)
    THROW 51043, 'The protected system role must not have RolePermissions.', 1;

IF EXISTS
(
    SELECT 1
    FROM dbo.UserRoles ur
    JOIN dbo.Users u ON u.Id = ur.UserId
    JOIN dbo.Roles r ON r.Id = ur.RoleId
    WHERE (u.IsSystemUser = 1 AND r.IsSystemRole = 0)
       OR (u.IsSystemUser = 0 AND r.IsSystemRole = 1)
)
    THROW 51043, 'Protected user-role links contain an invalid assignment.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'UX_Users_OneSystemUser' AND is_unique = 1)
    THROW 51043, 'The unique protected system-user index is missing.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Roles') AND name = N'UX_Roles_OneSystemRole' AND is_unique = 1)
    THROW 51043, 'The unique protected system-role index is missing.', 1;

IF OBJECT_ID(N'dbo.sp_SystemOwner_Provision', N'P') IS NULL
    THROW 51043, 'The System Owner provisioning procedure is missing.', 1;

IF OBJECT_ID(N'dbo.sp_User_IsSystemOwner', N'P') IS NULL
    THROW 51043, 'The System Owner detection procedure is missing.', 1;

SELECT
    CAST(1 AS BIT) AS VerificationPassed,
    N'Protected System Owner schema, uniqueness, linkage, and RolePermissions independence verified.' AS [Message];
