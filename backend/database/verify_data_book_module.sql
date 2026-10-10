/* Read-only structural and data-integrity verification for the Data Book module. */
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.DataBookEntries', N'U') IS NULL OR OBJECT_ID(N'dbo.DataBookEntryHistory', N'U') IS NULL
    THROW 52300, N'Data Book table verification failed.', 1;

DECLARE @RequiredEntryColumns TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @RequiredEntryColumns(Name) VALUES
    (N'Id'),(N'Name'),(N'Value'),(N'Description'),(N'Category'),(N'IsPrivate'),(N'OwnerUserId'),(N'CreatedBy'),
    (N'CreatedAtUtc'),(N'UpdatedBy'),(N'UpdatedAtUtc'),(N'DeletedBy'),(N'DeletedAtUtc'),(N'IsDeleted'),(N'RowVersion');
IF EXISTS (SELECT 1 FROM @RequiredEntryColumns c WHERE COL_LENGTH(N'dbo.DataBookEntries',c.Name) IS NULL)
    THROW 52301, N'Data Book entry column verification failed.', 1;

DECLARE @RequiredHistoryColumns TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @RequiredHistoryColumns(Name) VALUES
    (N'Id'),(N'DataBookEntryId'),(N'ActionType'),(N'ChangedByUserId'),(N'ChangedAtUtc'),(N'OldDataJson'),(N'NewDataJson'),(N'ChangedFieldsJson'),(N'CorrelationId');
IF EXISTS (SELECT 1 FROM @RequiredHistoryColumns c WHERE COL_LENGTH(N'dbo.DataBookEntryHistory',c.Name) IS NULL)
    THROW 52302, N'Data Book history column verification failed.', 1;

DECLARE @RequiredForeignKeys TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @RequiredForeignKeys(Name) VALUES
    (N'FK_DataBookEntries_OwnerUser'),(N'FK_DataBookEntries_CreatedBy'),(N'FK_DataBookEntries_UpdatedBy'),(N'FK_DataBookEntries_DeletedBy'),
    (N'FK_DataBookEntryHistory_Entry'),(N'FK_DataBookEntryHistory_ChangedBy');
IF EXISTS (SELECT 1 FROM @RequiredForeignKeys x WHERE NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk WHERE fk.name=x.Name))
    THROW 52303, N'Data Book foreign-key verification failed.', 1;

DECLARE @RequiredIndexes TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @RequiredIndexes(Name) VALUES
    (N'IX_DataBookEntries_PublicActive'),(N'IX_DataBookEntries_OwnerPrivateActive'),(N'IX_DataBookEntries_ActorFilters'),(N'IX_DataBookEntryHistory_EntryChangedAtUtc');
IF EXISTS (SELECT 1 FROM @RequiredIndexes x WHERE NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name=x.Name))
    THROW 52304, N'Data Book index verification failed.', 1;

DECLARE @RequiredProcedures TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @RequiredProcedures(Name) VALUES
    (N'usp_DataBookEntry_Create'),(N'usp_DataBookEntry_GetList'),(N'usp_DataBookEntry_GetById'),(N'usp_DataBookEntry_Update'),
    (N'usp_DataBookEntry_Delete'),(N'usp_DataBookEntry_GetHistory'),(N'usp_DataBookEntry_Export');
IF EXISTS (SELECT 1 FROM @RequiredProcedures x WHERE OBJECT_ID(N'dbo.'+x.Name,N'P') IS NULL)
    THROW 52305, N'Data Book stored-procedure verification failed.', 1;

IF OBJECT_ID(N'dbo.TR_DataBookEntryHistory_AppendOnly',N'TR') IS NULL
    THROW 52306, N'Data Book append-only history trigger is missing.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.DataBookEntries') AND name=N'RowVersion' AND system_type_id=189)
    THROW 52307, N'Data Book RowVersion verification failed.', 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.DataBookEntries') AND name=N'CK_DataBookEntries_DeleteAudit')
    THROW 52308, N'Data Book soft-delete audit constraint is missing.', 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.DataBookEntryHistory') AND name=N'CK_DataBookEntryHistory_ActionType')
    THROW 52309, N'Data Book history action constraint is missing.', 1;

IF (SELECT COUNT(*) FROM dbo.Pages WHERE Name=N'DataBook.Entries')<>1
    THROW 52310, N'Data Book page seed verification failed.', 1;
IF EXISTS (SELECT 1 FROM dbo.RolePermissions rp JOIN dbo.Pages p ON p.Id=rp.PageId WHERE p.Name=N'DataBook.Entries' GROUP BY rp.RoleId,rp.PageId HAVING COUNT(*)>1)
    THROW 52311, N'Data Book permission seed contains duplicates.', 1;
IF EXISTS (SELECT 1 FROM dbo.Roles r WHERE r.Name=N'SuperAdmin')
   AND NOT EXISTS
       (SELECT 1 FROM dbo.RolePermissions rp JOIN dbo.Roles r ON r.Id=rp.RoleId JOIN dbo.Pages p ON p.Id=rp.PageId
        WHERE r.Name=N'SuperAdmin' AND p.Name=N'DataBook.Entries' AND rp.CanView=1 AND rp.CanCreate=1 AND rp.CanEdit=1 AND rp.CanDelete=1 AND rp.CanExport=1)
    THROW 52312, N'Data Book SuperAdmin permission seed verification failed.', 1;

IF EXISTS (SELECT 1 FROM dbo.DataBookEntries e LEFT JOIN dbo.Users u ON u.Id=e.OwnerUserId WHERE u.Id IS NULL OR (e.IsPrivate=1 AND e.OwnerUserId IS NULL))
    THROW 52313, N'Data Book owner integrity verification failed.', 1;
IF EXISTS (SELECT 1 FROM dbo.DataBookEntries WHERE IsDeleted=1 AND (DeletedBy IS NULL OR DeletedAtUtc IS NULL))
    THROW 52314, N'Data Book deleted-entry audit verification failed.', 1;
IF EXISTS
(
    SELECT 1
    FROM dbo.DataBookEntryHistory h
    LEFT JOIN dbo.DataBookEntries e ON e.Id=h.DataBookEntryId
    LEFT JOIN dbo.Users u ON u.Id=h.ChangedByUserId
    WHERE e.Id IS NULL OR u.Id IS NULL OR ISJSON(h.ChangedFieldsJson)<>1
)
    THROW 52315, N'Data Book history reference verification failed.', 1;

SELECT
    DB_NAME() AS CurrentDatabaseName,
    COUNT_BIG(*) AS EntryCount,
    SUM(CASE WHEN IsDeleted=0 AND IsPrivate=0 THEN 1 ELSE 0 END) AS ActivePublicEntryCount,
    SUM(CASE WHEN IsDeleted=0 AND IsPrivate=1 THEN 1 ELSE 0 END) AS ActivePrivateEntryCount,
    (SELECT COUNT_BIG(*) FROM dbo.DataBookEntryHistory) AS HistoryCount,
    SYSUTCDATETIME() AS VerifiedAtUtc
FROM dbo.DataBookEntries;
