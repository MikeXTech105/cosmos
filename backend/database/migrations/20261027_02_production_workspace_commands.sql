/* All workspace writes use the authenticated catalog and actor, explicit JSON contracts,
   XACT_ABORT, transaction-owned application locks, and row locks in ascending ItemId order.
   Lock order: catalog stock command -> order -> Items ASC -> reservations -> movements/events.
   The application lock serializes workspace commands; Item locks also protect legacy writers. */
SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionCommand_Begin
 @CompanyKey NVARCHAR(64), @RequestJson NVARCHAR(MAX), @IdempotencyKey NVARCHAR(100), @PriorResult NVARCHAR(MAX) OUTPUT
AS
BEGIN
 SET NOCOUNT ON;
 IF NULLIF(@CompanyKey,N'') IS NULL OR NULLIF(@IdempotencyKey,N'') IS NULL THROW 51100,N'COMMAND_IDENTITY_REQUIRED|Trusted catalog scope and an idempotency key are required.',1;
 IF SESSION_CONTEXT(N'Cosmos.CompanyKey') IS NOT NULL AND CONVERT(NVARCHAR(64),SESSION_CONTEXT(N'Cosmos.CompanyKey'))<>@CompanyKey THROW 51103,N'COMPANY_SCOPE_MISMATCH|The command company does not match the trusted catalog.',1;
 DECLARE @BusinessDate DATE=COALESCE(TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.businessDate')),TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.businessDate')));
 IF @BusinessDate<=TRY_CONVERT(DATE,SESSION_CONTEXT(N'Cosmos.ClosedThroughDate')) THROW 51109,N'CLOSED_PERIOD|The command business date is in a closed period.',1;
 DECLARE @LockResult INT;
 EXEC @LockResult=sys.sp_getapplock @Resource=N'Cosmos.Production.Stock',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=15000;
 IF @LockResult<0 THROW 51109,N'CONCURRENT_COMMAND|Stock command lock could not be acquired.',1;
 DECLARE @Hash VARBINARY(32),@Existing VARBINARY(32);
 SET @Hash=HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL));
 SELECT @Existing=PayloadHash,@PriorResult=ResultJson FROM dbo.ProductionCommandEvents WITH(UPDLOCK,HOLDLOCK)
 WHERE CompanyKey=@CompanyKey AND IdempotencyKey=@IdempotencyKey;
 IF @Existing IS NOT NULL AND @Existing<>@Hash THROW 51109,N'IDEMPOTENCY_PAYLOAD_CONFLICT|The key was already used with a different command payload.',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionWorkspace_Result @DataJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 SELECT 200 StatusCode,N'OK' Message,CAST(NULL AS NVARCHAR(100)) Code,CAST(NULL AS NVARCHAR(18)) Version,@DataJson DataJson;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionMaster_List @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageNumber')),1),
 @Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.query.pageSize')),50),@Search NVARCHAR(200)=JSON_VALUE(@RequestJson,'$.query.search');
 SET @Page=IIF(@Page<1,1,@Page); SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
 DECLARE @Rows TABLE(Id BIGINT,Code NVARCHAR(50),Name NVARCHAR(200),IsActive BIT,Version NVARCHAR(18),DefaultShiftId BIGINT NULL,CapacityBasis NVARCHAR(20) NULL,RateBasis INT NULL,DefaultRate DECIMAL(22,6) NULL,Notes NVARCHAR(1000) NULL);
 IF @Kind=N'work-centres'
  INSERT @Rows SELECT Id,Code,Name,IsActive,CONVERT(VARCHAR(18),RowVersion,1),DefaultShiftId,CapacityBasis,NULL,NULL,Notes FROM dbo.ProductionWorkCentres WHERE CompanyKey=@CompanyKey AND (@Search IS NULL OR Code LIKE N'%'+@Search+N'%' OR Name LIKE N'%'+@Search+N'%');
 ELSE IF @Kind=N'operations'
  INSERT @Rows SELECT Id,Code,Name,IsActive,CONVERT(VARCHAR(18),RowVersion,1),NULL,NULL,RateBasis,DefaultRate,Notes FROM dbo.ProductionOperations WHERE CompanyKey=@CompanyKey AND (@Search IS NULL OR Code LIKE N'%'+@Search+N'%' OR Name LIKE N'%'+@Search+N'%');
 ELSE THROW 51100,N'INVALID_MASTER|Unknown production master.',1;
 DECLARE @Data NVARCHAR(MAX)=(SELECT JSON_QUERY((SELECT * FROM @Rows ORDER BY Code,Id OFFSET (@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM @Rows) TotalCount FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionMaster_Save @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),
 @Code NVARCHAR(50)=LTRIM(RTRIM(JSON_VALUE(@RequestJson,'$.request.code'))),@Name NVARCHAR(200)=LTRIM(RTRIM(JSON_VALUE(@RequestJson,'$.request.name'))),
 @Active BIT=CASE JSON_VALUE(@RequestJson,'$.request.isActive') WHEN N'true' THEN 1 ELSE 0 END,@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),
 @Current BINARY(8),@Notes NVARCHAR(1000)=JSON_VALUE(@RequestJson,'$.request.notes'),@Data NVARCHAR(MAX),@Err NVARCHAR(2048);
 IF NULLIF(@Code,N'') IS NULL OR NULLIF(@Name,N'') IS NULL THROW 51100,N'INVALID_MASTER|Code and name are required.',1;
 BEGIN TRY
 BEGIN TRAN;
 IF @Kind=N'work-centres'
 BEGIN
  DECLARE @ShiftId BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.defaultShiftId'));
  IF @ShiftId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@ShiftId AND IsActive=1 AND IsDeleted=0) THROW 51100,N'INVALID_SHIFT|Select an active HR shift.',1;
  IF JSON_VALUE(@RequestJson,'$.request.capacityBasis')<>N'Minutes' THROW 51100,N'INVALID_CAPACITY_BASIS|Minutes are required.',1;
  IF @Id IS NULL
  BEGIN
   INSERT dbo.ProductionWorkCentres(CompanyKey,Code,Name,IsActive,DefaultShiftId,CapacityBasis,Notes,CreatedBy) VALUES(@CompanyKey,@Code,@Name,@Active,@ShiftId,N'Minutes',@Notes,@UserId); SET @Id=SCOPE_IDENTITY();
  END
  ELSE
  BEGIN
   SELECT @Current=RowVersion FROM dbo.ProductionWorkCentres WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
   IF @Current IS NULL THROW 51104,N'NOT_FOUND|Work centre was not found.',1;
   IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the work centre.'; THROW 51109,@Err,1; END;
   UPDATE dbo.ProductionWorkCentres SET Code=@Code,Name=@Name,IsActive=@Active,DefaultShiftId=@ShiftId,Notes=@Notes,ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
  END;
  SET @Data=(SELECT Id,Code,Name,IsActive,DefaultShiftId,CapacityBasis,Notes,CONVERT(VARCHAR(18),RowVersion,1) Version FROM dbo.ProductionWorkCentres WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 END
 ELSE IF @Kind=N'operations'
 BEGIN
  DECLARE @RateBasis INT=TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.request.rateBasis')),@Rate DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.defaultRate'));
  IF @RateBasis NOT IN(1,2,3) OR @Rate<=0 THROW 51100,N'INVALID_RATE|Operation rate basis or default is invalid.',1;
  IF @Id IS NULL
  BEGIN
   INSERT dbo.ProductionOperations(CompanyKey,Code,Name,IsActive,RateBasis,DefaultRate,Notes,CreatedBy) VALUES(@CompanyKey,@Code,@Name,@Active,@RateBasis,@Rate,@Notes,@UserId); SET @Id=SCOPE_IDENTITY();
  END
  ELSE
  BEGIN
   SELECT @Current=RowVersion FROM dbo.ProductionOperations WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND CompanyKey=@CompanyKey;
   IF @Current IS NULL THROW 51104,N'NOT_FOUND|Operation was not found.',1;
   IF @Version IS NULL OR @Version<>@Current BEGIN SET @Err=N'STALE_VERSION|'+CONVERT(VARCHAR(18),@Current,1)+N'|Reload the operation.'; THROW 51109,@Err,1; END;
   UPDATE dbo.ProductionOperations SET Code=@Code,Name=@Name,IsActive=@Active,RateBasis=@RateBasis,DefaultRate=@Rate,Notes=@Notes,ModifiedBy=@UserId,ModifiedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND CompanyKey=@CompanyKey;
  END;
  SET @Data=(SELECT Id,Code,Name,IsActive,RateBasis,DefaultRate,Notes,CONVERT(VARCHAR(18),RowVersion,1) Version FROM dbo.ProductionOperations WHERE Id=@Id AND CompanyKey=@CompanyKey FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES);
 END ELSE THROW 51100,N'INVALID_MASTER|Unknown production master.',1;
 COMMIT;
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionConfiguration_Save @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Kind NVARCHAR(30)=JSON_VALUE(@RequestJson,'$.kind'),@ParentId BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.parentId')),
 @From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.effectiveFrom')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.request.effectiveTo')),
 @Id BIGINT,@Version NVARCHAR(18),@Data NVARCHAR(MAX),@Lock INT;
 IF @From IS NULL OR @To<@From THROW 51100,N'INVALID_EFFECTIVITY|Effective dates are invalid.',1;
 BEGIN TRY
 BEGIN TRAN;
 EXEC @Lock=sys.sp_getapplock @Resource=N'Cosmos.Production.Configuration',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=15000;
 IF @Lock<0 THROW 51109,N'CONCURRENT_COMMAND|Configuration is being changed.',1;
 IF @Kind IN(N'routing',N'eligibility') AND NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ParentId AND IsActive=1 AND IsDeleted=0 AND IsManufactured=1) THROW 51100,N'INVALID_ITEM|An active manufactured Item is required.',1;
 IF @Kind=N'routing'
 BEGIN
  DECLARE @Steps TABLE(Sequence INT,OperationId BIGINT,WorkCentreId BIGINT,RateBasis INT,Rate DECIMAL(22,6),SetupMinutes DECIMAL(22,6),QuantityBasis DECIMAL(22,6),MachineId BIGINT,MouldId BIGINT);
  INSERT @Steps SELECT * FROM OPENJSON(@RequestJson,'$.request.steps') WITH(Sequence INT '$.sequence',OperationId BIGINT '$.operationId',WorkCentreId BIGINT '$.workCentreId',RateBasis INT '$.rateBasis',Rate DECIMAL(22,6) '$.rate',SetupMinutes DECIMAL(22,6) '$.setupMinutes',QuantityBasis DECIMAL(22,6) '$.quantityBasis',MachineId BIGINT '$.machineId',MouldId BIGINT '$.mouldId');
  IF NOT EXISTS(SELECT 1 FROM @Steps) OR EXISTS(SELECT Sequence FROM @Steps GROUP BY Sequence HAVING COUNT(*)>1) THROW 51100,N'INVALID_ROUTE|Unique routing steps are required.',1;
  IF EXISTS(SELECT 1 FROM @Steps s LEFT JOIN dbo.ProductionOperations o ON o.Id=s.OperationId AND o.CompanyKey=@CompanyKey AND o.IsActive=1 LEFT JOIN dbo.ProductionWorkCentres w ON w.Id=s.WorkCentreId AND w.CompanyKey=@CompanyKey AND w.IsActive=1 WHERE o.Id IS NULL OR w.Id IS NULL OR o.RateBasis<>s.RateBasis OR s.Sequence<=0 OR s.Rate<=0 OR s.SetupMinutes<0 OR s.QuantityBasis<=0 OR s.RateBasis NOT IN(1,2,3)) THROW 51100,N'INVALID_ROUTE|Active company operations/work centres and valid rates are required.',1;
  IF EXISTS(SELECT 1 FROM @Steps s WHERE (s.MachineId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE Id=s.MachineId AND IsActive=1 AND IsDeleted=0)) OR (s.MouldId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE Id=s.MouldId AND IsActive=1 AND IsDeleted=0))) THROW 51100,N'INVALID_RESOURCE|Routing resource is inactive or missing.',1;
  IF EXISTS(SELECT 1 FROM dbo.ItemProductionRoutings WHERE CompanyKey=@CompanyKey AND ItemId=@ParentId AND IsActive=1 AND EffectiveFrom<=COALESCE(@To,'99991231') AND COALESCE(EffectiveTo,'99991231')>=@From) THROW 51109,N'OVERLAPPING_ROUTE|Close the existing revision effectivity before adding this route.',1;
  INSERT dbo.ItemProductionRoutings(CompanyKey,ItemId,Revision,EffectiveFrom,EffectiveTo,CreatedBy) VALUES(@CompanyKey,@ParentId,JSON_VALUE(@RequestJson,'$.request.revision'),@From,@To,@UserId); SET @Id=SCOPE_IDENTITY();
  INSERT dbo.ItemProductionRoutingSteps(RoutingId,Sequence,OperationId,WorkCentreId,RateBasis,Rate,SetupMinutes,QuantityBasis,MachineId,MouldId) SELECT @Id,Sequence,OperationId,WorkCentreId,RateBasis,Rate,SetupMinutes,QuantityBasis,MachineId,MouldId FROM @Steps;
  SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ItemProductionRoutings WHERE Id=@Id;
 END
 ELSE IF @Kind=N'eligibility'
 BEGIN
  DECLARE @Machine BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.machineId')),@Mould BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.mouldId')),
   @Output DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.request.skuOutputPerShot'));
  IF NOT EXISTS(SELECT 1 FROM dbo.OeeMachines WHERE Id=@Machine AND IsActive=1 AND IsDeleted=0) OR NOT EXISTS(SELECT 1 FROM dbo.OeeMoulds WHERE Id=@Mould AND IsActive=1 AND IsDeleted=0 AND Cavity>=@Output) OR @Output IS NULL OR @Output<=0 THROW 51100,N'INVALID_RESOURCE_MAPPING|Verify machine, mould and SKU-specific cavity/output allocation.',1;
  IF EXISTS(SELECT 1 FROM dbo.ItemProductionEligibility WHERE CompanyKey=@CompanyKey AND ItemId=@ParentId AND MachineId=@Machine AND MouldId=@Mould AND IsActive=1 AND EffectiveFrom<=COALESCE(@To,'99991231') AND COALESCE(EffectiveTo,'99991231')>=@From) THROW 51109,N'OVERLAPPING_ELIGIBILITY|An effective mapping already exists.',1;
  INSERT dbo.ItemProductionEligibility(CompanyKey,ItemId,MachineId,MouldId,SkuOutputPerShot,EffectiveFrom,EffectiveTo,IsActive,CreatedBy) VALUES(@CompanyKey,@ParentId,@Machine,@Mould,@Output,@From,@To,CASE JSON_VALUE(@RequestJson,'$.request.isActive') WHEN N'true' THEN 1 ELSE 0 END,@UserId); SET @Id=SCOPE_IDENTITY();
  SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ItemProductionEligibility WHERE Id=@Id;
 END
 ELSE IF @Kind=N'shift'
 BEGIN
  DECLARE @Shift BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.request.shiftId')),@Break INT=TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.request.breakMinutes')),
   @Factor DECIMAL(9,6)=TRY_CONVERT(DECIMAL(9,6),JSON_VALUE(@RequestJson,'$.request.capacityFactor'));
  IF NOT EXISTS(SELECT 1 FROM dbo.ProductionWorkCentres WHERE Id=@ParentId AND CompanyKey=@CompanyKey AND IsActive=1) OR NOT EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@Shift AND IsActive=1 AND IsDeleted=0) THROW 51100,N'INVALID_SHIFT|Active company work centre and HR shift are required.',1;
  IF @Break<0 OR @Factor<=0 OR @Factor>1 OR EXISTS(SELECT 1 FROM dbo.HR_Shifts WHERE Id=@Shift AND @Break>=((DATEDIFF(MINUTE,StartTime,EndTime)+1440)%1440)) THROW 51100,N'INVALID_CAPACITY|Break and capacity factor must leave usable shift time.',1;
  IF EXISTS(SELECT 1 FROM dbo.ProductionWorkCentreShifts WHERE CompanyKey=@CompanyKey AND WorkCentreId=@ParentId AND ShiftId=@Shift AND IsActive=1 AND EffectiveFrom<=COALESCE(@To,'99991231') AND COALESCE(EffectiveTo,'99991231')>=@From) THROW 51109,N'OVERLAPPING_SHIFT|Shift capacity dates overlap.',1;
  INSERT dbo.ProductionWorkCentreShifts(CompanyKey,WorkCentreId,ShiftId,EffectiveFrom,EffectiveTo,BreakMinutes,CapacityFactor,IsActive,CreatedBy) VALUES(@CompanyKey,@ParentId,@Shift,@From,@To,@Break,@Factor,CASE JSON_VALUE(@RequestJson,'$.request.isActive') WHEN N'true' THEN 1 ELSE 0 END,@UserId); SET @Id=SCOPE_IDENTITY();
  SELECT @Version=CONVERT(VARCHAR(18),RowVersion,1) FROM dbo.ProductionWorkCentreShifts WHERE Id=@Id;
 END ELSE THROW 51100,N'INVALID_CONFIGURATION|Unknown configuration family.',1;
 COMMIT;
 SET @Data=(SELECT @Id Id,@Version Version,N'Saved' Status FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
