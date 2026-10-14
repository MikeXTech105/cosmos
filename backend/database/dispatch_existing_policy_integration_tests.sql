/*
  Configured-policy Dispatch integration smoke test.
  Run only against a disposable database named CosmosDispatchIntegrationTests_*
  on SQL Server/LocalDB. It creates labelled synthetic fixtures. Drop the
  disposable database after execution. It does not register or invoke parity.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF DB_NAME() NOT LIKE N'CosmosDispatchIntegrationTests[_]%'
    THROW 51000, N'Refusing to run outside an explicitly named Dispatch integration-test database.', 1;

BEGIN TRY
    DECLARE @CategoryId BIGINT, @UnitId BIGINT, @ItemId BIGINT, @ChannelId BIGINT,
            @Warehouse1Id BIGINT, @Warehouse2Id BIGINT, @MappingId BIGINT,
            @PackagingId BIGINT, @SettingId BIGINT, @InvalidBatchId BIGINT,
            @SalesBatchId BIGINT, @StockBatchId BIGINT, @InboundBatchId BIGINT,
            @RunId BIGINT, @FailureRunId BIGINT, @ConcurrencyRunId BIGINT, @Recommendation1Id BIGINT,
            @Recommendation2Id BIGINT, @CompanyStockSnapshotId BIGINT,
            @LinesJson NVARCHAR(MAX), @BadLinesJson NVARCHAR(MAX),
            @InvalidRowsJson NVARCHAR(MAX), @SalesRowsJson NVARCHAR(MAX),
            @StockRowsJson NVARCHAR(MAX), @InboundRowsJson NVARCHAR(MAX), @AllocationJson NVARCHAR(MAX),
            @InvalidFileHash CHAR(64), @SalesFileHash CHAR(64), @StockFileHash CHAR(64), @InboundFileHash CHAR(64);

    INSERT dbo.Categories(Name, IsActive) VALUES (N'IT-Dispatch-Category', 1);
    SET @CategoryId = SCOPE_IDENTITY();
    INSERT dbo.Units(Name, ShortName, IsActive) VALUES (N'IT-Dispatch-Unit', N'ITDU', 1);
    SET @UnitId = SCOPE_IDENTITY();
    INSERT dbo.Items(Name, ItemCode, CategoryId, UnitId, ItemType, PurchasePrice, SalesPrice, GSTRate,
                     TrackInventory, OpeningStock, OpeningStockValue, CurrentStock, ReservedStock, MinimumStock,
                     IsActive, IsDeleted)
    VALUES (N'IT-Dispatch Item', N'IT-DISPATCH-ITEM', @CategoryId, @UnitId, 1, 1, 1, 0,
            1, 0, 0, 15, 0, 0, 1, 0);
    SET @ItemId = SCOPE_IDENTITY();

    INSERT dbo.SalesChannels(Code, Name, DisplayOrder, IsActive, IsDeleted)
    VALUES (N'ITDSP', N'IT Dispatch Channel', 0, 1, 0);
    SET @ChannelId = SCOPE_IDENTITY();
    INSERT dbo.ChannelWarehouses(ChannelId, WarehouseCode, WarehouseName, Priority, SortOrder, IsActive, IsDeleted)
    VALUES (@ChannelId, N'IT-WH-1', N'IT Warehouse 1', 0, 0, 1, 0),
           (@ChannelId, N'IT-WH-2', N'IT Warehouse 2', 1, 1, 1, 0);
    SELECT @Warehouse1Id=Id FROM dbo.ChannelWarehouses WHERE ChannelId=@ChannelId AND WarehouseCode=N'IT-WH-1';
    SELECT @Warehouse2Id=Id FROM dbo.ChannelWarehouses WHERE ChannelId=@ChannelId AND WarehouseCode=N'IT-WH-2';
    INSERT dbo.ChannelSkuMappings(SalesChannelId, ChannelSku, ChannelProductName, ItemId, IsActive, IsDeleted, IsPrimary)
    VALUES (@ChannelId, N'IT-DISPATCH-SKU', N'IT Dispatch SKU', @ItemId, 1, 0, 1);
    SET @MappingId = SCOPE_IDENTITY();
    INSERT dbo.ItemPackagingProfiles(ItemId, ChannelId, PackagingCode, PackagingName, UnitsPerBox, Length, Width, Height,
                                     DimensionUnit, GrossWeight, NetWeight, WeightUnit, IsDefault, IsActive, IsDeleted)
    VALUES (@ItemId, @ChannelId, N'IT-BOX', N'IT Box', 1, 0, 0, 0, N'CM', 0, 0, N'KG', 1, 1, 0);
    SET @PackagingId = SCOPE_IDENTITY();
    INSERT dbo.DispatchSkuSettings(ItemId, ChannelId, PackagingProfileId, Tier, SafetyStockFactor, RecurringDemandFactor,
                                   MinimumDispatchQuantity, AllowLooseQuantity, RoundingMode, AllocationPriority, IsActive, IsDeleted)
    VALUES (@ItemId, @ChannelId, @PackagingId, 1, 0.1, 1, 0, 0, 1, 0, 1, 0);
    SET @SettingId = SCOPE_IDENTITY();

    SET @InvalidFileHash=REPLICATE('A',64);
    SET @SalesFileHash=REPLICATE('B',64);
    SET @StockFileHash=REPLICATE('C',64);
    SET @InboundFileHash=REPLICATE('D',64);
    SET @InvalidRowsJson=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse1Id)+N',"channelSku":"IT-NO-MAP","periodFrom":"2026-10-01","periodTo":"2026-10-07","salesQuantity":1}]';
    SET @SalesRowsJson=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse1Id)+N',"channelSku":"IT-DISPATCH-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07","salesQuantity":10},{"rowNumber":2,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse2Id)+N',"channelSku":"IT-DISPATCH-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07","salesQuantity":20}]';
    SET @StockRowsJson=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse1Id)+N',"channelSku":"IT-DISPATCH-SKU","snapshotDate":"2026-10-07","availableQuantity":2,"reservedQuantity":0,"damagedQuantity":0},{"rowNumber":2,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse2Id)+N',"channelSku":"IT-DISPATCH-SKU","snapshotDate":"2026-10-07","availableQuantity":1,"reservedQuantity":0,"damagedQuantity":0}]';
    SET @InboundRowsJson=N'[{"rowNumber":1,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse1Id)+N',"channelSku":"IT-DISPATCH-SKU","snapshotDate":"2026-10-07","inboundQuantity":3,"expectedArrivalDate":"2026-10-08","inboundStatus":2,"referenceNumber":"IT-IN-ELIGIBLE"},{"rowNumber":2,"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse2Id)+N',"channelSku":"IT-DISPATCH-SKU","snapshotDate":"2026-10-07","inboundQuantity":9,"expectedArrivalDate":"2026-10-08","inboundStatus":1,"referenceNumber":"IT-IN-INELIGIBLE"}]';

    /* Invalid/unmatched SKU is staged and rejected, not committed. */
    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName=N'IT-Dispatch-invalid-sales.json', @FileHash=@InvalidFileHash, @ImportType=1,
        @ChannelId=@ChannelId,
        @RowsJson=@InvalidRowsJson,
        @CorrelationId=N'IT-Dispatch-invalid', @UserId=NULL;
    SELECT @InvalidBatchId=Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-invalid-sales.json';
    IF NOT EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id=@InvalidBatchId AND Status=4 AND InvalidRows=1)
        THROW 51001, N'Unmatched SKU import was not rejected as expected.', 1;
    IF EXISTS(SELECT 1 FROM dbo.DispatchWarehouseSalesSnapshots WHERE ImportBatchId=@InvalidBatchId)
        THROW 51002, N'Invalid import unexpectedly produced sales snapshots.', 1;

    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName=N'IT-Dispatch-sales.json', @FileHash=@SalesFileHash, @ImportType=1,
        @ChannelId=@ChannelId,
        @RowsJson=@SalesRowsJson,
        @CorrelationId=N'IT-Dispatch-sales', @UserId=NULL;
    SELECT @SalesBatchId=Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-sales.json';
    EXEC dbo.usp_DispatchPlanning_Import_Commit @Id=@SalesBatchId, @AllowDuplicate=0, @CorrectionReason=NULL, @UserId=NULL;

    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName=N'IT-Dispatch-stock.json', @FileHash=@StockFileHash, @ImportType=2,
        @ChannelId=@ChannelId,
        @RowsJson=@StockRowsJson,
        @CorrelationId=N'IT-Dispatch-stock', @UserId=NULL;
    SELECT @StockBatchId=Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-stock.json';
    EXEC dbo.usp_DispatchPlanning_Import_Commit @Id=@StockBatchId, @AllowDuplicate=0, @CorrectionReason=NULL, @UserId=NULL;

    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName=N'IT-Dispatch-inbound-sales.json', @FileHash=@InboundFileHash, @ImportType=3,
        @ChannelId=@ChannelId,
        @RowsJson=@InboundRowsJson,
        @CorrelationId=N'IT-Dispatch-inbound', @UserId=NULL;
    SELECT @InboundBatchId=Id FROM dbo.SupplyChainImportBatches WHERE OriginalFileName=N'IT-Dispatch-inbound-sales.json';
    EXEC dbo.usp_DispatchPlanning_Import_Commit @Id=@InboundBatchId, @AllowDuplicate=0, @CorrectionReason=NULL, @UserId=NULL;

    IF (SELECT COUNT(*) FROM dbo.DispatchWarehouseSalesSnapshots WHERE ImportBatchId=@SalesBatchId)<>2
       OR (SELECT COUNT(*) FROM dbo.DispatchWarehouseStockSnapshots WHERE ImportBatchId=@StockBatchId)<>2
       OR (SELECT COUNT(*) FROM dbo.DispatchWarehouseInboundSnapshots WHERE ImportBatchId=@InboundBatchId)<>2
        THROW 51003, N'Valid import batches did not commit the expected snapshot rows.', 1;

    EXEC dbo.usp_DispatchPlanning_Run_Create @ChannelId=@ChannelId, @PlanningDate='2026-10-07',
        @SalesImportBatchId=@SalesBatchId, @WarehouseStockImportBatchId=@StockBatchId,
        @WarehouseInboundImportBatchId=@InboundBatchId, @CompanyStockSourceType=1,
        @Notes=N'IT-Dispatch configured-policy run', @UserId=NULL;
    SELECT @RunId=Id FROM dbo.DispatchPlanningRuns WHERE Notes=N'IT-Dispatch configured-policy run';
    EXEC dbo.usp_DispatchPlanning_Run_CalculationInputs @RunId=@RunId;

    SET @LinesJson=N'['+
        N'{"itemId":'+CONVERT(NVARCHAR(20),@ItemId)+N',"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse1Id)+N',"channelItemMappingId":'+CONVERT(NVARCHAR(20),@MappingId)+N',"dispatchSkuSettingId":'+CONVERT(NVARCHAR(20),@SettingId)+N',"packagingProfileId":'+CONVERT(NVARCHAR(20),@PackagingId)+N',"tier":1,"allocationPriority":0,"unitsPerBox":1,"roundingMode":1,"allowLooseQuantity":false,"salesQuantity":10,"currentSellableQuantity":2,"eligibleInboundQuantity":3,"totalWarehouseStock":5,"recurringDemand":10,"safetyStock":1,"reorderPoint":11,"rawShortage":6,"calculatedRecommendationQuantity":6,"finalRecommendationQuantity":6,"boxCount":6,"calculationExplanation":"IT configured calculation WH1"},'+
        N'{"itemId":'+CONVERT(NVARCHAR(20),@ItemId)+N',"warehouseId":'+CONVERT(NVARCHAR(20),@Warehouse2Id)+N',"channelItemMappingId":'+CONVERT(NVARCHAR(20),@MappingId)+N',"dispatchSkuSettingId":'+CONVERT(NVARCHAR(20),@SettingId)+N',"packagingProfileId":'+CONVERT(NVARCHAR(20),@PackagingId)+N',"tier":1,"allocationPriority":0,"unitsPerBox":1,"roundingMode":1,"allowLooseQuantity":false,"salesQuantity":20,"currentSellableQuantity":1,"eligibleInboundQuantity":0,"totalWarehouseStock":1,"recurringDemand":20,"safetyStock":2,"reorderPoint":22,"rawShortage":21,"calculatedRecommendationQuantity":21,"finalRecommendationQuantity":21,"boxCount":21,"calculationExplanation":"IT configured calculation WH2"}]';
    EXEC dbo.usp_DispatchPlanning_Run_SaveCalculation @RunId=@RunId, @LinesJson=@LinesJson, @UserId=NULL;
    /* Repeat calculation must replace results, not duplicate them. */
    EXEC dbo.usp_DispatchPlanning_Run_SaveCalculation @RunId=@RunId, @LinesJson=@LinesJson, @UserId=NULL;

    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status=2 AND CalculationVersion=N'dispatch-planning-v1')
        THROW 51004, N'Configured-policy calculation did not persist the expected run state/version.', 1;
    IF (SELECT COUNT(*) FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId)<>2
        THROW 51005, N'Repeated calculation created an incorrect recommendation count.', 1;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId AND WarehouseId=@Warehouse1Id AND CalculatedRecommendationQuantity=6 AND EligibleInboundQuantity=3)
       OR NOT EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId AND WarehouseId=@Warehouse2Id AND CalculatedRecommendationQuantity=21 AND EligibleInboundQuantity=0)
        THROW 51006, N'Persisted calculation values do not match the configured-policy fixture.', 1;

    /* A separate calculated run is retained for the external two-session allocation race test. */
    EXEC dbo.usp_DispatchPlanning_Run_Create @ChannelId=@ChannelId, @PlanningDate='2026-10-07',
        @SalesImportBatchId=@SalesBatchId, @WarehouseStockImportBatchId=@StockBatchId,
        @WarehouseInboundImportBatchId=@InboundBatchId, @CompanyStockSourceType=1,
        @Notes=N'IT-Dispatch concurrent-allocation run', @UserId=NULL;
    SELECT @ConcurrencyRunId=Id FROM dbo.DispatchPlanningRuns WHERE Notes=N'IT-Dispatch concurrent-allocation run';
    EXEC dbo.usp_DispatchPlanning_Run_SaveCalculation @RunId=@ConcurrencyRunId, @LinesJson=@LinesJson, @UserId=NULL;

    SELECT @Recommendation1Id=Id FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId AND WarehouseId=@Warehouse1Id;
    SELECT @Recommendation2Id=Id FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId AND WarehouseId=@Warehouse2Id;
    SELECT @CompanyStockSnapshotId=Id FROM dbo.DispatchCompanyStockSnapshots WHERE PlanningRunId=@RunId AND ItemId=@ItemId;
    EXEC dbo.usp_DispatchPlanning_Recommendation_Override @RunId=@RunId, @RecommendationId=@Recommendation1Id,
        @FinalRecommendationQuantity=5, @OverrideReason=N'IT override to constrained quantity', @UserId=NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE Id=@Recommendation1Id AND FinalRecommendationQuantity=5 AND OverrideReason=N'IT override to constrained quantity')
        THROW 51007, N'Manual recommendation override did not persist.', 1;

    /* Finalization before allocation must be rejected and must not change the run. */
    EXEC dbo.usp_DispatchPlanning_Run_Finalize @Id=@RunId, @UserId=NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status=2)
        THROW 51008, N'Invalid finalization changed the calculated run state.', 1;

    SET @AllocationJson=N'[{"recommendationId":'+CONVERT(NVARCHAR(20),@Recommendation1Id)+N',"companyStockSnapshotId":'+CONVERT(NVARCHAR(20),@CompanyStockSnapshotId)+N',"allocatedQuantity":5},{"recommendationId":'+CONVERT(NVARCHAR(20),@Recommendation2Id)+N',"companyStockSnapshotId":'+CONVERT(NVARCHAR(20),@CompanyStockSnapshotId)+N',"allocatedQuantity":10}]';
    EXEC dbo.usp_DispatchPlanning_Run_Allocate @Id=@RunId,
        @AllocationsJson=@AllocationJson,
        @Notes=N'IT constrained allocation', @UserId=NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status=3)
        THROW 51009, N'Allocation did not persist the allocated run state.', 1;
    IF (SELECT SUM(AllocatedQuantity) FROM dbo.DispatchAllocations WHERE PlanningRunId=@RunId)<>15
       OR (SELECT SUM(AllocatedQuantity) FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId)<>15
        THROW 51010, N'Constrained allocation did not persist the expected total.', 1;
    EXEC dbo.usp_DispatchPlanning_Recommendation_Override @RunId=@RunId, @RecommendationId=@Recommendation1Id,
        @FinalRecommendationQuantity=4, @OverrideReason=N'IT invalid post-allocation override', @UserId=NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status=3)
        THROW 51011, N'Invalid post-allocation override changed the run state.', 1;

    EXEC dbo.usp_DispatchPlanning_Run_Finalize @Id=@RunId, @UserId=NULL;
    EXEC dbo.usp_DispatchPlanning_Run_Finalize @Id=@RunId, @UserId=NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status=4 AND FinalizedAtUtc IS NOT NULL)
        THROW 51012, N'Finalization did not persist an immutable final state.', 1;
    IF EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND CurrentStock<>15)
        THROW 51013, N'Dispatch finalization unexpectedly mutated inventory.', 1;

    /* Forced persistence failure: invalid packaging FK occurs after the company-stock snapshot insert; transaction must roll back. */
    EXEC dbo.usp_DispatchPlanning_Run_Create @ChannelId=@ChannelId, @PlanningDate='2026-10-07',
        @SalesImportBatchId=@SalesBatchId, @WarehouseStockImportBatchId=@StockBatchId,
        @WarehouseInboundImportBatchId=@InboundBatchId, @CompanyStockSourceType=1,
        @Notes=N'IT-Dispatch forced-save-failure run', @UserId=NULL;
    SELECT @FailureRunId=Id FROM dbo.DispatchPlanningRuns WHERE Notes=N'IT-Dispatch forced-save-failure run';
    SET @BadLinesJson=REPLACE(@LinesJson, N'"packagingProfileId":'+CONVERT(NVARCHAR(20),@PackagingId), N'"packagingProfileId":999999999');
    EXEC dbo.usp_DispatchPlanning_Run_SaveCalculation @RunId=@FailureRunId, @LinesJson=@BadLinesJson, @UserId=NULL;
    IF EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@FailureRunId)
       OR EXISTS(SELECT 1 FROM dbo.DispatchCompanyStockSnapshots WHERE PlanningRunId=@FailureRunId)
       OR NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@FailureRunId AND Status=1)
        THROW 51014, N'Forced calculation failure did not roll back Dispatch persistence.', 1;

    SELECT N'PASS' AS TestResult, @RunId AS FinalizedRunId, @FailureRunId AS RolledBackRunId, @ConcurrencyRunId AS ConcurrentAllocationRunId,
           (SELECT COUNT(*) FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId) AS PersistedRecommendationCount,
           (SELECT SUM(AllocatedQuantity) FROM dbo.DispatchAllocations WHERE PlanningRunId=@RunId) AS PersistedAllocatedQuantity;
END TRY
BEGIN CATCH
    THROW;
END CATCH;
