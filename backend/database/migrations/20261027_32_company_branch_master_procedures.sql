SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Company_GetList
    @Search NVARCHAR(200) = NULL,
    @ActiveOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Code, Name, IsActive
    FROM dbo.Companies
    WHERE IsDeleted = 0
      AND (@ActiveOnly = 0 OR IsActive = 1)
      AND (@Search IS NULL OR Code LIKE N'%' + @Search + N'%' OR Name LIKE N'%' + @Search + N'%')
    ORDER BY Name, Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Company_GetById @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Code, Name, IsActive FROM dbo.Companies WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Company_Save
    @Id BIGINT = NULL,
    @Code NVARCHAR(50),
    @Name NVARCHAR(250),
    @IsActive BIT,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @SavedId BIGINT;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.Companies WHERE Code = @Code AND IsDeleted = 0 AND (@Id IS NULL OR Id <> @Id))
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Company code already exists.' AS Message;
            RETURN;
        END;
        IF @Id IS NULL
        BEGIN
            INSERT dbo.Companies(Code, Name, IsActive, CreatedBy) VALUES(@Code, @Name, @IsActive, @UserId);
            SET @SavedId = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.Companies
            SET Code = @Code, Name = @Name, IsActive = @IsActive, UpdatedAtUtc = SYSUTCDATETIME(), UpdatedBy = @UserId
            WHERE Id = @Id AND IsDeleted = 0;
            IF @@ROWCOUNT = 0
            BEGIN
                ROLLBACK TRANSACTION;
                SELECT 404 AS StatusCode, N'Company was not found.' AS Message;
                RETURN;
            END;
            SET @SavedId = @Id;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Company saved.' AS Message;
        SELECT Id, Code, Name, IsActive FROM dbo.Companies WHERE Id = @SavedId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_GetList
    @CompanyId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @ActiveOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, CompanyId, Code, Name, IsActive
    FROM dbo.Branches
    WHERE IsDeleted = 0
      AND (@CompanyId IS NULL OR CompanyId = @CompanyId)
      AND (@ActiveOnly = 0 OR IsActive = 1)
      AND (@Search IS NULL OR Code LIKE N'%' + @Search + N'%' OR Name LIKE N'%' + @Search + N'%')
    ORDER BY Name, Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_GetById @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, CompanyId, Code, Name, IsActive FROM dbo.Branches WHERE Id = @Id AND IsDeleted = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_Save
    @Id BIGINT = NULL,
    @CompanyId BIGINT,
    @Code NVARCHAR(50),
    @Name NVARCHAR(250),
    @IsActive BIT,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @SavedId BIGINT;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM dbo.Companies WHERE Id = @CompanyId AND IsDeleted = 0 AND IsActive = 1)
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Company is not active.' AS Message;
            RETURN;
        END;
        IF @Id IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Branches WHERE Id = @Id AND CompanyId <> @CompanyId)
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Branch company reassignment is not allowed.' AS Message;
            RETURN;
        END;
        IF EXISTS (SELECT 1 FROM dbo.Branches WHERE CompanyId = @CompanyId AND Code = @Code AND IsDeleted = 0 AND (@Id IS NULL OR Id <> @Id))
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 409 AS StatusCode, N'Branch code already exists for this company.' AS Message;
            RETURN;
        END;
        IF @Id IS NULL
        BEGIN
            INSERT dbo.Branches(CompanyId, Code, Name, IsActive, CreatedBy) VALUES(@CompanyId, @Code, @Name, @IsActive, @UserId);
            SET @SavedId = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.Branches
            SET Code = @Code, Name = @Name, IsActive = @IsActive, UpdatedAtUtc = SYSUTCDATETIME(), UpdatedBy = @UserId
            WHERE Id = @Id AND CompanyId = @CompanyId AND IsDeleted = 0;
            IF @@ROWCOUNT = 0
            BEGIN
                ROLLBACK TRANSACTION;
                SELECT 404 AS StatusCode, N'Branch was not found.' AS Message;
                RETURN;
            END;
            SET @SavedId = @Id;
        END;
        COMMIT TRANSACTION;
        SELECT 200 AS StatusCode, N'Branch saved.' AS Message;
        SELECT Id, CompanyId, Code, Name, IsActive FROM dbo.Branches WHERE Id = @SavedId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
