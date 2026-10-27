SET XACT_ABORT ON;
GO
/* Called inside the existing whole-PO conversion transaction. A whole conversion
   continues to mean receipt of the remaining accepted quantity, plus the financial bill.
   Earlier partial accepted receipts are linked, never received a second time. */
CREATE OR ALTER PROCEDURE dbo.sp_PurchasePhysical_ConvertReceipt @PurchaseOrderId BIGINT,@BillId BIGINT,@UserId BIGINT AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @CompanyKey NVARCHAR(64)=CONVERT(NVARCHAR(64),SESSION_CONTEXT(N'Cosmos.CompanyKey')),
 @Supplier UNIQUEIDENTIFIER,@Date DATE,@Receipt BIGINT,@Physical UNIQUEIDENTIFIER=NEWID();
 IF NULLIF(@CompanyKey,N'') IS NULL THROW 51109,N'CATALOG_COMPANY_REQUIRED|Configure the trusted catalog company key before physical conversion.',1;
 SELECT @Supplier=SupplierId,@Date=BillDate FROM dbo.PurchaseBills WHERE Id=@BillId;
 SELECT p.Id PurchaseOrderLineId,p.ItemId,COALESCE(p.UnitId,i.UnitId) UnitId,p.Quantity-COALESCE(a.Accepted,0) Remaining,p.PurchasePrice
 INTO #Remaining FROM dbo.PurchaseOrderItems p JOIN dbo.Items i ON i.Id=p.ItemId
 OUTER APPLY(SELECT SUM(r.AcceptedQuantity) Accepted FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId AND h.CompanyKey=@CompanyKey WHERE r.PurchaseOrderLineId=p.Id) a
 WHERE p.PurchaseOrderId=@PurchaseOrderId AND p.IsDeleted=0;
 IF EXISTS(SELECT 1 FROM #Remaining WHERE Remaining<0) THROW 51109,N'PO_RECONCILIATION_REQUIRED|Accepted receipts exceed the source PO quantity.',1;
 IF EXISTS(SELECT 1 FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId JOIN dbo.PurchaseBillReceiptLinks l ON l.ReceiptLineId=r.Id JOIN dbo.PurchaseBillItems bi ON bi.Id=l.BillItemId JOIN dbo.PurchaseBills b ON b.Id=bi.PurchaseBillId WHERE h.PurchaseOrderId=@PurchaseOrderId AND h.CompanyKey=@CompanyKey AND b.Status<>5) THROW 51109,N'PARTIAL_RECEIPTS_ALREADY_BILLED|Use explicit remaining bill lines; whole-PO conversion would duplicate financial billing.',1;
 IF EXISTS(SELECT 1 FROM #Remaining WHERE Remaining>0)
 BEGIN
  INSERT dbo.PurchasePhysicalReceipts(CompanyKey,PurchaseOrderId,SupplierId,BusinessDate,SourceReference,CreatedBy) VALUES(@CompanyKey,@PurchaseOrderId,@Supplier,@Date,N'WholePOBill:'+CONVERT(NVARCHAR(30),@BillId),@UserId); SET @Receipt=SCOPE_IDENTITY();
  INSERT dbo.PurchasePhysicalReceiptLines(ReceiptId,PurchaseOrderLineId,ItemId,UnitId,AcceptedQuantity,RejectedQuantity,QuarantinedQuantity,SourceUnitCost) SELECT @Receipt,PurchaseOrderLineId,ItemId,UnitId,Remaining,0,0,PurchasePrice FROM #Remaining WHERE Remaining>0;
  DECLARE @Item BIGINT;
  DECLARE convert_locks CURSOR LOCAL FAST_FORWARD FOR SELECT DISTINCT ItemId FROM #Remaining ORDER BY ItemId;
  OPEN convert_locks; FETCH NEXT FROM convert_locks INTO @Item;
  WHILE @@FETCH_STATUS=0 BEGIN SELECT @Item=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Item; FETCH NEXT FROM convert_locks INTO @Item; END; CLOSE convert_locks; DEALLOCATE convert_locks;
  UPDATE i SET CurrentStock=i.CurrentStock+x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN(SELECT ItemId,SUM(Remaining) Quantity FROM #Remaining GROUP BY ItemId) x ON x.ItemId=i.Id WHERE i.ItemType=1 AND i.TrackInventory=1;
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,CreatedBy)
  SELECT r.ItemId,N'PurchasePhysicalReceipt',@Receipt,r.Id,@Physical,@CompanyKey,@Date,3,r.AcceptedQuantity,@UserId FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.Items i ON i.Id=r.ItemId WHERE r.ReceiptId=@Receipt AND i.ItemType=1 AND i.TrackInventory=1;
 END;
 INSERT dbo.PurchaseBillReceiptLinks(CompanyKey,ReceiptLineId,BillItemId,Quantity,CreatedBy)
 SELECT @CompanyKey,r.Id,b.Id,r.AcceptedQuantity,@UserId FROM dbo.PurchasePhysicalReceiptLines r JOIN dbo.PurchasePhysicalReceipts h ON h.Id=r.ReceiptId AND h.CompanyKey=@CompanyKey
 JOIN dbo.PurchaseBillItems b ON b.PurchaseBillId=@BillId AND b.PurchaseOrderLineId=r.PurchaseOrderLineId AND b.IsDeleted=0 WHERE h.PurchaseOrderId=@PurchaseOrderId AND r.AcceptedQuantity>0;
 IF EXISTS(SELECT 1 FROM dbo.PurchaseBillItems b OUTER APPLY(SELECT SUM(Quantity) Qty FROM dbo.PurchaseBillReceiptLinks WHERE BillItemId=b.Id AND CompanyKey=@CompanyKey) l WHERE b.PurchaseBillId=@BillId AND b.IsDeleted=0 AND b.Quantity<>COALESCE(l.Qty,0)) THROW 51109,N'RECEIPT_BILL_RECONCILIATION|Every converted bill line must reconcile to accepted physical receipt lines.',1;
 UPDATE dbo.PurchaseBillItems SET InventoryOwner=2 WHERE PurchaseBillId=@BillId AND IsDeleted=0;
END;
GO
/* Preserve the deployed financial/tax conversion definition and replace its physical owner only. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_PurchaseOrder_Convert')),@Start INT,@Finish INT;
IF CHARINDEX(N'sp_PurchasePhysical_ConvertReceipt',@Definition)=0
BEGIN
 SET @Start=CHARINDEX(N'UPDATE i SET CurrentStock=',@Definition);
 SET @Finish=CHARINDEX(N'INSERT dbo.PartyLedgerEntries',@Definition,@Start);
 IF @Start=0 OR @Finish=0 THROW 51100,N'PURCHASE_CONVERSION_PATCH_PREFLIGHT|Review the deployed whole-PO conversion before applying physical ownership.',1;
 SET @Definition=STUFF(@Definition,@Start,@Finish-@Start,N'EXEC dbo.sp_PurchasePhysical_ConvertReceipt @PurchaseOrderId=@Id,@BillId=@BillId,@UserId=@UserId; ');
 SET @Definition=REPLACE(@Definition,N'LineTotal,CreatedBy) SELECT @BillId',N'LineTotal,CreatedBy,PurchaseOrderLineId) SELECT @BillId');
 SET @Definition=REPLACE(@Definition,N'LineTotal,CreatedBy)SELECT @BillId',N'LineTotal,CreatedBy,PurchaseOrderLineId)SELECT @BillId');
 SET @Definition=REPLACE(@Definition,N'LineTotal,@UserId FROM dbo.PurchaseOrderItems',N'LineTotal,@UserId,Id FROM dbo.PurchaseOrderItems');
 IF CHARINDEX(N'CreatedBy,PurchaseOrderLineId)',@Definition)=0 THROW 51100,N'PURCHASE_LINE_PATCH_PREFLIGHT|Source PO line identity could not be carried into converted bill items.',1;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_Confirm @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @Status INT,@Date DATE,@Physical UNIQUEIDENTIFIER=NEWID();
 SELECT @Status=Status,@Date=BillDate FROM dbo.PurchaseBills WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
 IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Purchase bill was not found.' Message;RETURN;END;
 IF @Status<>1 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only draft purchase bills can be confirmed.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.PurchaseBillItems b OUTER APPLY(SELECT SUM(Quantity) Qty FROM dbo.PurchaseBillReceiptLinks WHERE BillItemId=b.Id) x WHERE b.PurchaseBillId=@Id AND b.IsDeleted=0 AND b.InventoryOwner=2 AND COALESCE(x.Qty,0)<>b.Quantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Receipt-owned bill lines must fully match accepted physical receipts.' Message;RETURN;END;
 UPDATE i SET CurrentStock=i.CurrentStock+x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i WITH(UPDLOCK,HOLDLOCK) JOIN(SELECT ItemId,SUM(Quantity) Quantity FROM dbo.PurchaseBillItems WHERE PurchaseBillId=@Id AND IsDeleted=0 AND InventoryOwner=1 GROUP BY ItemId) x ON x.ItemId=i.Id WHERE i.ItemType=1 AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,BusinessDate,MovementType,Quantity,CreatedBy)
 SELECT b.ItemId,N'PurchaseBill',@Id,b.Id,@Physical,@Date,3,b.Quantity,@UserId FROM dbo.PurchaseBillItems b JOIN dbo.Items i ON i.Id=b.ItemId WHERE b.PurchaseBillId=@Id AND b.IsDeleted=0 AND b.InventoryOwner=1 AND i.ItemType=1 AND i.TrackInventory=1;
 INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy) SELECT SupplierId,BillDate,N'PurchaseBill',Id,N'Purchase',GrandTotal,@UserId FROM dbo.PurchaseBills WHERE Id=@Id;
 INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy) SELECT SupplierId,BillDate,N'PurchaseBill',Id,N'PaymentOut',-PaidAmount,@UserId FROM dbo.PurchaseBills WHERE Id=@Id AND PaidAmount>0;
 UPDATE dbo.PurchaseBills SET Status=IIF(BalanceAmount=0,4,IIF(PaidAmount>0,3,2)),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 COMMIT; SELECT 200 StatusCode,N'Purchase bill confirmed; receipt-linked lines do not post inventory again.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_PurchaseBill_Cancel @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
 DECLARE @Status INT,@Date DATE,@Physical UNIQUEIDENTIFIER=NEWID();
 SELECT @Status=Status,@Date=BillDate FROM dbo.PurchaseBills WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0;
 IF @Status IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Purchase bill was not found.' Message;RETURN;END;
 IF @Status=5 BEGIN ROLLBACK;SELECT 409 StatusCode,N'Purchase bill is already cancelled.' Message;RETURN;END;
 IF @Status IN(2,3,4)
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.Items i WITH(UPDLOCK,HOLDLOCK) JOIN(SELECT ItemId,SUM(Quantity) Qty FROM dbo.StockMovements WHERE SourceType=N'PurchaseBill' AND SourceId=@Id GROUP BY ItemId HAVING SUM(Quantity)>0) x ON x.ItemId=i.Id WHERE i.CurrentStock-i.ReservedStock<x.Qty) BEGIN ROLLBACK;SELECT 409 StatusCode,N'Purchased physical stock is no longer available for cancellation.' Message;RETURN;END;
  UPDATE i SET CurrentStock=i.CurrentStock-x.Quantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN(SELECT ItemId,SUM(Quantity) Quantity FROM dbo.StockMovements WHERE SourceType=N'PurchaseBill' AND SourceId=@Id GROUP BY ItemId HAVING SUM(Quantity)>0) x ON x.ItemId=i.Id;
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,BusinessDate,MovementType,Quantity,CreatedBy)
  SELECT ItemId,N'PurchaseBill',@Id,COALESCE(SourceLineId,0),@Physical,@Date,4,-SUM(Quantity),@UserId FROM dbo.StockMovements WHERE SourceType=N'PurchaseBill' AND SourceId=@Id GROUP BY ItemId,COALESCE(SourceLineId,0) HAVING SUM(Quantity)>0;
  UPDATE dbo.PartyLedgerEntries SET IsDeleted=1 WHERE SourceType=N'PurchaseBill' AND SourceId=@Id AND IsDeleted=0;
 END;
 UPDATE dbo.PurchaseBills SET Status=5,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 COMMIT;SELECT 200 StatusCode,N'Purchase bill cancelled; physical receipts retain their own return history.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH;
END;
GO
/* Protect linked document lines from being replaced by legacy draft-edit TVPs. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Guard NVARCHAR(MAX),@Start INT;
DECLARE linked_edit_guards CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_SalesInvoice_Update'),(N'sp_PurchaseBill_Save'),(N'sp_PurchaseOrder_Save'),(N'sp_PurchaseReturn_Save')) x(Name);
OPEN linked_edit_guards;FETCH NEXT FROM linked_edit_guards INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name)); SET @Guard=NULL;
 IF CHARINDEX(N'PHYSICAL_OWNERSHIP_EDIT_GUARD',@Definition)=0
 BEGIN
  IF @Name=N'sp_SalesInvoice_Update' SET @Guard=N' IF EXISTS(SELECT 1 FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 AND InventoryOwner=2) BEGIN SELECT 409 StatusCode,N''PHYSICAL_OWNERSHIP_EDIT_GUARD: amend unlinked draft lines before declaring shipment ownership.'' Message;RETURN;END; ';
  IF @Name=N'sp_PurchaseBill_Save' SET @Guard=N' IF @Id IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.PurchaseBillItems WHERE PurchaseBillId=@Id AND IsDeleted=0 AND InventoryOwner=2) BEGIN SELECT 409 StatusCode,N''PHYSICAL_OWNERSHIP_EDIT_GUARD: receipt-linked bill lines cannot be replaced.'' Message;RETURN;END; ';
  IF @Name=N'sp_PurchaseOrder_Save' SET @Guard=N' IF @Id IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.PurchasePhysicalReceipts WHERE PurchaseOrderId=@Id) BEGIN SELECT 409 StatusCode,N''PHYSICAL_OWNERSHIP_EDIT_GUARD: received PO lines require an explicit reconciliation amendment; use promise history for date updates.'' Message;RETURN;END; ';
  IF @Name=N'sp_PurchaseReturn_Save' SET @Guard=N' IF EXISTS(SELECT 1 FROM @Items x JOIN dbo.PurchaseBillItems b ON b.Id=x.PurchaseBillItemId WHERE b.InventoryOwner=2) BEGIN SELECT 409 StatusCode,N''PHYSICAL_OWNERSHIP_EDIT_GUARD: return receipt-owned goods against the original physical receipt; financial credit reconciliation is separate.'' Message;RETURN;END; ';
  SET @Start=CHARINDEX(N'BEGIN TRY',UPPER(@Definition));
  IF @Start=0 THROW 51100,N'LINKED_EDIT_PATCH_PREFLIGHT|An expected document procedure shape changed.',1;
  SET @Definition=STUFF(@Definition,@Start+LEN(N'BEGIN TRY'),0,@Guard);
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
  EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM linked_edit_guards INTO @Name;
END;
CLOSE linked_edit_guards;DEALLOCATE linked_edit_guards;
GO
