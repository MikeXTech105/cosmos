/* Preserve all 16 legacy integer digits while adding six-place stock precision.
   Run in a backed-up disposable clone first. Currency columns are deliberately excluded.
   TVP v2 contracts are additive: deploy application and procedures together. */
SET XACT_ABORT ON;
GO
BEGIN TRY
BEGIN TRAN;
DECLARE @Columns TABLE(TableName SYSNAME,ColumnName SYSNAME);
INSERT @Columns VALUES
 (N'Items',N'OpeningStock'),(N'Items',N'CurrentStock'),(N'Items',N'ReservedStock'),(N'Items',N'MinimumStock'),
 (N'StockMovements',N'Quantity'),(N'SalesInvoiceItems',N'Quantity'),(N'PurchaseBillItems',N'Quantity'),(N'GstCalculationSnapshots',N'Quantity'),
 (N'PurchaseOrderItems',N'Quantity'),(N'PurchaseReturnItems',N'Quantity'),
 (N'ManufacturingBomItems',N'Quantity'),(N'ManufacturingProductions',N'PlannedQuantity'),(N'ManufacturingProductions',N'ProducedQuantity'),
 (N'ManufacturingProductionMaterials',N'RequiredQuantity'),(N'ManufacturingProductionMaterials',N'WastageQuantity'),(N'ManufacturingProductionMaterials',N'TotalConsumedQuantity');
IF EXISTS(SELECT 1 FROM @Columns x LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(N'dbo.'+x.TableName) AND c.name=x.ColumnName WHERE c.column_id IS NULL)
 THROW 51100,N'PRECISION_PREFLIGHT|An expected quantity column is missing; check baseline migrations.',1;
IF EXISTS(SELECT 1 FROM @Columns x JOIN sys.columns c ON c.object_id=OBJECT_ID(N'dbo.'+x.TableName) AND c.name=x.ColumnName WHERE c.scale<6)
BEGIN
DECLARE @Dependencies TABLE(Id INT IDENTITY PRIMARY KEY,DropSql NVARCHAR(MAX),RestoreSql NVARCHAR(MAX));
-- Preserve logical definitions, constraint trust, ordinary index options, compression and filegroups.
INSERT @Dependencies(DropSql,RestoreSql)
 SELECT N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' DROP CONSTRAINT '+QUOTENAME(c.name)+N';',
 N'ALTER TABLE dbo.'+QUOTENAME(t.name)+CASE WHEN c.is_not_trusted=1 OR c.is_disabled=1 THEN N' WITH NOCHECK' ELSE N' WITH CHECK' END+N' ADD CONSTRAINT '+QUOTENAME(c.name)+N' CHECK '+CASE WHEN c.is_not_for_replication=1 THEN N'NOT FOR REPLICATION ' ELSE N'' END+c.definition+N';'+CASE WHEN c.is_disabled=1 THEN N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' NOCHECK CONSTRAINT '+QUOTENAME(c.name)+N';' ELSE N'' END
 FROM sys.check_constraints c JOIN sys.tables t ON t.object_id=c.parent_object_id WHERE t.schema_id=SCHEMA_ID(N'dbo') AND t.name IN(SELECT TableName FROM @Columns);
INSERT @Dependencies(DropSql,RestoreSql)
 SELECT N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' DROP CONSTRAINT '+QUOTENAME(d.name)+N';',
 N'ALTER TABLE dbo.'+QUOTENAME(t.name)+N' ADD CONSTRAINT '+QUOTENAME(d.name)+N' DEFAULT '+d.definition+N' FOR '+QUOTENAME(c.name)+N';'
 FROM sys.default_constraints d JOIN sys.tables t ON t.object_id=d.parent_object_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=d.parent_column_id
 WHERE t.schema_id=SCHEMA_ID(N'dbo') AND EXISTS(SELECT 1 FROM @Columns x WHERE x.TableName=t.name AND x.ColumnName=c.name);
