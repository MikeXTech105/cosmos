SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_Complete @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),
 @Occurred DATETIMEOFFSET=TRY_CONVERT(DATETIMEOFFSET,JSON_VALUE(@RequestJson,'$.request.occurredAt')),
 @Good DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.goodOutput')),@Reject DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.rejectedOutput')),
 @Machine BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.machineId')),@Mould BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.mouldId')),@Shift BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.shiftId')),
 @Reason NVARCHAR(1000)=JSON_VALUE(@RequestJson,'$.request.varianceReason'),@Ref NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.sourceReference'),
 @Current BINARY(8),@Status INT,@Item BIGINT,@Released DECIMAL(22,6),@Done DECIMAL(22,6),@OrderMachine BIGINT,@OrderMould BIGINT,@OrderShift BIGINT,@OrderDate DATE,
 @Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048),@Completion BIGINT,@Physical UNIQUEIDENTIFIER=NEWID();
 IF NULLIF(@Key,N'') IS NULL OR @Date IS NULL OR @Occurred IS NULL OR @Good IS NULL OR @Reject IS NULL OR @Good<0 OR @Reject<0 OR @Good+@Reject<=0 THROW 51100,N'INVALID_COMPLETION|Key, business timestamp and positive nonnegative output are required.',1;
 DECLARE @Materials TABLE(ItemId BIGINT NOT NULL,UnitId BIGINT NOT NULL,ConsumedQuantity DECIMAL(22,6) NOT NULL,ScrapQuantity DECIMAL(22,6) NOT NULL,ReturnedQuantity DECIMAL(22,6) NOT NULL,ExpectedQuantity DECIMAL(22,6) NULL,ReservationConsumed DECIMAL(22,6) NULL);
 INSERT @Materials(ItemId,UnitId,ConsumedQuantity,ScrapQuantity,ReturnedQuantity) SELECT ItemId,UnitId,ConsumedQuantity,COALESCE(ScrapQuantity,0),COALESCE(ReturnedQuantity,0) FROM OPENJSON(@RequestJson,'$.request.materials') WITH(ItemId BIGINT '$.itemId',UnitId BIGINT '$.unitId',ConsumedQuantity DECIMAL(22,6) '$.consumedQuantity',ScrapQuantity DECIMAL(22,6) '$.scrapQuantity',ReturnedQuantity DECIMAL(22,6) '$.returnedQuantity');
 IF NOT EXISTS(SELECT 1 FROM @Materials) OR EXISTS(SELECT ItemId FROM @Materials GROUP BY ItemId HAVING COUNT(*)>1) OR EXISTS(SELECT 1 FROM @Materials WHERE ConsumedQuantity<0 OR ScrapQuantity<0 OR ReturnedQuantity<0) THROW 51100,N'INVALID_CONSUMPTION|Unique component lines with nonnegative actual quantities are required.',1;
 BEGIN TRY
 BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Prior; RETURN; END;
 SELECT @Current=RowVersion,@Status=Status,@Item=ItemId,@Released=ReleasedQuantity,@Done=CompletedQuantity+RejectedQuantity,@OrderMachine=MachineId,@OrderMould=MouldId,@OrderShift=ShiftId,@OrderDate=BusinessDate FROM dbo.ProductionOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the order before posting completion.'; THROW 51109,@Err,1; END;
 IF @Status NOT IN(2,3) OR @Done+@Good+@Reject>@Released THROW 51109,N'OUTPUT_EXCEEDS_REMAINDER|Completion must fit the remaining released output. Overproduction tolerance is zero.',1;
 IF @Date<@OrderDate THROW 51100,N'INVALID_BUSINESS_DATE|A completion cannot precede its order business date.',1;
 IF EXISTS(SELECT 1 FROM dbo.ProductionReservationEvents e JOIN dbo.ProductionReservations r ON r.Id=e.ReservationId WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey AND e.BusinessDate>@Date) THROW 51109,N'BACKDATED_RESERVATION_EVENT|Completion cannot precede an existing reservation event.',1;
 IF @Machine<>@OrderMachine OR @Mould<>@OrderMould OR @Shift<>@OrderShift THROW 51109,N'RESOURCE_CHANGED|Actual resources must match the released assignment; amend explicitly before changing resources.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE Id=@Machine AND IsActive=1 AND IsDeleted=0) OR NOT EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE Id=@Mould AND IsActive=1 AND IsDeleted=0) OR NOT EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@Shift AND IsActive=1 AND IsDeleted=0) THROW 51109,N'RESOURCE_INACTIVE|Actual production resources must remain active.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items i JOIN dbo.ProductionOrders o ON o.ItemId=i.Id AND o.UnitId=i.UnitId WHERE o.Id=@Id AND o.CompanyKey=@CompanyKey AND i.IsActive=1 AND i.IsDeleted=0 AND i.IsManufactured=1 AND i.TrackInventory=1) THROW 51109,N'OUTPUT_ITEM_CHANGED|Finished Item eligibility or its released unit changed.',1;
 IF EXISTS(SELECT 1 FROM dbo.ProductionCapacityReservations WHERE CompanyKey=@CompanyKey AND OrderId<>@Id AND IsActive=1 AND(MachineId=@Machine OR MouldId=@Mould) AND FromUtc<=@Occurred AND ToUtc>@Occurred) THROW 51109,N'ACTUAL_RESOURCE_CONFLICT|The actual timestamp conflicts with another explicitly reserved job.',1;
 IF EXISTS(SELECT 1 FROM @Materials x LEFT JOIN dbo.ProductionOrderMaterials m ON m.OrderId=@Id AND m.ItemId=x.ItemId WHERE m.Id IS NULL OR m.UnitId<>x.UnitId) OR EXISTS(SELECT 1 FROM dbo.ProductionOrderMaterials m WHERE m.OrderId=@Id AND NOT EXISTS(SELECT 1 FROM @Materials x WHERE x.ItemId=m.ItemId)) THROW 51100,N'COMPONENT_SNAPSHOT_MISMATCH|Actual component identities and base units must match the released snapshot.',1;
 /* Cumulative expected allocation gives the final partial the exact rounding residue. */
 UPDATE x SET ExpectedQuantity=m.BaselineExpectedQuantity+ROUND((m.RequiredQuantity-m.BaselineExpectedQuantity)*(@Done+@Good+@Reject-m.BaselineOutputQuantity)/NULLIF(@Released-m.BaselineOutputQuantity,0),6)-COALESCE(p.ExpectedQuantity,0)
 FROM @Materials x JOIN dbo.ProductionOrderMaterials m ON m.OrderId=@Id AND m.ItemId=x.ItemId
 OUTER APPLY(SELECT SUM(cm.ExpectedQuantity) ExpectedQuantity FROM dbo.ProductionCompletionMaterials cm JOIN dbo.ProductionCompletions c ON c.Id=cm.CompletionId WHERE c.OrderId=@Id AND c.CompanyKey=@CompanyKey AND c.ReversalOfId IS NULL AND c.ReversedById IS NULL AND cm.ItemId=x.ItemId) p;
 IF EXISTS(SELECT 1 FROM @Materials WHERE ConsumedQuantity+ScrapQuantity>ExpectedQuantity) AND NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL THROW 51109,N'VARIANCE_REASON_REQUIRED|Over-consumption needs a reason and the command requires Approve permission.',1;
 DECLARE @LockItem BIGINT;
 DECLARE complete_locks CURSOR LOCAL FAST_FORWARD FOR SELECT ItemId FROM(SELECT ItemId FROM @Materials UNION SELECT @Item) x ORDER BY ItemId;
 OPEN complete_locks; FETCH NEXT FROM complete_locks INTO @LockItem;
 WHILE @@FETCH_STATUS=0 BEGIN SELECT @LockItem=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LockItem; FETCH NEXT FROM complete_locks INTO @LockItem; END; CLOSE complete_locks; DEALLOCATE complete_locks;
 IF EXISTS(SELECT 1 FROM @Materials x JOIN dbo.Items i ON i.Id=x.ItemId WHERE i.IsDeleted=1 OR i.IsActive=0 OR i.TrackInventory=0 OR i.UnitId<>x.UnitId) THROW 51109,N'COMPONENT_CHANGED|Component or unit changed after release.',1;
 UPDATE x SET ReservationConsumed=CASE WHEN x.ConsumedQuantity+x.ScrapQuantity<r.ReservedQuantity-r.ConsumedQuantity-r.ReleasedQuantity THEN x.ConsumedQuantity+x.ScrapQuantity ELSE r.ReservedQuantity-r.ConsumedQuantity-r.ReleasedQuantity END
 FROM @Materials x JOIN dbo.ProductionReservations r ON r.OrderId=@Id AND r.CompanyKey=@CompanyKey AND r.ItemId=x.ItemId;
 UPDATE @Materials SET ReservationConsumed=CASE WHEN ReservationConsumed>ExpectedQuantity THEN ExpectedQuantity ELSE ReservationConsumed END;
 IF EXISTS(SELECT 1 FROM @Materials x JOIN dbo.Items i ON i.Id=x.ItemId WHERE x.ReservationConsumed IS NULL OR i.CurrentStock-i.ReservedStock+x.ReservationConsumed<x.ConsumedQuantity+x.ScrapQuantity) THROW 51109,N'INSUFFICIENT_OWN_ALLOCATION|Actual consumption exceeds free stock plus this partial allocation; other reservations remain protected.',1;
 INSERT dbo.ProductionCompletions(CompanyKey,OrderId,BusinessDate,OccurredAt,GoodOutput,RejectedOutput,MachineId,MouldId,ShiftId,SourceReference,VarianceReason,CreatedBy) VALUES(@CompanyKey,@Id,@Date,@Occurred,@Good,@Reject,@Machine,@Mould,@Shift,@Ref,@Reason,@UserId); SET @Completion=SCOPE_IDENTITY();
 INSERT dbo.ProductionCompletionMaterials(CompletionId,ItemId,UnitId,ExpectedQuantity,ConsumedQuantity,ScrapQuantity,ReturnedQuantity,ReservationConsumed) SELECT @Completion,ItemId,UnitId,ExpectedQuantity,ConsumedQuantity,ScrapQuantity,ReturnedQuantity,ReservationConsumed FROM @Materials;
 UPDATE i SET CurrentStock=i.CurrentStock-x.ConsumedQuantity-x.ScrapQuantity,ReservedStock=i.ReservedStock-x.ReservationConsumed,ModifiedBy=@UserId,ModifiedAt=SYSUTCDATETIME() FROM dbo.Items i JOIN @Materials x ON x.ItemId=i.Id;
 UPDATE r SET ConsumedQuantity=r.ConsumedQuantity+x.ReservationConsumed FROM dbo.ProductionReservations r JOIN @Materials x ON x.ItemId=r.ItemId WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey;
 INSERT dbo.ProductionReservationEvents(CompanyKey,ReservationId,BusinessDate,ReservedDelta,ConsumedDelta,ReleasedDelta,EventType,SourceId,CreatedBy) SELECT @CompanyKey,r.Id,@Date,0,x.ReservationConsumed,0,N'Completion',@Completion,@UserId FROM dbo.ProductionReservations r JOIN @Materials x ON x.ItemId=r.ItemId WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey;
 UPDATE m SET ConsumedQuantity=m.ConsumedQuantity+x.ConsumedQuantity+x.ScrapQuantity FROM dbo.ProductionOrderMaterials m JOIN @Materials x ON x.ItemId=m.ItemId WHERE m.OrderId=@Id;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,CreatedBy) SELECT ItemId,N'ProductionCompletion',@Completion,Id,@Physical,@CompanyKey,@Date,5,-ConsumedQuantity-ScrapQuantity,@UserId FROM dbo.ProductionCompletionMaterials WHERE CompletionId=@Completion AND ConsumedQuantity+ScrapQuantity>0;
 IF @Good>0
 BEGIN
  UPDATE dbo.Items SET CurrentStock=CurrentStock+@Good,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Item AND UnitId=(SELECT UnitId FROM dbo.ProductionOrders WHERE Id=@Id) AND TrackInventory=1;
  IF @@ROWCOUNT<>1 THROW 51109,N'OUTPUT_ITEM_CHANGED|Finished Item base unit or inventory tracking changed.',1;
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,CreatedBy) VALUES(@Item,N'ProductionCompletion',@Completion,0,@Physical,@CompanyKey,@Date,6,@Good,@UserId);
 END;
 IF @Done+@Good+@Reject=@Released
 BEGIN
  UPDATE dbo.ProductionCapacityReservations SET IsActive=0 WHERE CompanyKey=@CompanyKey AND OrderId=@Id AND IsActive=1;
  INSERT dbo.ProductionReservationEvents(CompanyKey,ReservationId,BusinessDate,ReservedDelta,ConsumedDelta,ReleasedDelta,EventType,SourceId,CreatedBy) SELECT @CompanyKey,Id,@Date,0,0,ReservedQuantity-ConsumedQuantity-ReleasedQuantity,N'CompletedRelease',@Completion,@UserId FROM dbo.ProductionReservations WHERE OrderId=@Id AND CompanyKey=@CompanyKey;
  UPDATE i SET ReservedStock=i.ReservedStock-(r.ReservedQuantity-r.ConsumedQuantity-r.ReleasedQuantity) FROM dbo.Items i JOIN dbo.ProductionReservations r ON r.ItemId=i.Id WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey;
  UPDATE dbo.ProductionReservations SET ReleasedQuantity=ReservedQuantity-ConsumedQuantity WHERE OrderId=@Id AND CompanyKey=@CompanyKey;
 END;
 UPDATE dbo.ProductionOrders SET CompletedQuantity=CompletedQuantity+@Good,RejectedQuantity=RejectedQuantity+@Reject,Status=CASE WHEN @Done+@Good+@Reject=@Released THEN 4 ELSE 3 END,ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,CASE Status WHEN 4 THEN N'Completed' ELSE N'InProgress' END Status,@Completion CompletionId FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'Complete',@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionOrder_Action @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @SourceId BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Id BIGINT,@Action NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.action'),
 @Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Reason NVARCHAR(1000)=JSON_VALUE(@RequestJson,'$.request.reason'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@State INT,@Item BIGINT,@BusinessDate DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate')),
 @Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048),@Reversal BIGINT,@Good DECIMAL(22,6),@Rejected DECIMAL(22,6),@Event UNIQUEIDENTIFIER=NEWID();
 IF NULLIF(@Key,N'') IS NULL OR NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL OR @Action NOT IN(N'close',N'cancel',N'reverse-completion') THROW 51100,N'INVALID_ACTION|A supported action, reason and key are required.',1;
 BEGIN TRY
 BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Prior; RETURN; END;
 SET @Id=CASE WHEN @Action=N'reverse-completion' THEN (SELECT OrderId FROM dbo.ProductionCompletions WHERE Id=@SourceId AND CompanyKey=@CompanyKey) ELSE @SourceId END;
 SELECT @Current=RowVersion,@State=Status,@Item=ItemId FROM dbo.ProductionOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Production order/completion was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the order before this action.'; THROW 51109,@Err,1; END;
 IF @Action=N'reverse-completion'
 BEGIN
  SELECT @Good=GoodOutput,@Rejected=RejectedOutput FROM dbo.ProductionCompletions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@SourceId AND CompanyKey=@CompanyKey AND ReversalOfId IS NULL AND ReversedById IS NULL;
  IF @Good IS NULL OR @State IN(5,6) THROW 51109,N'REVERSAL_UNAVAILABLE|Completion is already reversed or order is closed/cancelled. Cancel only the uncompleted remainder.',1;
  /* Conservative downstream protection: do not infer lot identity from an aggregate balance. */
  IF EXISTS(SELECT 1 FROM dbo.StockMovements sm WHERE sm.ItemId=@Item AND sm.Quantity<0 AND sm.CreatedAtUtc>=(SELECT CreatedAtUtc FROM dbo.ProductionCompletions WHERE Id=@SourceId) AND NOT(sm.SourceType=N'ProductionReversal' AND sm.SourceId=@SourceId)) THROW 51109,N'DOWNSTREAM_OUTPUT_MOVEMENT|Output has downstream stock-out evidence; reversal requires reconciliation. Close only the remainder.',1;
  DECLARE @LockItem BIGINT;
  DECLARE reverse_locks CURSOR LOCAL FAST_FORWARD FOR SELECT ItemId FROM(SELECT ItemId FROM dbo.ProductionCompletionMaterials WHERE CompletionId=@SourceId UNION SELECT @Item) x ORDER BY ItemId;
  OPEN reverse_locks; FETCH NEXT FROM reverse_locks INTO @LockItem;
  WHILE @@FETCH_STATUS=0 BEGIN SELECT @LockItem=Id FROM dbo.Items WITH(UPDLOCK,HOLDLOCK) WHERE Id=@LockItem; FETCH NEXT FROM reverse_locks INTO @LockItem; END; CLOSE reverse_locks; DEALLOCATE reverse_locks;
  IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Item AND CurrentStock-ReservedStock>=@Good) THROW 51109,N'OUTPUT_UNAVAILABLE|Accepted output is no longer available for reversal.',1;
  INSERT dbo.ProductionCompletions(CompanyKey,OrderId,BusinessDate,OccurredAt,GoodOutput,RejectedOutput,MachineId,MouldId,ShiftId,ReversalOfId,VarianceReason,CreatedBy)
  SELECT @CompanyKey,@Id,@BusinessDate,SYSDATETIMEOFFSET(),GoodOutput,RejectedOutput,MachineId,MouldId,ShiftId,Id,@Reason,@UserId FROM dbo.ProductionCompletions WHERE Id=@SourceId AND CompanyKey=@CompanyKey;
  SET @Reversal=SCOPE_IDENTITY();
  UPDATE dbo.Items SET CurrentStock=CurrentStock-@Good,ModifiedBy=@UserId,ModifiedAt=SYSUTCDATETIME() WHERE Id=@Item;
  UPDATE i SET CurrentStock=i.CurrentStock+m.ConsumedQuantity+m.ScrapQuantity,ModifiedBy=@UserId,ModifiedAt=SYSUTCDATETIME() FROM dbo.Items i JOIN dbo.ProductionCompletionMaterials m ON m.ItemId=i.Id WHERE m.CompletionId=@SourceId;
  INSERT dbo.StockMovements(ItemId,SourceType,SourceId,SourceLineId,PhysicalEventId,CompanyKey,BusinessDate,MovementType,Quantity,CreatedBy) SELECT ItemId,N'ProductionReversal',@Reversal,Id,@Event,@CompanyKey,@BusinessDate,7,-Quantity,@UserId FROM dbo.StockMovements WHERE CompanyKey=@CompanyKey AND SourceType=N'ProductionCompletion' AND SourceId=@SourceId;
  UPDATE m SET ConsumedQuantity=m.ConsumedQuantity-c.ConsumedQuantity-c.ScrapQuantity FROM dbo.ProductionOrderMaterials m JOIN dbo.ProductionCompletionMaterials c ON c.ItemId=m.ItemId WHERE m.OrderId=@Id AND c.CompletionId=@SourceId;
  /* Reversal never silently reopens a reservation. Close the remaining order and create a deliberate revalidated draft. */
  UPDATE dbo.ProductionCompletions SET ReversedById=@Reversal WHERE Id=@SourceId AND CompanyKey=@CompanyKey;
  UPDATE dbo.ProductionOrders SET CompletedQuantity=CompletedQuantity-@Good,RejectedQuantity=RejectedQuantity-@Rejected WHERE Id=@Id AND CompanyKey=@CompanyKey;
 END
 ELSE IF @State IN(5,6) THROW 51109,N'INVALID_STATE|The order is already closed or cancelled.',1;
 INSERT dbo.ProductionReservationEvents(CompanyKey,ReservationId,BusinessDate,ReservedDelta,ConsumedDelta,ReleasedDelta,EventType,SourceId,CreatedBy) SELECT @CompanyKey,Id,@BusinessDate,0,0,ReservedQuantity-ConsumedQuantity-ReleasedQuantity,N'RemainderRelease',@Id,@UserId FROM dbo.ProductionReservations WHERE OrderId=@Id AND CompanyKey=@CompanyKey;
 UPDATE i SET ReservedStock=i.ReservedStock-(r.ReservedQuantity-r.ConsumedQuantity-r.ReleasedQuantity) FROM dbo.Items i WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ProductionReservations r ON r.ItemId=i.Id WHERE r.OrderId=@Id AND r.CompanyKey=@CompanyKey;
 UPDATE dbo.ProductionReservations SET ReleasedQuantity=ReservedQuantity-ConsumedQuantity WHERE OrderId=@Id AND CompanyKey=@CompanyKey;
 UPDATE dbo.ProductionCapacityReservations SET IsActive=0 WHERE CompanyKey=@CompanyKey AND OrderId=@Id AND IsActive=1;
 UPDATE dbo.ProductionOrders SET Status=CASE WHEN @Action=N'cancel' AND CompletedQuantity+RejectedQuantity=0 THEN 6 ELSE 5 END,ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,CASE Status WHEN 6 THEN N'Cancelled' ELSE N'Closed' END Status,@Reversal CompletionId FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,@Action,@SourceId,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
