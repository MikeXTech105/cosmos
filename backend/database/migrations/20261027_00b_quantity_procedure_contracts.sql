/* Patch deployed procedure definitions, preserving the HSN/GST snapshot integrations
   that earlier migrations install by rewriting those definitions. Do not replace them
   with older copies from the full setup script. Currency declarations stay unchanged. */
SET XACT_ABORT ON;
GO
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Before NVARCHAR(MAX),@Keyword INT;
DECLARE precision_procedures CURSOR LOCAL FAST_FORWARD FOR
 SELECT p.name FROM sys.procedures p JOIN sys.schemas s ON s.schema_id=p.schema_id
 WHERE s.name=N'dbo' AND (p.name LIKE N'sp_Item[_]%' OR p.name LIKE N'sp_Manufacturing%' OR p.name LIKE N'sp_SalesInvoice[_]%' OR p.name LIKE N'sp_Purchase%' OR p.name LIKE N'sp_ProcurementPlanning[_]%' OR p.name=N'usp_GstCalculationSnapshot_Create');
OPEN precision_procedures; FETCH NEXT FROM precision_procedures INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+QUOTENAME(@Name)));
 IF @Definition IS NULL THROW 51100,N'PRECISION_MODULE_UNAVAILABLE|A required procedure is encrypted or unreadable.',1;
 SET @Before=@Definition;
 -- Quantities in TVPs, table variables, scalar parameters and OPENJSON projections.
 SET @Definition=REPLACE(@Definition,N'Quantity DECIMAL(18,2)',N'Quantity DECIMAL(22,6)');
 SET @Definition=REPLACE(@Definition,N'Quantity decimal(18,2)',N'Quantity decimal(22,6)');
 IF @Name=N'usp_GstCalculationSnapshot_Create' SET @Definition=REPLACE(@Definition,N'@Quantity DECIMAL(18,4)',N'@Quantity DECIMAL(22,6)');
 SET @Definition=REPLACE(@Definition,N'@OpeningStock DECIMAL(18,2)',N'@OpeningStock DECIMAL(22,6)');
 SET @Definition=REPLACE(@Definition,N'@CurrentStock DECIMAL(18,2)',N'@CurrentStock DECIMAL(22,6)');
 SET @Definition=REPLACE(@Definition,N'@ReservedStock DECIMAL(18,2)',N'@ReservedStock DECIMAL(22,6)');
 SET @Definition=REPLACE(@Definition,N'@MinimumStock DECIMAL(18,2)',N'@MinimumStock DECIMAL(22,6)');
 SET @Definition=REPLACE(@Definition,N'dbo.SalesInvoiceItemInput READONLY',N'dbo.SalesInvoiceItemInputV2 READONLY');
 SET @Definition=REPLACE(@Definition,N'dbo.PurchaseLineInput READONLY',N'dbo.PurchaseLineInputV2 READONLY');
 IF @Name LIKE N'sp_Manufacturing%'
 BEGIN
  SET @Definition=REPLACE(@Definition,N'DECIMAL(18,4)',N'DECIMAL(22,6)');
  SET @Definition=REPLACE(@Definition,N'decimal(18,4)',N'decimal(22,6)');
 END;
 IF @Name=N'sp_Item_Update'
 BEGIN
  -- A stale Item edit must never restore the stock values it read before a posting.
  SET @Definition=REPLACE(@Definition,N'OpeningStock=@OpeningStock,',N'');
  SET @Definition=REPLACE(@Definition,N'CurrentStock=@CurrentStock,',N'');
  SET @Definition=REPLACE(@Definition,N'ReservedStock=@ReservedStock,',N'');
 END;
 IF @Name=N'sp_ManufacturingProduction_Post'
  SET @Definition=REPLACE(@Definition,N'i.CurrentStock<m.TotalConsumedQuantity',N'i.CurrentStock-i.ReservedStock<m.TotalConsumedQuantity');
 IF @Name=N'sp_ManufacturingProduction_Cancel'
  SET @Definition=REPLACE(@Definition,N'i.CurrentStock<p.ProducedQuantity',N'i.CurrentStock-i.ReservedStock<p.ProducedQuantity');
 IF @Before<>@Definition
 BEGIN
  SET @Keyword=CHARINDEX(N'PROCEDURE',UPPER(@Definition));
  IF @Keyword=0 THROW 51100,N'PRECISION_MODULE_FORMAT|Review an unexpected procedure definition.',1;
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,@Keyword,LEN(@Definition));
  EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM precision_procedures INTO @Name;
END;
CLOSE precision_procedures; DEALLOCATE precision_procedures;
GO
