SET NOCOUNT ON;
IF DB_NAME() <> N'CosmosERP_Staging' THROW 51000, 'Run only against CosmosERP_Staging.', 1;
SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;
SELECT Id, Code, Name, IsActive, IsDeleted FROM dbo.Companies ORDER BY Id;
IF OBJECT_ID(N'dbo.CompanyGstRegistrations') IS NOT NULL
BEGIN
 SELECT r.Id AS RegistrationId, r.CompanyId, r.BranchId,
        CASE WHEN c.Id IS NULL THEN N'MISSING_CANONICAL_COMPANY' ELSE N'MATCHED' END AS CompanyMatch
 FROM dbo.CompanyGstRegistrations r LEFT JOIN dbo.Companies c ON c.Id=r.CompanyId
 ORDER BY r.Id;
 SELECT r.CompanyId, COUNT(*) AS RegistrationCount
 FROM dbo.CompanyGstRegistrations r LEFT JOIN dbo.Companies c ON c.Id=r.CompanyId
 WHERE r.CompanyId IS NOT NULL AND c.Id IS NULL GROUP BY r.CompanyId;
END;
SELECT OBJECT_ID(N'dbo.Companies') AS CompaniesObject, OBJECT_ID(N'dbo.Branches') AS BranchesObject,
       OBJECT_ID(N'dbo.UserCompanyBranchScopes') AS ScopesObject,
       COL_LENGTH(N'dbo.SalesInvoices',N'CompanyId') AS SalesCompanyColumn,
       COL_LENGTH(N'dbo.SalesInvoices',N'BranchId') AS SalesBranchColumn;
SELECT Id FROM dbo.SalesInvoices WHERE Id IN (1,2) ORDER BY Id;
SELECT fk.name, OBJECT_NAME(fk.parent_object_id) AS ParentTable, OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable
FROM sys.foreign_keys fk WHERE fk.parent_object_id IN (OBJECT_ID(N'dbo.SalesInvoices'),OBJECT_ID(N'dbo.CompanyGstRegistrations'));
SELECT name FROM sys.indexes WHERE object_id IN (OBJECT_ID(N'dbo.Companies'),OBJECT_ID(N'dbo.Branches'),OBJECT_ID(N'dbo.UserCompanyBranchScopes'),OBJECT_ID(N'dbo.SalesInvoices'));
SELECT name FROM sys.procedures WHERE name IN (N'sp_SalesInvoice_Create',N'sp_SalesInvoice_Update',N'sp_Company_Save',N'sp_Branch_Save');
SELECT name FROM sys.triggers WHERE parent_id IN (OBJECT_ID(N'dbo.Companies'),OBJECT_ID(N'dbo.Branches'),OBJECT_ID(N'dbo.UserCompanyBranchScopes'));
