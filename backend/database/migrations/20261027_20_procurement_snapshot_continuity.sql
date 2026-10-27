SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.ProcurementPlanningRuns','SourceRevision') IS NULL ALTER TABLE dbo.ProcurementPlanningRuns ADD SourceRevision VARCHAR(64) NULL;
IF COL_LENGTH('dbo.ProcurementPlanningRunLines','ReservedStock') IS NULL ALTER TABLE dbo.ProcurementPlanningRunLines ADD ReservedStock DECIMAL(22,6) NULL,AvailableStock DECIMAL(22,6) NULL,Normalized30Requirement DECIMAL(22,6) NULL;
IF COL_LENGTH('dbo.ProcurementSettings','SourceLeadTime') IS NULL ALTER TABLE dbo.ProcurementSettings ADD SourceLeadTime DECIMAL(9,3) NULL,SourceLeadTimeUnit INT NULL,DefaultSupplierId UNIQUEIDENTIFIER NULL REFERENCES dbo.Parties(Id),LeadTimeSourceReference NVARCHAR(200) NULL,PolicyVersion ROWVERSION;
IF COL_LENGTH('dbo.PurchasePhysicalReceipts','ExpectedDateSnapshot') IS NULL ALTER TABLE dbo.PurchasePhysicalReceipts ADD ExpectedDateSnapshot DATE NULL;
IF COL_LENGTH('dbo.PurchaseOrderItems','SourcePlanningRunLineId') IS NULL ALTER TABLE dbo.PurchaseOrderItems ADD SourcePlanningRunLineId BIGINT NULL REFERENCES dbo.ProcurementPlanningRunLines(Id),PriceSourceReference NVARCHAR(200) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PurchaseOrderItems') AND name=N'UX_POI_SourcePlanningLine') CREATE UNIQUE INDEX UX_POI_SourcePlanningLine ON dbo.PurchaseOrderItems(SourcePlanningRunLineId) WHERE SourcePlanningRunLineId IS NOT NULL AND IsDeleted=0;
GO
/* One eligible inbound basis: real open PO remainder, otherwise the latest verified external snapshot.
   A snapshot is a whole-item supply observation, never added to the same item's real PO supply. */
