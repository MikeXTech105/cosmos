SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ShipmentPhysical_VerifyPacking @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Id BIGINT=TRY_CONVERT(BIGINT,JSON_VALUE(@RequestJson,'$.id')),@Version BINARY(8)=TRY_CONVERT(BINARY(8),JSON_VALUE(@RequestJson,'$.request.version'),1),@Current BINARY(8),@Key NVARCHAR(100)=JSON_VALUE(@RequestJson,'$.request.idempotencyKey'),@Date DATE,@Channel BIGINT,@Prior NVARCHAR(MAX),@Data NVARCHAR(MAX);
 BEGIN TRY BEGIN TRAN;
 EXEC dbo.sp_ProductionCommand_Begin @CompanyKey,@RequestJson,@Key,@Prior OUTPUT;
 IF @Prior IS NOT NULL BEGIN COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Prior;RETURN;END;
 SELECT @Current=RowVersion,@Date=ShipmentDate,@Channel=ChannelId FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0 AND DispatchedAtUtc IS NULL AND Status NOT IN(15,16);
 IF @Current IS NULL THROW 51109,N'FROZEN_SHIPMENT|Only existing undispatched work can have its units and packaging verified.',1;
 IF @Version IS NULL OR @Version<>@Current THROW 51109,N'STALE_VERSION|Reload shipment before verifying packing.',1;
 DECLARE @Lines TABLE(Id BIGINT PRIMARY KEY,UnitId BIGINT,ProfileId BIGINT);
 INSERT @Lines SELECT * FROM OPENJSON(@RequestJson,'$.request.lines') WITH(Id BIGINT '$.shipmentItemId',UnitId BIGINT '$.unitId',ProfileId BIGINT '$.packagingProfileId');
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT 1 FROM @Lines x LEFT JOIN dbo.ShipmentItems si ON si.Id=x.Id AND si.ShipmentId=@Id LEFT JOIN dbo.Items i ON i.Id=si.ItemId LEFT JOIN dbo.ItemPackagingProfiles p ON p.Id=x.ProfileId WHERE si.Id IS NULL OR x.UnitId<>i.UnitId OR p.Id IS NULL OR p.ItemId<>i.Id OR p.UnitsPerBox<=0 OR p.IsActive=0 OR p.IsDeleted=1 OR(p.ChannelId IS NOT NULL AND p.ChannelId<>@Channel) OR(p.EffectiveFrom IS NOT NULL AND p.EffectiveFrom>@Date) OR(p.EffectiveTo IS NOT NULL AND p.EffectiveTo<@Date)) THROW 51100,N'INVALID_VERIFIED_PACK|Verify current Item base unit and effective Item/channel packaging.',1;
 IF EXISTS(SELECT 1 FROM @Lines x JOIN dbo.ShipmentPackageItems pi ON pi.ShipmentItemId=x.Id) THROW 51109,N'REPACK_REQUIRED|Remove draft package allocations through the normal packing flow before changing conversion.',1;
 UPDATE si SET BaseUnitIdSnapshot=x.UnitId,PackagingProfileId=x.ProfileId,UnitsPerBoxSnapshot=p.UnitsPerBox,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId FROM dbo.ShipmentItems si JOIN @Lines x ON x.Id=si.Id JOIN dbo.ItemPackagingProfiles p ON p.Id=x.ProfileId;
 UPDATE dbo.Shipments SET UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'PackingVerified' Status FROM dbo.Shipments WHERE Id=@Id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'PackingVerified',@Id,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO
