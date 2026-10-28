/* Phase 4 Increment 1A.4: active operational dependencies block deactivation; historical references are retained. */
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Company_Save
    @Id BIGINT = NULL, @Code NVARCHAR(50), @Name NVARCHAR(250), @IsActive BIT, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @SavedId BIGINT, @IsOwner BIT = 0;
    BEGIN TRY
        BEGIN TRANSACTION;
        SELECT @IsOwner = CONVERT(bit, CASE WHEN EXISTS (SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id=@UserId AND u.IsSystemUser=1 AND u.IsActive=1 AND u.IsDeleted=0 AND r.IsSystemRole=1 AND r.IsActive=1) THEN 1 ELSE 0 END);
        IF @IsOwner=0 AND (@Id IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.UserCompanyBranchScopes WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@UserId AND CompanyId=@Id AND BranchId IS NULL AND IsActive=1))
        BEGIN ROLLBACK TRANSACTION; IF @Id IS NULL SELECT 403 StatusCode,N'Only the System Owner can create a company.' Message; ELSE SELECT 404 StatusCode,N'Company was not found.' Message; RETURN; END;
        IF EXISTS (SELECT 1 FROM dbo.Companies WHERE Code=@Code AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN ROLLBACK TRANSACTION; SELECT 409 StatusCode,N'Company code already exists.' Message; RETURN; END;
        IF @Id IS NOT NULL AND @IsActive=0 AND EXISTS
        (
            SELECT 1 FROM dbo.Branches WHERE CompanyId=@Id AND IsDeleted=0 AND IsActive=1
            UNION ALL SELECT 1 FROM dbo.CompanyGstRegistrations WHERE CompanyId=@Id AND Status=N'Active'
            UNION ALL SELECT 1 FROM dbo.UserCompanyBranchScopes WHERE CompanyId=@Id AND IsActive=1
            UNION ALL SELECT 1 FROM dbo.SalesInvoices WHERE CompanyId=@Id AND IsDeleted=0 AND Status=1
        ) BEGIN ROLLBACK TRANSACTION; SELECT 409 StatusCode,N'Company has active branches, registrations, assignments, or draft invoices and cannot be deactivated.' Message; RETURN; END;
        IF @Id IS NULL BEGIN INSERT dbo.Companies(Code,Name,IsActive,CreatedBy) VALUES(@Code,@Name,@IsActive,@UserId); SET @SavedId=SCOPE_IDENTITY(); END
        ELSE BEGIN UPDATE dbo.Companies SET Code=@Code,Name=@Name,IsActive=@IsActive,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 BEGIN ROLLBACK TRANSACTION; SELECT 404 StatusCode,N'Company was not found.' Message; RETURN; END; SET @SavedId=@Id; END;
        COMMIT TRANSACTION; SELECT 200 StatusCode,N'Company saved.' Message; SELECT Id,Code,Name,IsActive FROM dbo.Companies WHERE Id=@SavedId;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_Save
    @Id BIGINT = NULL, @CompanyId BIGINT, @Code NVARCHAR(50), @Name NVARCHAR(250), @IsActive BIT, @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @SavedId BIGINT,@ExistingCompanyId BIGINT,@IsOwner BIT=0;
    BEGIN TRY
        BEGIN TRANSACTION;
        SELECT @IsOwner=CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id=@UserId AND u.IsSystemUser=1 AND u.IsActive=1 AND u.IsDeleted=0 AND r.IsSystemRole=1 AND r.IsActive=1) THEN 1 ELSE 0 END);
        IF @Id IS NOT NULL SELECT @ExistingCompanyId=CompanyId FROM dbo.Branches WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
        IF @Id IS NOT NULL AND @ExistingCompanyId IS NULL BEGIN ROLLBACK TRANSACTION; SELECT 404 StatusCode,N'Branch was not found.' Message; RETURN; END;
        IF @Id IS NULL AND @IsOwner=0 AND NOT EXISTS(SELECT 1 FROM dbo.UserCompanyBranchScopes WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@UserId AND CompanyId=@CompanyId AND BranchId IS NULL AND IsActive=1) BEGIN ROLLBACK TRANSACTION; SELECT 404 StatusCode,N'Company was not found.' Message; RETURN; END;
        IF @Id IS NOT NULL AND @IsOwner=0 AND NOT EXISTS(SELECT 1 FROM dbo.UserCompanyBranchScopes WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@UserId AND CompanyId=@ExistingCompanyId AND IsActive=1 AND (BranchId IS NULL OR BranchId=@Id)) BEGIN ROLLBACK TRANSACTION; SELECT 404 StatusCode,N'Branch was not found.' Message; RETURN; END;
        IF @Id IS NOT NULL AND @ExistingCompanyId<>@CompanyId BEGIN ROLLBACK TRANSACTION; SELECT 409 StatusCode,N'Branch company reassignment is not allowed.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Companies WHERE Id=@CompanyId AND IsDeleted=0 AND IsActive=1) BEGIN ROLLBACK TRANSACTION; SELECT 409 StatusCode,N'Company is not active.' Message; RETURN; END;
        IF EXISTS(SELECT 1 FROM dbo.Branches WHERE CompanyId=@CompanyId AND Code=@Code AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN ROLLBACK TRANSACTION; SELECT 409 StatusCode,N'Branch code already exists for this company.' Message; RETURN; END;
        IF @Id IS NOT NULL AND @IsActive=0 AND EXISTS
        (
            SELECT 1 FROM dbo.CompanyGstRegistrations WHERE BranchId=@Id AND Status=N'Active'
            UNION ALL SELECT 1 FROM dbo.UserCompanyBranchScopes WHERE BranchId=@Id AND IsActive=1
            UNION ALL SELECT 1 FROM dbo.SalesInvoices WHERE BranchId=@Id AND IsDeleted=0 AND Status=1
        ) BEGIN ROLLBACK TRANSACTION; SELECT 409 StatusCode,N'Branch has active registrations, assignments, or draft invoices and cannot be deactivated.' Message; RETURN; END;
        IF @Id IS NULL BEGIN INSERT dbo.Branches(CompanyId,Code,Name,IsActive,CreatedBy) VALUES(@CompanyId,@Code,@Name,@IsActive,@UserId); SET @SavedId=SCOPE_IDENTITY(); END
        ELSE BEGIN UPDATE dbo.Branches SET Code=@Code,Name=@Name,IsActive=@IsActive,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND CompanyId=@CompanyId AND IsDeleted=0; SET @SavedId=@Id; END;
        COMMIT TRANSACTION; SELECT 200 StatusCode,N'Branch saved.' Message; SELECT Id,CompanyId,Code,Name,IsActive FROM dbo.Branches WHERE Id=@SavedId;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH
END;
GO
