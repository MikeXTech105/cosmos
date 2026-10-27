SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.PurchaseBillItems','InventoryOwner') IS NULL ALTER TABLE dbo.PurchaseBillItems ADD InventoryOwner INT NOT NULL CONSTRAINT DF_PBI_InventoryOwner DEFAULT(1) CONSTRAINT CK_PBI_InventoryOwner CHECK(InventoryOwner IN(1,2));
IF COL_LENGTH('dbo.PurchaseBillItems','PurchaseOrderLineId') IS NULL ALTER TABLE dbo.PurchaseBillItems ADD PurchaseOrderLineId BIGINT NULL REFERENCES dbo.PurchaseOrderItems(Id);
IF OBJECT_ID('dbo.PurchasePhysicalReceipts','U') IS NULL
CREATE TABLE dbo.PurchasePhysicalReceipts(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,PurchaseOrderId BIGINT NOT NULL REFERENCES dbo.PurchaseOrders(Id),
 SupplierId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Parties(Id),BusinessDate DATE NOT NULL,SourceReference NVARCHAR(100) NOT NULL,
 AttachmentReference NVARCHAR(1000) NULL,CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),RowVersion ROWVERSION,
 CONSTRAINT UQ_PPR_Source UNIQUE(CompanyKey,PurchaseOrderId,SourceReference));
IF OBJECT_ID('dbo.PurchasePhysicalReceiptLines','U') IS NULL
CREATE TABLE dbo.PurchasePhysicalReceiptLines(
 Id BIGINT IDENTITY PRIMARY KEY,ReceiptId BIGINT NOT NULL REFERENCES dbo.PurchasePhysicalReceipts(Id),
 PurchaseOrderLineId BIGINT NOT NULL REFERENCES dbo.PurchaseOrderItems(Id),ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),
 UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id),AcceptedQuantity DECIMAL(22,6) NOT NULL CHECK(AcceptedQuantity>=0),
 RejectedQuantity DECIMAL(22,6) NOT NULL CHECK(RejectedQuantity>=0),QuarantinedQuantity DECIMAL(22,6) NOT NULL CHECK(QuarantinedQuantity>=0),
 ReturnedAcceptedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,ReturnedRejectedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,
 ReturnedQuarantinedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,SourceUnitCost DECIMAL(18,2) NULL,
 CONSTRAINT UQ_PPRL_Line UNIQUE(ReceiptId,PurchaseOrderLineId),
 CHECK(ReturnedAcceptedQuantity BETWEEN 0 AND AcceptedQuantity AND ReturnedRejectedQuantity BETWEEN 0 AND RejectedQuantity AND ReturnedQuarantinedQuantity BETWEEN 0 AND QuarantinedQuantity));
IF OBJECT_ID('dbo.PurchaseBillReceiptLinks','U') IS NULL
CREATE TABLE dbo.PurchaseBillReceiptLinks(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,ReceiptLineId BIGINT NOT NULL REFERENCES dbo.PurchasePhysicalReceiptLines(Id),
 BillItemId BIGINT NOT NULL REFERENCES dbo.PurchaseBillItems(Id),Quantity DECIMAL(22,6) NOT NULL CHECK(Quantity>0),
 CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_PBRL_Line UNIQUE(CompanyKey,ReceiptLineId,BillItemId));