CREATE OR ALTER FUNCTION dbo.ufn_ProcurementEligibleInbound(@ItemId BIGINT,@AsOf DATE)
RETURNS DECIMAL(22,6) AS
BEGIN
 DECLARE @Qty DECIMAL(22,6);
 SELECT @Qty=SUM(CASE WHEN p.Quantity>COALESCE(r.Accepted,0) THEN p.Quantity-COALESCE(r.Accepted,0) ELSE 0 END)
 FROM dbo.PurchaseOrderItems p JOIN dbo.PurchaseOrders h ON h.Id=p.PurchaseOrderId
 OUTER APPLY(SELECT SUM(x.AcceptedQuantity) Accepted FROM dbo.PurchasePhysicalReceiptLines x WHERE x.PurchaseOrderLineId=p.Id) r
 WHERE p.ItemId=@ItemId AND p.IsDeleted=0 AND h.IsDeleted=0 AND h.Status IN(2,3) AND h.OrderDate<=@AsOf;
 IF @Qty IS NULL SELECT TOP(1) @Qty=InboundQuantity FROM dbo.ProcurementInboundStockSnapshots WHERE ItemId=@ItemId AND IsDeleted=0 AND IsValid=1 AND SnapshotDate<=@AsOf ORDER BY SnapshotDate DESC,Id DESC;
 RETURN COALESCE(@Qty,0);
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_PurchaseDraft @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Supplier UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.request.supplierId')),
 @Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.orderDate')),@Expected DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.expectedDate')),@From DATE,@To DATE,@Stored VARCHAR(64),@Current VARCHAR(64),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Order BIGINT;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @From=FromDate,@To=ToDate,@Stored=SourceRevision FROM dbo.ProcurementPlanningRuns WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND Status=2 AND CalculationVersion=N'procurement-v3-normalized30-positive-shortage';
 EXEC dbo.sp_ProcurementPlanning_Revision @From,@To,@Current OUTPUT;
 IF @Stored IS NULL OR @Stored<>@Current THROW 51109,N'STALE_PLAN|Refresh and approve procurement after demand, BOM, stock, settings or eligible inbound changes.',1;
 IF @Date IS NULL OR @Expected<@Date OR NOT EXISTS(SELECT 1 FROM dbo.Parties p WHERE p.Id=@Supplier AND p.IsActive=1 AND p.IsDeleted=0) THROW 51100,N'INVALID_PURCHASE_SOURCE|A real active supplier and valid dates are required.',1;
 DECLARE @Lines TABLE(LineId BIGINT PRIMARY KEY,Price DECIMAL(18,2),Tax DECIMAL(9,4),PriceSource NVARCHAR(200));
 INSERT @Lines SELECT * FROM OPENJSON(@RequestJson,'$.request.lines') WITH(LineId BIGINT '$.planningRunLineId',Price DECIMAL(18,2) '$.unitPrice',Tax DECIMAL(9,4) '$.taxPercentage',PriceSource NVARCHAR(200) '$.priceSourceReference');
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines x LEFT JOIN dbo.ProcurementPlanningRunLines l ON l.Id=x.LineId AND l.PlanningRunId=@Id LEFT JOIN dbo.Items i ON i.Id=l.MaterialItemId WHERE l.Id IS NULL OR l.FinalQuantity<=0 OR i.UnitId<>l.UnitId OR i.IsDeleted=1 OR i.IsActive=0 OR x.Price IS NULL OR x.Price<0 OR x.Tax NOT BETWEEN 0 AND 100 OR NULLIF(x.PriceSource,N'') IS NULL) THROW 51100,N'INVALID_PURCHASE_LINES|Select positive approved quantities with verified Item/unit and explicit price provenance.',1;
 IF EXISTS(SELECT 1 FROM dbo.PurchaseOrderItems p JOIN @Lines x ON x.LineId=p.SourcePlanningRunLineId WHERE p.IsDeleted=0) THROW 51109,N'ALREADY_CONVERTED|A selected recommendation already belongs to a purchase draft.',1;
 DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
 SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'PurchaseOrder';
 IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'PurchaseOrder',N'PO-',2,6);SET @Next=1;SET @Prefix=N'PO-';SET @Padding=6;END
 ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'PurchaseOrder';
 INSERT dbo.PurchaseOrders(PurchaseOrderNo,SupplierId,OrderDate,ExpectedDeliveryDate,Status,SubTotal,DiscountAmount,TaxAmount,GrandTotal,Notes,CreatedBy)
 VALUES(@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@Next),@Padding),@Supplier,@Date,@Expected,1,0,0,0,0,JSON_VALUE(@RequestJson,'$.request.notes'),@UserId);SET @Order=SCOPE_IDENTITY();
 INSERT dbo.PurchaseOrderItems(PurchaseOrderId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy,SourcePlanningRunLineId,PriceSourceReference)
 SELECT @Order,l.MaterialItemId,i.Name,l.FinalQuantity,l.UnitId,u.Name,x.Price,0,0,x.Tax,ROUND(ROUND(l.FinalQuantity*x.Price,2)*x.Tax/100,2),ROUND(l.FinalQuantity*x.Price,2)+ROUND(ROUND(l.FinalQuantity*x.Price,2)*x.Tax/100,2),@UserId,l.Id,x.PriceSource
 FROM @Lines x JOIN dbo.ProcurementPlanningRunLines l ON l.Id=x.LineId JOIN dbo.Items i ON i.Id=l.MaterialItemId JOIN dbo.Units u ON u.Id=l.UnitId;
 UPDATE h SET SubTotal=t.Sub,TaxAmount=t.Tax,GrandTotal=t.Total FROM dbo.PurchaseOrders h CROSS APPLY(SELECT SUM(ROUND(Quantity*PurchasePrice,2)) Sub,SUM(TaxAmount) Tax,SUM(LineTotal) Total FROM dbo.PurchaseOrderItems WHERE PurchaseOrderId=@Order AND IsDeleted=0) t WHERE h.Id=@Order;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'PurchaseDraft' Status FROM dbo.PurchaseOrders WHERE Id=@Order FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'ProcurementPurchaseDraft',@Order,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementSupplierPolicy @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Data NVARCHAR(MAX),@Prior NVARCHAR(MAX),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),
 @Lead DECIMAL(9,3)=TRY_CONVERT(DECIMAL(9,3),JSON_VALUE(@RequestJson,'$.request.leadTime')),@Unit INT=TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.request.leadTimeUnit')),@Supplier UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.request.defaultSupplierId'));
 BEGIN TRY BEGIN TRAN;
 IF JSON_QUERY(@RequestJson,'$.request') IS NOT NULL
 BEGIN
  EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
  IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
  SELECT @Current=PolicyVersion FROM dbo.ProcurementSettings WITH(UPDLOCK,HOLDLOCK) WHERE ItemId=@Item AND IsDeleted=0;
  IF @Current IS NULL THROW 51104,N'NOT_FOUND|Save the existing Item procurement settings first.',1;
  IF @Version IS NULL OR @Version<>@Current THROW 51109,N'STALE_VERSION|Reload the supplier policy before saving.',1;
  IF @Lead IS NULL OR @Lead<0 OR @Unit NOT IN(1,2) OR @Lead*CASE WHEN @Unit=2 THEN 7 ELSE 1 END>999999.999 THROW 51100,N'INVALID_LEAD_TIME|Declare supported calendar days or weeks within the existing day range.',1;
  IF @Supplier IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Parties p WHERE p.Id=@Supplier AND p.IsActive=1 AND p.IsDeleted=0) THROW 51100,N'INVALID_SUPPLIER|Select an existing active Supplier Party.',1;
  UPDATE dbo.ProcurementSettings SET SourceLeadTime=@Lead,SourceLeadTimeUnit=@Unit,ConfiguredLeadTimeDays=@Lead*CASE WHEN @Unit=2 THEN 7 ELSE 1 END,DefaultSupplierId=@Supplier,LeadTimeSourceReference=JSON_VALUE(@RequestJson,'$.request.sourceReference'),ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE ItemId=@Item AND IsDeleted=0;
 END;
 SET @Data=(SELECT ItemId,CONVERT(VARCHAR(18),PolicyVersion,1) Version,SourceLeadTime,SourceLeadTimeUnit,ConfiguredLeadTimeDays,DefaultSupplierId,LeadTimeSourceReference SourceReference FROM dbo.ProcurementSettings WHERE ItemId=@Item AND IsDeleted=0 FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER);
 IF @Data IS NULL THROW 51104,N'NOT_FOUND|Item procurement settings were not found.',1;
 IF @Key IS NOT NULL INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'ProcurementSupplierPolicy',@Item,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
