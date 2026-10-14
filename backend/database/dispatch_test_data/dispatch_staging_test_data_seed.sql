
/*
    COSMOS ERP - Dispatch staging test data seed
    DATA-CHANGING SCRIPT.

    Target:
      Server:   srv1791248
      Database: CosmosERP_Staging

    Review before execution. Do not run against production.
    This script creates master data and imports Sales, Stock and Inbound data.
    It deliberately does NOT create a Dispatch planning run.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF DB_NAME() <> N'CosmosERP_Staging'
   OR CONVERT(NVARCHAR(128), SERVERPROPERTY('ServerName')) <> N'srv1791248'
BEGIN
    print(
        N'Refusing to seed outside srv1791248 / CosmosERP_Staging.')
END;

IF OBJECT_ID(N'dbo.usp_DispatchPlanning_Import_Validate', N'P') IS NULL
   OR OBJECT_ID(N'dbo.usp_DispatchPlanning_Import_Commit', N'P') IS NULL
BEGIN
print('Dispatch import procedures are missing.');
    -- THROW 52201, N'', 1;
END;

DECLARE
    @P NVARCHAR(30) = N'DSPSTG20261014',

    @CategoryId BIGINT,
    @UnitId BIGINT,
    @ChannelId BIGINT,
    @WarehouseAId BIGINT,
    @WarehouseBId BIGINT,
    @ItemId BIGINT,
    @PackagingId BIGINT,

    @SalesBatchId BIGINT,
    @StockBatchId BIGINT,
    @InboundBatchId BIGINT,

    @SalesRows NVARCHAR(MAX),
    @StockRows NVARCHAR(MAX),
    @InboundRows NVARCHAR(MAX),

    @SalesHash CHAR(64),
    @StockHash CHAR(64),
    @InboundHash CHAR(64),

    @SalesFileName NVARCHAR(260),
    @StockFileName NVARCHAR(260),
    @InboundFileName NVARCHAR(260),

    @SalesCorrelationId NVARCHAR(100),
    @StockCorrelationId NVARCHAR(100),
    @InboundCorrelationId NVARCHAR(100);


/* ------------------------------------------------------------
   1. Prepare filenames and identifiers.
   Avoid string concatenation directly in EXEC arguments.
   ------------------------------------------------------------ */

SET @SalesFileName = @P + N'-sales-20261007.json';
SET @StockFileName = @P + N'-stock-20261007.json';
SET @InboundFileName = @P + N'-inbound-20261007.json';

SET @SalesCorrelationId = @P + N'-sales';
SET @StockCorrelationId = @P + N'-stock';
SET @InboundCorrelationId = @P + N'-inbound';


/* ------------------------------------------------------------
   2. Prepare the test master data.
   This transaction covers these master-data inserts only.
   ------------------------------------------------------------ */

BEGIN TRY
    BEGIN TRANSACTION;

    /* Category */
    SELECT @CategoryId = Id
    FROM dbo.Categories
    WHERE Name = @P + N' Dispatch Category';

    IF @CategoryId IS NULL
    BEGIN
        INSERT INTO dbo.Categories
            (Name, IsActive)
        VALUES
            (@P + N' Dispatch Category', 1);

        SET @CategoryId = CONVERT(BIGINT, SCOPE_IDENTITY());
    END;


    /* Unit */
    SELECT @UnitId = Id
    FROM dbo.Units
    WHERE ShortName = N'DS14';

    IF @UnitId IS NULL
    BEGIN
        INSERT INTO dbo.Units
            (Name, ShortName, IsActive)
        VALUES
            (@P + N' Unit', N'DS14', 1);

        SET @UnitId = CONVERT(BIGINT, SCOPE_IDENTITY());
    END;


    /* Sales channel */
    SELECT @ChannelId = Id
    FROM dbo.SalesChannels
    WHERE Code = @P;

    IF @ChannelId IS NULL
    BEGIN
        INSERT INTO dbo.SalesChannels
            (Code, Name, DisplayOrder, IsActive, IsDeleted)
        VALUES
            (@P, @P + N' Dispatch Test Channel', 999, 1, 0);

        SET @ChannelId = CONVERT(BIGINT, SCOPE_IDENTITY());
    END;


    /* Warehouse A */
    SELECT @WarehouseAId = Id
    FROM dbo.ChannelWarehouses
    WHERE ChannelId = @ChannelId
      AND WarehouseCode = @P + N'-A';

    IF @WarehouseAId IS NULL
    BEGIN
        INSERT INTO dbo.ChannelWarehouses
            (ChannelId, WarehouseCode, WarehouseName,
             Priority, SortOrder, IsActive, IsDeleted)
        VALUES
            (@ChannelId, @P + N'-A', @P + N' Warehouse A',
             0, 0, 1, 0);

        SET @WarehouseAId = CONVERT(BIGINT, SCOPE_IDENTITY());
    END;


    /* Warehouse B */
    SELECT @WarehouseBId = Id
    FROM dbo.ChannelWarehouses
    WHERE ChannelId = @ChannelId
      AND WarehouseCode = @P + N'-B';

    IF @WarehouseBId IS NULL
    BEGIN
        INSERT INTO dbo.ChannelWarehouses
            (ChannelId, WarehouseCode, WarehouseName,
             Priority, SortOrder, IsActive, IsDeleted)
        VALUES
            (@ChannelId, @P + N'-B', @P + N' Warehouse B',
             1, 1, 1, 0);

        SET @WarehouseBId = CONVERT(BIGINT, SCOPE_IDENTITY());
    END;


    /* Test item */
    SELECT @ItemId = Id
    FROM dbo.Items
    WHERE ItemCode = @P + N'-SHORT';

    IF @ItemId IS NULL
    BEGIN
        INSERT INTO dbo.Items
            (Name, ItemCode, CategoryId, UnitId, ItemType,
             PurchasePrice, SalesPrice, GSTRate, TrackInventory,
             OpeningStock, OpeningStockValue, CurrentStock,
             ReservedStock, MinimumStock, IsActive, IsDeleted)
        VALUES
            (@P + N' Shortage Item', @P + N'-SHORT',
             @CategoryId, @UnitId, 1,
             1, 1, 0, 1,
             0, 0, 20,
             0, 0, 1, 0);

        SET @ItemId = CONVERT(BIGINT, SCOPE_IDENTITY());
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;


/* Ensure IDs were resolved before continuing. */

IF @CategoryId IS NULL
   OR @UnitId IS NULL
   OR @ChannelId IS NULL
   OR @WarehouseAId IS NULL
   OR @WarehouseBId IS NULL
   OR @ItemId IS NULL
BEGIN
print('Could not resolve all required Dispatch test master records.');
    --THROW 52206, N'Could not resolve all required Dispatch test master records.', 1;
END;


/* ------------------------------------------------------------
   3. SKU mapping.
   ------------------------------------------------------------ */

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.ChannelSkuMappings
    WHERE SalesChannelId = @ChannelId
      AND ChannelSku = @P + N'-SKU'
      AND IsDeleted = 0
)
BEGIN
    INSERT INTO dbo.ChannelSkuMappings
        (SalesChannelId, ChannelSku, ChannelProductName,
         ItemId, IsActive, IsDeleted, IsPrimary)
    VALUES
        (@ChannelId, @P + N'-SKU', @P + N' shortage SKU',
         @ItemId, 1, 0, 1);
END;


/* ------------------------------------------------------------
   4. Packaging profile.
   ------------------------------------------------------------ */

SELECT @PackagingId = Id
FROM dbo.ItemPackagingProfiles
WHERE ItemId = @ItemId
  AND ChannelId = @ChannelId
  AND PackagingCode = @P + N'-BOX6'
  AND IsDeleted = 0;

IF @PackagingId IS NULL
BEGIN
    INSERT INTO dbo.ItemPackagingProfiles
        (ItemId, ChannelId, PackagingCode, PackagingName,
         UnitsPerBox, Length, Width, Height, DimensionUnit,
         GrossWeight, NetWeight, WeightUnit,
         IsDefault, IsActive, IsDeleted)
    VALUES
        (@ItemId, @ChannelId, @P + N'-BOX6',
         @P + N' six-unit box',
         6, 0, 0, 0, N'CM',
         0, 0, N'KG',
         1, 1, 0);

    SET @PackagingId = CONVERT(BIGINT, SCOPE_IDENTITY());
