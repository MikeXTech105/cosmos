/*
  Read-only Phase 3 preflight for the owner-designated development database.
  Run this in SSMS while connected through an environment-injected credential.
  It changes no data or schema and refuses to inspect an unintended database.
*/
SET NOCOUNT ON;
GO

IF DB_NAME() <> N'CosmosERP_Staging'
    THROW 51300, N'Refusing Phase 3 preflight: current database is not CosmosERP_Staging.', 1;
GO

SELECT
    CAST(SERVERPROPERTY(N'ServerName') AS nvarchar(256)) AS ServerName,
    CAST(SERVERPROPERTY(N'MachineName') AS nvarchar(256)) AS MachineName,
    CAST(SERVERPROPERTY(N'Edition') AS nvarchar(256)) AS Edition,
    DB_NAME() AS DatabaseName,
    SUSER_SNAME() AS LoginName,
    ORIGINAL_LOGIN() AS OriginalLoginName,
    USER_NAME() AS DatabaseUser,
    DATABASEPROPERTYEX(DB_NAME(), N'Recovery') AS RecoveryModel,
    HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'CONNECT') AS HasConnect,
    HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'SELECT') AS HasSelect,
    HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'ALTER') AS HasAlter,
    HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'CONTROL') AS HasControl;

SELECT c.name, c.system_type_id, c.max_length, c.is_nullable
FROM sys.columns AS c
WHERE c.object_id = OBJECT_ID(N'dbo.SalesInvoices')
  AND c.name IN (N'CompanyGstRegistrationId', N'PlaceOfSupplyStateCode', N'PlaceOfSupplySource', N'PriceBasis')
ORDER BY c.name;

SELECT fk.name, OBJECT_SCHEMA_NAME(fk.parent_object_id) AS ParentSchema,
       OBJECT_NAME(fk.parent_object_id) AS ParentTable,
       OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS ReferencedSchema,
       OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
       fk.is_disabled, fk.is_not_trusted
FROM sys.foreign_keys AS fk
WHERE fk.name = N'FK_SalesInvoices_CompanyGstRegistrations';

SELECT i.name, i.is_unique, i.has_filter, i.filter_definition
FROM sys.indexes AS i
WHERE i.object_id = OBJECT_ID(N'dbo.SalesInvoices')
  AND i.name = N'IX_SalesInvoices_CompanyGstRegistrationId';

SELECT cc.name, cc.definition, cc.is_disabled, cc.is_not_trusted
FROM sys.check_constraints AS cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.SalesInvoices')
  AND cc.name = N'CK_SalesInvoices_PriceBasis';

SELECT p.name,
       CONVERT(varchar(64), HASHBYTES(N'SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) AS DefinitionSha256
FROM sys.procedures AS p
JOIN sys.sql_modules AS sm ON sm.object_id = p.object_id
WHERE SCHEMA_NAME(p.schema_id) = N'dbo'
  AND p.name IN (N'sp_SalesInvoice_Create', N'sp_SalesInvoice_Update', N'sp_SalesInvoice_GetById')
ORDER BY p.name;

SELECT
    COUNT_BIG(*) AS InvoicesWithInvalidIssuerReference
FROM dbo.SalesInvoices AS si
LEFT JOIN dbo.CompanyGstRegistrations AS r ON r.Id = si.CompanyGstRegistrationId
WHERE si.CompanyGstRegistrationId IS NOT NULL
  AND r.Id IS NULL;

SELECT
    COUNT_BIG(*) AS InvoicesWithIncoherentGstCaptureFields
FROM dbo.SalesInvoices AS si
WHERE (si.PlaceOfSupplyStateCode IS NULL AND si.PlaceOfSupplySource IS NOT NULL)
   OR (si.PlaceOfSupplyStateCode IS NOT NULL AND si.PlaceOfSupplySource IS NULL)
   OR (si.PriceBasis IS NOT NULL AND si.PriceBasis NOT IN (0, 1));

IF HAS_PERMS_BY_NAME(N'msdb', N'DATABASE', N'SELECT') = 1
BEGIN
    SELECT TOP (5)
        bs.database_name,
        bs.backup_finish_date,
        bs.type AS BackupType,
        bs.is_copy_only,
        bs.recovery_model,
        bs.server_name
    FROM msdb.dbo.backupset AS bs
    WHERE bs.database_name = DB_NAME()
    ORDER BY bs.backup_finish_date DESC;
END
ELSE
    SELECT CAST(N'Not authorized to read msdb backup history; obtain backup/recovery evidence from the DBA before changes.' AS nvarchar(200)) AS BackupReadiness;
GO