IF OBJECT_ID('dbo.PurchasePhysicalReturns','U') IS NULL
CREATE TABLE dbo.PurchasePhysicalReturns(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,ReceiptLineId BIGINT NOT NULL REFERENCES dbo.PurchasePhysicalReceiptLines(Id),
 BusinessDate DATE NOT NULL,AcceptedQuantity DECIMAL(22,6) NOT NULL,RejectedQuantity DECIMAL(22,6) NOT NULL,
 QuarantinedQuantity DECIMAL(22,6) NOT NULL,Reason NVARCHAR(1000) NOT NULL,CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.PurchasePromiseHistory','U') IS NULL
CREATE TABLE dbo.PurchasePromiseHistory(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,PurchaseOrderId BIGINT NOT NULL REFERENCES dbo.PurchaseOrders(Id),
 PreviousDate DATE NULL,ExpectedDate DATE NOT NULL,Reason NVARCHAR(1000) NOT NULL,CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchasePhysical_Command @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Action NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.action'),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@State INT,@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),
 @Supplier UNIQUEIDENTIFIER,@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048),@ResultId BIGINT,@Physical UNIQUEIDENTIFIER=NEWID();
 IF NULLIF(@Key,N'') IS NULL THROW 51100,N'INVALID_KEY|An idempotency key is required.',1;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Prior; RETURN; END;
 IF @Action IN(N'purchase-receipt',N'purchase-promise',N'purchase-approve',N'purchase-close')
  SELECT @Current=RowVersion,@State=Status,@Supplier=SupplierId FROM dbo.PurchaseOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
 ELSE IF @Action=N'purchase-bill-links'
  SELECT @Current=RowVersion,@State=Status,@Supplier=SupplierId FROM dbo.PurchaseBills WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
 ELSE IF @Action=N'purchase-return'
  SELECT @Current=RowVersion,@Supplier=SupplierId FROM dbo.PurchasePhysicalReceipts WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 ELSE THROW 51100,N'INVALID_ACTION|Unknown purchasing physical command.',1;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|The source purchase document was not found in this catalog.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the purchase source before posting.'; THROW 51109,@Err,1; END;
 IF @Action=N'purchase-receipt'
 BEGIN
  IF @State NOT IN(1,2,3) OR @Supplier<>TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.request.supplierId')) OR @Date IS NULL THROW 51109,N'INVALID_RECEIPT_SOURCE|An open real PO, matching supplier and receipt business date are required.',1;
  DECLARE @Lines TABLE(PurchaseOrderLineId BIGINT PRIMARY KEY,ItemId BIGINT,UnitId BIGINT,AcceptedQuantity DECIMAL(22,6),RejectedQuantity DECIMAL(22,6),QuarantinedQuantity DECIMAL(22,6),SourceUnitCost DECIMAL(18,2));
  INSERT @Lines SELECT * FROM OPENJSON(@RequestJson,'$.request.lines') WITH(PurchaseOrderLineId BIGINT '$.purchaseOrderLineId',ItemId BIGINT '$.itemId',UnitId BIGINT '$.unitId',AcceptedQuantity DECIMAL(22,6) '$.acceptedQuantity',RejectedQuantity DECIMAL(22,6) '$.rejectedQuantity',QuarantinedQuantity DECIMAL(22,6) '$.quarantinedQuantity',SourceUnitCost DECIMAL(18,2) '$.sourceUnitCost');
  IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.PurchaseOrderItems p ON p.Id=l.PurchaseOrderLineId AND p.PurchaseOrderId=@Id AND p.IsDeleted=0 LEFT JOIN dbo.Items i ON i.Id=l.ItemId WHERE p.Id IS NULL OR p.ItemId<>l.ItemId OR COALESCE(p.UnitId,i.UnitId)<>l.UnitId OR i.UnitId<>l.UnitId OR i.IsDeleted=1 OR i.IsActive=0 OR i.TrackInventory=0 OR l.AcceptedQuantity<0 OR l.RejectedQuantity<0 OR l.QuarantinedQuantity<0 OR l.AcceptedQuantity+l.RejectedQuantity+l.QuarantinedQuantity<=0) THROW 51100,N'INVALID_RECEIPT_LINES|Verify original PO line, Item, base unit and explicit disposition quantities.',1;
  IF EXISTS(SELECT 1 FROM @Lines l JOIN dbo.PurchaseOrderItems p ON p.Id=l.PurchaseOrderLineId OUTER APPLY(SELECT SUM(x.AcceptedQuantity) Qty FROM dbo.PurchasePhysicalReceiptLines x JOIN dbo.PurchasePhysicalReceipts h ON h.Id=x.ReceiptId WHERE x.PurchaseOrderLineId=p.Id AND h.CompanyKey=@CompanyKey) a WHERE COALESCE(a.Qty,0)+l.AcceptedQuantity>p.Quantity) THROW 51109,N'OVER_RECEIPT|Accepted quantity exceeds ordered remainder. Permitted over-receipt tolerance is zero.',1;
  IF EXISTS(SELECT 1 FROM dbo.PurchasePhysicalReceipts WHERE CompanyKey=@CompanyKey AND PurchaseOrderId=@Id AND SourceReference=JSON_VALUE(@RequestJson,'$.request.sourceReference')) THROW 51109,N'DUPLICATE_RECEIPT_REFERENCE|The same supplier receipt event has already been recorded.',1;
  INSERT dbo.PurchasePhysicalReceipts(CompanyKey,PurchaseOrderId,SupplierId,BusinessDate,SourceReference,AttachmentReference,CreatedBy) VALUES(@CompanyKey,@Id,@Supplier,@Date,JSON_VALUE(@RequestJson,'$.request.sourceReference'),JSON_VALUE(@RequestJson,'$.request.attachmentReference'),@UserId); SET @ResultId=SCOPE_IDENTITY();
  INSERT dbo.PurchasePhysicalReceiptLines(ReceiptId,PurchaseOrderLineId,ItemId,UnitId,AcceptedQuantity,RejectedQuantity,QuarantinedQuantity,SourceUnitCost) SELECT @ResultId,PurchaseOrderLineId,ItemId,UnitId,AcceptedQuantity,RejectedQuantity,QuarantinedQuantity,SourceUnitCost FROM @Lines;
  DECLARE @LockItem BIGINT;
  DECLARE receipt_locks CURSOR LOCAL FAST_FORWARD FOR SELECT DISTINCT ItemId FROM @Lines ORDER BY ItemId;
  OPEN receipt_locks; FETCH NEXT FROM receipt_locks INTO @LockItem;
  WHILE @@FETCH_STATUS=0 BEGIN SELECT @LockItem=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LockItem; FETCH NEXT FROM receipt_locks INTO @LockItem; END; CLOSE receipt_locks; DEALLOCATE receipt_locks;
  UPDATE i SET CurrentStock=i.CurrentStock+x.Qty,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN(SELECT ItemId,SUM(AcceptedQuantity) Qty FROM @Lines GROUP BY ItemId) x ON x.ItemId=i.Id;
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,CreatedBy) SELECT ItemId,N'PurchasePhysicalReceipt',@ResultId,Id,@Physical,@CompanyKey,@Date,3,AcceptedQuantity,@UserId FROM dbo.PurchasePhysicalReceiptLines WHERE ReceiptId=@ResultId AND AcceptedQuantity>0;
  UPDATE dbo.PurchaseOrders SET Status=CASE WHEN EXISTS(SELECT 1 FROM dbo.PurchasePhysicalReceiptLines l JOIN dbo.PurchasePhysicalReceipts h ON h.Id=l.ReceiptId WHERE h.PurchaseOrderId=@Id AND l.AcceptedQuantity>0) THEN 3 ELSE Status END,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  SELECT @Current=RowVersion FROM dbo.PurchasePhysicalReceipts WHERE Id=@ResultId;
 END
 ELSE IF @Action=N'purchase-bill-links'
 BEGIN
  IF @State<>1 THROW 51109,N'BILL_ALREADY_POSTED|Link actual receipts before confirming a bill; existing bill postings require reconciliation.',1;
  DECLARE @Links TABLE(ReceiptLineId BIGINT,BillItemId BIGINT,Quantity DECIMAL(22,6),PRIMARY KEY(ReceiptLineId,BillItemId));
  INSERT @Links SELECT * FROM OPENJSON(@RequestJson,'$.request.lines') WITH(ReceiptLineId BIGINT '$.receiptLineId',BillItemId BIGINT '$.billItemId',Quantity DECIMAL(22,6) '$.quantity');
  IF NOT EXISTS(SELECT 1 FROM @Links) OR EXISTS(SELECT 1 FROM @Links l LEFT JOIN dbo.PurchaseBillItems b ON b.Id=l.BillItemId AND b.PurchaseBillId=@Id AND b.IsDeleted=0 LEFT JOIN dbo.PurchasePhysicalReceiptLines r ON r.Id=l.ReceiptLineId LEFT JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId AND h.CompanyKey=@CompanyKey WHERE b.Id IS NULL OR h.Id IS NULL OR b.ItemId<>r.ItemId OR COALESCE(b.UnitId,r.UnitId)<>r.UnitId OR h.SupplierId<>@Supplier OR l.Quantity<=0) THROW 51100,N'INVALID_RECEIPT_BILL_LINK|Match real supplier, Item, base unit and bill/receipt line identities.',1;
  IF EXISTS(SELECT 1 FROM @Links l JOIN dbo.PurchasePhysicalReceiptLines r ON r.Id=l.ReceiptLineId OUTER APPLY(SELECT SUM(x.Quantity) Qty FROM dbo.PurchaseBillReceiptLinks x JOIN dbo.PurchaseBillItems bi ON bi.Id=x.BillItemId JOIN dbo.PurchaseBills bh ON bh.Id=bi.PurchaseBillId WHERE x.CompanyKey=@CompanyKey AND x.ReceiptLineId=r.Id AND bh.Status<>5 AND bi.IsDeleted=0) old WHERE COALESCE(old.Qty,0)+(SELECT SUM(Quantity) FROM @Links WHERE ReceiptLineId=r.Id)>r.AcceptedQuantity) THROW 51109,N'RECEIPT_ALREADY_BILLED|Linked invoice quantity exceeds accepted physical receipt quantity.',1;
  IF EXISTS(SELECT 1 FROM @Links l JOIN dbo.PurchaseBillItems b ON b.Id=l.BillItemId OUTER APPLY(SELECT SUM(Quantity) Qty FROM dbo.PurchaseBillReceiptLinks WHERE CompanyKey=@CompanyKey AND BillItemId=b.Id) old WHERE COALESCE(old.Qty,0)+(SELECT SUM(Quantity) FROM @Links WHERE BillItemId=b.Id)<>b.Quantity) THROW 51109,N'BILL_QUANTITY_MISMATCH|Each receipt-owned bill line must be fully reconciled to physical receipts.',1;
  INSERT dbo.PurchaseBillReceiptLinks(CompanyKey,ReceiptLineId,BillItemId,Quantity,CreatedBy) SELECT @CompanyKey,ReceiptLineId,BillItemId,Quantity,@UserId FROM @Links;
  UPDATE b SET InventoryOwner=2 FROM dbo.PurchaseBillItems b JOIN @Links l ON l.BillItemId=b.Id;
  UPDATE dbo.PurchaseBills SET UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  SET @ResultId=@Id; SELECT @Current=RowVersion FROM dbo.PurchaseBills WHERE Id=@Id;
 END
 ELSE IF @Action=N'purchase-return'
 BEGIN
  DECLARE @Line BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.receiptLineId')),@Accepted DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.acceptedQuantity')),
   @Rejected DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.rejectedQuantity')),@Quarantine DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.quarantinedQuantity')),@Item BIGINT;
  IF @Date IS NULL OR @Accepted<0 OR @Rejected<0 OR @Quarantine<0 OR @Accepted+@Rejected+@Quarantine<=0 THROW 51100,N'INVALID_RETURN|A business date and positive original dispositions are required.',1;
  SELECT @Item=ItemId FROM dbo.PurchasePhysicalReceiptLines WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Line AND ReceiptId=@Id AND AcceptedQuantity-ReturnedAcceptedQuantity>=@Accepted AND RejectedQuantity-ReturnedRejectedQuantity>=@Rejected AND QuarantinedQuantity-ReturnedQuarantinedQuantity>=@Quarantine;
  IF @Item IS NULL THROW 51109,N'RETURN_EXCEEDS_RECEIPT|Returnable balance is insufficient for the selected original receipt line.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Item AND CurrentStock-ReservedStock>=@Accepted) THROW 51109,N'RETURN_STOCK_UNAVAILABLE|Accepted stock has already been reserved or consumed.',1;
  INSERT dbo.PurchasePhysicalReturns(CompanyKey,ReceiptLineId,BusinessDate,AcceptedQuantity,RejectedQuantity,QuarantinedQuantity,Reason,CreatedBy) VALUES(@CompanyKey,@Line,@Date,@Accepted,@Rejected,@Quarantine,JSON_VALUE(@RequestJson,'$.request.reason'),@UserId); SET @ResultId=SCOPE_IDENTITY();
  UPDATE dbo.PurchasePhysicalReceiptLines SET ReturnedAcceptedQuantity=ReturnedAcceptedQuantity+@Accepted,ReturnedRejectedQuantity=ReturnedRejectedQuantity+@Rejected,ReturnedQuarantinedQuantity=ReturnedQuarantinedQuantity+@Quarantine WHERE Id=@Line;
  UPDATE dbo.Items SET CurrentStock=CurrentStock-@Accepted,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Item;
  IF @Accepted>0 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,CreatedBy) VALUES(@Item,N'PurchasePhysicalReturn',@ResultId,@Line,@Physical,@CompanyKey,@Date,4,-@Accepted,@UserId);
  UPDATE dbo.PurchasePhysicalReceipts SET SourceReference=SourceReference WHERE Id=@Id AND CompanyKey=@CompanyKey;
  SELECT @Current=RowVersion FROM dbo.PurchasePhysicalReceipts WHERE Id=@Id;
 END
 ELSE IF @Action=N'purchase-close'
 BEGIN
  IF @State NOT IN(1,2,3) THROW 51109,N'INVALID_PURCHASE_CLOSE|Only the open unreceived PO remainder may be closed.',1;
  UPDATE dbo.PurchaseOrders SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  SET @ResultId=@Id;SELECT @Current=RowVersion FROM dbo.PurchaseOrders WHERE Id=@Id;
 END
 ELSE IF @Action=N'purchase-approve'
 BEGIN
  IF @State<>1 THROW 51109,N'INVALID_PURCHASE_APPROVAL|Only a draft purchase order can be approved into the existing Sent state.',1;
  UPDATE dbo.PurchaseOrders SET Status=2,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
  SET @ResultId=@Id;SELECT @Current=RowVersion FROM dbo.PurchaseOrders WHERE Id=@Id;
 END
 ELSE IF @Action=N'purchase-promise'
 BEGIN
  DECLARE @Expected DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.expectedDate'));
  IF @Expected IS NULL OR @State IN(4,5) THROW 51109,N'INVALID_PROMISE|Only open purchase orders can receive a revised promised date.',1;
  INSERT dbo.PurchasePromiseHistory(CompanyKey,PurchaseOrderId,PreviousDate,ExpectedDate,Reason,CreatedBy) SELECT @CompanyKey,@Id,ExpectedDeliveryDate,@Expected,JSON_VALUE(@RequestJson,'$.request.reason'),@UserId FROM dbo.PurchaseOrders WHERE Id=@Id;
  UPDATE dbo.PurchaseOrders SET ExpectedDeliveryDate=@Expected,UpdatedBy=@UserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id;
  SET @ResultId=@Id; SELECT @Current=RowVersion FROM dbo.PurchaseOrders WHERE Id=@Id;
 END;
 SET @Data=(SELECT @ResultId Id,CONVERT(VARCHAR(18),@Current,1) Version,CASE @Action WHEN N'purchase-close' THEN N'RemainderClosed' WHEN N'purchase-approve' THEN N'Sent' WHEN N'purchase-promise' THEN N'PromiseRevised' WHEN N'purchase-bill-links' THEN N'Linked' ELSE N'Posted' END Status FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,@Action,@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
