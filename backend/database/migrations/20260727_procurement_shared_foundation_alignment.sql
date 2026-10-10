/*
    COSMOS ERP - Procurement Planning shared-foundation alignment
    Prerequisites:
      20260715_procurement_planning_module.sql
      20260727_supply_chain_common_foundation.sql
    No purchase order, bill, stock movement, supplier balance, or accounting entry is created by this migration.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.ProcurementInboundStockSnapshots',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementInboundStockSnapshots
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementInboundStockSnapshots PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        SnapshotDate DATE NOT NULL,
        InboundQuantity DECIMAL(19,6) NOT NULL,
        Reference NVARCHAR(100) NULL,
        Notes NVARCHAR(1000) NULL,
        IsValid BIT NOT NULL CONSTRAINT DF_ProcurementInboundStockSnapshots_IsValid DEFAULT(1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ProcurementInboundStockSnapshots_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProcurementInboundStockSnapshots_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_ProcurementInboundStockSnapshots_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT CK_ProcurementInboundStockSnapshots_Quantity CHECK(InboundQuantity>=0)
    );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_ProcurementInboundStockSnapshots_ItemDateReference' AND object_id=OBJECT_ID(N'dbo.ProcurementInboundStockSnapshots'))
    CREATE UNIQUE INDEX UX_ProcurementInboundStockSnapshots_ItemDateReference ON dbo.ProcurementInboundStockSnapshots(ItemId,SnapshotDate,Reference) WHERE IsDeleted=0 AND Reference IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_ProcurementInboundStockSnapshots_Latest' AND object_id=OBJECT_ID(N'dbo.ProcurementInboundStockSnapshots'))
    CREATE INDEX IX_ProcurementInboundStockSnapshots_Latest ON dbo.ProcurementInboundStockSnapshots(ItemId,SnapshotDate DESC,CreatedAtUtc DESC) INCLUDE(InboundQuantity,IsValid,IsDeleted);
GO

IF COL_LENGTH(N'dbo.ProcurementPlanningRunLines',N'InboundStock') IS NULL
    ALTER TABLE dbo.ProcurementPlanningRunLines ADD InboundStock DECIMAL(19,6) NOT NULL CONSTRAINT DF_ProcurementPlanningRunLines_InboundStock DEFAULT(0);
GO

IF COL_LENGTH(N'dbo.ProcurementPlanningRunLines',N'ProjectedAvailableStock') IS NULL
    ALTER TABLE dbo.ProcurementPlanningRunLines ADD ProjectedAvailableStock DECIMAL(19,6) NULL;
GO

/* These statements intentionally run in a later batch. SQL Server otherwise validates the
   new column references before the conditional ALTER TABLE above has executed. */
IF COL_LENGTH(N'dbo.ProcurementPlanningRunLines',N'ProjectedAvailableStock') IS NOT NULL
BEGIN
    UPDATE dbo.ProcurementPlanningRunLines SET ProjectedAvailableStock=PhysicalStock WHERE ProjectedAvailableStock IS NULL;
    IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ProcurementPlanningRunLines') AND name=N'ProjectedAvailableStock' AND is_nullable=1)
        ALTER TABLE dbo.ProcurementPlanningRunLines ALTER COLUMN ProjectedAvailableStock DECIMAL(19,6) NOT NULL;
END;
GO
IF COL_LENGTH(N'dbo.ProcurementPlanningRuns',N'CancelledAtUtc') IS NULL ALTER TABLE dbo.ProcurementPlanningRuns ADD CancelledAtUtc DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.ProcurementPlanningRuns',N'CancelledBy') IS NULL ALTER TABLE dbo.ProcurementPlanningRuns ADD CancelledBy BIGINT NULL;
IF COL_LENGTH(N'dbo.ProcurementPlanningRuns',N'CancellationReason') IS NULL ALTER TABLE dbo.ProcurementPlanningRuns ADD CancellationReason NVARCHAR(1000) NULL;
GO

IF OBJECT_ID(N'dbo.CK_ProcurementPlanningRuns_Status',N'C') IS NOT NULL ALTER TABLE dbo.ProcurementPlanningRuns DROP CONSTRAINT CK_ProcurementPlanningRuns_Status;
ALTER TABLE dbo.ProcurementPlanningRuns ADD CONSTRAINT CK_ProcurementPlanningRuns_Status CHECK(Status IN(1,2,3,4,5));
GO

