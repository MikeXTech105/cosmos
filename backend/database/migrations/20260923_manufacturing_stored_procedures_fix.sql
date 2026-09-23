/* Repairs the Manufacturing stored-procedure contract used by ManufacturingRepository. Safe to rerun. */
SET XACT_ABORT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_GetById @Id BIGINT AS
BEGIN
 SET NOCOUNT ON;
 SELECT b.Id,b.BomNumber,b.FinishedItemId,i.ItemCode FinishedItemCode,i.Name FinishedItemName,b.Version,b.Status,b.EffectiveFrom,b.EffectiveTo,b.Notes,b.IsDefault,b.IsActive
 FROM dbo.ManufacturingBoms b JOIN dbo.Items i ON i.Id=b.FinishedItemId WHERE b.Id=@Id AND b.IsDeleted=0;
 SELECT x.Id,x.ComponentItemId,i.ItemCode ComponentItemCode,i.Name ComponentItemName,x.Quantity,x.UnitId,u.Name UnitName,x.WastagePercentage,
        CAST(x.Quantity*(1+x.WastagePercentage/100.0) AS DECIMAL(18,4)) ConsumptionPerUnit,x.Notes,x.SortOrder
 FROM dbo.ManufacturingBomItems x JOIN dbo.Items i ON i.Id=x.ComponentItemId JOIN dbo.Units u ON u.Id=x.UnitId
 WHERE x.BomId=@Id AND x.IsDeleted=0 ORDER BY x.SortOrder,x.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_GetList
 @Search NVARCHAR(200)=NULL,@FinishedItemId BIGINT=NULL,@Status INT=NULL,@PageNumber INT=1,@PageSize INT=50,@SortBy NVARCHAR(50)=N'CreatedAt',@SortDirection NVARCHAR(4)=N'DESC'
AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,50,IIF(@PageSize>200,200,@PageSize));
 SET @SortBy=CASE WHEN @SortBy IN(N'BomNumber',N'Version',N'EffectiveFrom',N'CreatedAt') THEN @SortBy ELSE N'CreatedAt' END;
 SET @SortDirection=CASE WHEN UPPER(@SortDirection)=N'ASC' THEN N'ASC' ELSE N'DESC' END;
 DECLARE @Pattern NVARCHAR(210)=CASE WHEN NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL THEN NULL ELSE N'%'+LTRIM(RTRIM(@Search))+N'%' END;
 DECLARE @Offset INT=(@PageNumber-1)*@PageSize;
 DECLARE @Sql NVARCHAR(MAX)=N'SELECT b.Id,b.BomNumber,b.FinishedItemId,i.ItemCode FinishedItemCode,i.Name FinishedItemName,b.Version,b.Status,b.EffectiveFrom,b.IsDefault,COUNT(1) OVER() TotalCount FROM dbo.ManufacturingBoms b JOIN dbo.Items i ON i.Id=b.FinishedItemId WHERE b.IsDeleted=0 AND (@FinishedItemId IS NULL OR b.FinishedItemId=@FinishedItemId) AND (@Status IS NULL OR b.Status=@Status) AND (@Pattern IS NULL OR b.BomNumber LIKE @Pattern OR i.ItemCode LIKE @Pattern OR i.Name LIKE @Pattern OR b.Version LIKE @Pattern) ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
 EXEC sys.sp_executesql @Sql,N'@FinishedItemId BIGINT,@Status INT,@Pattern NVARCHAR(210),@Offset INT,@PageSize INT',@FinishedItemId,@Status,@Pattern,@Offset,@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_Create
 @FinishedItemId BIGINT,@Version NVARCHAR(30),@EffectiveFrom DATE,@EffectiveTo DATE=NULL,@Notes NVARCHAR(1000)=NULL,@IsDefault BIT=0,@ComponentsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF @EffectiveTo IS NOT NULL AND @EffectiveTo<@EffectiveFrom BEGIN SELECT 400 StatusCode,N'EffectiveTo cannot be earlier than EffectiveFrom.' Message; RETURN; END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@FinishedItemId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Finished item is invalid.' Message; RETURN; END;
 DECLARE @Lines TABLE(ComponentItemId BIGINT NOT NULL,Quantity DECIMAL(18,4) NOT NULL,UnitId BIGINT NULL,WastagePercentage DECIMAL(5,2) NOT NULL,Notes NVARCHAR(1000) NULL,SortOrder INT NOT NULL);
 INSERT @Lines SELECT ComponentItemId,Quantity,UnitId,COALESCE(WastagePercentage,0),Notes,COALESCE(SortOrder,0) FROM OPENJSON(@ComponentsJson) WITH(ComponentItemId BIGINT '$.ComponentItemId',Quantity DECIMAL(18,4) '$.Quantity',UnitId BIGINT '$.UnitId',WastagePercentage DECIMAL(5,2) '$.WastagePercentage',Notes NVARCHAR(1000) '$.Notes',SortOrder INT '$.SortOrder');
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE Quantity<=0 OR WastagePercentage<0 OR WastagePercentage>100) OR EXISTS(SELECT ComponentItemId FROM @Lines GROUP BY ComponentItemId HAVING COUNT(*)>1) BEGIN SELECT 400 StatusCode,N'Manufacturing BOM components are invalid.' Message; RETURN; END;
 IF EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.Items i ON i.Id=l.ComponentItemId WHERE l.ComponentItemId=@FinishedItemId OR i.Id IS NULL OR i.IsDeleted=1 OR i.IsActive=0 OR (l.UnitId IS NOT NULL AND l.UnitId<>i.UnitId)) BEGIN SELECT 400 StatusCode,N'Manufacturing BOM components or units are invalid.' Message; RETURN; END;
 IF EXISTS(SELECT 1 FROM dbo.ManufacturingBoms WHERE FinishedItemId=@FinishedItemId AND Version=LTRIM(RTRIM(@Version))) BEGIN SELECT 409 StatusCode,N'Manufacturing BOM version already exists.' Message; RETURN; END;
 BEGIN TRY BEGIN TRAN;
  DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT; SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ManufacturingBom';
  IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ManufacturingBom',N'MB-',2,6); SET @Next=1;SET @Prefix=N'MB-';SET @Padding=6; END ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ManufacturingBom';
  INSERT dbo.ManufacturingBoms(BomNumber,FinishedItemId,Version,Status,EffectiveFrom,EffectiveTo,Notes,IsDefault,IsActive,CreatedBy) VALUES(@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@Next),@Padding),@FinishedItemId,LTRIM(RTRIM(@Version)),1,@EffectiveFrom,@EffectiveTo,@Notes,@IsDefault,0,@UserId);
  DECLARE @Id BIGINT=SCOPE_IDENTITY();
  INSERT dbo.ManufacturingBomItems(BomId,ComponentItemId,Quantity,UnitId,WastagePercentage,Notes,SortOrder,CreatedBy) SELECT @Id,l.ComponentItemId,l.Quantity,COALESCE(l.UnitId,i.UnitId),l.WastagePercentage,l.Notes,l.SortOrder,@UserId FROM @Lines l JOIN dbo.Items i ON i.Id=l.ComponentItemId;
  UPDATE dbo.Items SET IsManufactured=1,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@FinishedItemId;
 COMMIT; SELECT 201 StatusCode,N'Manufacturing BOM created.' Message; EXEC dbo.sp_ManufacturingBom_GetById @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_Update
 @Id BIGINT,@EffectiveFrom DATE,@EffectiveTo DATE=NULL,@Notes NVARCHAR(1000)=NULL,@IsDefault BIT=0,@ComponentsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF @EffectiveTo IS NOT NULL AND @EffectiveTo<@EffectiveFrom BEGIN SELECT 400 StatusCode,N'EffectiveTo cannot be earlier than EffectiveFrom.' Message; RETURN; END;
 DECLARE @FinishedItemId BIGINT=(SELECT FinishedItemId FROM dbo.ManufacturingBoms WHERE Id=@Id AND IsDeleted=0); IF @FinishedItemId IS NULL BEGIN SELECT 404 StatusCode,N'Manufacturing BOM was not found.' Message; RETURN; END;
 IF EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WHERE BomId=@Id AND Status=2 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Posted Manufacturing BOM cannot be changed.' Message; RETURN; END;
 DECLARE @Lines TABLE(ComponentItemId BIGINT NOT NULL,Quantity DECIMAL(18,4) NOT NULL,UnitId BIGINT NULL,WastagePercentage DECIMAL(5,2) NOT NULL,Notes NVARCHAR(1000) NULL,SortOrder INT NOT NULL);
 INSERT @Lines SELECT ComponentItemId,Quantity,UnitId,COALESCE(WastagePercentage,0),Notes,COALESCE(SortOrder,0) FROM OPENJSON(@ComponentsJson) WITH(ComponentItemId BIGINT '$.ComponentItemId',Quantity DECIMAL(18,4) '$.Quantity',UnitId BIGINT '$.UnitId',WastagePercentage DECIMAL(5,2) '$.WastagePercentage',Notes NVARCHAR(1000) '$.Notes',SortOrder INT '$.SortOrder');
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines WHERE Quantity<=0 OR WastagePercentage<0 OR WastagePercentage>100) OR EXISTS(SELECT ComponentItemId FROM @Lines GROUP BY ComponentItemId HAVING COUNT(*)>1) OR EXISTS(SELECT 1 FROM @Lines l LEFT JOIN dbo.Items i ON i.Id=l.ComponentItemId WHERE l.ComponentItemId=@FinishedItemId OR i.Id IS NULL OR i.IsDeleted=1 OR i.IsActive=0 OR(l.UnitId IS NOT NULL AND l.UnitId<>i.UnitId)) BEGIN SELECT 400 StatusCode,N'Manufacturing BOM components or units are invalid.' Message; RETURN; END;
 BEGIN TRY BEGIN TRAN;
  UPDATE dbo.ManufacturingBoms SET EffectiveFrom=@EffectiveFrom,EffectiveTo=@EffectiveTo,Notes=@Notes,IsDefault=@IsDefault,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;
  UPDATE dbo.ManufacturingBomItems SET IsDeleted=1,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE BomId=@Id AND IsDeleted=0;
  INSERT dbo.ManufacturingBomItems(BomId,ComponentItemId,Quantity,UnitId,WastagePercentage,Notes,SortOrder,CreatedBy) SELECT @Id,l.ComponentItemId,l.Quantity,COALESCE(l.UnitId,i.UnitId),l.WastagePercentage,l.Notes,l.SortOrder,@UserId FROM @Lines l JOIN dbo.Items i ON i.Id=l.ComponentItemId;
 COMMIT; SELECT 200 StatusCode,N'Manufacturing BOM updated.' Message; EXEC dbo.sp_ManufacturingBom_GetById @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_Activate @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @FinishedItemId BIGINT,@IsDefault BIT; SELECT @FinishedItemId=FinishedItemId,@IsDefault=IsDefault FROM dbo.ManufacturingBoms WHERE Id=@Id AND IsDeleted=0;
 IF @FinishedItemId IS NULL BEGIN SELECT 404 StatusCode,N'Manufacturing BOM was not found.' Message; RETURN; END;
 BEGIN TRY BEGIN TRAN; IF @IsDefault=1 UPDATE dbo.ManufacturingBoms SET IsDefault=0,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE FinishedItemId=@FinishedItemId AND Id<>@Id AND IsDefault=1 AND IsActive=1 AND IsDeleted=0;
 UPDATE dbo.ManufacturingBoms SET Status=2,IsActive=1,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id; COMMIT; SELECT 200 StatusCode,N'Manufacturing BOM activated.' Message; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_Deactivate @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; UPDATE dbo.ManufacturingBoms SET Status=3,IsActive=0,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Manufacturing BOM was not found.' Message; ELSE SELECT 200 StatusCode,N'Manufacturing BOM deactivated.' Message; END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WHERE BomId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Manufacturing BOM is referenced by production.' Message; RETURN; END; UPDATE dbo.ManufacturingBoms SET IsDeleted=1,IsActive=0,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Manufacturing BOM was not found.' Message; ELSE SELECT 200 StatusCode,N'Manufacturing BOM deleted.' Message; END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_GetById @Id BIGINT AS