IF EXISTS(SELECT 1 FROM sys.indexes ix JOIN sys.tables t ON t.object_id=ix.object_id JOIN sys.index_columns ic ON ic.object_id=ix.object_id AND ic.index_id=ix.index_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id JOIN sys.partition_schemes ps ON ps.data_space_id=ix.data_space_id WHERE t.schema_id=SCHEMA_ID(N'dbo') AND EXISTS(SELECT 1 FROM @Columns x WHERE x.TableName=t.name AND x.ColumnName=c.name))
 THROW 51100,N'PARTITIONED_QUANTITY_INDEX|Review partitioned index rebuilds before changing precision.',1;
INSERT @Dependencies(DropSql,RestoreSql)
 SELECT N'DROP INDEX '+QUOTENAME(ix.name)+N' ON dbo.'+QUOTENAME(t.name)+N';',
 N'CREATE '+CASE WHEN ix.is_unique=1 THEN N'UNIQUE ' ELSE N'' END+N'NONCLUSTERED INDEX '+QUOTENAME(ix.name)+N' ON dbo.'+QUOTENAME(t.name)+N'('+keys.Columns+N')'+COALESCE(N' INCLUDE('+included.Columns+N')',N'')+COALESCE(N' WHERE '+ix.filter_definition,N'')+
 N' WITH (PAD_INDEX='+CASE WHEN ix.is_padded=1 THEN N'ON' ELSE N'OFF' END+N',FILLFACTOR='+CONVERT(NVARCHAR(3),ix.fill_factor)+N',IGNORE_DUP_KEY='+CASE WHEN ix.ignore_dup_key=1 THEN N'ON' ELSE N'OFF' END+N',ALLOW_ROW_LOCKS='+CASE WHEN ix.allow_row_locks=1 THEN N'ON' ELSE N'OFF' END+N',ALLOW_PAGE_LOCKS='+CASE WHEN ix.allow_page_locks=1 THEN N'ON' ELSE N'OFF' END+N',STATISTICS_NORECOMPUTE='+CASE WHEN st.no_recompute=1 THEN N'ON' ELSE N'OFF' END+N',DATA_COMPRESSION='+part.data_compression_desc+N') ON '+QUOTENAME(ds.name)+N';'+CASE WHEN ix.is_disabled=1 THEN N'ALTER INDEX '+QUOTENAME(ix.name)+N' ON dbo.'+QUOTENAME(t.name)+N' DISABLE;' ELSE N'' END
 FROM sys.indexes ix JOIN sys.tables t ON t.object_id=ix.object_id JOIN sys.data_spaces ds ON ds.data_space_id=ix.data_space_id JOIN sys.partitions part ON part.object_id=ix.object_id AND part.index_id=ix.index_id AND part.partition_number=1 JOIN sys.stats st ON st.object_id=ix.object_id AND st.stats_id=ix.index_id
 CROSS APPLY(SELECT STRING_AGG(CONVERT(NVARCHAR(MAX),QUOTENAME(c.name)+CASE WHEN ic.is_descending_key=1 THEN N' DESC' ELSE N' ASC' END),N',') WITHIN GROUP(ORDER BY ic.key_ordinal) Columns FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=ix.object_id AND ic.index_id=ix.index_id AND ic.is_included_column=0 AND ic.key_ordinal>0) keys
 OUTER APPLY(SELECT STRING_AGG(CONVERT(NVARCHAR(MAX),QUOTENAME(c.name)),N',') WITHIN GROUP(ORDER BY ic.index_column_id) Columns FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=ix.object_id AND ic.index_id=ix.index_id AND ic.is_included_column=1) included
 WHERE t.schema_id=SCHEMA_ID(N'dbo') AND ix.type=2 AND ix.is_primary_key=0 AND ix.is_unique_constraint=0 AND EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id JOIN @Columns x ON x.TableName=t.name AND x.ColumnName=c.name WHERE ic.object_id=ix.object_id AND ic.index_id=ix.index_id);