/* New procedures use usp_ prefix. The legacy sp_ calculation procedures are retained as compatibility endpoints. */
CREATE OR ALTER PROCEDURE dbo.usp_ProcurementInboundSnapshot_Save
 @ItemId BIGINT,@SnapshotDate DATE,@InboundQuantity DECIMAL(19,6),@Reference NVARCHAR(100)=NULL,@Notes NVARCHAR(1000)=NULL,@IsValid BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Item is invalid or inactive.' Message;RETURN;END;
 IF @InboundQuantity<0 BEGIN SELECT 400 StatusCode,N'Inbound quantity cannot be negative.' Message;RETURN;END;
 INSERT dbo.ProcurementInboundStockSnapshots(ItemId,SnapshotDate,InboundQuantity,Reference,Notes,IsValid,CreatedBy) VALUES(@ItemId,@SnapshotDate,@InboundQuantity,@Reference,@Notes,@IsValid,@UserId);
 SELECT 201 StatusCode,N'Inbound stock snapshot saved.' Message;SELECT SCOPE_IDENTITY() Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_CalculationInputs @FromDate DATE,@ToDate DATE AS
BEGIN
 SET NOCOUNT ON;
 WITH ProductSales AS
 (
  SELECT s.ItemId,SUM(s.Quantity) Quantity FROM dbo.ProcurementSalesHistory s
  WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NOT NULL GROUP BY s.ItemId
 )
 SELECT p.ItemId,i.ItemCode,i.Name ItemName,i.IsActive,i.ProcurementClassification,p.Quantity FROM ProductSales p JOIN dbo.Items i ON i.Id=p.ItemId;

 WITH ProductSales AS
 (
  SELECT s.ItemId,SUM(s.Quantity) Quantity FROM dbo.ProcurementSalesHistory s
  WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NOT NULL GROUP BY s.ItemId
 )
 SELECT b.FinishedProductItemId,b.ComponentItemId,ci.ItemCode ComponentItemCode,ci.Name ComponentItemName,ci.IsActive ComponentIsActive,
        ci.ProcurementClassification,b.UnitId,u.Name UnitName,u.ShortName UnitShortName,b.QuantityRequired,ci.TrackInventory,ci.CurrentStock,
        ps.Id SettingId,ps.ConfiguredLeadTimeDays,ps.LeadTimeOverrideDays,history.AverageHistoricalLeadTimeDays,ps.SafetyFactor,ps.MinimumOrderQuantity,
        ps.OrderMultiple,ps.AutomaticCalculationEnabled,ps.ManualPlanning,ps.RoundingRule,ps.IsActive SettingIsActive,COALESCE(inbound.InboundQuantity,0) ValidInboundQuantity
 FROM ProductSales sales JOIN dbo.ProductBomComponents b ON b.FinishedProductItemId=sales.ItemId AND b.IsDeleted=0 AND b.IsActive=1
 JOIN dbo.Items ci ON ci.Id=b.ComponentItemId JOIN dbo.Units u ON u.Id=b.UnitId
 LEFT JOIN dbo.ProcurementSettings ps ON ps.ItemId=b.ComponentItemId AND ps.IsDeleted=0
 OUTER APPLY(SELECT CAST(AVG(CAST(h.LeadTimeDays AS DECIMAL(19,6))) AS DECIMAL(9,3)) AverageHistoricalLeadTimeDays FROM dbo.ProcurementLeadTimeHistory h WHERE h.ItemId=b.ComponentItemId AND h.IsDeleted=0) history
 OUTER APPLY(SELECT TOP(1) s.InboundQuantity FROM dbo.ProcurementInboundStockSnapshots s WHERE s.ItemId=b.ComponentItemId AND s.IsDeleted=0 AND s.IsValid=1 AND s.SnapshotDate<=@ToDate ORDER BY s.SnapshotDate DESC,s.Id DESC) inbound;

 SELECT c.Code ChannelCode,s.ChannelSku,COUNT(1) OccurrenceCount FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NULL GROUP BY c.Code,s.ChannelSku;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
