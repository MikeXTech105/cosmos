SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.PurchaseReturns','PhysicalReceiptReturnId') IS NULL ALTER TABLE dbo.PurchaseReturns ADD PhysicalReceiptReturnId BIGINT NULL REFERENCES dbo.PurchasePhysicalReturns(Id);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PurchaseReturns') AND name=N'UX_PurchaseReturn_PhysicalCredit') CREATE UNIQUE INDEX UX_PurchaseReturn_PhysicalCredit ON dbo.PurchaseReturns(PhysicalReceiptReturnId) WHERE PhysicalReceiptReturnId IS NOT NULL AND IsDeleted=0;
GO
/* Physical return owns stock-out. This command creates the existing PurchaseReturn financial
   document/party ledger from its actually billed line, without another inventory movement.
   Unbilled rejected/quarantine goods have no invented supplier credit or cost. */
CREATE OR ALTER PROCEDURE dbo.sp_PurchasePhysical_ReturnCredit @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Return BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Line BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.billItemId')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),
 @ReceiptLine BIGINT,@Supplier UNIQUEIDENTIFIER,@Bill BIGINT,@Item BIGINT,@Unit BIGINT,@Qty DECIMAL(22,6),@Price DECIMAL(18,2),@Discount DECIMAL(18,2),@DiscountPercent DECIMAL(9,4),@TaxPercent DECIMAL(9,4),@Sub DECIMAL(18,2),@Tax DECIMAL(18,2),@Grand DECIMAL(18,2),@Id BIGINT,@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX);
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @ReceiptLine=r.ReceiptLineId,@Qty=r.AcceptedQuantity,@Supplier=h.SupplierId,@Item=l.ItemId,@Unit=l.UnitId FROM dbo.PurchasePhysicalReturns r JOIN dbo.PurchasePhysicalReceiptLines l ON l.Id=r.ReceiptLineId JOIN dbo.PurchasePhysicalReceipts h ON h.Id=l.ReceiptId WHERE r.Id=@Return AND r.CompanyKey=@CompanyKey AND h.CompanyKey=@CompanyKey;
 IF @ReceiptLine IS NULL OR @Qty<=0 THROW 51109,N'NO_BILLED_ACCEPTED_RETURN|A real accepted-goods physical return is required for a financial credit.',1;
 SELECT @Bill=b.PurchaseBillId,@Price=b.PurchasePrice,@Discount=ROUND(b.DiscountAmount*@Qty/NULLIF(b.Quantity,0),2),@DiscountPercent=b.DiscountPercentage,@TaxPercent=b.TaxPercentage FROM dbo.PurchaseBillItems b JOIN dbo.PurchaseBills h ON h.Id=b.PurchaseBillId AND h.SupplierId=@Supplier AND h.IsDeleted=0 AND h.Status IN(2,3,4) WHERE b.Id=@Line AND b.ItemId=@Item AND COALESCE(b.UnitId,@Unit)=@Unit AND b.InventoryOwner=2 AND b.IsDeleted=0;
 IF @Bill IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.PurchaseBillReceiptLinks WHERE ReceiptLineId=@ReceiptLine AND BillItemId=@Line AND CompanyKey=@CompanyKey) THROW 51109,N'BILLED_RECEIPT_LINK_REQUIRED|Reference the confirmed bill line that actually invoiced this physical receipt.',1;
 IF @Date IS NULL OR @Date<(SELECT BusinessDate FROM dbo.PurchasePhysicalReturns WHERE Id=@Return) THROW 51100,N'INVALID_CREDIT_DATE|Credit cannot predate its physical return.',1;
 IF EXISTS(SELECT 1 FROM dbo.PurchaseReturns WHERE PhysicalReceiptReturnId=@Return AND IsDeleted=0) THROW 51109,N'RETURN_ALREADY_CREDITED|This physical return already has its financial credit.',1;
 IF @Qty+COALESCE((SELECT SUM(ri.Quantity) FROM dbo.PurchaseReturnItems ri JOIN dbo.PurchaseReturns pr ON pr.Id=ri.PurchaseReturnId AND pr.IsDeleted=0 JOIN dbo.PurchasePhysicalReturns oldr ON oldr.Id=pr.PhysicalReceiptReturnId WHERE ri.PurchaseBillItemId=@Line AND ri.IsDeleted=0 AND oldr.ReceiptLineId=@ReceiptLine),0)>(SELECT SUM(Quantity) FROM dbo.PurchaseBillReceiptLinks WHERE CompanyKey=@CompanyKey AND ReceiptLineId=@ReceiptLine AND BillItemId=@Line) THROW 51109,N'CREDIT_QUANTITY_EXCEEDED|Returned credit exceeds the quantity actually billed from this receipt.',1;
 SET @Sub=ROUND(@Qty*@Price,2)-@Discount;SET @Tax=ROUND(@Sub*@TaxPercent/100,2);SET @Grand=@Sub+@Tax;
 DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
 SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'PurchaseReturn';
 IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'PurchaseReturn',N'PR-',2,6);SET @Next=1;SET @Prefix=N'PR-';SET @Padding=6;END
 ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'PurchaseReturn';
 INSERT dbo.PurchaseReturns(PurchaseReturnNo,PurchaseBillId,SupplierId,ReturnDate,Reason,SubTotal,TaxAmount,GrandTotal,CreatedBy,PhysicalReceiptReturnId) VALUES(@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@Next),@Padding),@Bill,@Supplier,@Date,JSON_VALUE(@RequestJson,'$.request.reason'),@Sub,@Tax,@Grand,@UserId,@Return);SET @Id=SCOPE_IDENTITY();
 INSERT dbo.PurchaseReturnItems(PurchaseReturnId,PurchaseBillItemId,ItemId,ItemNameSnapshot,Quantity,UnitId,UnitNameSnapshot,PurchasePrice,DiscountPercentage,DiscountAmount,TaxPercentage,TaxAmount,LineTotal,CreatedBy)
 SELECT @Id,@Line,@Item,i.Name,@Qty,@Unit,u.Name,@Price,@DiscountPercent,@Discount,@TaxPercent,@Tax,@Grand,@UserId FROM dbo.Items i JOIN dbo.Units u ON u.Id=@Unit WHERE i.Id=@Item;
 INSERT dbo.PartyLedgerEntries(PartyId,EntryDate,SourceType,SourceId,EntryType,Amount,CreatedBy) VALUES(@Supplier,@Date,N'PurchaseReturn',@Id,N'PurchaseReturn',-@Grand,@UserId);
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'FinancialCredit' Status FROM dbo.PurchaseReturns WHERE Id=@Id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'ReceiptReturnFinancialCredit',@Id,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
/* Linked financial credits cannot use legacy edit/delete paths that restore inventory. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX);
DECLARE credit_guards CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_PurchaseReturn_Save'),(N'sp_PurchaseReturn_Delete')) x(Name);
OPEN credit_guards;FETCH NEXT FROM credit_guards INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF CHARINDEX(N'RECEIPT_CREDIT_IMMUTABLE',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'BEGIN TRY',N'BEGIN TRY /* RECEIPT_CREDIT_IMMUTABLE */ IF EXISTS(SELECT 1 FROM dbo.PurchaseReturns WHERE Id=@Id AND PhysicalReceiptReturnId IS NOT NULL) BEGIN SELECT 409 StatusCode,N''A physical-return credit preserves its audit; use an approved financial correction instead of a stock-restoring edit/delete.'' Message;RETURN;END;');
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM credit_guards INTO @Name;
END;
CLOSE credit_guards;DEALLOCATE credit_guards;
GO
