/*
    Protected System Owner / Master Administrator
    Apply after the canonical security schema and before starting the upgraded API.
    Idempotent, non-destructive, and safe to rerun. No credentials or password hashes are stored here.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.Users', N'U') IS NULL OR OBJECT_ID(N'dbo.Roles', N'U') IS NULL
        THROW 51043, 'The Cosmos security schema must exist before applying the System Owner migration.', 1;

    IF COL_LENGTH(N'dbo.Users', N'IsSystemUser') IS NULL
        ALTER TABLE dbo.Users ADD IsSystemUser BIT NOT NULL
            CONSTRAINT DF_Users_IsSystemUser DEFAULT (0) WITH VALUES;

    IF COL_LENGTH(N'dbo.Roles', N'IsSystemRole') IS NULL
        ALTER TABLE dbo.Roles ADD IsSystemRole BIT NOT NULL
            CONSTRAINT DF_Roles_IsSystemRole DEFAULT (0) WITH VALUES;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF (SELECT COUNT_BIG(*) FROM dbo.Users WHERE IsSystemUser = 1) > 1
        THROW 51043, 'More than one protected system user is flagged.', 1;

    IF (SELECT COUNT_BIG(*) FROM dbo.Roles WHERE IsSystemRole = 1) > 1
        THROW 51043, 'More than one protected system role is flagged.', 1;

    IF NOT EXISTS
    (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UX_Users_OneSystemUser' AND object_id = OBJECT_ID(N'dbo.Users')
    )
        CREATE UNIQUE INDEX UX_Users_OneSystemUser
            ON dbo.Users(IsSystemUser) WHERE IsSystemUser = 1;

    IF NOT EXISTS
    (
        SELECT 1 FROM sys.indexes
        WHERE name = N'UX_Roles_OneSystemRole' AND object_id = OBJECT_ID(N'dbo.Roles')
    )
        CREATE UNIQUE INDEX UX_Roles_OneSystemRole
            ON dbo.Roles(IsSystemRole) WHERE IsSystemRole = 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

CREATE OR ALTER VIEW dbo.vw_UserEffectivePermissions
AS
SELECT
    u.Id AS UserId,
    p.Id AS PageId,
    p.Name AS PageName,
    p.DisplayName,
    p.Route,
    p.Icon,
    p.ParentPageId,
    p.SortOrder,
    CAST(MAX(CAST(rp.CanView AS INT)) AS BIT) AS CanView,
    CAST(MAX(CAST(rp.CanCreate AS INT)) AS BIT) AS CanCreate,
    CAST(MAX(CAST(rp.CanEdit AS INT)) AS BIT) AS CanEdit,
    CAST(MAX(CAST(rp.CanDelete AS INT)) AS BIT) AS CanDelete,
    CAST(MAX(CAST(rp.CanExport AS INT)) AS BIT) AS CanExport,
    CAST(MAX(CAST(rp.CanApprove AS INT)) AS BIT) AS CanApprove
FROM dbo.Users u
JOIN dbo.UserRoles ur ON ur.UserId = u.Id
JOIN dbo.Roles r ON r.Id = ur.RoleId AND r.IsActive = 1 AND r.IsSystemRole = 0
JOIN dbo.RolePermissions rp ON rp.RoleId = r.Id
JOIN dbo.Pages p ON p.Id = rp.PageId AND p.IsActive = 1
WHERE u.IsActive = 1 AND u.IsDeleted = 0 AND u.IsSystemUser = 0
GROUP BY u.Id, p.Id, p.Name, p.DisplayName, p.Route, p.Icon, p.ParentPageId, p.SortOrder;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SystemOwner_GetState
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*) FROM dbo.Users WHERE IsSystemUser = 1) AS SystemUserCount,
        (SELECT COUNT(*) FROM dbo.Roles WHERE IsSystemRole = 1) AS SystemRoleCount,
        (
            SELECT COUNT(*)
            FROM dbo.Users u
            JOIN dbo.UserRoles ur ON ur.UserId = u.Id
            JOIN dbo.Roles r ON r.Id = ur.RoleId
            WHERE u.IsSystemUser = 1 AND r.IsSystemRole = 1
        ) AS LinkedOwnerCount,
        (
            SELECT COUNT(*)
            FROM dbo.RolePermissions rp
            JOIN dbo.Roles r ON r.Id = rp.RoleId
            WHERE r.IsSystemRole = 1
        ) AS SystemRolePermissionCount,
        (
            SELECT COUNT(*)
            FROM dbo.UserRoles ur
            JOIN dbo.Users u ON u.Id = ur.UserId
            JOIN dbo.Roles r ON r.Id = ur.RoleId
            WHERE (u.IsSystemUser = 1 AND r.IsSystemRole = 0)
               OR (u.IsSystemUser = 0 AND r.IsSystemRole = 1)
        ) AS InvalidProtectedRoleLinkCount;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SystemOwner_Provision
    @Username NVARCHAR(100),
    @Email NVARCHAR(256),
    @PasswordHash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @LockResult INT;
        EXEC @LockResult = sys.sp_getapplock
            @Resource = N'Cosmos.SystemOwner.Provisioning',
            @LockMode = N'Exclusive',
            @LockOwner = N'Transaction',
            @LockTimeout = 15000;

        IF @LockResult < 0
            THROW 51043, 'Unable to acquire the System Owner provisioning lock.', 1;

        DECLARE @SystemUserCount INT = (SELECT COUNT(*) FROM dbo.Users WITH (UPDLOCK, HOLDLOCK) WHERE IsSystemUser = 1);
        DECLARE @SystemRoleCount INT = (SELECT COUNT(*) FROM dbo.Roles WITH (UPDLOCK, HOLDLOCK) WHERE IsSystemRole = 1);
        DECLARE @SystemUserId INT = (SELECT Id FROM dbo.Users WHERE IsSystemUser = 1);
        DECLARE @SystemRoleId INT = (SELECT Id FROM dbo.Roles WHERE IsSystemRole = 1);
        DECLARE @LinkedOwnerCount INT =
        (
            SELECT COUNT(*)
            FROM dbo.UserRoles
            WHERE UserId = @SystemUserId AND RoleId = @SystemRoleId
        );
        DECLARE @SystemRolePermissionCount INT =
        (
            SELECT COUNT(*) FROM dbo.RolePermissions WHERE RoleId = @SystemRoleId
        );
        DECLARE @InvalidProtectedRoleLinkCount INT =
        (
            SELECT COUNT(*)
            FROM dbo.UserRoles ur
            JOIN dbo.Users u ON u.Id = ur.UserId
            JOIN dbo.Roles r ON r.Id = ur.RoleId
            WHERE (u.IsSystemUser = 1 AND r.IsSystemRole = 0)
               OR (u.IsSystemUser = 0 AND r.IsSystemRole = 1)
        );

        IF @SystemUserCount = 1 AND @SystemRoleCount = 1 AND @LinkedOwnerCount = 1
           AND @SystemRolePermissionCount = 0 AND @InvalidProtectedRoleLinkCount = 0
        BEGIN
            COMMIT TRANSACTION;
            SELECT 200 AS StatusCode, N'Protected System Owner is already provisioned.' AS [Message];
            SELECT @SystemUserId AS UserId, @SystemRoleId AS RoleId, CAST(0 AS BIT) AS Created;
            RETURN;
        END;

        IF @SystemUserCount <> 0 OR @SystemRoleCount <> 0 OR @LinkedOwnerCount <> 0
           OR @SystemRolePermissionCount <> 0 OR @InvalidProtectedRoleLinkCount <> 0
            THROW 51043, 'Conflicting protected System Owner records were detected.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @Username OR Email = @Email)
            THROW 51043, 'The configured System Owner username or email conflicts with an existing user.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'SystemOwner')
            THROW 51043, 'The protected System Owner role name conflicts with an existing role.', 1;

        INSERT INTO dbo.Roles(Name, Description, IsActive, IsSystemRole)
        VALUES(N'SystemOwner', N'Protected Cosmos system owner role', 1, 1);
        SET @SystemRoleId = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO dbo.Users(Username, Email, PasswordHash, FullName, IsActive, IsDeleted, IsSystemUser)
        VALUES(@Username, @Email, @PasswordHash, N'System Owner', 1, 0, 1);
        SET @SystemUserId = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO dbo.UserRoles(UserId, RoleId) VALUES(@SystemUserId, @SystemRoleId);

        INSERT INTO dbo.AuditLogs(TableName, RecordId, ActionType, OldValues, NewValues, CreatedBy)
        VALUES(N'Users', CONVERT(NVARCHAR(100), @SystemUserId), N'SystemOwnerProvisioned', NULL,
               N'{"reason":"Protected System Owner provisioned from secure configuration."}', @SystemUserId);

        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'Protected System Owner provisioned.' AS [Message];
        SELECT @SystemUserId AS UserId, @SystemRoleId AS RoleId, CAST(1 AS BIT) AS Created;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_Login
    @UsernameOrEmail NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE (Username = @UsernameOrEmail OR Email = @UsernameOrEmail) AND IsDeleted = 0)
        BEGIN
            SELECT 401 AS StatusCode, N'Invalid username or password.' AS [Message];
            RETURN;
        END;

        SELECT 200 AS StatusCode, N'User found.' AS [Message];
        SELECT TOP (1) Id, Username, Email, PasswordHash, FullName, IsActive, IsDeleted, IsSystemUser, CreatedOn, UpdatedOn
        FROM dbo.Users
        WHERE (Username = @UsernameOrEmail OR Email = @UsernameOrEmail) AND IsDeleted = 0;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_ForgotPassword
    @Email NVARCHAR(256),
    @ResetToken NVARCHAR(500),
    @ExpiryDate DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @UserId INT =
        (
            SELECT Id FROM dbo.Users
            WHERE Email = @Email AND IsDeleted = 0 AND IsActive = 1 AND IsSystemUser = 0
        );
        IF @UserId IS NOT NULL
        BEGIN
            BEGIN TRANSACTION;
            INSERT INTO dbo.PasswordResetTokens(UserId, Token, ExpiryDate) VALUES(@UserId, @ResetToken, @ExpiryDate);
            COMMIT TRANSACTION;
        END;
        SELECT 200 AS StatusCode, N'If the account exists, a password reset token has been generated.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_ResetPassword
    @Email NVARCHAR(256),
    @ResetToken NVARCHAR(500),
    @PasswordHash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @UserId INT;
        SELECT @UserId = u.Id
        FROM dbo.Users u
        JOIN dbo.PasswordResetTokens prt ON prt.UserId = u.Id
        WHERE u.Email = @Email
          AND u.IsSystemUser = 0
          AND u.IsDeleted = 0
          AND prt.Token = @ResetToken
          AND prt.IsUsed = 0
          AND prt.ExpiryDate > SYSUTCDATETIME();

        IF @UserId IS NULL
        BEGIN
            SELECT 400 AS StatusCode, N'Password reset token is invalid or expired.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        UPDATE dbo.Users SET PasswordHash = @PasswordHash, UpdatedOn = SYSUTCDATETIME() WHERE Id = @UserId AND IsSystemUser = 0;
        UPDATE dbo.PasswordResetTokens SET IsUsed = 1 WHERE Token = @ResetToken;
        UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @UserId;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Password reset successfully.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn
    FROM dbo.Users
    WHERE IsDeleted = 0 AND IsSystemUser = 0
    ORDER BY Username;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetById @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn
    FROM dbo.Users
    WHERE Id = @Id AND IsDeleted = 0 AND IsSystemUser = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetEntityById @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, PasswordHash, FullName, IsActive, IsDeleted, IsSystemUser, CreatedOn, UpdatedOn
    FROM dbo.Users
    WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_IsSystemOwner @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN EXISTS
    (
        SELECT 1
        FROM dbo.Users u
        JOIN dbo.UserRoles ur ON ur.UserId = u.Id
        JOIN dbo.Roles r ON r.Id = ur.RoleId
        WHERE u.Id = @UserId
          AND u.IsSystemUser = 1
          AND u.IsActive = 1
          AND u.IsDeleted = 0
          AND r.IsSystemRole = 1
          AND r.IsActive = 1
    ) THEN 1 ELSE 0 END AS IsSystemOwner;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Update
    @Id INT,
    @Email NVARCHAR(256),
    @FullName NVARCHAR(200),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @Id AND IsSystemUser = 1)
            THROW 51040, 'User was not found.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email AND Id <> @Id)
        BEGIN
            SELECT 409 AS StatusCode, N'Email already exists.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        UPDATE dbo.Users
        SET Email = @Email, FullName = @FullName, IsActive = @IsActive, UpdatedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0 AND IsSystemUser = 0;
        IF @@ROWCOUNT = 0 THROW 51040, 'User was not found.', 1;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'User updated.' AS [Message];
        EXEC dbo.sp_User_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Delete @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @Id AND IsSystemUser = 1)
            THROW 51040, 'User was not found.', 1;

        BEGIN TRANSACTION;
        UPDATE dbo.Users
        SET IsDeleted = 1, IsActive = 0, UpdatedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0 AND IsSystemUser = 0;
        IF @@ROWCOUNT = 0 THROW 51040, 'User was not found.', 1;
        UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @Id;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'User deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_SetActive @Id INT, @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @Id AND IsSystemUser = 1)
            THROW 51040, 'User was not found.', 1;

        BEGIN TRANSACTION;
        UPDATE dbo.Users SET IsActive = @IsActive, UpdatedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0 AND IsSystemUser = 0;
        IF @@ROWCOUNT = 0 THROW 51040, 'User was not found.', 1;
        IF @IsActive = 0 UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @Id;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode,
               CASE WHEN @IsActive = 1 THEN N'User activated.' ELSE N'User deactivated.' END AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_AssignRoles
    @UserId INT,
    @RoleIds dbo.IntIdList READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @UserId AND IsSystemUser = 1)
            THROW 51040, 'User was not found.', 1;

        IF EXISTS
        (
            SELECT 1 FROM @RoleIds ids
            JOIN dbo.Roles r ON r.Id = ids.Id
            WHERE r.IsSystemRole = 1
        )
            THROW 51042, 'One or more roles were not found.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @UserId AND IsDeleted = 0 AND IsSystemUser = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        DELETE FROM dbo.UserRoles WHERE UserId = @UserId;
        INSERT INTO dbo.UserRoles(UserId, RoleId)
        SELECT @UserId, ids.Id
        FROM @RoleIds ids
        JOIN dbo.Roles r ON r.Id = ids.Id AND r.IsActive = 1 AND r.IsSystemRole = 0;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'User roles assigned.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetRoles @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id, r.Name, r.Description, r.IsActive
    FROM dbo.Roles r
    JOIN dbo.UserRoles ur ON ur.RoleId = r.Id
    JOIN dbo.Users u ON u.Id = ur.UserId
    WHERE ur.UserId = @UserId
      AND r.IsActive = 1
      AND ((u.IsSystemUser = 1 AND r.IsSystemRole = 1) OR (u.IsSystemUser = 0 AND r.IsSystemRole = 0))
    ORDER BY r.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetPagePermissions @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.Users u
        JOIN dbo.UserRoles ur ON ur.UserId = u.Id
        JOIN dbo.Roles r ON r.Id = ur.RoleId
        WHERE u.Id = @UserId
          AND u.IsSystemUser = 1
          AND u.IsActive = 1
          AND u.IsDeleted = 0
          AND r.IsSystemRole = 1
          AND r.IsActive = 1
    )
    BEGIN
        SELECT
            p.Id AS PageId,
            p.Name AS PageName,
            p.DisplayName,
            p.Route,
            p.Icon,
            p.ParentPageId,
            p.SortOrder,
            CAST(1 AS BIT) AS CanView,
            CAST(1 AS BIT) AS CanCreate,
            CAST(1 AS BIT) AS CanEdit,
            CAST(1 AS BIT) AS CanDelete,
            CAST(1 AS BIT) AS CanExport,
            CAST(1 AS BIT) AS CanApprove
        FROM dbo.Pages p
        WHERE p.IsActive = 1
        ORDER BY p.SortOrder, p.DisplayName;
        RETURN;
    END;

    SELECT PageId, PageName, DisplayName, Route, Icon, ParentPageId, SortOrder,
           CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove
    FROM dbo.vw_UserEffectivePermissions
    WHERE UserId = @UserId AND CanView = 1
    ORDER BY SortOrder, DisplayName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedOn
    FROM dbo.Roles
    WHERE IsSystemRole = 0
    ORDER BY Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetById @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedOn
    FROM dbo.Roles
    WHERE Id = @Id AND IsSystemRole = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetEntityById @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, IsSystemRole, CreatedOn
    FROM dbo.Roles
    WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_Update
    @Id INT,
    @Name NVARCHAR(100),
    @Description NVARCHAR(500),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @Id AND IsSystemRole = 1)
            THROW 51041, 'Role was not found.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = @Name AND Id <> @Id)
        BEGIN
            SELECT 409 AS StatusCode, N'Role already exists.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        UPDATE dbo.Roles SET Name = @Name, Description = @Description, IsActive = @IsActive
        WHERE Id = @Id AND IsSystemRole = 0;
        IF @@ROWCOUNT = 0 THROW 51041, 'Role was not found.', 1;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Role updated.' AS [Message];
        EXEC dbo.sp_Role_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_Delete @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @Id AND IsSystemRole = 1)
            THROW 51041, 'Role was not found.', 1;

        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @Id AND IsSystemRole = 0)
            THROW 51041, 'Role was not found.', 1;
        DELETE FROM dbo.UserRoles WHERE RoleId = @Id;
        DELETE FROM dbo.RolePermissions WHERE RoleId = @Id;
        DELETE FROM dbo.Roles WHERE Id = @Id AND IsSystemRole = 0;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Role deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Permission_GetByRoleId @RoleId INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @RoleId AND IsSystemRole = 0)
        THROW 51041, 'Role was not found.', 1;

    SELECT
        @RoleId AS RoleId,
        p.Id AS PageId,
        p.Name AS PageName,
        p.DisplayName,
        p.Route,
        ISNULL(rp.CanView, 0) AS CanView,
        ISNULL(rp.CanCreate, 0) AS CanCreate,
        ISNULL(rp.CanEdit, 0) AS CanEdit,
        ISNULL(rp.CanDelete, 0) AS CanDelete,
        ISNULL(rp.CanExport, 0) AS CanExport,
        ISNULL(rp.CanApprove, 0) AS CanApprove
    FROM dbo.Pages p
    LEFT JOIN dbo.RolePermissions rp ON rp.PageId = p.Id AND rp.RoleId = @RoleId
    WHERE p.IsActive = 1
    ORDER BY p.SortOrder, p.DisplayName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Permission_Save
    @RoleId INT,
    @Permissions dbo.PermissionList READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @RoleId AND IsSystemRole = 1)
            THROW 51041, 'Role was not found.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @RoleId AND IsSystemRole = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Role was not found.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        DELETE FROM dbo.RolePermissions WHERE RoleId = @RoleId;
        INSERT INTO dbo.RolePermissions(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
        SELECT @RoleId, p.PageId, p.CanView, p.CanCreate, p.CanEdit, p.CanDelete, p.CanExport, p.CanApprove
        FROM @Permissions p
        JOIN dbo.Pages pg ON pg.Id = p.PageId;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Permissions saved.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Permission_UserHasAccess
    @UserId INT,
    @PageName NVARCHAR(100),
    @PermissionAction NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF @PermissionAction NOT IN (N'View', N'Create', N'Edit', N'Delete', N'Export', N'Approve')
    BEGIN
        SELECT 0 AS HasAccess;
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @UserId AND IsActive = 1 AND IsDeleted = 0)
    BEGIN
        SELECT 0 AS HasAccess;
        RETURN;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.Users u
        JOIN dbo.UserRoles ur ON ur.UserId = u.Id
        JOIN dbo.Roles r ON r.Id = ur.RoleId
        WHERE u.Id = @UserId
          AND u.IsSystemUser = 1
          AND u.IsActive = 1
          AND u.IsDeleted = 0
          AND r.IsSystemRole = 1
          AND r.IsActive = 1
    )
    BEGIN
        SELECT 1 AS HasAccess;
        RETURN;
    END;

    SELECT CASE WHEN EXISTS
    (
        SELECT 1
        FROM dbo.vw_UserEffectivePermissions
        WHERE UserId = @UserId
          AND PageName = @PageName
          AND
          (
              (@PermissionAction = N'View' AND CanView = 1) OR
              (@PermissionAction = N'Create' AND CanCreate = 1) OR
              (@PermissionAction = N'Edit' AND CanEdit = 1) OR
              (@PermissionAction = N'Delete' AND CanDelete = 1) OR
              (@PermissionAction = N'Export' AND CanExport = 1) OR
              (@PermissionAction = N'Approve' AND CanApprove = 1)
          )
    ) THEN 1 ELSE 0 END AS HasAccess;
END;
GO
