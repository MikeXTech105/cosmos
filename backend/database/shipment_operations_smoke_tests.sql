/*
  Disposable-database smoke test. It inserts isolated test data, validates the core
  shipment workflow, then rolls back every data change. Run only after the module migration.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

BEGIN TRY
    BEGIN TRAN;
    DECLARE @Suffix NVARCHAR(20)=CONVERT(NVARCHAR(20),ABS(CHECKSUM(NEWID()))),@ChannelId BIGINT=(SELECT TOP(1) Id FROM dbo.SalesChannels WHERE IsActive=1 AND IsDeleted=0 ORDER BY Id),@ChannelCode NVARCHAR(50);
    IF @ChannelId IS NULL THROW 52200,N'An active Channel prerequisite is missing.',1;
    SELECT @ChannelCode=Code FROM dbo.SalesChannels WHERE Id=@ChannelId;

    INSERT dbo.Categories(Name,Description,IsActive) VALUES(N'Shipment Smoke '+@Suffix,N'Disposable smoke-test category.',1);
    DECLARE @CategoryId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.Units(Name,ShortName,Description,IsActive) VALUES(N'Shipment Unit '+@Suffix,N'SU',N'Disposable smoke-test unit.',1);
    DECLARE @UnitId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,PurchasePrice,SalesPrice,HSNCode,GSTRate,TrackInventory,OpeningStock,OpeningStockValue,CurrentStock,ReservedStock,MinimumStock,IsActive)
    VALUES(N'Shipment Item '+@Suffix,N'SHP-ITEM-'+@Suffix,@CategoryId,@UnitId,1,10,12,NULL,0,1,100,1000,100,0,0,1);
    DECLARE @ItemId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.ChannelWarehouses(ChannelId,WarehouseCode,WarehouseName,Priority,SortOrder,IsActive) VALUES(@ChannelId,N'SHP-WH-'+@Suffix,N'Shipment Smoke Warehouse',1,1,1);
    DECLARE @WarehouseId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.ChannelSkuMappings(SalesChannelId,ChannelSku,ChannelProductName,ItemId,IsActive,IsPrimary) VALUES(@ChannelId,N'SHP-SKU-'+@Suffix,N'Shipment Smoke SKU',@ItemId,1,1);
    DECLARE @MappingId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.ItemPackagingProfiles(ItemId,ChannelId,PackagingCode,PackagingName,UnitsPerBox,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,VolumetricDivisor,IsDefault,IsActive)
    VALUES(@ItemId,@ChannelId,N'SHP-BOX-'+@Suffix,N'Shipment Smoke Box',12,30,20,10,N'CM',4,3,N'KG',5000,1,1);
    DECLARE @ProfileId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.Parties(PartyCode,PartyName,GSTTreatment,OpeningBalanceType,IsActive) VALUES(N'SHP-CARRIER-'+@Suffix,N'Shipment Smoke Carrier',1,1,1);
    DECLARE @PartyId UNIQUEIDENTIFIER=(SELECT Id FROM dbo.Parties WHERE PartyCode=N'SHP-CARRIER-'+@Suffix);
    INSERT dbo.PartyRoles(PartyId,RoleCode) VALUES(@PartyId,N'Transporter');

    DECLARE @ManualItems NVARCHAR(MAX)=(SELECT @ItemId [itemId],CONVERT(DECIMAL(19,6),12) [plannedQuantity],@MappingId [channelItemMappingId],@ProfileId [packagingProfileId] FOR JSON PATH);
    EXEC dbo.usp_ShipmentOperations_Shipment_CreateManual @ChannelId=@ChannelId,@WarehouseId=@WarehouseId,@ShipmentDate='2026-07-29',@TransporterPartyId=@PartyId,@ManualReason=N'Smoke test',@ItemsJson=@ManualItems;
    DECLARE @ShipmentId BIGINT=(SELECT MAX(Id) FROM dbo.Shipments WHERE SourceType=1);
    IF @ShipmentId IS NULL THROW 52201,N'Manual shipment was not created.',1;

    DECLARE @PackageItems NVARCHAR(MAX)=(SELECT si.Id [shipmentItemId],CONVERT(DECIMAL(19,6),12) [quantity] FROM dbo.ShipmentItems si WHERE si.ShipmentId=@ShipmentId FOR JSON PATH);
    DECLARE @PackageNumber NVARCHAR(100)=N'SHP-PKG-'+@Suffix,@DocketNumber NVARCHAR(100)=N'SHP-DOCKET-'+@Suffix,@ImportHash CHAR(64)=REPLICATE('A',64);
    EXEC dbo.usp_ShipmentOperations_Package_Save @ShipmentId=@ShipmentId,@PackageNumber=@PackageNumber,@PackageType=N'Carton',@PackagingProfileId=@ProfileId,@Length=30,@Width=20,@Height=10,@GrossWeight=4,@NetWeight=3,@VolumetricDivisor=5000,@ItemsJson=@PackageItems;
    EXEC dbo.usp_ShipmentOperations_Shipment_Transition @Id=@ShipmentId,@SourceStatus=3,@TargetStatus=4;
    EXEC dbo.usp_ShipmentOperations_Shipment_Transition @Id=@ShipmentId,@SourceStatus=4,@TargetStatus=5;
    EXEC dbo.usp_ShipmentOperations_Docket_Save @ShipmentId=@ShipmentId,@TransporterPartyId=@PartyId,@DocketNumber=@DocketNumber,@DocketDate='2026-07-29',@DispatchMode=4;
    EXEC dbo.usp_ShipmentOperations_Shipment_Transition @Id=@ShipmentId,@SourceStatus=5,@TargetStatus=6;
    IF (SELECT CurrentStock FROM dbo.Items WHERE Id=@ItemId)<>88 THROW 52202,N'Dispatch did not update global current stock exactly once.',1;
    IF (SELECT COUNT(*) FROM dbo.StockMovements WHERE SourceType=N'ShipmentDispatch' AND SourceId=@ShipmentId AND ItemId=@ItemId)<>1 THROW 52203,N'Dispatch StockMovement is not idempotent.',1;

    DECLARE @ReceiptItems NVARCHAR(MAX)=(SELECT si.Id [shipmentItemId],CONVERT(DECIMAL(19,6),10) [receivedQuantity],CONVERT(DECIMAL(19,6),0) [rejectedQuantity],CONVERT(DECIMAL(19,6),0) [damagedQuantity],CONVERT(DECIMAL(19,6),0) [shortQuantity] FROM dbo.ShipmentItems si WHERE si.ShipmentId=@ShipmentId FOR JSON PATH);
    EXEC dbo.usp_ShipmentOperations_Receipt_Create @ShipmentId=@ShipmentId,@ReceiptDate='2026-07-30',@ItemsJson=@ReceiptItems;
    IF (SELECT Status FROM dbo.Shipments WHERE Id=@ShipmentId)<>11 THROW 52204,N'Partial receipt did not set PartiallyDelivered status.',1;

    DECLARE @ReturnItems NVARCHAR(MAX)=(SELECT si.Id [shipmentItemId],CONVERT(DECIMAL(19,6),2) [returnQuantity] FROM dbo.ShipmentItems si WHERE si.ShipmentId=@ShipmentId FOR JSON PATH);
    EXEC dbo.usp_ShipmentOperations_Return_Create @ShipmentId=@ShipmentId,@ReturnDate='2026-07-31',@ReturnReason=N'Smoke return',@ItemsJson=@ReturnItems;
    DECLARE @ReturnId BIGINT=(SELECT MAX(Id) FROM dbo.ShipmentReturns WHERE ShipmentId=@ShipmentId);
    DECLARE @ReturnReceiveItems NVARCHAR(MAX)=(SELECT ri.Id [shipmentReturnItemId],CONVERT(DECIMAL(19,6),2) [receivedBackQuantity],CONVERT(DECIMAL(19,6),2) [restockableQuantity],CONVERT(DECIMAL(19,6),0) [damagedQuantity],CONVERT(DECIMAL(19,6),0) [nonRestockableQuantity] FROM dbo.ShipmentReturnItems ri WHERE ri.ShipmentReturnId=@ReturnId FOR JSON PATH);
    EXEC dbo.usp_ShipmentOperations_Return_Receive @Id=@ReturnId,@ReceivedBackDate='2026-08-01',@ItemsJson=@ReturnReceiveItems;
    IF (SELECT CurrentStock FROM dbo.Items WHERE Id=@ItemId)<>90 THROW 52205,N'Restockable return did not restore stock.',1;
    IF (SELECT COUNT(*) FROM dbo.StockMovements WHERE SourceType=N'ShipmentReturn' AND ItemId=@ItemId)<>1 THROW 52206,N'Return StockMovement was not recorded exactly once.',1;

    EXEC dbo.usp_ShipmentOperations_Freight_Create @ShipmentId=@ShipmentId,@TransporterPartyId=@PartyId,@ChargeType=1,@CurrencyCode='INR',@BaseFreight=100;
    DECLARE @FreightId BIGINT=(SELECT MAX(Id) FROM dbo.ShipmentFreightCharges WHERE ShipmentId=@ShipmentId);
    EXEC dbo.usp_ShipmentOperations_Freight_Submit @Id=@FreightId;
    EXEC dbo.usp_ShipmentOperations_Freight_Approve @Id=@FreightId,@ApprovalNotes=N'Smoke approval';
    IF EXISTS(SELECT 1 FROM dbo.ShipmentFreightCharges WHERE Id=@FreightId AND RojmelTransactionId IS NOT NULL) THROW 52207,N'Freight approval created an unexpected Rojmel entry.',1;

    DECLARE @HistoricalRows NVARCHAR(MAX)=(SELECT 1 [rowNumber],N'HIST-'+@Suffix [sourceShipmentReference],@ChannelCode [channelCode],N'SHP-WH-'+@Suffix [warehouseCode],N'SHP-SKU-'+@Suffix [channelSku],CONVERT(DECIMAL(19,6),1) [quantity],CONVERT(DATE,'2026-07-01') [shipmentDate],12 [status] FOR JSON PATH);
    EXEC dbo.usp_ShipmentOperations_Import_Validate @OriginalFileName=N'work-list-smoke.xlsx',@FileHash=@ImportHash,@RowsJson=@HistoricalRows;
    DECLARE @ImportBatchId BIGINT=(SELECT MAX(Id) FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'ShipmentOperations' AND ImportType=N'WorkListHistorical');
    EXEC dbo.usp_ShipmentOperations_Import_Commit @Id=@ImportBatchId;
    IF (SELECT CurrentStock FROM dbo.Items WHERE Id=@ItemId)<>90 THROW 52208,N'Historical import must not affect current stock.',1;

    ROLLBACK;
    SELECT N'PASS' Result,N'Manual creation, packing, dispatch stock movement, partial receipt, restockable return, freight approval boundary, and no-stock historical import passed.' Detail;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
END CATCH;
