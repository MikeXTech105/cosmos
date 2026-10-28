SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
IF NOT EXISTS(SELECT 1 FROM dbo.Pages WHERE Name=N'System.CompanyBranchScopeAssignments')
 INSERT dbo.Pages(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(N'System.CompanyBranchScopeAssignments',N'Company & Branch Access Assignments',N'/settings/company-branch-assignments',N'UserCog',991,1);
GO
CREATE OR ALTER PROCEDURE dbo.sp_UserCompanyBranchScope_GetByUser @UserId INT AS
BEGIN SET NOCOUNT ON; SELECT Id,UserId,CompanyId,BranchId,IsActive,CreatedAtUtc,UpdatedAtUtc FROM dbo.UserCompanyBranchScopes WHERE UserId=@UserId ORDER BY CompanyId,BranchId,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_UserCompanyBranchScope_GetEffective @UserId INT AS
BEGIN SET NOCOUNT ON; SELECT CompanyId,BranchId FROM dbo.UserCompanyBranchScopes WHERE UserId=@UserId AND IsActive=1 ORDER BY CompanyId,BranchId; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_UserCompanyBranchScope_Grant @ActorUserId INT,@TargetUserId INT,@CompanyId BIGINT,@BranchId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @Id BIGINT,@Owner BIT=0;
 BEGIN TRY BEGIN TRAN;
 SELECT @Owner=CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id=@ActorUserId AND u.IsSystemUser=1 AND u.IsActive=1 AND u.IsDeleted=0 AND r.IsSystemRole=1 AND r.IsActive=1) THEN 1 ELSE 0 END);
 IF @ActorUserId=@TargetUserId AND @Owner=0 BEGIN ROLLBACK;SELECT 403 StatusCode,N'Self-assignment is not allowed.' Message;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@TargetUserId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK;SELECT 404 StatusCode,N'User was not found.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id=@TargetUserId AND u.IsSystemUser=1 AND r.IsSystemRole=1) BEGIN ROLLBACK;SELECT 404 StatusCode,N'User was not found.' Message;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Companies WHERE Id=@CompanyId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Company is not active.' Message;RETURN;END;
 IF @BranchId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Branches WHERE Id=@BranchId AND CompanyId=@CompanyId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Branch is not active for the company.' Message;RETURN;END;
 IF @Owner=0 AND NOT EXISTS(SELECT 1 FROM dbo.UserCompanyBranchScopes WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorUserId AND CompanyId=@CompanyId AND BranchId IS NULL AND IsActive=1) BEGIN ROLLBACK;SELECT 404 StatusCode,N'Company was not found.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.UserCompanyBranchScopes WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@TargetUserId AND CompanyId=@CompanyId AND ((BranchId=@BranchId) OR (BranchId IS NULL AND @BranchId IS NULL)) AND IsActive=1) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Active assignment already exists.' Message;RETURN;END;
 INSERT dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId,CreatedBy) VALUES(@TargetUserId,@CompanyId,@BranchId,@ActorUserId);SET @Id=SCOPE_IDENTITY();COMMIT;SELECT 200 StatusCode,N'Assignment granted.' Message;SELECT Id,UserId,CompanyId,BranchId,IsActive,CreatedAtUtc,UpdatedAtUtc FROM dbo.UserCompanyBranchScopes WHERE Id=@Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_UserCompanyBranchScope_Revoke @ActorUserId INT,@AssignmentId BIGINT AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;DECLARE @CompanyId BIGINT,@Owner BIT=0;
 BEGIN TRY BEGIN TRAN;SELECT @CompanyId=CompanyId FROM dbo.UserCompanyBranchScopes WITH(UPDLOCK,HOLDLOCK) WHERE Id=@AssignmentId AND IsActive=1;IF @CompanyId IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Assignment was not found.' Message;RETURN;END;
 SELECT @Owner=CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id=@ActorUserId AND u.IsSystemUser=1 AND r.IsSystemRole=1) THEN 1 ELSE 0 END);
 IF @Owner=0 AND NOT EXISTS(SELECT 1 FROM dbo.UserCompanyBranchScopes WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorUserId AND CompanyId=@CompanyId AND BranchId IS NULL AND IsActive=1) BEGIN ROLLBACK;SELECT 404 StatusCode,N'Assignment was not found.' Message;RETURN;END;
 UPDATE dbo.UserCompanyBranchScopes SET IsActive=0,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@ActorUserId WHERE Id=@AssignmentId;COMMIT;SELECT 200 StatusCode,N'Assignment revoked.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_UserCompanyBranchScopes_AtomicAudit ON dbo.UserCompanyBranchScopes AFTER INSERT,UPDATE AS
BEGIN SET NOCOUNT ON;
 INSERT dbo.AuditLogs(TableName,RecordId,ActionType,OldValues,NewValues,CreatedBy,Module,EntityType,EntityDisplayValue,Description,ChangedFieldsJson,Source)
 SELECT N'UserCompanyBranchScopes',CONVERT(NVARCHAR(100),i.Id),CASE WHEN d.Id IS NULL THEN N'Grant' ELSE N'Revoke' END,CASE WHEN d.Id IS NULL THEN NULL ELSE (SELECT d.UserId,d.CompanyId,d.BranchId,d.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) END,(SELECT i.UserId,i.CompanyId,i.BranchId,i.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),COALESCE(i.UpdatedBy,i.CreatedBy),N'Security',N'UserCompanyBranchScope',CONCAT(i.UserId,N':',i.CompanyId,N':',COALESCE(CONVERT(NVARCHAR(20),i.BranchId),N'company')),N'Organizational scope assignment change',N'["UserId","CompanyId","BranchId","IsActive"]',N'Application'
 FROM inserted i LEFT JOIN deleted d ON d.Id=i.Id WHERE d.Id IS NULL OR d.IsActive<>i.IsActive;
END;
GO