END;

IF @PackagingId IS NULL
BEGIN
print('Could not resolve the test packaging profile.');
    --THROW 52207, N'', 1;
END;


/* ------------------------------------------------------------
   5. Dispatch SKU settings.
   ------------------------------------------------------------ */

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.DispatchSkuSettings
    WHERE ItemId = @ItemId
      AND ChannelId = @ChannelId
      AND PackagingProfileId = @PackagingId
      AND IsDeleted = 0
)
BEGIN
    INSERT INTO dbo.DispatchSkuSettings
        (ItemId, ChannelId, PackagingProfileId,
         Tier, SafetyStockFactor, RecurringDemandFactor,
         MinimumDispatchQuantity, AllowLooseQuantity,
         RoundingMode, AllocationPriority, IsActive, IsDeleted)
    VALUES
        (@ItemId, @ChannelId, @PackagingId,
         1, 0.1, 1,
         0, 0,
         3, 0, 1, 0);
END;


/* ------------------------------------------------------------
   6. Build import JSON.
   ------------------------------------------------------------ */

SET @SalesRows =
    N'[{"rowNumber":1,"warehouseId":'
    + CONVERT(NVARCHAR(20), @WarehouseAId)
    + N',"channelSku":"' + @P
    + N'-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07",'
    + N'"salesQuantity":10,"sourceReference":"' + @P
    + N' sales A"},'
    + N'{"rowNumber":2,"warehouseId":'
    + CONVERT(NVARCHAR(20), @WarehouseBId)
    + N',"channelSku":"' + @P
    + N'-SKU","periodFrom":"2026-10-01","periodTo":"2026-10-07",'
    + N'"salesQuantity":20,"sourceReference":"' + @P
    + N' sales B"}]';


SET @StockRows =
    N'[{"rowNumber":1,"warehouseId":'
    + CONVERT(NVARCHAR(20), @WarehouseAId)
    + N',"channelSku":"' + @P
    + N'-SKU","snapshotDate":"2026-10-07",'
    + N'"availableQuantity":2,"reservedQuantity":0,"damagedQuantity":0},'
    + N'{"rowNumber":2,"warehouseId":'
    + CONVERT(NVARCHAR(20), @WarehouseBId)
    + N',"channelSku":"' + @P
    + N'-SKU","snapshotDate":"2026-10-07",'
    + N'"availableQuantity":1,"reservedQuantity":0,"damagedQuantity":0}]';


SET @InboundRows =
    N'[{"rowNumber":1,"warehouseId":'
    + CONVERT(NVARCHAR(20), @WarehouseAId)
    + N',"channelSku":"' + @P
    + N'-SKU","snapshotDate":"2026-10-07",'
    + N'"inboundQuantity":3,"expectedArrivalDate":"2026-10-08",'
    + N'"inboundStatus":2,"referenceNumber":"' + @P
    + N'-IN-A"},'
    + N'{"rowNumber":2,"warehouseId":'
    + CONVERT(NVARCHAR(20), @WarehouseBId)
    + N',"channelSku":"' + @P
    + N'-SKU","snapshotDate":"2026-10-07",'
    + N'"inboundQuantity":9,"expectedArrivalDate":"2026-10-08",'
    + N'"inboundStatus":1,"referenceNumber":"' + @P
    + N'-IN-B"}]';


/*
    These hashes are fixed scenario identifiers, not cryptographic
    hashes of the JSON payload. Verify the repository's duplicate-file
    semantics before changing or reusing them.
*/
SET @SalesHash = REPLICATE('A', 64);
SET @StockHash = REPLICATE('B', 64);
SET @InboundHash = REPLICATE('C', 64);


/* ------------------------------------------------------------
   7. Sales import.
   ------------------------------------------------------------ */

SELECT @SalesBatchId = Id
FROM dbo.SupplyChainImportBatches
WHERE ModuleType = N'DispatchPlanning'
  AND OriginalFileName = @SalesFileName;

