/* Phase 4 Increment 1A.5: master writes and mandatory audit rows share one SQL transaction. */
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

/* Older disposable baselines may predate the shared activity-audit enrichment. */
IF COL_LENGTH(N'dbo.AuditLogs',N'Module') IS NULL ALTER TABLE dbo.AuditLogs ADD Module NVARCHAR(64) NULL;
IF COL_LENGTH(N'dbo.AuditLogs',N'EntityType') IS NULL ALTER TABLE dbo.AuditLogs ADD EntityType NVARCHAR(128) NULL;
IF COL_LENGTH(N'dbo.AuditLogs',N'EntityDisplayValue') IS NULL ALTER TABLE dbo.AuditLogs ADD EntityDisplayValue NVARCHAR(256) NULL;
IF COL_LENGTH(N'dbo.AuditLogs',N'Description') IS NULL ALTER TABLE dbo.AuditLogs ADD Description NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.AuditLogs',N'ChangedFieldsJson') IS NULL ALTER TABLE dbo.AuditLogs ADD ChangedFieldsJson NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.AuditLogs',N'Source') IS NULL ALTER TABLE dbo.AuditLogs ADD Source NVARCHAR(32) NULL;
GO

CREATE OR ALTER TRIGGER dbo.trg_Companies_AtomicAudit ON dbo.Companies
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.AuditLogs(TableName,RecordId,ActionType,OldValues,NewValues,CreatedBy,Module,EntityType,EntityDisplayValue,Description,ChangedFieldsJson,Source)
    SELECT N'Companies',CONVERT(NVARCHAR(100),i.Id),
           CASE WHEN d.Id IS NULL THEN N'Create' WHEN d.IsActive<>i.IsActive THEN CASE WHEN i.IsActive=1 THEN N'Activate' ELSE N'Deactivate' END ELSE N'Update' END,
           CASE WHEN d.Id IS NULL THEN NULL ELSE (SELECT d.Id,d.Code,d.Name,d.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) END,
           (SELECT i.Id,i.Code,i.Name,i.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),
           COALESCE(i.UpdatedBy,i.CreatedBy),N'Masters',N'Companies',i.Code,
           N'Company master change',CASE WHEN d.Id IS NULL THEN N'["Id","Code","Name","IsActive"]' ELSE N'["Code","Name","IsActive"]' END,N'Application'
    FROM inserted i LEFT JOIN deleted d ON d.Id=i.Id
    WHERE d.Id IS NULL OR d.Code<>i.Code OR d.Name<>i.Name OR d.IsActive<>i.IsActive;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_Branches_AtomicAudit ON dbo.Branches
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.AuditLogs(TableName,RecordId,ActionType,OldValues,NewValues,CreatedBy,Module,EntityType,EntityDisplayValue,Description,ChangedFieldsJson,Source)
    SELECT N'Branches',CONVERT(NVARCHAR(100),i.Id),
           CASE WHEN d.Id IS NULL THEN N'Create' WHEN d.IsActive<>i.IsActive THEN CASE WHEN i.IsActive=1 THEN N'Activate' ELSE N'Deactivate' END ELSE N'Update' END,
           CASE WHEN d.Id IS NULL THEN NULL ELSE (SELECT d.Id,d.CompanyId,d.Code,d.Name,d.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) END,
           (SELECT i.Id,i.CompanyId,i.Code,i.Name,i.IsActive FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),
           COALESCE(i.UpdatedBy,i.CreatedBy),N'Masters',N'Branches',i.Code,
           N'Branch master change',CASE WHEN d.Id IS NULL THEN N'["Id","CompanyId","Code","Name","IsActive"]' ELSE N'["Code","Name","IsActive"]' END,N'Application'
    FROM inserted i LEFT JOIN deleted d ON d.Id=i.Id
    WHERE d.Id IS NULL OR d.CompanyId<>i.CompanyId OR d.Code<>i.Code OR d.Name<>i.Name OR d.IsActive<>i.IsActive;
END;
GO
