/*
  READ-ONLY ONLY: COSMOS Dispatch staging schema preflight.
  Intended server/database: srv1791248 / CosmosERP_Staging.
  This script contains SELECT statements only. It does not execute Dispatch procedures.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'CosmosERP_Staging'
    THROW 52100, N'Refusing to inspect a database other than CosmosERP_Staging.', 1;
IF @@SERVERNAME <> N'srv1791248'
    THROW 52101, N'Refusing to inspect a server other than srv1791248.', 1;

DECLARE @Prefix NVARCHAR(50)=N'DSPSTG20261014';
DECLARE @Expected TABLE (TableName SYSNAME NOT NULL PRIMARY KEY);
INSERT @Expected(TableName) VALUES
(N'Categories'),(N'Units'),(N'Items'),(N'SalesChannels'),(N'ChannelWarehouses'),
(N'ChannelSkuMappings'),(N'ItemPackagingProfiles'),(N'DispatchSkuSettings'),
(N'SupplyChainImportBatches'),(N'DispatchImportStagedRows'),
(N'DispatchWarehouseSalesSnapshots'),(N'DispatchWarehouseStockSnapshots'),
(N'DispatchWarehouseInboundSnapshots'),(N'DispatchPlanningRuns'),
(N'DispatchRecommendationResults'),(N'DispatchCompanyStockSnapshots'),(N'DispatchAllocations');

SELECT @@SERVERNAME AS ServerName, SERVERPROPERTY('MachineName') AS MachineName,
       DB_NAME() AS DatabaseName, DATABASEPROPERTYEX(DB_NAME(), 'Status') AS DatabaseState,
       SUSER_SNAME() AS LoginName, @Prefix AS ProposedPrefix;

/* Missing objects are reported explicitly. */
SELECT e.TableName, CASE WHEN t.object_id IS NULL THEN N'MISSING' ELSE N'PRESENT' END AS Presence
FROM @Expected e LEFT JOIN sys.tables t ON t.name=e.TableName AND SCHEMA_NAME(t.schema_id)=N'dbo'
ORDER BY e.TableName;
SELECT p.ProcedureName, CASE WHEN o.object_id IS NULL THEN N'MISSING' ELSE N'PRESENT' END AS Presence
FROM (VALUES(N'usp_DispatchPlanning_Import_Validate'),(N'usp_DispatchPlanning_Import_Commit')) p(ProcedureName)
LEFT JOIN sys.objects o ON o.name=p.ProcedureName AND SCHEMA_NAME(o.schema_id)=N'dbo' AND o.type IN(N'P',N'PC');

/* Columns, SQL types, nullability, identity/default/computed metadata. */
SELECT t.name AS TableName,c.column_id AS Ordinal,c.name AS ColumnName,
       ty.name + CASE WHEN ty.name IN(N'nvarchar',N'varchar',N'char',N'nchar',N'binary',N'varbinary') THEN N'(' + CASE WHEN c.max_length=-1 THEN N'MAX' WHEN ty.name LIKE N'n%' THEN CONVERT(NVARCHAR(10),c.max_length/2) ELSE CONVERT(NVARCHAR(10),c.max_length) END + N')'
                    WHEN ty.name IN(N'decimal',N'numeric') THEN N'('+CONVERT(NVARCHAR(10),c.precision)+N','+CONVERT(NVARCHAR(10),c.scale)+N')' ELSE N'' END AS SqlType,
       c.is_nullable,c.is_identity,ic.seed_value,ic.increment_value,dc.definition AS DefaultDefinition,
       cc.definition AS ComputedDefinition
FROM @Expected e JOIN sys.tables t ON t.name=e.TableName AND SCHEMA_NAME(t.schema_id)=N'dbo'
JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
LEFT JOIN sys.identity_columns ic ON ic.object_id=c.object_id AND ic.column_id=c.column_id
LEFT JOIN sys.default_constraints dc ON dc.parent_object_id=c.object_id AND dc.parent_column_id=c.column_id
LEFT JOIN sys.computed_columns cc ON cc.object_id=c.object_id AND cc.column_id=c.column_id
ORDER BY t.name,c.column_id;