IF @SalesBatchId IS NULL
BEGIN
    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName = @SalesFileName,
        @FileHash = @SalesHash,
        @ImportType = 1,
        @ChannelId = @ChannelId,
        @RowsJson = @SalesRows,
        @CorrelationId = @SalesCorrelationId,
        @UserId = NULL;

    SELECT @SalesBatchId = Id
    FROM dbo.SupplyChainImportBatches
    WHERE ModuleType = N'DispatchPlanning'
      AND OriginalFileName = @SalesFileName;

    IF @SalesBatchId IS NULL
        THROW 52203, N'Sales import batch was not created.', 1;

    EXEC dbo.usp_DispatchPlanning_Import_Commit
        @Id = @SalesBatchId,
        @UserId = NULL;
END;


/* ------------------------------------------------------------
   8. Warehouse stock import.
   ------------------------------------------------------------ */

SELECT @StockBatchId = Id
FROM dbo.SupplyChainImportBatches
WHERE ModuleType = N'DispatchPlanning'
  AND OriginalFileName = @StockFileName;

IF @StockBatchId IS NULL
BEGIN
    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName = @StockFileName,
        @FileHash = @StockHash,
        @ImportType = 2,
        @ChannelId = @ChannelId,
        @RowsJson = @StockRows,
        @CorrelationId = @StockCorrelationId,
        @UserId = NULL;

    SELECT @StockBatchId = Id
    FROM dbo.SupplyChainImportBatches
    WHERE ModuleType = N'DispatchPlanning'
      AND OriginalFileName = @StockFileName;

    IF @StockBatchId IS NULL
        THROW 52204, N'Stock import batch was not created.', 1;

    EXEC dbo.usp_DispatchPlanning_Import_Commit
        @Id = @StockBatchId,
        @UserId = NULL;
END;


/* ------------------------------------------------------------
   9. Inbound import.
   ------------------------------------------------------------ */

SELECT @InboundBatchId = Id
FROM dbo.SupplyChainImportBatches
WHERE ModuleType = N'DispatchPlanning'
  AND OriginalFileName = @InboundFileName;

IF @InboundBatchId IS NULL
BEGIN
    EXEC dbo.usp_DispatchPlanning_Import_Validate
        @OriginalFileName = @InboundFileName,
        @FileHash = @InboundHash,
        @ImportType = 3,
        @ChannelId = @ChannelId,
        @RowsJson = @InboundRows,
        @CorrelationId = @InboundCorrelationId,
        @UserId = NULL;

    SELECT @InboundBatchId = Id
    FROM dbo.SupplyChainImportBatches
    WHERE ModuleType = N'DispatchPlanning'
      AND OriginalFileName = @InboundFileName;

    IF @InboundBatchId IS NULL
        THROW 52205, N'Inbound import batch was not created.', 1;

    EXEC dbo.usp_DispatchPlanning_Import_Commit
        @Id = @InboundBatchId,
        @UserId = NULL;
END;


/* ------------------------------------------------------------
   10. Verify final batch status.
   The reviewed procedure reports status 5 for committed batches.
   ------------------------------------------------------------ */

IF EXISTS
(
    SELECT 1
    FROM dbo.SupplyChainImportBatches
    WHERE Id IN (@SalesBatchId, @StockBatchId, @InboundBatchId)
      AND Status <> 5
)
BEGIN
print('One or more scenario batches are not committed. Inspect batch status before retrying.');
    --THROW 52202,
    --    N'',
    --    1;
END;


/* ------------------------------------------------------------
   11. Return the created/reused IDs.
   Planning runs are created through the UI/API, not this script.
   ------------------------------------------------------------ */

SELECT
    DB_NAME() AS DatabaseName,
    @ChannelId AS ChannelId,
    @WarehouseAId AS WarehouseAId,
    @WarehouseBId AS WarehouseBId,
    @ItemId AS ItemId,
    @PackagingId AS PackagingId,
    @SalesBatchId AS SalesBatchId,
    @StockBatchId AS StockBatchId,
    @InboundBatchId AS InboundBatchId,
    N'Create the Dispatch planning run only through the UI/API.'
        AS NextStep;
