/*
    Transactional staging smoke test for the Procurement Planning migration.
    All test data is rolled back. Run after 20260715_procurement_planning_module.sql.
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
    BEGIN TRANSACTION;

    DECLARE @CategoryId BIGINT=(SELECT TOP(1) Id FROM dbo.Categories WHERE IsDeleted=0 AND IsActive=1 ORDER BY Id);
    DECLARE @UnitId BIGINT=(SELECT TOP(1) Id FROM dbo.Units WHERE IsDeleted=0 AND IsActive=1 ORDER BY Id);
    IF @CategoryId IS NULL OR @UnitId IS NULL THROW 51000,'Smoke test requires one active category and unit.',1;

    DECLARE @Suffix NVARCHAR(30)=REPLACE(CONVERT(NVARCHAR(36),NEWID()),N'-',N'');
    INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,ProcurementClassification,TrackInventory,CurrentStock,IsActive)
    VALUES(N'Smoke finished product',N'SMOKE-FP-'+@Suffix, @CategoryId,@UnitId,1,1,1,0,1);
    DECLARE @ProductId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.Items(Name,ItemCode,CategoryId,UnitId,ItemType,ProcurementClassification,TrackInventory,CurrentStock,IsActive)
    VALUES(N'Smoke raw material',N'SMOKE-RM-'+@Suffix,@CategoryId,@UnitId,1,2,1,5,1);
    DECLARE @MaterialId BIGINT=SCOPE_IDENTITY();

    DECLARE @ChannelId BIGINT=(SELECT Id FROM dbo.SalesChannels WHERE Code=N'AMZ' AND IsDeleted=0);
    EXEC dbo.sp_ProcurementPlanning_SkuMapping_Save NULL,@ChannelId,N'SMOKE-SKU',N'Smoke product',@ProductId,1,NULL;

    DECLARE @BomJson NVARCHAR(MAX)=(SELECT @MaterialId componentItemId,CAST(2 AS DECIMAL(19,6)) quantityRequired,@UnitId unitId,CAST(1 AS BIT) isActive FOR JSON PATH);
    EXEC dbo.sp_ProcurementPlanning_Bom_Save @ProductId,@BomJson,NULL;
    EXEC dbo.sp_ProcurementPlanning_Settings_Save @MaterialId,30,NULL,1,10,NULL,1,0,2,1,NULL;
    EXEC dbo.sp_ProcurementPlanning_Sales_ManualSave NULL,'2026-06-30',@ChannelId,N'SMOKE-SKU',N'Smoke product',@ProductId,10,NULL,NULL;

    IF NOT EXISTS(SELECT 1 FROM dbo.ProductBomComponents WHERE FinishedProductItemId=@ProductId AND ComponentItemId=@MaterialId AND IsActive=1 AND IsDeleted=0)
        THROW 51001,'BOM smoke assertion failed.',1;
    IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementSettings WHERE ItemId=@MaterialId AND IsActive=1 AND IsDeleted=0)
        THROW 51002,'Settings smoke assertion failed.',1;

    DECLARE @ImportHash CHAR(64)=CONVERT(CHAR(64),HASHBYTES('SHA2_256',@Suffix),2);
    INSERT dbo.ProcurementSalesImportBatches(BatchNumber,OriginalFileName,FileHash,TotalRows,ImportedRows,UnmappedRows,Status)
    VALUES(N'SMOKE-'+LEFT(@Suffix,20),N'smoke.csv',@ImportHash,1,1,0,1);
    DECLARE @ImportBatchId BIGINT=SCOPE_IDENTITY();
    INSERT dbo.ProcurementSalesHistory(SalesDate,SalesChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,ImportBatchId,SourceRowNumber,SourceRowJson,IsManual)
    VALUES('2026-06-29',@ChannelId,N'SMOKE-SKU',N'Smoke product',@ProductId,1,@ImportBatchId,2,N'{}',0);

    DECLARE @DuplicateResult TABLE(StatusCode INT,Message NVARCHAR(1000));
    INSERT @DuplicateResult EXEC dbo.sp_ProcurementPlanning_Import_Confirm N'smoke.csv',@ImportHash,0,NULL,N'[]',NULL;
    IF NOT EXISTS(SELECT 1 FROM @DuplicateResult WHERE StatusCode=409) THROW 51007,'Duplicate import protection assertion failed.',1;
    EXEC dbo.sp_ProcurementPlanning_ImportBatch_Cancel @ImportBatchId,N'Smoke cancellation',NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementSalesImportBatches WHERE Id=@ImportBatchId AND Status=2)
       OR EXISTS(SELECT 1 FROM dbo.ProcurementSalesHistory WHERE ImportBatchId=@ImportBatchId AND IsDeleted=0)
        THROW 51008,'Import cancellation assertion failed.',1;

    DECLARE @LinesJson NVARCHAR(MAX)=(SELECT @MaterialId materialItemId,N'SMOKE-RM' materialItemCode,N'Smoke raw material' materialItemName,@UnitId unitId,N'Unit' unitName,N'U' unitShortName,
        CAST(20 AS DECIMAL(19,6)) materialRequirement,CAST(0.666667 AS DECIMAL(19,6)) averageDailyUsage,CAST(30 AS DECIMAL(9,3)) leadTimeDays,N'Configured' leadTimeSource,
        CAST(20 AS DECIMAL(19,6)) leadTimeDemand,CAST(1 AS DECIMAL(19,6)) safetyFactor,CAST(20 AS DECIMAL(19,6)) safetyStock,CAST(40 AS DECIMAL(19,6)) reorderPoint,
        CAST(5 AS DECIMAL(19,6)) physicalStock,CAST(35 AS DECIMAL(19,6)) shortage,CAST(10 AS DECIMAL(19,6)) minimumOrderQuantity,CAST(NULL AS DECIMAL(19,6)) orderMultiple,
        2 roundingRule,CAST(1 AS BIT) automaticCalculationEnabled,CAST(0 AS BIT) manualPlanning,CAST(35 AS DECIMAL(19,6)) calculatedSuggestedQuantity,
        CAST(35 AS DECIMAL(19,6)) finalQuantity,CAST(NULL AS NVARCHAR(1000)) adjustmentReason,CAST(NULL AS NVARCHAR(2000)) warningState,N'Smoke calculation explanation' calculationExplanation FOR JSON PATH);
    DECLARE @CalculatedAtUtc DATETIME2(3)=SYSUTCDATETIME();
    EXEC dbo.sp_ProcurementPlanning_Run_Save '2026-06-01','2026-06-30',30,@CalculatedAtUtc,N'Smoke run',N'workbook-compatible-v1',N'Items.CurrentStock',@LinesJson,NULL;
    DECLARE @RunId BIGINT=(SELECT MAX(Id) FROM dbo.ProcurementPlanningRuns WHERE Notes=N'Smoke run');
    DECLARE @LineId BIGINT=(SELECT Id FROM dbo.ProcurementPlanningRunLines WHERE PlanningRunId=@RunId AND MaterialItemId=@MaterialId);
    IF @RunId IS NULL OR @LineId IS NULL THROW 51003,'Planning snapshot save assertion failed.',1;

    UPDATE dbo.Items SET CurrentStock=999 WHERE Id=@MaterialId;
    IF (SELECT PhysicalStock FROM dbo.ProcurementPlanningRunLines WHERE Id=@LineId)<>5 THROW 51004,'Planning snapshot changed after Item stock changed.',1;

    EXEC dbo.sp_ProcurementPlanning_RunLine_Update @RunId,@LineId,40,N'Authorized smoke adjustment',NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementPlanningRunLines WHERE Id=@LineId AND FinalQuantity=40 AND AdjustmentReason=N'Authorized smoke adjustment')
        THROW 51005,'Final quantity adjustment assertion failed.',1;
    EXEC dbo.sp_ProcurementPlanning_Run_Finalize @RunId,NULL;
    IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementPlanningRuns WHERE Id=@RunId AND Status=2) THROW 51006,'Finalize assertion failed.',1;

    SELECT N'PASS' SmokeTestStatus, @RunId PlanningRunId, @LineId PlanningRunLineId;
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