/* Primary keys, unique constraints/indexes, foreign keys, and triggers. */
SELECT t.name AS TableName,kc.name AS ConstraintName,kc.type_desc,STRING_AGG(c.name,N', ') WITHIN GROUP(ORDER BY ic.key_ordinal) AS Columns
FROM @Expected e JOIN sys.tables t ON t.name=e.TableName AND SCHEMA_NAME(t.schema_id)=N'dbo'
JOIN sys.key_constraints kc ON kc.parent_object_id=t.object_id JOIN sys.index_columns ic ON ic.object_id=t.object_id AND ic.index_id=kc.unique_index_id
JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id
GROUP BY t.name,kc.name,kc.type_desc ORDER BY t.name,kc.type_desc,kc.name;
SELECT t.name AS TableName,i.name AS IndexName,i.type_desc,i.is_unique,i.has_filter,i.filter_definition,STRING_AGG(c.name,N', ') WITHIN GROUP(ORDER BY ic.key_ordinal) AS KeyColumns
FROM @Expected e JOIN sys.tables t ON t.name=e.TableName AND SCHEMA_NAME(t.schema_id)=N'dbo'
JOIN sys.indexes i ON i.object_id=t.object_id AND i.is_primary_key=0 AND i.is_unique_constraint=0
JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0
JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id
GROUP BY t.name,i.name,i.type_desc,i.is_unique,i.has_filter,i.filter_definition ORDER BY t.name,i.name;
SELECT pt.name AS ParentTable,fk.name AS ForeignKeyName,pc.name AS ParentColumn,rt.name AS ReferencedTable,rc.name AS ReferencedColumn,fk.delete_referential_action_desc,fk.update_referential_action_desc
FROM @Expected e JOIN sys.tables pt ON pt.name=e.TableName AND SCHEMA_NAME(pt.schema_id)=N'dbo'
JOIN sys.foreign_keys fk ON fk.parent_object_id=pt.object_id JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
JOIN sys.columns pc ON pc.object_id=fkc.parent_object_id AND pc.column_id=fkc.parent_column_id
JOIN sys.tables rt ON rt.object_id=fkc.referenced_object_id JOIN sys.columns rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id
ORDER BY pt.name,fk.name,fkc.constraint_column_id;
SELECT OBJECT_SCHEMA_NAME(tr.parent_id)+N'.'+OBJECT_NAME(tr.parent_id) AS TableName,tr.name AS TriggerName,tr.is_disabled,OBJECT_DEFINITION(tr.object_id) AS TriggerDefinition
FROM sys.triggers tr JOIN @Expected e ON e.TableName=OBJECT_NAME(tr.parent_id) WHERE OBJECT_SCHEMA_NAME(tr.parent_id)=N'dbo' ORDER BY TableName,tr.name;

/* Complete procedure text plus catalog-discovered dependencies. */
SELECT o.name AS ProcedureName,OBJECT_DEFINITION(o.object_id) AS ProcedureDefinition
FROM sys.objects o WHERE SCHEMA_NAME(o.schema_id)=N'dbo' AND o.name IN(N'usp_DispatchPlanning_Import_Validate',N'usp_DispatchPlanning_Import_Commit') AND o.type=N'P';
SELECT OBJECT_NAME(d.referencing_id) AS ProcedureName,d.referenced_schema_name,d.referenced_entity_name,d.referenced_database_name,d.referenced_server_name,d.is_caller_dependent
FROM sys.sql_expression_dependencies d WHERE d.referencing_id IN(OBJECT_ID(N'dbo.usp_DispatchPlanning_Import_Validate'),OBJECT_ID(N'dbo.usp_DispatchPlanning_Import_Commit')) ORDER BY ProcedureName,d.referenced_entity_name;

/* Candidate audit/user columns and existing identities are reported, never modified. */
SELECT t.name AS TableName,c.name AS AuditOrUserColumn,ty.name AS SqlType,c.is_nullable
FROM @Expected e JOIN sys.tables t ON t.name=e.TableName AND SCHEMA_NAME(t.schema_id)=N'dbo'
JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
WHERE c.name LIKE N'%User%' OR c.name LIKE N'%CreatedBy%' OR c.name LIKE N'%UpdatedBy%' OR c.name LIKE N'%Audit%'
ORDER BY t.name,c.column_id;

/* Prefix search is generated only for existing character columns; it performs SELECT COUNT(*) only. */
DECLARE @PrefixSql NVARCHAR(MAX)=N'';
SELECT @PrefixSql=STRING_AGG(CONVERT(NVARCHAR(MAX),N'SELECT N'''+REPLACE(t.name,N'''',N'''''')+N''' AS TableName,N'''+REPLACE(c.name,N'''',N'''''')+N''' AS ColumnName,COUNT_BIG(*) AS MatchingRows FROM dbo.'+QUOTENAME(t.name)+N' WHERE '+QUOTENAME(c.name)+N' LIKE @p'),N' UNION ALL ')
FROM @Expected e JOIN sys.tables t ON t.name=e.TableName AND SCHEMA_NAME(t.schema_id)=N'dbo'
JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
WHERE ty.name IN(N'varchar',N'nvarchar',N'char',N'nchar');
DECLARE @PrefixPattern NVARCHAR(52);

SET @PrefixPattern = @Prefix + N'%';
IF @PrefixSql IS NULL SELECT N'No character columns found in expected tables.' AS PrefixSearchResult;
ELSE
    EXEC sys.sp_executesql
        @PrefixSql,
        N'@p NVARCHAR(51)',
        @p = @PrefixPattern;
