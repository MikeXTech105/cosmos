/* Registers the Company/Branch administration resource only. System Owner bypasses
   page grants by design; no non-system role receives an automatic privilege. */
SET NOCOUNT ON;
GO
IF OBJECT_ID(N'dbo.Pages',N'U') IS NULL OR OBJECT_ID(N'dbo.RolePermissions',N'U') IS NULL
    THROW 51250,N'RBAC Pages and RolePermissions tables are required before registering Company/Branch scope administration.',1;
GO
IF NOT EXISTS(SELECT 1 FROM dbo.Pages WHERE Name=N'System.CompanyBranchScope')
BEGIN
    INSERT dbo.Pages(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive)
    VALUES(N'System.CompanyBranchScope',N'Company & Branch Administration',N'/settings/company-branches',N'Building2',NULL,990,1);
END;
GO
/* Deliberately no RolePermissions insert or update: grants are administrator-managed.
   The protected System Owner is authorized by sp_Permission_UserHasAccess/PermissionService. */
SELECT Id,Name,DisplayName,Route,IsActive FROM dbo.Pages WHERE Name=N'System.CompanyBranchScope';
GO
