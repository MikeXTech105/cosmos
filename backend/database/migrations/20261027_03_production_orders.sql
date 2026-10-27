SET XACT_ABORT ON;
GO
CREATE OR ALTER VIEW dbo.vw_ProductionOrderContract AS
 SELECT Id,CompanyKey,OrderNumber,Status,BusinessDate,PlannedStart,DueDate,ItemId,UnitId,BomId,RoutingId,
 PlannedQuantity,ReleasedQuantity,CompletedQuantity,RejectedQuantity,
 CASE WHEN Status IN(5,6) THEN CONVERT(DECIMAL(22,6),0) ELSE ReleasedQuantity-CompletedQuantity-RejectedQuantity END RemainingQuantity,
 CONVERT(VARCHAR(18),RowVersion,1) Version,Notes
 FROM dbo.ProductionOrders;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Data NVARCHAR(MAX);
 IF @Id IS NOT NULL
 BEGIN
  SET @Data=(SELECT Id,OrderNumber,Status,BusinessDate,PlannedStart,DueDate,ItemId,UnitId,BomId,RoutingId,PlannedQuantity,ReleasedQuantity,CompletedQuantity,RejectedQuantity,RemainingQuantity,Version,Notes FROM dbo.vw_ProductionOrderContract WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
  IF @Data IS NULL THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 END
 ELSE
 BEGIN
  DECLARE @Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageSize')),50),
   @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.query.itemId')),@Status INT=TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.status')),
   @From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.fromDate')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.query.toDate')),@Search NVARCHAR(200)=JSON_VALUE(@RequestJson,'$.query.search');
  SET @Page=IIF(@Page<1,1,@Page); SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
  SELECT Id,OrderNumber,Status,BusinessDate,PlannedStart,DueDate,ItemId,UnitId,BomId,RoutingId,PlannedQuantity,ReleasedQuantity,CompletedQuantity,RejectedQuantity,RemainingQuantity,Version,Notes
  INTO #Orders FROM dbo.vw_ProductionOrderContract WHERE CompanyKey=@CompanyKey AND (@Item IS NULL OR ItemId=@Item) AND (@Status IS NULL OR Status=@Status) AND (@From IS NULL OR BusinessDate>=@From) AND (@To IS NULL OR BusinessDate<=@To) AND (@Search IS NULL OR OrderNumber LIKE N'%'+@Search+N'%');
  SET @Data=(SELECT JSON_QUERY((SELECT * FROM #Orders ORDER BY BusinessDate DESC,Id DESC OFFSET (@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM #Orders) TotalCount,
   JSON_QUERY((SELECT UnitId,SUM(PlannedQuantity) PlannedQuantity,SUM(ReleasedQuantity) ReleasedQuantity,SUM(CompletedQuantity) CompletedQuantity,SUM(RejectedQuantity) RejectedQuantity,SUM(RemainingQuantity) RemainingQuantity FROM #Orders GROUP BY UnitId FOR JSON PATH)) Summary FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 END;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_SaveDraft @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.itemId')),
 @Bom BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.bomId')),@Routing BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.routingId')),
 @Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),@Start DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.plannedStart')),@Due DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.dueDate')),
 @Qty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.plannedQuantity')),
 @Machine BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.machineId')),@Mould BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.mouldId')),@Shift BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.shiftId')),
 @Channel BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.channelId')),@Plan UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.request.sourcePlanId')),@Line NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.sourceLineId'),
 @Reference NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.reference'),@Notes NVARCHAR(1000)=JSON_VALUE(@RequestJson,'$.request.notes'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@Unit BIGINT,@Err NVARCHAR(2048),@Read NVARCHAR(MAX);
 IF @Date IS NULL OR @Start IS NULL OR @Due IS NULL OR @Due<@Start OR @Qty IS NULL OR @Qty<=0 THROW 51100,N'INVALID_DRAFT|Business dates and positive planned quantity are required.',1;
 BEGIN TRY
 BEGIN TRAN;
 SELECT @Unit=UnitId FROM dbo.Items WITH(HOLDLOCK) WHERE Id=@Item AND IsActive=1 AND IsDeleted=0 AND IsManufactured=1 AND TrackInventory=1;
 IF @Unit IS NULL THROW 51100,N'INVALID_ITEM|An active inventory-tracked manufactured Item is required.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingBoms WHERE Id=@Bom AND FinishedItemId=@Item AND IsDeleted=0) THROW 51100,N'INVALID_BOM|BOM does not belong to the selected Item.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ItemProductionRoutings WHERE Id=@Routing AND CompanyKey=@CompanyKey AND ItemId=@Item) THROW 51100,N'INVALID_ROUTE|Routing does not belong to this company Item.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE Id=@Machine AND IsActive=1 AND IsDeleted=0) OR NOT EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE Id=@Mould AND IsActive=1 AND IsDeleted=0) OR NOT EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@Shift AND IsActive=1 AND IsDeleted=0) THROW 51100,N'INVALID_RESOURCES|Active OEE machine/mould and HR shift are required.',1;
 IF @Channel IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@Channel AND IsActive=1 AND IsDeleted=0) THROW 51100,N'INVALID_CHANNEL|Channel is inactive or missing.',1;
 IF @Plan IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots s CROSS APPLY OPENJSON(s.SnapshotJson,'$.lines') WITH(ItemId BIGINT '$.itemId') l WHERE s.Id=@Plan AND s.CompanyKey=@CompanyKey AND l.ItemId=@Item AND @Line=CONVERT(NVARCHAR(100),@Item)) THROW 51109,N'STALE_PLAN|The selected source plan line is not present in this company snapshot.',1;
 IF @Plan IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots s CROSS APPLY OPENJSON(s.SnapshotJson,'$.lines') WITH(ItemId BIGINT '$.itemId',SuggestedProduction DECIMAL(22,6) '$.suggestedProduction',Freshness INT '$.freshness') l WHERE s.Id=@Plan AND s.CompanyKey=@CompanyKey AND l.ItemId=@Item AND l.Freshness=1 AND l.SuggestedProduction>=@Qty) THROW 51109,N'RECOMMENDATION_UNAVAILABLE|Refresh demand and use an eligible positive recommendation; manual orders must declare their own source.',1;
 IF @Id IS NULL
 BEGIN
  DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Pad INT;
  SELECT @Next=NextNumber,@Prefix=Prefix,@Pad=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ProductionOrder';
  IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ProductionOrder',N'PRO-',2,8); SELECT @Next=1,@Prefix=N'PRO-',@Pad=8; END
  ELSE UPDATE dbo.NumberSequences SET NextNumber=NextNumber+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ProductionOrder';
  INSERT dbo.ProductionOrders(CompanyKey,OrderNumber,BusinessDate,PlannedStart,DueDate,ItemId,UnitId,BomId,RoutingId,PlannedQuantity,MachineId,MouldId,ShiftId,ChannelId,SourcePlanId,SourceLineId,Reference,Notes,CreatedBy)
  VALUES(@CompanyKey,@Prefix+RIGHT(REPLICATE(N'0',@Pad)+CONVERT(NVARCHAR(30),@Next),@Pad),@Date,@Start,@Due,@Item,@Unit,@Bom,@Routing,@Qty,@Machine,@Mould,@Shift,@Channel,@Plan,@Line,@Reference,@Notes,@UserId); SET @Id=SCOPE_IDENTITY();
 END
 ELSE
 BEGIN
  DECLARE @State INT;
  SELECT @Current=RowVersion,@State=Status FROM dbo.ProductionOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
  IF @Current IS NULL THROW 51104,N'NOT_FOUND|Production order was not found.',1;
  IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the production order.'; THROW 51109,@Err,1; END;
  IF @State<>1 THROW 51109,N'INVALID_STATE|Only a draft may be edited. Released changes require an explicit amendment.',1;
  UPDATE dbo.ProductionOrders SET BusinessDate=@Date,PlannedStart=@Start,DueDate=@Due,ItemId=@Item,UnitId=@Unit,BomId=@Bom,RoutingId=@Routing,PlannedQuantity=@Qty,MachineId=@Machine,MouldId=@Mould,ShiftId=@Shift,ChannelId=@Channel,SourcePlanId=@Plan,SourceLineId=@Line,Reference=@Reference,Notes=@Notes,ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
 END;
 COMMIT;
 SET @Read=(SELECT @Id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionOrder_Read @CompanyKey,@UserId,@Read;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_Release @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Qty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.quantity')),
 @Current BINARY(8),@Status INT,@Item BIGINT,@Bom BIGINT,@Route BIGINT,@Date DATE,@Planned DECIMAL(22,6),@Machine BIGINT,@Mould BIGINT,@Shift BIGINT,@Unit BIGINT,
 @Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048),@BomJson NVARCHAR(MAX),@RouteJson NVARCHAR(MAX),@SourcePlan UNIQUEIDENTIFIER,
 @ReleaseDate DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate'));
 IF NULLIF(@Key,N'') IS NULL OR @Qty IS NULL OR @Qty<=0 OR @ReleaseDate IS NULL THROW 51100,N'INVALID_RELEASE|A key, business date and positive release quantity are required.',1;
 BEGIN TRY
 BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Prior; RETURN; END;
 SELECT @Current=RowVersion,@Status=Status,@Item=ItemId,@Bom=BomId,@Route=RoutingId,@Date=PlannedStart,@Planned=PlannedQuantity,@Machine=MachineId,@Mould=MouldId,@Shift=ShiftId,@Unit=UnitId,@SourcePlan=SourcePlanId FROM dbo.ProductionOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the order before releasing.'; THROW 51109,@Err,1; END;
 IF @Status<>1 OR @Qty>@Planned THROW 51109,N'INVALID_STATE|Only a draft may release an explicit quantity up to its plan.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Item AND IsActive=1 AND IsDeleted=0 AND IsManufactured=1 AND TrackInventory=1 AND UnitId=@Unit) THROW 51109,N'ITEM_CHANGED|The finished Item or its unit is no longer valid.',1;
 IF (SELECT COUNT(*) FROM dbo.ManufacturingBoms WHERE FinishedItemId=@Item AND Status=2 AND IsActive=1 AND IsDeleted=0 AND EffectiveFrom<=@Date AND (EffectiveTo IS NULL OR EffectiveTo>=@Date))<>1 OR NOT EXISTS(SELECT 1 FROM dbo.ManufacturingBoms WHERE Id=@Bom AND Status=2 AND IsActive=1 AND IsDeleted=0 AND EffectiveFrom<=@Date AND (EffectiveTo IS NULL OR EffectiveTo>=@Date)) THROW 51109,N'BOM_AMBIGUOUS_OR_INEFFECTIVE|Exactly one approved effective canonical BOM is required.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ItemProductionRoutings WHERE Id=@Route AND CompanyKey=@CompanyKey AND ItemId=@Item AND IsActive=1 AND EffectiveFrom<=@Date AND (EffectiveTo IS NULL OR EffectiveTo>=@Date)) THROW 51109,N'ROUTE_INEFFECTIVE|Routing is inactive or outside its effective dates.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ItemProductionEligibility e JOIN dbo.OeeMachines m ON m.Id=e.MachineId AND m.IsActive=1 AND m.IsDeleted=0 JOIN dbo.OeeMoulds mo ON mo.Id=e.MouldId AND mo.IsActive=1 AND mo.IsDeleted=0 WHERE e.CompanyKey=@CompanyKey AND e.ItemId=@Item AND e.MachineId=@Machine AND e.MouldId=@Mould AND e.IsActive=1 AND e.EffectiveFrom<=@Date AND (e.EffectiveTo IS NULL OR e.EffectiveTo>=@Date) AND e.SkuOutputPerShot<=mo.Cavity) THROW 51109,N'RESOURCE_INELIGIBLE|Verified effective machine/mould output mapping is required.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ItemProductionRoutingSteps WHERE RoutingId=@Route) OR EXISTS(SELECT 1 FROM dbo.ItemProductionRoutingSteps s LEFT JOIN dbo.ProductionWorkCentres w ON w.Id=s.WorkCentreId AND w.CompanyKey=@CompanyKey AND w.IsActive=1 LEFT JOIN dbo.ProductionOperations o ON o.Id=s.OperationId AND o.CompanyKey=@CompanyKey AND o.IsActive=1 WHERE s.RoutingId=@Route AND (w.Id IS NULL OR o.Id IS NULL OR (s.MachineId IS NOT NULL AND s.MachineId<>@Machine) OR (s.MouldId IS NOT NULL AND s.MouldId<>@Mould) OR NOT EXISTS(SELECT 1 FROM dbo.ProductionWorkCentreShifts c JOIN dbo.HR_Shifts h ON h.Id=c.ShiftId AND h.IsActive=1 AND h.IsDeleted=0 WHERE c.WorkCentreId=s.WorkCentreId AND c.CompanyKey=@CompanyKey AND c.ShiftId=@Shift AND c.IsActive=1 AND c.EffectiveFrom<=@Date AND (c.EffectiveTo IS NULL OR c.EffectiveTo>=@Date)))) THROW 51109,N'ROUTE_CAPACITY_UNAVAILABLE|Route operations, resources or work centre shift capacity are unavailable.',1;
 IF @SourcePlan IS NOT NULL
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots p CROSS APPLY OPENJSON(p.SnapshotJson,'$.lines') WITH(ItemId BIGINT '$.itemId',SourceRevision NVARCHAR(200) '$.sourceRevision') l WHERE p.Id=@SourcePlan AND p.CompanyKey=@CompanyKey AND l.ItemId=@Item AND(p.AsOfDate<>@ReleaseDate OR l.SourceRevision<>dbo.ufn_ProductionPlanRevision(@CompanyKey,@Item,p.AsOfDate,TRY_CONVERT(DATE,JSON_VALUE(p.RequestJson,'$.demandFrom')),TRY_CONVERT(DATE,JSON_VALUE(p.RequestJson,'$.demandTo')),TRY_CONVERT(BIGINT,JSON_VALUE(p.RequestJson,'$.channelId'))))) THROW 51109,N'STALE_PLAN|Demand, stock, open output, BOM/routing or business date changed. Refresh before release.',1;
 END;
 /* Lock all component rows and output in one deterministic order before reading availability. */
 DECLARE @LockItem BIGINT;
 DECLARE item_locks CURSOR LOCAL FAST_FORWARD FOR SELECT ItemId FROM(SELECT ComponentItemId ItemId FROM dbo.ManufacturingBomItems WHERE BomId=@Bom AND IsDeleted=0 UNION SELECT @Item) x ORDER BY ItemId;
 OPEN item_locks; FETCH NEXT FROM item_locks INTO @LockItem;
 WHILE @@FETCH_STATUS=0 BEGIN SELECT @LockItem=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LockItem; FETCH NEXT FROM item_locks INTO @LockItem; END; CLOSE item_locks; DEALLOCATE item_locks;
 IF EXISTS(SELECT 1 FROM dbo.ManufacturingBomItems b LEFT JOIN dbo.Items i ON i.Id=b.ComponentItemId WHERE b.BomId=@Bom AND b.IsDeleted=0 AND (i.Id IS NULL OR i.IsActive=0 OR i.IsDeleted=1 OR i.TrackInventory=0 OR i.UnitId<>b.UnitId OR i.Id=@Item)) THROW 51109,N'COMPONENT_INVALID|Components must be active inventory Items with verified base-unit BOM quantities.',1;
 INSERT dbo.ProductionOrderMaterials(OrderId,ItemId,UnitId,QuantityPerOutput,WastePercent,RequiredQuantity,SourceComponentQuantity,OutputBaseQuantity)
 SELECT @Id,b.ComponentItemId,b.UnitId,b.Quantity / h.OutputBaseQuantity,b.WastagePercentage,
 ROUND(@Qty / h.OutputBaseQuantity*b.Quantity*(1+b.WastagePercentage/100.0),6),b.Quantity,h.OutputBaseQuantity FROM dbo.ManufacturingBomItems b JOIN dbo.ManufacturingBoms h ON h.Id=b.BomId WHERE b.BomId=@Bom AND b.IsDeleted=0;
 IF @@ROWCOUNT=0 THROW 51109,N'EMPTY_BOM|An effective BOM with material lines is required.',1;
 IF EXISTS(SELECT 1 FROM dbo.ProductionOrderMaterials m JOIN dbo.Items i ON i.Id=m.ItemId WHERE m.OrderId=@Id AND (m.RequiredQuantity<=0 OR i.CurrentStock-i.ReservedStock<m.RequiredQuantity)) THROW 51109,N'INSUFFICIENT_FREE_STOCK|The complete approved allocation cannot be reserved. No part was released.',1;
 INSERT dbo.ProductionReservations(CompanyKey,OrderId,SourceLineId,ItemId,ReservedQuantity) SELECT @CompanyKey,@Id,Id,ItemId,RequiredQuantity FROM dbo.ProductionOrderMaterials WHERE OrderId=@Id;
 INSERT dbo.ProductionReservationEvents(CompanyKey,ReservationId,BusinessDate,ReservedDelta,ConsumedDelta,ReleasedDelta,EventType,SourceId,CreatedBy) SELECT @CompanyKey,Id,@ReleaseDate,ReservedQuantity,0,0,N'Release',@Id,@UserId FROM dbo.ProductionReservations WHERE CompanyKey=@CompanyKey AND OrderId=@Id;
 UPDATE i SET ReservedStock=i.ReservedStock+r.ReservedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ProductionReservations r ON r.ItemId=i.Id WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey;
 SET @BomJson=(SELECT h.Id,h.Version,h.OutputBaseQuantity,JSON_QUERY((SELECT * FROM dbo.ProductionOrderMaterials WHERE OrderId=@Id FOR JSON PATH)) Materials FROM dbo.ManufacturingBoms h WHERE h.Id=@Bom FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 SET @RouteJson=(SELECT s.*,e.SkuOutputPerShot FROM dbo.ItemProductionRoutingSteps s CROSS JOIN dbo.ItemProductionEligibility e WHERE s.RoutingId=@Route AND e.CompanyKey=@CompanyKey AND e.ItemId=@Item AND e.MachineId=@Machine AND e.MouldId=@Mould AND e.IsActive=1 AND e.EffectiveFrom<=@Date AND(e.EffectiveTo IS NULL OR e.EffectiveTo>=@Date) ORDER BY s.Sequence FOR JSON PATH);
 UPDATE dbo.ProductionOrders SET Status=2,ReleasedQuantity=@Qty,BomSnapshotJson=@BomJson,RouteSnapshotJson=@RouteJson,ModifiedAtUtc=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'Released' Status FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'Release',@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
