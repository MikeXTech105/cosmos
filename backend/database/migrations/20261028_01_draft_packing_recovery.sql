-- Additive draft packing recovery. Apply after all 20261027 physical-inventory migrations.
-- Existing package/item rows are retained; removal never changes physical inventory.
SET XACT_ABORT ON;
GO
IF COL_LENGTH(N'dbo.Shipments',N'RowVersion') IS NULL
 THROW 52081,N'Apply physical inventory shipment RowVersion migration before packing recovery.',1;
GO
IF OBJECT_ID(N'dbo.ShipmentPackageRemovalCommands',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.ShipmentPackageRemovalCommands(
  ShipmentId BIGINT NOT NULL,
  CommandKey UNIQUEIDENTIFIER NOT NULL,
  PackageId BIGINT NOT NULL,
  ExpectedVersion BINARY(8) NOT NULL,
  PayloadHash VARBINARY(32) NOT NULL,
  Reason NVARCHAR(700) NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ShipmentPackageRemovalCommands_Created DEFAULT SYSUTCDATETIME(),
  CreatedBy BIGINT NULL,
  CONSTRAINT PK_ShipmentPackageRemovalCommands PRIMARY KEY(ShipmentId,CommandKey),
  CONSTRAINT FK_ShipmentPackageRemovalCommands_Shipment FOREIGN KEY(ShipmentId) REFERENCES dbo.Shipments(Id),
  CONSTRAINT FK_ShipmentPackageRemovalCommands_Package FOREIGN KEY(PackageId) REFERENCES dbo.ShipmentPackages(Id)
 );
END;
GO
CREATE OR ALTER TRIGGER dbo.TR_ShipmentPackageRemovalCommands_AppendOnly ON dbo.ShipmentPackageRemovalCommands
AFTER UPDATE, DELETE AS
BEGIN
 SET NOCOUNT ON;
 THROW 52082,N'Packing removal command history is append-only.',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Package_Remove
 @ShipmentId BIGINT,@PackageId BIGINT,@Version VARCHAR(18),@CommandKey UNIQUEIDENTIFIER,@Reason NVARCHAR(700),@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Expected BINARY(8)=TRY_CONVERT(BINARY(8),@Version,1),@Current BINARY(8),@Status INT,@Dispatched DATETIME2(3),@PackageNumber NVARCHAR(100),@Prior VARBINARY(32),
 @Hash VARBINARY(32)=HASHBYTES('SHA2_256',CONCAT(@PackageId,N'|',@Version,N'|',@Reason));
 IF @Expected IS NULL OR @CommandKey IS NULL OR NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL
 BEGIN SELECT 400 StatusCode,N'Version, command key and removal reason are required.' Message;RETURN;END;
 BEGIN TRY
  BEGIN TRAN;
  SELECT @Current=RowVersion,@Status=Status,@Dispatched=DispatchedAtUtc FROM dbo.Shipments WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ShipmentId AND IsDeleted=0;
  IF @Current IS NULL BEGIN ROLLBACK;SELECT 404 StatusCode,N'Shipment was not found.' Message;RETURN;END;
  SELECT @Prior=PayloadHash FROM dbo.ShipmentPackageRemovalCommands WHERE ShipmentId=@ShipmentId AND CommandKey=@CommandKey;
  IF @Prior IS NOT NULL
  BEGIN
   IF @Prior<>@Hash BEGIN ROLLBACK;SELECT 409 StatusCode,N'This command key belongs to a different removal. Reload before another change.' Message;RETURN;END;
   COMMIT;SELECT 200 StatusCode,N'Package removal was already saved.' Message;RETURN;
  END;
  IF @Status NOT IN(1,2,3,4,5) OR @Dispatched IS NOT NULL OR EXISTS(SELECT 1 FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId AND DispatchedQuantity>0)
  BEGIN ROLLBACK;SELECT 409 StatusCode,N'Only undispatched packages in a packing state can be removed. Dispatched stock is protected.' Message;RETURN;END;
  IF EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE ShipmentId=@ShipmentId AND IsDeleted=0 AND Status IN(2,3,5,6))
  BEGIN ROLLBACK;SELECT 409 StatusCode,N'Submitted, approved or paid freight must be resolved by Accounts before changing package weights. No financial entry was changed.' Message;RETURN;END;
  IF @Expected<>@Current BEGIN ROLLBACK;SELECT 409 StatusCode,N'This shipment changed. Reload and review the package before removing it.' Message;RETURN;END;
  SELECT @PackageNumber=PackageNumber FROM dbo.ShipmentPackages WITH(UPDLOCK,HOLDLOCK) WHERE Id=@PackageId AND ShipmentId=@ShipmentId AND IsDeleted=0;
  IF @PackageNumber IS NULL BEGIN ROLLBACK;SELECT 409 StatusCode,N'The active package was not found in this shipment. Reload before continuing.' Message;RETURN;END;
  UPDATE dbo.ShipmentPackages SET IsDeleted=1,DeletedAtUtc=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@PackageId;
  UPDATE si SET PackedQuantity=COALESCE(x.Quantity,0),UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
  FROM dbo.ShipmentItems si OUTER APPLY(
   SELECT SUM(pi.Quantity) Quantity FROM dbo.ShipmentPackageItems pi JOIN dbo.ShipmentPackages p ON p.Id=pi.ShipmentPackageId AND p.IsDeleted=0 WHERE pi.ShipmentItemId=si.Id
  ) x WHERE si.ShipmentId=@ShipmentId;
  UPDATE dbo.Shipments SET Status=CASE WHEN Status IN(4,5) THEN 3 ELSE Status END,
   PackedAtUtc=CASE WHEN @Status IN(4,5) THEN NULL ELSE PackedAtUtc END,PackedBy=CASE WHEN @Status IN(4,5) THEN NULL ELSE PackedBy END,
   TotalPackedQuantity=(SELECT COALESCE(SUM(PackedQuantity),0) FROM dbo.ShipmentItems WHERE ShipmentId=@ShipmentId),
   TotalPackages=(SELECT COUNT(*) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
   TotalGrossWeight=(SELECT COALESCE(SUM(GrossWeight),0) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
   TotalVolumetricWeight=(SELECT COALESCE(SUM(VolumetricWeight),0) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
   TotalChargeableWeight=(SELECT COALESCE(SUM(ChargeableWeight),0) FROM dbo.ShipmentPackages WHERE ShipmentId=@ShipmentId AND IsDeleted=0),
   UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@ShipmentId;
  INSERT dbo.ShipmentPackageRemovalCommands(ShipmentId,CommandKey,PackageId,ExpectedVersion,PayloadHash,Reason,CreatedBy)
   VALUES(@ShipmentId,@CommandKey,@PackageId,@Expected,@Hash,@Reason,@UserId);
  INSERT dbo.ShipmentTrackingEvents(ShipmentId,EventType,EventStatus,EventDateTimeUtc,ReferenceNumber,Source,Remarks,CreatedBy)
   VALUES(@ShipmentId,17,N'Draft package removed',SYSUTCDATETIME(),CONVERT(NVARCHAR(100),@PackageId),N'Packing',CONCAT(N'Package ',@PackageNumber,N': ',@Reason),@UserId);
  COMMIT;SELECT 200 StatusCode,N'Package removed. Allocations reconciled; inventory unchanged.' Message;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_Shipment_Get @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id,s.ShipmentNumber,s.SourceType,s.ChannelId,c.Code ChannelCode,c.Name ChannelName,s.WarehouseId,s.WarehouseCodeSnapshot WarehouseCode,s.WarehouseNameSnapshot WarehouseName,
           s.DispatchPlanningRunId,s.ShipmentDate,s.ExpectedDeliveryDate,s.InvoiceId,s.InvoiceNumber,s.StoNumber,s.MarketplaceReference,s.ExternalShipmentReference,
           s.TransporterPartyId,tp.PartyName TransporterName,s.DispatchMode,s.Status,s.Priority,s.ManualReason,s.Notes,s.TotalPlannedQuantity,s.TotalPackedQuantity,
           s.TotalDispatchedQuantity,s.TotalReceivedQuantity,s.TotalReturnedQuantity,s.TotalPackages,s.TotalGrossWeight,s.TotalVolumetricWeight,s.TotalChargeableWeight,
           s.CreatedAtUtc,s.CreatedBy,s.UpdatedAtUtc,s.UpdatedBy,s.PackedAtUtc,s.PackedBy,s.DispatchedAtUtc,s.DispatchedBy,s.DeliveredAtUtc,s.DeliveredBy,
           s.ClosedAtUtc,s.ClosedBy,s.CancelledAtUtc,s.CancelledBy,s.CancellationReason,CONVERT(VARCHAR(18),s.RowVersion,1) Version
    FROM dbo.Shipments s JOIN dbo.SalesChannels c ON c.Id=s.ChannelId LEFT JOIN dbo.Parties tp ON tp.Id=s.TransporterPartyId WHERE s.Id=@Id AND s.IsDeleted=0;

    SELECT si.Id,si.ShipmentId,si.ItemId,si.ChannelItemMappingId,si.DispatchPlanningAllocationId,si.PlannedQuantity,si.PackedQuantity,si.DispatchedQuantity,
           si.ReceivedQuantity,si.RejectedQuantity,si.DamagedQuantity,si.ShortQuantity,si.ReturnedQuantity,si.RestockableReturnQuantity,si.NonRestockableReturnQuantity,
           si.UnitsPerBoxSnapshot,si.PackagingProfileId,si.ChannelSkuSnapshot,si.ItemCodeSnapshot,si.ItemNameSnapshot,si.Notes
    FROM dbo.ShipmentItems si WHERE si.ShipmentId=@Id ORDER BY si.Id;

    SELECT Id,ShipmentId,PackageNumber,PackageType,PackagingProfileId,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,VolumetricDivisor,
           VolumetricWeight,ChargeableWeight,TrackingLabel,Barcode,SealNumber,IsMixedPackage,Notes
    FROM dbo.ShipmentPackages WHERE ShipmentId=@Id AND IsDeleted=0 ORDER BY Id;

    SELECT pi.Id,pi.ShipmentPackageId,pi.ShipmentItemId,pi.Quantity,si.ItemCodeSnapshot ItemCode,si.ItemNameSnapshot ItemName
    FROM dbo.ShipmentPackageItems pi JOIN dbo.ShipmentPackages p ON p.Id=pi.ShipmentPackageId JOIN dbo.ShipmentItems si ON si.Id=pi.ShipmentItemId
    WHERE p.ShipmentId=@Id AND p.IsDeleted=0 ORDER BY pi.Id;

    SELECT d.Id,d.ShipmentId,d.TransporterPartyId,p.PartyName TransporterName,d.DocketNumber,d.DocketDate,d.DispatchMode,d.TrackingUrl,d.VehicleNumber,
           d.DriverName,d.DriverMobile,d.PickupReference,d.EstimatedDeliveryDate,d.ActualPickupDateUtc,d.Notes,d.CreatedAtUtc
    FROM dbo.ShipmentDockets d JOIN dbo.Parties p ON p.Id=d.TransporterPartyId WHERE d.ShipmentId=@Id AND d.IsDeleted=0 ORDER BY d.Id;

    SELECT Id,ShipmentId,AppointmentReference,AppointmentDate,TimeFrom,TimeTo,AppointmentStatus,AttemptNumber,RequestedAtUtc,RequestedBy,BookedAtUtc,BookedBy,
           CompletedAtUtc,CancelledAtUtc,CancellationReason,Remarks FROM dbo.ShipmentAppointments WHERE ShipmentId=@Id ORDER BY AttemptNumber;

    SELECT Id,ShipmentId,EventType,EventStatus,EventDateTimeUtc,Location,ReferenceNumber,Source,Remarks,CreatedAtUtc,CreatedBy
    FROM dbo.ShipmentTrackingEvents WHERE ShipmentId=@Id ORDER BY EventDateTimeUtc,Id;

    SELECT Id,ShipmentId,AttemptNumber,AttemptDateTimeUtc,Outcome,ReasonCode,Remarks,NextAttemptDate,CreatedAtUtc,CreatedBy
    FROM dbo.ShipmentDeliveryAttempts WHERE ShipmentId=@Id ORDER BY AttemptNumber;

    SELECT Id,ShipmentId,ReceiptNumber,ReceiptDate,MarketplaceReceiptReference,ReceivedByName,ProofAttachmentUrl,Notes FROM dbo.ShipmentReceipts WHERE ShipmentId=@Id ORDER BY Id;
    SELECT ri.Id,ri.ShipmentReceiptId,ri.ShipmentItemId,ri.ReceivedQuantity,ri.RejectedQuantity,ri.DamagedQuantity,ri.ShortQuantity,ri.ReasonCode,ri.Notes
    FROM dbo.ShipmentReceiptItems ri JOIN dbo.ShipmentReceipts r ON r.Id=ri.ShipmentReceiptId WHERE r.ShipmentId=@Id ORDER BY ri.Id;

    SELECT r.Id,r.ReturnNumber,r.ShipmentId,r.ReturnDate,r.ReturnReason,r.Status,r.TransporterPartyId,p.PartyName TransporterName,r.DocketNumber,r.ExpectedReturnDate,r.ReceivedBackDate,r.Notes
    FROM dbo.ShipmentReturns r LEFT JOIN dbo.Parties p ON p.Id=r.TransporterPartyId WHERE r.ShipmentId=@Id ORDER BY r.Id;
    SELECT ri.Id,ri.ShipmentReturnId,ri.ShipmentItemId,ri.ReturnQuantity,ri.ReceivedBackQuantity,ri.RestockableQuantity,ri.DamagedQuantity,ri.NonRestockableQuantity,ri.ReasonCode,ri.Notes
    FROM dbo.ShipmentReturnItems ri JOIN dbo.ShipmentReturns r ON r.Id=ri.ShipmentReturnId WHERE r.ShipmentId=@Id ORDER BY ri.Id;

    SELECT f.Id,f.ShipmentId,f.TransporterPartyId,p.PartyName TransporterName,f.ChargeType,f.CurrencyCode,f.BaseFreight,f.FuelSurcharge,f.HandlingCharge,f.LoadingCharge,
           f.UnloadingCharge,f.AppointmentCharge,f.ReturnFreight,f.OtherCharge,f.TaxAmount,f.DiscountAmount,f.TotalCharge,f.ActualWeight,f.VolumetricWeight,
           f.ChargeableWeight,f.RatePerWeightUnit,f.TransporterInvoiceNumber,f.TransporterInvoiceDate,f.Status,f.ApprovalNotes,f.ApprovedAtUtc,f.ApprovedBy,
           f.PaidAtUtc,f.PaidBy,f.RojmelTransactionId
    FROM dbo.ShipmentFreightCharges f LEFT JOIN dbo.Parties p ON p.Id=f.TransporterPartyId WHERE f.ShipmentId=@Id AND f.IsDeleted=0 ORDER BY f.Id;
END;
GO
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
 IF EXISTS(SELECT 1 FROM @Lines x JOIN dbo.ShipmentPackageItems pi ON pi.ShipmentItemId=x.Id JOIN dbo.ShipmentPackages p ON p.Id=pi.ShipmentPackageId AND p.IsDeleted=0) THROW 51109,N'REPACK_REQUIRED|Remove draft package allocations through the normal packing flow before changing conversion.',1;
 UPDATE si SET BaseUnitIdSnapshot=x.UnitId,PackagingProfileId=x.ProfileId,UnitsPerBoxSnapshot=p.UnitsPerBox,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId FROM dbo.ShipmentItems si JOIN @Lines x ON x.Id=si.Id JOIN dbo.ItemPackagingProfiles p ON p.Id=x.ProfileId;
 UPDATE dbo.Shipments SET UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 SET @Data=(SELECT Id,CONVERT(VARCHAR(18),RowVersion,1) Version,N'PackingVerified' Status FROM dbo.Shipments WHERE Id=@Id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.ProductionCommandEvents(CompanyKey,IdempotencyKey,Command,SourceId,PayloadHash,PayloadJson,ResultJson,CreatedBy) VALUES(@CompanyKey,@Key,N'PackingVerified',@Id,HASHBYTES('SHA2_256',@RequestJson),@RequestJson,@Data,@UserId);
 COMMIT;EXEC dbo.sp_ProductionWorkspace_Result @Data;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;THROW;END CATCH;
END;
GO


-- Actual allocation identity is not the recommendation identity. Cancellations
-- before dispatch release their conversion; dispatched/corrected history remains owned.
CREATE OR ALTER PROCEDURE dbo.usp_ShipmentOperations_DispatchAllocations @RunId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 SELECT a.Id,r.Id RecommendationId,r.ItemId,i.ItemCode,i.Name ItemName,m.ChannelSku,r.WarehouseId,w.WarehouseCode,w.WarehouseName,
  a.AllocatedQuantity,COALESCE(x.Quantity,0) ConvertedQuantity,a.AllocatedQuantity-COALESCE(x.Quantity,0) RemainingQuantity
 FROM dbo.DispatchAllocations a
 JOIN dbo.DispatchPlanningRuns p ON p.Id=a.PlanningRunId AND p.Status=4
 JOIN dbo.DispatchRecommendationResults r ON r.Id=a.RecommendationId
 JOIN dbo.Items i ON i.Id=r.ItemId
 JOIN dbo.ChannelSkuMappings m ON m.Id=r.ChannelItemMappingId
 JOIN dbo.ChannelWarehouses w ON w.Id=r.WarehouseId
 OUTER APPLY(SELECT SUM(si.PlannedQuantity) Quantity FROM dbo.ShipmentItems si
  JOIN dbo.Shipments s ON s.Id=si.ShipmentId AND s.IsDeleted=0 AND NOT(s.Status=15 AND s.DispatchedAtUtc IS NULL)
  WHERE si.DispatchPlanningAllocationId=a.Id) x
 WHERE a.PlanningRunId=@RunId
 ORDER BY w.WarehouseCode,i.ItemCode,a.Id;
END;
GO
