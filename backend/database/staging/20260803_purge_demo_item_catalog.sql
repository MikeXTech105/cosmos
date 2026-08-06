/*
    COSMOS ERP - optional purge of demo item/catalog master data

    Use only after 20260803_prepare_clean_staging_database.sql has passed its
    post-cleanup checks and only when every item/catalog record is known demo data.
    This script is DRY RUN by default. It does not drop or alter database objects.

    It physically removes the demo catalog and its direct, item-specific setup:
      DispatchSkuSettings, ItemPackagingProfiles, ChannelSkuMappings,
      ChannelWarehouses, ProductBomComponents, ProcurementSettings, Items,
      Categories, Units, and SalesChannels.

    Do not run against production. Take and verify a backup before execution.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* Clear only this script's session-scoped work tables so dry runs are rerunnable. */
DROP TABLE IF EXISTS #DeletedRows;
DROP TABLE IF EXISTS #SafetyFindings;
DROP TABLE IF EXISTS #PotentialColumnReferences;
DROP TABLE IF EXISTS #InboundForeignKeyReferences;
DROP TABLE IF EXISTS #TargetCounts;
DROP TABLE IF EXISTS #TargetTables;

/* =============================================================================
   OPERATOR CONFIGURATION -- review every value before enabling execution
   ============================================================================= */
DECLARE @ExecuteCatalogPurge bit = 0;
DECLARE @ExpectedDatabaseName sysname = N'CHANGE_ME_TO_THE_VERIFIED_STAGING_COPY_NAME';
DECLARE @BackupConfirmed bit = 0;
DECLARE @CurrentDatabaseName sysname = DB_NAME();
DECLARE @ReportedAtUtc datetime2(3) = SYSUTCDATETIME();

/* =============================================================================
   EXPLICIT CATALOG SCOPE -- no other table is ever deleted by this script
   ============================================================================= */
CREATE TABLE #TargetTables
(
    SequenceNo int NOT NULL PRIMARY KEY,
    TableName sysname NOT NULL UNIQUE,
    CleanupRule nvarchar(500) NOT NULL
);

INSERT #TargetTables(SequenceNo,TableName,CleanupRule) VALUES
(10,N'DispatchSkuSettings',N'Item/channel/packaging dispatch configuration.'),
(20,N'ItemPackagingProfiles',N'Item and channel packaging profiles.'),
(30,N'ChannelSkuMappings',N'Channel SKU-to-item mappings.'),
(40,N'ChannelWarehouses',N'Channel warehouse setup.'),
(50,N'ProductBomComponents',N'Item bill-of-material component rows.'),
(60,N'ProcurementSettings',N'Item-specific procurement configuration.'),
(70,N'Items',N'Item catalog master rows and item image references.'),
(80,N'Categories',N'Item category master rows.'),
(90,N'Units',N'Item unit master rows.'),
(100,N'SalesChannels',N'Demo sales-channel master rows.');

CREATE TABLE #TargetCounts
(
    TableName sysname NOT NULL PRIMARY KEY,
    TableExists bit NOT NULL,
    RowTotal bigint NULL
);

DECLARE @TableName sysname;
DECLARE @Sql nvarchar(max);
DECLARE @RowTotal bigint;

DECLARE TargetCountCursor CURSOR LOCAL FAST_FORWARD FOR
SELECT TableName FROM #TargetTables ORDER BY SequenceNo;
OPEN TargetCountCursor;
FETCH NEXT FROM TargetCountCursor INTO @TableName;
WHILE @@FETCH_STATUS=0
BEGIN
    IF OBJECT_ID(N'dbo.'+QUOTENAME(@TableName),N'U') IS NULL
        INSERT #TargetCounts(TableName,TableExists,RowTotal) VALUES(@TableName,0,NULL);
    ELSE
    BEGIN
        SET @RowTotal=0;
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM dbo.'+QUOTENAME(@TableName)+N';';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
        INSERT #TargetCounts(TableName,TableExists,RowTotal) VALUES(@TableName,1,@RowTotal);
    END;
    FETCH NEXT FROM TargetCountCursor INTO @TableName;
END;
CLOSE TargetCountCursor;
DEALLOCATE TargetCountCursor;

/* Every populated non-target child table with an FK into this catalog blocks the purge. */
CREATE TABLE #InboundForeignKeyReferences
(
    ForeignKeyName sysname NOT NULL,
    ChildSchemaName sysname NOT NULL,
    ChildTableName sysname NOT NULL,
    ParentTableName sysname NOT NULL,
    RowTotal bigint NOT NULL,
    PRIMARY KEY(ForeignKeyName,ChildSchemaName,ChildTableName)
);

