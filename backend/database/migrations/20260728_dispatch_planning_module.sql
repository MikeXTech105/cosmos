/*
 COSMOS ERP - Dispatch Planning
 Prerequisites: 20260715_procurement_planning_module.sql,
 20260727_supply_chain_common_foundation.sql, and
 20260727_procurement_shared_foundation_alignment.sql.
 This migration is additive and rerunnable. It deliberately reuses Items,
 SalesChannels, ChannelWarehouses, ChannelSkuMappings, ItemPackagingProfiles,
 SupplyChainImportBatches, and the existing audit/permission infrastructure.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.DispatchSkuSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchSkuSettings
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchSkuSettings PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        ChannelId BIGINT NULL,
        PackagingProfileId BIGINT NULL,
        Tier INT NOT NULL,
        SafetyStockFactor DECIMAL(19,6) NOT NULL,
        RecurringDemandFactor DECIMAL(19,6) NOT NULL,
        MinimumDispatchQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_DispatchSkuSettings_MinimumDispatchQuantity DEFAULT(0),
        AllowLooseQuantity BIT NOT NULL CONSTRAINT DF_DispatchSkuSettings_AllowLooseQuantity DEFAULT(0),
        RoundingMode INT NOT NULL,
        AllocationPriority INT NOT NULL CONSTRAINT DF_DispatchSkuSettings_AllocationPriority DEFAULT(0),
        IsActive BIT NOT NULL CONSTRAINT DF_DispatchSkuSettings_IsActive DEFAULT(1),
        EffectiveFrom DATE NULL,
        EffectiveTo DATE NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchSkuSettings_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_DispatchSkuSettings_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_DispatchSkuSettings_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_DispatchSkuSettings_Channels FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_DispatchSkuSettings_Packaging FOREIGN KEY(PackagingProfileId) REFERENCES dbo.ItemPackagingProfiles(Id),
        CONSTRAINT CK_DispatchSkuSettings_Values CHECK(Tier IN(1,2,3) AND SafetyStockFactor>0 AND RecurringDemandFactor>0 AND MinimumDispatchQuantity>=0 AND RoundingMode IN(1,2,3,4,5,6) AND AllocationPriority>=0),
        CONSTRAINT CK_DispatchSkuSettings_EffectiveDates CHECK(EffectiveTo IS NULL OR EffectiveFrom IS NULL OR EffectiveTo>=EffectiveFrom)
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchImportStagedRows', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchImportStagedRows
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchImportStagedRows PRIMARY KEY,
        ImportBatchId BIGINT NOT NULL,
        RowNumber INT NOT NULL,
        WarehouseId BIGINT NULL,
        ChannelSku NVARCHAR(150) NULL,
        ChannelItemMappingId BIGINT NULL,
        ItemId BIGINT NULL,
        PeriodFrom DATE NULL,
        PeriodTo DATE NULL,
        SnapshotDate DATE NULL,
        SalesQuantity DECIMAL(19,6) NULL,
        AvailableQuantity DECIMAL(19,6) NULL,
        ReservedQuantity DECIMAL(19,6) NULL,
        DamagedQuantity DECIMAL(19,6) NULL,
        InboundQuantity DECIMAL(19,6) NULL,
        ExpectedArrivalDate DATE NULL,
        InboundStatus INT NULL,
        ReferenceNumber NVARCHAR(100) NULL,
        SourceReference NVARCHAR(500) NULL,
        IsDuplicate BIT NOT NULL CONSTRAINT DF_DispatchImportStagedRows_IsDuplicate DEFAULT(0),
        IsValid BIT NOT NULL CONSTRAINT DF_DispatchImportStagedRows_IsValid DEFAULT(0),
        ValidationField NVARCHAR(100) NULL,
        ValidationMessage NVARCHAR(1000) NULL,
        SourceRowJson NVARCHAR(MAX) NULL,
        CONSTRAINT FK_DispatchImportStagedRows_Batch FOREIGN KEY(ImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_DispatchImportStagedRows_Warehouse FOREIGN KEY(WarehouseId) REFERENCES dbo.ChannelWarehouses(Id),
        CONSTRAINT FK_DispatchImportStagedRows_Mapping FOREIGN KEY(ChannelItemMappingId) REFERENCES dbo.ChannelSkuMappings(Id),
        CONSTRAINT FK_DispatchImportStagedRows_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT UQ_DispatchImportStagedRows_BatchRow UNIQUE(ImportBatchId,RowNumber)
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchWarehouseSalesSnapshots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchWarehouseSalesSnapshots
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchWarehouseSalesSnapshots PRIMARY KEY,
        ImportBatchId BIGINT NOT NULL,
        ChannelId BIGINT NOT NULL,
        WarehouseId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        ChannelItemMappingId BIGINT NOT NULL,
        PeriodFrom DATE NOT NULL,
        PeriodTo DATE NOT NULL,
        SalesQuantity DECIMAL(19,6) NOT NULL,
        SourceReference NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchWarehouseSalesSnapshots_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_DispatchWarehouseSalesSnapshots_Batch FOREIGN KEY(ImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_DispatchWarehouseSalesSnapshots_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_DispatchWarehouseSalesSnapshots_Warehouse FOREIGN KEY(WarehouseId) REFERENCES dbo.ChannelWarehouses(Id),
        CONSTRAINT FK_DispatchWarehouseSalesSnapshots_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_DispatchWarehouseSalesSnapshots_Mapping FOREIGN KEY(ChannelItemMappingId) REFERENCES dbo.ChannelSkuMappings(Id),
        CONSTRAINT CK_DispatchWarehouseSalesSnapshots_Values CHECK(SalesQuantity>=0 AND PeriodTo>=PeriodFrom),
        CONSTRAINT UQ_DispatchWarehouseSalesSnapshots_BatchWarehouseItemPeriod UNIQUE(ImportBatchId,WarehouseId,ItemId,PeriodFrom,PeriodTo)
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchWarehouseStockSnapshots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchWarehouseStockSnapshots
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchWarehouseStockSnapshots PRIMARY KEY,
        ImportBatchId BIGINT NOT NULL,
        ChannelId BIGINT NOT NULL,
        WarehouseId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        ChannelItemMappingId BIGINT NOT NULL,
        SnapshotDate DATE NOT NULL,
        AvailableQuantity DECIMAL(19,6) NOT NULL,
        ReservedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_DispatchWarehouseStockSnapshots_ReservedQuantity DEFAULT(0),
        DamagedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_DispatchWarehouseStockSnapshots_DamagedQuantity DEFAULT(0),
        SellableQuantity AS (CASE WHEN AvailableQuantity-ReservedQuantity-DamagedQuantity<0 THEN CONVERT(DECIMAL(19,6),0) ELSE AvailableQuantity-ReservedQuantity-DamagedQuantity END) PERSISTED,
        SourceReference NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchWarehouseStockSnapshots_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_DispatchWarehouseStockSnapshots_Batch FOREIGN KEY(ImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_DispatchWarehouseStockSnapshots_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_DispatchWarehouseStockSnapshots_Warehouse FOREIGN KEY(WarehouseId) REFERENCES dbo.ChannelWarehouses(Id),
        CONSTRAINT FK_DispatchWarehouseStockSnapshots_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_DispatchWarehouseStockSnapshots_Mapping FOREIGN KEY(ChannelItemMappingId) REFERENCES dbo.ChannelSkuMappings(Id),
        CONSTRAINT CK_DispatchWarehouseStockSnapshots_Values CHECK(AvailableQuantity>=0 AND ReservedQuantity>=0 AND DamagedQuantity>=0),
        CONSTRAINT UQ_DispatchWarehouseStockSnapshots_BatchWarehouseItemDate UNIQUE(ImportBatchId,WarehouseId,ItemId,SnapshotDate)
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchWarehouseInboundSnapshots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchWarehouseInboundSnapshots
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchWarehouseInboundSnapshots PRIMARY KEY,
        ImportBatchId BIGINT NOT NULL,
        ChannelId BIGINT NOT NULL,
        WarehouseId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        ChannelItemMappingId BIGINT NOT NULL,
        SnapshotDate DATE NOT NULL,
        InboundQuantity DECIMAL(19,6) NOT NULL,
        ExpectedArrivalDate DATE NULL,
        ReferenceNumber NVARCHAR(100) NULL,
        InboundStatus INT NOT NULL,
        SourceReference NVARCHAR(500) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchWarehouseInboundSnapshots_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_DispatchWarehouseInboundSnapshots_Batch FOREIGN KEY(ImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_DispatchWarehouseInboundSnapshots_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_DispatchWarehouseInboundSnapshots_Warehouse FOREIGN KEY(WarehouseId) REFERENCES dbo.ChannelWarehouses(Id),
        CONSTRAINT FK_DispatchWarehouseInboundSnapshots_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_DispatchWarehouseInboundSnapshots_Mapping FOREIGN KEY(ChannelItemMappingId) REFERENCES dbo.ChannelSkuMappings(Id),
        CONSTRAINT CK_DispatchWarehouseInboundSnapshots_Values CHECK(InboundQuantity>=0 AND InboundStatus IN(1,2,3,4,5))
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchPlanningRuns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchPlanningRuns
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchPlanningRuns PRIMARY KEY,
        RunNumber NVARCHAR(50) NOT NULL,
        ChannelId BIGINT NOT NULL,
        PlanningDate DATE NOT NULL,
        SalesImportBatchId BIGINT NOT NULL,
        WarehouseStockImportBatchId BIGINT NOT NULL,
        WarehouseInboundImportBatchId BIGINT NULL,
        CompanyStockSourceType INT NOT NULL,
        Status INT NOT NULL CONSTRAINT DF_DispatchPlanningRuns_Status DEFAULT(1),
        CalculationVersion NVARCHAR(100) NOT NULL CONSTRAINT DF_DispatchPlanningRuns_CalculationVersion DEFAULT(N'dispatch-planning-v1'),
        Notes NVARCHAR(1000) NULL,
        AllocationNotes NVARCHAR(1000) NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchPlanningRuns_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        CalculatedAtUtc DATETIME2(3) NULL,
        CalculatedBy BIGINT NULL,
        AllocatedAtUtc DATETIME2(3) NULL,
        AllocatedBy BIGINT NULL,
        FinalizedAtUtc DATETIME2(3) NULL,
        FinalizedBy BIGINT NULL,
        CancelledAtUtc DATETIME2(3) NULL,
        CancelledBy BIGINT NULL,
        CancellationReason NVARCHAR(1000) NULL,
        CONSTRAINT UQ_DispatchPlanningRuns_RunNumber UNIQUE(RunNumber),
        CONSTRAINT FK_DispatchPlanningRuns_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_DispatchPlanningRuns_SalesBatch FOREIGN KEY(SalesImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_DispatchPlanningRuns_StockBatch FOREIGN KEY(WarehouseStockImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_DispatchPlanningRuns_InboundBatch FOREIGN KEY(WarehouseInboundImportBatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT CK_DispatchPlanningRuns_Status CHECK(Status IN(1,2,3,4,5)),
        CONSTRAINT CK_DispatchPlanningRuns_SourceType CHECK(CompanyStockSourceType IN(1,2,3))
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchCompanyStockSnapshots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchCompanyStockSnapshots
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchCompanyStockSnapshots PRIMARY KEY,
        PlanningRunId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        AvailableQuantity DECIMAL(19,6) NOT NULL,
        ReservedForOtherOperations DECIMAL(19,6) NOT NULL CONSTRAINT DF_DispatchCompanyStockSnapshots_Reserved DEFAULT(0),
        AllocatableQuantity DECIMAL(19,6) NOT NULL,
        SourceType INT NOT NULL,
        SourceReference NVARCHAR(500) NULL,
        CapturedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchCompanyStockSnapshots_Captured DEFAULT(SYSUTCDATETIME()),
        CapturedBy BIGINT NULL,
        CONSTRAINT FK_DispatchCompanyStockSnapshots_Run FOREIGN KEY(PlanningRunId) REFERENCES dbo.DispatchPlanningRuns(Id),
        CONSTRAINT FK_DispatchCompanyStockSnapshots_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT UQ_DispatchCompanyStockSnapshots_RunItem UNIQUE(PlanningRunId,ItemId),
        CONSTRAINT CK_DispatchCompanyStockSnapshots_Values CHECK(AvailableQuantity>=0 AND ReservedForOtherOperations>=0 AND AllocatableQuantity>=0 AND AllocatableQuantity<=AvailableQuantity AND SourceType IN(1,2,3))
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchRecommendationResults', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchRecommendationResults
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchRecommendationResults PRIMARY KEY,
        PlanningRunId BIGINT NOT NULL,
        ItemId BIGINT NOT NULL,
        WarehouseId BIGINT NOT NULL,
        ChannelItemMappingId BIGINT NOT NULL,
        DispatchSkuSettingId BIGINT NOT NULL,
        PackagingProfileId BIGINT NOT NULL,
        Tier INT NOT NULL,
        AllocationPriority INT NOT NULL,
        UnitsPerBox DECIMAL(19,6) NOT NULL,
        RoundingMode INT NOT NULL,
        AllowLooseQuantity BIT NOT NULL,
        SalesQuantity DECIMAL(19,6) NOT NULL,
        CurrentSellableQuantity DECIMAL(19,6) NOT NULL,
        EligibleInboundQuantity DECIMAL(19,6) NOT NULL,
        TotalWarehouseStock DECIMAL(19,6) NOT NULL,
        RecurringDemand DECIMAL(19,6) NOT NULL,
        SafetyStock DECIMAL(19,6) NOT NULL,
        ReorderPoint DECIMAL(19,6) NOT NULL,
        RawShortage DECIMAL(19,6) NOT NULL,
        CalculatedRecommendationQuantity DECIMAL(19,6) NOT NULL,
        FinalRecommendationQuantity DECIMAL(19,6) NOT NULL,
        AllocatedQuantity DECIMAL(19,6) NOT NULL CONSTRAINT DF_DispatchRecommendationResults_Allocated DEFAULT(0),
        BoxCount DECIMAL(19,6) NOT NULL,
        OverrideReason NVARCHAR(1000) NULL,
        OverriddenAtUtc DATETIME2(3) NULL,
        OverriddenBy BIGINT NULL,
        CalculationExplanation NVARCHAR(4000) NOT NULL,
        CONSTRAINT FK_DispatchRecommendationResults_Run FOREIGN KEY(PlanningRunId) REFERENCES dbo.DispatchPlanningRuns(Id),
        CONSTRAINT FK_DispatchRecommendationResults_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_DispatchRecommendationResults_Warehouse FOREIGN KEY(WarehouseId) REFERENCES dbo.ChannelWarehouses(Id),
        CONSTRAINT FK_DispatchRecommendationResults_Mapping FOREIGN KEY(ChannelItemMappingId) REFERENCES dbo.ChannelSkuMappings(Id),
        CONSTRAINT FK_DispatchRecommendationResults_Setting FOREIGN KEY(DispatchSkuSettingId) REFERENCES dbo.DispatchSkuSettings(Id),
        CONSTRAINT FK_DispatchRecommendationResults_Packaging FOREIGN KEY(PackagingProfileId) REFERENCES dbo.ItemPackagingProfiles(Id),
        CONSTRAINT UQ_DispatchRecommendationResults_RunItemWarehouse UNIQUE(PlanningRunId,ItemId,WarehouseId),
        CONSTRAINT CK_DispatchRecommendationResults_Values CHECK(Tier IN(1,2,3) AND AllocationPriority>=0 AND UnitsPerBox>0 AND RoundingMode IN(1,2,3,4,5,6) AND SalesQuantity>=0 AND CurrentSellableQuantity>=0 AND EligibleInboundQuantity>=0 AND TotalWarehouseStock>=0 AND RecurringDemand>=0 AND SafetyStock>=0 AND ReorderPoint>=0 AND RawShortage>=0 AND CalculatedRecommendationQuantity>=0 AND FinalRecommendationQuantity>=0 AND AllocatedQuantity>=0 AND AllocatedQuantity<=FinalRecommendationQuantity AND BoxCount>=0),
        CONSTRAINT CK_DispatchRecommendationResults_Override CHECK(FinalRecommendationQuantity=CalculatedRecommendationQuantity OR NULLIF(LTRIM(RTRIM(OverrideReason)),N'') IS NOT NULL)
    );
END;
GO

IF OBJECT_ID(N'dbo.DispatchAllocations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DispatchAllocations
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DispatchAllocations PRIMARY KEY,
        PlanningRunId BIGINT NOT NULL,
        RecommendationId BIGINT NOT NULL,
        CompanyStockSnapshotId BIGINT NOT NULL,
        AllocatedQuantity DECIMAL(19,6) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_DispatchAllocations_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        CONSTRAINT FK_DispatchAllocations_Run FOREIGN KEY(PlanningRunId) REFERENCES dbo.DispatchPlanningRuns(Id),
        CONSTRAINT FK_DispatchAllocations_Recommendation FOREIGN KEY(RecommendationId) REFERENCES dbo.DispatchRecommendationResults(Id),
        CONSTRAINT FK_DispatchAllocations_Stock FOREIGN KEY(CompanyStockSnapshotId) REFERENCES dbo.DispatchCompanyStockSnapshots(Id),
        CONSTRAINT UQ_DispatchAllocations_RunRecommendation UNIQUE(PlanningRunId,RecommendationId),
        CONSTRAINT CK_DispatchAllocations_Quantity CHECK(AllocatedQuantity>=0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_DispatchSkuSettings_Lookup' AND object_id=OBJECT_ID(N'dbo.DispatchSkuSettings'))
    CREATE INDEX IX_DispatchSkuSettings_Lookup ON dbo.DispatchSkuSettings(ItemId,ChannelId,IsActive,EffectiveFrom,EffectiveTo) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_DispatchImportStagedRows_BatchValidity' AND object_id=OBJECT_ID(N'dbo.DispatchImportStagedRows'))
    CREATE INDEX IX_DispatchImportStagedRows_BatchValidity ON dbo.DispatchImportStagedRows(ImportBatchId,IsValid,IsDuplicate) INCLUDE(ItemId,WarehouseId,ChannelItemMappingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_DispatchPlanningRuns_History' AND object_id=OBJECT_ID(N'dbo.DispatchPlanningRuns'))
    CREATE INDEX IX_DispatchPlanningRuns_History ON dbo.DispatchPlanningRuns(ChannelId,Status,PlanningDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_DispatchRecommendationResults_Allocation' AND object_id=OBJECT_ID(N'dbo.DispatchRecommendationResults'))
    CREATE INDEX IX_DispatchRecommendationResults_Allocation ON dbo.DispatchRecommendationResults(PlanningRunId,ItemId,AllocationPriority,Tier,WarehouseId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_DispatchWarehouseInboundSnapshots_Reference' AND object_id=OBJECT_ID(N'dbo.DispatchWarehouseInboundSnapshots'))
    CREATE UNIQUE INDEX UX_DispatchWarehouseInboundSnapshots_Reference ON dbo.DispatchWarehouseInboundSnapshots(ImportBatchId,WarehouseId,ItemId,ReferenceNumber) WHERE ReferenceNumber IS NOT NULL;
GO

/* Permission pages are additive. The parent lets permission-driven menus render the module. */
MERGE dbo.Pages AS target
USING (VALUES (N'DispatchPlanning',N'Dispatch Planning',N'/dispatch-planning',N'truck',96)) source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,source.SortOrder,1);
GO
DECLARE @DispatchPlanningParentId INT=(SELECT Id FROM dbo.Pages WHERE Name=N'DispatchPlanning');
MERGE dbo.Pages AS target
USING (VALUES
 (N'DispatchPlanning.SkuSettings',N'Dispatch SKU Settings',N'/dispatch-planning/sku-settings',N'settings',97),
 (N'DispatchPlanning.Imports',N'Dispatch Imports',N'/dispatch-planning/imports',N'file-up',98),
 (N'DispatchPlanning.PlanningRuns',N'Dispatch Planning Runs',N'/dispatch-planning/runs',N'calculator',99),
 (N'DispatchPlanning.Allocation',N'Dispatch Allocation',N'/dispatch-planning/allocation',N'git-branch',100),
 (N'DispatchPlanning.Reports',N'Dispatch Reports',N'/dispatch-planning/reports',N'bar-chart',101)
) source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,ParentPageId=@DispatchPlanningParentId,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,@DispatchPlanningParentId,source.SortOrder,1);
GO
DECLARE @DispatchPlanningSuperAdminRoleId INT=(SELECT Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
IF @DispatchPlanningSuperAdminRoleId IS NOT NULL
MERGE dbo.RolePermissions AS target
USING (SELECT @DispatchPlanningSuperAdminRoleId RoleId,Id PageId FROM dbo.Pages WHERE Name=N'DispatchPlanning' OR Name LIKE N'DispatchPlanning.%') source
ON target.RoleId=source.RoleId AND target.PageId=source.PageId
WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanExport=1,CanApprove=1
WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(source.RoleId,source.PageId,1,1,1,1,1,1);
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_SkuSettings_Get @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id,s.ItemId,i.ItemCode,i.Name ItemName,s.ChannelId,c.Code ChannelCode,s.PackagingProfileId,p.PackagingCode,
           s.Tier,s.SafetyStockFactor,s.RecurringDemandFactor,s.MinimumDispatchQuantity,s.AllowLooseQuantity,s.RoundingMode,s.AllocationPriority,
           s.IsActive,s.EffectiveFrom,s.EffectiveTo,s.CreatedAtUtc,s.CreatedBy,s.UpdatedAtUtc,s.UpdatedBy
    FROM dbo.DispatchSkuSettings s
    JOIN dbo.Items i ON i.Id=s.ItemId
    LEFT JOIN dbo.SalesChannels c ON c.Id=s.ChannelId
    LEFT JOIN dbo.ItemPackagingProfiles p ON p.Id=s.PackagingProfileId
    WHERE s.Id=@Id AND s.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_SkuSettings_List
    @Search NVARCHAR(200)=NULL,@ItemId BIGINT=NULL,@ChannelId BIGINT=NULL,@IsActive BIT=NULL,@EffectiveOn DATE=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SELECT s.Id,s.ItemId,i.ItemCode,i.Name ItemName,s.ChannelId,c.Code ChannelCode,s.PackagingProfileId,p.PackagingCode,
           s.Tier,s.SafetyStockFactor,s.RecurringDemandFactor,s.MinimumDispatchQuantity,s.AllowLooseQuantity,s.RoundingMode,s.AllocationPriority,
           s.IsActive,s.EffectiveFrom,s.EffectiveTo,s.CreatedAtUtc,s.CreatedBy,s.UpdatedAtUtc,s.UpdatedBy,COUNT(1) OVER() TotalCount
    FROM dbo.DispatchSkuSettings s
    JOIN dbo.Items i ON i.Id=s.ItemId
    LEFT JOIN dbo.SalesChannels c ON c.Id=s.ChannelId
    LEFT JOIN dbo.ItemPackagingProfiles p ON p.Id=s.PackagingProfileId
    WHERE s.IsDeleted=0 AND (@ItemId IS NULL OR s.ItemId=@ItemId) AND (@ChannelId IS NULL OR s.ChannelId=@ChannelId)
      AND (@IsActive IS NULL OR s.IsActive=@IsActive)
      AND (@EffectiveOn IS NULL OR (COALESCE(s.EffectiveFrom,CONVERT(DATE,'19000101'))<=@EffectiveOn AND COALESCE(s.EffectiveTo,CONVERT(DATE,'99991231'))>=@EffectiveOn))
      AND (@Search IS NULL OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%' OR c.Code LIKE N'%'+@Search+N'%')
    ORDER BY i.ItemCode,CASE WHEN s.ChannelId IS NULL THEN 1 ELSE 0 END,c.Code,s.EffectiveFrom,s.Id
    OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_SkuSettings_Save
    @Id BIGINT=NULL,@ItemId BIGINT,@ChannelId BIGINT=NULL,@PackagingProfileId BIGINT=NULL,@Tier INT,@SafetyStockFactor DECIMAL(19,6),@RecurringDemandFactor DECIMAL(19,6),@MinimumDispatchQuantity DECIMAL(19,6),@AllowLooseQuantity BIT,@RoundingMode INT,@AllocationPriority INT,@IsActive BIT,@EffectiveFrom DATE=NULL,@EffectiveTo DATE=NULL,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @Tier NOT IN(1,2,3) OR @SafetyStockFactor<=0 OR @RecurringDemandFactor<=0 OR @MinimumDispatchQuantity<0 OR @RoundingMode NOT IN(1,2,3,4,5,6) OR @AllocationPriority<0 OR (@EffectiveFrom IS NOT NULL AND @EffectiveTo IS NOT NULL AND @EffectiveTo<@EffectiveFrom)
        BEGIN SELECT 400 StatusCode,N'Dispatch SKU setting contains invalid values.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1)
        BEGIN SELECT 400 StatusCode,N'Dispatch SKU setting requires an active Item.' Message; RETURN; END;
        IF @ChannelId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsDeleted=0 AND IsActive=1)
        BEGIN SELECT 400 StatusCode,N'Channel is invalid or inactive.' Message; RETURN; END;
        IF @PackagingProfileId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles WHERE Id=@PackagingProfileId AND ItemId=@ItemId AND IsDeleted=0 AND IsActive=1 AND (ChannelId IS NULL OR ChannelId=@ChannelId))
        BEGIN SELECT 400 StatusCode,N'Packaging profile must be active, belong to the Item, and match the selected Channel when channel-specific.' Message; RETURN; END;
        IF @IsActive=1 AND EXISTS
        (
            SELECT 1 FROM dbo.DispatchSkuSettings x
            WHERE x.ItemId=@ItemId AND x.IsDeleted=0 AND x.IsActive=1 AND (@Id IS NULL OR x.Id<>@Id)
              AND ((x.ChannelId IS NULL AND @ChannelId IS NULL) OR x.ChannelId=@ChannelId)
              AND COALESCE(x.EffectiveFrom,CONVERT(DATE,'19000101'))<=COALESCE(@EffectiveTo,CONVERT(DATE,'99991231'))
              AND COALESCE(x.EffectiveTo,CONVERT(DATE,'99991231'))>=COALESCE(@EffectiveFrom,CONVERT(DATE,'19000101'))
        ) BEGIN SELECT 409 StatusCode,N'An active Dispatch SKU setting already applies to this Item, Channel, and effective period.' Message; RETURN; END;
        IF @Id IS NULL
        BEGIN
            INSERT dbo.DispatchSkuSettings(ItemId,ChannelId,PackagingProfileId,Tier,SafetyStockFactor,RecurringDemandFactor,MinimumDispatchQuantity,AllowLooseQuantity,RoundingMode,AllocationPriority,IsActive,EffectiveFrom,EffectiveTo,CreatedBy)
            VALUES(@ItemId,@ChannelId,@PackagingProfileId,@Tier,@SafetyStockFactor,@RecurringDemandFactor,@MinimumDispatchQuantity,@AllowLooseQuantity,@RoundingMode,@AllocationPriority,@IsActive,@EffectiveFrom,@EffectiveTo,@UserId);
            SET @Id=SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.DispatchSkuSettings SET ItemId=@ItemId,ChannelId=@ChannelId,PackagingProfileId=@PackagingProfileId,Tier=@Tier,SafetyStockFactor=@SafetyStockFactor,RecurringDemandFactor=@RecurringDemandFactor,MinimumDispatchQuantity=@MinimumDispatchQuantity,AllowLooseQuantity=@AllowLooseQuantity,RoundingMode=@RoundingMode,AllocationPriority=@AllocationPriority,IsActive=@IsActive,EffectiveFrom=@EffectiveFrom,EffectiveTo=@EffectiveTo,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId
            WHERE Id=@Id AND IsDeleted=0;
            IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Dispatch SKU setting was not found.' Message; RETURN; END;
        END;
        SELECT 200 StatusCode,N'Dispatch SKU setting saved.' Message; EXEC dbo.usp_DispatchPlanning_SkuSettings_Get @Id;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'A conflicting Dispatch SKU setting already exists.' Message;
        ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_SkuSettings_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchSkuSettings WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Dispatch SKU setting was not found.' Message; RETURN; END;
    IF EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE DispatchSkuSettingId=@Id) BEGIN SELECT 409 StatusCode,N'Dispatch SKU setting is retained because it is referenced by planning history.' Message; RETURN; END;
    UPDATE dbo.DispatchSkuSettings SET IsDeleted=1,IsActive=0,DeletedAtUtc=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Dispatch SKU setting deleted.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Import_Validate
    @OriginalFileName NVARCHAR(260),@FileHash CHAR(64),@ImportType INT,@ChannelId BIGINT,@RowsJson NVARCHAR(MAX),@CorrelationId NVARCHAR(100)=NULL,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @ImportType NOT IN(1,2,3) OR ISJSON(@RowsJson)<>1 BEGIN SELECT 400 StatusCode,N'Dispatch import type or row payload is invalid.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Channel is invalid or inactive.' Message; RETURN; END;
        DECLARE @ImportTypeName NVARCHAR(50)=CASE @ImportType WHEN 1 THEN N'DispatchWarehouseSales' WHEN 2 THEN N'DispatchWarehouseStock' ELSE N'DispatchWarehouseInbound' END;
        DECLARE @BatchId BIGINT;
        BEGIN TRAN;
        INSERT dbo.SupplyChainImportBatches(ModuleType,ImportType,ChannelId,OriginalFileName,FileHash,Status,TotalRows,ValidRows,InvalidRows,DuplicateRows,CorrelationId,UploadedBy)
        VALUES(N'DispatchPlanning',@ImportTypeName,@ChannelId,LTRIM(RTRIM(@OriginalFileName)),@FileHash,2,0,0,0,0,@CorrelationId,@UserId);
        SET @BatchId=SCOPE_IDENTITY();

        INSERT dbo.DispatchImportStagedRows(ImportBatchId,RowNumber,WarehouseId,ChannelSku,PeriodFrom,PeriodTo,SnapshotDate,SalesQuantity,AvailableQuantity,ReservedQuantity,DamagedQuantity,InboundQuantity,ExpectedArrivalDate,InboundStatus,ReferenceNumber,SourceReference,SourceRowJson)
        SELECT @BatchId,r.RowNumber,r.WarehouseId,NULLIF(LTRIM(RTRIM(r.ChannelSku)),N''),r.PeriodFrom,r.PeriodTo,r.SnapshotDate,r.SalesQuantity,r.AvailableQuantity,COALESCE(r.ReservedQuantity,0),COALESCE(r.DamagedQuantity,0),r.InboundQuantity,r.ExpectedArrivalDate,r.InboundStatus,NULLIF(LTRIM(RTRIM(r.ReferenceNumber)),N''),NULLIF(LTRIM(RTRIM(r.SourceReference)),N''),j.value
        FROM OPENJSON(@RowsJson) j
        CROSS APPLY OPENJSON(j.value) WITH
        (
            RowNumber INT '$.rowNumber', WarehouseId BIGINT '$.warehouseId', ChannelSku NVARCHAR(150) '$.channelSku',
            PeriodFrom DATE '$.periodFrom', PeriodTo DATE '$.periodTo', SnapshotDate DATE '$.snapshotDate', SalesQuantity DECIMAL(19,6) '$.salesQuantity',
            AvailableQuantity DECIMAL(19,6) '$.availableQuantity', ReservedQuantity DECIMAL(19,6) '$.reservedQuantity', DamagedQuantity DECIMAL(19,6) '$.damagedQuantity',
            InboundQuantity DECIMAL(19,6) '$.inboundQuantity', ExpectedArrivalDate DATE '$.expectedArrivalDate', InboundStatus INT '$.inboundStatus',
            ReferenceNumber NVARCHAR(100) '$.referenceNumber', SourceReference NVARCHAR(500) '$.sourceReference'
        ) r;
        IF NOT EXISTS(SELECT 1 FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId)
        BEGIN ROLLBACK; SELECT 400 StatusCode,N'Dispatch import must contain at least one row.' Message; RETURN; END;

        UPDATE s
        SET ChannelItemMappingId=m.Id,ItemId=m.ItemId,
            ValidationField=CASE
                WHEN s.RowNumber IS NULL OR s.RowNumber<=0 THEN N'RowNumber'
                WHEN s.WarehouseId IS NULL OR w.Id IS NULL OR w.ChannelId<>@ChannelId OR w.IsDeleted=1 OR w.IsActive=0 THEN N'WarehouseId'
                WHEN s.ChannelSku IS NULL THEN N'ChannelSku'
                WHEN m.Id IS NULL THEN N'ChannelSku'
                WHEN @ImportType=1 AND (s.PeriodFrom IS NULL OR s.PeriodTo IS NULL OR s.PeriodTo<s.PeriodFrom OR s.SalesQuantity IS NULL OR s.SalesQuantity<0) THEN N'SalesSnapshot'
                WHEN @ImportType=2 AND (s.SnapshotDate IS NULL OR s.AvailableQuantity IS NULL OR s.AvailableQuantity<0 OR s.ReservedQuantity<0 OR s.DamagedQuantity<0) THEN N'StockSnapshot'
                WHEN @ImportType=3 AND (s.SnapshotDate IS NULL OR s.InboundQuantity IS NULL OR s.InboundQuantity<0 OR s.InboundStatus NOT IN(1,2,3,4,5)) THEN N'InboundSnapshot'
                ELSE NULL END,
            ValidationMessage=CASE
                WHEN s.RowNumber IS NULL OR s.RowNumber<=0 THEN N'Row number must be greater than zero.'
                WHEN s.WarehouseId IS NULL OR w.Id IS NULL OR w.ChannelId<>@ChannelId OR w.IsDeleted=1 OR w.IsActive=0 THEN N'Warehouse must be an active warehouse of the selected Channel.'
                WHEN s.ChannelSku IS NULL THEN N'Channel SKU is required.'
                WHEN m.Id IS NULL THEN N'No active Channel Item Mapping exists for this exact Channel SKU.'
                WHEN @ImportType=1 AND (s.PeriodFrom IS NULL OR s.PeriodTo IS NULL OR s.PeriodTo<s.PeriodFrom OR s.SalesQuantity IS NULL OR s.SalesQuantity<0) THEN N'Sales imports require a valid period and non-negative sales quantity.'
                WHEN @ImportType=2 AND (s.SnapshotDate IS NULL OR s.AvailableQuantity IS NULL OR s.AvailableQuantity<0 OR s.ReservedQuantity<0 OR s.DamagedQuantity<0) THEN N'Stock imports require snapshot date and non-negative available, reserved and damaged quantities.'
                WHEN @ImportType=3 AND (s.SnapshotDate IS NULL OR s.InboundQuantity IS NULL OR s.InboundQuantity<0 OR s.InboundStatus NOT IN(1,2,3,4,5)) THEN N'Inbound imports require snapshot date, quantity and a valid inbound status.'
                ELSE NULL END
        FROM dbo.DispatchImportStagedRows s
        LEFT JOIN dbo.ChannelWarehouses w ON w.Id=s.WarehouseId
        LEFT JOIN dbo.ChannelSkuMappings m ON m.SalesChannelId=@ChannelId AND m.ChannelSku=s.ChannelSku AND m.IsDeleted=0 AND m.IsActive=1
        WHERE s.ImportBatchId=@BatchId;

        ;WITH duplicates AS
        (
            SELECT Id,ROW_NUMBER() OVER(PARTITION BY WarehouseId,ChannelSku,COALESCE(PeriodFrom,SnapshotDate),COALESCE(PeriodTo,SnapshotDate),COALESCE(ReferenceNumber,N'') ORDER BY RowNumber,Id) SequenceNumber
            FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId
        )
        UPDATE s SET IsDuplicate=IIF(d.SequenceNumber>1,1,0)
        FROM dbo.DispatchImportStagedRows s JOIN duplicates d ON d.Id=s.Id;

        UPDATE dbo.DispatchImportStagedRows SET IsValid=IIF(ValidationField IS NULL,1,0) WHERE ImportBatchId=@BatchId;
        DECLARE @TotalRows INT=(SELECT COUNT(*) FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId);
        DECLARE @InvalidRows INT=(SELECT COUNT(*) FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId AND IsValid=0);
        DECLARE @DuplicateRows INT=(SELECT COUNT(*) FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId AND IsDuplicate=1);
        DECLARE @ValidRows INT=@TotalRows-@InvalidRows;
        DECLARE @UnmatchedSkuCount INT=(SELECT COUNT(*) FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId AND ValidationField=N'ChannelSku');
        UPDATE dbo.SupplyChainImportBatches
        SET Status=IIF(@InvalidRows=0,3,4),TotalRows=@TotalRows,ValidRows=@ValidRows,InvalidRows=@InvalidRows,DuplicateRows=@DuplicateRows,
            ValidationSummaryJson=CONCAT(N'{"unmatchedSkuCount":',@UnmatchedSkuCount,N',"duplicateRows":',@DuplicateRows,N'}')
        WHERE Id=@BatchId;
        INSERT dbo.SupplyChainImportRows(BatchId,RowNumber,SalesDate,ChannelCode,ChannelId,ChannelSku,ItemId,Quantity,IsDuplicate,ErrorsJson,SourceRowJson)
        SELECT s.ImportBatchId,s.RowNumber,COALESCE(s.PeriodTo,s.SnapshotDate),NULL,@ChannelId,s.ChannelSku,s.ItemId,COALESCE(s.SalesQuantity,s.AvailableQuantity,s.InboundQuantity),s.IsDuplicate,
               IIF(s.IsValid=1,NULL,CONCAT(N'{"field":"',s.ValidationField,N'","message":"',STRING_ESCAPE(s.ValidationMessage,'json'),N'"}')),s.SourceRowJson
        FROM dbo.DispatchImportStagedRows s WHERE s.ImportBatchId=@BatchId;
        COMMIT;
        SELECT 200 StatusCode,N'Dispatch snapshot import validated.' Message;
        SELECT @BatchId BatchId,@ImportTypeName ImportType,@TotalRows TotalRows,@ValidRows ValidRows,@InvalidRows InvalidRows,@DuplicateRows DuplicateRows,@UnmatchedSkuCount UnmatchedSkuCount,CONVERT(BIT,IIF(@InvalidRows=0,1,0)) CanCommit;
        SELECT RowNumber,ValidationField Field,ValidationMessage Message,ChannelSku OriginalValue FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@BatchId AND IsValid=0 ORDER BY RowNumber;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT 500 StatusCode,ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Import_Get @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT b.Id,b.ImportType,b.ChannelId,c.Code ChannelCode,b.OriginalFileName,b.FileHash,b.Status,b.TotalRows,b.ValidRows,b.InvalidRows,b.CommittedRows,b.UploadedAtUtc,b.UploadedBy,b.CommittedAtUtc,b.CommittedBy
    FROM dbo.SupplyChainImportBatches b JOIN dbo.SalesChannels c ON c.Id=b.ChannelId
    WHERE b.Id=@Id AND b.ModuleType=N'DispatchPlanning';
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Import_List
    @ImportType INT=NULL,@ChannelId BIGINT=NULL,@Status INT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    DECLARE @ImportTypeName NVARCHAR(50)=CASE @ImportType WHEN 1 THEN N'DispatchWarehouseSales' WHEN 2 THEN N'DispatchWarehouseStock' WHEN 3 THEN N'DispatchWarehouseInbound' ELSE NULL END;
    SELECT b.Id,b.ImportType,b.ChannelId,c.Code ChannelCode,b.OriginalFileName,b.FileHash,b.Status,b.TotalRows,b.ValidRows,b.InvalidRows,b.CommittedRows,b.UploadedAtUtc,b.UploadedBy,b.CommittedAtUtc,b.CommittedBy,COUNT(1) OVER() TotalCount
    FROM dbo.SupplyChainImportBatches b JOIN dbo.SalesChannels c ON c.Id=b.ChannelId
    WHERE b.ModuleType=N'DispatchPlanning' AND (@ImportTypeName IS NULL OR b.ImportType=@ImportTypeName) AND (@ChannelId IS NULL OR b.ChannelId=@ChannelId) AND (@Status IS NULL OR b.Status=@Status)
    ORDER BY b.UploadedAtUtc DESC,b.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Import_Commit
    @Id BIGINT,@AllowDuplicate BIT=0,@CorrectionReason NVARCHAR(1000)=NULL,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        DECLARE @ImportType NVARCHAR(50),@ChannelId BIGINT,@FileHash CHAR(64),@CommittedRows INT=0;
        SELECT @ImportType=ImportType,@ChannelId=ChannelId,@FileHash=FileHash FROM dbo.SupplyChainImportBatches WHERE Id=@Id AND ModuleType=N'DispatchPlanning' AND Status=3;
        IF @ImportType IS NULL BEGIN SELECT 409 StatusCode,N'Only a successfully validated Dispatch import can be committed.' Message; RETURN; END;
        IF EXISTS(SELECT 1 FROM dbo.DispatchImportStagedRows WHERE ImportBatchId=@Id AND IsValid=0) BEGIN SELECT 409 StatusCode,N'Dispatch import contains invalid rows and cannot be committed.' Message; RETURN; END;
        IF EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id<>@Id AND ModuleType=N'DispatchPlanning' AND ImportType=@ImportType AND ChannelId=@ChannelId AND FileHash=@FileHash AND Status=5) AND @AllowDuplicate=0
        BEGIN SELECT 409 StatusCode,N'This Dispatch import file has already been committed. Use AllowDuplicate with a correction reason only for an intentional correction.' Message; RETURN; END;
        IF @AllowDuplicate=1 AND NULLIF(LTRIM(RTRIM(@CorrectionReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'CorrectionReason is required when AllowDuplicate is true.' Message; RETURN; END;
        BEGIN TRAN;
        IF @ImportType=N'DispatchWarehouseSales'
        BEGIN
            INSERT dbo.DispatchWarehouseSalesSnapshots(ImportBatchId,ChannelId,WarehouseId,ItemId,ChannelItemMappingId,PeriodFrom,PeriodTo,SalesQuantity,SourceReference,CreatedBy)
            SELECT @Id,@ChannelId,s.WarehouseId,s.ItemId,s.ChannelItemMappingId,s.PeriodFrom,s.PeriodTo,s.SalesQuantity,s.SourceReference,@UserId
            FROM dbo.DispatchImportStagedRows s WHERE s.ImportBatchId=@Id AND s.IsDuplicate=0;
            SET @CommittedRows=@@ROWCOUNT;
        END
        ELSE IF @ImportType=N'DispatchWarehouseStock'
        BEGIN
            INSERT dbo.DispatchWarehouseStockSnapshots(ImportBatchId,ChannelId,WarehouseId,ItemId,ChannelItemMappingId,SnapshotDate,AvailableQuantity,ReservedQuantity,DamagedQuantity,SourceReference,CreatedBy)
            SELECT @Id,@ChannelId,s.WarehouseId,s.ItemId,s.ChannelItemMappingId,s.SnapshotDate,s.AvailableQuantity,s.ReservedQuantity,s.DamagedQuantity,s.SourceReference,@UserId
            FROM dbo.DispatchImportStagedRows s WHERE s.ImportBatchId=@Id AND s.IsDuplicate=0;
            SET @CommittedRows=@@ROWCOUNT;
        END
        ELSE
        BEGIN
            INSERT dbo.DispatchWarehouseInboundSnapshots(ImportBatchId,ChannelId,WarehouseId,ItemId,ChannelItemMappingId,SnapshotDate,InboundQuantity,ExpectedArrivalDate,ReferenceNumber,InboundStatus,SourceReference,CreatedBy)
            SELECT @Id,@ChannelId,s.WarehouseId,s.ItemId,s.ChannelItemMappingId,s.SnapshotDate,s.InboundQuantity,s.ExpectedArrivalDate,s.ReferenceNumber,s.InboundStatus,s.SourceReference,@UserId
            FROM dbo.DispatchImportStagedRows s WHERE s.ImportBatchId=@Id AND s.IsDuplicate=0;
            SET @CommittedRows=@@ROWCOUNT;
        END;
        UPDATE dbo.SupplyChainImportBatches SET Status=5,CommittedRows=@CommittedRows,CommittedAtUtc=SYSUTCDATETIME(),CommittedBy=@UserId,ValidationSummaryJson=COALESCE(ValidationSummaryJson,N'{}') WHERE Id=@Id;
        COMMIT;
        SELECT 200 StatusCode,N'Dispatch snapshot import committed.' Message; EXEC dbo.usp_DispatchPlanning_Import_Get @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'Dispatch snapshot import contains a duplicate committed snapshot key.' Message;
        ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Import_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message; RETURN; END;
    UPDATE dbo.SupplyChainImportBatches SET Status=6,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=LTRIM(RTRIM(@Reason))
    WHERE Id=@Id AND ModuleType=N'DispatchPlanning' AND Status IN(2,3,4);
    IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Only an uncommitted Dispatch import can be cancelled.' Message; RETURN; END;
    SELECT 200 StatusCode,N'Dispatch snapshot import cancelled.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_Get @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id,r.RunNumber,r.ChannelId,c.Code ChannelCode,r.PlanningDate,r.SalesImportBatchId,r.WarehouseStockImportBatchId,r.WarehouseInboundImportBatchId,r.CompanyStockSourceType,r.Status,r.CalculationVersion,r.Notes,r.CreatedAtUtc,r.CreatedBy,r.CalculatedAtUtc,r.CalculatedBy,r.AllocatedAtUtc,r.AllocatedBy,r.FinalizedAtUtc,r.FinalizedBy,r.CancellationReason
    FROM dbo.DispatchPlanningRuns r JOIN dbo.SalesChannels c ON c.Id=r.ChannelId WHERE r.Id=@Id;

    SELECT x.Id,x.PlanningRunId,x.ItemId,i.ItemCode,i.Name ItemName,x.WarehouseId,w.WarehouseCode,w.WarehouseName,w.Priority WarehousePriority,x.ChannelItemMappingId,m.ChannelSku,x.DispatchSkuSettingId,x.Tier,x.AllocationPriority,x.PackagingProfileId,x.UnitsPerBox,x.RoundingMode,x.AllowLooseQuantity,
           x.SalesQuantity,x.CurrentSellableQuantity,x.EligibleInboundQuantity,x.TotalWarehouseStock,x.RecurringDemand,x.SafetyStock,x.ReorderPoint,x.RawShortage,x.CalculatedRecommendationQuantity,x.FinalRecommendationQuantity,x.AllocatedQuantity,x.BoxCount,x.OverrideReason,x.OverriddenAtUtc,x.OverriddenBy,x.CalculationExplanation
    FROM dbo.DispatchRecommendationResults x
    JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.ChannelWarehouses w ON w.Id=x.WarehouseId JOIN dbo.ChannelSkuMappings m ON m.Id=x.ChannelItemMappingId
    WHERE x.PlanningRunId=@Id ORDER BY x.AllocationPriority,x.Tier,w.Priority,i.ItemCode,x.Id;

    SELECT s.Id,s.PlanningRunId,s.ItemId,i.ItemCode,s.AvailableQuantity,s.ReservedForOtherOperations,s.AllocatableQuantity,COALESCE(a.AllocatedQuantity,0) AllocatedQuantity,s.SourceType,s.SourceReference,s.CapturedAtUtc,s.CapturedBy
    FROM dbo.DispatchCompanyStockSnapshots s JOIN dbo.Items i ON i.Id=s.ItemId
    OUTER APPLY(SELECT SUM(AllocatedQuantity) AllocatedQuantity FROM dbo.DispatchAllocations a WHERE a.CompanyStockSnapshotId=s.Id) a
    WHERE s.PlanningRunId=@Id ORDER BY i.ItemCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_Create
    @ChannelId BIGINT,@PlanningDate DATE,@SalesImportBatchId BIGINT,@WarehouseStockImportBatchId BIGINT,@WarehouseInboundImportBatchId BIGINT=NULL,@CompanyStockSourceType INT=1,@Notes NVARCHAR(1000)=NULL,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF @CompanyStockSourceType<>1 BEGIN SELECT 400 StatusCode,N'Only the read-only system company-stock source is available in this release.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Channel is invalid or inactive.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id=@SalesImportBatchId AND ModuleType=N'DispatchPlanning' AND ImportType=N'DispatchWarehouseSales' AND ChannelId=@ChannelId AND Status=5) BEGIN SELECT 400 StatusCode,N'Sales import batch must be a committed Dispatch Warehouse Sales import for the selected Channel.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id=@WarehouseStockImportBatchId AND ModuleType=N'DispatchPlanning' AND ImportType=N'DispatchWarehouseStock' AND ChannelId=@ChannelId AND Status=5) BEGIN SELECT 400 StatusCode,N'Warehouse stock import batch must be a committed Dispatch Warehouse Stock import for the selected Channel.' Message; RETURN; END;
        IF @WarehouseInboundImportBatchId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id=@WarehouseInboundImportBatchId AND ModuleType=N'DispatchPlanning' AND ImportType=N'DispatchWarehouseInbound' AND ChannelId=@ChannelId AND Status=5) BEGIN SELECT 400 StatusCode,N'Warehouse inbound import batch must be a committed Dispatch Warehouse Inbound import for the selected Channel.' Message; RETURN; END;
        INSERT dbo.DispatchPlanningRuns(RunNumber,ChannelId,PlanningDate,SalesImportBatchId,WarehouseStockImportBatchId,WarehouseInboundImportBatchId,CompanyStockSourceType,Notes,CreatedBy)
        VALUES(N'PENDING',@ChannelId,@PlanningDate,@SalesImportBatchId,@WarehouseStockImportBatchId,@WarehouseInboundImportBatchId,@CompanyStockSourceType,NULLIF(LTRIM(RTRIM(@Notes)),N''),@UserId);
        DECLARE @Id BIGINT=SCOPE_IDENTITY();
        UPDATE dbo.DispatchPlanningRuns SET RunNumber=CONCAT(N'DPR-',CONVERT(CHAR(8),@PlanningDate,112),N'-',RIGHT(CONCAT(N'000000',CONVERT(NVARCHAR(20),@Id)),6)) WHERE Id=@Id;
        SELECT 201 StatusCode,N'Dispatch Planning draft created.' Message; EXEC dbo.usp_DispatchPlanning_Run_Get @Id;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'Dispatch Planning run number already exists.' Message;
        ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;
    END CATCH
END;
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
        SELECT WarehouseId,ItemId,SUM(InboundQuantity) EligibleInboundQuantity
        FROM dbo.DispatchWarehouseInboundSnapshots WHERE ImportBatchId=@InboundBatch AND InboundStatus IN(2,3) GROUP BY WarehouseId,ItemId
    )
    SELECT sa.ItemId,i.ItemCode,i.Name ItemName,sa.WarehouseId,w.WarehouseCode,w.WarehouseName,w.Priority WarehousePriority,sa.ChannelItemMappingId,m.ChannelSku,
           ds.Id DispatchSkuSettingId,ds.Tier,ds.AllocationPriority,pp.Id PackagingProfileId,pp.UnitsPerBox,ds.RoundingMode,ds.AllowLooseQuantity,ds.SafetyStockFactor,ds.RecurringDemandFactor,ds.MinimumDispatchQuantity,
           sa.SalesQuantity,st.SellableQuantity CurrentSellableQuantity,COALESCE(ib.EligibleInboundQuantity,0) EligibleInboundQuantity
    FROM Sales sa
    JOIN Stock st ON st.WarehouseId=sa.WarehouseId AND st.ItemId=sa.ItemId AND st.ChannelItemMappingId=sa.ChannelItemMappingId
    JOIN dbo.Items i ON i.Id=sa.ItemId AND i.IsDeleted=0 AND i.IsActive=1
    JOIN dbo.ChannelWarehouses w ON w.Id=sa.WarehouseId AND w.ChannelId=@ChannelId AND w.IsDeleted=0 AND w.IsActive=1
    JOIN dbo.ChannelSkuMappings m ON m.Id=sa.ChannelItemMappingId AND m.SalesChannelId=@ChannelId AND m.ItemId=sa.ItemId AND m.IsDeleted=0 AND m.IsActive=1
    LEFT JOIN Inbound ib ON ib.WarehouseId=sa.WarehouseId AND ib.ItemId=sa.ItemId
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
    ORDER BY ds.AllocationPriority,ds.Tier,w.Priority,i.ItemCode;
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
        IF NOT EXISTS(SELECT 1 FROM @Lines) OR EXISTS(SELECT ItemId,WarehouseId FROM @Lines GROUP BY ItemId,WarehouseId HAVING COUNT(*)>1) BEGIN SELECT 400 StatusCode,N'Dispatch calculation lines are empty or contain duplicate Item/Warehouse combinations.' Message; RETURN; END;
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

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_List
    @ChannelId BIGINT=NULL,@Status INT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SELECT r.Id,r.RunNumber,r.ChannelId,c.Code ChannelCode,r.PlanningDate,r.Status,r.CreatedAtUtc,r.CreatedBy,r.CalculatedAtUtc,r.AllocatedAtUtc,r.FinalizedAtUtc,
           COALESCE(x.LineCount,0) LineCount,COALESCE(x.TotalRecommendedQuantity,0) TotalRecommendedQuantity,COALESCE(x.TotalAllocatedQuantity,0) TotalAllocatedQuantity,COUNT(1) OVER() TotalCount
    FROM dbo.DispatchPlanningRuns r JOIN dbo.SalesChannels c ON c.Id=r.ChannelId
    OUTER APPLY(SELECT COUNT(*) LineCount,SUM(FinalRecommendationQuantity) TotalRecommendedQuantity,SUM(AllocatedQuantity) TotalAllocatedQuantity FROM dbo.DispatchRecommendationResults x WHERE x.PlanningRunId=r.Id) x
    WHERE (@ChannelId IS NULL OR r.ChannelId=@ChannelId) AND (@Status IS NULL OR r.Status=@Status) AND (@FromDate IS NULL OR r.PlanningDate>=@FromDate) AND (@ToDate IS NULL OR r.PlanningDate<=@ToDate)
    ORDER BY r.PlanningDate DESC,r.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Recommendation_List
    @RunId BIGINT,@Search NVARCHAR(200)=NULL,@WarehouseId BIGINT=NULL,@ItemId BIGINT=NULL,@Tier INT=NULL,@AllocatedOnly BIT=NULL AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId) THROW 50002,N'Dispatch Planning run was not found.',1;
    SELECT x.Id,x.PlanningRunId,x.ItemId,i.ItemCode,i.Name ItemName,x.WarehouseId,w.WarehouseCode,w.WarehouseName,w.Priority WarehousePriority,x.ChannelItemMappingId,m.ChannelSku,x.DispatchSkuSettingId,x.Tier,x.AllocationPriority,x.PackagingProfileId,x.UnitsPerBox,x.RoundingMode,x.AllowLooseQuantity,
           x.SalesQuantity,x.CurrentSellableQuantity,x.EligibleInboundQuantity,x.TotalWarehouseStock,x.RecurringDemand,x.SafetyStock,x.ReorderPoint,x.RawShortage,x.CalculatedRecommendationQuantity,x.FinalRecommendationQuantity,x.AllocatedQuantity,x.BoxCount,x.OverrideReason,x.OverriddenAtUtc,x.OverriddenBy,x.CalculationExplanation
    FROM dbo.DispatchRecommendationResults x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.ChannelWarehouses w ON w.Id=x.WarehouseId JOIN dbo.ChannelSkuMappings m ON m.Id=x.ChannelItemMappingId
    WHERE x.PlanningRunId=@RunId AND (@WarehouseId IS NULL OR x.WarehouseId=@WarehouseId) AND (@ItemId IS NULL OR x.ItemId=@ItemId) AND (@Tier IS NULL OR x.Tier=@Tier)
      AND (@AllocatedOnly IS NULL OR (@AllocatedOnly=1 AND x.AllocatedQuantity>0) OR (@AllocatedOnly=0 AND x.AllocatedQuantity=0))
      AND (@Search IS NULL OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%' OR w.WarehouseCode LIKE N'%'+@Search+N'%' OR m.ChannelSku LIKE N'%'+@Search+N'%')
    ORDER BY x.AllocationPriority,x.Tier,w.Priority,i.ItemCode,x.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Recommendation_Override
    @RunId BIGINT,@RecommendationId BIGINT,@FinalRecommendationQuantity DECIMAL(19,6),@OverrideReason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    IF @FinalRecommendationQuantity<0 OR NULLIF(LTRIM(RTRIM(@OverrideReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'Override quantity must be non-negative and an override reason is required.' Message; RETURN; END;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@RunId AND Status=2) BEGIN SELECT 409 StatusCode,N'Recommendations can only be overridden while the run is Calculated and before allocation.' Message; RETURN; END;
    UPDATE dbo.DispatchRecommendationResults SET FinalRecommendationQuantity=@FinalRecommendationQuantity,BoxCount=CASE WHEN UnitsPerBox=0 THEN 0 ELSE @FinalRecommendationQuantity/UnitsPerBox END,OverrideReason=LTRIM(RTRIM(@OverrideReason)),OverriddenAtUtc=SYSUTCDATETIME(),OverriddenBy=@UserId
    WHERE Id=@RecommendationId AND PlanningRunId=@RunId;
    IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Dispatch recommendation was not found.' Message; RETURN; END;
    SELECT 200 StatusCode,N'Dispatch recommendation override saved.' Message;
    SELECT x.Id,x.PlanningRunId,x.ItemId,i.ItemCode,i.Name ItemName,x.WarehouseId,w.WarehouseCode,w.WarehouseName,w.Priority WarehousePriority,x.ChannelItemMappingId,m.ChannelSku,x.DispatchSkuSettingId,x.Tier,x.AllocationPriority,x.PackagingProfileId,x.UnitsPerBox,x.RoundingMode,x.AllowLooseQuantity,
           x.SalesQuantity,x.CurrentSellableQuantity,x.EligibleInboundQuantity,x.TotalWarehouseStock,x.RecurringDemand,x.SafetyStock,x.ReorderPoint,x.RawShortage,x.CalculatedRecommendationQuantity,x.FinalRecommendationQuantity,x.AllocatedQuantity,x.BoxCount,x.OverrideReason,x.OverriddenAtUtc,x.OverriddenBy,x.CalculationExplanation
    FROM dbo.DispatchRecommendationResults x JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.ChannelWarehouses w ON w.Id=x.WarehouseId JOIN dbo.ChannelSkuMappings m ON m.Id=x.ChannelItemMappingId
    WHERE x.Id=@RecommendationId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_Allocate @Id BIGINT,@AllocationsJson NVARCHAR(MAX),@Notes NVARCHAR(1000)=NULL,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF ISJSON(@AllocationsJson)<>1 BEGIN SELECT 400 StatusCode,N'Allocation payload is invalid.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@Id AND Status=2) BEGIN SELECT 409 StatusCode,N'Only a Calculated Dispatch Planning run can be allocated.' Message; RETURN; END;
        IF NOT EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@Id) BEGIN SELECT 409 StatusCode,N'Dispatch Planning run has no recommendations to allocate.' Message; RETURN; END;
        DECLARE @Allocation TABLE(RecommendationId BIGINT,CompanyStockSnapshotId BIGINT,AllocatedQuantity DECIMAL(19,6));
        INSERT @Allocation SELECT RecommendationId,CompanyStockSnapshotId,AllocatedQuantity
        FROM OPENJSON(@AllocationsJson) WITH(RecommendationId BIGINT '$.recommendationId',CompanyStockSnapshotId BIGINT '$.companyStockSnapshotId',AllocatedQuantity DECIMAL(19,6) '$.allocatedQuantity');
        IF EXISTS(SELECT RecommendationId FROM @Allocation GROUP BY RecommendationId HAVING COUNT(*)>1) OR EXISTS(SELECT 1 FROM @Allocation WHERE RecommendationId IS NULL OR CompanyStockSnapshotId IS NULL OR AllocatedQuantity<=0)
        BEGIN SELECT 400 StatusCode,N'Allocation payload contains invalid or duplicate recommendation rows.' Message; RETURN; END;
        IF EXISTS
        (
            SELECT 1 FROM @Allocation a
            LEFT JOIN dbo.DispatchRecommendationResults r ON r.Id=a.RecommendationId AND r.PlanningRunId=@Id
            LEFT JOIN dbo.DispatchCompanyStockSnapshots s ON s.Id=a.CompanyStockSnapshotId AND s.PlanningRunId=@Id AND s.ItemId=r.ItemId
            WHERE r.Id IS NULL OR s.Id IS NULL OR a.AllocatedQuantity>r.FinalRecommendationQuantity
        ) BEGIN SELECT 409 StatusCode,N'Allocation must reference this run, match the Item stock snapshot, and not exceed the final recommendation.' Message; RETURN; END;
        IF EXISTS
        (
            SELECT 1 FROM @Allocation a JOIN dbo.DispatchCompanyStockSnapshots s ON s.Id=a.CompanyStockSnapshotId
            GROUP BY a.CompanyStockSnapshotId,s.AllocatableQuantity HAVING SUM(a.AllocatedQuantity)>s.AllocatableQuantity
        ) BEGIN SELECT 409 StatusCode,N'Allocation exceeds an immutable company stock snapshot.' Message; RETURN; END;
        BEGIN TRAN;
        DELETE FROM dbo.DispatchAllocations WHERE PlanningRunId=@Id;
        UPDATE dbo.DispatchRecommendationResults SET AllocatedQuantity=0 WHERE PlanningRunId=@Id;
        INSERT dbo.DispatchAllocations(PlanningRunId,RecommendationId,CompanyStockSnapshotId,AllocatedQuantity,CreatedBy)
        SELECT @Id,RecommendationId,CompanyStockSnapshotId,AllocatedQuantity,@UserId FROM @Allocation;
        UPDATE r SET AllocatedQuantity=a.AllocatedQuantity
        FROM dbo.DispatchRecommendationResults r JOIN @Allocation a ON a.RecommendationId=r.Id
        WHERE r.PlanningRunId=@Id;
        UPDATE dbo.DispatchPlanningRuns SET Status=3,AllocationNotes=NULLIF(LTRIM(RTRIM(@Notes)),N''),AllocatedAtUtc=SYSUTCDATETIME(),AllocatedBy=@UserId WHERE Id=@Id;
        COMMIT;
        SELECT 200 StatusCode,N'Company stock allocated without inventory mutation.' Message; EXEC dbo.usp_DispatchPlanning_Run_Get @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        SELECT 500 StatusCode,ERROR_MESSAGE() Message;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_Finalize @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Id=@Id AND Status=3) BEGIN SELECT 409 StatusCode,N'Only an Allocated Dispatch Planning run can be finalized.' Message; RETURN; END;
    IF EXISTS(SELECT 1 FROM dbo.DispatchRecommendationResults WHERE PlanningRunId=@Id AND AllocatedQuantity>FinalRecommendationQuantity) BEGIN SELECT 409 StatusCode,N'Allocation exceeds the final recommendation.' Message; RETURN; END;
    IF EXISTS(SELECT 1 FROM dbo.DispatchCompanyStockSnapshots s OUTER APPLY(SELECT SUM(AllocatedQuantity) Quantity FROM dbo.DispatchAllocations a WHERE a.CompanyStockSnapshotId=s.Id) a WHERE s.PlanningRunId=@Id AND COALESCE(a.Quantity,0)>s.AllocatableQuantity) BEGIN SELECT 409 StatusCode,N'Allocation exceeds immutable company stock snapshot.' Message; RETURN; END;
    UPDATE dbo.DispatchPlanningRuns SET Status=4,FinalizedAtUtc=SYSUTCDATETIME(),FinalizedBy=@UserId WHERE Id=@Id;
    SELECT 200 StatusCode,N'Dispatch Planning run finalized. No inventory, shipment, purchase order, or Rojmel record was created.' Message; EXEC dbo.usp_DispatchPlanning_Run_Get @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Run_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message; RETURN; END;
    UPDATE dbo.DispatchPlanningRuns SET Status=5,CancellationReason=LTRIM(RTRIM(@Reason)),CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId
    WHERE Id=@Id AND Status IN(1,2,3);
    IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Only a Draft, Calculated, or Allocated Dispatch Planning run can be cancelled; finalized runs are immutable.' Message; RETURN; END;
    SELECT 200 StatusCode,N'Dispatch Planning run cancelled.' Message; EXEC dbo.usp_DispatchPlanning_Run_Get @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DispatchPlanning_Report_Recommendations
    @ChannelId BIGINT=NULL,@WarehouseId BIGINT=NULL,@FromDate DATE=NULL,@ToDate DATE=NULL,@Status INT=4,@PageNumber INT=1,@PageSize INT=200 AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>500,500,@PageSize));
    SELECT r.RunNumber,r.PlanningDate,c.Code ChannelCode,w.WarehouseCode,w.WarehouseName,i.ItemCode,i.Name ItemName,m.ChannelSku,x.Tier,x.FinalRecommendationQuantity RecommendedQuantity,x.AllocatedQuantity,x.BoxCount,r.Status RunStatus,COUNT(1) OVER() TotalCount
    FROM dbo.DispatchPlanningRuns r JOIN dbo.SalesChannels c ON c.Id=r.ChannelId JOIN dbo.DispatchRecommendationResults x ON x.PlanningRunId=r.Id
    JOIN dbo.Items i ON i.Id=x.ItemId JOIN dbo.ChannelWarehouses w ON w.Id=x.WarehouseId JOIN dbo.ChannelSkuMappings m ON m.Id=x.ChannelItemMappingId
    WHERE (@ChannelId IS NULL OR r.ChannelId=@ChannelId) AND (@WarehouseId IS NULL OR x.WarehouseId=@WarehouseId) AND (@FromDate IS NULL OR r.PlanningDate>=@FromDate) AND (@ToDate IS NULL OR r.PlanningDate<=@ToDate) AND (@Status IS NULL OR r.Status=@Status)
    ORDER BY r.PlanningDate DESC,r.RunNumber,w.Priority,i.ItemCode OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

/* Prevent direct database edits of the operational history after finalization. */
CREATE OR ALTER TRIGGER dbo.trg_DispatchPlanningRuns_PreventFinalizedMutation ON dbo.DispatchPlanningRuns AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM deleted WHERE Status=4)
        THROW 50005,N'Finalized Dispatch Planning runs are immutable.',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_DispatchRecommendationResults_PreventFinalizedMutation ON dbo.DispatchRecommendationResults AFTER INSERT,UPDATE,DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM (SELECT PlanningRunId FROM inserted UNION SELECT PlanningRunId FROM deleted) x JOIN dbo.DispatchPlanningRuns r ON r.Id=x.PlanningRunId WHERE r.Status=4)
        THROW 50006,N'Finalized Dispatch Planning recommendations are immutable.',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_DispatchAllocations_PreventFinalizedMutation ON dbo.DispatchAllocations AFTER INSERT,UPDATE,DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM (SELECT PlanningRunId FROM inserted UNION SELECT PlanningRunId FROM deleted) x JOIN dbo.DispatchPlanningRuns r ON r.Id=x.PlanningRunId WHERE r.Status=4)
        THROW 50007,N'Finalized Dispatch Planning allocations are immutable.',1;
END;
GO
