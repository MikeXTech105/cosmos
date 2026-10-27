SET XACT_ABORT ON;
GO
IF COL_LENGTH('dbo.ProductionOrders','Revision') IS NULL ALTER TABLE dbo.ProductionOrders ADD Revision INT NOT NULL DEFAULT 1;
IF COL_LENGTH('dbo.ManufacturingBoms','ConcurrencyVersion') IS NULL ALTER TABLE dbo.ManufacturingBoms ADD ConcurrencyVersion ROWVERSION;
IF COL_LENGTH('dbo.ProductionOrderMaterials','BaselineOutputQuantity') IS NULL ALTER TABLE dbo.ProductionOrderMaterials ADD BaselineOutputQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,BaselineExpectedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0;
IF OBJECT_ID('dbo.ProductionOrderAmendments','U') IS NULL
CREATE TABLE dbo.ProductionOrderAmendments(Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,OrderId BIGINT NOT NULL REFERENCES dbo.ProductionOrders(Id),BusinessDate DATE NOT NULL,PreviousOrderJson NVARCHAR(MAX) NOT NULL,RequestJson NVARCHAR(MAX) NOT NULL,Reason NVARCHAR(1000) NOT NULL,CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_Amend @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@State INT,@Item BIGINT,@Bom BIGINT,@Route BIGINT,@Shift BIGINT,
 @Qty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.releasedQuantity')),@Planned DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.plannedQuantity')),@OldReleased DECIMAL(22,6),@Done DECIMAL(22,6),@Start DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.plannedStart')),@Due DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.dueDate')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate')),@Plan UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.request.sourcePlanId')),@OldPlan UNIQUEIDENTIFIER,
 @Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Old NVARCHAR(MAX),@Err NVARCHAR(2048);
 IF @Qty IS NULL OR @Qty<=0 OR @Date IS NULL OR @Start IS NULL OR @Due<@Start THROW 51100,N'INVALID_AMENDMENT|A positive amended quantity and valid dates are required.',1;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @Current=RowVersion,@State=Status,@Item=ItemId,@Bom=BomId,@Route=RoutingId,@Shift=ShiftId,@Planned=COALESCE(@Planned,PlannedQuantity),@OldReleased=ReleasedQuantity,@Done=CompletedQuantity+RejectedQuantity,@OldPlan=SourcePlanId FROM dbo.ProductionOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload before approving the amendment.';THROW 51109,@Err,1;END;
 IF @State NOT IN(2,3) OR @Qty<=@Done OR @Planned<@Qty THROW 51109,N'INVALID_AMENDMENT_STATE|Amend only open released work, keep completed history, and use close for a zero remainder.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingBoms WHERE Id=@Bom AND IsActive=1 AND IsDeleted=0 AND EffectiveFrom<=@Start AND(EffectiveTo IS NULL OR EffectiveTo>=@Start)) OR NOT EXISTS(SELECT 1 FROM dbo.ItemProductionRoutings WHERE Id=@Route AND CompanyKey=@CompanyKey AND IsActive=1 AND EffectiveFrom<=@Start AND(EffectiveTo IS NULL OR EffectiveTo>=@Start)) THROW 51109,N'AMENDMENT_EFFECTIVITY|The frozen BOM and route must remain valid on the amended start date.',1;
 IF EXISTS(SELECT 1 FROM dbo.ItemProductionRoutingSteps s WHERE s.RoutingId=@Route AND NOT EXISTS(SELECT 1 FROM dbo.ProductionWorkCentreShifts c JOIN dbo.HR_Shifts h ON h.Id=c.ShiftId AND h.IsActive=1 AND h.IsDeleted=0 WHERE c.WorkCentreId=s.WorkCentreId AND c.CompanyKey=@CompanyKey AND c.ShiftId=@Shift AND c.IsActive=1 AND c.EffectiveFrom<=@Start AND(c.EffectiveTo IS NULL OR c.EffectiveTo>=@Start))) THROW 51109,N'CAPACITY_UNAVAILABLE|Amended dates have no verified work centre shift capacity.',1;
 IF @OldPlan IS NOT NULL OR @Plan IS NOT NULL
 BEGIN
  IF @Plan IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots p CROSS APPLY OPENJSON(p.SnapshotJson,'$.lines') WITH(ItemId BIGINT '$.itemId',SuggestedProduction DECIMAL(22,6) '$.suggestedProduction',SourceRevision NVARCHAR(200) '$.sourceRevision') l WHERE p.Id=@Plan AND p.CompanyKey=@CompanyKey AND p.AsOfDate=@Date AND l.ItemId=@Item AND @Qty<=@OldReleased+COALESCE(l.SuggestedProduction,0) AND l.SourceRevision=dbo.ufn_ProductionPlanRevision(@CompanyKey,@Item,p.AsOfDate,TRY_CONVERT(DATE,JSON_VALUE(p.RequestJson,'$.demandFrom')),TRY_CONVERT(DATE,JSON_VALUE(p.RequestJson,'$.demandTo')),TRY_CONVERT(BIGINT,JSON_VALUE(p.RequestJson,'$.channelId')))) THROW 51109,N'STALE_PLAN|Refresh linked demand before changing a recommendation-backed released quantity.',1;
 END;
 SET @Old=(SELECT * FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 SELECT m.Id,m.ItemId,m.RequiredQuantity OldRequired,COALESCE(p.ExpectedQuantity,0) PastExpected,
 ROUND((@Qty-@Done)/m.OutputBaseQuantity*m.SourceComponentQuantity*(1+m.WastePercent/100.0),6) RemainingBudget,
 r.Id ReservationId,r.ConsumedQuantity+r.ReleasedQuantity+ROUND((@Qty-@Done)/m.OutputBaseQuantity*m.SourceComponentQuantity*(1+m.WastePercent/100.0),6)-r.ReservedQuantity Delta
 INTO #Amended FROM dbo.ProductionOrderMaterials m JOIN dbo.ProductionReservations r ON r.OrderId=m.OrderId AND r.ItemId=m.ItemId AND r.CompanyKey=@CompanyKey
 OUTER APPLY(SELECT SUM(cm.ExpectedQuantity) ExpectedQuantity FROM dbo.ProductionCompletionMaterials cm JOIN dbo.ProductionCompletions c ON c.Id=cm.CompletionId WHERE c.OrderId=@Id AND c.CompanyKey=@CompanyKey AND cm.ItemId=m.ItemId AND c.ReversalOfId IS NULL AND c.ReversedById IS NULL) p WHERE m.OrderId=@Id;
 IF EXISTS(SELECT 1 FROM #Amended a JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=a.ItemId WHERE i.IsDeleted=1 OR i.IsActive=0 OR i.TrackInventory=0 OR(a.Delta>0 AND i.CurrentStock-i.ReservedStock<a.Delta) OR a.RemainingBudget<=0) THROW 51109,N'AMENDMENT_MATERIAL_SHORTAGE|The entire amended remaining allocation must be available; no partial amendment was applied.',1;
 UPDATE i SET ReservedStock=i.ReservedStock+a.Delta,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN #Amended a ON a.ItemId=i.Id;
 UPDATE r SET ReservedQuantity=r.ReservedQuantity+a.Delta FROM dbo.ProductionReservations r JOIN #Amended a ON a.ReservationId=r.Id;
 INSERT dbo.ProductionReservationEvents(CompanyKey,ReservationId,BusinessDate,ReservedDelta,ConsumedDelta,ReleasedDelta,EventType,SourceId,CreatedBy) SELECT @CompanyKey,ReservationId,@Date,Delta,0,0,N'Amendment',@Id,@UserId FROM #Amended;
 UPDATE m SET RequiredQuantity=a.PastExpected+a.RemainingBudget,BaselineOutputQuantity=@Done,BaselineExpectedQuantity=a.PastExpected FROM dbo.ProductionOrderMaterials m JOIN #Amended a ON a.Id=m.Id;
 UPDATE dbo.ProductionCapacityReservations SET IsActive=0 WHERE OrderId=@Id AND CompanyKey=@CompanyKey AND IsActive=1;
 INSERT dbo.ProductionOrderAmendments(CompanyKey,OrderId,BusinessDate,PreviousOrderJson,RequestJson,Reason,CreatedBy) VALUES(@CompanyKey,@Id,@Date,@Old,@RequestJson,JSON_VALUE(@RequestJson,'$.request.reason'),@UserId);
 UPDATE dbo.ProductionOrders SET PlannedQuantity=@Planned,ReleasedQuantity=@Qty,PlannedStart=@Start,DueDate=@Due,Revision=Revision+1,SourcePlanId=COALESCE(@Plan,SourcePlanId),BomSnapshotJson=JSON_MODIFY(BomSnapshotJson,'$.Materials',JSON_QUERY((SELECT * FROM dbo.ProductionOrderMaterials WHERE OrderId=@Id FOR JSON PATH))),ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'AmendedRescheduleRequired' Status FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'Amend',@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionConfiguration_EndEffectivity @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Kind NVARCHAR(20)=JSON_VALUE(@RequestJson,'$.kind'),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.effectiveTo')),
 @Current BINARY(8),@From DATE,@OldTo DATE,@Table SYSNAME,@VersionColumn SYSNAME,@Sql NVARCHAR(MAX),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048);
 SELECT @Table=CASE @Kind WHEN N'routing' THEN N'ItemProductionRoutings' WHEN N'eligibility' THEN N'ItemProductionEligibility' WHEN N'shift' THEN N'ProductionWorkCentreShifts' WHEN N'bom' THEN N'ManufacturingBoms' END,@VersionColumn=CASE WHEN @Kind=N'bom' THEN N'ConcurrencyVersion' ELSE N'RowVersion' END;
 IF @Table IS NULL OR @To IS NULL THROW 51100,N'INVALID_EFFECTIVITY|Select a supported configuration family and an explicit end date.',1;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SET @Sql=N'SELECT @Current='+QUOTENAME(@VersionColumn)+N',@From=EffectiveFrom,@OldTo=EffectiveTo FROM dbo.'+QUOTENAME(@Table)+N' WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id'+CASE WHEN @Kind=N'bom' THEN N'' ELSE N' AND CompanyKey=@CompanyKey' END;
 EXEC sys.sp_executesql @Sql,N'@Id BIGINT,@CompanyKey NVARCHAR(64),@Current BINARY(8) OUTPUT,@From DATE OUTPUT,@OldTo DATE OUTPUT',@Id,@CompanyKey,@Current OUTPUT,@From OUTPUT,@OldTo OUTPUT;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Configuration revision was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload before changing effectivity.';THROW 51109,@Err,1;END;
 IF @To<@From OR(@OldTo IS NOT NULL AND @To>@OldTo) THROW 51109,N'INVALID_EFFECTIVITY|Close an existing revision without extending or erasing historical dates.',1;
 IF @Kind=N'bom' AND(EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE BomId=@Id AND Status<>1 AND PlannedStart>@To) OR EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WHERE BomId=@Id AND ProductionDate>@To)) THROW 51109,N'REFERENCED_EFFECTIVITY|The end date would invalidate existing production history or released work.',1;
 IF @Kind=N'routing' AND EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE RoutingId=@Id AND CompanyKey=@CompanyKey AND Status<>1 AND PlannedStart>@To) THROW 51109,N'REFERENCED_EFFECTIVITY|The end date would invalidate released routing assignments.',1;
 IF @Kind=N'eligibility' AND EXISTS(SELECT 1 FROM dbo.ItemProductionEligibility e JOIN dbo.ProductionOrders o ON o.CompanyKey=e.CompanyKey AND o.ItemId=e.ItemId AND o.MachineId=e.MachineId AND o.MouldId=e.MouldId WHERE e.Id=@Id AND e.CompanyKey=@CompanyKey AND o.Status IN(2,3) AND o.PlannedStart>@To) THROW 51109,N'REFERENCED_EFFECTIVITY|Amend future released resource assignments first.',1;
 IF @Kind=N'shift' AND EXISTS(SELECT 1 FROM dbo.ProductionWorkCentreShifts c JOIN dbo.ItemProductionRoutingSteps s ON s.WorkCentreId=c.WorkCentreId JOIN dbo.ProductionOrders o ON o.RoutingId=s.RoutingId AND o.ShiftId=c.ShiftId AND o.CompanyKey=c.CompanyKey WHERE c.Id=@Id AND c.CompanyKey=@CompanyKey AND o.Status IN(2,3) AND o.PlannedStart>@To) THROW 51109,N'REFERENCED_EFFECTIVITY|Amend future released shift assignments first.',1;
 SET @Sql=N'UPDATE dbo.'+QUOTENAME(@Table)+N' SET EffectiveTo=@To WHERE Id=@Id;SELECT @Current='+QUOTENAME(@VersionColumn)+N' FROM dbo.'+QUOTENAME(@Table)+N' WHERE Id=@Id;';
 EXEC sys.sp_executesql @Sql,N'@Id BIGINT,@To DATE,@Current BINARY(8) OUTPUT',@Id,@To,@Current OUTPUT;
 SET @Data=(SELECT @Id Id,CONVERT(VARCHAR(18),@Current,1) Version,N'EffectivityClosed' Status FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'EndEffectivity',@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
DECLARE @Name SYSNAME,@Definition NVARCHAR(MAX);
DECLARE context_contracts CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM(VALUES(N'vw_ProductionOrderContract'),(N'sp_ProductionOrder_Read'),(N'sp_ProductionWorkspace_Context'),(N'sp_ManufacturingBom_GetById'),(N'sp_ManufacturingBom_GetApplicable'),(N'sp_ProcurementPlanning_CalculationInputs')) x(Name);
OPEN context_contracts;FETCH NEXT FROM context_contracts INTO @Name;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @Definition=OBJECT_DEFINITION(OBJECT_ID(N'dbo.'+@Name));
 IF @Name LIKE N'sp_ManufacturingBom%' AND CHARINDEX(N'AS ConcurrencyVersion',@Definition)=0 SET @Definition=REPLACE(@Definition,N'SELECT b.Id,',N'SELECT b.Id,CONVERT(VARCHAR(18),(SELECT ConcurrencyVersion FROM dbo.ManufacturingBoms cb WHERE cb.Id=b.Id),1) AS ConcurrencyVersion,');
 IF @Name IN(N'vw_ProductionOrderContract',N'sp_ProductionOrder_Read',N'sp_ProductionWorkspace_Context') AND CHARINDEX(N'Revision,PlannedQuantity',@Definition)=0 SET @Definition=REPLACE(@Definition,N'PlannedQuantity,ReleasedQuantity',N'Revision,PlannedQuantity,ReleasedQuantity');
 IF @Name=N'sp_ProcurementPlanning_CalculationInputs' AND CHARINDEX(N'AS SourceComponentQuantity',@Definition)=0 SET @Definition=REPLACE(@Definition,N'AS QuantityRequired,',N'AS QuantityRequired,x.Quantity AS SourceComponentQuantity,(SELECT OutputBaseQuantity FROM dbo.ManufacturingBoms rawbom WHERE rawbom.Id=x.BomId) AS BomOutputBaseQuantity,x.WastagePercentage AS BomWastePercentage,');
 IF @Name=N'vw_ProductionOrderContract' SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'VIEW',UPPER(@Definition)),LEN(@Definition));
 ELSE SET @Definition=N'ALTER '+SUBSTRING(@Definition,CHARINDEX(N'PROCEDURE',UPPER(@Definition)),LEN(@Definition));
 EXEC sys.sp_executesql @Definition;
 FETCH NEXT FROM context_contracts INTO @Name;
END;
CLOSE context_contracts;DEALLOCATE context_contracts;
GO
