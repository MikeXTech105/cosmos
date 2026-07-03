/*
    Cosmos ERP full database setup
    Target: SQL Server. Select CosmosERP_Staging or CosmosERP_Production in SSMS before running.
    Generated from repository scripts in dependency order.
*/
SET NOCOUNT ON;
GO

/* ============================================================================
   Source: backend\database\CosmosERP.Security.sql
   ============================================================================ */
/*
    Cosmos ERP Security & Authentication Module
    SQL Server 2022
    Run against the CosmosERP database.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF TYPE_ID(N'dbo.IntIdList') IS NULL
    CREATE TYPE dbo.IntIdList AS TABLE (Id INT NOT NULL PRIMARY KEY);
GO

IF TYPE_ID(N'dbo.PermissionList') IS NULL
    CREATE TYPE dbo.PermissionList AS TABLE
    (
        PageId INT NOT NULL PRIMARY KEY,
        CanView BIT NOT NULL,
        CanCreate BIT NOT NULL,
        CanEdit BIT NOT NULL,
        CanDelete BIT NOT NULL,
        CanExport BIT NOT NULL,
        CanApprove BIT NOT NULL
    );
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL,
        Email NVARCHAR(256) NOT NULL,
        PasswordHash NVARCHAR(500) NOT NULL,
        FullName NVARCHAR(200) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        IsDeleted BIT NOT NULL CONSTRAINT DF_Users_IsDeleted DEFAULT (0),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedOn DEFAULT (SYSUTCDATETIME()),
        UpdatedOn DATETIME2(3) NULL,
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT UQ_Users_Email UNIQUE (Email)
    );
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_Roles_CreatedOn DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Roles_Name UNIQUE (Name)
    );
END;
GO

IF OBJECT_ID(N'dbo.UserRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserRoles
    (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pages
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pages PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        DisplayName NVARCHAR(150) NOT NULL,
        Route NVARCHAR(300) NOT NULL,
        Icon NVARCHAR(100) NULL,
        ParentPageId INT NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_Pages_SortOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Pages_IsActive DEFAULT (1),
        CONSTRAINT UQ_Pages_Name UNIQUE (Name),
        CONSTRAINT FK_Pages_ParentPage FOREIGN KEY (ParentPageId) REFERENCES dbo.Pages(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissions
    (
        RoleId INT NOT NULL,
        PageId INT NOT NULL,
        CanView BIT NOT NULL CONSTRAINT DF_RolePermissions_CanView DEFAULT (0),
        CanCreate BIT NOT NULL CONSTRAINT DF_RolePermissions_CanCreate DEFAULT (0),
        CanEdit BIT NOT NULL CONSTRAINT DF_RolePermissions_CanEdit DEFAULT (0),
        CanDelete BIT NOT NULL CONSTRAINT DF_RolePermissions_CanDelete DEFAULT (0),
        CanExport BIT NOT NULL CONSTRAINT DF_RolePermissions_CanExport DEFAULT (0),
        CanApprove BIT NOT NULL CONSTRAINT DF_RolePermissions_CanApprove DEFAULT (0),
        CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleId, PageId),
        CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id),
        CONSTRAINT FK_RolePermissions_Pages FOREIGN KEY (PageId) REFERENCES dbo.Pages(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY,
        UserId INT NOT NULL,
        Token NVARCHAR(500) NOT NULL,
        ExpiryDate DATETIME2(3) NOT NULL,
        IsRevoked BIT NOT NULL CONSTRAINT DF_RefreshTokens_IsRevoked DEFAULT (0),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_RefreshTokens_CreatedOn DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_RefreshTokens_Token UNIQUE (Token),
        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResetTokens
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PasswordResetTokens PRIMARY KEY,
        UserId INT NOT NULL,
        Token NVARCHAR(500) NOT NULL,
        ExpiryDate DATETIME2(3) NOT NULL,
        IsUsed BIT NOT NULL CONSTRAINT DF_PasswordResetTokens_IsUsed DEFAULT (0),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_PasswordResetTokens_CreatedOn DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_PasswordResetTokens_Token UNIQUE (Token),
        CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
        TableName NVARCHAR(128) NOT NULL,
        RecordId NVARCHAR(100) NOT NULL,
        ActionType NVARCHAR(50) NOT NULL,
        OldValues NVARCHAR(MAX) NULL,
        NewValues NVARCHAR(MAX) NULL,
        CreatedBy INT NULL,
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_AuditLogs_CreatedOn DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_IsDeleted_IsActive' AND object_id = OBJECT_ID(N'dbo.Users'))
    CREATE INDEX IX_Users_IsDeleted_IsActive ON dbo.Users(IsDeleted, IsActive) INCLUDE (Username, Email, FullName);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserRoles_RoleId' AND object_id = OBJECT_ID(N'dbo.UserRoles'))
    CREATE INDEX IX_UserRoles_RoleId ON dbo.UserRoles(RoleId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Pages_Parent_Sort' AND object_id = OBJECT_ID(N'dbo.Pages'))
    CREATE INDEX IX_Pages_Parent_Sort ON dbo.Pages(ParentPageId, SortOrder);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RolePermissions_PageId' AND object_id = OBJECT_ID(N'dbo.RolePermissions'))
    CREATE INDEX IX_RolePermissions_PageId ON dbo.RolePermissions(PageId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RefreshTokens_UserId_Revoked_Expiry' AND object_id = OBJECT_ID(N'dbo.RefreshTokens'))
    CREATE INDEX IX_RefreshTokens_UserId_Revoked_Expiry ON dbo.RefreshTokens(UserId, IsRevoked, ExpiryDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_Table_Record' AND object_id = OBJECT_ID(N'dbo.AuditLogs'))
    CREATE INDEX IX_AuditLogs_Table_Record ON dbo.AuditLogs(TableName, RecordId, CreatedOn DESC);
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
JOIN dbo.Roles r ON r.Id = ur.RoleId AND r.IsActive = 1
JOIN dbo.RolePermissions rp ON rp.RoleId = r.Id
JOIN dbo.Pages p ON p.Id = rp.PageId AND p.IsActive = 1
WHERE u.IsActive = 1 AND u.IsDeleted = 0
GROUP BY u.Id, p.Id, p.Name, p.DisplayName, p.Route, p.Icon, p.ParentPageId, p.SortOrder;
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
        SELECT TOP (1) Id, Username, Email, PasswordHash, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn
        FROM dbo.Users
        WHERE (Username = @UsernameOrEmail OR Email = @UsernameOrEmail) AND IsDeleted = 0;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_SaveRefreshToken
    @UserId INT,
    @Token NVARCHAR(500),
    @ExpiryDate DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        INSERT INTO dbo.RefreshTokens(UserId, Token, ExpiryDate) VALUES (@UserId, @Token, @ExpiryDate);
        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'Refresh token created.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_RefreshToken
    @Token NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.RefreshTokens WHERE Token = @Token AND IsRevoked = 0 AND ExpiryDate > SYSUTCDATETIME())
        BEGIN
            SELECT 401 AS StatusCode, N'Refresh token is invalid or expired.' AS [Message];
            RETURN;
        END;

        SELECT 200 AS StatusCode, N'Refresh token found.' AS [Message];
        SELECT Id, UserId, Token, ExpiryDate, IsRevoked, CreatedOn
        FROM dbo.RefreshTokens
        WHERE Token = @Token;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_Logout
    @Token NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE Token = @Token;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Refresh token revoked.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_ChangePassword
    @UserId INT,
    @PasswordHash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Users SET PasswordHash = @PasswordHash, UpdatedOn = SYSUTCDATETIME() WHERE Id = @UserId AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
            RETURN;
        END;
        UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @UserId;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Password changed.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
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
        DECLARE @UserId INT = (SELECT Id FROM dbo.Users WHERE Email = @Email AND IsDeleted = 0 AND IsActive = 1);
        IF @UserId IS NOT NULL
        BEGIN
            BEGIN TRANSACTION;
            INSERT INTO dbo.PasswordResetTokens(UserId, Token, ExpiryDate) VALUES (@UserId, @ResetToken, @ExpiryDate);
            COMMIT TRANSACTION;
        END;
        SELECT 200 AS StatusCode, N'If the account exists, a password reset token has been generated.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
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
        WHERE u.Email = @Email AND prt.Token = @ResetToken AND prt.IsUsed = 0 AND prt.ExpiryDate > SYSUTCDATETIME();

        IF @UserId IS NULL
        BEGIN
            SELECT 400 AS StatusCode, N'Password reset token is invalid or expired.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        UPDATE dbo.Users SET PasswordHash = @PasswordHash, UpdatedOn = SYSUTCDATETIME() WHERE Id = @UserId;
        UPDATE dbo.PasswordResetTokens SET IsUsed = 1 WHERE Token = @ResetToken;
        UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @UserId;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Password reset successfully.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn
    FROM dbo.Users WHERE IsDeleted = 0 ORDER BY Username;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetById @Id INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn FROM dbo.Users WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetEntityById @Id INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, PasswordHash, FullName, IsActive, IsDeleted, CreatedOn, UpdatedOn FROM dbo.Users WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Create
    @Username NVARCHAR(100),
    @Email NVARCHAR(256),
    @PasswordHash NVARCHAR(500),
    @FullName NVARCHAR(200),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @Username OR Email = @Email)
        BEGIN
            SELECT 409 AS StatusCode, N'Username or email already exists.' AS [Message];
            RETURN;
        END;
        BEGIN TRANSACTION;
        INSERT INTO dbo.Users(Username, Email, PasswordHash, FullName, IsActive) VALUES (@Username, @Email, @PasswordHash, @FullName, @IsActive);
        DECLARE @Id INT = CAST(SCOPE_IDENTITY() AS INT);
        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'User created.' AS [Message];
        EXEC dbo.sp_User_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
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
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email AND Id <> @Id)
        BEGIN
            SELECT 409 AS StatusCode, N'Email already exists.' AS [Message];
            RETURN;
        END;
        BEGIN TRANSACTION;
        UPDATE dbo.Users SET Email = @Email, FullName = @FullName, IsActive = @IsActive, UpdatedOn = SYSUTCDATETIME() WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'User updated.' AS [Message];
        EXEC dbo.sp_User_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Delete @Id INT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Users SET IsDeleted = 1, IsActive = 0, UpdatedOn = SYSUTCDATETIME() WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
            RETURN;
        END;
        UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @Id;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'User deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_SetActive @Id INT, @IsActive BIT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Users SET IsActive = @IsActive, UpdatedOn = SYSUTCDATETIME() WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
            RETURN;
        END;
        IF @IsActive = 0 UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE UserId = @Id;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, CASE WHEN @IsActive = 1 THEN N'User activated.' ELSE N'User deactivated.' END AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_AssignRoles
    @UserId INT,
    @RoleIds dbo.IntIdList READONLY
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Id = @UserId AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'User was not found.' AS [Message];
            RETURN;
        END;
        BEGIN TRANSACTION;
        DELETE FROM dbo.UserRoles WHERE UserId = @UserId;
        INSERT INTO dbo.UserRoles(UserId, RoleId)
        SELECT @UserId, ids.Id FROM @RoleIds ids JOIN dbo.Roles r ON r.Id = ids.Id AND r.IsActive = 1;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'User roles assigned.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetRoles @UserId INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id, r.Name, r.Description, r.IsActive
    FROM dbo.Roles r JOIN dbo.UserRoles ur ON ur.RoleId = r.Id
    WHERE ur.UserId = @UserId AND r.IsActive = 1
    ORDER BY r.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetPagePermissions @UserId INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT PageId, PageName, DisplayName, Route, Icon, ParentPageId, SortOrder, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove
    FROM dbo.vw_UserEffectivePermissions
    WHERE UserId = @UserId AND CanView = 1
    ORDER BY SortOrder, DisplayName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetAll AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedOn FROM dbo.Roles ORDER BY Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetById @Id INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedOn FROM dbo.Roles WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetEntityById @Id INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedOn FROM dbo.Roles WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_Create @Name NVARCHAR(100), @Description NVARCHAR(500), @IsActive BIT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = @Name)
        BEGIN
            SELECT 409 AS StatusCode, N'Role already exists.' AS [Message];
            RETURN;
        END;
        BEGIN TRANSACTION;
        INSERT INTO dbo.Roles(Name, Description, IsActive) VALUES (@Name, @Description, @IsActive);
        DECLARE @Id INT = CAST(SCOPE_IDENTITY() AS INT);
        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'Role created.' AS [Message];
        EXEC dbo.sp_Role_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_Update @Id INT, @Name NVARCHAR(100), @Description NVARCHAR(500), @IsActive BIT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = @Name AND Id <> @Id)
        BEGIN
            SELECT 409 AS StatusCode, N'Role already exists.' AS [Message];
            RETURN;
        END;
        BEGIN TRANSACTION;
        UPDATE dbo.Roles SET Name = @Name, Description = @Description, IsActive = @IsActive WHERE Id = @Id;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Role was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Role updated.' AS [Message];
        EXEC dbo.sp_Role_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_Delete @Id INT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DELETE FROM dbo.UserRoles WHERE RoleId = @Id;
        DELETE FROM dbo.RolePermissions WHERE RoleId = @Id;
        DELETE FROM dbo.Roles WHERE Id = @Id;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Role was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Role deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Page_GetAll AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive FROM dbo.Pages ORDER BY SortOrder, DisplayName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Page_GetById @Id INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive FROM dbo.Pages WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Page_GetEntityById @Id INT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive FROM dbo.Pages WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Page_Create @Name NVARCHAR(100), @DisplayName NVARCHAR(150), @Route NVARCHAR(300), @Icon NVARCHAR(100), @ParentPageId INT, @SortOrder INT, @IsActive BIT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = @Name)
        BEGIN
            SELECT 409 AS StatusCode, N'Page already exists.' AS [Message];
            RETURN;
        END;
        BEGIN TRANSACTION;
        INSERT INTO dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (@Name, @DisplayName, @Route, @Icon, @ParentPageId, @SortOrder, @IsActive);
        DECLARE @Id INT = CAST(SCOPE_IDENTITY() AS INT);
        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'Page created.' AS [Message];
        EXEC dbo.sp_Page_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Page_Update @Id INT, @DisplayName NVARCHAR(150), @Route NVARCHAR(300), @Icon NVARCHAR(100), @ParentPageId INT, @SortOrder INT, @IsActive BIT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Pages SET DisplayName = @DisplayName, Route = @Route, Icon = @Icon, ParentPageId = @ParentPageId, SortOrder = @SortOrder, IsActive = @IsActive WHERE Id = @Id;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Page was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Page updated.' AS [Message];
        EXEC dbo.sp_Page_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Page_Delete @Id INT AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DELETE FROM dbo.RolePermissions WHERE PageId = @Id;
        DELETE FROM dbo.Pages WHERE Id = @Id;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Page was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Page deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Permission_GetByRoleId @RoleId INT AS
BEGIN
    SET NOCOUNT ON;
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
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Id = @RoleId)
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
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Permission_UserHasAccess
    @UserId INT,
    @PageName NVARCHAR(100),
    @PermissionAction NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
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

CREATE OR ALTER PROCEDURE dbo.sp_AuditLog_Create
    @TableName NVARCHAR(128),
    @RecordId NVARCHAR(100),
    @ActionType NVARCHAR(50),
    @OldValues NVARCHAR(MAX) = NULL,
    @NewValues NVARCHAR(MAX) = NULL,
    @CreatedBy INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO dbo.AuditLogs(TableName, RecordId, ActionType, OldValues, NewValues, CreatedBy)
        VALUES (@TableName, @RecordId, @ActionType, @OldValues, @NewValues, @CreatedBy);
        SELECT 201 AS StatusCode, N'Audit log created.' AS [Message];
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

MERGE dbo.Roles AS target
USING (VALUES (N'SuperAdmin', N'Unrestricted Cosmos ERP administrator', CAST(1 AS BIT))) AS source(Name, Description, IsActive)
ON target.Name = source.Name
WHEN NOT MATCHED THEN
    INSERT(Name, Description, IsActive) VALUES(source.Name, source.Description, source.IsActive);
GO

MERGE dbo.Users AS target
USING (VALUES (N'admin', N'admin@cosmoserp.com', N'$2b$12$hbSNeLRlpixryPlJQdl8iOS7.co8dGQgobW.2gbLTNa5W2G7Nq8C.', N'Cosmos ERP Administrator', CAST(1 AS BIT))) AS source(Username, Email, PasswordHash, FullName, IsActive)
ON target.Username = source.Username
WHEN NOT MATCHED THEN
    INSERT(Username, Email, PasswordHash, FullName, IsActive) VALUES(source.Username, source.Email, source.PasswordHash, source.FullName, source.IsActive);
GO

MERGE dbo.Pages AS target
USING (VALUES
    (N'Dashboard', N'Dashboard', N'/dashboard', N'layout-dashboard', 10),
    (N'Customer', N'Customers', N'/customers', N'users', 20),
    (N'Supplier', N'Suppliers', N'/suppliers', N'truck', 30),
    (N'Inventory', N'Inventory', N'/inventory', N'boxes', 40),
    (N'Purchase', N'Purchases', N'/purchases', N'shopping-cart', 50),
    (N'Sales', N'Sales', N'/sales', N'receipt', 60),
    (N'Reports', N'Reports', N'/reports', N'chart-column', 70),
    (N'Users', N'Users', N'/security/users', N'user-cog', 100),
    (N'Roles', N'Roles', N'/security/roles', N'shield', 110),
    (N'Pages', N'Pages', N'/security/pages', N'panel-top', 120),
    (N'Permissions', N'Permissions', N'/security/permissions', N'key-round', 130)
) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN NOT MATCHED THEN
    INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
GO

DECLARE @AdminUserId INT = (SELECT Id FROM dbo.Users WHERE Username = N'admin');
DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');

IF NOT EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId = @AdminUserId AND RoleId = @SuperAdminRoleId)
    INSERT INTO dbo.UserRoles(UserId, RoleId) VALUES (@AdminUserId, @SuperAdminRoleId);

MERGE dbo.RolePermissions AS target
USING (SELECT @SuperAdminRoleId AS RoleId, Id AS PageId FROM dbo.Pages) AS source
ON target.RoleId = source.RoleId AND target.PageId = source.PageId
WHEN MATCHED THEN
    UPDATE SET CanView = 1, CanCreate = 1, CanEdit = 1, CanDelete = 1, CanExport = 1, CanApprove = 1
WHEN NOT MATCHED THEN
    INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
    VALUES(source.RoleId, source.PageId, 1, 1, 1, 1, 1, 1);
GO


/* ============================================================================
   Source: backend\database\001_Party_Module.sql
   ============================================================================ */
