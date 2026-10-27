SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.Items','RowVersion') IS NULL ALTER TABLE dbo.Items ADD RowVersion ROWVERSION;
GO
IF OBJECT_ID('dbo.ProductionStockAdjustments','U') IS NULL CREATE TABLE dbo.ProductionStockAdjustments(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id),
 BusinessDate DATE NOT NULL,SignedQuantity DECIMAL(22,6) NOT NULL CHECK(SignedQuantity<>0),Reason NVARCHAR(1000) NOT NULL,SourceReference NVARCHAR(100) NOT NULL,
 CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CONSTRAINT UQ_ProductionAdjustment_Source UNIQUE(CompanyKey,ItemId,SourceReference));
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionStock_Balance @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;DECLARE @Data NVARCHAR(MAX)=(SELECT Id,UnitId,CurrentStock,ReservedStock,CONVERT(VARCHAR(18),RowVersion,1) Version FROM dbo.Items WHERE Id=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')) AND IsDeleted=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 IF @Data IS NULL THROW 51104,N'NOT_FOUND|Item was not found.',1;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionStock_Adjust @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Unit BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.unitId')),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Qty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.signedQuantity')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Id BIGINT;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @Current=RowVersion FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Item AND UnitId=@Unit AND IsActive=1 AND IsDeleted=0 AND TrackInventory=1;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|An active tracked Item in this base unit is required.',1;
 IF @Version IS NULL OR @Version<>@Current THROW 51109,N'STALE_VERSION|Reload the stock balance before approving an adjustment.',1;
 IF @Qty IS NULL OR @Qty=0 OR @Date IS NULL OR NULLIF(JSON_VALUE(@RequestJson,'$.request.reason'),N'') IS NULL THROW 51100,N'INVALID_ADJUSTMENT|A dated signed base quantity and reason are required.',1;
 IF EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Item AND CurrentStock+@Qty<ReservedStock) THROW 51109,N'ADJUSTMENT_RESERVED_STOCK|An adjustment cannot remove owned reserved stock or create a negative free balance.',1;
 INSERT dbo.ProductionStockAdjustments(CompanyKey,ItemId,UnitId,BusinessDate,SignedQuantity,Reason,SourceReference,CreatedBy) VALUES(@CompanyKey,@Item,@Unit,@Date,@Qty,JSON_VALUE(@RequestJson,'$.request.reason'),JSON_VALUE(@RequestJson,'$.request.sourceReference'),@UserId);SET @Id=SCOPE_IDENTITY();
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,UnitIdSnapshot,CreatedBy) VALUES(@Item,N'StockAdjustment',@Id,@Id,NEWID(),@CompanyKey,@Date,CASE WHEN @Qty>0 THEN 3 ELSE 4 END,@Qty,@Unit,@UserId);
 UPDATE dbo.Items SET CurrentStock=CurrentStock+@Qty,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Item;
 SET @Data=(SELECT @Id Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'Adjusted' Status FROM dbo.Items WHERE Id=@Item FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'StockAdjustment',@Id,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionPlanning_ReadSnapshot @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.id')),@Snapshot NVARCHAR(MAX),@Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageSize')),50),@Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.itemId')),@Data NVARCHAR(MAX);
 SELECT @Snapshot=SnapshotJson FROM dbo.ProductionPlanningSnapshots WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Snapshot IS NULL THROW 51104,N'NOT_FOUND|Snapshot was not found in this company.',1;
 SELECT j.[key] Ordinal,j.value JsonLine,l.* INTO #Lines FROM OPENJSON(@Snapshot,'$.lines') j CROSS APPLY OPENJSON(j.value) WITH(ItemId BIGINT '$.itemId',UnitId BIGINT '$.unitId',Target21 DECIMAL(22,6) '$.target21',SuggestedProduction DECIMAL(22,6) '$.suggestedProduction',PhysicalStock DECIMAL(22,6) '$.physicalStock',OpenReleasedOutput DECIMAL(22,6) '$.openReleasedOutput') l WHERE @Item IS NULL OR l.ItemId=@Item;
 SET @Data=(SELECT @Id Id,JSON_VALUE(@Snapshot,'$.asOfDate') AsOfDate,JSON_VALUE(@Snapshot,'$.calculationVersion') CalculationVersion,JSON_VALUE(@Snapshot,'$.inventoryBasis') InventoryBasis,
 JSON_QUERY((SELECT JSON_QUERY(COALESCE((SELECT N'['+STRING_AGG(CONVERT(NVARCHAR(MAX),JsonLine),N',') WITHIN GROUP(ORDER BY CONVERT(INT,Ordinal))+N']' FROM(SELECT Ordinal,JsonLine FROM #Lines ORDER BY CONVERT(INT,Ordinal) OFFSET(@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY) p),N'[]')) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Lines) TotalCount,
 JSON_QUERY((SELECT UnitId,SUM(PhysicalStock) PhysicalStock,SUM(OpenReleasedOutput) OpenReleasedOutput,CASE WHEN COUNT(Target21)=COUNT(*) THEN SUM(Target21) END Target21,CASE WHEN COUNT(SuggestedProduction)=COUNT(*) THEN SUM(SuggestedProduction) END SuggestedProduction,COUNT(*) Rows,COUNT(*)-COUNT(SuggestedProduction) UnavailableRows FROM #Lines GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)) Lines FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
/* Do not relabel unknown legacy output units using today's Item unit. */
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ProductionReport_Read'));
SET @Definition=REPLACE(@Definition,N'ItemCode NVARCHAR(50),UnitId BIGINT,',N'ItemCode NVARCHAR(50),UnitId BIGINT NULL,');
SET @Definition=REPLACE(@Definition,N'p.FinishedItemId,i.ItemCode,i.UnitId,NULL',N'p.FinishedItemId,i.ItemCode,p.UnitIdSnapshot,NULL');
SET @Definition=REPLACE(@Definition,N'N''Legacy rejected output was not recorded.''',N'CASE WHEN p.UnitIdSnapshot IS NULL THEN N''Legacy output unit and rejected output are unavailable.'' ELSE N''Legacy rejected output was not recorded.'' END');
SET @Definition=REPLACE(@Definition,N'FROM #Report GROUP BY UnitId',N'FROM #Report WHERE UnitId IS NOT NULL GROUP BY UnitId');
SET @Definition=REPLACE(@Definition,N'JOIN dbo.Units u ON u.Id=r.UnitId',N'LEFT JOIN dbo.Units u ON u.Id=r.UnitId');
SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
GO
DECLARE @Definition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ProductionOperationalReport_Read'));
SET @Definition=REPLACE(@Definition,N'SUM(OnHandQuantity) OnHandQuantity,SUM(ReservedQuantity) ReservedQuantity',N'CASE WHEN COUNT(OnHandQuantity)=COUNT(*) THEN SUM(OnHandQuantity) END OnHandQuantity,CASE WHEN COUNT(ReservedQuantity)=COUNT(*) THEN SUM(ReservedQuantity) END ReservedQuantity');
SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));EXEC sys.sp_executesql @Definition;
GO
