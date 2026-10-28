SET NOCOUNT ON;
IF DB_NAME() <> N'CosmosERP_Staging' THROW 51000, 'Run only against CosmosERP_Staging.', 1;
SELECT CASE WHEN OBJECT_ID(N'dbo.Companies') IS NOT NULL AND OBJECT_ID(N'dbo.Branches') IS NOT NULL AND OBJECT_ID(N'dbo.UserCompanyBranchScopes') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS MasterTables;
SELECT COL_LENGTH(N'dbo.SalesInvoices',N'CompanyId') AS CompanyIdColumn, COL_LENGTH(N'dbo.SalesInvoices',N'BranchId') AS BranchIdColumn;
SELECT Id FROM dbo.SalesInvoices WHERE Id IN (1,2) ORDER BY Id;
SELECT COUNT(*) AS OrphanedRegistrationCompanies FROM dbo.CompanyGstRegistrations r LEFT JOIN dbo.Companies c ON c.Id=r.CompanyId WHERE r.CompanyId IS NOT NULL AND c.Id IS NULL;
SELECT name FROM sys.triggers WHERE name IN (N'trg_Companies_AtomicAudit',N'trg_Branches_AtomicAudit',N'trg_UserCompanyBranchScopes_AtomicAudit');
SELECT Name FROM dbo.Pages WHERE Name IN (N'System.CompanyBranchScope',N'System.CompanyBranchScopeAssignments');
