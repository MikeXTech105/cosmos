SET XACT_ABORT ON;
IF DB_NAME() <> N'CosmosERP_Staging' THROW 51000, 'Run only against CosmosERP_Staging.', 1;
-- STOP: Legal Company ownership cannot be inferred from historical GST registration IDs.
-- Export the rows below, obtain written mapping approval, then implement a separately approved forward-only mapping migration.
SELECT r.Id AS RegistrationId, r.CompanyId AS UnresolvedCompanyId, r.BranchId
FROM dbo.CompanyGstRegistrations r LEFT JOIN dbo.Companies c ON c.Id=r.CompanyId
WHERE r.CompanyId IS NOT NULL AND c.Id IS NULL ORDER BY r.Id;
THROW 51001, 'No automatic remediation: approve a legal Company mapping before changing GST registrations.', 1;