/*
    Cosmos ERP Party Management Module
    SQL Server 2022
    Safe to run more than once against the CosmosERP database.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Parties', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Parties
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Parties_Id DEFAULT (NEWSEQUENTIALID()) CONSTRAINT PK_Parties PRIMARY KEY,
        PartyCode NVARCHAR(50) NOT NULL,
        PartyName NVARCHAR(200) NOT NULL,
        MobileNo NVARCHAR(20) NULL,
        Email NVARCHAR(200) NULL,
        GSTTreatment INT NOT NULL,
        GSTIN NVARCHAR(20) NULL,
        LegalName NVARCHAR(250) NULL,
        TradeName NVARCHAR(250) NULL,
        BillingAddressLine1 NVARCHAR(250) NULL,
        BillingAddressLine2 NVARCHAR(250) NULL,
        BillingCity NVARCHAR(100) NULL,
        BillingState NVARCHAR(100) NULL,
        BillingCountry NVARCHAR(100) NULL,
        BillingPincode NVARCHAR(20) NULL,
        ShippingAddressLine1 NVARCHAR(250) NULL,
        ShippingAddressLine2 NVARCHAR(250) NULL,
        ShippingCity NVARCHAR(100) NULL,
        ShippingState NVARCHAR(100) NULL,
        ShippingCountry NVARCHAR(100) NULL,
        ShippingPincode NVARCHAR(20) NULL,
        OpeningBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Parties_OpeningBalance DEFAULT (0),
        OpeningBalanceType INT NOT NULL,
        CreditLimit DECIMAL(18,2) NOT NULL CONSTRAINT DF_Parties_CreditLimit DEFAULT (0),
        CreditPeriodDays INT NOT NULL CONSTRAINT DF_Parties_CreditPeriodDays DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Parties_IsActive DEFAULT (1),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_Parties_CreatedOn DEFAULT (SYSUTCDATETIME()),
        CreatedBy UNIQUEIDENTIFIER NULL,
        ModifiedOn DATETIME2(3) NULL,
        ModifiedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Parties_IsDeleted DEFAULT (0),
        DeletedOn DATETIME2(3) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_Parties_PartyCode UNIQUE (PartyCode)
    );
END;
GO

IF OBJECT_ID(N'dbo.PartySettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PartySettings
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PartySettings_Id DEFAULT (NEWSEQUENTIALID()) CONSTRAINT PK_PartySettings PRIMARY KEY,
        EnablePartyGrouping BIT NOT NULL CONSTRAINT DF_PartySettings_EnablePartyGrouping DEFAULT (0),
        EnableShippingAddress BIT NOT NULL CONSTRAINT DF_PartySettings_EnableShippingAddress DEFAULT (1),
        PrintShippingAddress BIT NOT NULL CONSTRAINT DF_PartySettings_PrintShippingAddress DEFAULT (0),
        EnablePartyStatus BIT NOT NULL CONSTRAINT DF_PartySettings_EnablePartyStatus DEFAULT (1),
        EnablePaymentReminder BIT NOT NULL CONSTRAINT DF_PartySettings_EnablePaymentReminder DEFAULT (0),
        ReminderDays INT NOT NULL CONSTRAINT DF_PartySettings_ReminderDays DEFAULT (0),
        ReminderMessage NVARCHAR(500) NULL,
        EnableLoyaltyPoints BIT NOT NULL CONSTRAINT DF_PartySettings_EnableLoyaltyPoints DEFAULT (0),
        AdditionalField1Name NVARCHAR(100) NULL,
        AdditionalField1Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField1Enabled DEFAULT (0),
        AdditionalField1ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField1ShowInPrint DEFAULT (0),
        AdditionalField2Name NVARCHAR(100) NULL,
        AdditionalField2Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField2Enabled DEFAULT (0),
        AdditionalField2ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField2ShowInPrint DEFAULT (0),
        AdditionalField3Name NVARCHAR(100) NULL,
        AdditionalField3Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField3Enabled DEFAULT (0),
        AdditionalField3ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField3ShowInPrint DEFAULT (0),
        AdditionalField4Name NVARCHAR(100) NULL,
        AdditionalField4Enabled BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField4Enabled DEFAULT (0),
        AdditionalField4ShowInPrint BIT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField4ShowInPrint DEFAULT (0),
        AdditionalField4Type INT NOT NULL CONSTRAINT DF_PartySettings_AdditionalField4Type DEFAULT (0),
        CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_PartySettings_CreatedOn DEFAULT (SYSUTCDATETIME()),
        ModifiedOn DATETIME2(3) NULL
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_PartyName' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_PartyName ON dbo.Parties(PartyName);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_MobileNo' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_MobileNo ON dbo.Parties(MobileNo);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_GSTIN' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_GSTIN ON dbo.Parties(GSTIN);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Parties_IsDeleted' AND object_id = OBJECT_ID(N'dbo.Parties'))
    CREATE INDEX IX_Parties_IsDeleted ON dbo.Parties(IsDeleted);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.PartySettings)
BEGIN
    INSERT INTO dbo.PartySettings
    (
        EnablePartyGrouping, EnableShippingAddress, PrintShippingAddress, EnablePartyStatus,
        EnablePaymentReminder, ReminderDays, ReminderMessage, EnableLoyaltyPoints,
        AdditionalField1Name, AdditionalField1Enabled, AdditionalField1ShowInPrint,
        AdditionalField2Name, AdditionalField2Enabled, AdditionalField2ShowInPrint,
        AdditionalField3Name, AdditionalField3Enabled, AdditionalField3ShowInPrint,
        AdditionalField4Name, AdditionalField4Enabled, AdditionalField4ShowInPrint, AdditionalField4Type
    )
    VALUES
    (
        0, 1, 0, 1,
        0, 0, NULL, 0,
        NULL, 0, 0,
        NULL, 0, 0,
        NULL, 0, 0,
        NULL, 0, 0, 0
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, PartyCode, PartyName, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
           BillingAddressLine1, BillingAddressLine2, BillingCity, BillingState, BillingCountry, BillingPincode,
           ShippingAddressLine1, ShippingAddressLine2, ShippingCity, ShippingState, ShippingCountry, ShippingPincode,
           OpeningBalance, OpeningBalanceType, CreditLimit, CreditPeriodDays, IsActive, CreatedOn, CreatedBy,
           ModifiedOn, ModifiedBy, IsDeleted, DeletedOn, RowVersion
    FROM dbo.Parties
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetList
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'PartyName',
    @SortDirection NVARCHAR(4) = N'ASC',
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'PartyCode', N'PartyName', N'MobileNo', N'GSTIN', N'CreatedOn') THEN @SortBy ELSE N'PartyName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, PartyCode, PartyName, MobileNo, Email, GSTTreatment, GSTIN, OpeningBalance, OpeningBalanceType,
               CreditLimit, CreditPeriodDays, IsActive, CreatedOn, ModifiedOn,
               COUNT(1) OVER() AS TotalCount
        FROM dbo.Parties
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR PartyCode LIKE @SearchPattern OR PartyName LIKE @SearchPattern OR MobileNo LIKE @SearchPattern OR GSTIN LIKE @SearchPattern OR Email LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(110);
    SET @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;

    EXEC sp_executesql
        @Sql,
        N'@Search NVARCHAR(200), @SearchPattern NVARCHAR(210), @IsActive BIT, @Offset INT, @PageSize INT',
        @Search = @Search,
        @SearchPattern = @SearchPattern, -- CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Create
    @PartyCode NVARCHAR(50),
    @PartyName NVARCHAR(200),
    @MobileNo NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
    @GSTTreatment INT,
    @GSTIN NVARCHAR(20) = NULL,
    @LegalName NVARCHAR(250) = NULL,
    @TradeName NVARCHAR(250) = NULL,
    @BillingAddressLine1 NVARCHAR(250) = NULL,
    @BillingAddressLine2 NVARCHAR(250) = NULL,
    @BillingCity NVARCHAR(100) = NULL,
    @BillingState NVARCHAR(100) = NULL,
    @BillingCountry NVARCHAR(100) = NULL,
    @BillingPincode NVARCHAR(20) = NULL,
    @ShippingAddressLine1 NVARCHAR(250) = NULL,
    @ShippingAddressLine2 NVARCHAR(250) = NULL,
    @ShippingCity NVARCHAR(100) = NULL,
    @ShippingState NVARCHAR(100) = NULL,
    @ShippingCountry NVARCHAR(100) = NULL,
    @ShippingPincode NVARCHAR(20) = NULL,
    @OpeningBalance DECIMAL(18,2),
    @OpeningBalanceType INT,
    @CreditLimit DECIMAL(18,2),
    @CreditPeriodDays INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Parties WHERE PartyCode = @PartyCode AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Party code already exists.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        DECLARE @Id UNIQUEIDENTIFIER = NEWID();
        INSERT INTO dbo.Parties
        (
            Id, PartyCode, PartyName, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
            BillingAddressLine1, BillingAddressLine2, BillingCity, BillingState, BillingCountry, BillingPincode,
            ShippingAddressLine1, ShippingAddressLine2, ShippingCity, ShippingState, ShippingCountry, ShippingPincode,
            OpeningBalance, OpeningBalanceType, CreditLimit, CreditPeriodDays, IsActive
        )
        VALUES
        (
            @Id, @PartyCode, @PartyName, @MobileNo, @Email, @GSTTreatment, @GSTIN, @LegalName, @TradeName,
            @BillingAddressLine1, @BillingAddressLine2, @BillingCity, @BillingState, @BillingCountry, @BillingPincode,
            @ShippingAddressLine1, @ShippingAddressLine2, @ShippingCity, @ShippingState, @ShippingCountry, @ShippingPincode,
            @OpeningBalance, @OpeningBalanceType, @CreditLimit, @CreditPeriodDays, @IsActive
        );
        COMMIT TRANSACTION;
        SELECT 201 AS StatusCode, N'Party created.' AS [Message];
        EXEC dbo.sp_Party_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Update
    @Id UNIQUEIDENTIFIER,
    @PartyCode NVARCHAR(50),
    @PartyName NVARCHAR(200),
    @MobileNo NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
    @GSTTreatment INT,
    @GSTIN NVARCHAR(20) = NULL,
    @LegalName NVARCHAR(250) = NULL,
    @TradeName NVARCHAR(250) = NULL,
    @BillingAddressLine1 NVARCHAR(250) = NULL,
    @BillingAddressLine2 NVARCHAR(250) = NULL,
    @BillingCity NVARCHAR(100) = NULL,
    @BillingState NVARCHAR(100) = NULL,
    @BillingCountry NVARCHAR(100) = NULL,
    @BillingPincode NVARCHAR(20) = NULL,
    @ShippingAddressLine1 NVARCHAR(250) = NULL,
    @ShippingAddressLine2 NVARCHAR(250) = NULL,
    @ShippingCity NVARCHAR(100) = NULL,
    @ShippingState NVARCHAR(100) = NULL,
    @ShippingCountry NVARCHAR(100) = NULL,
    @ShippingPincode NVARCHAR(20) = NULL,
    @OpeningBalance DECIMAL(18,2),
    @OpeningBalanceType INT,
    @CreditLimit DECIMAL(18,2),
    @CreditPeriodDays INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Parties WHERE PartyCode = @PartyCode AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Party code already exists.' AS [Message];
            RETURN;
        END;

        BEGIN TRANSACTION;
        UPDATE dbo.Parties
        SET PartyCode = @PartyCode,
            PartyName = @PartyName,
            MobileNo = @MobileNo,
            Email = @Email,
            GSTTreatment = @GSTTreatment,
            GSTIN = @GSTIN,
            LegalName = @LegalName,
            TradeName = @TradeName,
            BillingAddressLine1 = @BillingAddressLine1,
            BillingAddressLine2 = @BillingAddressLine2,
            BillingCity = @BillingCity,
            BillingState = @BillingState,
            BillingCountry = @BillingCountry,
            BillingPincode = @BillingPincode,
            ShippingAddressLine1 = @ShippingAddressLine1,
            ShippingAddressLine2 = @ShippingAddressLine2,
            ShippingCity = @ShippingCity,
            ShippingState = @ShippingState,
            ShippingCountry = @ShippingCountry,
            ShippingPincode = @ShippingPincode,
            OpeningBalance = @OpeningBalance,
            OpeningBalanceType = @OpeningBalanceType,
            CreditLimit = @CreditLimit,
            CreditPeriodDays = @CreditPeriodDays,
            IsActive = @IsActive,
            ModifiedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Party was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Party updated.' AS [Message];
        EXEC dbo.sp_Party_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_Delete
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Parties
        SET IsDeleted = 1, IsActive = 0, DeletedOn = SYSUTCDATETIME(), ModifiedOn = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Party was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Party deleted.' AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_SetActive
    @Id UNIQUEIDENTIFIER,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Parties SET IsActive = @IsActive, ModifiedOn = SYSUTCDATETIME() WHERE Id = @Id AND IsDeleted = 0;
        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 404 AS StatusCode, N'Party was not found.' AS [Message];
            RETURN;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, CASE WHEN @IsActive = 1 THEN N'Party activated.' ELSE N'Party deactivated.' END AS [Message];
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PartySettings_Get
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.PartySettings)
    BEGIN
        INSERT INTO dbo.PartySettings DEFAULT VALUES;
    END;

    SELECT TOP (1) Id, EnablePartyGrouping, EnableShippingAddress, PrintShippingAddress, EnablePartyStatus,
           EnablePaymentReminder, ReminderDays, ReminderMessage, EnableLoyaltyPoints,
           AdditionalField1Name, AdditionalField1Enabled, AdditionalField1ShowInPrint,
           AdditionalField2Name, AdditionalField2Enabled, AdditionalField2ShowInPrint,
           AdditionalField3Name, AdditionalField3Enabled, AdditionalField3ShowInPrint,
           AdditionalField4Name, AdditionalField4Enabled, AdditionalField4ShowInPrint, AdditionalField4Type,
           CreatedOn, ModifiedOn
    FROM dbo.PartySettings
    ORDER BY CreatedOn;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PartySettings_Update
    @EnablePartyGrouping BIT,
    @EnableShippingAddress BIT,
    @PrintShippingAddress BIT,
    @EnablePartyStatus BIT,
    @EnablePaymentReminder BIT,
    @ReminderDays INT,
    @ReminderMessage NVARCHAR(500) = NULL,
    @EnableLoyaltyPoints BIT,
    @AdditionalField1Name NVARCHAR(100) = NULL,
    @AdditionalField1Enabled BIT,
    @AdditionalField1ShowInPrint BIT,
    @AdditionalField2Name NVARCHAR(100) = NULL,
    @AdditionalField2Enabled BIT,
    @AdditionalField2ShowInPrint BIT,
    @AdditionalField3Name NVARCHAR(100) = NULL,
    @AdditionalField3Enabled BIT,
    @AdditionalField3ShowInPrint BIT,
    @AdditionalField4Name NVARCHAR(100) = NULL,
    @AdditionalField4Enabled BIT,
    @AdditionalField4ShowInPrint BIT,
    @AdditionalField4Type INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PartySettings)
        BEGIN
            INSERT INTO dbo.PartySettings DEFAULT VALUES;
        END;

        DECLARE @Id UNIQUEIDENTIFIER = (SELECT TOP (1) Id FROM dbo.PartySettings ORDER BY CreatedOn);
        UPDATE dbo.PartySettings
        SET EnablePartyGrouping = @EnablePartyGrouping,
            EnableShippingAddress = @EnableShippingAddress,
            PrintShippingAddress = @PrintShippingAddress,
            EnablePartyStatus = @EnablePartyStatus,
            EnablePaymentReminder = @EnablePaymentReminder,
            ReminderDays = @ReminderDays,
            ReminderMessage = @ReminderMessage,
            EnableLoyaltyPoints = @EnableLoyaltyPoints,
            AdditionalField1Name = @AdditionalField1Name,
            AdditionalField1Enabled = @AdditionalField1Enabled,
            AdditionalField1ShowInPrint = @AdditionalField1ShowInPrint,
            AdditionalField2Name = @AdditionalField2Name,
            AdditionalField2Enabled = @AdditionalField2Enabled,
            AdditionalField2ShowInPrint = @AdditionalField2ShowInPrint,
            AdditionalField3Name = @AdditionalField3Name,
            AdditionalField3Enabled = @AdditionalField3Enabled,
            AdditionalField3ShowInPrint = @AdditionalField3ShowInPrint,
            AdditionalField4Name = @AdditionalField4Name,
            AdditionalField4Enabled = @AdditionalField4Enabled,
            AdditionalField4ShowInPrint = @AdditionalField4ShowInPrint,
            AdditionalField4Type = @AdditionalField4Type,
            ModifiedOn = SYSUTCDATETIME()
        WHERE Id = @Id;

        SELECT 200 AS StatusCode, N'Party settings updated.' AS [Message];
        EXEC dbo.sp_PartySettings_Get;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Pages AS target
    USING (VALUES (N'Party', N'Party Management', N'/parties', N'contact', 35)) AS source(Name, DisplayName, Route, Icon, SortOrder)
    ON target.Name = source.Name
    WHEN NOT MATCHED THEN
        INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.RolePermissions', N'U') IS NOT NULL
BEGIN
    DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');
    DECLARE @PartyPageId INT = (SELECT Id FROM dbo.Pages WHERE Name = N'Party');

    IF @SuperAdminRoleId IS NOT NULL AND @PartyPageId IS NOT NULL
    BEGIN
        MERGE dbo.RolePermissions AS target
        USING (SELECT @SuperAdminRoleId AS RoleId, @PartyPageId AS PageId) AS source
        ON target.RoleId = source.RoleId AND target.PageId = source.PageId
        WHEN MATCHED THEN
            UPDATE SET CanView = 1, CanCreate = 1, CanEdit = 1, CanDelete = 1
        WHEN NOT MATCHED THEN
            INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
            VALUES(source.RoleId, source.PageId, 1, 1, 1, 1, 0, 0);
    END;
END;
GO


/* ============================================================================
   Source: backend\database\Scripts\002_ItemModule.sql
   ============================================================================ */
/*
    Cosmos ERP Item Management Module
    SQL Server
    Safe to run more than once.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Units', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Units
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Units PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        ShortName NVARCHAR(20) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Units_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Units_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Units_IsDeleted DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categories PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Categories_IsDeleted DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Items
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Items PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        ItemCode NVARCHAR(50) NOT NULL,
        Barcode NVARCHAR(100) NULL,
        CategoryId BIGINT NOT NULL,
        UnitId BIGINT NOT NULL,
        ItemType INT NOT NULL,
        PurchasePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_PurchasePrice DEFAULT (0),
        SalesPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_SalesPrice DEFAULT (0),
        HSNCode NVARCHAR(50) NULL,
        GSTRate DECIMAL(5,2) NOT NULL CONSTRAINT DF_Items_GSTRate DEFAULT (0),
        TrackInventory BIT NOT NULL CONSTRAINT DF_Items_TrackInventory DEFAULT (1),
        OpeningStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_OpeningStock DEFAULT (0),
        OpeningStockValue DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_OpeningStockValue DEFAULT (0),
        CurrentStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_CurrentStock DEFAULT (0),
        ReservedStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_ReservedStock DEFAULT (0),
        MinimumStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_Items_MinimumStock DEFAULT (0),
        Description NVARCHAR(1000) NULL,
        ImageUrl NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Items_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Items_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Items_IsDeleted DEFAULT (0),
        CONSTRAINT FK_Items_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id),
        CONSTRAINT FK_Items_Units FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id),
        CONSTRAINT CK_Items_ItemType CHECK (ItemType IN (1, 2)),
        CONSTRAINT CK_Items_GSTRate CHECK (GSTRate >= 0 AND GSTRate <= 100),
        CONSTRAINT CK_Items_NonNegativeAmounts CHECK (
            PurchasePrice >= 0 AND SalesPrice >= 0 AND OpeningStock >= 0 AND OpeningStockValue >= 0
            AND CurrentStock >= 0 AND ReservedStock >= 0 AND MinimumStock >= 0
        )
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Units_Name' AND object_id = OBJECT_ID(N'dbo.Units'))
    CREATE UNIQUE INDEX UX_Units_Name ON dbo.Units(Name) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Categories_Name' AND object_id = OBJECT_ID(N'dbo.Categories'))
    CREATE UNIQUE INDEX UX_Categories_Name ON dbo.Categories(Name) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Items_ItemCode' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE UNIQUE INDEX UX_Items_ItemCode ON dbo.Items(ItemCode) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_Barcode' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_Barcode ON dbo.Items(Barcode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_Name' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_Name ON dbo.Items(Name);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_CategoryId' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_CategoryId ON dbo.Items(CategoryId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_UnitId' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_UnitId ON dbo.Items(UnitId);
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_GetById
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description, IsActive, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy, IsDeleted
    FROM dbo.Categories
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_GetList
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'CreatedAt', N'ModifiedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, Name, Description, IsActive, CreatedAt, ModifiedAt, COUNT(1) OVER() AS TotalCount
        FROM dbo.Categories
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR Name LIKE @SearchPattern OR Description LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(110);
    SET @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;

    EXEC sp_executesql
        @Sql,
        N'@SearchPattern NVARCHAR(110), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_NameExists
    @Name NVARCHAR(100),
    @ExcludingId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Categories
        WHERE Name = LTRIM(RTRIM(@Name)) AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Exists
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Categories WHERE Id = @Id AND IsDeleted = 0) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Create
    @Name NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = @Name AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Category name already exists.' AS [Message];
            RETURN;
        END;

        INSERT INTO dbo.Categories(Name, Description, IsActive)
        VALUES (LTRIM(RTRIM(@Name)), @Description, @IsActive);

        DECLARE @Id BIGINT = CAST(SCOPE_IDENTITY() AS BIGINT);
        SELECT 201 AS StatusCode, N'Category created.' AS [Message];
        EXEC dbo.sp_Category_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Update
    @Id BIGINT,
    @Name NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Id = @Id AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Category was not found.' AS [Message];
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = @Name AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Category name already exists.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.Categories
        SET Name = LTRIM(RTRIM(@Name)), Description = @Description, IsActive = @IsActive, ModifiedAt = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        SELECT 200 AS StatusCode, N'Category updated.' AS [Message];
        EXEC dbo.sp_Category_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Category_Delete
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Categories SET IsDeleted = 1, IsActive = 0, ModifiedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 AS StatusCode, N'Category was not found.' AS [Message];
    ELSE SELECT 200 AS StatusCode, N'Category deleted.' AS [Message];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_GetById
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, ShortName, Description, IsActive, CreatedAt, CreatedBy, ModifiedAt, ModifiedBy, IsDeleted
    FROM dbo.Units
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_GetList
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'ShortName', N'CreatedAt', N'ModifiedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT Id, Name, ShortName, Description, IsActive, CreatedAt, ModifiedAt, COUNT(1) OVER() AS TotalCount
        FROM dbo.Units
        WHERE IsDeleted = 0
          AND (@IsActive IS NULL OR IsActive = @IsActive)
          AND (@SearchPattern IS NULL OR Name LIKE @SearchPattern OR ShortName LIKE @SearchPattern OR Description LIKE @SearchPattern)
        ORDER BY ' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(110);
    SET @SearchPattern =CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;
    
    EXEC sp_executesql
        @Sql,
        N'@SearchPattern NVARCHAR(110), @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_NameExists
    @Name NVARCHAR(100),
    @ExcludingId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Units
        WHERE Name = LTRIM(RTRIM(@Name)) AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Exists
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Units WHERE Id = @Id AND IsDeleted = 0) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Create
    @Name NVARCHAR(100),
    @ShortName NVARCHAR(20),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Units WHERE Name = @Name AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Unit name already exists.' AS [Message];
            RETURN;
        END;

        INSERT INTO dbo.Units(Name, ShortName, Description, IsActive)
        VALUES (LTRIM(RTRIM(@Name)), LTRIM(RTRIM(@ShortName)), @Description, @IsActive);

        DECLARE @Id BIGINT = CAST(SCOPE_IDENTITY() AS BIGINT);
        SELECT 201 AS StatusCode, N'Unit created.' AS [Message];
        EXEC dbo.sp_Unit_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Update
    @Id BIGINT,
    @Name NVARCHAR(100),
    @ShortName NVARCHAR(20),
    @Description NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE Id = @Id AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Unit was not found.' AS [Message];
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Units WHERE Name = @Name AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Unit name already exists.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.Units
        SET Name = LTRIM(RTRIM(@Name)), ShortName = LTRIM(RTRIM(@ShortName)), Description = @Description, IsActive = @IsActive, ModifiedAt = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        SELECT 200 AS StatusCode, N'Unit updated.' AS [Message];
        EXEC dbo.sp_Unit_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Unit_Delete
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Units SET IsDeleted = 1, IsActive = 0, ModifiedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 AS StatusCode, N'Unit was not found.' AS [Message];
    ELSE SELECT 200 AS StatusCode, N'Unit deleted.' AS [Message];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetById
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.Id, i.Name, i.ItemCode, i.Barcode, i.CategoryId, c.Name AS CategoryName,
           i.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName, i.ItemType,
           i.PurchasePrice, i.SalesPrice, i.HSNCode, i.GSTRate, i.TrackInventory,
           i.OpeningStock, i.OpeningStockValue, i.CurrentStock, i.ReservedStock, i.MinimumStock,
           i.Description, i.ImageUrl, i.IsActive, i.CreatedAt, i.CreatedBy, i.ModifiedAt, i.ModifiedBy, i.IsDeleted
    FROM dbo.Items i
    JOIN dbo.Categories c ON c.Id = i.CategoryId
    JOIN dbo.Units u ON u.Id = i.UnitId
    WHERE i.Id = @Id AND i.IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetList
    @Search NVARCHAR(200) = NULL,
    @Barcode NVARCHAR(100) = NULL,
    @ItemCode NVARCHAR(50) = NULL,
    @CategoryId BIGINT = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'ItemCode', N'Barcode', N'SalesPrice', N'PurchasePrice', N'CurrentStock', N'CreatedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT i.Id, i.Name, i.ItemCode, i.Barcode, i.CategoryId, c.Name AS CategoryName,
               i.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName, i.ItemType,
               i.SalesPrice, i.PurchasePrice, i.CurrentStock, i.ReservedStock, i.MinimumStock,
               i.TrackInventory, i.IsActive, i.CreatedAt, i.ModifiedAt, COUNT(1) OVER() AS TotalCount
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        WHERE i.IsDeleted = 0
          AND (@IsActive IS NULL OR i.IsActive = @IsActive)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@BarcodePattern IS NULL OR i.Barcode LIKE @BarcodePattern)
          AND (@ItemCodePattern IS NULL OR i.ItemCode LIKE @ItemCodePattern)
          AND (@SearchPattern IS NULL OR i.Name LIKE @SearchPattern)
        ORDER BY i.' + QUOTENAME(@SortBy) + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    
    DECLARE @SearchPattern NVARCHAR(210);
    DECLARE @BarcodePattern NVARCHAR(110);
    DECLARE @ItemCodePattern NVARCHAR(60);

    SET @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    SET @BarcodePattern = CASE WHEN @Barcode IS NULL OR LTRIM(RTRIM(@Barcode)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Barcode)) + N'%' END;
    SET @ItemCodePattern = CASE WHEN @ItemCode IS NULL OR LTRIM(RTRIM(@ItemCode)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@ItemCode)) + N'%' END;

    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;
    
    EXEC sp_executesql
        @Sql,
        N'@SearchPattern NVARCHAR(210), @BarcodePattern NVARCHAR(110), @ItemCodePattern NVARCHAR(60), @CategoryId BIGINT, @IsActive BIT, @Offset INT, @PageSize INT',
        @SearchPattern = @SearchPattern,
        @BarcodePattern = @BarcodePattern,
        @ItemCodePattern = @ItemCodePattern,
        @CategoryId = @CategoryId,
        @IsActive = @IsActive,
        @Offset = @Offset,
        @PageSize = @PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_ItemCodeExists
    @ItemCode NVARCHAR(50),
    @ExcludingId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Items
        WHERE ItemCode = LTRIM(RTRIM(@ItemCode)) AND IsDeleted = 0 AND (@ExcludingId IS NULL OR Id <> @ExcludingId)
    ) THEN 1 ELSE 0 END AS BIT);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Create
    @Name NVARCHAR(200),
    @ItemCode NVARCHAR(50),
    @Barcode NVARCHAR(100) = NULL,
    @CategoryId BIGINT,
    @UnitId BIGINT,
    @ItemType INT,
    @PurchasePrice DECIMAL(18,2),
    @SalesPrice DECIMAL(18,2),
    @HSNCode NVARCHAR(50) = NULL,
    @GSTRate DECIMAL(5,2),
    @TrackInventory BIT,
    @OpeningStock DECIMAL(18,2),
    @OpeningStockValue DECIMAL(18,2),
    @CurrentStock DECIMAL(18,2),
    @ReservedStock DECIMAL(18,2),
    @MinimumStock DECIMAL(18,2),
    @Description NVARCHAR(1000) = NULL,
    @ImageUrl NVARCHAR(1000) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.Items WHERE ItemCode = @ItemCode AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Item code already exists.' AS [Message];
            RETURN;
        END;
        IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Id = @CategoryId AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Category was not found.' AS [Message];
            RETURN;
        END;
        IF NOT EXISTS (SELECT 1 FROM dbo.Units WHERE Id = @UnitId AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Unit was not found.' AS [Message];
            RETURN;
        END;

        INSERT INTO dbo.Items
        (
            Name, ItemCode, Barcode, CategoryId, UnitId, ItemType, PurchasePrice, SalesPrice,
            HSNCode, GSTRate, TrackInventory, OpeningStock, OpeningStockValue, CurrentStock,
            ReservedStock, MinimumStock, Description, ImageUrl, IsActive
        )
        VALUES
        (
            LTRIM(RTRIM(@Name)), LTRIM(RTRIM(@ItemCode)), @Barcode, @CategoryId, @UnitId, @ItemType, @PurchasePrice, @SalesPrice,
            @HSNCode, @GSTRate, @TrackInventory, @OpeningStock, @OpeningStockValue, @CurrentStock,
            @ReservedStock, @MinimumStock, @Description, @ImageUrl, @IsActive
        );

        DECLARE @Id BIGINT = CAST(SCOPE_IDENTITY() AS BIGINT);
        SELECT 201 AS StatusCode, N'Item created.' AS [Message];
        EXEC dbo.sp_Item_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Update
    @Id BIGINT,
    @Name NVARCHAR(200),
    @ItemCode NVARCHAR(50),
    @Barcode NVARCHAR(100) = NULL,
    @CategoryId BIGINT,
    @UnitId BIGINT,
    @ItemType INT,
    @PurchasePrice DECIMAL(18,2),
    @SalesPrice DECIMAL(18,2),
    @HSNCode NVARCHAR(50) = NULL,
    @GSTRate DECIMAL(5,2),
    @TrackInventory BIT,
    @OpeningStock DECIMAL(18,2),
    @OpeningStockValue DECIMAL(18,2),
    @CurrentStock DECIMAL(18,2),
    @ReservedStock DECIMAL(18,2),
    @MinimumStock DECIMAL(18,2),
    @Description NVARCHAR(1000) = NULL,
    @ImageUrl NVARCHAR(1000) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Items WHERE Id = @Id AND IsDeleted = 0)
        BEGIN
            SELECT 404 AS StatusCode, N'Item was not found.' AS [Message];
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Items WHERE ItemCode = @ItemCode AND Id <> @Id AND IsDeleted = 0)
        BEGIN
            SELECT 409 AS StatusCode, N'Item code already exists.' AS [Message];
            RETURN;
        END;

        UPDATE dbo.Items
        SET Name = LTRIM(RTRIM(@Name)),
            ItemCode = LTRIM(RTRIM(@ItemCode)),
            Barcode = @Barcode,
            CategoryId = @CategoryId,
            UnitId = @UnitId,
            ItemType = @ItemType,
            PurchasePrice = @PurchasePrice,
            SalesPrice = @SalesPrice,
            HSNCode = @HSNCode,
            GSTRate = @GSTRate,
            TrackInventory = @TrackInventory,
            OpeningStock = @OpeningStock,
            OpeningStockValue = @OpeningStockValue,
            CurrentStock = @CurrentStock,
            ReservedStock = @ReservedStock,
            MinimumStock = @MinimumStock,
            Description = @Description,
            ImageUrl = @ImageUrl,
            IsActive = @IsActive,
            ModifiedAt = SYSUTCDATETIME()
        WHERE Id = @Id AND IsDeleted = 0;

        SELECT 200 AS StatusCode, N'Item updated.' AS [Message];
        EXEC dbo.sp_Item_GetById @Id = @Id;
    END TRY
    BEGIN CATCH
        SELECT 500 AS StatusCode, ERROR_MESSAGE() AS [Message];
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Delete
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Items SET IsDeleted = 1, IsActive = 0, ModifiedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
    IF @@ROWCOUNT = 0 SELECT 404 AS StatusCode, N'Item was not found.' AS [Message];
    ELSE SELECT 200 AS StatusCode, N'Item deleted.' AS [Message];
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Pages AS target
    USING (VALUES
        (N'Items', N'Items', N'/items', N'package', 40),
        (N'Categories', N'Categories', N'/categories', N'tags', 41),
        (N'Units', N'Units', N'/units', N'ruler', 42)
    ) AS source(Name, DisplayName, Route, Icon, SortOrder)
    ON target.Name = source.Name
    WHEN MATCHED THEN
        UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, SortOrder = source.SortOrder, IsActive = 1
    WHEN NOT MATCHED THEN
        INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive)
        VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.RolePermissions', N'U') IS NOT NULL
BEGIN
    DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');

    IF @SuperAdminRoleId IS NOT NULL
    BEGIN
        MERGE dbo.RolePermissions AS target
        USING (
            SELECT @SuperAdminRoleId AS RoleId, Id AS PageId
            FROM dbo.Pages
            WHERE Name IN (N'Items', N'Categories', N'Units')
        ) AS source
        ON target.RoleId = source.RoleId AND target.PageId = source.PageId
        WHEN MATCHED THEN
            UPDATE SET CanView = 1, CanCreate = 1, CanEdit = 1, CanDelete = 1
        WHEN NOT MATCHED THEN
            INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
            VALUES(source.RoleId, source.PageId, 1, 1, 1, 1, 0, 0);
    END;
END;
GO


/* ============================================================================
   Source: backend\database\Scripts\HR\001_HRMS_Module.sql
   ============================================================================ */
