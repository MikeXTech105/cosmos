/*
  COSMOS Dispatch UI test data. RUN ONLY against a disposable LocalDB/test database.
  Required database name: CosmosDispatchIntegrationTests_*.
  Creates DSPTEST master data plus committed Dispatch input batches. It intentionally
  does NOT create a planning run or insert recommendations/allocation results.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF DB_NAME() NOT LIKE N'CosmosDispatchIntegrationTests[_]%'
    THROW 52000, N'Refusing to seed outside an explicitly named CosmosDispatchIntegrationTests_* database.', 1;

IF OBJECT_ID(N'dbo.usp_DispatchPlanning_Import_Validate', N'P') IS NULL
   OR OBJECT_ID(N'dbo.usp_DispatchPlanning_Import_Commit', N'P') IS NULL
    THROW 52001, N'Dispatch Planning schema/procedures are not installed in this test database.', 1;

DECLARE @CategoryId BIGINT, @UnitId BIGINT, @ChannelId BIGINT, @WarehouseAId BIGINT, @WarehouseBId BIGINT,
        @ShortItemId BIGINT, @SufficientItemId BIGINT, @ShortPackagingId BIGINT, @SufficientPackagingId BIGINT,
        @SalesBatchId BIGINT, @StockBatchId BIGINT, @InboundBatchId BIGINT, @SalesFileHash CHAR(64), @StockFileHash CHAR(64), @InboundFileHash CHAR(64),
        @SalesRows NVARCHAR(MAX), @StockRows NVARCHAR(MAX), @InboundRows NVARCHAR(MAX);

BEGIN TRY
    BEGIN TRANSACTION;
    SELECT @CategoryId=Id FROM dbo.Categories WHERE Name=N'DSPTEST Dispatch Category';
    IF @CategoryId IS NULL BEGIN INSERT dbo.Categories(Name,IsActive) VALUES(N'DSPTEST Dispatch Category',1); SET @CategoryId=SCOPE_IDENTITY(); END;
    SELECT @UnitId=Id FROM dbo.Units WHERE ShortName=N'DSPT';
    IF @UnitId IS NULL BEGIN INSERT dbo.Units(Name,ShortName,IsActive) VALUES(N'DSPTEST Unit',N'DSPT',1); SET @UnitId=SCOPE_IDENTITY(); END;

    SELECT @ChannelId=Id FROM dbo.SalesChannels WHERE Code=N'DSPTEST';
    IF @ChannelId IS NULL BEGIN INSERT dbo.SalesChannels(Code,Name,DisplayOrder,IsActive,IsDeleted) VALUES(N'DSPTEST',N'DSPTEST Dispatch UI Channel',999,1,0); SET @ChannelId=SCOPE_IDENTITY(); END;
    SELECT @WarehouseAId=Id FROM dbo.ChannelWarehouses WHERE ChannelId=@ChannelId AND WarehouseCode=N'DSPTEST-WH-A';
    IF @WarehouseAId IS NULL BEGIN INSERT dbo.ChannelWarehouses(ChannelId,WarehouseCode,WarehouseName,Priority,SortOrder,IsActive,IsDeleted) VALUES(@ChannelId,N'DSPTEST-WH-A',N'DSPTEST North Warehouse',0,0,1,0); SET @WarehouseAId=SCOPE_IDENTITY(); END;
    SELECT @WarehouseBId=Id FROM dbo.ChannelWarehouses WHERE ChannelId=@ChannelId AND WarehouseCode=N'DSPTEST-WH-B';
    IF @WarehouseBId IS NULL BEGIN INSERT dbo.ChannelWarehouses(ChannelId,WarehouseCode,WarehouseName,Priority,SortOrder,IsActive,IsDeleted) VALUES(@ChannelId,N'DSPTEST-WH-B',N'DSPTEST South Warehouse',1,1,1,0); SET @WarehouseBId=SCOPE_IDENTITY(); END;

    SELECT @ShortItemId=Id FROM dbo.Items WHERE ItemCode=N'DSPTEST-SHORT';
    IF @ShortItemId IS NULL BEGIN
        INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,PurchasePrice,SalesPrice,GSTRate,TrackInventory,OpeningStock,OpeningStockValue,CurrentStock,ReservedStock,MinimumStock,IsActive,IsDeleted)
        VALUES(N'DSPTEST Shortage / Allocation Item',N'DSPTEST-SHORT',@CategoryId,@UnitId,1,1,1,0,1,0,0,20,0,0,1,0); SET @ShortItemId=SCOPE_IDENTITY();
    END;
    SELECT @SufficientItemId=Id FROM dbo.Items WHERE ItemCode=N'DSPTEST-SUFFICIENT';
    IF @SufficientItemId IS NULL BEGIN
        INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,PurchasePrice,SalesPrice,GSTRate,TrackInventory,OpeningStock,OpeningStockValue,CurrentStock,ReservedStock,MinimumStock,IsActive,IsDeleted)
        VALUES(N'DSPTEST Sufficient Stock Item',N'DSPTEST-SUFFICIENT',@CategoryId,@UnitId,1,1,1,0,1,0,0,100,0,0,1,0); SET @SufficientItemId=SCOPE_IDENTITY();
    END;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

/* Mapping, packaging and configured-policy settings are inserted only when absent. */
IF NOT EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@ChannelId AND ChannelSku=N'DSPTEST-SHORT-SKU' AND IsDeleted=0)
    INSERT dbo.ChannelSkuMappings(SalesChannelId,ChannelSku,ChannelProductName,ItemId,IsActive,IsDeleted,IsPrimary) VALUES(@ChannelId,N'DSPTEST-SHORT-SKU',N'DSPTEST shortage SKU',@ShortItemId,1,0,1);