SELECT Id,RunNumber,FromDate,ToDate,NumberOfDays,Status,CalculatedAtUtc,CalculationVersion,InventoryBasis,Notes,CreatedAt,CreatedBy,FinalizedAt,FinalizedBy FROM dbo.ProcurementPlanningRuns WHERE Id=@Id;
SELECT Id,PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation,ModifiedAt,ModifiedBy,InboundStock,ProjectedAvailableStock FROM dbo.ProcurementPlanningRunLines WHERE PlanningRunId=@Id ORDER BY MaterialItemName,MaterialItemCode;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_RunLine_List @RunId BIGINT,@Search NVARCHAR(200)=NULL,@PurchaseOnly BIT=NULL,@HasWarnings BIT=NULL,@ManualPlanning BIT=NULL AS
BEGIN SET NOCOUNT ON;
 SELECT Id,PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation,ModifiedAt,ModifiedBy,InboundStock,ProjectedAvailableStock
 FROM dbo.ProcurementPlanningRunLines WHERE PlanningRunId=@RunId AND (@Search IS NULL OR MaterialItemCode LIKE N'%'+@Search+N'%' OR MaterialItemName LIKE N'%'+@Search+N'%') AND (@PurchaseOnly IS NULL OR @PurchaseOnly=0 OR FinalQuantity>0) AND (@HasWarnings IS NULL OR (@HasWarnings=1 AND WarningState IS NOT NULL) OR (@HasWarnings=0 AND WarningState IS NULL)) AND (@ManualPlanning IS NULL OR ManualPlanning=@ManualPlanning) ORDER BY MaterialItemName,MaterialItemCode;
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Save
 @FromDate DATE,@ToDate DATE,@NumberOfDays INT,@CalculatedAtUtc DATETIME2(3),@Notes NVARCHAR(1000)=NULL,@CalculationVersion NVARCHAR(100),@InventoryBasis NVARCHAR(300),@LinesJson NVARCHAR(MAX),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF @ToDate<@FromDate OR @NumberOfDays<>DATEDIFF(DAY,@FromDate,@ToDate)+1 BEGIN SELECT 400 StatusCode,N'Planning date range is invalid.' Message;RETURN;END;
 IF ISJSON(@LinesJson)<>1 BEGIN SELECT 400 StatusCode,N'Planning lines are invalid.' Message;RETURN;END;
 BEGIN TRAN;
 DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ProcurementPlanning';
 IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ProcurementPlanning',N'PP-',2,6);SET @Next=1;SET @Prefix=N'PP-';SET @Padding=6;END ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ProcurementPlanning';
 DECLARE @RunNumber NVARCHAR(30)=@Prefix+RIGHT(REPLICATE('0',@Padding)+CONVERT(VARCHAR(20),@Next),@Padding);INSERT dbo.ProcurementPlanningRuns(RunNumber,FromDate,ToDate,NumberOfDays,Status,CalculatedAtUtc,CalculationVersion,InventoryBasis,Notes,CreatedBy) VALUES(@RunNumber,@FromDate,@ToDate,@NumberOfDays,1,@CalculatedAtUtc,@CalculationVersion,@InventoryBasis,@Notes,@UserId);DECLARE @Id BIGINT=SCOPE_IDENTITY();
 INSERT dbo.ProcurementPlanningRunLines(PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,InboundStock,ProjectedAvailableStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation)
 SELECT @Id,materialItemId,materialItemCode,materialItemName,unitId,unitName,unitShortName,materialRequirement,averageDailyUsage,leadTimeDays,leadTimeSource,leadTimeDemand,safetyFactor,safetyStock,reorderPoint,physicalStock,inboundStock,projectedAvailableStock,shortage,minimumOrderQuantity,orderMultiple,roundingRule,automaticCalculationEnabled,manualPlanning,calculatedSuggestedQuantity,finalQuantity,adjustmentReason,warningState,calculationExplanation
 FROM OPENJSON(@LinesJson) WITH(materialItemId BIGINT '$.materialItemId',materialItemCode NVARCHAR(50) '$.materialItemCode',materialItemName NVARCHAR(200) '$.materialItemName',unitId BIGINT '$.unitId',unitName NVARCHAR(100) '$.unitName',unitShortName NVARCHAR(20) '$.unitShortName',materialRequirement DECIMAL(19,6) '$.materialRequirement',averageDailyUsage DECIMAL(19,6) '$.averageDailyUsage',leadTimeDays DECIMAL(9,3) '$.leadTimeDays',leadTimeSource NVARCHAR(50) '$.leadTimeSource',leadTimeDemand DECIMAL(19,6) '$.leadTimeDemand',safetyFactor DECIMAL(19,6) '$.safetyFactor',safetyStock DECIMAL(19,6) '$.safetyStock',reorderPoint DECIMAL(19,6) '$.reorderPoint',physicalStock DECIMAL(19,6) '$.physicalStock',inboundStock DECIMAL(19,6) '$.inboundStock',projectedAvailableStock DECIMAL(19,6) '$.projectedAvailableStock',shortage DECIMAL(19,6) '$.shortage',minimumOrderQuantity DECIMAL(19,6) '$.minimumOrderQuantity',orderMultiple DECIMAL(19,6) '$.orderMultiple',roundingRule INT '$.roundingRule',automaticCalculationEnabled BIT '$.automaticCalculationEnabled',manualPlanning BIT '$.manualPlanning',calculatedSuggestedQuantity DECIMAL(19,6) '$.calculatedSuggestedQuantity',finalQuantity DECIMAL(19,6) '$.finalQuantity',adjustmentReason NVARCHAR(1000) '$.adjustmentReason',warningState NVARCHAR(2000) '$.warningState',calculationExplanation NVARCHAR(4000) '$.calculationExplanation');
 COMMIT;SELECT 201 StatusCode,N'Planning run saved.' Message;EXEC dbo.sp_ProcurementPlanning_Run_Get @Id;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_RunLine_Update @RunId BIGINT,@LineId BIGINT,@FinalQuantity DECIMAL(19,6),@AdjustmentReason NVARCHAR(1000)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementPlanningRuns WHERE Id=@RunId AND Status IN(1,3,4)) BEGIN SELECT 409 StatusCode,N'Only a draft, calculated, or reviewed planning run may be adjusted.' Message;RETURN;END;
 DECLARE @Calculated DECIMAL(19,6)=(SELECT CalculatedSuggestedQuantity FROM dbo.ProcurementPlanningRunLines WHERE Id=@LineId AND PlanningRunId=@RunId);IF @Calculated IS NULL BEGIN SELECT 404 StatusCode,N'Planning run line was not found.' Message;RETURN;END;
 IF @FinalQuantity<>@Calculated AND NULLIF(LTRIM(RTRIM(@AdjustmentReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'Adjustment reason is required when final quantity differs from calculated quantity.' Message;RETURN;END;
 UPDATE dbo.ProcurementPlanningRunLines SET FinalQuantity=@FinalQuantity,AdjustmentReason=IIF(@FinalQuantity=@Calculated,NULL,@AdjustmentReason),ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@LineId AND PlanningRunId=@RunId;
 SELECT 200 StatusCode,N'Planning quantity updated.' Message;SELECT Id,PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation,ModifiedAt,ModifiedBy,InboundStock,ProjectedAvailableStock FROM dbo.ProcurementPlanningRunLines WHERE Id=@LineId;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Finalize @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 UPDATE dbo.ProcurementPlanningRuns SET Status=2,FinalizedAt=SYSUTCDATETIME(),FinalizedBy=@UserId WHERE Id=@Id AND Status IN(1,3,4);
 IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Planning run was not found, cancelled, or already finalized.' Message;RETURN;END;
 SELECT 200 StatusCode,N'Planning run finalized.' Message;EXEC dbo.sp_ProcurementPlanning_Run_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ProcurementPlanning_Run_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message;RETURN;END;
 UPDATE dbo.ProcurementPlanningRuns SET Status=5,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=LTRIM(RTRIM(@Reason)) WHERE Id=@Id AND Status IN(1,3,4);
 IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Only a draft, calculated, or reviewed planning run can be cancelled.' Message;RETURN;END;
 SELECT 200 StatusCode,N'Planning run cancelled.' Message;EXEC dbo.sp_ProcurementPlanning_Run_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
