SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_StockCommand_Lock AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Result INT;
 EXEC @Result=sys.sp_getapplock @Resource=N'Cosmos.Production.Stock',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=15000;
 IF @Result<0 THROW 51109,N'CONCURRENT_STOCK_COMMAND|Reload and retry the same physical command.',1;
END;
GO
/* Bring legacy physical writers into the same catalog lock domain. This preserves
   their API contracts while preventing them from bypassing owned reservations. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Position INT,@Guard NVARCHAR(MAX);
DECLARE stock_writers CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES
 (N'sp_ManufacturingProduction_Post'),(N'sp_ManufacturingProduction_Cancel'),
 (N'sp_SalesInvoice_Confirm'),(N'sp_SalesInvoice_Cancel'),(N'sp_PurchaseBill_Confirm'),(N'sp_PurchaseBill_Cancel'),
 (N'sp_PurchaseOrder_Convert'),(N'sp_PurchaseReturn_Save'),(N'sp_PurchaseReturn_Delete'),
 (N'usp_ShipmentOperations_Shipment_Transition'),(N'usp_ShipmentOperations_Return_Receive')) x(Name);
OPEN stock_writers;FETCH NEXT FROM stock_writers INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF @Name=N'sp_PurchaseOrder_Convert' BEGIN SET @Definition=REPLACE(@Definition,N'Status IN (1,2)',N'Status IN (1,2,3)');SET @Definition=REPLACE(@Definition,N'Status IN(1,2)',N'Status IN(1,2,3)');END;
 IF @Definition IS NULL THROW 51100,N'STOCK_LOCK_PREFLIGHT|An expected physical posting procedure is missing.',1;
 IF CHARINDEX(N'EXEC dbo.sp_StockCommand_Lock;',@Definition)=0
 BEGIN
  SET @Position=CHARINDEX(N'BEGIN TRAN;',UPPER(@Definition));
  IF @Position=0 THROW 51100,N'STOCK_TRANSACTION_PREFLIGHT|Review the deployed transaction structure before installing common stock locking.',1;
  SET @Guard=N' EXEC dbo.sp_StockCommand_Lock; ';
  IF @Name=N'sp_PurchaseOrder_Convert'
   SET @Guard=@Guard+N' IF NOT EXISTS(SELECT 1 FROM dbo.PurchaseOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0 AND Status IN(1,2,3)) BEGIN ROLLBACK;SELECT 409 StatusCode,N''PO already converted or cancelled; reload before retry.'' Message;RETURN;END; ';
  IF @Name=N'sp_PurchaseReturn_Save'
   SET @Guard=@Guard+N' IF EXISTS(SELECT x.ItemId FROM @Items x JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=x.ItemId WHERE i.TrackInventory=1 GROUP BY x.ItemId HAVING MAX(i.CurrentStock-i.ReservedStock)<SUM(x.Quantity)-COALESCE((SELECT SUM(ri.Quantity) FROM dbo.PurchaseReturnItems ri WHERE ri.PurchaseReturnId=@Id AND ri.ItemId=x.ItemId AND ri.IsDeleted=0),0)) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Insufficient unreserved stock for purchase return.'' Message;RETURN;END; ';
  SET @Definition=STUFF(@Definition,@Position+LEN(N'BEGIN TRAN;'),0,@Guard);
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
  EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM stock_writers INTO @Name;
END;
CLOSE stock_writers;DEALLOCATE stock_writers;
GO
/* Repair the Dapper name contract before requiring verified packing quantities. */
DECLARE @Packing NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.usp_ShipmentOperations_Packing_SuggestionInputs'));
SET @Packing=REPLACE(@Packing,N'si.UnitsPerBoxSnapshot,',N'si.UnitsPerBoxSnapshot UnitsPerBox,');
SET @Packing=N'ALTER '+SUBSTRING(@Packing,CHARINDEX(N'PROCEDURE',UPPER(@Packing)),LEN(@Packing));
EXEC sys.sp_executesql @Packing;
GO
