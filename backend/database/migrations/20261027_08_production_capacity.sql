SET XACT_ABORT ON;
GO
IF OBJECT_ID('dbo.ProductionCapacityCalendar','U') IS NULL
CREATE TABLE dbo.ProductionCapacityCalendar(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,
 ShiftConfigurationId BIGINT NOT NULL REFERENCES dbo.ProductionWorkCentreShifts(Id),BusinessDate DATE NOT NULL,
 BlockType NVARCHAR(20) NOT NULL CHECK(BlockType IN(N'Break',N'Downtime')),FromUtc DATETIMEOFFSET NOT NULL,
 ToUtc DATETIMEOFFSET NOT NULL,Reason NVARCHAR(500) NOT NULL,ApprovedBy BIGINT NOT NULL,
 ApprovedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CHECK(ToUtc>FromUtc));
IF OBJECT_ID('dbo.ProductionCapacityReservations','U') IS NULL
CREATE TABLE dbo.ProductionCapacityReservations(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,OrderId BIGINT NOT NULL REFERENCES dbo.ProductionOrders(Id),
 RoutingStepId BIGINT NOT NULL REFERENCES dbo.ItemProductionRoutingSteps(Id),WorkCentreId BIGINT NOT NULL REFERENCES dbo.ProductionWorkCentres(Id),
 MachineId BIGINT NOT NULL REFERENCES dbo.OeeMachines(Id),MouldId BIGINT NOT NULL REFERENCES dbo.OeeMoulds(Id),
 ShiftId BIGINT NOT NULL REFERENCES dbo.HR_Shifts(Id),BusinessDate DATE NOT NULL,FromUtc DATETIMEOFFSET NOT NULL,
 ToUtc DATETIMEOFFSET NOT NULL,RequiredMinutes DECIMAL(22,6) NOT NULL,IsActive BIT NOT NULL DEFAULT 1,
 CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),RowVersion ROWVERSION,
 CHECK(ToUtc>FromUtc));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionCapacityReservations') AND name='IX_PCR_ResourceWindow')
 CREATE INDEX IX_PCR_ResourceWindow ON dbo.ProductionCapacityReservations(CompanyKey,FromUtc,ToUtc) INCLUDE(OrderId,WorkCentreId,MachineId,MouldId,IsActive);
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionShiftWindow(@Date DATE,@Start TIME,@End TIME,@Zone SYSNAME)
RETURNS TABLE AS RETURN
 SELECT DATEADD(SECOND,DATEDIFF(SECOND,CONVERT(TIME,'00:00'),@Start),CONVERT(DATETIME2,@Date)) AT TIME ZONE @Zone WindowFrom,
 DATEADD(SECOND,DATEDIFF(SECOND,CONVERT(TIME,'00:00'),@End),CONVERT(DATETIME2,CASE WHEN @End<=@Start THEN DATEADD(DAY,1,@Date) ELSE @Date END)) AT TIME ZONE @Zone WindowTo;
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionCapacityInputs(@CompanyKey NVARCHAR(64),@OrderId BIGINT,@Date DATE,@Zone SYSNAME)
RETURNS TABLE AS RETURN
 WITH Orders AS(SELECT *,CASE WHEN Status=1 THEN PlannedQuantity ELSE ReleasedQuantity-CompletedQuantity-RejectedQuantity END Remaining FROM dbo.ProductionOrders WHERE Id=@OrderId AND CompanyKey=@CompanyKey),
 Steps AS(
 SELECT s.Id RoutingStepId,s.Sequence,s.WorkCentreId,s.RateBasis,s.Rate,s.SetupMinutes,s.QuantityBasis,e.SkuOutputPerShot
 FROM Orders o JOIN dbo.ItemProductionRoutingSteps s ON s.RoutingId=o.RoutingId
 OUTER APPLY(SELECT TOP(1) SkuOutputPerShot FROM dbo.ItemProductionEligibility WHERE CompanyKey=@CompanyKey AND ItemId=o.ItemId AND MachineId=o.MachineId AND MouldId=o.MouldId AND IsActive=1 AND EffectiveFrom<=@Date AND(EffectiveTo IS NULL OR EffectiveTo>=@Date) ORDER BY Id) e WHERE o.Status=1
 UNION ALL
 SELECT s.Id,s.Sequence,s.WorkCentreId,s.RateBasis,s.Rate,s.SetupMinutes,s.QuantityBasis,s.SkuOutputPerShot FROM Orders o CROSS APPLY OPENJSON(o.RouteSnapshotJson)
 WITH(Id BIGINT '$.Id',Sequence INT '$.Sequence',WorkCentreId BIGINT '$.WorkCentreId',RateBasis INT '$.RateBasis',Rate DECIMAL(22,6) '$.Rate',SetupMinutes DECIMAL(22,6) '$.SetupMinutes',QuantityBasis DECIMAL(22,6) '$.QuantityBasis',SkuOutputPerShot DECIMAL(22,6) '$.SkuOutputPerShot') s WHERE o.Status<>1
 )
 SELECT s.RoutingStepId,s.Sequence,s.WorkCentreId,o.ShiftId,w.WindowFrom,w.WindowTo,c.Id ShiftConfigurationId,c.CapacityFactor,
 CONVERT(DECIMAL(22,6),CASE WHEN s.Rate<=0 OR s.QuantityBasis<=0 THEN NULL WHEN o.Remaining=0 THEN 0
  WHEN s.RateBasis=1 THEN s.SetupMinutes+o.Remaining/s.QuantityBasis/s.Rate
  WHEN s.RateBasis=2 THEN s.SetupMinutes+o.Remaining/s.QuantityBasis*s.Rate/60.0
  WHEN s.RateBasis=3 AND s.SkuOutputPerShot>0 THEN s.SetupMinutes+o.Remaining/s.Rate/s.SkuOutputPerShot ELSE NULL END) RequiredMinutes,
 CONVERT(DECIMAL(22,6),CASE WHEN c.Id IS NULL OR c.BreakMinutes<>COALESCE(b.BreakMinutes,0) THEN NULL ELSE
  (DATEDIFF_BIG(SECOND,w.WindowFrom,w.WindowTo)/60.0-COALESCE(b.BlockMinutes,0)-COALESCE(r.ReservedMinutes,0))*c.CapacityFactor END) AvailableMinutes,
 CASE WHEN c.Id IS NULL THEN N'MISSING_SHIFT_CAPACITY' WHEN s.Rate<=0 OR s.QuantityBasis<=0 OR(s.RateBasis=3 AND COALESCE(s.SkuOutputPerShot,0)<=0) THEN N'UNKNOWN_VERIFIED_RATE'
  WHEN c.BreakMinutes<>COALESCE(b.BreakMinutes,0) THEN N'BREAK_WINDOWS_REQUIRED' ELSE NULL END ConflictCode,
 CONVERT(NVARCHAR(500),CASE WHEN c.BreakMinutes<>COALESCE(b.BreakMinutes,0) THEN N'Approve dated break windows before scheduling; an unspecified break is not treated as free capacity.' ELSE N'Usable shift time excludes explicit break/downtime and active shared work centre, machine or mould bookings once.' END) Explanation
 FROM Orders o CROSS JOIN Steps s
 LEFT JOIN dbo.ProductionWorkCentreShifts c ON c.CompanyKey=@CompanyKey AND c.WorkCentreId=s.WorkCentreId AND c.ShiftId=o.ShiftId AND c.IsActive=1 AND c.EffectiveFrom<=@Date AND(c.EffectiveTo IS NULL OR c.EffectiveTo>=@Date)
 LEFT JOIN dbo.HR_Shifts h ON h.Id=c.ShiftId AND h.IsActive=1 AND h.IsDeleted=0
 OUTER APPLY dbo.ufn_ProductionShiftWindow(@Date,h.StartTime,h.EndTime,@Zone) w
 OUTER APPLY(SELECT SUM(DATEDIFF_BIG(SECOND,FromUtc,ToUtc)/60.0) BlockMinutes,SUM(CASE WHEN BlockType=N'Break' THEN DATEDIFF_BIG(SECOND,FromUtc,ToUtc)/60.0 ELSE 0 END) BreakMinutes FROM dbo.ProductionCapacityCalendar WHERE ShiftConfigurationId=c.Id AND CompanyKey=@CompanyKey AND BusinessDate=@Date) b
 OUTER APPLY(SELECT SUM(DATEDIFF_BIG(SECOND,CASE WHEN FromUtc>w.WindowFrom THEN FromUtc ELSE w.WindowFrom END,CASE WHEN ToUtc<w.WindowTo THEN ToUtc ELSE w.WindowTo END)/60.0) ReservedMinutes FROM dbo.ProductionCapacityReservations WHERE CompanyKey=@CompanyKey AND IsActive=1 AND OrderId<>@OrderId AND FromUtc<w.WindowTo AND ToUtc>w.WindowFrom AND(WorkCentreId=s.WorkCentreId OR MachineId=o.MachineId OR MouldId=o.MouldId)) r;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionCapacity_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate')),@Zone SYSNAME=JSON_VALUE(@RequestJson,'$.timeZone'),@Data NVARCHAR(MAX);
 IF @Date IS NULL OR NOT EXISTS(SELECT 1 FROM sys.time_zone_info WHERE name=@Zone) THROW 51100,N'INVALID_BUSINESS_TIMEZONE|Configure a SQL Server supported business timezone and explicit date.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 SET @Data=(SELECT @Id OrderId,(SELECT CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey) Version,@Zone TimeZone,
  JSON_QUERY((SELECT RoutingStepId,Sequence,WorkCentreId,ShiftId,WindowFrom,WindowTo,RequiredMinutes,AvailableMinutes,
   CASE WHEN ConflictCode IS NOT NULL THEN ConflictCode WHEN RequiredMinutes>AvailableMinutes THEN N'OVERLOADED_SHIFT' ELSE NULL END ConflictCode,Explanation FROM dbo.ufn_ProductionCapacityInputs(@CompanyKey,@Id,@Date,@Zone) ORDER BY Sequence FOR JSON PATH,INCLUDE_NULL_VALUES)) Lines,
  CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.ufn_ProductionCapacityInputs(@CompanyKey,@Id,@Date,@Zone)) THEN N'MISSING_ROUTING' ELSE NULL END ConflictCode FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionCapacity_Calendar @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),@Zone SYSNAME=JSON_VALUE(@RequestJson,'$.timeZone'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@From DATETIMEOFFSET,@To DATETIMEOFFSET,@Break INT,@Data NVARCHAR(MAX),@Err NVARCHAR(2048),@Lock INT;
 DECLARE @Blocks TABLE(Id INT IDENTITY,BlockType NVARCHAR(20),[From] DATETIMEOFFSET,[To] DATETIMEOFFSET,Reason NVARCHAR(500));
 INSERT @Blocks SELECT N'Break',[From],[To],Reason FROM OPENJSON(@RequestJson,'$.request.breaks') WITH([From] DATETIMEOFFSET '$.from',[To] DATETIMEOFFSET '$.to',Reason NVARCHAR(500) '$.reason');
 INSERT @Blocks SELECT N'Downtime',[From],[To],Reason FROM OPENJSON(@RequestJson,'$.request.downtime') WITH([From] DATETIMEOFFSET '$.from',[To] DATETIMEOFFSET '$.to',Reason NVARCHAR(500) '$.reason');
 IF @Date IS NULL OR NOT EXISTS(SELECT 1 FROM sys.time_zone_info WHERE name=@Zone) THROW 51100,N'INVALID_CALENDAR|Business date and supported timezone are required.',1;
 BEGIN TRY BEGIN TRAN;
 EXEC @Lock=sys.sp_getapplock @Resource=N'Cosmos.Production.Stock',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=15000;
 IF @Lock<0 THROW 51109,N'CONCURRENT_COMMAND|Capacity calendar is busy.',1;
 SELECT @Current=c.RowVersion,@Break=c.BreakMinutes,@From=w.WindowFrom,@To=w.WindowTo FROM dbo.ProductionWorkCentreShifts c WITH(UPDLOCK,HOLDLOCK) JOIN dbo.HR_Shifts h ON h.Id=c.ShiftId CROSS APPLY dbo.ufn_ProductionShiftWindow(@Date,h.StartTime,h.EndTime,@Zone) w WHERE c.Id=@Id AND c.CompanyKey=@CompanyKey AND c.IsActive=1 AND c.EffectiveFrom<=@Date AND(c.EffectiveTo IS NULL OR c.EffectiveTo>=@Date);
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Effective company shift capacity was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload shift capacity.'; THROW 51109,@Err,1; END;
 IF EXISTS(SELECT 1 FROM @Blocks WHERE [From] IS NULL OR [To] IS NULL OR [From]<@From OR [To]>@To OR [To]<=[From] OR NULLIF(Reason,N'') IS NULL) OR EXISTS(SELECT 1 FROM @Blocks a JOIN @Blocks b ON a.Id<b.Id AND a.[From]<b.[To] AND a.[To]>b.[From]) THROW 51100,N'OVERLAPPING_CALENDAR|All non-overlapping blocks must be inside the actual overnight shift window.',1;
 IF COALESCE((SELECT SUM(DATEDIFF_BIG(SECOND,[From],[To])/60.0) FROM @Blocks WHERE BlockType=N'Break'),0)<>@Break THROW 51100,N'BREAK_DURATION_MISMATCH|Break windows must equal the configured break minutes exactly.',1;
 IF EXISTS(SELECT 1 FROM @Blocks b JOIN dbo.ProductionCapacityReservations r ON r.IsActive=1 AND r.CompanyKey=@CompanyKey AND r.FromUtc<b.[To] AND r.ToUtc>b.[From] JOIN dbo.ProductionWorkCentreShifts c ON c.Id=@Id AND c.WorkCentreId=r.WorkCentreId) THROW 51109,N'RESERVED_CAPACITY_CONFLICT|Amend the existing job booking before approving conflicting downtime or breaks.',1;
 DELETE dbo.ProductionCapacityCalendar WHERE CompanyKey=@CompanyKey AND ShiftConfigurationId=@Id AND BusinessDate=@Date;
 INSERT dbo.ProductionCapacityCalendar(CompanyKey,ShiftConfigurationId,BusinessDate,BlockType,FromUtc,ToUtc,Reason,ApprovedBy) SELECT @CompanyKey,@Id,@Date,BlockType,[From],[To],Reason,@UserId FROM @Blocks;
 UPDATE dbo.ProductionWorkCentreShifts SET CapacityFactor=CapacityFactor WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'CalendarApproved' Status FROM dbo.ProductionWorkCentreShifts WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionCapacity_Schedule @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Date DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),@Zone SYSNAME=JSON_VALUE(@RequestJson,'$.timeZone'),
 @Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@State INT,@Machine BIGINT,@Mould BIGINT,@Shift BIGINT,
 @Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Err NVARCHAR(2048);
 IF @Date IS NULL OR NULLIF(@Key,N'') IS NULL OR NOT EXISTS(SELECT 1 FROM sys.time_zone_info WHERE name=@Zone) THROW 51100,N'INVALID_SCHEDULE|Business date, timezone and idempotency key are required.',1;
 DECLARE @Bookings TABLE(RoutingStepId BIGINT PRIMARY KEY,[From] DATETIMEOFFSET,[To] DATETIMEOFFSET);
 INSERT @Bookings SELECT * FROM OPENJSON(@RequestJson,'$.request.bookings') WITH(RoutingStepId BIGINT '$.routingStepId',[From] DATETIMEOFFSET '$.from',[To] DATETIMEOFFSET '$.to');
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Prior; RETURN; END;
 SELECT @Current=RowVersion,@State=Status,@Machine=MachineId,@Mould=MouldId,@Shift=ShiftId FROM dbo.ProductionOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
 IF @Current IS NULL THROW 51104,N'NOT_FOUND|Production order was not found.',1;
 IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload before reserving capacity.'; THROW 51109,@Err,1; END;
 IF @State NOT IN(2,3) THROW 51109,N'INVALID_STATE|Only released/in-progress work may reserve capacity.',1;
 SELECT * INTO #Capacity FROM dbo.ufn_ProductionCapacityInputs(@CompanyKey,@Id,@Date,@Zone);
 IF NOT EXISTS(SELECT 1 FROM #Capacity) OR (SELECT COUNT(*) FROM #Capacity)<>(SELECT COUNT(*) FROM @Bookings) OR EXISTS(SELECT 1 FROM @Bookings b LEFT JOIN #Capacity c ON c.RoutingStepId=b.RoutingStepId WHERE c.RoutingStepId IS NULL OR c.ConflictCode IS NOT NULL OR c.RequiredMinutes IS NULL OR c.AvailableMinutes IS NULL OR b.[From]<c.WindowFrom OR b.[To]>c.WindowTo OR b.[To]<=b.[From] OR DATEDIFF_BIG(SECOND,b.[From],b.[To])/60.0*c.CapacityFactor<c.RequiredMinutes) THROW 51109,N'CAPACITY_UNAVAILABLE|Book every operation within verified usable shift capacity and rate duration.',1;
 IF EXISTS(SELECT 1 FROM @Bookings a JOIN #Capacity ca ON ca.RoutingStepId=a.RoutingStepId JOIN @Bookings b ON b.RoutingStepId<>a.RoutingStepId JOIN #Capacity cb ON cb.RoutingStepId=b.RoutingStepId WHERE ca.Sequence<cb.Sequence AND a.[To]>b.[From]) THROW 51109,N'OPERATION_SEQUENCE_CONFLICT|Operations must follow route sequence without overlap.',1;
 IF EXISTS(SELECT 1 FROM @Bookings b JOIN #Capacity c ON c.RoutingStepId=b.RoutingStepId JOIN dbo.ProductionCapacityCalendar x ON x.ShiftConfigurationId=c.ShiftConfigurationId AND x.CompanyKey=@CompanyKey AND x.BusinessDate=@Date AND x.FromUtc<b.[To] AND x.ToUtc>b.[From]) THROW 51109,N'CALENDAR_CONFLICT|Booking overlaps approved break or downtime.',1;
 IF EXISTS(SELECT 1 FROM @Bookings b JOIN #Capacity c ON c.RoutingStepId=b.RoutingStepId JOIN dbo.ProductionCapacityReservations r WITH(UPDLOCK,HOLDLOCK) ON r.CompanyKey=@CompanyKey AND r.IsActive=1 AND r.OrderId<>@Id AND(r.WorkCentreId=c.WorkCentreId OR r.MachineId=@Machine OR r.MouldId=@Mould) AND r.FromUtc<b.[To] AND r.ToUtc>b.[From]) THROW 51109,N'SHARED_RESOURCE_CONFLICT|Work centre, machine or mould was reserved by another job. Refresh capacity.',1;
 UPDATE dbo.ProductionCapacityReservations SET IsActive=0 WHERE OrderId=@Id AND CompanyKey=@CompanyKey AND IsActive=1;
 INSERT dbo.ProductionCapacityReservations(CompanyKey,OrderId,RoutingStepId,WorkCentreId,MachineId,MouldId,ShiftId,BusinessDate,FromUtc,ToUtc,RequiredMinutes,CreatedBy)
 SELECT @CompanyKey,@Id,b.RoutingStepId,c.WorkCentreId,@Machine,@Mould,@Shift,@Date,b.[From],b.[To],c.RequiredMinutes,@UserId FROM @Bookings b JOIN #Capacity c ON c.RoutingStepId=b.RoutingStepId;
 UPDATE dbo.ProductionOrders SET ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'Scheduled' Status FROM dbo.ProductionOrders WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'Schedule',@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT; EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
