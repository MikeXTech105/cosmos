SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.SalesInvoiceItems','InventoryOwner') IS NULL
 ALTER TABLE dbo.SalesInvoiceItems ADD InventoryOwner INT NOT NULL CONSTRAINT DF_SII_InventoryOwner DEFAULT(1) CONSTRAINT CK_SII_InventoryOwner CHECK(InventoryOwner IN(1,2));
IF OBJECT_ID('dbo.ShipmentInvoiceLineLinks','U') IS NULL
CREATE TABLE dbo.ShipmentInvoiceLineLinks(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,
 ShipmentItemId BIGINT NOT NULL REFERENCES dbo.ShipmentItems(Id),InvoiceLineId BIGINT NOT NULL REFERENCES dbo.SalesInvoiceItems(Id),
 Quantity DECIMAL(22,6) NOT NULL CHECK(Quantity>0),CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_SILL_Lines UNIQUE(CompanyKey,ShipmentItemId,InvoiceLineId));
GO
CREATE OR ALTER PROCEDURE dbo.sp_PhysicalInventory_Ownership @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Action NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.action'),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@State INT,@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048);
 IF NULLIF(@Key,N'') IS NULL THROW 51100,N'INVALID_KEY|An idempotency key is required.',1;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Prior; RETURN; END;
 IF @Action=N'invoice-policy'
 BEGIN
  SELECT @Current=RowVersion,@State=Status FROM dbo.SalesInvoices WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
  IF @Current IS NULL THROW 51104,N'NOT_FOUND|Invoice was not found.',1;
  IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload invoice ownership.'; THROW 51109,@Err,1; END;
  IF @State<>1 OR EXISTS(SELECT 1 FROM dbo.StockMovements WHERE SourceType=N'SalesInvoice' AND SourceId=@Id) THROW 51109,N'LEGACY_POSTING_RECONCILIATION|Ownership can change only on an unposted draft. Reconcile existing physical movements explicitly.',1;
  DECLARE @Lines TABLE(InvoiceLineId BIGINT PRIMARY KEY,Owner INT);
  INSERT @Lines SELECT * FROM OPENJSON(@RequestJson,'$.request.lines') WITH(InvoiceLineId BIGINT '$.invoiceLineId',Owner INT '$.owner');
  IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.SalesInvoiceItems i ON i.Id=l.InvoiceLineId AND i.SalesInvoiceId=@Id AND i.IsDeleted=0 WHERE i.Id IS NULL OR l.Owner NOT IN(1,2)) THROW 51100,N'INVALID_INVOICE_LINES|Line ownership must refer to this draft invoice.',1;
  IF EXISTS(SELECT 1 FROM @Lines l JOIN dbo.ShipmentInvoiceLineLinks x ON x.InvoiceLineId=l.InvoiceLineId WHERE l.Owner=1) THROW 51109,N'LINKED_LINE|A shipment-linked line cannot become a standalone stock owner.',1;
  UPDATE i SET InventoryOwner=l.Owner FROM dbo.SalesInvoiceItems i JOIN @Lines l ON l.InvoiceLineId=i.Id;
  UPDATE dbo.SalesInvoices SET UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  SELECT @Current=RowVersion FROM dbo.SalesInvoices WHERE Id=@Id;
 END
 ELSE IF @Action=N'shipment-links'
 BEGIN
  SELECT @Current=RowVersion,@State=Status FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
  IF @Current IS NULL THROW 51104,N'NOT_FOUND|Shipment was not found.',1;
  IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload shipment ownership.'; THROW 51109,@Err,1; END;
  IF @State IN(15,16) THROW 51109,N'INVALID_STATE|Cancelled or closed shipments cannot be linked.',1;
  DECLARE @Links TABLE(ShipmentItemId BIGINT,InvoiceLineId BIGINT,Quantity DECIMAL(22,6),PRIMARY KEY(ShipmentItemId,InvoiceLineId));
  INSERT @Links SELECT * FROM OPENJSON(@RequestJson,'$.request.lines') WITH(ShipmentItemId BIGINT '$.shipmentItemId',InvoiceLineId BIGINT '$.invoiceLineId',Quantity DECIMAL(22,6) '$.quantity');
  IF NOT EXISTS(SELECT 1 FROM @Links) OR EXISTS(SELECT 1 FROM @Links l LEFT JOIN dbo.ShipmentItems s ON s.Id=l.ShipmentItemId AND s.ShipmentId=@Id LEFT JOIN dbo.SalesInvoiceItems i ON i.Id=l.InvoiceLineId AND i.IsDeleted=0 LEFT JOIN dbo.SalesInvoices h ON h.Id=i.SalesInvoiceId AND h.IsDeleted=0 AND h.Status<>5 JOIN dbo.Items it ON it.Id=s.ItemId WHERE s.Id IS NULL OR i.Id IS NULL OR h.Id IS NULL OR s.ItemId<>i.ItemId OR COALESCE(i.UnitId,it.UnitId)<>it.UnitId OR i.InventoryOwner<>2 OR l.Quantity<=0) THROW 51100,N'INVALID_PHYSICAL_LINK|Match actual Item/base unit identities and select Shipment ownership on the invoice draft first.',1;
  IF EXISTS(SELECT 1 FROM @Links l JOIN dbo.SalesInvoiceItems i ON i.Id=l.InvoiceLineId WHERE EXISTS(SELECT 1 FROM dbo.StockMovements sm WHERE sm.SourceType=N'SalesInvoice' AND sm.SourceId=i.SalesInvoiceId AND sm.Quantity<0)) THROW 51109,N'LEGACY_POSTING_RECONCILIATION|The invoice already has physical stock-out; resolve ownership before linking.',1;
  IF EXISTS(SELECT 1 FROM @Links l JOIN dbo.SalesInvoiceItems i ON i.Id=l.InvoiceLineId OUTER APPLY(SELECT SUM(x.Quantity) Qty FROM dbo.ShipmentInvoiceLineLinks x JOIN dbo.ShipmentItems si ON si.Id=x.ShipmentItemId JOIN dbo.Shipments sh ON sh.Id=si.ShipmentId WHERE x.InvoiceLineId=i.Id AND x.CompanyKey=@CompanyKey AND sh.Status<>15) old WHERE COALESCE(old.Qty,0)+(SELECT SUM(Quantity) FROM @Links WHERE InvoiceLineId=i.Id)>i.Quantity) THROW 51109,N'INVOICE_QUANTITY_EXCEEDED|Partial shipment links exceed invoice line quantity.',1;
  IF EXISTS(SELECT 1 FROM @Links l JOIN dbo.ShipmentItems s ON s.Id=l.ShipmentItemId OUTER APPLY(SELECT SUM(Quantity) Qty FROM dbo.ShipmentInvoiceLineLinks WHERE ShipmentItemId=s.Id AND CompanyKey=@CompanyKey) old WHERE COALESCE(old.Qty,0)+(SELECT SUM(Quantity) FROM @Links WHERE ShipmentItemId=s.Id)>s.PlannedQuantity) THROW 51109,N'SHIPMENT_QUANTITY_EXCEEDED|Invoice links exceed the physical shipment line quantity.',1;
  INSERT dbo.ShipmentInvoiceLineLinks(CompanyKey,ShipmentItemId,InvoiceLineId,Quantity,CreatedBy) SELECT @CompanyKey,ShipmentItemId,InvoiceLineId,Quantity,@UserId FROM @Links;
  UPDATE dbo.Shipments SET UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  SELECT @Current=RowVersion FROM dbo.Shipments WHERE Id=@Id;
 END ELSE THROW 51100,N'INVALID_ACTION|Unknown ownership command.',1;
 SET @Data=(SELECT @Id Id,CONVERT(VARCHAR(18),@Current,1) Version,N'Saved' Status FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,@Action,@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Confirm @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @Status INT,@Date DATE,@Event UNIQUEIDENTIFIER=NEWID();
 SELECT @Status=Status,@Date=InvoiceDate FROM dbo.SalesInvoices WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
 IF @Status IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Invoice was not found.' Message; RETURN; END;
 IF @Status<>1 BEGIN ROLLBACK; SELECT 409 StatusCode,N'Only draft sales invoices can be confirmed.' Message; RETURN; END;
 IF EXISTS(SELECT 1 FROM dbo.Shipments WHERE InvoiceId=@Id AND IsDeleted=0 AND Status<>15) AND EXISTS(SELECT 1 FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 AND InventoryOwner=1) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Declare shipment ownership and explicit line links before confirming this linked invoice.' Message; RETURN; END;
 DECLARE @LockItem BIGINT;
 DECLARE invoice_locks CURSOR LOCAL FAST_FORWARD FOR SELECT DISTINCT ItemId FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 AND InventoryOwner=1 ORDER BY ItemId;
 OPEN invoice_locks; FETCH NEXT FROM invoice_locks INTO @LockItem;
 WHILE @@FETCH_STATUS=0 BEGIN SELECT @LockItem=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LockItem; FETCH NEXT FROM invoice_locks INTO @LockItem; END; CLOSE invoice_locks; DEALLOCATE invoice_locks;
 IF EXISTS(SELECT si.ItemId FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND si.InventoryOwner=1 AND i.ItemType=1 AND i.TrackInventory=1 GROUP BY si.ItemId HAVING MAX(i.CurrentStock-i.ReservedStock)<SUM(si.Quantity)) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Insufficient unreserved stock for one or more standalone invoice lines.' Message; RETURN; END;
 UPDATE i SET CurrentStock=i.CurrentStock-x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN(SELECT ItemId,SUM(Quantity) Quantity FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 AND InventoryOwner=1 GROUP BY ItemId) x ON x.ItemId=i.Id WHERE i.ItemType=1 AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,BusinessDate,MovementType,Quantity,CreatedBy)
 SELECT si.ItemId,N'SalesInvoice',@Id,si.Id,@Event,@Date,1,-si.Quantity,@UserId FROM dbo.SalesInvoiceItems si JOIN dbo.Items i ON i.Id=si.ItemId WHERE si.SalesInvoiceId=@Id AND si.IsDeleted=0 AND si.InventoryOwner=1 AND i.ItemType=1 AND i.TrackInventory=1;
 UPDATE dbo.SalesInvoices SET Status=CASE WHEN DueAmount=0 THEN 4 WHEN PaidAmount>0 THEN 3 ELSE 2 END,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 COMMIT; SELECT 200 StatusCode,N'Sales invoice confirmed.' Message; SELECT @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_SalesInvoice_Cancel @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @Status INT,@Date DATE,@Event UNIQUEIDENTIFIER=NEWID();
 SELECT @Status=Status,@Date=InvoiceDate FROM dbo.SalesInvoices WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
 IF @Status IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Invoice was not found.' Message; RETURN; END;
 IF @Status=5 BEGIN ROLLBACK; SELECT 409 StatusCode,N'Sales invoice is already cancelled.' Message; RETURN; END;
 IF @Status IN(2,3,4)
 BEGIN
  /* Restore the signed physical event balance only. Shipment-owned lines have no invoice movement. */
  UPDATE i SET CurrentStock=i.CurrentStock-x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i WITH(UPDLOCK,HOLDLOCK) JOIN(SELECT ItemId,SUM(Quantity) Quantity FROM dbo.StockMovements WHERE SourceType=N'SalesInvoice' AND SourceId=@Id GROUP BY ItemId HAVING SUM(Quantity)<0) x ON x.ItemId=i.Id;
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,BusinessDate,MovementType,Quantity,CreatedBy)
  SELECT ItemId,N'SalesInvoice',@Id,COALESCE(SourceLineId,0),@Event,@Date,2,-SUM(Quantity),@UserId FROM dbo.StockMovements WHERE SourceType=N'SalesInvoice' AND SourceId=@Id GROUP BY ItemId,COALESCE(SourceLineId,0) HAVING SUM(Quantity)<0;
 END;
 UPDATE dbo.SalesInvoices SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 COMMIT; SELECT 200 StatusCode,N'Sales invoice cancelled; shipment inventory remains owned by physical shipment events.' Message; SELECT @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH;
END;
GO
/* Preserve docket, packing, transition, freight and tracking behavior; replace only stock ownership block. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.usp_ShipmentOperations_Shipment_Transition')),
 @Start INT,@Finish INT,@Block NVARCHAR(MAX);
SET @Start=CHARINDEX(N'IF @TargetStatus=6',@Definition);
SET @Finish=CHARINDEX(N'SET @EventType=',@Definition,@Start);
IF @Start=0 OR @Finish=0 THROW 51100,N'SHIPMENT_PATCH_PREFLIGHT|Review the deployed shipment transition definition before applying ownership.',1;
SET @Block=N'IF @TargetStatus=6
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.ShipmentDockets WHERE ShipmentId=@Id AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N''At least one docket is required before dispatch.'' Message;RETURN;END;
  IF EXISTS(SELECT 1 FROM dbo.ShipmentItems WHERE ShipmentId=@Id AND (PackedQuantity<>PlannedQuantity OR UnitsPerBoxSnapshot<=0)) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Revalidate packing and verified units per box before dispatch.'' Message;RETURN;END;
  IF EXISTS(SELECT 1 FROM dbo.Shipments s WHERE s.Id=@Id AND s.InvoiceId IS NOT NULL) OR EXISTS(SELECT 1 FROM dbo.ShipmentInvoiceLineLinks l JOIN dbo.ShipmentItems si ON si.Id=l.ShipmentItemId WHERE si.ShipmentId=@Id)
  BEGIN
   IF EXISTS(SELECT 1 FROM dbo.ShipmentItems si OUTER APPLY(SELECT SUM(l.Quantity) Qty FROM dbo.ShipmentInvoiceLineLinks l JOIN dbo.SalesInvoiceItems ii ON ii.Id=l.InvoiceLineId AND ii.IsDeleted=0 AND ii.InventoryOwner=2 JOIN dbo.SalesInvoices inv ON inv.Id=ii.SalesInvoiceId AND inv.IsDeleted=0 AND inv.Status<>5 WHERE l.ShipmentItemId=si.Id) x WHERE si.ShipmentId=@Id AND COALESCE(x.Qty,0)<>si.PackedQuantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Explicit invoice line ownership/quantity does not reconcile with this physical shipment.'' Message;RETURN;END;
  END;
  DECLARE @DispatchLockItem BIGINT;
  DECLARE dispatch_locks CURSOR LOCAL FAST_FORWARD FOR SELECT DISTINCT ItemId FROM dbo.ShipmentItems WHERE ShipmentId=@Id ORDER BY ItemId;
  OPEN dispatch_locks; FETCH NEXT FROM dispatch_locks INTO @DispatchLockItem;
  WHILE @@FETCH_STATUS=0 BEGIN SELECT @DispatchLockItem=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@DispatchLockItem; FETCH NEXT FROM dispatch_locks INTO @DispatchLockItem; END; CLOSE dispatch_locks; DEALLOCATE dispatch_locks;
  IF EXISTS(SELECT si.ItemId FROM dbo.ShipmentItems si JOIN dbo.Items i ON i.Id=si.ItemId WHERE si.ShipmentId=@Id AND i.ItemType=1 AND i.TrackInventory=1 GROUP BY si.ItemId HAVING MAX(i.CurrentStock-i.ReservedStock)<SUM(si.PackedQuantity)) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Insufficient current unreserved stock; refresh the stale dispatch allocation.'' Message;RETURN;END;
  IF EXISTS(SELECT 1 FROM dbo.StockMovements WHERE SourceType=N''ShipmentDispatch'' AND SourceId=@Id) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Dispatch inventory movement already exists.'' Message;RETURN;END;
  UPDATE i SET CurrentStock=i.CurrentStock-x.Quantity,ModifiedAt=@Now,ModifiedBy=@UserId FROM dbo.Items i JOIN(SELECT ItemId,SUM(PackedQuantity) Quantity FROM dbo.ShipmentItems WHERE ShipmentId=@Id GROUP BY ItemId) x ON x.ItemId=i.Id WHERE i.ItemType=1 AND i.TrackInventory=1;
  DECLARE @Physical UNIQUEIDENTIFIER=NEWID();
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,BusinessDate,MovementType,Quantity,CreatedBy)
  SELECT si.ItemId,N''ShipmentDispatch'',@Id,si.Id,@Physical,s.ShipmentDate,5,-si.PackedQuantity,@UserId FROM dbo.ShipmentItems si JOIN dbo.Items i ON i.Id=si.ItemId JOIN dbo.Shipments s ON s.Id=si.ShipmentId WHERE si.ShipmentId=@Id AND i.ItemType=1 AND i.TrackInventory=1;
  UPDATE dbo.ShipmentItems SET DispatchedQuantity=PackedQuantity,UpdatedAtUtc=@Now,UpdatedBy=@UserId WHERE ShipmentId=@Id;
 END;
 ';
SET @Definition=STUFF(@Definition,@Start,@Finish-@Start,@Block);
SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
EXEC sys.sp_executesql @Definition;
GO
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.StockMovements') AND name='UX_StockMovements_ShipmentIdempotency')
 DROP INDEX UX_StockMovements_ShipmentIdempotency ON dbo.StockMovements;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.StockMovements') AND name='UX_SM_LegacyShipmentEvent')
 CREATE UNIQUE INDEX UX_SM_LegacyShipmentEvent ON dbo.StockMovements(SourceType,SourceId,ItemId) WHERE SourceLineId IS NULL AND SourceType IN(N'ShipmentDispatch',N'ShipmentReturn');
GO