/* A legacy numeric-day edit clears incompatible typed provenance, rather than lying about its unit. */
CREATE OR ALTER TRIGGER dbo.tr_ProcurementSettings_LeadSource ON dbo.ProcurementSettings AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF UPDATE(ConfiguredLeadTimeDays) AND NOT UPDATE(SourceLeadTime)
 UPDATE s SET SourceLeadTime=NULL,SourceLeadTimeUnit=NULL,LeadTimeSourceReference=NULL FROM dbo.ProcurementSettings s JOIN inserted i ON i.Id=s.Id JOIN deleted d ON d.Id=s.Id WHERE COALESCE(i.ConfiguredLeadTimeDays,-1)<>COALESCE(d.ConfiguredLeadTimeDays,-1);
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_PurchaseReceipt_ExpectedDate ON dbo.PurchasePhysicalReceipts AFTER INSERT AS
BEGIN
 SET NOCOUNT ON;UPDATE h SET ExpectedDateSnapshot=p.ExpectedDeliveryDate FROM dbo.PurchasePhysicalReceipts h JOIN inserted x ON x.Id=h.Id JOIN dbo.PurchaseOrders p ON p.Id=h.PurchaseOrderId;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseSupplier_Performance @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.fromDate')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.toDate')),@Supplier UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.supplierId')),
 @Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageSize')),50),@Data NVARCHAR(MAX);
 SELECT h.SupplierId,l.UnitId,SUM(l.AcceptedQuantity) AcceptedQuantity,SUM(l.ReturnedAcceptedQuantity+l.ReturnedRejectedQuantity+l.ReturnedQuarantinedQuantity) ReturnedQuantity,
 SUM(CASE WHEN h.ExpectedDateSnapshot IS NOT NULL AND h.BusinessDate<=h.ExpectedDateSnapshot THEN l.AcceptedQuantity ELSE 0 END) OnTimeAcceptedQuantity,
 SUM(CASE WHEN h.ExpectedDateSnapshot IS NOT NULL THEN l.AcceptedQuantity ELSE 0 END) DatedAcceptedQuantity,
 SUM(CASE WHEN h.ExpectedDateSnapshot IS NULL THEN l.AcceptedQuantity ELSE 0 END) UndatedAcceptedQuantity,
 SUM(CAST(DATEDIFF(DAY,o.OrderDate,h.BusinessDate) AS DECIMAL(22,6))*l.AcceptedQuantity)/NULLIF(SUM(l.AcceptedQuantity),0) QuantityWeightedLeadDays
 INTO #Performance FROM dbo.PurchasePhysicalReceipts h JOIN dbo.PurchasePhysicalReceiptLines l ON l.ReceiptId=h.Id JOIN dbo.PurchaseOrders o ON o.Id=h.PurchaseOrderId
 OUTER APPLY(SELECT TOP(1) ph.ExpectedDate FROM dbo.PurchasePromiseHistory ph WHERE ph.CompanyKey=@CompanyKey AND ph.PurchaseOrderId=o.Id AND ph.CreatedAtUtc<=h.CreatedAtUtc ORDER BY ph.Id DESC) p
 WHERE h.CompanyKey=@CompanyKey AND h.BusinessDate BETWEEN @From AND @To AND(@Supplier IS NULL OR h.SupplierId=@Supplier) GROUP BY h.SupplierId,l.UnitId;
 SET @Data=(SELECT JSON_QUERY((SELECT *,OnTimeAcceptedQuantity*100.0/NULLIF(DatedAcceptedQuantity,0) OnTimePercent FROM #Performance ORDER BY SupplierId,UnitId OFFSET(@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Performance) TotalCount,
 JSON_QUERY((SELECT UnitId,SUM(AcceptedQuantity) AcceptedQuantity,SUM(ReturnedQuantity) ReturnedQuantity,SUM(OnTimeAcceptedQuantity) OnTimeAcceptedQuantity,SUM(DatedAcceptedQuantity) DatedAcceptedQuantity,SUM(UndatedAcceptedQuantity) UndatedAcceptedQuantity,SUM(OnTimeAcceptedQuantity)*100.0/NULLIF(SUM(DatedAcceptedQuantity),0) OnTimePercent FROM #Performance GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
/* Revision includes deleted/inactive rows and all calculation determinants. No history is overwritten. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Revision @FromDate DATE,@ToDate DATE,@Revision VARCHAR(64) OUTPUT AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Json NVARCHAR(MAX)=(SELECT
  JSON_QUERY((SELECT Id,UnitId,CurrentStock,ReservedStock,TrackInventory,IsActive,IsDeleted,ProcurementClassification FROM dbo.Items ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,
  JSON_QUERY((SELECT * FROM dbo.ManufacturingBoms ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Boms,
  JSON_QUERY((SELECT * FROM dbo.ManufacturingBomItems ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) BomLines,
  JSON_QUERY((SELECT * FROM dbo.ProcurementSettings ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Settings,
  JSON_QUERY((SELECT * FROM dbo.ProcurementLeadTimeHistory ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) LeadTimes,
  JSON_QUERY((SELECT * FROM dbo.ProcurementSalesHistory WHERE SalesDate BETWEEN @FromDate AND @ToDate ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Sales,
  JSON_QUERY((SELECT * FROM dbo.ProductionDemandObservations WHERE ObservedFrom<=@ToDate AND ObservedTo>=@FromDate ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) Observations,
  JSON_QUERY((SELECT * FROM dbo.ProcurementInboundStockSnapshots WHERE SnapshotDate<=@ToDate ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES)) ExternalInbound,
  JSON_QUERY((SELECT Id,Status,OrderDate,ExpectedDeliveryDate,IsDeleted FROM dbo.PurchaseOrders ORDER BY Id FOR JSON PATH)) Orders,
  JSON_QUERY((SELECT Id,PurchaseOrderId,ItemId,UnitId,Quantity,IsDeleted FROM dbo.PurchaseOrderItems ORDER BY Id FOR JSON PATH)) OrderLines,
  JSON_QUERY((SELECT Id,PurchaseOrderLineId,AcceptedQuantity FROM dbo.PurchasePhysicalReceiptLines ORDER BY Id FOR JSON PATH)) Receipts
  FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 SET @Revision=CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',@Json),2);
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_CalculationInputs @FromDate DATE,@ToDate DATE AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Company NVARCHAR(64)=CONVERT(NVARCHAR(64),SESSION_CONTEXT(N'Cosmos.CompanyKey')),@Revision VARCHAR(64),@Lock INT;
 BEGIN TRY BEGIN TRAN;
 EXEC @Lock=sys.sp_getapplock @Resource=N'Cosmos.Production.Stock',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=15000;
 IF @Lock<0 THROW 51109,N'CONCURRENT_COMMAND|Retry procurement preview.',1;
 SELECT i.Id ItemId,i.ItemCode,i.Name ItemName,i.IsActive,i.ProcurementClassification,s.Quantity
 INTO #Sales FROM dbo.Items i CROSS APPLY(SELECT SUM(BaseQuantity) Quantity FROM dbo.ufn_ProductionDemandSources(@Company,i.Id,@FromDate,@ToDate,NULL,N'UTC')) s WHERE s.Quantity IS NOT NULL;
 SELECT * FROM #Sales;
 SELECT b.FinishedItemId FinishedProductItemId,x.ComponentItemId,ci.ItemCode ComponentItemCode,ci.Name ComponentItemName,ci.IsActive ComponentIsActive,ci.ProcurementClassification,x.UnitId,u.Name UnitName,u.ShortName UnitShortName,
  CAST(x.Quantity*(1+x.WastagePercentage/100.0)/b.OutputBaseQuantity AS DECIMAL(28,12)) QuantityRequired,
  x.Quantity SourceComponentQuantity,b.OutputBaseQuantity BomOutputBaseQuantity,x.WastagePercentage BomWastePercentage,
  (SELECT COUNT(*) FROM dbo.ManufacturingBoms activebom WHERE activebom.FinishedItemId=b.FinishedItemId AND activebom.IsDeleted=0 AND activebom.IsActive=1 AND activebom.Status=2 AND activebom.EffectiveFrom<=@ToDate AND(activebom.EffectiveTo IS NULL OR activebom.EffectiveTo>=@ToDate)) BomSelectionCount,CONVERT(BIT,CASE WHEN ci.UnitId=x.UnitId THEN 1 ELSE 0 END) UnitVerified,
  ci.TrackInventory,ci.CurrentStock,ci.ReservedStock,ps.Id SettingId,ps.ConfiguredLeadTimeDays,ps.LeadTimeOverrideDays,history.AverageHistoricalLeadTimeDays,ps.SafetyFactor,ps.MinimumOrderQuantity,ps.OrderMultiple,ps.AutomaticCalculationEnabled,ps.ManualPlanning,ps.RoundingRule,ps.IsActive SettingIsActive,dbo.ufn_ProcurementEligibleInbound(ci.Id,@ToDate) ValidInboundQuantity
 FROM #Sales sales JOIN dbo.ManufacturingBoms b ON b.FinishedItemId=sales.ItemId AND b.IsDeleted=0 AND b.IsActive=1 AND b.Status=2 AND b.EffectiveFrom<=@ToDate AND(b.EffectiveTo IS NULL OR b.EffectiveTo>=@ToDate)
 JOIN dbo.ManufacturingBomItems x ON x.BomId=b.Id AND x.IsDeleted=0 JOIN dbo.Items ci ON ci.Id=x.ComponentItemId JOIN dbo.Units u ON u.Id=x.UnitId
 LEFT JOIN dbo.ProcurementSettings ps ON ps.ItemId=ci.Id AND ps.IsDeleted=0
 OUTER APPLY(SELECT CAST(AVG(CAST(h.LeadTimeDays AS DECIMAL(19,6))) AS DECIMAL(9,3)) AverageHistoricalLeadTimeDays FROM dbo.ProcurementLeadTimeHistory h WHERE h.ItemId=ci.Id AND h.IsDeleted=0) history;
 SELECT c.Code ChannelCode,s.ChannelSku,COUNT(*) OccurrenceCount FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId WHERE s.IsDeleted=0 AND s.ItemId IS NULL AND s.SalesDate BETWEEN @FromDate AND @ToDate GROUP BY c.Code,s.ChannelSku;
 EXEC dbo.sp_ProcurementPlanning_Revision @FromDate,@ToDate,@Revision OUTPUT;SELECT @Revision;
 COMMIT;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
/* Add a transaction-time compare to the existing save, retaining numbering and saved line contracts. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ProcurementPlanning_Run_Save'));
IF CHARINDEX(N'@SourceRevision',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'@UserId BIGINT=NULL AS',N'@UserId BIGINT=NULL,@SourceRevision VARCHAR(64)=NULL AS');
 SET @Definition=REPLACE(@Definition,N'BEGIN TRAN;',N'BEGIN TRAN; DECLARE @Revision VARCHAR(64),@RevisionLock INT; EXEC @RevisionLock=sys.sp_getapplock @Resource=N''Cosmos.Production.Stock'',@LockMode=N''Exclusive'',@LockOwner=N''Transaction'',@LockTimeout=15000; IF @RevisionLock<0 BEGIN ROLLBACK;SELECT 409 StatusCode,N''Retry procurement save.'' Message;RETURN;END; EXEC dbo.sp_ProcurementPlanning_Revision @FromDate,@ToDate,@Revision OUTPUT; IF @SourceRevision IS NULL OR @SourceRevision<>@Revision BEGIN ROLLBACK;SELECT 409 StatusCode,N''STALE_PLAN: Refresh demand, BOM, stock, settings and inbound before saving.'' Message;RETURN;END;');
 SET @Definition=REPLACE(@Definition,N'COMMIT;SELECT 201',N'UPDATE dbo.ProcurementPlanningRuns SET SourceRevision=@SourceRevision WHERE Id=@Id; COMMIT;SELECT 201');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Finalize @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @From DATE,@To DATE,@Revision VARCHAR(64),@Stored VARCHAR(64),@Lock INT;
 EXEC @Lock=sys.sp_getapplock @Resource=N'Cosmos.Production.Stock',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=15000;
 IF @Lock<0 THROW 51109,N'CONCURRENT_COMMAND|Retry procurement approval.',1;
 SELECT @From=FromDate,@To=ToDate,@Stored=SourceRevision FROM dbo.ProcurementPlanningRuns WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND Status IN(1,3,4) AND CalculationVersion=N'procurement-v3-normalized30-positive-shortage';
 EXEC dbo.sp_ProcurementPlanning_Revision @From,@To,@Revision OUTPUT;
 IF @Stored IS NULL OR @Stored<>@Revision BEGIN ROLLBACK;SELECT 409 StatusCode,N'STALE_PLAN: Refresh this run under v3 before approving. Finalized historical runs remain unchanged.' Message;RETURN;END;
 UPDATE dbo.ProcurementPlanningRuns SET Status=2,FinalizedAt=SYSUTCDATETIME(),FinalizedBy=@UserId WHERE Id=@Id;
 COMMIT;SELECT 200 StatusCode,N'Planning run finalized.' Message;EXEC dbo.sp_ProcurementPlanning_Run_Get @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH;
END;
GO