/*
    Cosmos ERP HRMS Module
    SQL Server, idempotent deployment script.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.HR_Departments', N'U') IS NULL
CREATE TABLE dbo.HR_Departments
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Departments PRIMARY KEY,
    DepartmentCode NVARCHAR(20) NOT NULL,
    DepartmentName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_HR_Departments_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Departments_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Departments_IsDeleted DEFAULT (0)
);
GO

IF OBJECT_ID(N'dbo.HR_Designations', N'U') IS NULL
CREATE TABLE dbo.HR_Designations
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Designations PRIMARY KEY,
    DesignationCode NVARCHAR(20) NOT NULL,
    DesignationName NVARCHAR(200) NOT NULL,
    DepartmentId BIGINT NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_HR_Designations_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Designations_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Designations_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_Designations_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.HR_Departments(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_Shifts', N'U') IS NULL
CREATE TABLE dbo.HR_Shifts
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Shifts PRIMARY KEY,
    ShiftCode NVARCHAR(20) NOT NULL, ShiftName NVARCHAR(200) NOT NULL,
    StartTime TIME(0) NOT NULL, EndTime TIME(0) NOT NULL,
    GraceMinutes INT NOT NULL CONSTRAINT DF_HR_Shifts_Grace DEFAULT (0),
    IsNightShift BIT NOT NULL CONSTRAINT DF_HR_Shifts_Night DEFAULT (0),
    WeeklyHours DECIMAL(6,2) NOT NULL CONSTRAINT DF_HR_Shifts_Weekly DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_HR_Shifts_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Shifts_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Shifts_IsDeleted DEFAULT (0),
    CONSTRAINT CK_HR_Shifts_Grace CHECK (GraceMinutes BETWEEN 0 AND 240),
    CONSTRAINT CK_HR_Shifts_WeeklyHours CHECK (WeeklyHours BETWEEN 0 AND 168)
);
GO

IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NULL
CREATE TABLE dbo.HR_Employees
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Employees PRIMARY KEY,
    EmployeeCode NVARCHAR(30) NOT NULL, FirstName NVARCHAR(100) NOT NULL, LastName NVARCHAR(100) NULL,
    Gender INT NOT NULL, DateOfBirth DATE NULL, JoiningDate DATE NOT NULL,
    Mobile NVARCHAR(20) NULL, Email NVARCHAR(200) NULL,
    DepartmentId BIGINT NOT NULL, DesignationId BIGINT NOT NULL,
    ReportingManagerId BIGINT NULL, ShiftId BIGINT NOT NULL,
    EmploymentType INT NOT NULL, Status INT NOT NULL,
    ProfilePhotoUrl NVARCHAR(1000) NULL,
    ResignedDate DATETIME2(3) NULL, LastWorkingDate DATE NULL, ResignationReason NVARCHAR(500) NULL,
    RejoinedDate DATETIME2(3) NULL, RejoinRemarks NVARCHAR(500) NULL,
    IsActive AS CONVERT(BIT, CASE WHEN Status = 1 AND IsDeleted = 0 THEN 1 ELSE 0 END) PERSISTED,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Employees_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Employees_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_Employees_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.HR_Departments(Id),
    CONSTRAINT FK_HR_Employees_Designation FOREIGN KEY (DesignationId) REFERENCES dbo.HR_Designations(Id),
    CONSTRAINT FK_HR_Employees_Manager FOREIGN KEY (ReportingManagerId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_Employees_Shift FOREIGN KEY (ShiftId) REFERENCES dbo.HR_Shifts(Id),
    CONSTRAINT CK_HR_Employees_Gender CHECK (Gender BETWEEN 0 AND 3),
    CONSTRAINT CK_HR_Employees_EmploymentType CHECK (EmploymentType BETWEEN 1 AND 4),
    CONSTRAINT CK_HR_Employees_Status CHECK (Status BETWEEN 1 AND 4)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeAddresses', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeAddresses
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeAddresses PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, AddressType NVARCHAR(30) NOT NULL,
    AddressLine1 NVARCHAR(250) NOT NULL, AddressLine2 NVARCHAR(250) NULL,
    City NVARCHAR(100) NULL, State NVARCHAR(100) NULL, Country NVARCHAR(100) NULL, Pincode NVARCHAR(20) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeAddresses_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeAddresses_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeAddresses_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeBankAccounts', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeBankAccounts
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeBankAccounts PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, BankName NVARCHAR(150) NOT NULL,
    AccountNumber NVARCHAR(50) NOT NULL, IFSCCode NVARCHAR(20) NOT NULL,
    BranchName NVARCHAR(150) NULL, UPIId NVARCHAR(100) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeBank_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeBank_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeBank_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeDocuments', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeDocuments
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeDocuments PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, DocumentType NVARCHAR(50) NOT NULL,
    FileName NVARCHAR(255) NOT NULL, FilePath NVARCHAR(1000) NOT NULL, ExpiryDate DATE NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeDocuments_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeDocuments_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeDocuments_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_Attendance', N'U') IS NULL
CREATE TABLE dbo.HR_Attendance
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_Attendance PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, AttendanceDate DATE NOT NULL,
    CheckInTime DATETIME2(3) NULL, CheckOutTime DATETIME2(3) NULL,
    WorkingMinutes INT NOT NULL CONSTRAINT DF_HR_Attendance_Working DEFAULT (0),
    OvertimeMinutes INT NOT NULL CONSTRAINT DF_HR_Attendance_Overtime DEFAULT (0),
    AttendanceStatus INT NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_Attendance_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_Attendance_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_Attendance_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT CK_HR_Attendance_Status CHECK (AttendanceStatus BETWEEN 1 AND 7),
    CONSTRAINT CK_HR_Attendance_Times CHECK (CheckOutTime IS NULL OR CheckInTime IS NULL OR CheckOutTime > CheckInTime)
);
GO

IF OBJECT_ID(N'dbo.HR_AttendanceAdjustments', N'U') IS NULL
CREATE TABLE dbo.HR_AttendanceAdjustments
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_AttendanceAdjustments PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, AttendanceId BIGINT NOT NULL,
    Reason NVARCHAR(500) NOT NULL, Remarks NVARCHAR(500) NULL,
    Status INT NOT NULL CONSTRAINT DF_HR_AttendanceAdjustments_Status DEFAULT (1),
    ApprovedBy BIGINT NULL, ApprovedOn DATETIME2(3) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_AttendanceAdjustments_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_AttendanceAdjustments_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_AttendanceAdjustments_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_AttendanceAdjustments_Attendance FOREIGN KEY (AttendanceId) REFERENCES dbo.HR_Attendance(Id),
    CONSTRAINT CK_HR_AttendanceAdjustments_Status CHECK (Status BETWEEN 1 AND 3)
);
GO

IF OBJECT_ID(N'dbo.HR_LeaveTypes', N'U') IS NULL
CREATE TABLE dbo.HR_LeaveTypes
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_LeaveTypes PRIMARY KEY,
    LeaveCode NVARCHAR(20) NOT NULL, LeaveName NVARCHAR(100) NOT NULL,
    AnnualQuota DECIMAL(8,2) NOT NULL, IsPaidLeave BIT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_HR_LeaveTypes_IsActive DEFAULT (1),
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_LeaveTypes_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_LeaveTypes_IsDeleted DEFAULT (0)
);
GO

IF OBJECT_ID(N'dbo.HR_LeaveBalances', N'U') IS NULL
CREATE TABLE dbo.HR_LeaveBalances
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_LeaveBalances PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, LeaveTypeId BIGINT NOT NULL,
    OpeningBalance DECIMAL(8,2) NOT NULL, UsedBalance DECIMAL(8,2) NOT NULL CONSTRAINT DF_HR_LeaveBalances_Used DEFAULT (0),
    RemainingBalance DECIMAL(8,2) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_LeaveBalances_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_LeaveBalances_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_LeaveBalances_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_LeaveBalances_Type FOREIGN KEY (LeaveTypeId) REFERENCES dbo.HR_LeaveTypes(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_LeaveApplications', N'U') IS NULL
CREATE TABLE dbo.HR_LeaveApplications
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_LeaveApplications PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, LeaveTypeId BIGINT NOT NULL,
    StartDate DATE NOT NULL, EndDate DATE NOT NULL,
    LeaveDays AS CONVERT(DECIMAL(8,2), DATEDIFF(DAY, StartDate, EndDate) + 1) PERSISTED,
    Reason NVARCHAR(500) NOT NULL, Remarks NVARCHAR(500) NULL,
    Status INT NOT NULL CONSTRAINT DF_HR_LeaveApplications_Status DEFAULT (1),
    ApprovedBy BIGINT NULL, ApprovedOn DATETIME2(3) NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_LeaveApplications_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_LeaveApplications_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_LeaveApplications_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_LeaveApplications_Type FOREIGN KEY (LeaveTypeId) REFERENCES dbo.HR_LeaveTypes(Id),
    CONSTRAINT CK_HR_LeaveApplications_Dates CHECK (EndDate >= StartDate),
    CONSTRAINT CK_HR_LeaveApplications_Status CHECK (Status BETWEEN 1 AND 4)
);
GO

IF OBJECT_ID(N'dbo.HR_SalaryStructures', N'U') IS NULL
CREATE TABLE dbo.HR_SalaryStructures
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_SalaryStructures PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_SalaryStructures_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_SalaryStructures_IsDeleted DEFAULT (0)
);
GO

IF OBJECT_ID(N'dbo.HR_SalaryComponents', N'U') IS NULL
CREATE TABLE dbo.HR_SalaryComponents
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_SalaryComponents PRIMARY KEY,
    ComponentName NVARCHAR(150) NOT NULL, ComponentType INT NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_SalaryComponents_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_SalaryComponents_IsDeleted DEFAULT (0),
    CONSTRAINT CK_HR_SalaryComponents_Type CHECK (ComponentType IN (1,2))
);
GO

-- Component amounts are required to make a salary structure calculable.
IF OBJECT_ID(N'dbo.HR_SalaryStructureComponents', N'U') IS NULL
CREATE TABLE dbo.HR_SalaryStructureComponents
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_SalaryStructureComponents PRIMARY KEY,
    SalaryStructureId BIGINT NOT NULL, SalaryComponentId BIGINT NOT NULL, Amount DECIMAL(18,2) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_SalaryStructureComponents_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_SalaryStructureComponents_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_SalaryStructureComponents_Structure FOREIGN KEY (SalaryStructureId) REFERENCES dbo.HR_SalaryStructures(Id),
    CONSTRAINT FK_HR_SalaryStructureComponents_Component FOREIGN KEY (SalaryComponentId) REFERENCES dbo.HR_SalaryComponents(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures', N'U') IS NULL
CREATE TABLE dbo.HR_EmployeeSalaryStructures
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_EmployeeSalaryStructures PRIMARY KEY,
    EmployeeId BIGINT NOT NULL, SalaryStructureId BIGINT NOT NULL, EffectiveDate DATE NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_EmployeeSalaryStructures_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_EmployeeSalaryStructures_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_EmployeeSalaryStructures_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id),
    CONSTRAINT FK_HR_EmployeeSalaryStructures_Structure FOREIGN KEY (SalaryStructureId) REFERENCES dbo.HR_SalaryStructures(Id)
);
GO

IF OBJECT_ID(N'dbo.HR_PayrollRuns', N'U') IS NULL
CREATE TABLE dbo.HR_PayrollRuns
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_PayrollRuns PRIMARY KEY,
    PayrollMonth INT NOT NULL, PayrollYear INT NOT NULL, Status INT NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_PayrollRuns_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_PayrollRuns_IsDeleted DEFAULT (0),
    CONSTRAINT CK_HR_PayrollRuns_Month CHECK (PayrollMonth BETWEEN 1 AND 12),
    CONSTRAINT CK_HR_PayrollRuns_Status CHECK (Status BETWEEN 1 AND 3)
);
GO

IF OBJECT_ID(N'dbo.HR_PayrollDetails', N'U') IS NULL
CREATE TABLE dbo.HR_PayrollDetails
(
    Id BIGINT IDENTITY(1,1) CONSTRAINT PK_HR_PayrollDetails PRIMARY KEY,
    PayrollRunId BIGINT NOT NULL, EmployeeId BIGINT NOT NULL,
    PayableDays DECIMAL(8,2) NOT NULL, GrossSalary DECIMAL(18,2) NOT NULL,
    TotalDeduction DECIMAL(18,2) NOT NULL, NetSalary DECIMAL(18,2) NOT NULL,
    CreatedOn DATETIME2(3) NOT NULL CONSTRAINT DF_HR_PayrollDetails_CreatedOn DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedOn DATETIME2(3) NULL, UpdatedBy BIGINT NULL,
    DeletedOn DATETIME2(3) NULL, DeletedBy BIGINT NULL,
    IsDeleted BIT NOT NULL CONSTRAINT DF_HR_PayrollDetails_IsDeleted DEFAULT (0),
    CONSTRAINT FK_HR_PayrollDetails_Run FOREIGN KEY (PayrollRunId) REFERENCES dbo.HR_PayrollRuns(Id),
    CONSTRAINT FK_HR_PayrollDetails_Employee FOREIGN KEY (EmployeeId) REFERENCES dbo.HR_Employees(Id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Departments_Code' AND object_id=OBJECT_ID(N'dbo.HR_Departments'))
    CREATE UNIQUE INDEX UX_HR_Departments_Code ON dbo.HR_Departments(DepartmentCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Departments_Name' AND object_id=OBJECT_ID(N'dbo.HR_Departments'))
    CREATE UNIQUE INDEX UX_HR_Departments_Name ON dbo.HR_Departments(DepartmentName) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Designations_Code' AND object_id=OBJECT_ID(N'dbo.HR_Designations'))
    CREATE UNIQUE INDEX UX_HR_Designations_Code ON dbo.HR_Designations(DesignationCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Shifts_Code' AND object_id=OBJECT_ID(N'dbo.HR_Shifts'))
    CREATE UNIQUE INDEX UX_HR_Shifts_Code ON dbo.HR_Shifts(ShiftCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Employees_Code' AND object_id=OBJECT_ID(N'dbo.HR_Employees'))
    CREATE UNIQUE INDEX UX_HR_Employees_Code ON dbo.HR_Employees(EmployeeCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Employees_Email' AND object_id=OBJECT_ID(N'dbo.HR_Employees'))
    CREATE UNIQUE INDEX UX_HR_Employees_Email ON dbo.HR_Employees(Email) WHERE IsDeleted=0 AND Email IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Employees_Mobile' AND object_id=OBJECT_ID(N'dbo.HR_Employees'))
    CREATE UNIQUE INDEX UX_HR_Employees_Mobile ON dbo.HR_Employees(Mobile) WHERE IsDeleted=0 AND Mobile IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_Attendance_EmployeeDate' AND object_id=OBJECT_ID(N'dbo.HR_Attendance'))
    CREATE UNIQUE INDEX UX_HR_Attendance_EmployeeDate ON dbo.HR_Attendance(EmployeeId, AttendanceDate) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_LeaveBalances_EmployeeType' AND object_id=OBJECT_ID(N'dbo.HR_LeaveBalances'))
    CREATE UNIQUE INDEX UX_HR_LeaveBalances_EmployeeType ON dbo.HR_LeaveBalances(EmployeeId, LeaveTypeId) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_PayrollRuns_Period' AND object_id=OBJECT_ID(N'dbo.HR_PayrollRuns'))
    CREATE UNIQUE INDEX UX_HR_PayrollRuns_Period ON dbo.HR_PayrollRuns(PayrollMonth, PayrollYear) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HR_PayrollDetails_RunEmployee' AND object_id=OBJECT_ID(N'dbo.HR_PayrollDetails'))
    CREATE UNIQUE INDEX UX_HR_PayrollDetails_RunEmployee ON dbo.HR_PayrollDetails(PayrollRunId, EmployeeId) WHERE IsDeleted=0;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Entity_Exists @Entity NVARCHAR(30), @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, CASE
        WHEN @Entity=N'Department' AND EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE Id=@Id AND IsDeleted=0) THEN 1
        WHEN @Entity=N'Designation' AND EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE Id=@Id AND IsDeleted=0) THEN 1
        WHEN @Entity=N'Shift' AND EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@Id AND IsDeleted=0) THEN 1
        WHEN @Entity=N'Employee' AND EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@Id AND IsDeleted=0) THEN 1
        ELSE 0 END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id,DepartmentCode,DepartmentName,Description,IsActive,CreatedOn,UpdatedOn,0 TotalCount
    FROM dbo.HR_Departments WHERE Id=@Id AND IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_GetList
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'DepartmentCode',N'DepartmentName',N'CreatedOn') THEN @SortBy ELSE N'DepartmentName' END;
 SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT Id,DepartmentCode,DepartmentName,Description,IsActive,CreatedOn,UpdatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Departments WHERE IsDeleted=0 AND (@a IS NULL OR IsActive=@a) AND (@s IS NULL OR DepartmentCode LIKE @s OR DepartmentName LIKE @s OR Description LIKE @s)
 ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 DECLARE @Offset INT;
 SET @Offset = (@PageNumber - 1) * @PageSize;
 EXEC sp_executesql @sql,N'@a BIT,@s NVARCHAR(210),@o INT,@p INT',@a=@IsActive,@s=@pattern,@o=@Offset,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_ValueExists @Field NVARCHAR(30),@Value NVARCHAR(200),@ExcludingId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE IsDeleted=0 AND (@ExcludingId IS NULL OR Id<>@ExcludingId)
 AND ((@Field=N'DepartmentCode' AND DepartmentCode=LTRIM(RTRIM(@Value))) OR (@Field=N'DepartmentName' AND DepartmentName=LTRIM(RTRIM(@Value))))),1,0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_Create
 @DepartmentCode NVARCHAR(20),@DepartmentName NVARCHAR(200),@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE IsDeleted=0 AND (DepartmentCode=@DepartmentCode OR DepartmentName=@DepartmentName))
  BEGIN SELECT 409 StatusCode,N'Department code or name already exists.' Message; RETURN; END
  INSERT dbo.HR_Departments(DepartmentCode,DepartmentName,Description,IsActive,CreatedBy)
  VALUES(LTRIM(RTRIM(@DepartmentCode)),LTRIM(RTRIM(@DepartmentName)),@Description,@IsActive,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Department created.' Message; EXEC dbo.sp_HR_Department_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_Update
 @Id BIGINT,@DepartmentCode NVARCHAR(20),@DepartmentName NVARCHAR(200),@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE IsDeleted=0 AND Id<>@Id AND (DepartmentCode=@DepartmentCode OR DepartmentName=@DepartmentName))
  BEGIN SELECT 409 StatusCode,N'Department code or name already exists.' Message; RETURN; END
  UPDATE dbo.HR_Departments SET DepartmentCode=LTRIM(RTRIM(@DepartmentCode)),DepartmentName=LTRIM(RTRIM(@DepartmentName)),
   Description=@Description,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Department was not found.' Message; RETURN; END
  SELECT 200 StatusCode,N'Department updated.' Message; EXEC dbo.sp_HR_Department_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Department_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE DepartmentId=@Id AND IsDeleted=0) OR EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE DepartmentId=@Id AND IsDeleted=0)
 BEGIN SELECT 409 StatusCode,N'Department is in use.' Message; RETURN; END
 UPDATE dbo.HR_Departments SET IsDeleted=1,IsActive=0,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Department was not found.',N'Department deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT x.Id,x.DesignationCode,x.DesignationName,x.DepartmentId,d.DepartmentName,x.Description,x.IsActive,x.CreatedOn,x.UpdatedOn,0 TotalCount
 FROM dbo.HR_Designations x JOIN dbo.HR_Departments d ON d.Id=x.DepartmentId WHERE x.Id=@Id AND x.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_GetList
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'DesignationCode',N'DesignationName',N'CreatedOn') THEN @SortBy ELSE N'DesignationName' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT x.Id,x.DesignationCode,x.DesignationName,x.DepartmentId,d.DepartmentName,x.Description,x.IsActive,x.CreatedOn,x.UpdatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Designations x JOIN dbo.HR_Departments d ON d.Id=x.DepartmentId WHERE x.IsDeleted=0 AND (@a IS NULL OR x.IsActive=@a)
 AND (@s IS NULL OR x.DesignationCode LIKE @s OR x.DesignationName LIKE @s OR d.DepartmentName LIKE @s) ORDER BY x.'+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 DECLARE @Offset INT;
 SET @Offset = (@PageNumber - 1) * @PageSize;
 EXEC sp_executesql @sql,N'@a BIT,@s NVARCHAR(210),@o INT,@p INT',@a=@IsActive,@s=@pattern,@o=@Offset,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_Create
 @DesignationCode NVARCHAR(20),@DesignationName NVARCHAR(200),@DepartmentId BIGINT,@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE Id=@DepartmentId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Department was not found.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE DesignationCode=@DesignationCode AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Designation code already exists.' Message; RETURN; END
  INSERT dbo.HR_Designations(DesignationCode,DesignationName,DepartmentId,Description,IsActive,CreatedBy) VALUES(LTRIM(RTRIM(@DesignationCode)),LTRIM(RTRIM(@DesignationName)),@DepartmentId,@Description,@IsActive,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Designation created.' Message; EXEC dbo.sp_HR_Designation_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_Update
 @Id BIGINT,@DesignationCode NVARCHAR(20),@DesignationName NVARCHAR(200),@DepartmentId BIGINT,@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Departments WHERE Id=@DepartmentId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Department was not found.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE DesignationCode=@DesignationCode AND Id<>@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Designation code already exists.' Message; RETURN; END
  UPDATE dbo.HR_Designations SET DesignationCode=LTRIM(RTRIM(@DesignationCode)),DesignationName=LTRIM(RTRIM(@DesignationName)),DepartmentId=@DepartmentId,Description=@Description,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Designation was not found.' Message; RETURN; END
  SELECT 200 StatusCode,N'Designation updated.' Message; EXEC dbo.sp_HR_Designation_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Designation_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE DesignationId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Designation is in use.' Message; RETURN; END
 UPDATE dbo.HR_Designations SET IsDeleted=1,IsActive=0,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Designation was not found.',N'Designation deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,ShiftCode,ShiftName,StartTime,EndTime,GraceMinutes,IsNightShift,WeeklyHours,IsActive,CreatedOn,UpdatedOn,0 TotalCount FROM dbo.HR_Shifts WHERE Id=@Id AND IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_GetList
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'ShiftCode',N'ShiftName',N'StartTime',N'CreatedOn') THEN @SortBy ELSE N'ShiftName' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT Id,ShiftCode,ShiftName,StartTime,EndTime,GraceMinutes,IsNightShift,WeeklyHours,IsActive,CreatedOn,UpdatedOn,COUNT(1) OVER() TotalCount FROM dbo.HR_Shifts
 WHERE IsDeleted=0 AND (@a IS NULL OR IsActive=@a) AND (@s IS NULL OR ShiftCode LIKE @s OR ShiftName LIKE @s) ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 DECLARE @Offset INT;
SET @Offset = (@PageNumber - 1) * @PageSize;
 EXEC sp_executesql @sql,N'@a BIT,@s NVARCHAR(210),@o INT,@p INT',@a=@IsActive,@s=@pattern,@o=@Offset,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_Create
 @ShiftCode NVARCHAR(20),@ShiftName NVARCHAR(200),@StartTime TIME(0),@EndTime TIME(0),@GraceMinutes INT,@IsNightShift BIT,@WeeklyHours DECIMAL(6,2),@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE ShiftCode=@ShiftCode AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Shift code already exists.' Message; RETURN; END
  INSERT dbo.HR_Shifts(ShiftCode,ShiftName,StartTime,EndTime,GraceMinutes,IsNightShift,WeeklyHours,IsActive,CreatedBy)
  VALUES(LTRIM(RTRIM(@ShiftCode)),LTRIM(RTRIM(@ShiftName)),@StartTime,@EndTime,@GraceMinutes,@IsNightShift,@WeeklyHours,@IsActive,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Shift created.' Message; EXEC dbo.sp_HR_Shift_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_Update
 @Id BIGINT,@ShiftCode NVARCHAR(20),@ShiftName NVARCHAR(200),@StartTime TIME(0),@EndTime TIME(0),@GraceMinutes INT,@IsNightShift BIT,@WeeklyHours DECIMAL(6,2),@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE ShiftCode=@ShiftCode AND Id<>@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Shift code already exists.' Message; RETURN; END
  UPDATE dbo.HR_Shifts SET ShiftCode=LTRIM(RTRIM(@ShiftCode)),ShiftName=LTRIM(RTRIM(@ShiftName)),StartTime=@StartTime,EndTime=@EndTime,GraceMinutes=@GraceMinutes,
   IsNightShift=@IsNightShift,WeeklyHours=@WeeklyHours,IsActive=@IsActive,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Shift was not found.' Message; RETURN; END
  SELECT 200 StatusCode,N'Shift updated.' Message; EXEC dbo.sp_HR_Shift_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Shift_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE ShiftId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Shift is in use.' Message; RETURN; END
 UPDATE dbo.HR_Shifts SET IsDeleted=1,IsActive=0,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Shift was not found.',N'Shift deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT e.Id,e.EmployeeCode,e.FirstName,e.LastName,e.Gender,e.DateOfBirth,e.JoiningDate,e.Mobile,e.Email,e.DepartmentId,d.DepartmentName,
  e.DesignationId,g.DesignationName,e.ReportingManagerId,CONCAT(m.FirstName,IIF(m.LastName IS NULL,N'',N' '+m.LastName)) ReportingManagerName,
  e.ShiftId,s.ShiftName,e.EmploymentType,e.Status,e.ProfilePhotoUrl,
  CASE e.Status WHEN 1 THEN N'Active' WHEN 2 THEN N'Inactive' WHEN 3 THEN N'Resigned' WHEN 4 THEN N'Terminated' ELSE N'Unknown' END StatusName,
  e.IsActive,e.IsDeleted,e.ResignedDate,e.LastWorkingDate,e.ResignationReason,e.RejoinedDate,e.RejoinRemarks,e.CreatedOn,e.UpdatedOn
 FROM dbo.HR_Employees e JOIN dbo.HR_Departments d ON d.Id=e.DepartmentId JOIN dbo.HR_Designations g ON g.Id=e.DesignationId JOIN dbo.HR_Shifts s ON s.Id=e.ShiftId
 LEFT JOIN dbo.HR_Employees m ON m.Id=e.ReportingManagerId WHERE e.Id=@Id AND e.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetList
 @Search NVARCHAR(200)=NULL,@DepartmentId BIGINT=NULL,@DesignationId BIGINT=NULL,@Status INT=NULL,@IsActive BIT=NULL,
 @IncludeResigned BIT=1,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'EmployeeCode',@SortDirection NVARCHAR(4)=N'ASC' AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'EmployeeCode',N'FirstName',N'JoiningDate',N'Status') THEN @SortBy ELSE N'EmployeeCode' END; SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
 DECLARE @sql NVARCHAR(MAX)=N'SELECT e.Id,e.EmployeeCode,e.FirstName,e.LastName,e.Mobile,e.Email,e.DepartmentId,d.DepartmentName,e.DesignationId,g.DesignationName,
 e.ReportingManagerId,CONCAT(m.FirstName,IIF(m.LastName IS NULL,N'''',N'' ''+m.LastName)) ReportingManagerName,e.EmploymentType,e.Status,
 CASE e.Status WHEN 1 THEN N''Active'' WHEN 2 THEN N''Inactive'' WHEN 3 THEN N''Resigned'' WHEN 4 THEN N''Terminated'' ELSE N''Unknown'' END StatusName,
 e.JoiningDate,e.IsActive,e.IsDeleted,e.ResignedDate,e.LastWorkingDate,e.ResignationReason,e.RejoinedDate,e.RejoinRemarks,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Employees e JOIN dbo.HR_Departments d ON d.Id=e.DepartmentId JOIN dbo.HR_Designations g ON g.Id=e.DesignationId LEFT JOIN dbo.HR_Employees m ON m.Id=e.ReportingManagerId
 WHERE e.IsDeleted=0 AND (@d IS NULL OR e.DepartmentId=@d) AND (@g IS NULL OR e.DesignationId=@g) AND (@st IS NULL OR e.Status=@st) AND (@a IS NULL OR e.IsActive=@a)
 AND (@st IS NOT NULL OR @ir=1 OR e.Status<>3)
 AND (@s IS NULL OR e.EmployeeCode LIKE @s OR e.FirstName LIKE @s OR e.LastName LIKE @s OR e.Mobile LIKE @s OR e.Email LIKE @s)
 ORDER BY e.'+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @o ROWS FETCH NEXT @p ROWS ONLY';
 DECLARE @pattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 DECLARE @Offset INT;
SET @Offset = (@PageNumber - 1) * @PageSize;
 EXEC sp_executesql @sql,N'@d BIGINT,@g BIGINT,@st INT,@a BIT,@ir BIT,@s NVARCHAR(210),@o INT,@p INT',@d=@DepartmentId,@g=@DesignationId,@st=@Status,@a=@IsActive,@ir=@IncludeResigned,@s=@pattern,@o=@Offset,@p=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_ValueExists @Field NVARCHAR(30),@Value NVARCHAR(200),@ExcludingId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE IsDeleted=0 AND (@ExcludingId IS NULL OR Id<>@ExcludingId) AND
 ((@Field=N'EmployeeCode' AND EmployeeCode=LTRIM(RTRIM(@Value))) OR (@Field=N'Email' AND Email=LTRIM(RTRIM(@Value))) OR (@Field=N'Mobile' AND Mobile=LTRIM(RTRIM(@Value))))),1,0));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Create
 @EmployeeCode NVARCHAR(30),@FirstName NVARCHAR(100),@LastName NVARCHAR(100)=NULL,@Gender INT,@DateOfBirth DATE=NULL,@JoiningDate DATE,
 @Mobile NVARCHAR(20)=NULL,@Email NVARCHAR(200)=NULL,@DepartmentId BIGINT,@DesignationId BIGINT,@ReportingManagerId BIGINT=NULL,@ShiftId BIGINT,
 @EmploymentType INT,@Status INT,@ProfilePhotoUrl NVARCHAR(1000)=NULL,@AddressesJson NVARCHAR(MAX)=NULL,@BankDetailsJson NVARCHAR(MAX)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE IsDeleted=0 AND (EmployeeCode=@EmployeeCode OR (@Email IS NOT NULL AND Email=@Email) OR (@Mobile IS NOT NULL AND Mobile=@Mobile)))
  BEGIN SELECT 409 StatusCode,N'Employee code, email, or mobile already exists.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE Id=@DesignationId AND DepartmentId=@DepartmentId AND IsDeleted=0) BEGIN SELECT 400 StatusCode,N'Designation does not belong to the department.' Message; RETURN; END
  BEGIN TRAN;
  INSERT dbo.HR_Employees(EmployeeCode,FirstName,LastName,Gender,DateOfBirth,JoiningDate,Mobile,Email,DepartmentId,DesignationId,ReportingManagerId,ShiftId,EmploymentType,Status,ProfilePhotoUrl,CreatedBy)
  VALUES(LTRIM(RTRIM(@EmployeeCode)),LTRIM(RTRIM(@FirstName)),NULLIF(LTRIM(RTRIM(@LastName)),N''),@Gender,@DateOfBirth,@JoiningDate,NULLIF(LTRIM(RTRIM(@Mobile)),N''),NULLIF(LTRIM(RTRIM(@Email)),N''),@DepartmentId,@DesignationId,@ReportingManagerId,@ShiftId,@EmploymentType,@Status,@ProfilePhotoUrl,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  IF ISJSON(@AddressesJson)=1
   INSERT dbo.HR_EmployeeAddresses(EmployeeId,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,CreatedBy)
   SELECT @Id,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,@UserId FROM OPENJSON(@AddressesJson)
   WITH(AddressType NVARCHAR(30) '$.addressType',AddressLine1 NVARCHAR(250) '$.addressLine1',AddressLine2 NVARCHAR(250) '$.addressLine2',City NVARCHAR(100) '$.city',State NVARCHAR(100) '$.state',Country NVARCHAR(100) '$.country',Pincode NVARCHAR(20) '$.pincode');
  IF ISJSON(@BankDetailsJson)=1
   INSERT dbo.HR_EmployeeBankAccounts(EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedBy)
   SELECT @Id,BankName,AccountNumber,IFSCCode,BranchName,UPIId,@UserId FROM OPENJSON(@BankDetailsJson)
   WITH(BankName NVARCHAR(150) '$.bankName',AccountNumber NVARCHAR(50) '$.accountNumber',IFSCCode NVARCHAR(20) '$.ifscCode',BranchName NVARCHAR(150) '$.branchName',UPIId NVARCHAR(100) '$.upiId');
  INSERT dbo.HR_LeaveBalances(EmployeeId,LeaveTypeId,OpeningBalance,UsedBalance,RemainingBalance,CreatedBy)
   SELECT @Id,Id,AnnualQuota,0,AnnualQuota,@UserId FROM dbo.HR_LeaveTypes WHERE IsDeleted=0 AND IsActive=1;
  COMMIT; SELECT 201 StatusCode,N'Employee created.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Update
 @Id BIGINT,@EmployeeCode NVARCHAR(30),@FirstName NVARCHAR(100),@LastName NVARCHAR(100)=NULL,@Gender INT,@DateOfBirth DATE=NULL,@JoiningDate DATE,
 @Mobile NVARCHAR(20)=NULL,@Email NVARCHAR(200)=NULL,@DepartmentId BIGINT,@DesignationId BIGINT,@ReportingManagerId BIGINT=NULL,@ShiftId BIGINT,
 @EmploymentType INT,@Status INT,@ProfilePhotoUrl NVARCHAR(1000)=NULL,@AddressesJson NVARCHAR(MAX)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @ReportingManagerId=@Id BEGIN SELECT 400 StatusCode,N'Employee cannot report to themselves.' Message; RETURN; END
  IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id<>@Id AND IsDeleted=0 AND (EmployeeCode=@EmployeeCode OR (@Email IS NOT NULL AND Email=@Email) OR (@Mobile IS NOT NULL AND Mobile=@Mobile)))
  BEGIN SELECT 409 StatusCode,N'Employee code, email, or mobile already exists.' Message; RETURN; END
  IF NOT EXISTS(SELECT 1 FROM dbo.HR_Designations WHERE Id=@DesignationId AND DepartmentId=@DepartmentId AND IsDeleted=0) BEGIN SELECT 400 StatusCode,N'Designation does not belong to the department.' Message; RETURN; END
  BEGIN TRAN;
  UPDATE dbo.HR_Employees SET EmployeeCode=LTRIM(RTRIM(@EmployeeCode)),FirstName=LTRIM(RTRIM(@FirstName)),LastName=NULLIF(LTRIM(RTRIM(@LastName)),N''),Gender=@Gender,DateOfBirth=@DateOfBirth,
   JoiningDate=@JoiningDate,Mobile=NULLIF(LTRIM(RTRIM(@Mobile)),N''),Email=NULLIF(LTRIM(RTRIM(@Email)),N''),DepartmentId=@DepartmentId,DesignationId=@DesignationId,
   ReportingManagerId=@ReportingManagerId,ShiftId=@ShiftId,EmploymentType=@EmploymentType,Status=@Status,ProfilePhotoUrl=@ProfilePhotoUrl,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Id AND IsDeleted=0;
  IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
  IF ISJSON(@AddressesJson)=1
  BEGIN
   UPDATE dbo.HR_EmployeeAddresses SET IsDeleted=1,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId WHERE EmployeeId=@Id AND IsDeleted=0;
   INSERT dbo.HR_EmployeeAddresses(EmployeeId,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,CreatedBy)
   SELECT @Id,AddressType,AddressLine1,AddressLine2,City,State,Country,Pincode,@UserId FROM OPENJSON(@AddressesJson)
   WITH(AddressType NVARCHAR(30) '$.addressType',AddressLine1 NVARCHAR(250) '$.addressLine1',AddressLine2 NVARCHAR(250) '$.addressLine2',City NVARCHAR(100) '$.city',State NVARCHAR(100) '$.state',Country NVARCHAR(100) '$.country',Pincode NVARCHAR(20) '$.pincode');
  END
  COMMIT; SELECT 200 StatusCode,N'Employee updated.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Resign
 @Id BIGINT,@LastWorkingDate DATE,@ResignationReason NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  DECLARE @JoiningDate DATE,@Status INT,@IsDeleted BIT;
  SELECT @JoiningDate=JoiningDate,@Status=Status,@IsDeleted=IsDeleted FROM dbo.HR_Employees WHERE Id=@Id;
  IF @JoiningDate IS NULL OR @IsDeleted=1 BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
  IF @Status=3 BEGIN SELECT 400 StatusCode,N'Employee is already resigned.' Message; RETURN; END
  IF @LastWorkingDate<@JoiningDate BEGIN SELECT 400 StatusCode,N'Last working date cannot be before joining date.' Message; RETURN; END
  UPDATE dbo.HR_Employees
  SET Status=3,ResignedDate=SYSUTCDATETIME(),LastWorkingDate=@LastWorkingDate,ResignationReason=NULLIF(LTRIM(RTRIM(@ResignationReason)),N''),
      IsDeleted=0,DeletedOn=NULL,DeletedBy=NULL,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Id AND IsDeleted=0;
  SELECT 200 StatusCode,N'Employee resigned.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Rejoin
 @Id BIGINT,@RejoinedDate DATE=NULL,@RejoinRemarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 BEGIN TRY
  DECLARE @Status INT,@IsDeleted BIT,@LastWorkingDate DATE,@EffectiveRejoinedDate DATE=COALESCE(@RejoinedDate,CONVERT(DATE,SYSUTCDATETIME()));
  SELECT @Status=Status,@IsDeleted=IsDeleted,@LastWorkingDate=LastWorkingDate FROM dbo.HR_Employees WHERE Id=@Id;
  IF @Status IS NULL OR @IsDeleted=1 BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
  IF @Status<>3 BEGIN SELECT 400 StatusCode,N'Only resigned employees can rejoin.' Message; RETURN; END
  IF @LastWorkingDate IS NOT NULL AND @EffectiveRejoinedDate<@LastWorkingDate BEGIN SELECT 400 StatusCode,N'Rejoined date cannot be before last working date.' Message; RETURN; END
  UPDATE dbo.HR_Employees
  SET Status=1,RejoinedDate=CONVERT(DATETIME2(3),@EffectiveRejoinedDate),RejoinRemarks=NULLIF(LTRIM(RTRIM(@RejoinRemarks)),N''),
      IsDeleted=0,DeletedOn=NULL,DeletedBy=NULL,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId
  WHERE Id=@Id AND IsDeleted=0;
  SELECT 200 StatusCode,N'Employee rejoined.' Message; EXEC dbo.sp_HR_Employee_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE ReportingManagerId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Employee is assigned as a reporting manager.' Message; RETURN; END
 UPDATE dbo.HR_Employees SET IsDeleted=1,Status=2,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Employee was not found.',N'Employee deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetDropdown @Search NVARCHAR(200)=NULL,@IncludeResigned BIT=0 AS
BEGIN SET NOCOUNT ON;
 DECLARE @s NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
 SELECT TOP(100) Id,EmployeeCode,CONCAT(FirstName,IIF(LastName IS NULL,N'',N' '+LastName)) EmployeeName FROM dbo.HR_Employees
 WHERE IsDeleted=0 AND (Status=1 OR (@IncludeResigned=1 AND Status=3)) AND (@s IS NULL OR EmployeeCode LIKE @s OR FirstName LIKE @s OR LastName LIKE @s) ORDER BY FirstName,LastName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Employee_GetReportingManagers @DepartmentId BIGINT=NULL,@ExcludingEmployeeId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT Id,EmployeeCode,CONCAT(FirstName,IIF(LastName IS NULL,N'',N' '+LastName)) EmployeeName FROM dbo.HR_Employees
 WHERE IsDeleted=0 AND Status=1 AND (@DepartmentId IS NULL OR DepartmentId=@DepartmentId) AND (@ExcludingEmployeeId IS NULL OR Id<>@ExcludingEmployeeId) ORDER BY FirstName,LastName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeDocument_GetList @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,EmployeeId,DocumentType,FileName,FilePath,ExpiryDate,CreatedOn FROM dbo.HR_EmployeeDocuments WHERE EmployeeId=@EmployeeId AND IsDeleted=0 ORDER BY CreatedOn DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeDocument_Create
 @EmployeeId BIGINT,@DocumentType NVARCHAR(50),@FileName NVARCHAR(255),@FilePath NVARCHAR(1000),@ExpiryDate DATE=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@EmployeeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
 INSERT dbo.HR_EmployeeDocuments(EmployeeId,DocumentType,FileName,FilePath,ExpiryDate,CreatedBy) VALUES(@EmployeeId,@DocumentType,@FileName,@FilePath,@ExpiryDate,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Employee document added.' Message;
 SELECT Id,EmployeeId,DocumentType,FileName,FilePath,ExpiryDate,CreatedOn FROM dbo.HR_EmployeeDocuments WHERE Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeDocument_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 UPDATE dbo.HR_EmployeeDocuments SET IsDeleted=1,DeletedOn=SYSUTCDATETIME(),DeletedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Employee document was not found.',N'Employee document deleted.') Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeBank_GetList @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedOn FROM dbo.HR_EmployeeBankAccounts WHERE EmployeeId=@EmployeeId AND IsDeleted=0 ORDER BY CreatedOn DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_EmployeeBank_Create
 @EmployeeId BIGINT,@BankName NVARCHAR(150),@AccountNumber NVARCHAR(50),@IFSCCode NVARCHAR(20),@BranchName NVARCHAR(150)=NULL,@UPIId NVARCHAR(100)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@EmployeeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Employee was not found.' Message; RETURN; END
 INSERT dbo.HR_EmployeeBankAccounts(EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedBy) VALUES(@EmployeeId,@BankName,@AccountNumber,@IFSCCode,@BranchName,@UPIId,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Employee bank details added.' Message;
 SELECT Id,EmployeeId,BankName,AccountNumber,IFSCCode,BranchName,UPIId,CreatedOn FROM dbo.HR_EmployeeBankAccounts WHERE Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.WorkingMinutes,a.OvertimeMinutes,a.AttendanceStatus,a.CreatedOn,0 TotalCount
 FROM dbo.HR_Attendance a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId WHERE a.Id=@Id AND a.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_CheckIn @EmployeeId BIGINT,@CheckInTime DATETIME2(3)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SET @CheckInTime=COALESCE(@CheckInTime,SYSUTCDATETIME()); DECLARE @date DATE=CONVERT(DATE,@CheckInTime);
 IF EXISTS(SELECT 1 FROM dbo.HR_Attendance WHERE EmployeeId=@EmployeeId AND AttendanceDate=@date AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Attendance already exists for this employee and date.' Message; RETURN; END
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Employees WHERE Id=@EmployeeId AND IsDeleted=0 AND Status=1) BEGIN SELECT 404 StatusCode,N'Active employee was not found.' Message; RETURN; END
 INSERT dbo.HR_Attendance(EmployeeId,AttendanceDate,CheckInTime,AttendanceStatus,CreatedBy) VALUES(@EmployeeId,@date,@CheckInTime,1,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Checked in.' Message; EXEC dbo.sp_HR_Attendance_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_CheckOut @EmployeeId BIGINT,@CheckOutTime DATETIME2(3)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 SET @CheckOutTime=COALESCE(@CheckOutTime,SYSUTCDATETIME()); DECLARE @date DATE=CONVERT(DATE,@CheckOutTime),@Id BIGINT,@in DATETIME2(3);
 SELECT @Id=Id,@in=CheckInTime FROM dbo.HR_Attendance WHERE EmployeeId=@EmployeeId AND AttendanceDate=@date AND IsDeleted=0;
 IF @Id IS NULL BEGIN SELECT 404 StatusCode,N'Check-in was not found for this date.' Message; RETURN; END
 IF @in IS NULL OR @CheckOutTime<=@in BEGIN SELECT 400 StatusCode,N'Check-out must be after check-in.' Message; RETURN; END
 DECLARE @minutes INT=DATEDIFF(MINUTE,@in,@CheckOutTime);
 UPDATE dbo.HR_Attendance SET CheckOutTime=@CheckOutTime,WorkingMinutes=@minutes,OvertimeMinutes=IIF(@minutes>480,@minutes-480,0),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 SELECT 200 StatusCode,N'Checked out.' Message; EXEC dbo.sp_HR_Attendance_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_ManualEntry
 @EmployeeId BIGINT,@AttendanceDate DATE,@CheckInTime DATETIME2(3)=NULL,@CheckOutTime DATETIME2(3)=NULL,@AttendanceStatus INT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF @CheckInTime IS NOT NULL AND @CheckOutTime IS NOT NULL AND @CheckOutTime<=@CheckInTime BEGIN SELECT 400 StatusCode,N'Check-out must be after check-in.' Message; RETURN; END
 IF EXISTS(SELECT 1 FROM dbo.HR_Attendance WHERE EmployeeId=@EmployeeId AND AttendanceDate=@AttendanceDate AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Attendance already exists for this employee and date.' Message; RETURN; END
 DECLARE @minutes INT=IIF(@CheckInTime IS NULL OR @CheckOutTime IS NULL,0,DATEDIFF(MINUTE,@CheckInTime,@CheckOutTime));
 INSERT dbo.HR_Attendance(EmployeeId,AttendanceDate,CheckInTime,CheckOutTime,WorkingMinutes,OvertimeMinutes,AttendanceStatus,CreatedBy)
 VALUES(@EmployeeId,@AttendanceDate,@CheckInTime,@CheckOutTime,@minutes,IIF(@minutes>480,@minutes-480,0),@AttendanceStatus,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Attendance created.' Message; EXEC dbo.sp_HR_Attendance_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_GetList
 @EmployeeId BIGINT=NULL,@DepartmentId BIGINT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@Status INT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;
 SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.WorkingMinutes,a.OvertimeMinutes,a.AttendanceStatus,a.CreatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_Attendance a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId WHERE a.IsDeleted=0 AND (@EmployeeId IS NULL OR a.EmployeeId=@EmployeeId) AND (@DepartmentId IS NULL OR e.DepartmentId=@DepartmentId)
 AND (@FromDate IS NULL OR a.AttendanceDate>=@FromDate) AND (@ToDate IS NULL OR a.AttendanceDate<=@ToDate) AND (@Status IS NULL OR a.AttendanceStatus=@Status)
 ORDER BY a.AttendanceDate DESC,e.EmployeeCode OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_GetByEmployee @EmployeeId BIGINT,@FromDate DATE=NULL,@ToDate DATE=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.AttendanceDate,a.CheckInTime,a.CheckOutTime,a.WorkingMinutes,a.OvertimeMinutes,a.AttendanceStatus,a.CreatedOn,0 TotalCount
 FROM dbo.HR_Attendance a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId WHERE a.EmployeeId=@EmployeeId AND a.IsDeleted=0 AND (@FromDate IS NULL OR a.AttendanceDate>=@FromDate) AND (@ToDate IS NULL OR a.AttendanceDate<=@ToDate) ORDER BY a.AttendanceDate DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Create @EmployeeId BIGINT,@AttendanceId BIGINT,@Reason NVARCHAR(500),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_Attendance WHERE Id=@AttendanceId AND EmployeeId=@EmployeeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Attendance was not found for the employee.' Message; RETURN; END
 IF EXISTS(SELECT 1 FROM dbo.HR_AttendanceAdjustments WHERE AttendanceId=@AttendanceId AND Status=1 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'A pending adjustment already exists.' Message; RETURN; END
 INSERT dbo.HR_AttendanceAdjustments(EmployeeId,AttendanceId,Reason,Status,CreatedBy) VALUES(@EmployeeId,@AttendanceId,@Reason,1,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Attendance adjustment requested.' Message;
 SELECT Id,EmployeeId,AttendanceId,Reason,Status,ApprovedBy,ApprovedOn,CreatedOn FROM dbo.HR_AttendanceAdjustments WHERE Id=@Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_AttendanceAdjustment_Decide @AdjustmentId BIGINT,@Approve BIT,@Remarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 UPDATE dbo.HR_AttendanceAdjustments SET Status=IIF(@Approve=1,2,3),Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@AdjustmentId AND Status=1 AND IsDeleted=0;
 IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Pending attendance adjustment was not found.' Message; RETURN; END
 SELECT 200 StatusCode,IIF(@Approve=1,N'Attendance adjustment approved.',N'Attendance adjustment rejected.') Message;
 SELECT Id,EmployeeId,AttendanceId,Reason,Status,ApprovedBy,ApprovedOn,CreatedOn FROM dbo.HR_AttendanceAdjustments WHERE Id=@AdjustmentId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_MonthlyReport @EmployeeId BIGINT=NULL,@Month INT,@Year INT AS
BEGIN SET NOCOUNT ON;
 SELECT e.Id EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,@Month PayrollMonth,@Year PayrollYear,
 SUM(IIF(a.AttendanceStatus=1,1,0)) PresentDays,SUM(IIF(a.AttendanceStatus=2,1,0)) AbsentDays,SUM(IIF(a.AttendanceStatus=3,1,0)) HalfDays,
 SUM(IIF(a.AttendanceStatus=4,1,0)) LeaveDays,SUM(IIF(a.AttendanceStatus=5,1,0)) Holidays,SUM(IIF(a.AttendanceStatus=6,1,0)) WeekOffDays,
 SUM(IIF(a.AttendanceStatus=7,1,0)) WfhDays,SUM(a.WorkingMinutes) WorkingMinutes,SUM(a.OvertimeMinutes) OvertimeMinutes
 FROM dbo.HR_Employees e JOIN dbo.HR_Attendance a ON a.EmployeeId=e.Id AND a.IsDeleted=0 AND MONTH(a.AttendanceDate)=@Month AND YEAR(a.AttendanceDate)=@Year
 WHERE e.IsDeleted=0 AND (@EmployeeId IS NULL OR e.Id=@EmployeeId) GROUP BY e.Id,e.EmployeeCode,e.FirstName,e.LastName ORDER BY e.EmployeeCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Attendance_DepartmentReport @DepartmentId BIGINT=NULL,@AttendanceDate DATE AS
BEGIN SET NOCOUNT ON;
 SELECT d.Id DepartmentId,d.DepartmentName,@AttendanceDate AttendanceDate,COUNT(e.Id) EmployeeCount,
 SUM(IIF(a.AttendanceStatus IN(1,7),1,0)) PresentCount,SUM(IIF(a.AttendanceStatus=2 OR a.Id IS NULL,1,0)) AbsentCount,
 SUM(IIF(a.AttendanceStatus=4,1,0)) LeaveCount,SUM(IIF(a.AttendanceStatus IN(3,5,6),1,0)) OtherCount
 FROM dbo.HR_Departments d JOIN dbo.HR_Employees e ON e.DepartmentId=d.Id AND e.IsDeleted=0 AND e.Status=1
 LEFT JOIN dbo.HR_Attendance a ON a.EmployeeId=e.Id AND a.AttendanceDate=@AttendanceDate AND a.IsDeleted=0
 WHERE d.IsDeleted=0 AND (@DepartmentId IS NULL OR d.Id=@DepartmentId) GROUP BY d.Id,d.DepartmentName ORDER BY d.DepartmentName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.LeaveTypeId,t.LeaveName,a.StartDate,a.EndDate,a.LeaveDays,a.Reason,a.Status,a.ApprovedBy,a.ApprovedOn,a.CreatedOn,0 TotalCount
 FROM dbo.HR_LeaveApplications a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_LeaveTypes t ON t.Id=a.LeaveTypeId WHERE a.Id=@Id AND a.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_Apply @EmployeeId BIGINT,@LeaveTypeId BIGINT,@StartDate DATE,@EndDate DATE,@Reason NVARCHAR(500),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 IF @EndDate<@StartDate BEGIN SELECT 400 StatusCode,N'End date must be on or after start date.' Message; RETURN; END
 IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveBalances WHERE EmployeeId=@EmployeeId AND LeaveTypeId=@LeaveTypeId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Leave balance was not found.' Message; RETURN; END
 IF EXISTS(SELECT 1 FROM dbo.HR_LeaveApplications WHERE EmployeeId=@EmployeeId AND Status IN(1,2) AND IsDeleted=0 AND @StartDate<=EndDate AND @EndDate>=StartDate)
 BEGIN SELECT 409 StatusCode,N'Leave dates overlap an existing application.' Message; RETURN; END
 INSERT dbo.HR_LeaveApplications(EmployeeId,LeaveTypeId,StartDate,EndDate,Reason,Status,CreatedBy) VALUES(@EmployeeId,@LeaveTypeId,@StartDate,@EndDate,@Reason,1,@UserId);
 DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Leave application submitted.' Message; EXEC dbo.sp_HR_Leave_GetById @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_Action @LeaveApplicationId BIGINT,@Action NVARCHAR(20),@EmployeeId BIGINT=NULL,@Remarks NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  DECLARE @status INT,@owner BIGINT,@type BIGINT,@days DECIMAL(8,2);
  SELECT @status=Status,@owner=EmployeeId,@type=LeaveTypeId,@days=LeaveDays FROM dbo.HR_LeaveApplications WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LeaveApplicationId AND IsDeleted=0;
  IF @status IS NULL BEGIN SELECT 404 StatusCode,N'Leave application was not found.' Message; RETURN; END
  BEGIN TRAN;
  IF @Action=N'Approve'
  BEGIN
   IF @status<>1 BEGIN ROLLBACK; SELECT 409 StatusCode,N'Only pending leave can be approved.' Message; RETURN; END
   IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveBalances WHERE EmployeeId=@owner AND LeaveTypeId=@type AND RemainingBalance>=@days AND IsDeleted=0)
   BEGIN ROLLBACK; SELECT 409 StatusCode,N'Insufficient leave balance.' Message; RETURN; END
   UPDATE dbo.HR_LeaveBalances SET UsedBalance=UsedBalance+@days,RemainingBalance=RemainingBalance-@days,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE EmployeeId=@owner AND LeaveTypeId=@type AND IsDeleted=0;
   UPDATE dbo.HR_LeaveApplications SET Status=2,Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@LeaveApplicationId;
  END
  ELSE IF @Action=N'Reject'
  BEGIN
   IF @status<>1 BEGIN ROLLBACK; SELECT 409 StatusCode,N'Only pending leave can be rejected.' Message; RETURN; END
   UPDATE dbo.HR_LeaveApplications SET Status=3,Remarks=@Remarks,ApprovedBy=@UserId,ApprovedOn=SYSUTCDATETIME(),UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@LeaveApplicationId;
  END
  ELSE IF @Action=N'Cancel'
  BEGIN
   IF @EmployeeId IS NOT NULL AND @EmployeeId<>@owner BEGIN ROLLBACK; SELECT 403 StatusCode,N'Leave application does not belong to the employee.' Message; RETURN; END
   IF @status NOT IN(1,2) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Leave application cannot be cancelled.' Message; RETURN; END
   IF @status=2 UPDATE dbo.HR_LeaveBalances SET UsedBalance=UsedBalance-@days,RemainingBalance=RemainingBalance+@days,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE EmployeeId=@owner AND LeaveTypeId=@type AND IsDeleted=0;
   UPDATE dbo.HR_LeaveApplications SET Status=4,Remarks=@Remarks,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@LeaveApplicationId;
  END
  ELSE BEGIN ROLLBACK; SELECT 400 StatusCode,N'Invalid leave action.' Message; RETURN; END
  COMMIT; SELECT 200 StatusCode,N'Leave action completed.' Message; EXEC dbo.sp_HR_Leave_GetById @LeaveApplicationId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetList
 @EmployeeId BIGINT=NULL,@LeaveTypeId BIGINT=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;
 SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.LeaveTypeId,t.LeaveName,a.StartDate,a.EndDate,a.LeaveDays,a.Reason,a.Status,a.ApprovedBy,a.ApprovedOn,a.CreatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_LeaveApplications a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_LeaveTypes t ON t.Id=a.LeaveTypeId
 WHERE a.IsDeleted=0 AND (@EmployeeId IS NULL OR a.EmployeeId=@EmployeeId) AND (@LeaveTypeId IS NULL OR a.LeaveTypeId=@LeaveTypeId) AND (@Status IS NULL OR a.Status=@Status)
 AND (@FromDate IS NULL OR a.EndDate>=@FromDate) AND (@ToDate IS NULL OR a.StartDate<=@ToDate)
 ORDER BY a.CreatedOn DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetBalance @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT b.Id,b.EmployeeId,b.LeaveTypeId,t.LeaveCode,t.LeaveName,b.OpeningBalance,b.UsedBalance,b.RemainingBalance
 FROM dbo.HR_LeaveBalances b JOIN dbo.HR_LeaveTypes t ON t.Id=b.LeaveTypeId WHERE b.EmployeeId=@EmployeeId AND b.IsDeleted=0 ORDER BY t.LeaveName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Leave_GetPendingApprovals @ReportingManagerId BIGINT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;
 SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT a.Id,a.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,a.LeaveTypeId,t.LeaveName,a.StartDate,a.EndDate,a.LeaveDays,a.Reason,a.Status,a.ApprovedBy,a.ApprovedOn,a.CreatedOn,COUNT(1) OVER() TotalCount
 FROM dbo.HR_LeaveApplications a JOIN dbo.HR_Employees e ON e.Id=a.EmployeeId JOIN dbo.HR_LeaveTypes t ON t.Id=a.LeaveTypeId
 WHERE a.IsDeleted=0 AND a.Status=1 AND (@ReportingManagerId IS NULL OR e.ReportingManagerId=@ReportingManagerId)
 ORDER BY a.CreatedOn OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetRun @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,PayrollMonth,PayrollYear,Status,CreatedOn,UpdatedOn FROM dbo.HR_PayrollRuns WHERE Id=@Id AND IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetRunDetails @PayrollRunId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT p.Id,p.PayrollRunId,p.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,p.PayableDays,p.GrossSalary,p.TotalDeduction,p.NetSalary
 FROM dbo.HR_PayrollDetails p JOIN dbo.HR_Employees e ON e.Id=p.EmployeeId WHERE p.PayrollRunId=@PayrollRunId AND p.IsDeleted=0 ORDER BY e.EmployeeCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_Process @PayrollMonth INT,@PayrollYear INT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  IF @PayrollMonth NOT BETWEEN 1 AND 12 BEGIN SELECT 400 StatusCode,N'Payroll month is invalid.' Message; RETURN; END
  DECLARE @existing BIGINT=(SELECT Id FROM dbo.HR_PayrollRuns WHERE PayrollMonth=@PayrollMonth AND PayrollYear=@PayrollYear AND IsDeleted=0);
  IF @existing IS NOT NULL BEGIN SELECT 409 StatusCode,N'Payroll already exists for this period.' Message; RETURN; END
  DECLARE @days INT=DAY(EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1)));
  BEGIN TRAN;
  INSERT dbo.HR_PayrollRuns(PayrollMonth,PayrollYear,Status,CreatedBy) VALUES(@PayrollMonth,@PayrollYear,2,@UserId);
  DECLARE @run BIGINT=SCOPE_IDENTITY();
  ;WITH Salary AS
  (
   SELECT e.Id EmployeeId,
    SUM(IIF(c.ComponentType=1,sc.Amount,0)) Earnings,
    SUM(IIF(c.ComponentType=2,sc.Amount,0)) Deductions
   FROM dbo.HR_Employees e
   CROSS APPLY(SELECT TOP(1) es.SalaryStructureId FROM dbo.HR_EmployeeSalaryStructures es WHERE es.EmployeeId=e.Id AND es.EffectiveDate<=EOMONTH(DATEFROMPARTS(@PayrollYear,@PayrollMonth,1)) AND es.IsDeleted=0 ORDER BY es.EffectiveDate DESC) x
   JOIN dbo.HR_SalaryStructureComponents sc ON sc.SalaryStructureId=x.SalaryStructureId AND sc.IsDeleted=0
   JOIN dbo.HR_SalaryComponents c ON c.Id=sc.SalaryComponentId AND c.IsDeleted=0
   WHERE e.IsDeleted=0 AND e.Status=1 GROUP BY e.Id
  ), Payable AS
  (
   SELECT e.Id EmployeeId,
    CONVERT(DECIMAL(8,2),COALESCE(SUM(CASE WHEN a.AttendanceStatus IN(1,5,6,7) THEN 1.0 WHEN a.AttendanceStatus=3 THEN 0.5 ELSE 0 END),0)
     +COALESCE((SELECT SUM(l.LeaveDays) FROM dbo.HR_LeaveApplications l JOIN dbo.HR_LeaveTypes t ON t.Id=l.LeaveTypeId AND t.IsPaidLeave=1
       WHERE l.EmployeeId=e.Id AND l.Status=2 AND l.IsDeleted=0 AND MONTH(l.StartDate)=@PayrollMonth AND YEAR(l.StartDate)=@PayrollYear),0)) PayableDays
   FROM dbo.HR_Employees e LEFT JOIN dbo.HR_Attendance a ON a.EmployeeId=e.Id AND a.IsDeleted=0 AND MONTH(a.AttendanceDate)=@PayrollMonth AND YEAR(a.AttendanceDate)=@PayrollYear
   WHERE e.IsDeleted=0 AND e.Status=1 GROUP BY e.Id
  )
  INSERT dbo.HR_PayrollDetails(PayrollRunId,EmployeeId,PayableDays,GrossSalary,TotalDeduction,NetSalary,CreatedBy)
  SELECT @run,s.EmployeeId,IIF(p.PayableDays>@days,@days,p.PayableDays),
   ROUND(s.Earnings*IIF(p.PayableDays>@days,@days,p.PayableDays)/@days,2),s.Deductions,
   ROUND(s.Earnings*IIF(p.PayableDays>@days,@days,p.PayableDays)/@days,2)-s.Deductions,@UserId
  FROM Salary s JOIN Payable p ON p.EmployeeId=s.EmployeeId;
  COMMIT; SELECT 201 StatusCode,N'Payroll processed.' Message; EXEC dbo.sp_HR_Payroll_GetRun @run;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_Approve @PayrollRunId BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;
 UPDATE dbo.HR_PayrollRuns SET Status=3,UpdatedOn=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@PayrollRunId AND Status=2 AND IsDeleted=0;
 IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Processed payroll run was not found.' Message; RETURN; END
 SELECT 200 StatusCode,N'Payroll approved.' Message; EXEC dbo.sp_HR_Payroll_GetRun @PayrollRunId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetHistory @EmployeeId BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT p.Id,p.PayrollRunId,p.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,p.PayableDays,p.GrossSalary,p.TotalDeduction,p.NetSalary
 FROM dbo.HR_PayrollDetails p JOIN dbo.HR_PayrollRuns r ON r.Id=p.PayrollRunId JOIN dbo.HR_Employees e ON e.Id=p.EmployeeId
 WHERE p.EmployeeId=@EmployeeId AND p.IsDeleted=0 AND r.IsDeleted=0 ORDER BY r.PayrollYear DESC,r.PayrollMonth DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_HR_Payroll_GetPayslip @EmployeeId BIGINT,@PayrollMonth INT=NULL,@PayrollYear INT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT TOP(1) r.Id PayrollRunId,r.PayrollMonth,r.PayrollYear,p.EmployeeId,e.EmployeeCode,CONCAT(e.FirstName,IIF(e.LastName IS NULL,N'',N' '+e.LastName)) EmployeeName,
  p.PayableDays,p.GrossSalary,p.TotalDeduction,p.NetSalary,r.Status
 FROM dbo.HR_PayrollDetails p JOIN dbo.HR_PayrollRuns r ON r.Id=p.PayrollRunId JOIN dbo.HR_Employees e ON e.Id=p.EmployeeId
 WHERE p.EmployeeId=@EmployeeId AND p.IsDeleted=0 AND r.IsDeleted=0 AND (@PayrollMonth IS NULL OR r.PayrollMonth=@PayrollMonth) AND (@PayrollYear IS NULL OR r.PayrollYear=@PayrollYear)
 ORDER BY r.PayrollYear DESC,r.PayrollMonth DESC;
END;
GO

IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WHERE LeaveCode=N'CL')
 INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave) VALUES(N'CL',N'Casual Leave',12,1);
IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WHERE LeaveCode=N'SL')
 INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave) VALUES(N'SL',N'Sick Leave',12,1);
IF NOT EXISTS(SELECT 1 FROM dbo.HR_LeaveTypes WHERE LeaveCode=N'LWP')
 INSERT dbo.HR_LeaveTypes(LeaveCode,LeaveName,AnnualQuota,IsPaidLeave) VALUES(N'LWP',N'Leave Without Pay',365,0);
GO

IF OBJECT_ID(N'dbo.Pages',N'U') IS NOT NULL
BEGIN
 MERGE dbo.Pages AS t USING (VALUES
  (N'HR.Department',N'HR Departments',N'/hr/departments',N'building',100),
  (N'HR.Designation',N'HR Designations',N'/hr/designations',N'badge',101),
  (N'HR.Shift',N'HR Shifts',N'/hr/shifts',N'clock',102),
  (N'HR.Employee',N'HR Employees',N'/hr/employees',N'users',103),
  (N'HR.Attendance',N'HR Attendance',N'/hr/attendance',N'calendar',104),
  (N'HR.Leave',N'HR Leave',N'/hr/leaves',N'calendar-off',105),
  (N'HR.Payroll',N'HR Payroll',N'/hr/payroll',N'wallet',106)
 ) s(Name,DisplayName,Route,Icon,SortOrder) ON t.Name=s.Name
 WHEN MATCHED THEN UPDATE SET DisplayName=s.DisplayName,Route=s.Route,Icon=s.Icon,SortOrder=s.SortOrder,IsActive=1
 WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(s.Name,s.DisplayName,s.Route,s.Icon,s.SortOrder,1);
END;
GO

IF OBJECT_ID(N'dbo.Roles',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Pages',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.RolePermissions',N'U') IS NOT NULL
BEGIN
 DECLARE @role INT=(SELECT TOP(1) Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
 IF @role IS NOT NULL
 MERGE dbo.RolePermissions AS t
 USING (SELECT @role RoleId,Id PageId FROM dbo.Pages WHERE Name LIKE N'HR.%') s
 ON t.RoleId=s.RoleId AND t.PageId=s.PageId
 WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanApprove=1
 WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(s.RoleId,s.PageId,1,1,1,1,0,1);
END;
GO


/* ============================================================================
   Source: backend\database\migrations\20260617_sales_module.sql
   ============================================================================ */