IF NOT EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@ChannelId AND ChannelSku=N'DSPTEST-SUFFICIENT-SKU' AND IsDeleted=0)
    INSERT dbo.ChannelSkuMappings(SalesChannelId,ChannelSku,ChannelProductName,ItemId,IsActive,IsDeleted,IsPrimary) VALUES(@ChannelId,N'DSPTEST-SUFFICIENT-SKU',N'DSPTEST sufficient SKU',@SufficientItemId,1,0,1);
SELECT @ShortPackagingId=Id FROM dbo.ItemPackagingProfiles WHERE ItemId=@ShortItemId AND ChannelId=@ChannelId AND PackagingCode=N'DSPTEST-BOX6' AND IsDeleted=0;
IF @ShortPackagingId IS NULL BEGIN INSERT dbo.ItemPackagingProfiles(ItemId,ChannelId,PackagingCode,PackagingName,UnitsPerBox,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,IsDefault,IsActive,IsDeleted) VALUES(@ShortItemId,@ChannelId,N'DSPTEST-BOX6',N'DSPTEST six-unit box',6,0,0,0,N'CM',0,0,N'KG',1,1,0); SET @ShortPackagingId=SCOPE_IDENTITY(); END;
SELECT @SufficientPackagingId=Id FROM dbo.ItemPackagingProfiles WHERE ItemId=@SufficientItemId AND ChannelId=@ChannelId AND PackagingCode=N'DSPTEST-BOX10' AND IsDeleted=0;
IF @SufficientPackagingId IS NULL BEGIN INSERT dbo.ItemPackagingProfiles(ItemId,ChannelId,PackagingCode,PackagingName,UnitsPerBox,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,IsDefault,IsActive,IsDeleted) VALUES(@SufficientItemId,@ChannelId,N'DSPTEST-BOX10',N'DSPTEST ten-unit box',10,0,0,0,N'CM',0,0,N'KG',1,1,0); SET @SufficientPackagingId=SCOPE_IDENTITY(); END;
IF NOT EXISTS(SELECT 1 FROM dbo.DispatchSkuSettings WHERE ItemId=@ShortItemId AND ChannelId=@ChannelId AND PackagingProfileId=@ShortPackagingId AND IsDeleted=0)
    INSERT dbo.DispatchSkuSettings(ItemId,ChannelId,PackagingProfileId,Tier,SafetyStockFactor,RecurringDemandFactor,MinimumDispatchQuantity,AllowLooseQuantity,RoundingMode,AllocationPriority,IsActive,IsDeleted) VALUES(@ShortItemId,@ChannelId,@ShortPackagingId,1,.1,1,0,0,3,0,1,0);
IF NOT EXISTS(SELECT 1 FROM dbo.DispatchSkuSettings WHERE ItemId=@SufficientItemId AND ChannelId=@ChannelId AND PackagingProfileId=@SufficientPackagingId AND IsDeleted=0)
    INSERT dbo.DispatchSkuSettings(ItemId,ChannelId,PackagingProfileId,Tier,SafetyStockFactor,RecurringDemandFactor,MinimumDispatchQuantity,AllowLooseQuantity,RoundingMode,AllocationPriority,IsActive,IsDeleted) VALUES(@SufficientItemId,@ChannelId,@SufficientPackagingId,1,.1,1,0,0,3,1,1,0);

