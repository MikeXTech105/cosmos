SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.StockMovements','UnitIdSnapshot') IS NULL ALTER TABLE dbo.StockMovements ADD UnitIdSnapshot BIGINT NULL REFERENCES dbo.Units(Id);
IF COL_LENGTH('dbo.ManufacturingProductions','UnitIdSnapshot') IS NULL ALTER TABLE dbo.ManufacturingProductions ADD UnitIdSnapshot BIGINT NULL REFERENCES dbo.Units(Id);
IF COL_LENGTH('dbo.ShipmentItems','BaseUnitIdSnapshot') IS NULL ALTER TABLE dbo.ShipmentItems ADD BaseUnitIdSnapshot BIGINT NULL REFERENCES dbo.Units(Id);
GO
/* New events capture their actual posting unit; historical unknown units are not backfilled. */
CREATE OR ALTER TRIGGER dbo.tr_StockMovements_PostingSnapshots ON dbo.StockMovements AFTER INSERT AS
BEGIN
 SET NOCOUNT ON;
 UPDATE sm SET UnitIdSnapshot=COALESCE(sm.UnitIdSnapshot,i.UnitId),CompanyKey=COALESCE(sm.CompanyKey,CONVERT(NVARCHAR(64),SESSION_CONTEXT(N'Cosmos.CompanyKey'))),
 BusinessDate=COALESCE(sm.BusinessDate,
  CASE WHEN sm.SourceType=N'ManufacturingProduction' THEN mp.ProductionDate
   WHEN sm.SourceType=N'ManufacturingCancellation' THEN TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate'))
   WHEN sm.SourceType=N'SalesInvoice' AND sm.Quantity<0 THEN si.InvoiceDate
   WHEN sm.SourceType=N'SalesInvoice' AND sm.Quantity>0 THEN TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate'))
   WHEN sm.SourceType=N'PurchaseBill' AND sm.Quantity>0 THEN pb.BillDate
   WHEN sm.SourceType=N'PurchaseBill' AND sm.Quantity<0 THEN TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate'))
   WHEN sm.SourceType=N'PurchaseReturn' AND sm.Quantity<0 THEN pr.ReturnDate
   WHEN sm.SourceType=N'PurchaseReturn' AND sm.Quantity>0 THEN TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.BusinessDate'))
   WHEN sm.SourceType=N'ShipmentDispatch' THEN sh.ShipmentDate
   WHEN sm.SourceType=N'ShipmentReturn' THEN sr.ReceivedBackDate ELSE NULL END)
 FROM dbo.StockMovements sm JOIN inserted x ON x.Id=sm.Id JOIN dbo.Items i ON i.Id=sm.ItemId
 LEFT JOIN dbo.ManufacturingProductions mp ON mp.Id=sm.SourceId AND sm.SourceType IN(N'ManufacturingProduction',N'ManufacturingCancellation')
 LEFT JOIN dbo.SalesInvoices si ON si.Id=sm.SourceId AND sm.SourceType=N'SalesInvoice'
 LEFT JOIN dbo.PurchaseBills pb ON pb.Id=sm.SourceId AND sm.SourceType=N'PurchaseBill'
 LEFT JOIN dbo.PurchaseReturns pr ON pr.Id=sm.SourceId AND sm.SourceType=N'PurchaseReturn'
 LEFT JOIN dbo.Shipments sh ON sh.Id=sm.SourceId AND sm.SourceType=N'ShipmentDispatch'
 LEFT JOIN dbo.ShipmentReturnItems sri ON sri.Id=sm.SourceId AND sm.SourceType=N'ShipmentReturn'
 LEFT JOIN dbo.ShipmentReturns sr ON sr.Id=sri.ShipmentReturnId;
