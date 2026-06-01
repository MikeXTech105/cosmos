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