INSERT #InboundForeignKeyReferences(ForeignKeyName,ChildSchemaName,ChildTableName,ParentTableName,RowTotal)
SELECT fk.name,childSchema.name,childTable.name,parentTable.name,0
FROM sys.foreign_keys fk
JOIN sys.tables parentTable ON parentTable.object_id=fk.referenced_object_id
JOIN sys.schemas parentSchema ON parentSchema.schema_id=parentTable.schema_id
JOIN #TargetTables parentTarget ON parentTarget.TableName=parentTable.name AND parentSchema.name=N'dbo'
JOIN sys.tables childTable ON childTable.object_id=fk.parent_object_id
JOIN sys.schemas childSchema ON childSchema.schema_id=childTable.schema_id
LEFT JOIN #TargetTables childTarget ON childTarget.TableName=childTable.name AND childSchema.name=N'dbo'
WHERE childTarget.TableName IS NULL;

DECLARE @ChildSchemaName sysname;
DECLARE @ChildTableName sysname;
DECLARE @ForeignKeyName sysname;
DECLARE InboundForeignKeyCursor CURSOR LOCAL FAST_FORWARD FOR
SELECT ForeignKeyName,ChildSchemaName,ChildTableName FROM #InboundForeignKeyReferences;
OPEN InboundForeignKeyCursor;
FETCH NEXT FROM InboundForeignKeyCursor INTO @ForeignKeyName,@ChildSchemaName,@ChildTableName;
WHILE @@FETCH_STATUS=0
BEGIN
    SET @RowTotal=0;
    SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(@ChildSchemaName)+N'.'+QUOTENAME(@ChildTableName)+N';';
    EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
    UPDATE #InboundForeignKeyReferences SET RowTotal=@RowTotal
    WHERE ForeignKeyName=@ForeignKeyName AND ChildSchemaName=@ChildSchemaName AND ChildTableName=@ChildTableName;
    FETCH NEXT FROM InboundForeignKeyCursor INTO @ForeignKeyName,@ChildSchemaName,@ChildTableName;
END;
CLOSE InboundForeignKeyCursor;
DEALLOCATE InboundForeignKeyCursor;

/* Fail closed for populated tables with conventional catalog-reference columns even if an FK was omitted. */
CREATE TABLE #PotentialColumnReferences
(
    SchemaName sysname NOT NULL,
    TableName sysname NOT NULL,
    ColumnName sysname NOT NULL,
    RowTotal bigint NOT NULL,
    PRIMARY KEY(SchemaName,TableName,ColumnName)
);

INSERT #PotentialColumnReferences(SchemaName,TableName,ColumnName,RowTotal)
SELECT schemaName.name,tableName.name,columnName.name,0
FROM sys.tables tableName
JOIN sys.schemas schemaName ON schemaName.schema_id=tableName.schema_id
JOIN sys.columns columnName ON columnName.object_id=tableName.object_id
LEFT JOIN #TargetTables target ON target.TableName=tableName.name AND schemaName.name=N'dbo'
WHERE tableName.is_ms_shipped=0
  AND target.TableName IS NULL
  AND columnName.name IN
  (
      N'ItemId',N'CategoryId',N'UnitId',N'SalesChannelId',N'ChannelId',
      N'ChannelItemMappingId',N'WarehouseId',N'PackagingProfileId',N'ProcurementSettingId'
  );

DECLARE @ReferenceSchemaName sysname;
DECLARE @ReferenceTableName sysname;
DECLARE @ReferenceColumnName sysname;
DECLARE PotentialReferenceCursor CURSOR LOCAL FAST_FORWARD FOR
SELECT SchemaName,TableName,ColumnName FROM #PotentialColumnReferences;
OPEN PotentialReferenceCursor;
FETCH NEXT FROM PotentialReferenceCursor INTO @ReferenceSchemaName,@ReferenceTableName,@ReferenceColumnName;
WHILE @@FETCH_STATUS=0
BEGIN
    SET @RowTotal=0;
    SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(@ReferenceSchemaName)+N'.'+QUOTENAME(@ReferenceTableName)+N';';
    EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
    UPDATE #PotentialColumnReferences SET RowTotal=@RowTotal
    WHERE SchemaName=@ReferenceSchemaName AND TableName=@ReferenceTableName AND ColumnName=@ReferenceColumnName;
    FETCH NEXT FROM PotentialReferenceCursor INTO @ReferenceSchemaName,@ReferenceTableName,@ReferenceColumnName;
END;
CLOSE PotentialReferenceCursor;
DEALLOCATE PotentialReferenceCursor;