END;
GO
/* Only source dates with unambiguous physical semantics can be backfilled. */
UPDATE sm SET BusinessDate=p.ProductionDate FROM dbo.StockMovements sm JOIN dbo.ManufacturingProductions p ON p.Id=sm.SourceId WHERE sm.SourceType=N'ManufacturingProduction' AND sm.BusinessDate IS NULL;
UPDATE sm SET BusinessDate=i.InvoiceDate FROM dbo.StockMovements sm JOIN dbo.SalesInvoices i ON i.Id=sm.SourceId WHERE sm.SourceType=N'SalesInvoice' AND sm.Quantity<0 AND sm.BusinessDate IS NULL;
UPDATE sm SET BusinessDate=b.BillDate FROM dbo.StockMovements sm JOIN dbo.PurchaseBills b ON b.Id=sm.SourceId WHERE sm.SourceType=N'PurchaseBill' AND sm.Quantity>0 AND sm.BusinessDate IS NULL;
UPDATE sm SET BusinessDate=s.ShipmentDate FROM dbo.StockMovements sm JOIN dbo.Shipments s ON s.Id=sm.SourceId WHERE sm.SourceType=N'ShipmentDispatch' AND sm.BusinessDate IS NULL;
GO
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Position INT,@Patch NVARCHAR(MAX);
DECLARE posting_contracts CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_SalesInvoice_Confirm'),(N'sp_PurchaseBill_Confirm'),(N'sp_SalesInvoice_Cancel'),(N'sp_PurchaseBill_Cancel')) x(Name);
OPEN posting_contracts;FETCH NEXT FROM posting_contracts INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF CHARINDEX(N'BUSINESS_PERIOD_GUARD',@Definition)=0
 BEGIN
  SET @Patch=N' /* BUSINESS_PERIOD_GUARD */ ';
  IF @Name LIKE N'%[_]Cancel' SET @Patch=@Patch+N'SET @Date=COALESCE(TRY_CONVERT(DATE,SESSION_CONTEXT(N''Cosmos.BusinessDate'')),@Date); ';
  SET @Patch=@Patch+N'IF @Date<=TRY_CONVERT(DATE,SESSION_CONTEXT(N''Cosmos.ClosedThroughDate'')) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Business date is in a closed period.'' Message;RETURN;END; ';
  IF @Name=N'sp_SalesInvoice_Confirm' SET @Patch=@Patch+N'IF EXISTS(SELECT 1 FROM dbo.SalesInvoiceItems l JOIN dbo.Items i ON i.Id=l.ItemId WHERE l.SalesInvoiceId=@Id AND l.IsDeleted=0 AND COALESCE(l.UnitId,i.UnitId)<>i.UnitId) BEGIN ROLLBACK;SELECT 400 StatusCode,N''Verify invoice Item base-unit conversions before posting.'' Message;RETURN;END; ';
  IF @Name=N'sp_PurchaseBill_Confirm' SET @Patch=@Patch+N'IF EXISTS(SELECT 1 FROM dbo.PurchaseBillItems l JOIN dbo.Items i ON i.Id=l.ItemId WHERE l.PurchaseBillId=@Id AND l.IsDeleted=0 AND COALESCE(l.UnitId,i.UnitId)<>i.UnitId) BEGIN ROLLBACK;SELECT 400 StatusCode,N''Verify bill Item base-unit conversions before posting.'' Message;RETURN;END; ';
  SET @Position=CHARINDEX(N'IF @Status IS NULL',@Definition);
  IF @Position=0 THROW 51100,N'POSTING_GUARD_PREFLIGHT|Review the current document posting definition.',1;
  SET @Definition=STUFF(@Definition,@Position,0,@Patch);
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM posting_contracts INTO @Name;
END;
CLOSE posting_contracts;DEALLOCATE posting_contracts;
GO
/* Ordinary Item editing cannot change the unit of an established stock ledger. */
DECLARE @ItemUpdate NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_Item_Update'));
IF CHARINDEX(N'LEDGER_UNIT_GUARD',@ItemUpdate)=0
BEGIN
 SET @ItemUpdate=REPLACE(@ItemUpdate,N'BEGIN TRY',N'BEGIN TRY /* LEDGER_UNIT_GUARD */ IF EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Id AND UnitId<>@UnitId) AND EXISTS(SELECT 1 FROM dbo.StockMovements WHERE ItemId=@Id) BEGIN SELECT 409 StatusCode,N''A ledger-backed Item base unit requires a controlled conversion migration.'' Message;RETURN;END;');
 SET @ItemUpdate=N'ALTER '+SUBSTRING(@ItemUpdate,CHARINDEX(N'PROCEDURE',UPPER(@ItemUpdate)),LEN(@ItemUpdate));EXEC sys.sp_executesql @ItemUpdate;
END;
GO
