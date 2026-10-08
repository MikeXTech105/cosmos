/*
   Dispatch Planning SKU snapshot integrity repair.
   A run/result is planned at warehouse + channel SKU granularity. The original
   procedure grouped inbound rows only by Item and Warehouse and the result
   uniqueness omitted ChannelItemMappingId, which could collapse distinct SKUs
   mapped to the same internal Item.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF EXISTS
(
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.DispatchRecommendationResults')
      AND name = N'UQ_DispatchRecommendationResults_RunItemWarehouse'
)
    ALTER TABLE dbo.DispatchRecommendationResults
        DROP CONSTRAINT UQ_DispatchRecommendationResults_RunItemWarehouse;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.DispatchRecommendationResults')
      AND name = N'UQ_DispatchRecommendationResults_RunItemWarehouseMapping'
)
    ALTER TABLE dbo.DispatchRecommendationResults
        ADD CONSTRAINT UQ_DispatchRecommendationResults_RunItemWarehouseMapping
        UNIQUE(PlanningRunId, ItemId, WarehouseId, ChannelItemMappingId);
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_CalculationInputs @RunId BIGINT AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ChannelId BIGINT,@PlanningDate DATE,@SalesBatch BIGINT,@StockBatch BIGINT,@InboundBatch BIGINT,@Status INT;
    SELECT @ChannelId=ChannelId,@PlanningDate=PlanningDate,@SalesBatch=SalesImportBatchId,@StockBatch=WarehouseStockImportBatchId,@InboundBatch=WarehouseInboundImportBatchId,@Status=Status FROM dbo.DispatchPlanningRuns WHERE Id=@RunId;
    IF @ChannelId IS NULL OR @Status NOT IN(1,2) THROW 50001,N'Only a Draft or Calculated Dispatch Planning run can be calculated.',1;

    ;WITH Sales AS
    (
        SELECT WarehouseId,ItemId,ChannelItemMappingId,SUM(SalesQuantity) SalesQuantity
        FROM dbo.DispatchWarehouseSalesSnapshots WHERE ImportBatchId=@SalesBatch GROUP BY WarehouseId,ItemId,ChannelItemMappingId
    ), Stock AS
    (
        SELECT WarehouseId,ItemId,ChannelItemMappingId,SUM(SellableQuantity) SellableQuantity
        FROM dbo.DispatchWarehouseStockSnapshots WHERE ImportBatchId=@StockBatch GROUP BY WarehouseId,ItemId,ChannelItemMappingId
    ), Inbound AS
    (
        SELECT WarehouseId,ItemId,ChannelItemMappingId,SUM(InboundQuantity) EligibleInboundQuantity
        FROM dbo.DispatchWarehouseInboundSnapshots WHERE ImportBatchId=@InboundBatch AND InboundStatus IN(2,3)
        GROUP BY WarehouseId,ItemId,ChannelItemMappingId
    )
    SELECT sa.ItemId,i.ItemCode,i.Name ItemName,sa.WarehouseId,w.WarehouseCode,w.WarehouseName,w.Priority WarehousePriority,sa.ChannelItemMappingId,m.ChannelSku,
           ds.Id DispatchSkuSettingId,ds.Tier,ds.AllocationPriority,pp.Id PackagingProfileId,pp.UnitsPerBox,ds.RoundingMode,ds.AllowLooseQuantity,ds.SafetyStockFactor,ds.RecurringDemandFactor,ds.MinimumDispatchQuantity,
           sa.SalesQuantity,st.SellableQuantity CurrentSellableQuantity,COALESCE(ib.EligibleInboundQuantity,0) EligibleInboundQuantity
    FROM Sales sa
    JOIN Stock st ON st.WarehouseId=sa.WarehouseId AND st.ItemId=sa.ItemId AND st.ChannelItemMappingId=sa.ChannelItemMappingId
    JOIN dbo.Items i ON i.Id=sa.ItemId AND i.IsDeleted=0 AND i.IsActive=1
    JOIN dbo.ChannelWarehouses w ON w.Id=sa.WarehouseId AND w.ChannelId=@ChannelId AND w.IsDeleted=0 AND w.IsActive=1
    JOIN dbo.ChannelSkuMappings m ON m.Id=sa.ChannelItemMappingId AND m.SalesChannelId=@ChannelId AND m.ItemId=sa.ItemId AND m.IsDeleted=0 AND m.IsActive=1
    LEFT JOIN Inbound ib ON ib.WarehouseId=sa.WarehouseId AND ib.ItemId=sa.ItemId AND ib.ChannelItemMappingId=sa.ChannelItemMappingId
    OUTER APPLY
    (
        SELECT TOP(1) s.* FROM dbo.DispatchSkuSettings s
        WHERE s.ItemId=sa.ItemId AND s.IsDeleted=0 AND s.IsActive=1 AND (s.ChannelId=@ChannelId OR s.ChannelId IS NULL)
          AND COALESCE(s.EffectiveFrom,CONVERT(DATE,'19000101'))<=@PlanningDate AND COALESCE(s.EffectiveTo,CONVERT(DATE,'99991231'))>=@PlanningDate
        ORDER BY CASE WHEN s.ChannelId=@ChannelId THEN 0 ELSE 1 END,s.Id DESC
    ) ds
    OUTER APPLY
    (
        SELECT TOP(1) p.* FROM dbo.ItemPackagingProfiles p
        WHERE p.ItemId=sa.ItemId AND p.IsDeleted=0 AND p.IsActive=1
          AND (p.Id=ds.PackagingProfileId OR (p.IsDefault=1 AND (p.ChannelId=@ChannelId OR p.ChannelId IS NULL)))
          AND COALESCE(p.EffectiveFrom,CONVERT(DATE,'19000101'))<=@PlanningDate AND COALESCE(p.EffectiveTo,CONVERT(DATE,'99991231'))>=@PlanningDate
        ORDER BY CASE WHEN p.Id=ds.PackagingProfileId THEN 0 WHEN p.ChannelId=@ChannelId THEN 1 ELSE 2 END,p.Id DESC
    ) pp
    WHERE ds.Id IS NOT NULL AND pp.Id IS NOT NULL
    ORDER BY ds.AllocationPriority,ds.Tier,w.Priority,i.ItemCode,sa.ChannelItemMappingId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_SaveCalculation @RunId BIGINT,@LinesJson NVARCHAR(MAX),@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF ISJSON(@LinesJson)<>1 BEGIN SELECT 400 StatusCode,N'Dispatch calculation lines are invalid.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status IN(1,2)) BEGIN SELECT 409 StatusCode,N'Only a Draft or Calculated Dispatch Planning run can be recalculated.' Message; RETURN; END;
        DECLARE @Lines TABLE
        (
            ItemId BIGINT,WarehouseId BIGINT,ChannelItemMappingId BIGINT,DispatchSkuSettingId BIGINT,PackagingProfileId BIGINT,Tier INT,AllocationPriority INT,UnitsPerBox DECIMAL(19,6),RoundingMode INT,AllowLooseQuantity BIT,
            SalesQuantity DECIMAL(19,6),CurrentSellableQuantity DECIMAL(19,6),EligibleInboundQuantity DECIMAL(19,6),TotalWarehouseStock DECIMAL(19,6),RecurringDemand DECIMAL(19,6),SafetyStock DECIMAL(19,6),ReorderPoint DECIMAL(19,6),RawShortage DECIMAL(19,6),CalculatedRecommendationQuantity DECIMAL(19,6),FinalRecommendationQuantity DECIMAL(19,6),BoxCount DECIMAL(19,6),CalculationExplanation NVARCHAR(4000)
        );
        INSERT @Lines SELECT ItemId,WarehouseId,ChannelItemMappingId,DispatchSkuSettingId,PackagingProfileId,Tier,AllocationPriority,UnitsPerBox,RoundingMode,AllowLooseQuantity,SalesQuantity,CurrentSellableQuantity,EligibleInboundQuantity,TotalWarehouseStock,RecurringDemand,SafetyStock,ReorderPoint,RawShortage,CalculatedRecommendationQuantity,FinalRecommendationQuantity,BoxCount,CalculationExplanation
        FROM OPENJSON(@LinesJson) WITH
        (
            ItemId BIGINT '$.itemId',WarehouseId BIGINT '$.warehouseId',ChannelItemMappingId BIGINT '$.channelItemMappingId',DispatchSkuSettingId BIGINT '$.dispatchSkuSettingId',PackagingProfileId BIGINT '$.packagingProfileId',Tier INT '$.tier',AllocationPriority INT '$.allocationPriority',UnitsPerBox DECIMAL(19,6) '$.unitsPerBox',RoundingMode INT '$.roundingMode',AllowLooseQuantity BIT '$.allowLooseQuantity',
            SalesQuantity DECIMAL(19,6) '$.salesQuantity',CurrentSellableQuantity DECIMAL(19,6) '$.currentSellableQuantity',EligibleInboundQuantity DECIMAL(19,6) '$.eligibleInboundQuantity',TotalWarehouseStock DECIMAL(19,6) '$.totalWarehouseStock',RecurringDemand DECIMAL(19,6) '$.recurringDemand',SafetyStock DECIMAL(19,6) '$.safetyStock',ReorderPoint DECIMAL(19,6) '$.reorderPoint',RawShortage DECIMAL(19,6) '$.rawShortage',CalculatedRecommendationQuantity DECIMAL(19,6) '$.calculatedRecommendationQuantity',FinalRecommendationQuantity DECIMAL(19,6) '$.finalRecommendationQuantity',BoxCount DECIMAL(19,6) '$.boxCount',CalculationExplanation NVARCHAR(4000) '$.calculationExplanation'
        );
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT ItemId,WarehouseId,ChannelItemMappingId FROM @Lines GROUP BY ItemId,WarehouseId,ChannelItemMappingId HAVING COUNT(*)>1) BEGIN SELECT 400 StatusCode,N'Dispatch calculation lines are empty or contain duplicate Item/Warehouse/SKU combinations.' Message; RETURN; END;
        BEGIN TRAN;
        INSERT dbo.DispatchCompanyStockSnapshots(PlanningRunId,ItemId,AvailableQuantity,ReservedForOtherOperations,AllocatableQuantity,SourceType,SourceReference,CapturedBy)
        SELECT @RunId,l.ItemId,i.CurrentStock,COALESCE(i.ReservedStock,0),CASE WHEN i.CurrentStock-COALESCE(i.ReservedStock,0)<0 THEN 0 ELSE i.CurrentStock-COALESCE(i.ReservedStock,0) END,1,N'Items.CurrentStock less Items.ReservedStock',@UserId
        FROM (SELECT DISTINCT ItemId FROM @Lines) l JOIN dbo.Items i ON i.Id=l.ItemId
        WHERE NOT EXISTS(SELECT 1 FROM dbo.DispatchCompanyStockSnapshots s WHERE s.PlanningRunId=@RunId AND s.ItemId=l.ItemId);
        DELETE FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@RunId;
        INSERT dbo.DispatchRecommendationResults(PlanningRunId,ItemId,WarehouseId,ChannelItemMappingId,DispatchSkuSettingId,PackagingProfileId,Tier,AllocationPriority,UnitsPerBox,RoundingMode,AllowLooseQuantity,SalesQuantity,CurrentSellableQuantity,EligibleInboundQuantity,TotalWarehouseStock,RecurringDemand,SafetyStock,ReorderPoint,RawShortage,CalculatedRecommendationQuantity,FinalRecommendationQuantity,BoxCount,CalculationExplanation)
        SELECT @RunId,ItemId,WarehouseId,ChannelItemMappingId,DispatchSkuSettingId,PackagingProfileId,Tier,AllocationPriority,UnitsPerBox,RoundingMode,AllowLooseQuantity,SalesQuantity,CurrentSellableQuantity,EligibleInboundQuantity,TotalWarehouseStock,RecurringDemand,SafetyStock,ReorderPoint,RawShortage,CalculatedRecommendationQuantity,FinalRecommendationQuantity,BoxCount,CalculationExplanation FROM @Lines;
        UPDATE dbo.DispatchPlanningRuns SET Status=2,CalculationVersion=N'dispatch-planning-v1',CalculatedAtUtc=SYSUTCDATETIME(),CalculatedBy=@UserId,AllocatedAtUtc=NULL,AllocatedBy=NULL,AllocationNotes=NULL WHERE Id=@RunId;
        COMMIT;
        SELECT 200 StatusCode,N'Dispatch Planning run calculated.' Message; EXEC dbo.usp_DispatchPlanning_Run_Get @RunId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'A duplicate Dispatch Planning calculation result was detected.' Message;
        ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;
    END CATCH
END;
GO