/*
    Cosmos ERP Sales Module
    SQL Server, idempotent deployment script.

    Adds:
    - NumberSequences for reusable invoice numbering.
    - PaymentModes for reusable payment mode lookup.
    - StockMovements for product stock issue/restoration history.
    - SalesInvoices, SalesInvoiceItems, SalesInvoicePayments.
    - Stored procedures used by the Dapper SalesRepository.
    - Sales permission pages for the existing role/page permission model.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF TYPE_ID(N'dbo.SalesInvoiceItemInput') IS NULL
    CREATE TYPE dbo.SalesInvoiceItemInput AS TABLE
    (
        ItemId BIGINT NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        Rate DECIMAL(18,2) NOT NULL,
        DiscountPercentage DECIMAL(5,2) NOT NULL,
        DiscountAmount DECIMAL(18,2) NOT NULL,
        TaxRateId BIGINT NULL,
        TaxPercentage DECIMAL(5,2) NOT NULL
    );
GO

IF OBJECT_ID(N'dbo.NumberSequences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NumberSequences
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_NumberSequences PRIMARY KEY,
        ModuleName NVARCHAR(100) NOT NULL,
        Prefix NVARCHAR(20) NOT NULL,
        NextNumber BIGINT NOT NULL,
        PaddingLength INT NOT NULL CONSTRAINT DF_NumberSequences_Padding DEFAULT (5),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_NumberSequences_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc DATETIME2(3) NULL,
        CONSTRAINT UQ_NumberSequences_ModuleName UNIQUE(ModuleName)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NumberSequences WHERE ModuleName = N'SalesInvoice')
    INSERT dbo.NumberSequences(ModuleName, Prefix, NextNumber, PaddingLength) VALUES(N'SalesInvoice', N'SINV-', 1, 5);
GO

IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentModes
    (
        Id INT NOT NULL CONSTRAINT PK_PaymentModes PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PaymentModes_IsActive DEFAULT (1)
    );
END;
GO

MERGE dbo.PaymentModes AS target
USING (VALUES
    (1, N'Cash', 1),
    (2, N'Bank Transfer', 1),
    (3, N'Card', 1),
    (4, N'UPI', 1),
    (5, N'Cheque', 1),
    (99, N'Other', 1)
) AS source(Id, Name, IsActive)
ON target.Id = source.Id
WHEN MATCHED THEN UPDATE SET Name = source.Name, IsActive = source.IsActive
WHEN NOT MATCHED THEN INSERT(Id, Name, IsActive) VALUES(source.Id, source.Name, source.IsActive);
GO

IF OBJECT_ID(N'dbo.SalesInvoices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoices
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_SalesInvoices PRIMARY KEY,
        InvoiceNumber NVARCHAR(50) NOT NULL,
        InvoiceDate DATE NOT NULL,
        DueDate DATE NULL,
        CustomerPartyId UNIQUEIDENTIFIER NOT NULL,
        SubTotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_SubTotal DEFAULT(0),
        DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Discount DEFAULT(0),
        TaxAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Tax DEFAULT(0),
        GrandTotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_GrandTotal DEFAULT(0),
        PaidAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Paid DEFAULT(0),
        DueAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoices_Due DEFAULT(0),
        Status INT NOT NULL CONSTRAINT DF_SalesInvoices_Status DEFAULT(1),
        PaymentStatus INT NOT NULL CONSTRAINT DF_SalesInvoices_PaymentStatus DEFAULT(1),
        Notes NVARCHAR(1000) NULL,
        TermsAndConditions NVARCHAR(2000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalesInvoices_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesInvoices_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_SalesInvoices_InvoiceNumber UNIQUE(InvoiceNumber),
        CONSTRAINT FK_SalesInvoices_Parties FOREIGN KEY(CustomerPartyId) REFERENCES dbo.Parties(Id),
        CONSTRAINT CK_SalesInvoices_Status CHECK(Status IN (1,2,3,4,5)),
        CONSTRAINT CK_SalesInvoices_PaymentStatus CHECK(PaymentStatus IN (1,2,3)),
        CONSTRAINT CK_SalesInvoices_Amounts CHECK(SubTotal >= 0 AND DiscountAmount >= 0 AND TaxAmount >= 0 AND GrandTotal >= 0 AND PaidAmount >= 0 AND DueAmount >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.SalesInvoiceItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoiceItems
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_SalesInvoiceItems PRIMARY KEY,
        SalesInvoiceId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        ItemNameSnapshot NVARCHAR(200) NOT NULL,
        HsnSacCodeSnapshot NVARCHAR(50) NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        UnitId BIGINT NULL,
        UnitNameSnapshot NVARCHAR(100) NULL,
        Rate DECIMAL(18,2) NOT NULL,
        DiscountPercentage DECIMAL(5,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_DiscountPct DEFAULT(0),
        DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_Discount DEFAULT(0),
        TaxRateId BIGINT NULL,
        TaxPercentageSnapshot DECIMAL(5,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_TaxPct DEFAULT(0),
        TaxAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesInvoiceItems_Tax DEFAULT(0),
        LineTotal DECIMAL(18,2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalesInvoiceItems_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesInvoiceItems_IsDeleted DEFAULT(0),
        CONSTRAINT FK_SalesInvoiceItems_Invoices FOREIGN KEY(SalesInvoiceId) REFERENCES dbo.SalesInvoices(Id),
        CONSTRAINT FK_SalesInvoiceItems_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_SalesInvoiceItems_Units FOREIGN KEY(UnitId) REFERENCES dbo.Units(Id),
        CONSTRAINT CK_SalesInvoiceItems_Amounts CHECK(Quantity > 0 AND Rate >= 0 AND DiscountPercentage >= 0 AND DiscountAmount >= 0 AND TaxPercentageSnapshot >= 0 AND TaxAmount >= 0 AND LineTotal >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.SalesInvoicePayments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesInvoicePayments
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_SalesInvoicePayments PRIMARY KEY,
        SalesInvoiceId BIGINT NOT NULL,
        PaymentDate DATE NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        PaymentMode INT NOT NULL,
        ReferenceNumber NVARCHAR(100) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalesInvoicePayments_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesInvoicePayments_IsDeleted DEFAULT(0),
        CONSTRAINT FK_SalesInvoicePayments_Invoices FOREIGN KEY(SalesInvoiceId) REFERENCES dbo.SalesInvoices(Id),
        CONSTRAINT FK_SalesInvoicePayments_PaymentModes FOREIGN KEY(PaymentMode) REFERENCES dbo.PaymentModes(Id),
        CONSTRAINT CK_SalesInvoicePayments_Amount CHECK(Amount > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.StockMovements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockMovements
    (
        Id BIGINT IDENTITY(1,1) CONSTRAINT PK_StockMovements PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        SourceType NVARCHAR(50) NOT NULL,
        SourceId BIGINT NOT NULL,
        MovementType INT NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_StockMovements_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_StockMovements_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoices_Date' AND object_id=OBJECT_ID(N'dbo.SalesInvoices'))
    CREATE INDEX IX_SalesInvoices_Date ON dbo.SalesInvoices(InvoiceDate, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoices_Customer' AND object_id=OBJECT_ID(N'dbo.SalesInvoices'))
    CREATE INDEX IX_SalesInvoices_Customer ON dbo.SalesInvoices(CustomerPartyId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoiceItems_Invoice' AND object_id=OBJECT_ID(N'dbo.SalesInvoiceItems'))
    CREATE INDEX IX_SalesInvoiceItems_Invoice ON dbo.SalesInvoiceItems(SalesInvoiceId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SalesInvoicePayments_Invoice' AND object_id=OBJECT_ID(N'dbo.SalesInvoicePayments'))
    CREATE INDEX IX_SalesInvoicePayments_Invoice ON dbo.SalesInvoicePayments(SalesInvoiceId, IsDeleted);
GO

CREATE OR ALTER PROCEDURE dbo.sp_Sales_CustomerExists @CustomerPartyId UNIQUEIDENTIFIER AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, CASE WHEN EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) THEN 1 ELSE 0 END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Sales_ItemExists @ItemId BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT CONVERT(BIT, CASE WHEN EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) THEN 1 ELSE 0 END);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;

    SELECT i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.CustomerPartyId,
           p.PartyName AS CustomerName, p.MobileNo AS CustomerMobileNo,
           i.SubTotal, i.DiscountAmount, i.TaxAmount, i.GrandTotal, i.PaidAmount, i.DueAmount,
           i.Status, i.PaymentStatus, i.Notes, i.TermsAndConditions, i.CreatedAtUtc, i.UpdatedAtUtc, 0 AS TotalCount
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.Id=@Id AND i.IsDeleted=0;

    SELECT Id, SalesInvoiceId, ItemId, ItemNameSnapshot, HsnSacCodeSnapshot, Quantity, UnitId,
           UnitNameSnapshot, Rate, DiscountPercentage, DiscountAmount, TaxRateId, TaxPercentageSnapshot,
           TaxAmount, LineTotal
    FROM dbo.SalesInvoiceItems
    WHERE SalesInvoiceId=@Id AND IsDeleted=0
    ORDER BY Id;

    SELECT Id, SalesInvoiceId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Notes, CreatedAtUtc
    FROM dbo.SalesInvoicePayments
    WHERE SalesInvoiceId=@Id AND IsDeleted=0
    ORDER BY PaymentDate, Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetList
    @Search NVARCHAR(200)=NULL,
    @CustomerPartyId UNIQUEIDENTIFIER=NULL,
    @Status INT=NULL,
    @PaymentStatus INT=NULL,
    @FromDate DATE=NULL,
    @ToDate DATE=NULL,
    @PageNumber INT=1,
    @PageSize INT=20,
    @SortBy NVARCHAR(50)=N'InvoiceDate',
    @SortDirection NVARCHAR(4)=N'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);
    SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SET @SortBy=CASE WHEN @SortBy IN(N'InvoiceDate',N'InvoiceNumber',N'CustomerName',N'GrandTotal',N'PaidAmount',N'DueAmount',N'CreatedAtUtc') THEN @SortBy ELSE N'InvoiceDate' END;
    SET @SortDirection=CASE WHEN UPPER(@SortDirection)=N'ASC' THEN N'ASC' ELSE N'DESC' END;

    DECLARE @Sql NVARCHAR(MAX)=N'
        SELECT i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.CustomerPartyId,
               p.PartyName CustomerName, p.MobileNo CustomerMobileNo, i.SubTotal, i.DiscountAmount,
               i.TaxAmount, i.GrandTotal, i.PaidAmount, i.DueAmount, i.Status, i.PaymentStatus,
               i.Notes, i.TermsAndConditions, i.CreatedAtUtc, i.UpdatedAtUtc, COUNT(1) OVER() TotalCount
        FROM dbo.SalesInvoices i
        JOIN dbo.Parties p ON p.Id=i.CustomerPartyId
        WHERE i.IsDeleted=0
          AND (@CustomerPartyId IS NULL OR i.CustomerPartyId=@CustomerPartyId)
          AND (@Status IS NULL OR i.Status=@Status)
          AND (@PaymentStatus IS NULL OR i.PaymentStatus=@PaymentStatus)
          AND (@FromDate IS NULL OR i.InvoiceDate>=@FromDate)
          AND (@ToDate IS NULL OR i.InvoiceDate<=@ToDate)
          AND (@SearchPattern IS NULL OR i.InvoiceNumber LIKE @SearchPattern OR p.PartyName LIKE @SearchPattern)
        ORDER BY ' + CASE WHEN @SortBy=N'CustomerName' THEN N'p.PartyName' ELSE N'i.' + QUOTENAME(@SortBy) END + N' ' + @SortDirection + N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';

    DECLARE @SearchPattern NVARCHAR(110);
    SET @SearchPattern = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search))=N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT;
    SET @Offset = (@PageNumber - 1) * @PageSize;
    EXEC sp_executesql @Sql,
        N'@SearchPattern NVARCHAR(210),@CustomerPartyId UNIQUEIDENTIFIER,@Status INT,@PaymentStatus INT,@FromDate DATE,@ToDate DATE,@Offset INT,@PageSize INT',
        @SearchPattern=@SearchPattern,
        @CustomerPartyId=@CustomerPartyId,@Status=@Status,@PaymentStatus=@PaymentStatus,@FromDate=@FromDate,@ToDate=@ToDate,
        @Offset=@Offset,@PageSize=@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_GetPayments @SalesInvoiceId BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, SalesInvoiceId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Notes, CreatedAtUtc
    FROM dbo.SalesInvoicePayments
    WHERE SalesInvoiceId=@SalesInvoiceId AND IsDeleted=0
    ORDER BY PaymentDate, Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Create
    @CustomerPartyId UNIQUEIDENTIFIER,
    @InvoiceDate DATE,
    @DueDate DATE=NULL,
    @DiscountAmount DECIMAL(18,2)=0,
    @Notes NVARCHAR(1000)=NULL,
    @TermsAndConditions NVARCHAR(2000)=NULL,
    @Items dbo.SalesInvoiceItemInput READONLY,
    @UserId BIGINT=NULL,
    @InitialPaymentDate DATE=NULL,
    @InitialPaymentAmount DECIMAL(18,2)=NULL,
    @InitialPaymentMode INT=NULL,
    @InitialPaymentReferenceNumber NVARCHAR(100)=NULL,
    @InitialPaymentNotes NVARCHAR(500)=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Customer party was not found.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM @Items) BEGIN SELECT 400 StatusCode,N'At least one invoice item is required.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Items WHERE Quantity<=0 OR Rate<0 OR DiscountPercentage<0 OR DiscountAmount<0 OR TaxPercentage<0) BEGIN SELECT 400 StatusCode,N'Invoice item amounts are invalid.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.Id=x.ItemId AND i.IsDeleted=0 AND i.IsActive=1)) BEGIN SELECT 404 StatusCode,N'One or more items were not found.' Message; RETURN; END

        DECLARE @SubTotal DECIMAL(18,2),@ItemDiscount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@GrandTotal DECIMAL(18,2),@Paid DECIMAL(18,2)=ISNULL(@InitialPaymentAmount,0),@Due DECIMAL(18,2),@PaymentStatus INT;
        SELECT @SubTotal=SUM(Quantity*Rate),
               @ItemDiscount=SUM(CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END),
               @TaxAmount=SUM(ROUND(((Quantity*Rate)-CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END)*TaxPercentage/100,2))
        FROM @Items;
        IF @DiscountAmount<0 OR @DiscountAmount>@SubTotal BEGIN SELECT 400 StatusCode,N'Invoice discount is invalid.' Message; RETURN; END
        SET @GrandTotal=@SubTotal-@ItemDiscount-@DiscountAmount+@TaxAmount;
        IF @Paid<0 OR @Paid>@GrandTotal BEGIN SELECT 400 StatusCode,N'Paid amount cannot exceed invoice grand total.' Message; RETURN; END
        SET @Due=@GrandTotal-@Paid;
        SET @PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN @Due=0 THEN 3 ELSE 2 END;
        IF @Paid>0 AND NOT EXISTS(SELECT 1 FROM dbo.PaymentModes WHERE Id=@InitialPaymentMode AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Payment mode is invalid.' Message; RETURN; END

        BEGIN TRAN;
        DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'SalesInvoice';
        IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'SalesInvoice',N'SINV-',1,5); SET @Next=1; SET @Prefix=N'SINV-'; SET @Padding=5; END
        DECLARE @InvoiceNumber NVARCHAR(50)=@Prefix + RIGHT(REPLICATE(N'0',@Padding) + CONVERT(NVARCHAR(30),@Next),@Padding);
        UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'SalesInvoice';

        INSERT dbo.SalesInvoices(InvoiceNumber,InvoiceDate,DueDate,CustomerPartyId,SubTotal,DiscountAmount,TaxAmount,GrandTotal,PaidAmount,DueAmount,Status,PaymentStatus,Notes,TermsAndConditions,CreatedBy)
        VALUES(@InvoiceNumber,@InvoiceDate,@DueDate,@CustomerPartyId,@SubTotal,@ItemDiscount+@DiscountAmount,@TaxAmount,@GrandTotal,@Paid,@Due,1,@PaymentStatus,@Notes,@TermsAndConditions,@UserId);
        DECLARE @Id BIGINT=SCOPE_IDENTITY();

        INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal,CreatedBy)
        SELECT @Id,i.Id,i.Name,i.HSNCode,x.Quantity,i.UnitId,u.Name,x.Rate,x.DiscountPercentage,
               CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END,
               x.TaxRateId,x.TaxPercentage,
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               (x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END+
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               @UserId
        FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.Units u ON u.Id=i.UnitId;

        IF @Paid>0
            INSERT dbo.SalesInvoicePayments(SalesInvoiceId,PaymentDate,Amount,PaymentMode,ReferenceNumber,Notes,CreatedBy)
            VALUES(@Id,COALESCE(@InitialPaymentDate,@InvoiceDate),@Paid,@InitialPaymentMode,@InitialPaymentReferenceNumber,@InitialPaymentNotes,@UserId);

        COMMIT; SELECT 201 StatusCode,N'Sales invoice created.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Update
    @Id BIGINT,
    @CustomerPartyId UNIQUEIDENTIFIER,
    @InvoiceDate DATE,
    @DueDate DATE=NULL,
    @DiscountAmount DECIMAL(18,2)=0,
    @Notes NVARCHAR(1000)=NULL,
    @TermsAndConditions NVARCHAR(2000)=NULL,
    @Items dbo.SalesInvoiceItemInput READONLY,
    @UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN SELECT 409 StatusCode,N'Only draft sales invoices can be updated.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@CustomerPartyId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Customer party was not found.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM @Items) BEGIN SELECT 400 StatusCode,N'At least one invoice item is required.' Message; RETURN; END
        IF EXISTS(SELECT 1 FROM @Items x WHERE NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.Id=x.ItemId AND i.IsDeleted=0 AND i.IsActive=1)) BEGIN SELECT 404 StatusCode,N'One or more items were not found.' Message; RETURN; END

        DECLARE @SubTotal DECIMAL(18,2),@ItemDiscount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@GrandTotal DECIMAL(18,2),@Paid DECIMAL(18,2),@Due DECIMAL(18,2),@PaymentStatus INT;
        SELECT @Paid=PaidAmount FROM dbo.SalesInvoices WHERE Id=@Id;
        SELECT @SubTotal=SUM(Quantity*Rate),
               @ItemDiscount=SUM(CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END),
               @TaxAmount=SUM(ROUND(((Quantity*Rate)-CASE WHEN DiscountAmount>0 THEN DiscountAmount ELSE ROUND((Quantity*Rate)*DiscountPercentage/100,2) END)*TaxPercentage/100,2))
        FROM @Items;
        SET @GrandTotal=@SubTotal-@ItemDiscount-@DiscountAmount+@TaxAmount;
        IF @DiscountAmount<0 OR @GrandTotal<0 BEGIN SELECT 400 StatusCode,N'Invoice discount is invalid.' Message; RETURN; END
        IF @Paid>@GrandTotal BEGIN SELECT 400 StatusCode,N'Paid amount cannot exceed invoice grand total.' Message; RETURN; END
        SET @Due=@GrandTotal-@Paid;
        SET @PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN @Due=0 THEN 3 ELSE 2 END;

        BEGIN TRAN;
        UPDATE dbo.SalesInvoices SET CustomerPartyId=@CustomerPartyId,InvoiceDate=@InvoiceDate,DueDate=@DueDate,SubTotal=@SubTotal,DiscountAmount=@ItemDiscount+@DiscountAmount,TaxAmount=@TaxAmount,GrandTotal=@GrandTotal,DueAmount=@Due,PaymentStatus=@PaymentStatus,Notes=@Notes,TermsAndConditions=@TermsAndConditions,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        UPDATE dbo.SalesInvoiceItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE SalesInvoiceId=@Id AND IsDeleted=0;
        INSERT dbo.SalesInvoiceItems(SalesInvoiceId,ItemId,ItemNameSnapshot,HsnSacCodeSnapshot,Quantity,UnitId,UnitNameSnapshot,Rate,DiscountPercentage,DiscountAmount,TaxRateId,TaxPercentageSnapshot,TaxAmount,LineTotal,CreatedBy)
        SELECT @Id,i.Id,i.Name,i.HSNCode,x.Quantity,i.UnitId,u.Name,x.Rate,x.DiscountPercentage,
               CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END,
               x.TaxRateId,x.TaxPercentage,
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               (x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END+
               ROUND(((x.Quantity*x.Rate)-CASE WHEN x.DiscountAmount>0 THEN x.DiscountAmount ELSE ROUND((x.Quantity*x.Rate)*x.DiscountPercentage/100,2) END)*x.TaxPercentage/100,2),
               @UserId
        FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.Units u ON u.Id=i.UnitId;
        COMMIT; SELECT 200 StatusCode,N'Sales invoice updated.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Confirm @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN SELECT 409 StatusCode,N'Only draft sales invoices can be confirmed.' Message; RETURN; END
        IF EXISTS(
            SELECT 1 FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId
            WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1 AND i.CurrentStock < si.Quantity
        ) BEGIN SELECT 409 StatusCode,N'Insufficient stock for one or more items.' Message; RETURN; END

        BEGIN TRAN;
        UPDATE i SET CurrentStock=i.CurrentStock-si.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId
        FROM dbo.Items i JOIN dbo.SalesInvoiceItems si ON si.ItemId=i.Id
        WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;

        INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)
        SELECT si.ItemId,N'SalesInvoice',@Id,1,-si.Quantity,@UserId
        FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId
        WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;

        UPDATE dbo.SalesInvoices
        SET Status=CASE WHEN DueAmount=0 THEN 4 WHEN PaidAmount>0 THEN 3 ELSE 2 END,
            UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        WHERE Id=@Id;
        COMMIT; SELECT 200 StatusCode,N'Sales invoice confirmed.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Cancel @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Status INT=(SELECT Status FROM dbo.SalesInvoices WHERE Id=@Id AND IsDeleted=0);
        IF @Status IS NULL BEGIN SELECT 404 StatusCode,N'Sales invoice was not found.' Message; RETURN; END
        IF @Status=5 BEGIN SELECT 409 StatusCode,N'Sales invoice is already cancelled.' Message; RETURN; END

        BEGIN TRAN;
        IF @Status IN(2,3,4)
        BEGIN
            UPDATE i SET CurrentStock=i.CurrentStock+si.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId
            FROM dbo.Items i JOIN dbo.SalesInvoiceItems si ON si.ItemId=i.Id
            WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;

            INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)
            SELECT si.ItemId,N'SalesInvoice',@Id,2,si.Quantity,@UserId
            FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId
            WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;
        END
        UPDATE dbo.SalesInvoices SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
        COMMIT; SELECT 200 StatusCode,N'Sales invoice cancelled.' Message; SELECT @Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_AddPayment
    @SalesInvoiceId BIGINT,@PaymentDate DATE,@Amount DECIMAL(18,2),@PaymentMode INT,@ReferenceNumber NVARCHAR(100)=NULL,@Notes NVARCHAR(500)=NULL,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @Grand DECIMAL(18,2),@Paid DECIMAL(18,2),@Status INT;
        SELECT @Grand=GrandTotal,@Paid=PaidAmount,@Status=Status FROM dbo.SalesInvoices WHERE Id=@SalesInvoiceId AND IsDeleted=0;
        IF @Status IS NULL BEGIN SELECT 404 StatusCode,N'Sales invoice was not found.' Message; RETURN; END
        IF @Status=5 BEGIN SELECT 409 StatusCode,N'Cannot add payment to a cancelled invoice.' Message; RETURN; END
        IF @Amount<=0 OR @Paid+@Amount>@Grand BEGIN SELECT 400 StatusCode,N'Total paid amount cannot exceed invoice grand total.' Message; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM dbo.PaymentModes WHERE Id=@PaymentMode AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Payment mode is invalid.' Message; RETURN; END

        BEGIN TRAN;
        INSERT dbo.SalesInvoicePayments(SalesInvoiceId,PaymentDate,Amount,PaymentMode,ReferenceNumber,Notes,CreatedBy)
        VALUES(@SalesInvoiceId,@PaymentDate,@Amount,@PaymentMode,@ReferenceNumber,@Notes,@UserId);
        DECLARE @Id BIGINT=SCOPE_IDENTITY();
        SET @Paid=@Paid+@Amount;
        UPDATE dbo.SalesInvoices
        SET PaidAmount=@Paid,DueAmount=GrandTotal-@Paid,
            PaymentStatus=CASE WHEN @Paid=0 THEN 1 WHEN GrandTotal-@Paid=0 THEN 3 ELSE 2 END,
            Status=CASE WHEN Status=1 THEN 1 WHEN GrandTotal-@Paid=0 THEN 4 ELSE 3 END,
            UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
        WHERE Id=@SalesInvoiceId;
        COMMIT; SELECT 201 StatusCode,N'Sales payment added.' Message;
        SELECT Id, SalesInvoiceId, PaymentDate, Amount, PaymentMode, ReferenceNumber, Notes, CreatedAtUtc FROM dbo.SalesInvoicePayments WHERE Id=@Id;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesReport_Summary @FromDate DATE=NULL,@ToDate DATE=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(1) TotalInvoices, COALESCE(SUM(GrandTotal),0) TotalSalesAmount, COALESCE(SUM(PaidAmount),0) TotalPaidAmount, COALESCE(SUM(DueAmount),0) TotalDueAmount
    FROM dbo.SalesInvoices
    WHERE IsDeleted=0 AND Status<>5 AND (@FromDate IS NULL OR InvoiceDate>=@FromDate) AND (@ToDate IS NULL OR InvoiceDate<=@ToDate);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesReport_CustomerReceivables @CustomerPartyId UNIQUEIDENTIFIER=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.CustomerPartyId, p.PartyName CustomerName, SUM(i.GrandTotal) TotalSales, SUM(i.PaidAmount) PaidAmount, SUM(i.DueAmount) DueAmount
    FROM dbo.SalesInvoices i JOIN dbo.Parties p ON p.Id=i.CustomerPartyId
    WHERE i.IsDeleted=0 AND i.Status<>5 AND (@CustomerPartyId IS NULL OR i.CustomerPartyId=@CustomerPartyId)
    GROUP BY i.CustomerPartyId,p.PartyName HAVING SUM(i.DueAmount)>0 ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SalesReport_ItemWiseSales @FromDate DATE=NULL,@ToDate DATE=NULL,@ItemId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT si.ItemId, si.ItemNameSnapshot ItemName, SUM(si.Quantity) QuantitySold, SUM(si.LineTotal) TotalAmount
    FROM dbo.SalesInvoiceItems si JOIN dbo.SalesInvoices i ON i.Id=si.SalesInvoiceId
    WHERE si.IsDeleted=0 AND i.IsDeleted=0 AND i.Status IN(2,3,4)
      AND (@FromDate IS NULL OR i.InvoiceDate>=@FromDate) AND (@ToDate IS NULL OR i.InvoiceDate<=@ToDate)
      AND (@ItemId IS NULL OR si.ItemId=@ItemId)
    GROUP BY si.ItemId,si.ItemNameSnapshot ORDER BY si.ItemNameSnapshot;
END;
GO

IF OBJECT_ID(N'dbo.Pages', N'U') IS NOT NULL
BEGIN
    MERGE dbo.Pages AS target
    USING (VALUES
        (N'Sales.Invoice', N'Sales Invoices', N'/sales/invoices', N'receipt', 60),
        (N'Sales.Report', N'Sales Reports', N'/sales/reports', N'chart-column', 61)
    ) AS source(Name, DisplayName, Route, Icon, SortOrder)
    ON target.Name = source.Name
    WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName, Route=source.Route, Icon=source.Icon, SortOrder=source.SortOrder, IsActive=1
    WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
END;
GO

IF OBJECT_ID(N'dbo.Roles',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Pages',N'U') IS NOT NULL AND OBJECT_ID(N'dbo.RolePermissions',N'U') IS NOT NULL
BEGIN
    DECLARE @RoleId INT=(SELECT TOP(1) Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
    IF @RoleId IS NOT NULL
    BEGIN
        MERGE dbo.RolePermissions AS target
        USING (SELECT @RoleId RoleId, Id PageId, Name FROM dbo.Pages WHERE Name IN(N'Sales.Invoice',N'Sales.Report')) AS source
        ON target.RoleId=source.RoleId AND target.PageId=source.PageId
        WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CanEdit=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CanDelete=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CanExport=1,CanApprove=CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END
        WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove)
        VALUES(source.RoleId,source.PageId,1,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END,1,CASE WHEN source.Name=N'Sales.Invoice' THEN 1 ELSE 0 END);
    END;
END;
GO


/* ============================================================================
   Source: backend\database\migrations\20260618_purchase_expense_module.sql
   ============================================================================ */
