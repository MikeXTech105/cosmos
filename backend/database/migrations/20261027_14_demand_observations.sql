SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionDemand_Observe @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.itemId')),@Unit BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.unitId')),@Channel BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.channelId')),
 @From DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.observedFrom')),@To DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.observedTo')),@Refresh DATE=TRY_CONVERT(DATE,JSON_VALUE(@RequestJson,'$.refreshedOn')),
 @Qty DECIMAL(22,6)=TRY_CONVERT(DECIMAL(22,6),JSON_VALUE(@RequestJson,'$.sourceQuantity')),@Reference NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.sourceReference'),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.idempotencyKey'),
 @Prior NVARCHAR(MAX),@Data NVARCHAR(MAX),@Id BIGINT;
 IF @Qty IS NULL OR @Qty<0 OR @From IS NULL OR @To<@From OR @Refresh<@To OR NULLIF(@Reference,N'') IS NULL OR NULLIF(@Key,N'') IS NULL THROW 51100,N'INVALID_OBSERVATION|Declare a real observed period, refresh date, nonnegative aggregate and source identity.',1;
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Item AND UnitId=@Unit AND IsManufactured=1 AND IsActive=1 AND IsDeleted=0) THROW 51100,N'UNVERIFIED_SOURCE_UNIT|Demand observation requires this Item base unit. Preserve other source units in staging until their conversion is verified.',1;
 IF @Channel IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@Channel AND IsActive=1 AND IsDeleted=0) THROW 51100,N'INVALID_CHANNEL|Select an active existing sales channel.',1;
 IF EXISTS(SELECT 1 FROM dbo.ProductionDemandObservations WHERE CompanyKey=@CompanyKey AND ItemId=@Item AND IsSuperseded=0 AND ObservedFrom<=@To AND ObservedTo>=@From AND((ChannelId IS NULL AND @Channel IS NOT NULL) OR(ChannelId IS NOT NULL AND @Channel IS NULL) OR(COALESCE(ChannelId,0)=COALESCE(@Channel,0) AND(ObservedFrom<>@From OR ObservedTo<>@To)))) THROW 51109,N'OVERLAPPING_DEMAND_PERIOD|Resolve overlapping network/channel observations; demand must be counted once.',1;
 IF EXISTS(SELECT 1 FROM dbo.ProductionDemandObservations WHERE CompanyKey=@CompanyKey AND ItemId=@Item AND COALESCE(ChannelId,0)=COALESCE(@Channel,0) AND ObservedFrom=@From AND ObservedTo=@To AND IsSuperseded=0 AND RefreshedOn>@Refresh) THROW 51109,N'STALE_SOURCE_REFRESH|A newer verified observation already exists.',1;
 UPDATE dbo.ProductionDemandObservations SET IsSuperseded=1 WHERE CompanyKey=@CompanyKey AND ItemId=@Item AND COALESCE(ChannelId,0)=COALESCE(@Channel,0) AND ObservedFrom=@From AND ObservedTo=@To AND IsSuperseded=0;
 INSERT dbo.ProductionDemandObservations(CompanyKey,ItemId,UnitId,ChannelId,ObservedFrom,ObservedTo,RefreshedOn,SourceQuantity,BaseQuantity,ConversionFactor,SourceReference,CreatedBy) VALUES(@CompanyKey,@Item,@Unit,@Channel,@From,@To,@Refresh,@Qty,@Qty,1,@Reference,@UserId);SET @Id=SCOPE_IDENTITY();
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'Observed' Status FROM dbo.ProductionDemandObservations WHERE Id=@Id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'DemandObservation',@Id,HASHBYTES('SHA2_256',JSON_MODIFY(@RequestJson,'$.businessDate',NULL)),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionDemand_Read @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Item BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.itemId')),@Page INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageNumber')),1),@Size INT=COALESCE(TRY_CONVERT(INT,JSON_VALUE(@RequestJson,'$.pageSize')),50),@Data NVARCHAR(MAX);
 SET @Page=IIF(@Page<1,1,@Page);SET @Size=IIF(@Size<1,1,IIF(@Size>200,200,@Size));
 SET @Data=(SELECT JSON_QUERY((SELECT Id,ItemId,UnitId,ChannelId,ObservedFrom,ObservedTo,RefreshedOn,SourceQuantity,BaseQuantity,ConversionFactor,SourceReference,IsSuperseded,CONVERT(VARCHAR(18),RowVersion,1) Version FROM dbo.ProductionDemandObservations WHERE CompanyKey=@CompanyKey AND(@Item IS NULL OR ItemId=@Item) ORDER BY Id DESC OFFSET(@Page-1)*@Size ROWS FETCH NEXT @Size ROWS ONLY FOR JSON PATH,INCLUDE_NULL_VALUES)) Items,@Page PageNumber,@Size PageSize,(SELECT COUNT(*) FROM dbo.ProductionDemandObservations WHERE CompanyKey=@CompanyKey AND(@Item IS NULL OR ItemId=@Item)) TotalCount FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
