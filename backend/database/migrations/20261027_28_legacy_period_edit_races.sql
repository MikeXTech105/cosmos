SET XACT_ABORT ON;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.StockMovements') AND name=N'IX_SM_CompanyBusinessItem') CREATE INDEX IX_SM_CompanyBusinessItem ON dbo.StockMovements(CompanyKey,BusinessDate,ItemId,Id) INCLUDE(SourceType,SourceId,SourceLineId,Quantity,UnitIdSnapshot);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.StockMovements') AND name=N'IX_SM_ItemBusinessDate') CREATE INDEX IX_SM_ItemBusinessDate ON dbo.StockMovements(ItemId,BusinessDate) INCLUDE(CompanyKey,Quantity,UnitIdSnapshot,SourceType);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PurchasePhysicalReceiptLines') AND name=N'IX_PPRL_SourceOrderLine') CREATE INDEX IX_PPRL_SourceOrderLine ON dbo.PurchasePhysicalReceiptLines(PurchaseOrderLineId) INCLUDE(ReceiptId,AcceptedQuantity,RejectedQuantity,QuarantinedQuantity,ReturnedAcceptedQuantity,ReturnedRejectedQuantity,ReturnedQuarantinedQuantity);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.PurchaseOrderItems') AND name=N'IX_POI_ItemSupply') CREATE INDEX IX_POI_ItemSupply ON dbo.PurchaseOrderItems(ItemId,PurchaseOrderId) INCLUDE(Quantity,UnitId,IsDeleted);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionImportRows') AND name=N'IX_PIR_NormalizedEvent') CREATE INDEX IX_PIR_NormalizedEvent ON dbo.ProductionImportRows(NormalizedEventKey,Id) INCLUDE(BatchId,Disposition);
GO
/* Period guards use physical business dates, not UTC creation timestamps. Keep existing
   status envelopes and take the guard after the common stock lock, inside the transaction. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@DateExpression NVARCHAR(MAX),@Guard NVARCHAR(MAX);
DECLARE period_writers CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_ManufacturingProduction_Post'),(N'sp_ManufacturingProduction_Cancel'),(N'sp_PurchaseOrder_Convert'),(N'sp_PurchaseReturn_Save'),(N'sp_PurchaseReturn_Delete'),(N'usp_ShipmentOperations_Shipment_Transition'),(N'usp_ShipmentOperations_Return_Receive')) x(Name);
OPEN period_writers;FETCH NEXT FROM period_writers INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF CHARINDEX(N'LEGACY_PHYSICAL_PERIOD_GUARD',@Definition)=0
 BEGIN
  SET @DateExpression=CASE @Name WHEN N'sp_ManufacturingProduction_Post' THEN N'(SELECT ProductionDate FROM dbo.ManufacturingProductions WHERE Id=@Id)'
   WHEN N'sp_PurchaseOrder_Convert' THEN N'@BillDate' WHEN N'sp_PurchaseReturn_Save' THEN N'@ReturnDate'
   WHEN N'usp_ShipmentOperations_Shipment_Transition' THEN N'(SELECT ShipmentDate FROM dbo.Shipments WHERE Id=@Id)'
   WHEN N'usp_ShipmentOperations_Return_Receive' THEN N'@ReceivedBackDate' ELSE N'TRY_CONVERT(DATE,SESSION_CONTEXT(N''Cosmos.BusinessDate''))' END;
  SET @Guard=N' /* LEGACY_PHYSICAL_PERIOD_GUARD */ DECLARE @PostingBusinessDate DATE='+@DateExpression+N'; IF (@PostingBusinessDate IS NULL AND SESSION_CONTEXT(N''Cosmos.CompanyKey'') IS NOT NULL) OR @PostingBusinessDate<=TRY_CONVERT(DATE,SESSION_CONTEXT(N''Cosmos.ClosedThroughDate'')) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Physical business date is unavailable or in a closed period.'' Message;RETURN;END; ';
  IF @Name=N'usp_ShipmentOperations_Shipment_Transition' SET @Guard=N'IF @TargetStatus=6 BEGIN '+@Guard+N' END;';
  IF CHARINDEX(N'EXEC dbo.sp_StockCommand_Lock;',@Definition)=0 THROW 51100,N'PERIOD_GUARD_PREFLIGHT|A legacy stock writer is outside the common lock domain.',1;
  SET @Definition=REPLACE(@Definition,N'EXEC dbo.sp_StockCommand_Lock;',N'EXEC dbo.sp_StockCommand_Lock;'+@Guard);
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM period_writers INTO @Name;
END;
CLOSE period_writers;DEALLOCATE period_writers;
GO
/* Recheck physical links after acquiring the transaction lock: an early validation alone
   can race receipt/ownership declaration and replace its original document lines. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Guard NVARCHAR(MAX);
DECLARE linked_edits CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_SalesInvoice_Update'),(N'sp_PurchaseBill_Save'),(N'sp_PurchaseOrder_Save')) x(Name);
OPEN linked_edits;FETCH NEXT FROM linked_edits INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF CHARINDEX(N'ATOMIC_LINKED_DOCUMENT_EDIT',@Definition)=0
 BEGIN
  SET @Guard=CASE @Name WHEN N'sp_SalesInvoice_Update' THEN N'EXISTS(SELECT 1 FROM dbo.SalesInvoiceItems WHERE SalesInvoiceId=@Id AND IsDeleted=0 AND InventoryOwner=2)'
   WHEN N'sp_PurchaseBill_Save' THEN N'EXISTS(SELECT 1 FROM dbo.PurchaseBillItems WHERE PurchaseBillId=@Id AND IsDeleted=0 AND InventoryOwner=2)'
   ELSE N'EXISTS(SELECT 1 FROM dbo.PurchasePhysicalReceipts WHERE PurchaseOrderId=@Id) OR EXISTS(SELECT 1 FROM dbo.PurchaseOrderItems WHERE PurchaseOrderId=@Id AND IsDeleted=0 AND SourcePlanningRunLineId IS NOT NULL)' END;
  IF CHARINDEX(N'BEGIN TRAN;',@Definition)=0 THROW 51100,N'LINK_EDIT_TRANSACTION_PREFLIGHT|Review the existing document edit transaction.',1;
  SET @Definition=REPLACE(@Definition,N'BEGIN TRAN;',N'BEGIN TRAN; EXEC dbo.sp_StockCommand_Lock; /* ATOMIC_LINKED_DOCUMENT_EDIT */ IF '+@Guard+N' BEGIN ROLLBACK;SELECT 409 StatusCode,N''Linked/source-plan document lines are frozen; refresh the source or use explicit reconciliation/promise actions.'' Message;RETURN;END; ');
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM linked_edits INTO @Name;
END;
CLOSE linked_edits;DEALLOCATE linked_edits;
GO
/* A referenced unit abbreviation is an identity, not a display-only rename. Keep the
   existing unit service but require a new verified unit/conversion instead of reinterpreting Items. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_Unit_Update'));
IF CHARINDEX(N'ATOMIC_UNIT_IDENTITY',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'BEGIN TRY',N'BEGIN TRY /* ATOMIC_UNIT_IDENTITY */ BEGIN TRAN;EXEC dbo.sp_StockCommand_Lock;IF EXISTS(SELECT 1 FROM dbo.Units WHERE Id=@Id AND ShortName<>@ShortName) AND EXISTS(SELECT 1 FROM dbo.Items WHERE UnitId=@Id) BEGIN SELECT 409 StatusCode,N''A referenced unit abbreviation requires a new verified unit/conversion; its display name may still be corrected.'' Message;RETURN;END;');
 SET @Definition=REPLACE(@Definition,N'RETURN;',N'IF XACT_STATE()<>0 ROLLBACK;RETURN;');
 SET @Definition=REPLACE(@Definition,N'SELECT 200 AS StatusCode',N'COMMIT;SELECT 200 AS StatusCode');
 SET @Definition=REPLACE(@Definition,N'SELECT 200 StatusCode',N'COMMIT;SELECT 200 StatusCode');
 SET @Definition=REPLACE(@Definition,N'BEGIN CATCH',N'BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ManufacturingBom_Update'));
IF CHARINDEX(N'ACTIVE_BOM_NONOVERLAP_EDIT',@Definition)=0
BEGIN
 SET @Definition=REPLACE(@Definition,N'EXEC dbo.sp_StockCommand_Lock;',N'EXEC dbo.sp_StockCommand_Lock; /* ACTIVE_BOM_NONOVERLAP_EDIT */ IF EXISTS(SELECT 1 FROM dbo.ManufacturingBoms currentbom JOIN dbo.ManufacturingBoms otherbom ON otherbom.FinishedItemId=currentbom.FinishedItemId AND otherbom.Id<>currentbom.Id AND otherbom.Status=2 AND otherbom.IsActive=1 AND otherbom.IsDeleted=0 AND otherbom.EffectiveFrom<=COALESCE(@EffectiveTo,CONVERT(DATE,''99991231'')) AND COALESCE(otherbom.EffectiveTo,CONVERT(DATE,''99991231''))>=@EffectiveFrom WHERE currentbom.Id=@Id AND currentbom.Status=2 AND currentbom.IsActive=1) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Active BOM effective periods cannot overlap.'' Message;RETURN;END; ');
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
END;
GO