/* COSMOS ERP - Purchase & Expense module. Requires core Parties/Items and the Sales shared
   NumberSequences, PaymentModes and StockMovements objects. Safe to rerun. */
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Parties', N'U') IS NULL
    OR OBJECT_ID(N'dbo.Items', N'U') IS NULL
    OR OBJECT_ID(N'dbo.Units', N'U') IS NULL
    OR OBJECT_ID(N'dbo.PaymentModes', N'U') IS NULL
    OR OBJECT_ID(N'dbo.NumberSequences', N'U') IS NULL
    OR OBJECT_ID(N'dbo.StockMovements', N'U') IS NULL
BEGIN
    PRINT('Purchase & Expense prerequisites are missing. Run CosmosERP.Security.sql, 001_Party_Module.sql, Scripts/002_ItemModule.sql, and migrations/20260617_sales_module.sql against the selected target database first.');
END;
GO

IF TYPE_ID(N'dbo.PurchaseLineInput') IS NULL EXEC(N'CREATE TYPE dbo.PurchaseLineInput AS TABLE(ItemId BIGINT NOT NULL,Quantity DECIMAL(18,2) NOT NULL,PurchasePrice DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(9,4) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxPercentage DECIMAL(9,4) NOT NULL,UnitId BIGINT NULL,PurchaseBillItemId BIGINT NULL)');
IF TYPE_ID(N'dbo.SupplierPaymentAllocationInput') IS NULL EXEC(N'CREATE TYPE dbo.SupplierPaymentAllocationInput AS TABLE(PurchaseBillId BIGINT NOT NULL,AllocatedAmount DECIMAL(18,2) NOT NULL)');
GO