SET @SalesRows=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseAId)+N',"channelSku":"DSPTEST-SHORT-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07","salesQuantity":10,"sourceReference":"DSPTEST sales A"},{"rowNumber":2,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseBId)+N',"channelSku":"DSPTEST-SHORT-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07","salesQuantity":20,"sourceReference":"DSPTEST sales B"},{"rowNumber":3,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseAId)+N',"channelSku":"DSPTEST-SUFFICIENT-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07","salesQuantity":8,"sourceReference":"DSPTEST sales sufficient"}]';
SET @StockRows=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseAId)+N',"channelSku":"DSPTEST-SHORT-SKU","snapshotDate":"2026-10-07","availableQuantity":2,"reservedQuantity":0,"damagedQuantity":0,"sourceReference":"DSPTEST stock A"},{"rowNumber":2,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseBId)+N',"channelSku":"DSPTEST-SHORT-SKU","snapshotDate":"2026-10-07","availableQuantity":1,"reservedQuantity":0,"damagedQuantity":0,"sourceReference":"DSPTEST stock B"},{"rowNumber":3,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseAId)+N',"channelSku":"DSPTEST-SUFFICIENT-SKU","snapshotDate":"2026-10-07","availableQuantity":100,"reservedQuantity":0,"damagedQuantity":0,"sourceReference":"DSPTEST stock sufficient"}]';
SET @InboundRows=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseAId)+N',"channelSku":"DSPTEST-SHORT-SKU","snapshotDate":"2026-10-07","inboundQuantity":3,"expectedArrivalDate":"2026-10-08","inboundStatus":2,"referenceNumber":"DSPTEST-IN-ELIGIBLE","sourceReference":"DSPTEST eligible inbound"},{"rowNumber":2,"warehouseId":'+CONVERT(NVARCHAR(20),@WarehouseBId)+N',"channelSku":"DSPTEST-SHORT-SKU","snapshotDate":"2026-10-07","inboundQuantity":9,"expectedArrivalDate":"2026-10-08","inboundStatus":1,"referenceNumber":"DSPTEST-IN-PLANNED","sourceReference":"DSPTEST ineligible planned inbound"}]';
SET @SalesFileHash=REPLICATE('1',64); SET @StockFileHash=REPLICATE('2',64); SET @InboundFileHash=REPLICATE('3',64);

/* Supported validation/commit path, idempotent by fixed file name. */
SELECT @SalesBatchId=Id FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName=N'DSPTEST-sales-20261007.json';
IF @SalesBatchId IS NULL BEGIN EXEC dbo.usp_DispatchPlanning_Import_Validate @OriginalFileName=N'DSPTEST-sales-20261007.json',@FileHash=@SalesFileHash,@ImportType=1,@ChannelId=@ChannelId,@RowsJson=@SalesRows,@CorrelationId=N'DSPTEST-sales',@UserId=NULL; SELECT @SalesBatchId=Id FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName=N'DSPTEST-sales-20261007.json'; EXEC dbo.usp_DispatchPlanning_Import_Commit @Id=@SalesBatchId,@AllowDuplicate=0,@CorrectionReason=NULL,@UserId=NULL; END;
SELECT @StockBatchId=Id FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName=N'DSPTEST-stock-20261007.json';
IF @StockBatchId IS NULL BEGIN EXEC dbo.usp_DispatchPlanning_Import_Validate @OriginalFileName=N'DSPTEST-stock-20261007.json',@FileHash=@StockFileHash,@ImportType=2,@ChannelId=@ChannelId,@RowsJson=@StockRows,@CorrelationId=N'DSPTEST-stock',@UserId=NULL; SELECT @StockBatchId=Id FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName=N'DSPTEST-stock-20261007.json'; EXEC dbo.usp_DispatchPlanning_Import_Commit @Id=@StockBatchId,@AllowDuplicate=0,@CorrectionReason=NULL,@UserId=NULL; END;
SELECT @InboundBatchId=Id FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName=N'DSPTEST-inbound-20261007.json';
IF @InboundBatchId IS NULL BEGIN EXEC dbo.usp_DispatchPlanning_Import_Validate @OriginalFileName=N'DSPTEST-inbound-20261007.json',@FileHash=@InboundFileHash,@ImportType=3,@ChannelId=@ChannelId,@RowsJson=@InboundRows,@CorrelationId=N'DSPTEST-inbound',@UserId=NULL; SELECT @InboundBatchId=Id FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName=N'DSPTEST-inbound-20261007.json'; EXEC dbo.usp_DispatchPlanning_Import_Commit @Id=@InboundBatchId,@AllowDuplicate=0,@CorrectionReason=NULL,@UserId=NULL; END;

IF EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id IN(@SalesBatchId,@StockBatchId,@InboundBatchId) AND Status<>5)
    THROW 52002,N'DSPTEST import batches exist but are not committed; inspect the batch before retrying.',1;
SELECT DB_NAME() DatabaseName,@ChannelId ChannelId,@SalesBatchId SalesImportBatchId,@StockBatchId StockImportBatchId,@InboundBatchId InboundImportBatchId,N'DSPTEST seed ready. Create/calculate a run through the UI/API.' Result;