BEGIN
 SET NOCOUNT ON; SELECT p.Id,p.ProductionNumber,p.ProductionDate,p.FinishedItemId,i.ItemCode FinishedItemCode,i.Name FinishedItemName,p.BomId,p.BomVersion,p.PlannedQuantity,p.ProducedQuantity,p.Status,p.Notes,p.ReferenceNumber FROM dbo.ManufacturingProductions p JOIN dbo.Items i ON i.Id=p.FinishedItemId WHERE p.Id=@Id AND p.IsDeleted=0;
 SELECT m.Id,m.ComponentItemId,i.ItemCode ComponentItemCode,i.Name ComponentItemName,m.RequiredQuantity,m.WastageQuantity,m.TotalConsumedQuantity,m.UnitId,u.Name UnitName FROM dbo.ManufacturingProductionMaterials m JOIN dbo.Items i ON i.Id=m.ComponentItemId JOIN dbo.Units u ON u.Id=m.UnitId WHERE m.ProductionId=@Id ORDER BY m.Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_GetList
 @Search NVARCHAR(200)=NULL,@FinishedItemId BIGINT=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=50,@SortBy NVARCHAR(50)=N'ProductionDate',@SortDirection NVARCHAR(4)=N'DESC'
AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,50,IIF(@PageSize>200,200,@PageSize));SET @SortBy=CASE WHEN @SortBy IN(N'ProductionNumber',N'ProductionDate',N'CreatedAt') THEN @SortBy ELSE N'ProductionDate' END;SET @SortDirection=CASE WHEN UPPER(@SortDirection)=N'ASC' THEN N'ASC' ELSE N'DESC' END;
 DECLARE @Pattern NVARCHAR(210)=CASE WHEN NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL THEN NULL ELSE N'%'+LTRIM(RTRIM(@Search))+N'%' END;
 DECLARE @Offset INT=(@PageNumber-1)*@PageSize;
 DECLARE @Sql NVARCHAR(MAX)=N'SELECT p.Id,p.ProductionNumber,p.ProductionDate,p.FinishedItemId,i.ItemCode FinishedItemCode,i.Name FinishedItemName,p.BomVersion,p.PlannedQuantity,p.ProducedQuantity,p.Status,COUNT(1) OVER() TotalCount FROM dbo.ManufacturingProductions p JOIN dbo.Items i ON i.Id=p.FinishedItemId WHERE p.IsDeleted=0 AND (@FinishedItemId IS NULL OR p.FinishedItemId=@FinishedItemId) AND (@Status IS NULL OR p.Status=@Status) AND (@FromDate IS NULL OR p.ProductionDate>=@FromDate) AND (@ToDate IS NULL OR p.ProductionDate<=@ToDate) AND (@Pattern IS NULL OR p.ProductionNumber LIKE @Pattern OR p.ReferenceNumber LIKE @Pattern OR i.ItemCode LIKE @Pattern OR i.Name LIKE @Pattern) ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N' OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
 EXEC sys.sp_executesql @Sql,N'@FinishedItemId BIGINT,@Status INT,@FromDate DATE,@ToDate DATE,@Pattern NVARCHAR(210),@Offset INT,@PageSize INT',@FinishedItemId,@Status,@FromDate,@ToDate,@Pattern,@Offset,@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_Create
 @ProductionDate DATE,@FinishedItemId BIGINT,@BomId BIGINT=NULL,@PlannedQuantity DECIMAL(18,4),@ProducedQuantity DECIMAL(18,4),@Notes NVARCHAR(1000)=NULL,@ReferenceNumber NVARCHAR(100)=NULL,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON; IF @PlannedQuantity<0 OR @ProducedQuantity<=0 BEGIN SELECT 400 StatusCode,N'Production quantities are invalid.' Message;RETURN;END;
 IF @BomId IS NULL SELECT TOP(1) @BomId=Id FROM dbo.ManufacturingBoms WHERE FinishedItemId=@FinishedItemId AND Status=2 AND IsActive=1 AND IsDeleted=0 AND EffectiveFrom<=@ProductionDate AND(EffectiveTo IS NULL OR EffectiveTo>=@ProductionDate) ORDER BY IsDefault DESC,EffectiveFrom DESC,Id DESC;
 DECLARE @BomVersion NVARCHAR(30); SELECT @BomVersion=Version FROM dbo.ManufacturingBoms WHERE Id=@BomId AND FinishedItemId=@FinishedItemId AND Status=2 AND IsActive=1 AND IsDeleted=0 AND EffectiveFrom<=@ProductionDate AND(EffectiveTo IS NULL OR EffectiveTo>=@ProductionDate); IF @BomVersion IS NULL BEGIN SELECT 400 StatusCode,N'An active effective Manufacturing BOM is required.' Message;RETURN;END;
 BEGIN TRY BEGIN TRAN; DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ManufacturingProduction';IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ManufacturingProduction',N'MFG-',2,6);SET @Next=1;SET @Prefix=N'MFG-';SET @Padding=6;END ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ManufacturingProduction';
 INSERT dbo.ManufacturingProductions(ProductionNumber,ProductionDate,FinishedItemId,BomId,BomVersion,PlannedQuantity,ProducedQuantity,Status,Notes,ReferenceNumber,CreatedBy) VALUES(@Prefix+RIGHT(REPLICATE(N'0',@Padding)+CONVERT(NVARCHAR(30),@Next),@Padding),@ProductionDate,@FinishedItemId,@BomId,@BomVersion,@PlannedQuantity,@ProducedQuantity,1,@Notes,@ReferenceNumber,@UserId);DECLARE @Id BIGINT=SCOPE_IDENTITY();
 INSERT dbo.ManufacturingProductionMaterials(ProductionId,ComponentItemId,RequiredQuantity,WastageQuantity,TotalConsumedQuantity,UnitId,CreatedBy) SELECT @Id,x.ComponentItemId,CAST(@ProducedQuantity*x.Quantity AS DECIMAL(18,4)),CAST(@ProducedQuantity*x.Quantity*x.WastagePercentage/100.0 AS DECIMAL(18,4)),CAST(@ProducedQuantity*x.Quantity*(1+x.WastagePercentage/100.0) AS DECIMAL(18,4)),x.UnitId,@UserId FROM dbo.ManufacturingBomItems x WHERE x.BomId=@BomId AND x.IsDeleted=0; IF @@ROWCOUNT=0 BEGIN ROLLBACK;SELECT 400 StatusCode,N'Manufacturing BOM has no components.' Message;RETURN;END; COMMIT;SELECT 201 StatusCode,N'Manufacturing production created.' Message;EXEC dbo.sp_ManufacturingProduction_GetById @Id; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_Update
 @Id BIGINT,@ProductionDate DATE,@PlannedQuantity DECIMAL(18,4),@ProducedQuantity DECIMAL(18,4),@Notes NVARCHAR(1000)=NULL,@ReferenceNumber NVARCHAR(100)=NULL,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;IF @PlannedQuantity<0 OR @ProducedQuantity<=0 BEGIN SELECT 400 StatusCode,N'Production quantities are invalid.' Message;RETURN;END;DECLARE @PreviousProducedQuantity DECIMAL(18,4);SELECT @PreviousProducedQuantity=ProducedQuantity FROM dbo.ManufacturingProductions WHERE Id=@Id AND Status=1 AND IsDeleted=0;IF @PreviousProducedQuantity IS NULL BEGIN SELECT 409 StatusCode,N'Only draft Manufacturing production can be updated.' Message;RETURN;END;
 BEGIN TRY BEGIN TRAN;UPDATE dbo.ManufacturingProductions SET ProductionDate=@ProductionDate,PlannedQuantity=@PlannedQuantity,ProducedQuantity=@ProducedQuantity,Notes=@Notes,ReferenceNumber=@ReferenceNumber,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;UPDATE dbo.ManufacturingProductionMaterials SET RequiredQuantity=CAST(RequiredQuantity/@PreviousProducedQuantity*@ProducedQuantity AS DECIMAL(18,4)),WastageQuantity=CAST(WastageQuantity/@PreviousProducedQuantity*@ProducedQuantity AS DECIMAL(18,4)),TotalConsumedQuantity=CAST(TotalConsumedQuantity/@PreviousProducedQuantity*@ProducedQuantity AS DECIMAL(18,4)) WHERE ProductionId=@Id;COMMIT;SELECT 200 StatusCode,N'Manufacturing production updated.' Message;EXEC dbo.sp_ManufacturingProduction_GetById @Id;END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_Post @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN ROLLBACK;SELECT 409 StatusCode,N'MANUFACTURING_PRODUCTION_NOT_EDITABLE' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.ManufacturingProductionMaterials m JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=m.ComponentItemId WHERE m.ProductionId=@Id AND i.TrackInventory=1 AND i.CurrentStock<m.TotalConsumedQuantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N'MANUFACTURING_INSUFFICIENT_STOCK' Message;RETURN;END;
 UPDATE i SET CurrentStock=i.CurrentStock-m.TotalConsumedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductionMaterials m ON m.ComponentItemId=i.Id WHERE m.ProductionId=@Id AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT ComponentItemId,N'ManufacturingProduction',@Id,5,-TotalConsumedQuantity,@UserId FROM dbo.ManufacturingProductionMaterials WHERE ProductionId=@Id;
 UPDATE i SET CurrentStock=i.CurrentStock+p.ProducedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductions p ON p.FinishedItemId=i.Id WHERE p.Id=@Id AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT FinishedItemId,N'ManufacturingProduction',@Id,6,ProducedQuantity,@UserId FROM dbo.ManufacturingProductions WHERE Id=@Id;
 UPDATE dbo.ManufacturingProductions SET Status=2,PostedAtUtc=SYSUTCDATETIME(),PostedBy=@UserId WHERE Id=@Id;COMMIT;SELECT 200 StatusCode,N'Manufacturing production posted.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND Status=2 AND IsDeleted=0) BEGIN ROLLBACK;SELECT 409 StatusCode,N'MANUFACTURING_PRODUCTION_ALREADY_CANCELLED' Message;RETURN;END;
 UPDATE i SET CurrentStock=i.CurrentStock+m.TotalConsumedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductionMaterials m ON i.Id=m.ComponentItemId WHERE m.ProductionId=@Id AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT ComponentItemId,N'ManufacturingCancellation',@Id,7,TotalConsumedQuantity,@UserId FROM dbo.ManufacturingProductionMaterials WHERE ProductionId=@Id;
 IF EXISTS(SELECT 1 FROM dbo.ManufacturingProductions p JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=p.FinishedItemId WHERE p.Id=@Id AND i.TrackInventory=1 AND i.CurrentStock<p.ProducedQuantity) BEGIN ROLLBACK;SELECT 409 StatusCode,N'MANUFACTURING_INSUFFICIENT_STOCK' Message;RETURN;END;
 UPDATE i SET CurrentStock=i.CurrentStock-p.ProducedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductions p ON i.Id=p.FinishedItemId WHERE p.Id=@Id AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT FinishedItemId,N'ManufacturingCancellation',@Id,8,-ProducedQuantity,@UserId FROM dbo.ManufacturingProductions WHERE Id=@Id;
 UPDATE dbo.ManufacturingProductions SET Status=3,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=@Reason WHERE Id=@Id;COMMIT;SELECT 200 StatusCode,N'Manufacturing production cancelled.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH
END;
GO