IF OBJECT_ID(N'dbo.PurchaseBills',N'U') IS NULL CREATE TABLE dbo.PurchaseBills(
 Id BIGINT IDENTITY CONSTRAINT PK_PurchaseBills PRIMARY KEY,PurchaseBillNo NVARCHAR(50) NOT NULL,SupplierId UNIQUEIDENTIFIER NOT NULL,SupplierInvoiceNo NVARCHAR(100) NULL,BillDate DATE NOT NULL,DueDate DATE NULL,PaymentType INT NOT NULL,PaymentStatus INT NOT NULL,SubTotal DECIMAL(18,2) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,RoundOff DECIMAL(18,2) NOT NULL,GrandTotal DECIMAL(18,2) NOT NULL,PaidAmount DECIMAL(18,2) NOT NULL,BalanceAmount DECIMAL(18,2) NOT NULL,Notes NVARCHAR(1000) NULL,Status INT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseBills_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PurchaseBills_Deleted DEFAULT 0,RowVersion ROWVERSION,
 CONSTRAINT FK_PurchaseBills_Parties FOREIGN KEY(SupplierId) REFERENCES dbo.Parties(Id),CONSTRAINT FK_PurchaseBills_PaymentModes FOREIGN KEY(PaymentType) REFERENCES dbo.PaymentModes(Id),CONSTRAINT CK_PurchaseBills_Amounts CHECK(SubTotal>=0 AND DiscountAmount>=0 AND TaxAmount>=0 AND GrandTotal>=0 AND PaidAmount>=0 AND BalanceAmount>=0));
IF OBJECT_ID(N'dbo.PurchaseBillItems',N'U') IS NULL CREATE TABLE dbo.PurchaseBillItems(
 Id BIGINT IDENTITY CONSTRAINT PK_PurchaseBillItems PRIMARY KEY,PurchaseBillId BIGINT NOT NULL,ItemId BIGINT NOT NULL,ItemNameSnapshot NVARCHAR(200) NOT NULL,Quantity DECIMAL(18,2) NOT NULL,UnitId BIGINT NULL,UnitNameSnapshot NVARCHAR(100) NULL,PurchasePrice DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(9,4) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxPercentage DECIMAL(9,4) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,LineTotal DECIMAL(18,2) NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseBillItems_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PurchaseBillItems_Deleted DEFAULT 0,RowVersion ROWVERSION,
 CONSTRAINT FK_PurchaseBillItems_Bill FOREIGN KEY(PurchaseBillId) REFERENCES dbo.PurchaseBills(Id),CONSTRAINT FK_PurchaseBillItems_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),CONSTRAINT FK_PurchaseBillItems_Unit FOREIGN KEY(UnitId) REFERENCES dbo.Units(Id),CONSTRAINT CK_PurchaseBillItems_Amounts CHECK(Quantity>0 AND PurchasePrice>=0 AND LineTotal>=0));
IF OBJECT_ID(N'dbo.SupplierPayments',N'U') IS NULL CREATE TABLE dbo.SupplierPayments(
 Id BIGINT IDENTITY CONSTRAINT PK_SupplierPayments PRIMARY KEY,PaymentOutNo NVARCHAR(50) NOT NULL,SupplierId UNIQUEIDENTIFIER NOT NULL,PaymentDate DATE NOT NULL,Amount DECIMAL(18,2) NOT NULL,PaymentMode INT NOT NULL,ReferenceNo NVARCHAR(100) NULL,Notes NVARCHAR(500) NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SupplierPayments_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_SupplierPayments_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_SupplierPayments_Party FOREIGN KEY(SupplierId) REFERENCES dbo.Parties(Id),CONSTRAINT FK_SupplierPayments_Mode FOREIGN KEY(PaymentMode) REFERENCES dbo.PaymentModes(Id),CONSTRAINT CK_SupplierPayments_Amount CHECK(Amount>0));