CREATE TABLE #SafetyFindings
(
    IsBlocking bit NOT NULL,
    CheckName nvarchar(200) NOT NULL,
    Detail nvarchar(2000) NOT NULL
);

IF @ExpectedDatabaseName=N'CHANGE_ME_TO_THE_VERIFIED_STAGING_COPY_NAME'
    INSERT #SafetyFindings VALUES(1,N'Expected database name',N'Change @ExpectedDatabaseName from the placeholder before execution.');
ELSE IF @CurrentDatabaseName<>@ExpectedDatabaseName
    INSERT #SafetyFindings VALUES(1,N'Expected database name',N'Connected database is '+QUOTENAME(@CurrentDatabaseName)+N', not '+QUOTENAME(@ExpectedDatabaseName)+N'.');
IF UPPER(@CurrentDatabaseName) LIKE N'%PROD%' OR UPPER(@CurrentDatabaseName) LIKE N'%PRODUCTION%' OR UPPER(@CurrentDatabaseName) LIKE N'%LIVE%' OR UPPER(@CurrentDatabaseName) LIKE N'%MAIN%'
    INSERT #SafetyFindings VALUES(1,N'Production-like database name',N'This catalog purge never runs against a production-like database name: '+QUOTENAME(@CurrentDatabaseName)+N'.');
IF @BackupConfirmed=0
    INSERT #SafetyFindings VALUES(1,N'Backup acknowledgement',N'Set @BackupConfirmed=1 only after taking and verifying a backup of this already-cleaned copy.');
IF @ExecuteCatalogPurge=0
    INSERT #SafetyFindings VALUES(1,N'Execution mode',N'Set @ExecuteCatalogPurge=1 only after reviewing this dry-run report.');
