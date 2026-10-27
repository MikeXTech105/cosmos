SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.ProductionImportRows','Disposition') IS NULL ALTER TABLE dbo.ProductionImportRows ADD Disposition INT NULL,RowStatus NVARCHAR(30) NOT NULL DEFAULT N'Staged',NormalizedEventKey VARCHAR(64) NULL,ApprovedBy BIGINT NULL,ApprovedAtUtc DATETIME2(3) NULL,PostedAtUtc DATETIME2(3) NULL;
IF OBJECT_ID('dbo.ProductionApprovedOpenings','U') IS NULL
CREATE TABLE dbo.ProductionApprovedOpenings(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id),
 CutoverDate DATE NOT NULL,Quantity DECIMAL(22,6) NOT NULL CHECK(Quantity>=0),SourceUnitCost DECIMAL(22,6) NULL,
 ImportRowId BIGINT NOT NULL UNIQUE REFERENCES dbo.ProductionImportRows(Id),ApprovedBy BIGINT NOT NULL,PostedBy BIGINT NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT UQ_PAO_Cutover UNIQUE(CompanyKey,ItemId,UnitId,CutoverDate));
IF OBJECT_ID('dbo.ProductionImportedHistory','U') IS NULL
CREATE TABLE dbo.ProductionImportedHistory(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,ImportRowId BIGINT NOT NULL UNIQUE REFERENCES dbo.ProductionImportRows(Id),
 Disposition INT NOT NULL,NormalizedEventKey VARCHAR(64) NOT NULL,ItemId BIGINT NULL REFERENCES dbo.Items(Id),SourceUnitId BIGINT NULL REFERENCES dbo.Units(Id),
 UnitId BIGINT NULL REFERENCES dbo.Units(Id),SourceQuantity DECIMAL(28,12) NULL,ConversionFactor DECIMAL(28,12) NULL,BaseQuantity DECIMAL(22,6) NULL,
 BusinessDate DATE NULL,ChannelId BIGINT NULL REFERENCES dbo.SalesChannels(Id),SourceReference NVARCHAR(100) NOT NULL,
 IsEffective BIT NOT NULL,CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionImportedHistory') AND name='UX_PIH_Event')
 CREATE UNIQUE INDEX UX_PIH_Event ON dbo.ProductionImportedHistory(CompanyKey,NormalizedEventKey) WHERE IsEffective=1;
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionImportValidation(@CompanyKey NVARCHAR(64),@Batch UNIQUEIDENTIFIER)
RETURNS TABLE AS RETURN
 SELECT r.Id,r.Disposition,r.RowStatus,r.NormalizedJson,r.NormalizedEventKey,b.CutoverDate,n.ItemId,n.SourceUnitId,n.SourceQuantity,n.BusinessDate,n.ChannelId,n.ObservedFrom,n.ObservedTo,n.RefreshedOn,n.SourceReference,n.SupplierId,n.PurchaseOrderLineId,n.SourceUnitCost,n.BaseUnitId,n.BaseQuantity,n.ConversionFactor,
 CONVERT(DECIMAL(22,6),CASE WHEN r.Disposition=4 THEN n.BaseQuantity+COALESCE(m.LaterQuantity,0)-i.CurrentStock ELSE NULL END) ReconciliationDifference,
 CASE WHEN r.Disposition IS NULL OR r.NormalizedJson IS NULL THEN N'MAPPING_REQUIRED'
 WHEN r.Disposition<>7 AND EXISTS(SELECT 1 FROM dbo.ProductionImportRows otherrow JOIN dbo.ProductionImportBatches otherbatch ON otherbatch.Id=otherrow.BatchId WHERE otherbatch.CompanyKey=@CompanyKey AND otherrow.NormalizedEventKey=r.NormalizedEventKey AND otherrow.Id<r.Id AND otherrow.Disposition<>7) THEN N'DUPLICATE_NORMALIZED_EVENT'
 WHEN r.Disposition=7 THEN NULL
 WHEN r.Disposition=5 AND n.ItemId IS NULL AND n.SupplierId IS NULL THEN N'MASTER_ID_REQUIRED'
 WHEN n.ItemId IS NOT NULL AND(i.Id IS NULL OR i.IsDeleted=1 OR(i.IsActive=0 AND r.Disposition NOT IN(1,2,5))) THEN N'ITEM_ID_UNRESOLVED'
 WHEN r.Disposition<>5 AND(n.ItemId IS NULL OR n.BaseUnitId<>i.UnitId OR n.ConversionFactor IS NULL OR n.ConversionFactor<=0) THEN N'UNIT_CONVERSION_UNRESOLVED'
 WHEN r.Disposition<>5 AND(n.SourceQuantity IS NULL OR n.SourceQuantity<0 OR n.BaseQuantity IS NULL OR n.BaseQuantity<0) THEN N'INVALID_SOURCE_QUANTITY'
 WHEN n.SourceUnitCost<0 THEN N'INVALID_SOURCE_COST'
 WHEN n.SupplierId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Parties WHERE Id=n.SupplierId AND IsActive=1 AND IsDeleted=0) THEN N'SUPPLIER_ID_UNRESOLVED'
 WHEN n.ChannelId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=n.ChannelId AND IsActive=1 AND IsDeleted=0) THEN N'CHANNEL_ID_UNRESOLVED'
 WHEN r.Disposition IN(1,2) AND(n.BusinessDate IS NULL OR n.BusinessDate>=b.CutoverDate) THEN N'HISTORY_MUST_PRECEDE_CUTOVER_USE_LINKED_OPERATION_AFTER_CUTOVER'
 WHEN r.Disposition IN(1,2) AND EXISTS(SELECT 1 FROM dbo.ProductionImportedHistory WHERE CompanyKey=@CompanyKey AND NormalizedEventKey=r.NormalizedEventKey AND IsEffective=1 AND ImportRowId<>r.Id) THEN N'DUPLICATE_NORMALIZED_EVENT'
 WHEN r.Disposition=3 AND(n.ObservedFrom IS NULL OR n.ObservedTo IS NULL OR n.RefreshedOn IS NULL OR n.ObservedTo<n.ObservedFrom OR n.RefreshedOn<n.ObservedTo OR n.RefreshedOn>TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate'))) THEN N'DEMAND_PERIOD_REQUIRED'
 WHEN r.Disposition=4 AND(n.BusinessDate IS NULL OR n.BusinessDate<>b.CutoverDate) THEN N'OPENING_CUTOVER_DATE_MISMATCH'
 WHEN r.Disposition=4 AND b.CutoverDate>TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate')) THEN N'FUTURE_CUTOVER_NOT_POSTABLE'
 WHEN r.Disposition=4 AND EXISTS(SELECT 1 FROM dbo.ProductionApprovedOpenings WHERE CompanyKey=@CompanyKey AND ItemId=n.ItemId AND UnitId=n.BaseUnitId AND CutoverDate=b.CutoverDate AND ImportRowId<>r.Id) THEN N'DUPLICATE_APPROVED_OPENING'
 WHEN r.Disposition=4 AND b.CutoverDate<=TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.ClosedThroughDate')) THEN N'CLOSED_PERIOD'
 WHEN r.Disposition=4 AND EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=n.ItemId AND BusinessDate IS NULL) THEN N'UNDATED_LEDGER_RECONCILIATION_REQUIRED'
 WHEN r.Disposition=4 AND i.ReservedStock<>0 THEN N'OPENING_HAS_ACTIVE_RESERVATIONS'
 WHEN r.Disposition=4 AND i.CurrentStock=0 AND NOT EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=n.ItemId) AND n.BaseQuantity>0 AND n.SourceUnitCost IS NULL THEN N'INITIAL_OPENING_VALUATION_REQUIRED'
 WHEN r.Disposition=4 AND n.BaseQuantity+COALESCE(m.LaterQuantity,0)<>i.CurrentStock AND NOT(i.CurrentStock=0 AND NOT EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=n.ItemId)) THEN N'OPENING_BALANCE_DIFFERENCE'
 WHEN r.Disposition=6 AND NOT EXISTS(SELECT 1 FROM dbo.PurchaseOrderItems l JOIN dbo.PurchaseOrders h ON h.Id=l.PurchaseOrderId WHERE l.Id=n.PurchaseOrderLineId AND l.ItemId=n.ItemId AND COALESCE(l.UnitId,i.UnitId)=n.BaseUnitId AND l.IsDeleted=0 AND h.IsDeleted=0 AND h.Status NOT IN(4,5) AND(n.SupplierId IS NULL OR h.SupplierId=n.SupplierId)) THEN N'REAL_PENDING_PO_LINE_REQUIRED'
 ELSE NULL END ExceptionCode
 FROM dbo.ProductionImportRows r JOIN dbo.ProductionImportBatches b ON b.Id=r.BatchId
 OUTER APPLY OPENJSON(CASE WHEN ISJSON(r.NormalizedJson)=1 THEN r.NormalizedJson ELSE N'{}' END) WITH(ItemId BIGINT '$.itemId',SourceUnitId BIGINT '$.sourceUnitId',SourceQuantity DECIMAL(28,12) '$.sourceQuantity',BusinessDate DATE '$.businessDate',ChannelId BIGINT '$.channelId',ObservedFrom DATE '$.observedFrom',ObservedTo DATE '$.observedTo',RefreshedOn DATE '$.refreshedOn',SourceReference NVARCHAR(100) '$.sourceReference',SupplierId UNIQUEIDENTIFIER '$.supplierId',PurchaseOrderLineId BIGINT '$.purchaseOrderLineId',SourceUnitCost DECIMAL(22,6) '$.sourceUnitCost',BaseUnitId BIGINT '$.baseUnitId',BaseQuantity DECIMAL(22,6) '$.baseQuantity',ConversionFactor DECIMAL(28,12) '$.conversionFactor') n
 LEFT JOIN dbo.Items i ON i.Id=n.ItemId
 OUTER APPLY(SELECT SUM(Quantity) LaterQuantity FROM dbo.StockMovements WHERE ItemId=n.ItemId AND BusinessDate>=b.CutoverDate AND SourceType<>N'CutoverOpening') m
 WHERE b.Id=@Batch AND b.CompanyKey=@CompanyKey;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionImport_Preview @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.id')),@Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageSize')),50),@Version VARCHAR(18),@State NVARCHAR(30),@Data NVARCHAR(MAX);
 SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1),@State=Status FROM dbo.ProductionImportBatches WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Version IS NULL THROW 51104,N'NOT_FOUND|Import batch was not found.',1;
 SET @Page=IIF(@Page<1,1,@Page);SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
 SET @Data=(SELECT @Id BatchId,@Version Version,@State Status,JSON_QUERY((SELECT JSON_QUERY((SELECT r.Id,r.Tab,r.RowNumber,r.ColumnName,r.EventFingerprint,r.OriginalJson,r.NormalizedJson,COALESCE(v.ExceptionCode,r.ExceptionCode) ExceptionCode,r.Disposition,r.RowStatus,v.ReconciliationDifference FROM dbo.ProductionImportRows r JOIN dbo.ufn_ProductionImportValidation(@CompanyKey,@Id) v ON v.Id=r.Id WHERE r.BatchId=@Id ORDER BY r.Id OFFSET(@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM dbo.ProductionImportRows WHERE BatchId=@Id) TotalCount,
  JSON_QUERY((SELECT COUNT(*) Rows,SUM(CASE WHEN ExceptionCode IS NOT NULL THEN 1 ELSE 0 END) UnresolvedRows FROM dbo.ufn_ProductionImportValidation(@CompanyKey,@Id) FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)) Rows FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionImport_Map @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.id')),@Row BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.rowId')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Normalized NVARCHAR(MAX)=JSON_QUERY(@RequestJson,'$.request'),@Err NVARCHAR(2048),
 @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.itemId')),@SourceUnit BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.sourceUnitId')),@BaseUnit BIGINT,@Factor DECIMAL(28,12),@Qty DECIMAL(28,12)=TRY_CONVERT(DECIMAL(28,12),JSON_VALUE(@RequestJson,'$.request.sourceQuantity')),
 @Date DATE=COALESCE(TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.observedFrom'))),@End DATE=COALESCE(TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.observedTo')),TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate'))),@Disposition INT=TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.request.disposition'));
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @Current=RowVersion FROM dbo.ProductionImportBatches WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Import batch was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload import preview.';THROW 51109,@Err,1;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.ProductionImportRows WHERE Id=@Row AND BatchId=@Id AND RowStatus NOT IN(N'Approved',N'Posted')) THROW 51109,N'IMPORT_ROW_FROZEN|Only unapproved staged rows may be mapped.',1;
 SELECT @BaseUnit=UnitId FROM dbo.Items WHERE Id=@Item AND(IsActive=1 OR @Disposition IN(1,2,5)) AND IsDeleted=0;
 IF @SourceUnit=@BaseUnit SET @Factor=1;
 ELSE SELECT @Factor=p.UnitsPerBox FROM dbo.ItemPackagingProfiles p JOIN dbo.Units u ON u.Id=@SourceUnit AND UPPER(u.ShortName) IN(N'BOX',N'BX') WHERE p.Id=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.packagingProfileId')) AND p.ItemId=@Item AND p.IsActive=1 AND p.IsDeleted=0 AND(p.EffectiveFrom IS NULL OR p.EffectiveFrom<=@Date) AND(p.EffectiveTo IS NULL OR p.EffectiveTo>=@End);
 SET @Normalized=JSON_MODIFY(JSON_MODIFY(JSON_MODIFY(@Normalized,'$.baseUnitId',@BaseUnit),'$.conversionFactor',@Factor),'$.baseQuantity',CONVERT(DECIMAL(22,6),ROUND(@Qty*@Factor,6)));
 UPDATE dbo.ProductionImportRows SET NormalizedJson=@Normalized,Disposition=@Disposition,RowStatus=N'Mapped',ApprovedBy=NULL,ApprovedAtUtc=NULL,
 NormalizedEventKey=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONCAT(@Disposition,N':',@Item,N':',@Date,N':',JSON_VALUE(@Normalized,'$.channelId'),N':',JSON_VALUE(@Normalized,'$.sourceReference'))),2) WHERE Id=@Row AND BatchId=@Id;
 UPDATE r SET ExceptionCode=v.ExceptionCode FROM dbo.ProductionImportRows r JOIN dbo.ufn_ProductionImportValidation(@CompanyKey,@Id) v ON v.Id=r.Id WHERE r.Id=@Row;
 UPDATE dbo.ProductionImportBatches SET Status=N'Mapped' WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT @Id BatchId,COUNT(*) Rows,SUM(CASE WHEN ExceptionCode IS NOT NULL THEN 1 ELSE 0 END) Exceptions,N'Mapped' Status,(SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ProductionImportBatches WHERE Id=@Id) Version FROM dbo.ProductionImportRows WHERE BatchId=@Id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'ImportMap',@Row,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionImport_Action @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.id')),@Action NVARCHAR(20)=JSON_VALUE(@RequestJson,'$.action'),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048);
 DECLARE @Selected TABLE(Id BIGINT PRIMARY KEY);INSERT @Selected SELECT TRY_CONVERT(BIGINT,value) FROM OPENJSON(@RequestJson,'$.request.rowIds');
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @Current=RowVersion FROM dbo.ProductionImportBatches WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Import batch was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload import preview.';THROW 51109,@Err,1;END;
 IF NOT EXISTS(SELECT 1 FROM @Selected) OR EXISTS(SELECT 1 FROM @Selected s LEFT JOIN dbo.ProductionImportRows r ON r.Id=s.Id AND r.BatchId=@Id WHERE r.Id IS NULL) THROW 51100,N'INVALID_SELECTION|Choose real rows from this import batch.',1;
 UPDATE r SET ExceptionCode=v.ExceptionCode FROM dbo.ProductionImportRows r JOIN dbo.ufn_ProductionImportValidation(@CompanyKey,@Id) v ON v.Id=r.Id JOIN @Selected s ON s.Id=r.Id;
 IF @Action IN(N'validate',N'reconcile')
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.ProductionImportRows r JOIN @Selected s ON s.Id=r.Id WHERE r.RowStatus IN(N'Approved',N'Posted')) THROW 51109,N'IMPORT_ROW_FROZEN|Approved/posted source evidence cannot be rewritten.',1;
  IF @Action=N'reconcile' AND EXISTS(SELECT 1 FROM dbo.ProductionImportRows r JOIN @Selected s ON s.Id=r.Id WHERE r.RowStatus<>N'Validated') THROW 51109,N'VALIDATE_FIRST|Validate selected mappings before reconciliation.',1;
  UPDATE r SET RowStatus=CASE WHEN ExceptionCode IS NOT NULL THEN N'Mapped' WHEN @Action=N'validate' THEN N'Validated' ELSE N'Reconciled' END FROM dbo.ProductionImportRows r JOIN @Selected s ON s.Id=r.Id;
 END
 ELSE IF @Action=N'approve'
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.ProductionImportRows r JOIN @Selected s ON s.Id=r.Id WHERE r.RowStatus<>N'Reconciled' OR r.ExceptionCode IS NOT NULL) THROW 51109,N'RECONCILIATION_REQUIRED|Selected rows must have no unresolved identities, units, dates or balance differences.',1;
  UPDATE r SET RowStatus=N'Approved',ApprovedBy=@UserId,ApprovedAtUtc=SYSUTCDATETIME() FROM dbo.ProductionImportRows r JOIN @Selected s ON s.Id=r.Id;
 END
 ELSE IF @Action=N'post'
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.ProductionImportRows r JOIN @Selected s ON s.Id=r.Id WHERE r.RowStatus<>N'Approved' OR r.ExceptionCode IS NOT NULL) THROW 51109,N'APPROVAL_REQUIRED|Every selected row must be approved and freshly reconciled.',1;
  SELECT v.* INTO #Posting FROM dbo.ufn_ProductionImportValidation(@CompanyKey,@Id) v JOIN @Selected s ON s.Id=v.Id;
  DECLARE @Row BIGINT,@Kind INT,@Item BIGINT,@Unit BIGINT,@Qty DECIMAL(22,6),@Date DATE,@Cost DECIMAL(22,6),@Opening BIGINT;
  DECLARE posting_rows CURSOR LOCAL FAST_FORWARD FOR SELECT Id,Disposition,ItemId,BaseUnitId,BaseQuantity,BusinessDate,SourceUnitCost FROM #Posting ORDER BY ItemId,Id;
  OPEN posting_rows;FETCH NEXT FROM posting_rows INTO @Row,@Kind,@Item,@Unit,@Qty,@Date,@Cost;
  WHILE @@FETCH_STATUS=0
  BEGIN
   IF @Item IS NOT NULL SELECT @Item=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Item;
   IF @Kind=4
   BEGIN
    INSERT dbo.ProductionApprovedOpenings(CompanyKey,ItemId,UnitId,CutoverDate,Quantity,SourceUnitCost,ImportRowId,ApprovedBy,PostedBy) SELECT @CompanyKey,@Item,@Unit,CutoverDate,@Qty,@Cost,@Row,r.ApprovedBy,@UserId FROM #Posting p JOIN dbo.ProductionImportRows r ON r.Id=p.Id WHERE p.Id=@Row;SET @Opening=SCOPE_IDENTITY();
    IF NOT EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=@Item) AND EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Item AND CurrentStock=0)
     UPDATE dbo.Items SET OpeningStock=@Qty,OpeningStockValue=ROUND(@Qty*COALESCE(@Cost,0),2),CurrentStock=@Qty,ModifiedBy=@UserId,ModifiedAt=SYSUTCDATETIME() WHERE Id=@Item;
    -- An adopted reconciled opening changes the ledger anchor, never adds the balance again.
   END
   ELSE IF @Kind=3
   BEGIN
    IF EXISTS(SELECT 1 FROM #Posting p JOIN dbo.ProductionDemandObservations o ON o.CompanyKey=@CompanyKey AND o.ItemId=p.ItemId AND o.IsSuperseded=0 AND o.ObservedFrom<=p.ObservedTo AND o.ObservedTo>=p.ObservedFrom WHERE p.Id=@Row AND((o.ChannelId IS NULL AND p.ChannelId IS NOT NULL) OR(o.ChannelId IS NOT NULL AND p.ChannelId IS NULL) OR(COALESCE(o.ChannelId,0)=COALESCE(p.ChannelId,0) AND(o.ObservedFrom<>p.ObservedFrom OR o.ObservedTo<>p.ObservedTo)))) THROW 51109,N'OVERLAPPING_DEMAND_PERIOD|Resolve overlapping source demand observations before posting.',1;
    UPDATE o SET IsSuperseded=1 FROM dbo.ProductionDemandObservations o JOIN #Posting p ON p.Id=@Row AND p.ItemId=o.ItemId AND p.ObservedFrom=o.ObservedFrom AND p.ObservedTo=o.ObservedTo AND COALESCE(p.ChannelId,0)=COALESCE(o.ChannelId,0) WHERE o.CompanyKey=@CompanyKey AND o.IsSuperseded=0;
    INSERT dbo.ProductionDemandObservations(CompanyKey,ItemId,UnitId,ChannelId,ObservedFrom,ObservedTo,RefreshedOn,SourceQuantity,BaseQuantity,ConversionFactor,SourceReference,CreatedBy) SELECT @CompanyKey,ItemId,BaseUnitId,ChannelId,ObservedFrom,ObservedTo,RefreshedOn,SourceQuantity,BaseQuantity,ConversionFactor,SourceReference,@UserId FROM #Posting WHERE Id=@Row;
   END
   ELSE
    INSERT dbo.ProductionImportedHistory(CompanyKey,ImportRowId,Disposition,NormalizedEventKey,ItemId,SourceUnitId,UnitId,SourceQuantity,ConversionFactor,BaseQuantity,BusinessDate,ChannelId,SourceReference,IsEffective,CreatedBy) SELECT @CompanyKey,Id,Disposition,NormalizedEventKey,ItemId,SourceUnitId,BaseUnitId,SourceQuantity,ConversionFactor,BaseQuantity,BusinessDate,ChannelId,SourceReference,CASE WHEN Disposition IN(1,2) THEN 1 ELSE 0 END,@UserId FROM #Posting WHERE Id=@Row;
   UPDATE dbo.ProductionImportRows SET RowStatus=N'Posted',PostedAtUtc=SYSUTCDATETIME(),ExceptionCode=NULL WHERE Id=@Row;
   FETCH NEXT FROM posting_rows INTO @Row,@Kind,@Item,@Unit,@Qty,@Date,@Cost;
  END;CLOSE posting_rows;DEALLOCATE posting_rows;
 END ELSE THROW 51100,N'INVALID_IMPORT_ACTION|Unsupported staged import action.',1;
 UPDATE dbo.ProductionImportBatches SET Status=CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.ProductionImportRows WHERE BatchId=@Id AND RowStatus<>N'Posted') THEN N'Posted' WHEN @Action=N'approve' THEN N'PartiallyApproved' ELSE @Action END WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT @Id BatchId,COUNT(*) Rows,SUM(CASE WHEN ExceptionCode IS NOT NULL THEN 1 ELSE 0 END) Exceptions,(SELECT Status FROM dbo.ProductionImportBatches WHERE Id=@Id) Status,(SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ProductionImportBatches WHERE Id=@Id) Version FROM dbo.ProductionImportRows WHERE BatchId=@Id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'Import:'+@Action,0,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
