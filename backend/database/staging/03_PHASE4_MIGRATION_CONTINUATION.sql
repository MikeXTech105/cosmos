/* SSMS continuation controller. Run 01 first. Do not rerun migration 30 while its partial state or unresolved GST Company mapping exists. */
IF DB_NAME() <> N'CosmosERP_Staging' THROW 51000, 'Run only against CosmosERP_Staging.', 1;
IF EXISTS (SELECT 1 FROM dbo.CompanyGstRegistrations r LEFT JOIN dbo.Companies c ON c.Id=r.CompanyId WHERE r.CompanyId IS NOT NULL AND c.Id IS NULL)
 THROW 51001, 'STOP: unresolved CompanyGstRegistrations mapping.', 1;
PRINT 'After approved mapping remediation and a reviewed forward-only repair of migration 30, execute migrations 31,32,33,34,35,36 individually in filename order and capture each SSMS result.';