IF EXISTS(SELECT 1 FROM #TargetCounts WHERE TableExists=0)
    INSERT #SafetyFindings VALUES(1,N'Required catalog table missing',N'The target does not contain every expected current COSMOS catalog table.');
IF EXISTS(SELECT 1 FROM #InboundForeignKeyReferences WHERE RowTotal<>0)
    INSERT #SafetyFindings VALUES(1,N'Inbound foreign-key data',N'A populated non-target table has a foreign key into the demo catalog. Clean or review it before deleting catalog rows.');
IF EXISTS(SELECT 1 FROM #PotentialColumnReferences WHERE RowTotal<>0)
    INSERT #SafetyFindings VALUES(1,N'Potential catalog-reference data',N'A populated non-target table has an item/catalog reference column. The script will not create unverified logical orphans.');
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1)
    INSERT #SafetyFindings VALUES(1,N'Foreign-key state',N'At least one foreign key is disabled or untrusted. Repair it before the catalog purge.');
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
    INSERT #SafetyFindings VALUES(1,N'Check-constraint state',N'At least one check constraint is disabled or untrusted. Repair it before the catalog purge.');

SELECT N'CATALOG_PURGE_HEADER' ReportSection,@CurrentDatabaseName CurrentDatabaseName,@ExpectedDatabaseName ExpectedDatabaseName,
       @ExecuteCatalogPurge ExecuteCatalogPurge,@BackupConfirmed BackupConfirmed,@ReportedAtUtc ReportedAtUtc;
SELECT N'DEMO_CATALOG_TARGETS' ReportSection,target.SequenceNo,target.TableName,target.CleanupRule,counts.TableExists,counts.RowTotal
FROM #TargetTables target JOIN #TargetCounts counts ON counts.TableName=target.TableName
ORDER BY target.SequenceNo;
SELECT N'INBOUND_FOREIGN_KEY_REFERENCES' ReportSection,ForeignKeyName,QUOTENAME(ChildSchemaName)+N'.'+QUOTENAME(ChildTableName) ChildTable,
       N'[dbo].'+QUOTENAME(ParentTableName) ParentTable,RowTotal
FROM #InboundForeignKeyReferences ORDER BY ChildTable,ForeignKeyName;
SELECT N'POTENTIAL_CATALOG_REFERENCE_TABLES' ReportSection,QUOTENAME(SchemaName)+N'.'+QUOTENAME(TableName) TableName,ColumnName,RowTotal
FROM #PotentialColumnReferences ORDER BY TableName,ColumnName;
SELECT N'ITEM_IMAGE_REFERENCE_NOTICE' ReportSection,N'dbo.Items.ImageUrl' ReferenceColumn,
       N'Catalog rows are deleted; remove only the corresponding demo image files after post-purge verification and storage backup.' Detail;
SELECT N'SAFETY_FINDINGS' ReportSection,IsBlocking,CheckName,Detail FROM #SafetyFindings ORDER BY IsBlocking DESC,CheckName;

IF @ExecuteCatalogPurge=0
BEGIN
    SELECT N'DRY_RUN' OverallResult,N'No DELETE, DBCC, or transaction statement was executed. Resolve every blocking finding before setting @ExecuteCatalogPurge=1.' Detail;
    RETURN;
END;

IF EXISTS(SELECT 1 FROM #SafetyFindings WHERE IsBlocking=1)
    THROW 53010,N'Demo catalog purge blocked by pre-cleanup safety findings. No data was changed.',1;

CREATE TABLE #DeletedRows
(
    SequenceNo int NOT NULL PRIMARY KEY,
    TableName sysname NOT NULL,
    DeletedRows bigint NOT NULL
);

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @SequenceNo int;
    DECLARE @DeletedRows bigint;
    DECLARE DeleteCursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT SequenceNo,TableName FROM #TargetTables ORDER BY SequenceNo;
    OPEN DeleteCursor;
    FETCH NEXT FROM DeleteCursor INTO @SequenceNo,@TableName;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SET @DeletedRows=0;
        SET @Sql=N'DELETE FROM dbo.'+QUOTENAME(@TableName)+N'; SELECT @DeletedRowsOut=CONVERT(bigint,@@ROWCOUNT);';
        EXEC sys.sp_executesql @Sql,N'@DeletedRowsOut bigint OUTPUT',@DeletedRowsOut=@DeletedRows OUTPUT;
        INSERT #DeletedRows(SequenceNo,TableName,DeletedRows) VALUES(@SequenceNo,@TableName,@DeletedRows);
        FETCH NEXT FROM DeleteCursor INTO @SequenceNo,@TableName;
    END;
    CLOSE DeleteCursor;
    DEALLOCATE DeleteCursor;

    DECLARE @IdentityTableName sysname;
    DECLARE @IdentitySeed decimal(38,0);
    DECLARE @IdentityIncrement decimal(38,0);
    DECLARE @IdentityReseed decimal(38,0);
    DECLARE IdentityCursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT target.TableName,CONVERT(decimal(38,0),identityColumn.seed_value),CONVERT(decimal(38,0),identityColumn.increment_value)
    FROM #TargetTables target
    JOIN sys.identity_columns identityColumn ON identityColumn.object_id=OBJECT_ID(N'dbo.'+QUOTENAME(target.TableName));
    OPEN IdentityCursor;
    FETCH NEXT FROM IdentityCursor INTO @IdentityTableName,@IdentitySeed,@IdentityIncrement;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SET @IdentityReseed=@IdentitySeed-@IdentityIncrement;
        SET @Sql=N'DBCC CHECKIDENT ('+QUOTENAME(N'dbo.'+@IdentityTableName,N'''')+N', RESEED, '+CONVERT(nvarchar(50),@IdentityReseed)+N') WITH NO_INFOMSGS;';
        EXEC sys.sp_executesql @Sql;
        FETCH NEXT FROM IdentityCursor INTO @IdentityTableName,@IdentitySeed,@IdentityIncrement;
    END;
    CLOSE IdentityCursor;
    DEALLOCATE IdentityCursor;

    DECLARE PostPurgeCountCursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT TableName FROM #TargetTables ORDER BY SequenceNo;
    OPEN PostPurgeCountCursor;
    FETCH NEXT FROM PostPurgeCountCursor INTO @TableName;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SET @RowTotal=0;
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM dbo.'+QUOTENAME(@TableName)+N';';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
        IF @RowTotal<>0
            THROW 53011,N'Post-purge validation failed: a target catalog table still has rows. The transaction will roll back.',1;
        UPDATE #TargetCounts SET RowTotal=@RowTotal WHERE TableName=@TableName;
        FETCH NEXT FROM PostPurgeCountCursor INTO @TableName;
    END;
    CLOSE PostPurgeCountCursor;
    DEALLOCATE PostPurgeCountCursor;

    COMMIT TRANSACTION;

    SELECT N'CATALOG_PURGE_DELETED_ROWS' ReportSection,SequenceNo,TableName,DeletedRows FROM #DeletedRows ORDER BY SequenceNo;
    SELECT N'CATALOG_PURGE_POST_COUNTS' ReportSection,target.SequenceNo,target.TableName,counts.RowTotal
    FROM #TargetTables target JOIN #TargetCounts counts ON counts.TableName=target.TableName ORDER BY target.SequenceNo;
    SELECT N'PASS' OverallResult,N'Demo item/catalog data was removed. Run 20260803_verify_clean_staging_database.sql again before approving staging.' Detail;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