IF OBJECT_ID(N'dbo.SupplierPaymentAllocations',N'U') IS NULL CREATE TABLE dbo.SupplierPaymentAllocations(Id BIGINT IDENTITY CONSTRAINT PK_SupplierPaymentAllocations PRIMARY KEY,SupplierPaymentId BIGINT NOT NULL,PurchaseBillId BIGINT NOT NULL,AllocatedAmount DECIMAL(18,2) NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SupplierPaymentAllocations_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_SupplierPaymentAllocations_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_SupplierPaymentAllocations_Payment FOREIGN KEY(SupplierPaymentId) REFERENCES dbo.SupplierPayments(Id),CONSTRAINT FK_SupplierPaymentAllocations_Bill FOREIGN KEY(PurchaseBillId) REFERENCES dbo.PurchaseBills(Id),CONSTRAINT CK_SupplierPaymentAllocations_Amount CHECK(AllocatedAmount>0));
IF OBJECT_ID(N'dbo.ExpenseCategories',N'U') IS NULL CREATE TABLE dbo.ExpenseCategories(Id BIGINT IDENTITY CONSTRAINT PK_ExpenseCategories PRIMARY KEY,Name NVARCHAR(150) NOT NULL,Description NVARCHAR(500) NULL,IsActive BIT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ExpenseCategories_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_ExpenseCategories_Deleted DEFAULT 0,RowVersion ROWVERSION);
IF OBJECT_ID(N'dbo.Expenses',N'U') IS NULL CREATE TABLE dbo.Expenses(Id BIGINT IDENTITY CONSTRAINT PK_Expenses PRIMARY KEY,ExpenseNo NVARCHAR(50) NOT NULL,ExpenseDate DATE NOT NULL,CategoryId BIGINT NOT NULL,PaidToPartyId UNIQUEIDENTIFIER NULL,Amount DECIMAL(18,2) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,TotalAmount AS (Amount+TaxAmount) PERSISTED,PaymentMode INT NOT NULL,ReferenceNo NVARCHAR(100) NULL,Notes NVARCHAR(1000) NULL,AttachmentPath NVARCHAR(500) NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Expenses_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_Expenses_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_Expenses_Category FOREIGN KEY(CategoryId) REFERENCES dbo.ExpenseCategories(Id),CONSTRAINT FK_Expenses_Party FOREIGN KEY(PaidToPartyId) REFERENCES dbo.Parties(Id),CONSTRAINT FK_Expenses_Mode FOREIGN KEY(PaymentMode) REFERENCES dbo.PaymentModes(Id),CONSTRAINT CK_Expenses_Amount CHECK(Amount>0 AND TaxAmount>=0));
IF OBJECT_ID(N'dbo.PurchaseOrders',N'U') IS NULL CREATE TABLE dbo.PurchaseOrders(Id BIGINT IDENTITY CONSTRAINT PK_PurchaseOrders PRIMARY KEY,PurchaseOrderNo NVARCHAR(50) NOT NULL,SupplierId UNIQUEIDENTIFIER NOT NULL,OrderDate DATE NOT NULL,ExpectedDeliveryDate DATE NULL,Status INT NOT NULL,SubTotal DECIMAL(18,2) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,GrandTotal DECIMAL(18,2) NOT NULL,TermsAndConditions NVARCHAR(2000) NULL,Notes NVARCHAR(1000) NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseOrders_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PurchaseOrders_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_PurchaseOrders_Party FOREIGN KEY(SupplierId) REFERENCES dbo.Parties(Id));
IF OBJECT_ID(N'dbo.PurchaseOrderItems',N'U') IS NULL CREATE TABLE dbo.PurchaseOrderItems(Id BIGINT IDENTITY CONSTRAINT PK_PurchaseOrderItems PRIMARY KEY,PurchaseOrderId BIGINT NOT NULL,ItemId BIGINT NOT NULL,ItemNameSnapshot NVARCHAR(200) NOT NULL,Quantity DECIMAL(18,2) NOT NULL,UnitId BIGINT NULL,UnitNameSnapshot NVARCHAR(100) NULL,PurchasePrice DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(9,4) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxPercentage DECIMAL(9,4) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,LineTotal DECIMAL(18,2) NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseOrderItems_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PurchaseOrderItems_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_PurchaseOrderItems_Order FOREIGN KEY(PurchaseOrderId) REFERENCES dbo.PurchaseOrders(Id),CONSTRAINT FK_PurchaseOrderItems_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),CONSTRAINT FK_PurchaseOrderItems_Unit FOREIGN KEY(UnitId) REFERENCES dbo.Units(Id));
IF OBJECT_ID(N'dbo.PurchaseReturns',N'U') IS NULL CREATE TABLE dbo.PurchaseReturns(Id BIGINT IDENTITY CONSTRAINT PK_PurchaseReturns PRIMARY KEY,PurchaseReturnNo NVARCHAR(50) NOT NULL,PurchaseBillId BIGINT NULL,SupplierId UNIQUEIDENTIFIER NOT NULL,ReturnDate DATE NOT NULL,Reason NVARCHAR(500) NULL,SubTotal DECIMAL(18,2) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,GrandTotal DECIMAL(18,2) NOT NULL,Notes NVARCHAR(1000) NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseReturns_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PurchaseReturns_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_PurchaseReturns_Bill FOREIGN KEY(PurchaseBillId) REFERENCES dbo.PurchaseBills(Id),CONSTRAINT FK_PurchaseReturns_Party FOREIGN KEY(SupplierId) REFERENCES dbo.Parties(Id));
IF OBJECT_ID(N'dbo.PurchaseReturnItems',N'U') IS NULL CREATE TABLE dbo.PurchaseReturnItems(Id BIGINT IDENTITY CONSTRAINT PK_PurchaseReturnItems PRIMARY KEY,PurchaseReturnId BIGINT NOT NULL,PurchaseBillItemId BIGINT NULL,ItemId BIGINT NOT NULL,ItemNameSnapshot NVARCHAR(200) NOT NULL,Quantity DECIMAL(18,2) NOT NULL,UnitId BIGINT NULL,UnitNameSnapshot NVARCHAR(100) NULL,PurchasePrice DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(9,4) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxPercentage DECIMAL(9,4) NOT NULL,TaxAmount DECIMAL(18,2) NOT NULL,LineTotal DECIMAL(18,2) NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseReturnItems_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,UpdatedAtUtc DATETIME2(3) NULL,UpdatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PurchaseReturnItems_Deleted DEFAULT 0,RowVersion ROWVERSION,CONSTRAINT FK_PurchaseReturnItems_Return FOREIGN KEY(PurchaseReturnId) REFERENCES dbo.PurchaseReturns(Id),CONSTRAINT FK_PurchaseReturnItems_BillItem FOREIGN KEY(PurchaseBillItemId) REFERENCES dbo.PurchaseBillItems(Id),CONSTRAINT FK_PurchaseReturnItems_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id));
IF OBJECT_ID(N'dbo.PartyLedgerEntries',N'U') IS NULL CREATE TABLE dbo.PartyLedgerEntries(Id BIGINT IDENTITY CONSTRAINT PK_PartyLedgerEntries PRIMARY KEY,PartyId UNIQUEIDENTIFIER NOT NULL,EntryDate DATE NOT NULL,SourceType NVARCHAR(50) NOT NULL,SourceId BIGINT NOT NULL,EntryType NVARCHAR(50) NOT NULL,Amount DECIMAL(18,2) NOT NULL,Notes NVARCHAR(500) NULL,CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PartyLedgerEntries_Created DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,IsDeleted BIT NOT NULL CONSTRAINT DF_PartyLedgerEntries_Deleted DEFAULT 0,CONSTRAINT FK_PartyLedgerEntries_Party FOREIGN KEY(PartyId) REFERENCES dbo.Parties(Id));
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_PurchaseBills_No' AND object_id=OBJECT_ID(N'dbo.PurchaseBills')) CREATE UNIQUE INDEX UX_PurchaseBills_No ON dbo.PurchaseBills(PurchaseBillNo) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_SupplierPayments_No' AND object_id=OBJECT_ID(N'dbo.SupplierPayments')) CREATE UNIQUE INDEX UX_SupplierPayments_No ON dbo.SupplierPayments(PaymentOutNo) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_Expenses_No' AND object_id=OBJECT_ID(N'dbo.Expenses')) CREATE UNIQUE INDEX UX_Expenses_No ON dbo.Expenses(ExpenseNo) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_PurchaseOrders_No' AND object_id=OBJECT_ID(N'dbo.PurchaseOrders')) CREATE UNIQUE INDEX UX_PurchaseOrders_No ON dbo.PurchaseOrders(PurchaseOrderNo) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_PurchaseReturns_No' AND object_id=OBJECT_ID(N'dbo.PurchaseReturns')) CREATE UNIQUE INDEX UX_PurchaseReturns_No ON dbo.PurchaseReturns(PurchaseReturnNo) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseBills_Supplier' AND object_id=OBJECT_ID(N'dbo.PurchaseBills')) CREATE INDEX IX_PurchaseBills_Supplier ON dbo.PurchaseBills(SupplierId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseBills_Date' AND object_id=OBJECT_ID(N'dbo.PurchaseBills')) CREATE INDEX IX_PurchaseBills_Date ON dbo.PurchaseBills(BillDate,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseBillItems_Bill' AND object_id=OBJECT_ID(N'dbo.PurchaseBillItems')) CREATE INDEX IX_PurchaseBillItems_Bill ON dbo.PurchaseBillItems(PurchaseBillId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseBillItems_Item' AND object_id=OBJECT_ID(N'dbo.PurchaseBillItems')) CREATE INDEX IX_PurchaseBillItems_Item ON dbo.PurchaseBillItems(ItemId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_SupplierPayments_Supplier' AND object_id=OBJECT_ID(N'dbo.SupplierPayments')) CREATE INDEX IX_SupplierPayments_Supplier ON dbo.SupplierPayments(SupplierId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_SupplierPayments_Date' AND object_id=OBJECT_ID(N'dbo.SupplierPayments')) CREATE INDEX IX_SupplierPayments_Date ON dbo.SupplierPayments(PaymentDate,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Expenses_Category' AND object_id=OBJECT_ID(N'dbo.Expenses')) CREATE INDEX IX_Expenses_Category ON dbo.Expenses(CategoryId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Expenses_Date' AND object_id=OBJECT_ID(N'dbo.Expenses')) CREATE INDEX IX_Expenses_Date ON dbo.Expenses(ExpenseDate,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseOrders_Supplier' AND object_id=OBJECT_ID(N'dbo.PurchaseOrders')) CREATE INDEX IX_PurchaseOrders_Supplier ON dbo.PurchaseOrders(SupplierId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseOrders_Date' AND object_id=OBJECT_ID(N'dbo.PurchaseOrders')) CREATE INDEX IX_PurchaseOrders_Date ON dbo.PurchaseOrders(OrderDate,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseReturns_Supplier' AND object_id=OBJECT_ID(N'dbo.PurchaseReturns')) CREATE INDEX IX_PurchaseReturns_Supplier ON dbo.PurchaseReturns(SupplierId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PurchaseReturns_Date' AND object_id=OBJECT_ID(N'dbo.PurchaseReturns')) CREATE INDEX IX_PurchaseReturns_Date ON dbo.PurchaseReturns(ReturnDate,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_PartyLedger_PartyDate' AND object_id=OBJECT_ID(N'dbo.PartyLedgerEntries')) CREATE INDEX IX_PartyLedger_PartyDate ON dbo.PartyLedgerEntries(PartyId,EntryDate,IsDeleted);
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpense_SupplierExists @Id UNIQUEIDENTIFIER AS SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@Id AND IsDeleted=0 AND IsActive=1),1,0));
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpense_ItemExists @Id BIGINT AS SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Id AND IsDeleted=0 AND IsActive=1),1,0));
GO
CREATE OR ALTER PROCEDURE dbo.sp_ExpenseCategory_Exists @Id BIGINT AS SELECT CONVERT(BIT,IIF(EXISTS(SELECT 1 FROM dbo.ExpenseCategories WHERE Id=@Id AND IsDeleted=0 AND IsActive=1),1,0));
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON; SELECT b.*,p.PartyName SupplierName FROM dbo.PurchaseBills b JOIN dbo.Parties p ON p.Id=b.SupplierId WHERE b.Id=@Id AND b.IsDeleted=0;
 SELECT i.Id,i.ItemId,i.ItemNameSnapshot ItemName,i.Quantity,i.UnitId,i.UnitNameSnapshot UnitName,i.PurchasePrice,i.DiscountPercentage,i.DiscountAmount,i.TaxPercentage,i.TaxAmount,i.LineTotal,CAST(NULL AS BIGINT) PurchaseBillItemId FROM dbo.PurchaseBillItems i WHERE i.PurchaseBillId=@Id AND i.IsDeleted=0 ORDER BY i.Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_GetList @Search NVARCHAR(200)=NULL,@SupplierId UNIQUEIDENTIFIER=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'BillDate',@SortDirection NVARCHAR(4)=N'DESC' AS
BEGIN SET NOCOUNT ON; SELECT b.*,p.PartyName SupplierName,COUNT(1) OVER() TotalCount FROM dbo.PurchaseBills b JOIN dbo.Parties p ON p.Id=b.SupplierId WHERE b.IsDeleted=0 AND(@SupplierId IS NULL OR b.SupplierId=@SupplierId)AND(@Status IS NULL OR b.Status=@Status)AND(@FromDate IS NULL OR b.BillDate>=@FromDate)AND(@ToDate IS NULL OR b.BillDate<=@ToDate)AND(@Search IS NULL OR b.PurchaseBillNo LIKE N'%'+@Search+N'%' OR p.PartyName LIKE N'%'+@Search+N'%') ORDER BY CASE WHEN @SortDirection=N'ASC' THEN CASE @SortBy WHEN N'PurchaseBillNo' THEN b.PurchaseBillNo END END ASC,CASE WHEN @SortDirection=N'ASC' THEN b.BillDate END ASC,CASE WHEN @SortDirection<>N'ASC' THEN b.BillDate END DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_Save @Id BIGINT=NULL,@SupplierId UNIQUEIDENTIFIER,@SupplierInvoiceNo NVARCHAR(100)=NULL,@BillDate DATE,@DueDate DATE=NULL,@PaymentType INT,@DiscountAmount DECIMAL(18,2)=0,@RoundOff DECIMAL(18,2)=0,@PaidAmount DECIMAL(18,2)=0,@Notes NVARCHAR(1000)=NULL,@Items dbo.PurchaseLineInput READONLY,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=@SupplierId AND IsDeleted=0 AND IsActive=1)BEGIN SELECT 404 StatusCode,N'Supplier was not found.' Message;RETURN;END
 IF NOT EXISTS(SELECT 1 FROM @Items)OR EXISTS(SELECT 1 FROM @Items WHERE Quantity<=0 OR PurchasePrice<0)BEGIN SELECT 400 StatusCode,N'Purchase items are invalid.' Message;RETURN;END
 IF @Id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.PurchaseBills WHERE Id=@Id AND IsDeleted=0 AND Status=1)BEGIN SELECT 409 StatusCode,N'Only draft purchase bills can be updated.' Message;RETURN;END
 DECLARE @Sub DECIMAL(18,2),@LineDiscount DECIMAL(18,2),@Tax DECIMAL(18,2),@Grand DECIMAL(18,2),@Balance DECIMAL(18,2);SELECT @Sub=SUM(Quantity*PurchasePrice),@LineDiscount=SUM(IIF(DiscountAmount>0,DiscountAmount,ROUND(Quantity*PurchasePrice*DiscountPercentage/100,2))),@Tax=SUM(ROUND((Quantity*PurchasePrice-IIF(DiscountAmount>0,DiscountAmount,ROUND(Quantity*PurchasePrice*DiscountPercentage/100,2)))*TaxPercentage/100,2))FROM @Items;SET @Grand=@Sub-@LineDiscount-@DiscountAmount+@Tax+@RoundOff;SET @Balance=@Grand-@PaidAmount;IF @Grand<0 OR @PaidAmount<0 OR @Balance<0 BEGIN SELECT 400 StatusCode,N'Paid amount or totals are invalid.' Message;RETURN;END
 BEGIN TRAN;IF @Id IS NULL BEGIN DECLARE @N BIGINT,@P NVARCHAR(20),@Pad INT;SELECT @N=NextNumber,@P=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK)WHERE ModuleName=N'PurchaseBill';IF @N IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength)VALUES(N'PurchaseBill',N'PB-',1,6);SELECT @N=1,@P=N'PB-',@Pad=6;END UPDATE dbo.NumberSequences SET NextNumber=@N+1,UpdatedAtUtc=SYSUTCDATETIME()WHERE ModuleName=N'PurchaseBill';INSERT dbo.PurchaseBills(PurchaseBillNo,SupplierId,SupplierInvoiceNo,BillDate,DueDate,PaymentType,PaymentStatus,SubTotal,DiscountAmount,TaxAmount,RoundOff,GrandTotal,PaidAmount,BalanceAmount,Notes,Status,CreatedBy)VALUES(@P+RIGHT(REPLICATE('0',@Pad)+CONVERT(VARCHAR,@N),@Pad),@SupplierId,@SupplierInvoiceNo,@BillDate,@DueDate,@PaymentType,IIF(@PaidAmount=0,1,IIF(@Balance=0,3,2)),@Sub,@LineDiscount+@DiscountAmount,@Tax,@RoundOff,@Grand,@PaidAmount,@Balance,@Notes,1,@UserId);SET @Id=SCOPE_IDENTITY();END ELSE BEGIN UPDATE dbo.PurchaseBills SET SupplierId=@SupplierId,SupplierInvoiceNo=@SupplierInvoiceNo,BillDate=@BillDate,DueDate=@DueDate,PaymentType=@PaymentType,PaymentStatus=IIF(@PaidAmount=0,1,IIF(@Balance=0,3,2)),SubTotal=@Sub,DiscountAmount=@LineDiscount+@DiscountAmount,TaxAmount=@Tax,RoundOff=@RoundOff,GrandTotal=@Grand,PaidAmount=@PaidAmount,BalanceAmount=@Balance,Notes=@Notes,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;UPDATE dbo.PurchaseBillItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE PurchaseBillId=@Id AND IsDeleted=0;END
 INSERT dbo.PurchaseBillItems(PurchaseBillId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy)SELECT @Id,i.Id,i.Name,x.Quantity,COALESCE(x.UnitId,i.UnitId),u.Name,x.PurchasePrice,x.DiscountPercentage,IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)),x.TaxPercentage,ROUND((x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))*x.TaxPercentage/100,2),(x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))+ROUND((x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))*x.TaxPercentage/100,2),@UserId FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId LEFT JOIN dbo.Units u ON u.Id=COALESCE(x.UnitId,i.UnitId);COMMIT;SELECT IIF(@Id IS NULL,201,200) StatusCode,N'Purchase bill saved.' Message;SELECT @Id;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_Confirm @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF NOT EXISTS(SELECT 1 FROM dbo.PurchaseBills WHERE Id=@Id AND IsDeleted=0 AND Status=1)BEGIN SELECT 409 StatusCode,N'Only draft purchase bills can be confirmed.'Message;RETURN;END BEGIN TRAN;UPDATE i SET CurrentStock=i.CurrentStock+x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.PurchaseBillItems x ON x.ItemId=i.Id WHERE x.PurchaseBillId=@Id AND x.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)SELECT x.ItemId,N'PurchaseBill',@Id,3,x.Quantity,@UserId FROM dbo.PurchaseBillItems x JOIN dbo.Items i ON i.Id=x.ItemId WHERE x.PurchaseBillId=@Id AND x.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy)SELECT SupplierId,BillDate,N'PurchaseBill',Id,N'Purchase',GrandTotal,@UserId FROM dbo.PurchaseBills WHERE Id=@Id;INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy)SELECT SupplierId,BillDate,N'PurchaseBill',Id,N'PaymentOut',-PaidAmount,@UserId FROM dbo.PurchaseBills WHERE Id=@Id AND PaidAmount>0;UPDATE dbo.PurchaseBills SET Status=IIF(BalanceAmount=0,4,IIF(PaidAmount>0,3,2)),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;COMMIT;SELECT 200 StatusCode,N'Purchase bill confirmed.'Message;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_Cancel @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY DECLARE @S INT=(SELECT Status FROM dbo.PurchaseBills WHERE Id=@Id AND IsDeleted=0);IF @S IS NULL BEGIN SELECT 404 StatusCode,N'Purchase bill was not found.'Message;RETURN;END IF @S=5 BEGIN SELECT 409 StatusCode,N'Purchase bill is already cancelled.'Message;RETURN;END BEGIN TRAN;IF @S IN(2,3,4)BEGIN UPDATE i SET CurrentStock=i.CurrentStock-x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.PurchaseBillItems x ON x.ItemId=i.Id WHERE x.PurchaseBillId=@Id AND x.IsDeleted=0 AND i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)SELECT ItemId,N'PurchaseBill',@Id,4,-Quantity,@UserId FROM dbo.PurchaseBillItems WHERE PurchaseBillId=@Id AND IsDeleted=0;UPDATE dbo.PartyLedgerEntries SET IsDeleted=1 WHERE SourceType=N'PurchaseBill' AND SourceId=@Id AND IsDeleted=0;END UPDATE dbo.PurchaseBills SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;COMMIT;SELECT 200 StatusCode,N'Purchase bill cancelled.'Message;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_Delete @Id BIGINT,@UserId BIGINT=NULL AS BEGIN IF NOT EXISTS(SELECT 1 FROM dbo.PurchaseBills WHERE Id=@Id AND IsDeleted=0 AND Status=1)BEGIN SELECT 409 StatusCode,N'Only draft purchase bills can be deleted.'Message;RETURN;END UPDATE dbo.PurchaseBills SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;UPDATE dbo.PurchaseBillItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE PurchaseBillId=@Id;SELECT 200 StatusCode,N'Purchase bill deleted.'Message;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SupplierPayment_GetById @Id BIGINT AS BEGIN SET NOCOUNT ON;SELECT s.*,p.PartyName SupplierName FROM dbo.SupplierPayments s JOIN dbo.Parties p ON p.Id=s.SupplierId WHERE s.Id=@Id AND s.IsDeleted=0;SELECT a.Id,a.PurchaseBillId,b.PurchaseBillNo,a.AllocatedAmount FROM dbo.SupplierPaymentAllocations a JOIN dbo.PurchaseBills b ON b.Id=a.PurchaseBillId WHERE a.SupplierPaymentId=@Id AND a.IsDeleted=0;END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_SupplierPayment_GetList @Search NVARCHAR(200)=NULL,@SupplierId UNIQUEIDENTIFIER=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'PaymentDate',@SortDirection NVARCHAR(4)=N'DESC' AS BEGIN SELECT s.*,p.PartyName SupplierName,COUNT(1)OVER()TotalCount FROM dbo.SupplierPayments s JOIN dbo.Parties p ON p.Id=s.SupplierId WHERE s.IsDeleted=0 AND(@SupplierId IS NULL OR s.SupplierId=@SupplierId)AND(@FromDate IS NULL OR s.PaymentDate>=@FromDate)AND(@ToDate IS NULL OR s.PaymentDate<=@ToDate)AND(@Search IS NULL OR s.PaymentOutNo LIKE N'%'+@Search+N'%' OR p.PartyName LIKE N'%'+@Search+N'%')ORDER BY CASE WHEN @SortDirection=N'ASC' THEN s.PaymentDate END ASC,CASE WHEN @SortDirection<>N'ASC' THEN s.PaymentDate END DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_SupplierPayment_Save @Id BIGINT=NULL,@SupplierId UNIQUEIDENTIFIER,@PaymentDate DATE,@Amount DECIMAL(18,2),@PaymentMode INT,@ReferenceNo NVARCHAR(100)=NULL,@Notes NVARCHAR(500)=NULL,@Allocations dbo.SupplierPaymentAllocationInput READONLY,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF @Amount<=0 OR (SELECT COALESCE(SUM(AllocatedAmount),0)FROM @Allocations)>@Amount BEGIN SELECT 400 StatusCode,N'Payment amount or allocations are invalid.'Message;RETURN;END IF EXISTS(SELECT 1 FROM @Allocations a JOIN dbo.PurchaseBills b ON b.Id=a.PurchaseBillId WHERE b.SupplierId<>@SupplierId OR b.IsDeleted=1 OR b.Status=5)BEGIN SELECT 400 StatusCode,N'An allocated bill is invalid for this supplier.'Message;RETURN;END BEGIN TRAN;
 IF @Id IS NULL BEGIN DECLARE @N BIGINT,@P NVARCHAR(20),@Pad INT;SELECT @N=NextNumber,@P=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK)WHERE ModuleName=N'SupplierPayment';IF @N IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength)VALUES(N'SupplierPayment',N'PAYOUT-',1,6);SELECT @N=1,@P=N'PAYOUT-',@Pad=6;END UPDATE dbo.NumberSequences SET NextNumber=@N+1,UpdatedAtUtc=SYSUTCDATETIME()WHERE ModuleName=N'SupplierPayment';INSERT dbo.SupplierPayments(PaymentOutNo,SupplierId,PaymentDate,Amount,PaymentMode,ReferenceNo,Notes,CreatedBy)VALUES(@P+RIGHT(REPLICATE('0',@Pad)+CONVERT(VARCHAR,@N),@Pad),@SupplierId,@PaymentDate,@Amount,@PaymentMode,@ReferenceNo,@Notes,@UserId);SET @Id=SCOPE_IDENTITY();END ELSE BEGIN
  UPDATE b SET PaidAmount=PaidAmount-a.AllocatedAmount,BalanceAmount=BalanceAmount+a.AllocatedAmount,PaymentStatus=IIF(PaidAmount-a.AllocatedAmount=0,1,2),Status=IIF(Status=1,1,IIF(PaidAmount-a.AllocatedAmount=0,2,3)) FROM dbo.PurchaseBills b JOIN dbo.SupplierPaymentAllocations a ON a.PurchaseBillId=b.Id WHERE a.SupplierPaymentId=@Id AND a.IsDeleted=0;UPDATE dbo.SupplierPaymentAllocations SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE SupplierPaymentId=@Id AND IsDeleted=0;UPDATE dbo.PartyLedgerEntries SET IsDeleted=1 WHERE SourceType=N'SupplierPayment' AND SourceId=@Id AND IsDeleted=0;UPDATE dbo.SupplierPayments SET SupplierId=@SupplierId,PaymentDate=@PaymentDate,Amount=@Amount,PaymentMode=@PaymentMode,ReferenceNo=@ReferenceNo,Notes=@Notes,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;END
 IF EXISTS(SELECT 1 FROM @Allocations a JOIN dbo.PurchaseBills b ON b.Id=a.PurchaseBillId WHERE a.AllocatedAmount>b.BalanceAmount)BEGIN ROLLBACK;SELECT 400 StatusCode,N'Allocation exceeds a bill balance.'Message;RETURN;END INSERT dbo.SupplierPaymentAllocations(SupplierPaymentId,PurchaseBillId,AllocatedAmount,CreatedBy)SELECT @Id,PurchaseBillId,AllocatedAmount,@UserId FROM @Allocations;UPDATE b SET PaidAmount=PaidAmount+a.AllocatedAmount,BalanceAmount=BalanceAmount-a.AllocatedAmount,PaymentStatus=IIF(BalanceAmount-a.AllocatedAmount=0,3,2),Status=IIF(Status=1,1,IIF(BalanceAmount-a.AllocatedAmount=0,4,3)),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId FROM dbo.PurchaseBills b JOIN @Allocations a ON a.PurchaseBillId=b.Id;INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy)VALUES(@SupplierId,@PaymentDate,N'SupplierPayment',@Id,N'PaymentOut',-@Amount,@UserId);COMMIT;SELECT 200 StatusCode,N'Payment-out saved.'Message;SELECT @Id;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_SupplierPayment_Delete @Id BIGINT,@UserId BIGINT=NULL AS BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF NOT EXISTS(SELECT 1 FROM dbo.SupplierPayments WHERE Id=@Id AND IsDeleted=0)BEGIN SELECT 404 StatusCode,N'Payment-out was not found.'Message;RETURN;END BEGIN TRAN;UPDATE b SET PaidAmount=PaidAmount-a.AllocatedAmount,BalanceAmount=BalanceAmount+a.AllocatedAmount,PaymentStatus=IIF(PaidAmount-a.AllocatedAmount=0,1,2),Status=IIF(Status=1,1,IIF(PaidAmount-a.AllocatedAmount=0,2,3)),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId FROM dbo.PurchaseBills b JOIN dbo.SupplierPaymentAllocations a ON a.PurchaseBillId=b.Id WHERE a.SupplierPaymentId=@Id AND a.IsDeleted=0;UPDATE dbo.SupplierPaymentAllocations SET IsDeleted=1 WHERE SupplierPaymentId=@Id;UPDATE dbo.SupplierPayments SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;UPDATE dbo.PartyLedgerEntries SET IsDeleted=1 WHERE SourceType=N'SupplierPayment' AND SourceId=@Id;COMMIT;SELECT 200 StatusCode,N'Payment-out deleted.'Message;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ExpenseCategory_GetById @Id BIGINT AS SELECT *,0 TotalCount FROM dbo.ExpenseCategories WHERE Id=@Id AND IsDeleted=0;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ExpenseCategory_GetList @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'Name',@SortDirection NVARCHAR(4)=N'ASC' AS SELECT *,COUNT(1)OVER()TotalCount FROM dbo.ExpenseCategories WHERE IsDeleted=0 AND(@IsActive IS NULL OR IsActive=@IsActive)AND(@Search IS NULL OR Name LIKE N'%'+@Search+N'%')ORDER BY CASE WHEN @SortDirection=N'ASC' THEN Name END ASC,CASE WHEN @SortDirection<>N'ASC' THEN Name END DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ExpenseCategory_Save @Id BIGINT=NULL,@Name NVARCHAR(150),@Description NVARCHAR(500)=NULL,@IsActive BIT=1,@UserId BIGINT=NULL AS BEGIN IF EXISTS(SELECT 1 FROM dbo.ExpenseCategories WHERE Name=@Name AND IsDeleted=0 AND(@Id IS NULL OR Id<>@Id))BEGIN SELECT 409 StatusCode,N'Expense category name already exists.'Message;RETURN;END IF @Id IS NULL BEGIN INSERT dbo.ExpenseCategories(Name,Description,IsActive,CreatedBy)VALUES(@Name,@Description,@IsActive,@UserId);SET @Id=SCOPE_IDENTITY();END ELSE UPDATE dbo.ExpenseCategories SET Name=@Name,Description=@Description,IsActive=@IsActive,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;SELECT 200 StatusCode,N'Expense category saved.'Message;SELECT @Id;END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ExpenseCategory_Delete @Id BIGINT,@UserId BIGINT=NULL AS BEGIN IF EXISTS(SELECT 1 FROM dbo.Expenses WHERE CategoryId=@Id AND IsDeleted=0)BEGIN SELECT 409 StatusCode,N'Category is used by an expense.'Message;RETURN;END UPDATE dbo.ExpenseCategories SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Expense category was not found.'Message;ELSE SELECT 200 StatusCode,N'Expense category deleted.'Message;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Expense_GetById @Id BIGINT AS SELECT e.*,c.Name CategoryName,p.PartyName PaidToPartyName,0 TotalCount FROM dbo.Expenses e JOIN dbo.ExpenseCategories c ON c.Id=e.CategoryId LEFT JOIN dbo.Parties p ON p.Id=e.PaidToPartyId WHERE e.Id=@Id AND e.IsDeleted=0;
