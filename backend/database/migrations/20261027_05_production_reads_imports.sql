SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionReport_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageSize')),50),
 @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.itemId')),@Finished BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.finishedItemId')),@From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.fromDate')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.toDate')),@Search NVARCHAR(200)=JSON_VALUE(@RequestJson,'$.query.search'),@Data NVARCHAR(MAX);
 SET @Page=IIF(@Page<1,1,@Page); SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
 CREATE TABLE #Report(SourceId BIGINT,SourceType NVARCHAR(50),BusinessDate DATE,ItemId BIGINT,ItemCode NVARCHAR(50),UnitId BIGINT,RequiredQuantity DECIMAL(22,6),ExpectedConsumption DECIMAL(22,6),ActualConsumedQuantity DECIMAL(22,6),MaterialWasteQuantity DECIMAL(22,6),GoodOutput DECIMAL(22,6),RejectedOutput DECIMAL(22,6),WastePercent DECIMAL(22,6),DataQualityFlag NVARCHAR(200),ItemName NVARCHAR(200) NULL,UnitName NVARCHAR(100) NULL,FinishedItemId BIGINT NULL);
 IF @Kind=N'materials'
 BEGIN
  INSERT #Report(SourceId,SourceType,BusinessDate,ItemId,ItemCode,UnitId,RequiredQuantity,ExpectedConsumption,ActualConsumedQuantity,MaterialWasteQuantity,GoodOutput,RejectedOutput,WastePercent,DataQualityFlag)
  SELECT c.Id,N'ProductionCompletion',c.BusinessDate,m.ItemId,i.ItemCode,m.UnitId,
   ROUND(m.ExpectedQuantity/(1+om.WastePercent/100.0),6),m.ExpectedQuantity,m.ConsumedQuantity+m.ScrapQuantity,m.ScrapQuantity,NULL,NULL,
   m.ScrapQuantity*100.0/NULLIF(m.ConsumedQuantity+m.ScrapQuantity,0),NULL
  FROM dbo.ProductionCompletions c JOIN dbo.ProductionCompletionMaterials m ON m.CompletionId=c.Id JOIN dbo.Items i ON i.Id=m.ItemId JOIN dbo.ProductionOrderMaterials om ON om.OrderId=c.OrderId AND om.ItemId=m.ItemId
  WHERE c.CompanyKey=@CompanyKey AND c.ReversedById IS NULL AND c.ReversalOfId IS NULL;
  INSERT #Report(SourceId,SourceType,BusinessDate,ItemId,ItemCode,UnitId,RequiredQuantity,ExpectedConsumption,ActualConsumedQuantity,MaterialWasteQuantity,GoodOutput,RejectedOutput,WastePercent,DataQualityFlag)
  SELECT p.Id,N'ManufacturingProduction',p.ProductionDate,m.ComponentItemId,i.ItemCode,m.UnitId,m.RequiredQuantity,m.TotalConsumedQuantity,m.TotalConsumedQuantity,NULL,NULL,NULL,NULL,N'Legacy: actual scrap is unavailable; planned wastage is not measured waste.'
  FROM dbo.ManufacturingProductions p JOIN dbo.ManufacturingProductionMaterials m ON m.ProductionId=p.Id JOIN dbo.Items i ON i.Id=m.ComponentItemId WHERE p.Status=2 AND p.IsDeleted=0;
 END
 ELSE IF @Kind=N'production'
 BEGIN
  INSERT #Report(SourceId,SourceType,BusinessDate,ItemId,ItemCode,UnitId,RequiredQuantity,ExpectedConsumption,ActualConsumedQuantity,MaterialWasteQuantity,GoodOutput,RejectedOutput,WastePercent,DataQualityFlag) SELECT c.Id,N'ProductionCompletion',c.BusinessDate,o.ItemId,i.ItemCode,o.UnitId,NULL,NULL,NULL,NULL,c.GoodOutput,c.RejectedOutput,NULL,NULL
  FROM dbo.ProductionCompletions c JOIN dbo.ProductionOrders o ON o.Id=c.OrderId AND o.CompanyKey=c.CompanyKey JOIN dbo.Items i ON i.Id=o.ItemId WHERE c.CompanyKey=@CompanyKey AND c.ReversedById IS NULL AND c.ReversalOfId IS NULL;
  INSERT #Report(SourceId,SourceType,BusinessDate,ItemId,ItemCode,UnitId,RequiredQuantity,ExpectedConsumption,ActualConsumedQuantity,MaterialWasteQuantity,GoodOutput,RejectedOutput,WastePercent,DataQualityFlag) SELECT p.Id,N'ManufacturingProduction',p.ProductionDate,p.FinishedItemId,i.ItemCode,i.UnitId,NULL,NULL,NULL,NULL,p.ProducedQuantity,NULL,NULL,N'Legacy rejected output was not recorded.' FROM dbo.ManufacturingProductions p JOIN dbo.Items i ON i.Id=p.FinishedItemId WHERE p.Status=2 AND p.IsDeleted=0;
 END ELSE THROW 51100,N'INVALID_REPORT|Unknown production report.',1;

 UPDATE r SET ItemName=i.Name,UnitName=u.ShortName FROM #Report r JOIN dbo.Items i ON i.Id=r.ItemId JOIN dbo.Units u ON u.Id=r.UnitId;
 UPDATE r SET FinishedItemId=o.ItemId FROM #Report r JOIN dbo.ProductionCompletions c ON c.Id=r.SourceId JOIN dbo.ProductionOrders o ON o.Id=c.OrderId WHERE r.SourceType=N'ProductionCompletion';
 UPDATE r SET FinishedItemId=p.FinishedItemId FROM #Report r JOIN dbo.ManufacturingProductions p ON p.Id=r.SourceId WHERE r.SourceType=N'ManufacturingProduction';
 DELETE #Report WHERE (@Item IS NOT NULL AND ItemId<>@Item) OR (@Finished IS NOT NULL AND FinishedItemId<>@Finished) OR (@From IS NOT NULL AND BusinessDate<@From) OR (@To IS NOT NULL AND BusinessDate>@To) OR (@Search IS NOT NULL AND ItemCode NOT LIKE N'%'+@Search+N'%' AND ItemName NOT LIKE N'%'+@Search+N'%');
 SET @Data=(SELECT JSON_QUERY((SELECT * FROM #Report ORDER BY BusinessDate DESC,SourceType,SourceId,ItemId OFFSET (@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Report) TotalCount,
  JSON_QUERY((SELECT UnitId,MAX(UnitName) UnitName,SUM(RequiredQuantity) RequiredQuantity,SUM(ExpectedConsumption) ExpectedConsumption,SUM(ActualConsumedQuantity) ActualConsumedQuantity,
   CASE WHEN COUNT(MaterialWasteQuantity)=COUNT(*) THEN SUM(MaterialWasteQuantity) ELSE NULL END MaterialWasteQuantity,SUM(GoodOutput) GoodOutput,
   CASE WHEN COUNT(RejectedOutput)=COUNT(*) THEN SUM(RejectedOutput) ELSE NULL END RejectedOutput FROM #Report GROUP BY UnitId FOR JSON PATH,INCLUDE_NULL_VALUES)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionPlanning_Inputs @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @AsOf DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.asOfDate')),@From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.demandFrom')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.demandTo')),@Channel BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.channelId')),@Zone SYSNAME=JSON_VALUE(@RequestJson,'$.timeZone'),@Data NVARCHAR(MAX);
 IF NOT EXISTS(SELECT 1 FROM sys.time_zone_info WHERE name=@Zone) THROW 51100,N'INVALID_TIMEZONE|Configure the verified business timezone.',1;
 IF @Channel IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.ProductionDemandObservations o WHERE o.CompanyKey=@CompanyKey AND o.ChannelId IS NULL AND o.IsSuperseded=0 AND o.ObservedFrom=@From AND o.ObservedTo=@To AND(JSON_QUERY(@RequestJson,'$.itemIds') IS NULL OR o.ItemId IN(SELECT TRY_CONVERT(BIGINT,value) FROM OPENJSON(@RequestJson,'$.itemIds')))) THROW 51109,N'NETWORK_DEMAND_NOT_CHANNEL_RESOLVED|A network aggregate cannot be apportioned to a channel without verified source detail.',1;
 /* Genuine dated sales remain genuine daily sales. Aggregates require explicit observed periods in staging;
    this query never distributes an aggregate into fictional sales days. */
 SET @Data=(SELECT i.Id ItemId,i.UnitId,s.DemandQuantity,s.RefreshedOn,i.CurrentStock PhysicalStock,i.ReservedStock,
  COALESCE(o.OpenOutput,0) OpenReleasedOutput,CAST(NULL AS DECIMAL(22,6)) DailyDemand,CAST(NULL AS DECIMAL(22,6)) Target21,CAST(NULL AS DECIMAL(22,6)) Warning15,
  CAST(NULL AS DECIMAL(22,6)) SevenDayDemand,CAST(NULL AS DECIMAL(22,6)) FourWeekSlice,CAST(NULL AS DECIMAL(22,6)) CoverageDays,CAST(NULL AS DECIMAL(22,6)) SuggestedProduction,3 Freshness,
  dbo.ufn_ProductionPlanRevision(@CompanyKey,i.Id,@AsOf,@From,@To,@Channel) SourceRevision
 FROM dbo.Items i
 OUTER APPLY(SELECT SUM(h.BaseQuantity) DemandQuantity,MIN(h.RefreshedOn) RefreshedOn FROM dbo.ufn_ProductionDemandSources(@CompanyKey,i.Id,@From,@To,@Channel,@Zone) h) s
 OUTER APPLY(SELECT SUM(ReleasedQuantity-CompletedQuantity-RejectedQuantity) OpenOutput FROM dbo.ProductionOrders p WHERE p.CompanyKey=@CompanyKey AND p.ItemId=i.Id AND p.Status IN(2,3) AND p.DueDate<=DATEADD(DAY,21,@AsOf)) o
 WHERE i.IsManufactured=1 AND i.IsDeleted=0 AND i.IsActive=1 AND (JSON_QUERY(@RequestJson,'$.itemIds') IS NULL OR i.Id IN(SELECT TRY_CONVERT(BIGINT,value) FROM OPENJSON(@RequestJson,'$.itemIds')))
 ORDER BY i.ItemCode,i.Id FOR JSON PATH,INCLUDE_NULL_VALUES);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionPlanning_SaveSnapshot @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.snapshot.id')),@Data NVARCHAR(MAX)=JSON_QUERY(@RequestJson,'$.snapshot');
 IF @Id IS NULL THROW 51100,N'INVALID_SNAPSHOT|Snapshot identity is required.',1;
 INSERT dbo.ProductionPlanningSnapshots(Id,CompanyKey,AsOfDate,CalculationVersion,RequestJson,SnapshotJson,CreatedBy)
 VALUES(@Id,@CompanyKey,TRY_CONVERT(DATE,JSON_VALUE(@Data,'$.asOfDate')),JSON_VALUE(@Data,'$.calculationVersion'),JSON_QUERY(@RequestJson,'$.request'),@Data,@UserId);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionImport_Stage @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Fingerprint NVARCHAR(128)=JSON_VALUE(@RequestJson,'$.fileFingerprint'),@File NVARCHAR(260)=JSON_VALUE(@RequestJson,'$.fileName'),@Cutover DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.cutoverDate')),@Batch UNIQUEIDENTIFIER,@Data NVARCHAR(MAX);
 IF NULLIF(@Fingerprint,N'') IS NULL OR NULLIF(@File,N'') IS NULL OR @Cutover IS NULL THROW 51100,N'INVALID_IMPORT|File identity and cutover are required.',1;
 BEGIN TRY BEGIN TRAN;
 SELECT @Batch=Id FROM dbo.ProductionImportBatches WITH(UPDLOCK,HOLDLOCK) WHERE CompanyKey=@CompanyKey AND FileFingerprint=@Fingerprint;
 IF @Batch IS NULL
 BEGIN
  SET @Batch=NEWID();
  INSERT dbo.ProductionImportBatches(Id,CompanyKey,FileFingerprint,FileName,CutoverDate,CreatedBy) VALUES(@Batch,@CompanyKey,@Fingerprint,@File,@Cutover,@UserId);
  INSERT dbo.ProductionImportRows(BatchId,Tab,RowNumber,ColumnName,EventFingerprint,OriginalJson,NormalizedJson,ExceptionCode)
  SELECT @Batch,r.Tab,r.RowNumber,r.ColumnName,r.EventFingerprint,r.OriginalJson,r.NormalizedJson,
   COALESCE(r.ExceptionCode,CASE WHEN r.NormalizedJson IS NULL OR ISJSON(r.NormalizedJson)=0 THEN N'MAPPING_REQUIRED' ELSE N'REQUIRES_SERVER_RECONCILIATION' END)
  FROM OPENJSON(@RequestJson,'$.rows') WITH(Tab NVARCHAR(100) '$.tab',RowNumber INT '$.row',ColumnName NVARCHAR(100) '$.column',EventFingerprint NVARCHAR(128) '$.eventFingerprint',OriginalJson NVARCHAR(MAX) '$.originalJson',NormalizedJson NVARCHAR(MAX) '$.normalizedJson',ExceptionCode NVARCHAR(100) '$.exceptionCode') r;
  /* A normalized JSON value is evidence, never posting authority. All rows remain staged. */
  UPDATE r SET ExceptionCode=N'DUPLICATE_PHYSICAL_EVENT' FROM dbo.ProductionImportRows r WHERE r.BatchId=@Batch AND EXISTS(SELECT 1 FROM dbo.ProductionImportRows x JOIN dbo.ProductionImportBatches b ON b.Id=x.BatchId WHERE b.CompanyKey=@CompanyKey AND x.EventFingerprint=r.EventFingerprint AND x.Id<>r.Id);
 END;
 SET @Data=(SELECT @Batch BatchId,COUNT(*) Rows,SUM(CASE WHEN ExceptionCode IS NOT NULL THEN 1 ELSE 0 END) Exceptions,N'Staged' Status FROM dbo.ProductionImportRows WHERE BatchId=@Batch FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
/* Permission pages are registered without granting Approve to existing operational roles.
   Existing System Owner policy continues to govern provisioning. */
MERGE dbo.Pages AS target USING(VALUES
 (N'Manufacturing.Configuration',N'Production Configuration',N'/manufacturing/configuration',N'settings',153),
 (N'Manufacturing.Orders',N'Production Orders',N'/manufacturing/orders',N'factory',154),
 (N'Manufacturing.Reports',N'Production Reports',N'/reports/manufacturing',N'chart-bar',155)) source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,(SELECT Id FROM dbo.Pages WHERE Name=N'Manufacturing'),source.SortOrder,1);
GO
