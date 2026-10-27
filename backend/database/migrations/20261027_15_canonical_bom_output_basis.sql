SET XACT_ABORT ON;
GO
/* Extend the existing canonical write contract. Legacy create requests remain per one
   base output; legacy update requests preserve a previously verified output basis. */
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX),@Position INT,@Guard NVARCHAR(MAX);
DECLARE bom_contracts CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'sp_ManufacturingBom_Create'),(N'sp_ManufacturingBom_Update')) x(Name);
OPEN bom_contracts;FETCH NEXT FROM bom_contracts INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF CHARINDEX(N'@OutputBaseQuantity',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'@UserId BIGINT=NULL',N'@UserId BIGINT=NULL,@OutputBaseQuantity DECIMAL(22,6)='+CASE WHEN @Name=N'sp_ManufacturingBom_Create' THEN N'1' ELSE N'NULL' END);
  SET @Guard=N' IF @OutputBaseQuantity<=0 BEGIN SELECT 400 StatusCode,N''BOM output base quantity must be positive.'' Message;RETURN;END; ';
  IF @Name=N'sp_ManufacturingBom_Create'
  BEGIN
   SET @Definition=REPLACE(@Definition,N'IsActive,CreatedBy) VALUES(',N'IsActive,CreatedBy,OutputBaseQuantity) VALUES(');
   SET @Definition=REPLACE(@Definition,N'@IsDefault,0,@UserId);',N'@IsDefault,0,@UserId,@OutputBaseQuantity);');
  END
  ELSE
  BEGIN
   SET @Definition=REPLACE(@Definition,N'IsDefault=@IsDefault,ModifiedAtUtc=',N'IsDefault=@IsDefault,OutputBaseQuantity=COALESCE(@OutputBaseQuantity,OutputBaseQuantity),ModifiedAtUtc=');
   SET @Guard=@Guard+N' IF EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE BomId=@Id AND Status<>1) BEGIN SELECT 409 StatusCode,N''A released BOM definition is frozen. Create a new effective revision.'' Message;RETURN;END; ';
   SET @Definition=REPLACE(@Definition,N'BEGIN TRAN;',N'BEGIN TRAN; EXEC dbo.sp_StockCommand_Lock; IF EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE BomId=@Id AND Status<>1) BEGIN ROLLBACK;SELECT 409 StatusCode,N''Released BOM snapshots require a new revision.'' Message;RETURN;END; ');
  END;
  SET @Position=CHARINDEX(N'BEGIN TRY',UPPER(@Definition));
  IF @Position=0 OR CHARINDEX(N'@OutputBaseQuantity DECIMAL',@Definition)=0 THROW 51100,N'BOM_BASIS_PATCH_PREFLIGHT|Review deployed canonical BOM procedure shape.',1;
  SET @Definition=STUFF(@Definition,@Position+LEN(N'BEGIN TRY'),0,@Guard);
  SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
  EXEC sys.sp_executesql @Definition;
 END;
 FETCH NEXT FROM bom_contracts INTO @Name;
END;
CLOSE bom_contracts;DEALLOCATE bom_contracts;
GO
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX);
DECLARE bom_projections CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES
 (N'sp_ManufacturingBom_GetById'),(N'sp_ManufacturingBom_GetApplicable'),(N'sp_ManufacturingBom_GetList'),
 (N'sp_ProcurementPlanning_Bom_Get'),(N'sp_ProcurementPlanning_CalculationInputs'),(N'sp_ManufacturingProduction_Create')) x(Name);
OPEN bom_projections;FETCH NEXT FROM bom_projections INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF @Name LIKE N'sp_ManufacturingBom[_]%' AND CHARINDEX(N'AS OutputBaseQuantity',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'SELECT b.Id,',N'SELECT b.Id,(SELECT OutputBaseQuantity FROM dbo.ManufacturingBoms ob WHERE ob.Id=b.Id) AS OutputBaseQuantity,');
 END;
 IF @Name=N'sp_ManufacturingProduction_Create' AND CHARINDEX(N'OUTPUT_BASIS_NORMALIZED',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'@ProducedQuantity*x.Quantity',N'(@ProducedQuantity*x.Quantity/(SELECT OutputBaseQuantity FROM dbo.ManufacturingBoms WHERE Id=@BomId))');
  SET @Definition=@Definition+N' /* OUTPUT_BASIS_NORMALIZED */';
 END
 ELSE IF CHARINDEX(N'OUTPUT_BASIS_NORMALIZED',@Definition)=0
 BEGIN
  SET @Definition=REPLACE(@Definition,N'x.Quantity * (1 + x.WastagePercentage / 100.0)',N'x.Quantity / (SELECT OutputBaseQuantity FROM dbo.ManufacturingBoms ob WHERE ob.Id=x.BomId) * (1 + x.WastagePercentage / 100.0)');
  SET @Definition=REPLACE(@Definition,N'x.Quantity*(1+x.WastagePercentage/100.0)',N'x.Quantity/(SELECT OutputBaseQuantity FROM dbo.ManufacturingBoms ob WHERE ob.Id=x.BomId)*(1+x.WastagePercentage/100.0)');
  SET @Definition=@Definition+N' /* OUTPUT_BASIS_NORMALIZED */';
 END;
 SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
 FETCH NEXT FROM bom_projections INTO @Name;
END;
CLOSE bom_projections;DEALLOCATE bom_projections;
GO
/* Referenced definitions are deactivated; history is never deleted. */
DECLARE @Delete NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_ManufacturingBom_Delete'));
IF CHARINDEX(N'PRODUCTION_ORDER_REFERENCE_GUARD',@Delete)=0
BEGIN
 SET @Delete=REPLACE(@Delete,N'SET NOCOUNT ON;',N'SET NOCOUNT ON; /* PRODUCTION_ORDER_REFERENCE_GUARD */ IF EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE BomId=@Id) BEGIN SELECT 409 StatusCode,N''BOM is referenced by production orders; deactivate it instead.'' Message;RETURN;END;');
 SET @Delete=N'ALTER '+SUBSTRING(@Delete,CHARINDEX(N'PROCEDURE',UPPER(@Delete)),LEN(@Delete));EXEC sys.sp_executesql @Delete;
END;
GO