DECLARE @DependencySql NVARCHAR(MAX);
DECLARE dependency_drops CURSOR LOCAL FAST_FORWARD FOR SELECT DropSql FROM @Dependencies ORDER BY Id DESC;
OPEN dependency_drops;FETCH NEXT FROM dependency_drops INTO @DependencySql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sys.sp_executesql @DependencySql;FETCH NEXT FROM dependency_drops INTO @DependencySql;END;
CLOSE dependency_drops;DEALLOCATE dependency_drops;
DECLARE @Table SYSNAME,@Column SYSNAME,@Sql NVARCHAR(MAX),@Nullable BIT,@Precision INT,@Scale INT;
DECLARE quantity_columns CURSOR LOCAL FAST_FORWARD FOR SELECT TableName,ColumnName FROM @Columns ORDER BY TableName,ColumnName;
OPEN quantity_columns; FETCH NEXT FROM quantity_columns INTO @Table,@Column;
WHILE @@FETCH_STATUS=0
BEGIN
 SELECT @Precision=NULL,@Scale=NULL;
 SELECT @Precision=c.precision,@Scale=c.scale,@Nullable=c.is_nullable FROM sys.columns c WHERE c.object_id=OBJECT_ID(N'dbo.'+@Table) AND c.name=@Column;
 IF @Precision IS NULL THROW 51100,N'PRECISION_PREFLIGHT|An expected quantity column is missing; check baseline migrations.',1;
 IF @Scale<6
 BEGIN
  IF @Precision-@Scale>16 THROW 51100,N'PRECISION_RANGE|A deployed quantity exceeds the reviewed integer range; operator review is required.',1;
  SET @Sql=N'ALTER TABLE dbo.'+QUOTENAME(@Table)+N' ALTER COLUMN '+QUOTENAME(@Column)+N' DECIMAL(22,6) '+CASE @Nullable WHEN 1 THEN N'NULL;' ELSE N'NOT NULL;' END;
  EXEC sys.sp_executesql @Sql;
 END;
 FETCH NEXT FROM quantity_columns INTO @Table,@Column;
END;
CLOSE quantity_columns; DEALLOCATE quantity_columns;
DECLARE dependency_restores CURSOR LOCAL FAST_FORWARD FOR SELECT RestoreSql FROM @Dependencies ORDER BY Id;
OPEN dependency_restores;FETCH NEXT FROM dependency_restores INTO @DependencySql;
WHILE @@FETCH_STATUS=0 BEGIN EXEC sys.sp_executesql @DependencySql;FETCH NEXT FROM dependency_restores INTO @DependencySql;END;
CLOSE dependency_restores;DEALLOCATE dependency_restores;
END;
COMMIT;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
GO
IF TYPE_ID(N'dbo.SalesInvoiceItemInputV2') IS NULL
 EXEC(N'CREATE TYPE dbo.SalesInvoiceItemInputV2 AS TABLE(ItemId BIGINT NOT NULL,Quantity DECIMAL(22,6) NOT NULL,Rate DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(5,2) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxRateId BIGINT NULL,TaxPercentage DECIMAL(5,2) NOT NULL)');
IF TYPE_ID(N'dbo.PurchaseLineInputV2') IS NULL
 EXEC(N'CREATE TYPE dbo.PurchaseLineInputV2 AS TABLE(ItemId BIGINT NOT NULL,Quantity DECIMAL(22,6) NOT NULL,PurchasePrice DECIMAL(18,2) NOT NULL,DiscountPercentage DECIMAL(9,4) NOT NULL,DiscountAmount DECIMAL(18,2) NOT NULL,TaxPercentage DECIMAL(9,4) NOT NULL,UnitId BIGINT NULL,PurchaseBillItemId BIGINT NULL)');
GO