GO
CREATE OR ALTER PROCEDURE dbo.sp_Expense_GetList @Search NVARCHAR(200)=NULL,@CategoryId BIGINT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'ExpenseDate',@SortDirection NVARCHAR(4)=N'DESC' AS SELECT e.*,c.Name CategoryName,p.PartyName PaidToPartyName,COUNT(1)OVER()TotalCount FROM dbo.Expenses e JOIN dbo.ExpenseCategories c ON c.Id=e.CategoryId LEFT JOIN dbo.Parties p ON p.Id=e.PaidToPartyId WHERE e.IsDeleted=0 AND(@CategoryId IS NULL OR e.CategoryId=@CategoryId)AND(@FromDate IS NULL OR e.ExpenseDate>=@FromDate)AND(@ToDate IS NULL OR e.ExpenseDate<=@ToDate)AND(@Search IS NULL OR e.ExpenseNo LIKE N'%'+@Search+N'%' OR c.Name LIKE N'%'+@Search+N'%')ORDER BY CASE WHEN @SortDirection=N'ASC' THEN e.ExpenseDate END ASC,CASE WHEN @SortDirection<>N'ASC' THEN e.ExpenseDate END DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
GO
CREATE OR ALTER PROCEDURE dbo.sp_Expense_Save @Id BIGINT=NULL,@ExpenseDate DATE,@CategoryId BIGINT,@PaidToPartyId UNIQUEIDENTIFIER=NULL,@Amount DECIMAL(18,2),@TaxAmount DECIMAL(18,2),@PaymentMode INT,@ReferenceNo NVARCHAR(100)=NULL,@Notes NVARCHAR(1000)=NULL,@AttachmentPath NVARCHAR(500)=NULL,@UserId BIGINT=NULL AS BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF @Amount<=0 OR @TaxAmount<0 BEGIN SELECT 400 StatusCode,N'Expense amount is invalid.'Message;RETURN;END BEGIN TRAN;IF @Id IS NULL BEGIN DECLARE @N BIGINT,@P NVARCHAR(20),@Pad INT;SELECT @N=NextNumber,@P=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK)WHERE ModuleName=N'Expense';IF @N IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength)VALUES(N'Expense',N'EXP-',1,6);SELECT @N=1,@P=N'EXP-',@Pad=6;END UPDATE dbo.NumberSequences SET NextNumber=@N+1,UpdatedAtUtc=SYSUTCDATETIME()WHERE ModuleName=N'Expense';INSERT dbo.Expenses(ExpenseNo,ExpenseDate,CategoryId,PaidToPartyId,Amount,TaxAmount,PaymentMode,ReferenceNo,Notes,AttachmentPath,CreatedBy)VALUES(@P+RIGHT(REPLICATE('0',@Pad)+CONVERT(VARCHAR,@N),@Pad),@ExpenseDate,@CategoryId,@PaidToPartyId,@Amount,@TaxAmount,@PaymentMode,@ReferenceNo,@Notes,@AttachmentPath,@UserId);SET @Id=SCOPE_IDENTITY();END ELSE UPDATE dbo.Expenses SET ExpenseDate=@ExpenseDate,CategoryId=@CategoryId,PaidToPartyId=@PaidToPartyId,Amount=@Amount,TaxAmount=@TaxAmount,PaymentMode=@PaymentMode,ReferenceNo=@ReferenceNo,Notes=@Notes,AttachmentPath=@AttachmentPath,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;COMMIT;SELECT 200 StatusCode,N'Expense saved.'Message;SELECT @Id;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_Expense_Delete @Id BIGINT,@UserId BIGINT=NULL AS BEGIN UPDATE dbo.Expenses SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Expense was not found.'Message;ELSE SELECT 200 StatusCode,N'Expense deleted.'Message;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_GetById @Id BIGINT AS BEGIN SELECT o.*,p.PartyName SupplierName FROM dbo.PurchaseOrders o JOIN dbo.Parties p ON p.Id=o.SupplierId WHERE o.Id=@Id AND o.IsDeleted=0;SELECT i.Id,i.ItemId,i.ItemNameSnapshot ItemName,i.Quantity,i.UnitId,i.UnitNameSnapshot UnitName,i.PurchasePrice,i.DiscountPercentage,i.DiscountAmount,i.TaxPercentage,i.TaxAmount,i.LineTotal,CAST(NULL AS BIGINT)PurchaseBillItemId FROM dbo.PurchaseOrderItems i WHERE i.PurchaseOrderId=@Id AND i.IsDeleted=0;END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_GetList @Search NVARCHAR(200)=NULL,@SupplierId UNIQUEIDENTIFIER=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'OrderDate',@SortDirection NVARCHAR(4)=N'DESC' AS SELECT o.*,p.PartyName SupplierName,COUNT(1)OVER()TotalCount FROM dbo.PurchaseOrders o JOIN dbo.Parties p ON p.Id=o.SupplierId WHERE o.IsDeleted=0 AND(@SupplierId IS NULL OR o.SupplierId=@SupplierId)AND(@Status IS NULL OR o.Status=@Status)AND(@FromDate IS NULL OR o.OrderDate>=@FromDate)AND(@ToDate IS NULL OR o.OrderDate<=@ToDate)AND(@Search IS NULL OR o.PurchaseOrderNo LIKE N'%'+@Search+N'%' OR p.PartyName LIKE N'%'+@Search+N'%')ORDER BY CASE WHEN @SortDirection=N'ASC' THEN o.OrderDate END ASC,CASE WHEN @SortDirection<>N'ASC' THEN o.OrderDate END DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_Save @Id BIGINT=NULL,@SupplierId UNIQUEIDENTIFIER,@OrderDate DATE,@ExpectedDeliveryDate DATE=NULL,@DiscountAmount DECIMAL(18,2)=0,@TermsAndConditions NVARCHAR(2000)=NULL,@Notes NVARCHAR(1000)=NULL,@Items dbo.PurchaseLineInput READONLY,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF NOT EXISTS(SELECT 1 FROM @Items)BEGIN SELECT 400 StatusCode,N'At least one order item is required.'Message;RETURN;END IF @Id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.PurchaseOrders WHERE Id=@Id AND IsDeleted=0 AND Status IN(1,2))BEGIN SELECT 409 StatusCode,N'Converted or cancelled orders cannot be updated.'Message;RETURN;END DECLARE @Sub DECIMAL(18,2),@LD DECIMAL(18,2),@Tax DECIMAL(18,2),@Grand DECIMAL(18,2);SELECT @Sub=SUM(Quantity*PurchasePrice),@LD=SUM(IIF(DiscountAmount>0,DiscountAmount,ROUND(Quantity*PurchasePrice*DiscountPercentage/100,2))),@Tax=SUM(ROUND((Quantity*PurchasePrice-IIF(DiscountAmount>0,DiscountAmount,ROUND(Quantity*PurchasePrice*DiscountPercentage/100,2)))*TaxPercentage/100,2))FROM @Items;SET @Grand=@Sub-@LD-@DiscountAmount+@Tax;BEGIN TRAN;IF @Id IS NULL BEGIN DECLARE @N BIGINT,@P NVARCHAR(20),@Pad INT;SELECT @N=NextNumber,@P=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK)WHERE ModuleName=N'PurchaseOrder';IF @N IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength)VALUES(N'PurchaseOrder',N'PO-',1,6);SELECT @N=1,@P=N'PO-',@Pad=6;END UPDATE dbo.NumberSequences SET NextNumber=@N+1,UpdatedAtUtc=SYSUTCDATETIME()WHERE ModuleName=N'PurchaseOrder';INSERT dbo.PurchaseOrders(PurchaseOrderNo,SupplierId,OrderDate,ExpectedDeliveryDate,Status,SubTotal,DiscountAmount,TaxAmount,GrandTotal,TermsAndConditions,Notes,CreatedBy)VALUES(@P+RIGHT(REPLICATE('0',@Pad)+CONVERT(VARCHAR,@N),@Pad),@SupplierId,@OrderDate,@ExpectedDeliveryDate,1,@Sub,@LD+@DiscountAmount,@Tax,@Grand,@TermsAndConditions,@Notes,@UserId);SET @Id=SCOPE_IDENTITY();END ELSE BEGIN UPDATE dbo.PurchaseOrders SET SupplierId=@SupplierId,OrderDate=@OrderDate,ExpectedDeliveryDate=@ExpectedDeliveryDate,SubTotal=@Sub,DiscountAmount=@LD+@DiscountAmount,TaxAmount=@Tax,GrandTotal=@Grand,TermsAndConditions=@TermsAndConditions,Notes=@Notes,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;UPDATE dbo.PurchaseOrderItems SET IsDeleted=1 WHERE PurchaseOrderId=@Id AND IsDeleted=0;END INSERT dbo.PurchaseOrderItems(PurchaseOrderId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy)SELECT @Id,i.Id,i.Name,x.Quantity,COALESCE(x.UnitId,i.UnitId),u.Name,x.PurchasePrice,x.DiscountPercentage,IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)),x.TaxPercentage,ROUND((x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))*x.TaxPercentage/100,2),(x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))+ROUND((x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))*x.TaxPercentage/100,2),@UserId FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId LEFT JOIN dbo.Units u ON u.Id=COALESCE(x.UnitId,i.UnitId);COMMIT;SELECT 200 StatusCode,N'Purchase order saved.'Message;SELECT @Id;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_Cancel @Id BIGINT,@UserId BIGINT=NULL AS BEGIN UPDATE dbo.PurchaseOrders SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0 AND Status IN(1,2);IF @@ROWCOUNT=0 SELECT 409 StatusCode,N'Only unconverted orders can be cancelled.'Message;ELSE SELECT 200 StatusCode,N'Purchase order cancelled.'Message;END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_Delete @Id BIGINT,@UserId BIGINT=NULL AS BEGIN UPDATE dbo.PurchaseOrders SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0 AND Status IN(1,2,5);IF @@ROWCOUNT=0 SELECT 409 StatusCode,N'Converted orders cannot be deleted.'Message;ELSE BEGIN UPDATE dbo.PurchaseOrderItems SET IsDeleted=1 WHERE PurchaseOrderId=@Id;SELECT 200 StatusCode,N'Purchase order deleted.'Message;END END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseOrder_Convert @Id BIGINT,@BillDate DATE,@DueDate DATE=NULL,@PaymentType INT=2,@PaidAmount DECIMAL(18,2)=0,@SupplierInvoiceNo NVARCHAR(100)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF NOT EXISTS(SELECT 1 FROM dbo.PurchaseOrders WHERE Id=@Id AND IsDeleted=0 AND Status IN(1,2))BEGIN SELECT 409 StatusCode,N'Purchase order cannot be converted.'Message;RETURN;END DECLARE @Supplier UNIQUEIDENTIFIER,@Sub DECIMAL(18,2),@Disc DECIMAL(18,2),@Tax DECIMAL(18,2),@Grand DECIMAL(18,2);SELECT @Supplier=SupplierId,@Sub=SubTotal,@Disc=DiscountAmount,@Tax=TaxAmount,@Grand=GrandTotal FROM dbo.PurchaseOrders WHERE Id=@Id;IF @PaidAmount<0 OR @PaidAmount>@Grand BEGIN SELECT 400 StatusCode,N'Paid amount is invalid.'Message;RETURN;END BEGIN TRAN;DECLARE @N BIGINT,@P NVARCHAR(20),@Pad INT;SELECT @N=NextNumber,@P=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK)WHERE ModuleName=N'PurchaseBill';IF @N IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength)VALUES(N'PurchaseBill',N'PB-',1,6);SELECT @N=1,@P=N'PB-',@Pad=6;END UPDATE dbo.NumberSequences SET NextNumber=@N+1,UpdatedAtUtc=SYSUTCDATETIME()WHERE ModuleName=N'PurchaseBill';INSERT dbo.PurchaseBills(PurchaseBillNo,SupplierId,SupplierInvoiceNo,BillDate,DueDate,PaymentType,PaymentStatus,SubTotal,DiscountAmount,TaxAmount,RoundOff,GrandTotal,PaidAmount,BalanceAmount,Notes,Status,CreatedBy)SELECT @P+RIGHT(REPLICATE('0',@Pad)+CONVERT(VARCHAR,@N),@Pad),SupplierId,@SupplierInvoiceNo,@BillDate,@DueDate,@PaymentType,IIF(@PaidAmount=0,1,IIF(@PaidAmount=@Grand,3,2)),SubTotal,DiscountAmount,TaxAmount,0,GrandTotal,@PaidAmount,GrandTotal-@PaidAmount,Notes,IIF(@PaidAmount=GrandTotal,4,IIF(@PaidAmount>0,3,2)),@UserId FROM dbo.PurchaseOrders WHERE Id=@Id;DECLARE @BillId BIGINT=SCOPE_IDENTITY();INSERT dbo.PurchaseBillItems(PurchaseBillId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy)SELECT @BillId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,@UserId FROM dbo.PurchaseOrderItems WHERE PurchaseOrderId=@Id AND IsDeleted=0;UPDATE i SET CurrentStock=i.CurrentStock+x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.PurchaseOrderItems x ON x.ItemId=i.Id WHERE x.PurchaseOrderId=@Id AND x.IsDeleted=0 AND i.ItemType=1 AND i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)SELECT ItemId,N'PurchaseBill',@BillId,3,Quantity,@UserId FROM dbo.PurchaseOrderItems WHERE PurchaseOrderId=@Id AND IsDeleted=0;INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy)VALUES(@Supplier,@BillDate,N'PurchaseBill',@BillId,N'Purchase',@Grand,@UserId);IF @PaidAmount>0 INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy)VALUES(@Supplier,@BillDate,N'PurchaseBill',@BillId,N'PaymentOut',-@PaidAmount,@UserId);UPDATE dbo.PurchaseOrders SET Status=4,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;COMMIT;SELECT 201 StatusCode,N'Purchase order converted.'Message;SELECT @BillId;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseReturn_GetById @Id BIGINT AS BEGIN SELECT r.*,p.PartyName SupplierName FROM dbo.PurchaseReturns r JOIN dbo.Parties p ON p.Id=r.SupplierId WHERE r.Id=@Id AND r.IsDeleted=0;SELECT i.Id,i.ItemId,i.ItemNameSnapshot ItemName,i.Quantity,i.UnitId,i.UnitNameSnapshot UnitName,i.PurchasePrice,i.DiscountPercentage,i.DiscountAmount,i.TaxPercentage,i.TaxAmount,i.LineTotal,i.PurchaseBillItemId FROM dbo.PurchaseReturnItems i WHERE i.PurchaseReturnId=@Id AND i.IsDeleted=0;END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseReturn_GetList @Search NVARCHAR(200)=NULL,@SupplierId UNIQUEIDENTIFIER=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'ReturnDate',@SortDirection NVARCHAR(4)=N'DESC' AS SELECT r.*,p.PartyName SupplierName,COUNT(1)OVER()TotalCount FROM dbo.PurchaseReturns r JOIN dbo.Parties p ON p.Id=r.SupplierId WHERE r.IsDeleted=0 AND(@SupplierId IS NULL OR r.SupplierId=@SupplierId)AND(@FromDate IS NULL OR r.ReturnDate>=@FromDate)AND(@ToDate IS NULL OR r.ReturnDate<=@ToDate)AND(@Search IS NULL OR r.PurchaseReturnNo LIKE N'%'+@Search+N'%' OR p.PartyName LIKE N'%'+@Search+N'%')ORDER BY CASE WHEN @SortDirection=N'ASC' THEN r.ReturnDate END ASC,CASE WHEN @SortDirection<>N'ASC' THEN r.ReturnDate END DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseReturn_Save @Id BIGINT=NULL,@PurchaseBillId BIGINT=NULL,@SupplierId UNIQUEIDENTIFIER,@ReturnDate DATE,@Reason NVARCHAR(500)=NULL,@Notes NVARCHAR(1000)=NULL,@Items dbo.PurchaseLineInput READONLY,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF NOT EXISTS(SELECT 1 FROM @Items)BEGIN SELECT 400 StatusCode,N'At least one return item is required.'Message;RETURN;END IF @PurchaseBillId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.PurchaseBills WHERE Id=@PurchaseBillId AND SupplierId=@SupplierId AND IsDeleted=0 AND Status IN(2,3,4))BEGIN SELECT 400 StatusCode,N'Purchase bill is invalid for this supplier.'Message;RETURN;END
 IF EXISTS(SELECT 1 FROM @Items x WHERE x.PurchaseBillItemId IS NOT NULL AND (SELECT Quantity FROM dbo.PurchaseBillItems WHERE Id=x.PurchaseBillItemId AND PurchaseBillId=@PurchaseBillId AND IsDeleted=0)<x.Quantity+COALESCE((SELECT SUM(ri.Quantity)FROM dbo.PurchaseReturnItems ri JOIN dbo.PurchaseReturns r ON r.Id=ri.PurchaseReturnId WHERE ri.PurchaseBillItemId=x.PurchaseBillItemId AND ri.IsDeleted=0 AND r.IsDeleted=0 AND(@Id IS NULL OR r.Id<>@Id)),0))BEGIN SELECT 400 StatusCode,N'Return quantity exceeds purchased quantity.'Message;RETURN;END
 IF EXISTS(SELECT 1 FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId WHERE i.TrackInventory=1 AND i.CurrentStock<x.Quantity)BEGIN SELECT 409 StatusCode,N'Insufficient stock for purchase return.'Message;RETURN;END DECLARE @Sub DECIMAL(18,2),@Tax DECIMAL(18,2),@Grand DECIMAL(18,2);SELECT @Sub=SUM(Quantity*PurchasePrice-IIF(DiscountAmount>0,DiscountAmount,ROUND(Quantity*PurchasePrice*DiscountPercentage/100,2))),@Tax=SUM(ROUND((Quantity*PurchasePrice-IIF(DiscountAmount>0,DiscountAmount,ROUND(Quantity*PurchasePrice*DiscountPercentage/100,2)))*TaxPercentage/100,2))FROM @Items;SET @Grand=@Sub+@Tax;BEGIN TRAN;
 IF @Id IS NULL BEGIN DECLARE @N BIGINT,@P NVARCHAR(20),@Pad INT;SELECT @N=NextNumber,@P=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK)WHERE ModuleName=N'PurchaseReturn';IF @N IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength)VALUES(N'PurchaseReturn',N'PR-',1,6);SELECT @N=1,@P=N'PR-',@Pad=6;END UPDATE dbo.NumberSequences SET NextNumber=@N+1,UpdatedAtUtc=SYSUTCDATETIME()WHERE ModuleName=N'PurchaseReturn';INSERT dbo.PurchaseReturns(PurchaseReturnNo,PurchaseBillId,SupplierId,ReturnDate,Reason,SubTotal,TaxAmount,GrandTotal,Notes,CreatedBy)VALUES(@P+RIGHT(REPLICATE('0',@Pad)+CONVERT(VARCHAR,@N),@Pad),@PurchaseBillId,@SupplierId,@ReturnDate,@Reason,@Sub,@Tax,@Grand,@Notes,@UserId);SET @Id=SCOPE_IDENTITY();END ELSE BEGIN UPDATE i SET CurrentStock=i.CurrentStock+ri.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.PurchaseReturnItems ri ON ri.ItemId=i.Id WHERE ri.PurchaseReturnId=@Id AND ri.IsDeleted=0 AND i.TrackInventory=1;UPDATE dbo.PurchaseReturnItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE PurchaseReturnId=@Id AND IsDeleted=0;UPDATE dbo.PartyLedgerEntries SET IsDeleted=1 WHERE SourceType=N'PurchaseReturn' AND SourceId=@Id AND IsDeleted=0;UPDATE dbo.PurchaseReturns SET PurchaseBillId=@PurchaseBillId,SupplierId=@SupplierId,ReturnDate=@ReturnDate,Reason=@Reason,SubTotal=@Sub,TaxAmount=@Tax,GrandTotal=@Grand,Notes=@Notes,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0;END
 INSERT dbo.PurchaseReturnItems(PurchaseReturnId,PurchaseBillItemId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy)SELECT @Id,x.PurchaseBillItemId,i.Id,i.Name,x.Quantity,COALESCE(x.UnitId,i.UnitId),u.Name,x.PurchasePrice,x.DiscountPercentage,IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)),x.TaxPercentage,ROUND((x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))*x.TaxPercentage/100,2),(x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))+ROUND((x.Quantity*x.PurchasePrice-IIF(x.DiscountAmount>0,x.DiscountAmount,ROUND(x.Quantity*x.PurchasePrice*x.DiscountPercentage/100,2)))*x.TaxPercentage/100,2),@UserId FROM @Items x JOIN dbo.Items i ON i.Id=x.ItemId LEFT JOIN dbo.Units u ON u.Id=COALESCE(x.UnitId,i.UnitId);UPDATE i SET CurrentStock=i.CurrentStock-x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN @Items x ON x.ItemId=i.Id WHERE i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)SELECT ItemId,N'PurchaseReturn',@Id,4,-Quantity,@UserId FROM @Items;INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy)VALUES(@SupplierId,@ReturnDate,N'PurchaseReturn',@Id,N'PurchaseReturn',-@Grand,@UserId);COMMIT;SELECT 200 StatusCode,N'Purchase return saved.'Message;SELECT @Id;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseReturn_Delete @Id BIGINT,@UserId BIGINT=NULL AS BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY IF NOT EXISTS(SELECT 1 FROM dbo.PurchaseReturns WHERE Id=@Id AND IsDeleted=0)BEGIN SELECT 404 StatusCode,N'Purchase return was not found.'Message;RETURN;END BEGIN TRAN;UPDATE i SET CurrentStock=i.CurrentStock+ri.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.PurchaseReturnItems ri ON ri.ItemId=i.Id WHERE ri.PurchaseReturnId=@Id AND ri.IsDeleted=0 AND i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy)SELECT ItemId,N'PurchaseReturn',@Id,3,Quantity,@UserId FROM dbo.PurchaseReturnItems WHERE PurchaseReturnId=@Id AND IsDeleted=0;UPDATE dbo.PurchaseReturns SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;UPDATE dbo.PurchaseReturnItems SET IsDeleted=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE PurchaseReturnId=@Id;UPDATE dbo.PartyLedgerEntries SET IsDeleted=1 WHERE SourceType=N'PurchaseReturn' AND SourceId=@Id;COMMIT;SELECT 200 StatusCode,N'Purchase return deleted.'Message;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE()Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpenseReport_PurchaseSummary @FromDate DATE=NULL,@ToDate DATE=NULL AS SELECT COALESCE(SUM(GrandTotal),0)TotalPurchase,COALESCE(SUM(PaidAmount),0)PaidAmount,COALESCE(SUM(BalanceAmount),0)BalanceAmount,COUNT(1)TotalBills FROM dbo.PurchaseBills WHERE IsDeleted=0 AND Status IN(2,3,4)AND(@FromDate IS NULL OR BillDate>=@FromDate)AND(@ToDate IS NULL OR BillDate<=@ToDate);
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpenseReport_SupplierOutstanding AS SELECT p.Id SupplierId,p.PartyName SupplierName,COALESCE(SUM(CASE WHEN l.EntryType=N'Purchase' THEN l.Amount ELSE 0 END),0)TotalPurchase,COALESCE(-SUM(CASE WHEN l.EntryType=N'PaymentOut' THEN l.Amount ELSE 0 END),0)TotalPaid,COALESCE(SUM(l.Amount),0)OutstandingAmount FROM dbo.Parties p JOIN dbo.PartyLedgerEntries l ON l.PartyId=p.Id AND l.IsDeleted=0 GROUP BY p.Id,p.PartyName HAVING SUM(l.Amount)<>0 ORDER BY p.PartyName;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpenseReport_ExpenseSummary @FromDate DATE=NULL,@ToDate DATE=NULL AS SELECT COALESCE(SUM(TotalAmount),0)TotalExpense,COALESCE(SUM(TaxAmount),0)TotalTax,COUNT(1)TotalRecords FROM dbo.Expenses WHERE IsDeleted=0 AND(@FromDate IS NULL OR ExpenseDate>=@FromDate)AND(@ToDate IS NULL OR ExpenseDate<=@ToDate);
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpenseReport_CategoryWiseExpense @FromDate DATE=NULL,@ToDate DATE=NULL AS SELECT c.Id CategoryId,c.Name CategoryName,COALESCE(SUM(e.TotalAmount),0)TotalAmount FROM dbo.ExpenseCategories c JOIN dbo.Expenses e ON e.CategoryId=c.Id AND e.IsDeleted=0 WHERE c.IsDeleted=0 AND(@FromDate IS NULL OR e.ExpenseDate>=@FromDate)AND(@ToDate IS NULL OR e.ExpenseDate<=@ToDate)GROUP BY c.Id,c.Name ORDER BY c.Name;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseExpenseReport_ItemPurchaseHistory @ItemId BIGINT AS SELECT b.PurchaseBillNo,b.BillDate [Date],p.PartyName SupplierName,i.Quantity,i.PurchasePrice,i.LineTotal TotalAmount FROM dbo.PurchaseBillItems i JOIN dbo.PurchaseBills b ON b.Id=i.PurchaseBillId JOIN dbo.Parties p ON p.Id=b.SupplierId WHERE i.ItemId=@ItemId AND i.IsDeleted=0 AND b.IsDeleted=0 AND b.Status IN(2,3,4)ORDER BY b.BillDate DESC,b.Id DESC;
GO

MERGE dbo.Pages AS t USING(VALUES
(N'PurchaseExpense.PurchaseBill',N'Purchase Bills',N'/purchase/bills',N'receipt',70),(N'PurchaseExpense.PaymentOut',N'Payment-Out',N'/purchase/payments',N'wallet',71),(N'PurchaseExpense.ExpenseCategory',N'Expense Categories',N'/expenses/categories',N'tags',72),(N'PurchaseExpense.Expense',N'Expenses',N'/expenses',N'banknote',73),(N'PurchaseExpense.PurchaseOrder',N'Purchase Orders',N'/purchase/orders',N'clipboard-list',74),(N'PurchaseExpense.PurchaseReturn',N'Purchase Returns',N'/purchase/returns',N'rotate-ccw',75),(N'PurchaseExpense.Report',N'Purchase & Expense Reports',N'/purchase/reports',N'chart-column',76))s(Name,DisplayName,Route,Icon,SortOrder)ON t.Name=s.Name WHEN MATCHED THEN UPDATE SET DisplayName=s.DisplayName,Route=s.Route,Icon=s.Icon,SortOrder=s.SortOrder,IsActive=1 WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive)VALUES(s.Name,s.DisplayName,s.Route,s.Icon,s.SortOrder,1);
GO
DECLARE @RoleId INT=(SELECT TOP(1)Id FROM dbo.Roles WHERE Name=N'SuperAdmin');IF @RoleId IS NOT NULL MERGE dbo.RolePermissions t USING(SELECT @RoleId RoleId,Id PageId,Name FROM dbo.Pages WHERE Name LIKE N'PurchaseExpense.%')s ON t.RoleId=s.RoleId AND t.PageId=s.PageId WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=IIF(s.Name=N'PurchaseExpense.Report',0,1),CanEdit=IIF(s.Name=N'PurchaseExpense.Report',0,1),CanDelete=IIF(s.Name=N'PurchaseExpense.Report',0,1),CanExport=1,CanApprove=IIF(s.Name IN(N'PurchaseExpense.PurchaseBill',N'PurchaseExpense.PurchaseOrder'),1,0) WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove)VALUES(s.RoleId,s.PageId,1,IIF(s.Name=N'PurchaseExpense.Report',0,1),IIF(s.Name=N'PurchaseExpense.Report',0,1),IIF(s.Name=N'PurchaseExpense.Report',0,1),1,IIF(s.Name IN(N'PurchaseExpense.PurchaseBill',N'PurchaseExpense.PurchaseOrder'),1,0));
GO

