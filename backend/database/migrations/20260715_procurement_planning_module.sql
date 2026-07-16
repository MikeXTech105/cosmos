/*
    COSMOS ERP - Procurement Planning Module
    Idempotent, additive migration. No Purchase Order objects are created or changed.
    Inventory source: dbo.Items.CurrentStock (global on-hand only).
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

/* Item planning classification stays separate from the existing Product/Service ItemType. */
IF COL_LENGTH(N'dbo.Items', N'ProcurementClassification') IS NULL
    ALTER TABLE dbo.Items ADD ProcurementClassification INT NULL;
GO

IF OBJECT_ID(N'dbo.CK_Items_ProcurementClassification', N'C') IS NULL
    ALTER TABLE dbo.Items ADD CONSTRAINT CK_Items_ProcurementClassification
        CHECK (ProcurementClassification IS NULL OR ProcurementClassification IN (1, 2, 3, 4));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Items_ProcurementClassification' AND object_id = OBJECT_ID(N'dbo.Items'))
    CREATE INDEX IX_Items_ProcurementClassification ON dbo.Items(ProcurementClassification, IsDeleted, IsActive);
GO

IF OBJECT_ID(N'dbo.SalesChannels', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SalesChannels
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SalesChannels PRIMARY KEY,
        Code NVARCHAR(20) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_SalesChannels_DisplayOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_SalesChannels_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_SalesChannels_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SalesChannels_IsDeleted DEFAULT (0),
        CONSTRAINT CK_SalesChannels_DisplayOrder CHECK (DisplayOrder >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_SalesChannels_Code' AND object_id = OBJECT_ID(N'dbo.SalesChannels'))
    CREATE UNIQUE INDEX UX_SalesChannels_Code ON dbo.SalesChannels(Code) WHERE IsDeleted = 0;
GO

IF OBJECT_ID(N'dbo.ChannelSkuMappings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChannelSkuMappings
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChannelSkuMappings PRIMARY KEY,
        SalesChannelId BIGINT NOT NULL,
        ChannelSku NVARCHAR(150) NOT NULL,
        ChannelProductName NVARCHAR(300) NULL,
        ItemId BIGINT NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ChannelSkuMappings_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ChannelSkuMappings_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ChannelSkuMappings_IsDeleted DEFAULT (0),
        CONSTRAINT FK_ChannelSkuMappings_Channels FOREIGN KEY (SalesChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_ChannelSkuMappings_Items FOREIGN KEY (ItemId) REFERENCES dbo.Items(Id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ChannelSkuMappings_ActiveSku' AND object_id = OBJECT_ID(N'dbo.ChannelSkuMappings'))
    CREATE UNIQUE INDEX UX_ChannelSkuMappings_ActiveSku ON dbo.ChannelSkuMappings(SalesChannelId, ChannelSku) WHERE IsDeleted = 0 AND IsActive = 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChannelSkuMappings_Item' AND object_id = OBJECT_ID(N'dbo.ChannelSkuMappings'))
    CREATE INDEX IX_ChannelSkuMappings_Item ON dbo.ChannelSkuMappings(ItemId, IsActive, IsDeleted);
GO

IF OBJECT_ID(N'dbo.ProcurementSalesImportBatches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementSalesImportBatches
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementSalesImportBatches PRIMARY KEY,
        BatchNumber NVARCHAR(30) NOT NULL,
        OriginalFileName NVARCHAR(260) NOT NULL,
        FileHash CHAR(64) NOT NULL,
        TotalRows INT NOT NULL,
        ImportedRows INT NOT NULL,
        UnmappedRows INT NOT NULL,
        Status INT NOT NULL CONSTRAINT DF_ProcurementSalesImportBatches_Status DEFAULT (1),
        CorrectionReason NVARCHAR(1000) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProcurementSalesImportBatches_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProcurementSalesImportBatches_IsDeleted DEFAULT (0),
        CONSTRAINT UQ_ProcurementSalesImportBatches_BatchNumber UNIQUE (BatchNumber),
        CONSTRAINT CK_ProcurementSalesImportBatches_Counts CHECK (TotalRows >= 0 AND ImportedRows >= 0 AND UnmappedRows >= 0 AND UnmappedRows <= ImportedRows),
        CONSTRAINT CK_ProcurementSalesImportBatches_Status CHECK (Status IN (1, 2))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProcurementSalesImportBatches_Hash' AND object_id = OBJECT_ID(N'dbo.ProcurementSalesImportBatches'))
    CREATE INDEX IX_ProcurementSalesImportBatches_Hash ON dbo.ProcurementSalesImportBatches(FileHash, Status, IsDeleted);
GO

IF OBJECT_ID(N'dbo.ProcurementSalesHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementSalesHistory
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementSalesHistory PRIMARY KEY,
        SalesDate DATE NOT NULL,
        SalesChannelId BIGINT NOT NULL,
        ChannelSku NVARCHAR(150) NOT NULL,
        ChannelProductName NVARCHAR(300) NULL,
        ItemId BIGINT NULL,
        Quantity DECIMAL(19,6) NOT NULL,
        ImportBatchId BIGINT NULL,
        SourceRowNumber INT NULL,
        SourceRowJson NVARCHAR(MAX) NULL,
        IsManual BIT NOT NULL CONSTRAINT DF_ProcurementSalesHistory_IsManual DEFAULT (0),
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProcurementSalesHistory_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProcurementSalesHistory_IsDeleted DEFAULT (0),
        CONSTRAINT FK_ProcurementSalesHistory_Channels FOREIGN KEY (SalesChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_ProcurementSalesHistory_Items FOREIGN KEY (ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_ProcurementSalesHistory_Batches FOREIGN KEY (ImportBatchId) REFERENCES dbo.ProcurementSalesImportBatches(Id),
        CONSTRAINT CK_ProcurementSalesHistory_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_ProcurementSalesHistory_Source CHECK ((IsManual = 1 AND ImportBatchId IS NULL) OR (IsManual = 0 AND ImportBatchId IS NOT NULL))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProcurementSalesHistory_PeriodItemChannel' AND object_id = OBJECT_ID(N'dbo.ProcurementSalesHistory'))
    CREATE INDEX IX_ProcurementSalesHistory_PeriodItemChannel ON dbo.ProcurementSalesHistory(SalesDate, ItemId, SalesChannelId) INCLUDE (Quantity, ChannelSku, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProcurementSalesHistory_Unmapped' AND object_id = OBJECT_ID(N'dbo.ProcurementSalesHistory'))
    CREATE INDEX IX_ProcurementSalesHistory_Unmapped ON dbo.ProcurementSalesHistory(ItemId, SalesChannelId, ChannelSku, SalesDate) WHERE IsDeleted = 0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ProcurementSalesHistory_BatchRow' AND object_id = OBJECT_ID(N'dbo.ProcurementSalesHistory'))
    CREATE UNIQUE INDEX UX_ProcurementSalesHistory_BatchRow ON dbo.ProcurementSalesHistory(ImportBatchId, SourceRowNumber) WHERE ImportBatchId IS NOT NULL AND IsDeleted = 0;
GO

IF OBJECT_ID(N'dbo.ProductBomComponents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductBomComponents
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductBomComponents PRIMARY KEY,
        FinishedProductItemId BIGINT NOT NULL,
        ComponentItemId BIGINT NOT NULL,
        QuantityRequired DECIMAL(19,6) NOT NULL,
        UnitId BIGINT NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ProductBomComponents_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProductBomComponents_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProductBomComponents_IsDeleted DEFAULT (0),
        CONSTRAINT FK_ProductBomComponents_FinishedItem FOREIGN KEY (FinishedProductItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_ProductBomComponents_ComponentItem FOREIGN KEY (ComponentItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_ProductBomComponents_Units FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id),
        CONSTRAINT CK_ProductBomComponents_NotSelf CHECK (FinishedProductItemId <> ComponentItemId),
        CONSTRAINT CK_ProductBomComponents_Quantity CHECK (QuantityRequired > 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ProductBomComponents_ActiveLine' AND object_id = OBJECT_ID(N'dbo.ProductBomComponents'))
    CREATE UNIQUE INDEX UX_ProductBomComponents_ActiveLine ON dbo.ProductBomComponents(FinishedProductItemId, ComponentItemId) WHERE IsDeleted = 0 AND IsActive = 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductBomComponents_Component' AND object_id = OBJECT_ID(N'dbo.ProductBomComponents'))
    CREATE INDEX IX_ProductBomComponents_Component ON dbo.ProductBomComponents(ComponentItemId, IsActive, IsDeleted);
GO

IF OBJECT_ID(N'dbo.ProcurementSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementSettings
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementSettings PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        ConfiguredLeadTimeDays DECIMAL(9,3) NULL,
        LeadTimeOverrideDays DECIMAL(9,3) NULL,
        SafetyFactor DECIMAL(19,6) NOT NULL,
        MinimumOrderQuantity DECIMAL(19,6) NOT NULL,
        OrderMultiple DECIMAL(19,6) NULL,
        AutomaticCalculationEnabled BIT NOT NULL CONSTRAINT DF_ProcurementSettings_Automatic DEFAULT (1),
        ManualPlanning BIT NOT NULL CONSTRAINT DF_ProcurementSettings_Manual DEFAULT (0),
        RoundingRule INT NOT NULL CONSTRAINT DF_ProcurementSettings_Rounding DEFAULT (2),
        IsActive BIT NOT NULL CONSTRAINT DF_ProcurementSettings_IsActive DEFAULT (1),
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProcurementSettings_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProcurementSettings_IsDeleted DEFAULT (0),
        CONSTRAINT FK_ProcurementSettings_Items FOREIGN KEY (ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT CK_ProcurementSettings_LeadTime CHECK ((ConfiguredLeadTimeDays IS NULL OR ConfiguredLeadTimeDays >= 0) AND (LeadTimeOverrideDays IS NULL OR LeadTimeOverrideDays >= 0)),
        CONSTRAINT CK_ProcurementSettings_Values CHECK (SafetyFactor >= 0 AND MinimumOrderQuantity >= 0 AND (OrderMultiple IS NULL OR OrderMultiple > 0)),
        CONSTRAINT CK_ProcurementSettings_Rounding CHECK (RoundingRule IN (1, 2))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ProcurementSettings_Item' AND object_id = OBJECT_ID(N'dbo.ProcurementSettings'))
    CREATE UNIQUE INDEX UX_ProcurementSettings_Item ON dbo.ProcurementSettings(ItemId) WHERE IsDeleted = 0;
GO

IF OBJECT_ID(N'dbo.ProcurementLeadTimeHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementLeadTimeHistory
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementLeadTimeHistory PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        Reference NVARCHAR(100) NULL,
        OrderedDate DATE NOT NULL,
        ReceivedDate DATE NOT NULL,
        LeadTimeDays AS DATEDIFF(DAY, OrderedDate, ReceivedDate) PERSISTED,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProcurementLeadTimeHistory_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProcurementLeadTimeHistory_IsDeleted DEFAULT (0),
        CONSTRAINT FK_ProcurementLeadTimeHistory_Items FOREIGN KEY (ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT CK_ProcurementLeadTimeHistory_Dates CHECK (ReceivedDate >= OrderedDate)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProcurementLeadTimeHistory_ItemDate' AND object_id = OBJECT_ID(N'dbo.ProcurementLeadTimeHistory'))
    CREATE INDEX IX_ProcurementLeadTimeHistory_ItemDate ON dbo.ProcurementLeadTimeHistory(ItemId, ReceivedDate DESC) INCLUDE (LeadTimeDays, IsDeleted);
GO

IF OBJECT_ID(N'dbo.ProcurementPlanningRuns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementPlanningRuns
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementPlanningRuns PRIMARY KEY,
        RunNumber NVARCHAR(30) NOT NULL,
        FromDate DATE NOT NULL,
        ToDate DATE NOT NULL,
        NumberOfDays INT NOT NULL,
        Status INT NOT NULL CONSTRAINT DF_ProcurementPlanningRuns_Status DEFAULT (1),
        CalculatedAtUtc DATETIME2(3) NOT NULL,
        CalculationVersion NVARCHAR(100) NOT NULL,
        InventoryBasis NVARCHAR(300) NOT NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProcurementPlanningRuns_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        FinalizedAt DATETIME2(3) NULL,
        FinalizedBy BIGINT NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT UQ_ProcurementPlanningRuns_RunNumber UNIQUE (RunNumber),
        CONSTRAINT CK_ProcurementPlanningRuns_Dates CHECK (ToDate >= FromDate AND NumberOfDays = DATEDIFF(DAY, FromDate, ToDate) + 1),
        CONSTRAINT CK_ProcurementPlanningRuns_Status CHECK (Status IN (1, 2))
    );
END;
GO

IF OBJECT_ID(N'dbo.ProcurementPlanningRunLines', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProcurementPlanningRunLines
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProcurementPlanningRunLines PRIMARY KEY,
        PlanningRunId BIGINT NOT NULL,
        MaterialItemId BIGINT NOT NULL,
        MaterialItemCode NVARCHAR(50) NOT NULL,
        MaterialItemName NVARCHAR(200) NOT NULL,
        UnitId BIGINT NOT NULL,
        UnitName NVARCHAR(100) NOT NULL,
        UnitShortName NVARCHAR(20) NOT NULL,
        MaterialRequirement DECIMAL(19,6) NOT NULL,
        AverageDailyUsage DECIMAL(19,6) NOT NULL,
        LeadTimeDays DECIMAL(9,3) NOT NULL,
        LeadTimeSource NVARCHAR(50) NOT NULL,
        LeadTimeDemand DECIMAL(19,6) NOT NULL,
        SafetyFactor DECIMAL(19,6) NOT NULL,
        SafetyStock DECIMAL(19,6) NOT NULL,
        ReorderPoint DECIMAL(19,6) NOT NULL,
        PhysicalStock DECIMAL(19,6) NOT NULL,
        Shortage DECIMAL(19,6) NOT NULL,
        MinimumOrderQuantity DECIMAL(19,6) NOT NULL,
        OrderMultiple DECIMAL(19,6) NULL,
        RoundingRule INT NOT NULL,
        AutomaticCalculationEnabled BIT NOT NULL,
        ManualPlanning BIT NOT NULL,
        CalculatedSuggestedQuantity DECIMAL(19,6) NOT NULL,
        FinalQuantity DECIMAL(19,6) NOT NULL,
        AdjustmentReason NVARCHAR(1000) NULL,
        WarningState NVARCHAR(2000) NULL,
        CalculationExplanation NVARCHAR(4000) NOT NULL,
        ModifiedAt DATETIME2(3) NULL,
        ModifiedBy BIGINT NULL,
        CONSTRAINT FK_ProcurementPlanningRunLines_Runs FOREIGN KEY (PlanningRunId) REFERENCES dbo.ProcurementPlanningRuns(Id),
        CONSTRAINT FK_ProcurementPlanningRunLines_Items FOREIGN KEY (MaterialItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT CK_ProcurementPlanningRunLines_Quantities CHECK (MaterialRequirement >= 0 AND AverageDailyUsage >= 0 AND LeadTimeDays >= 0 AND LeadTimeDemand >= 0 AND SafetyFactor >= 0 AND SafetyStock >= 0 AND ReorderPoint >= 0 AND PhysicalStock >= 0 AND Shortage >= 0 AND MinimumOrderQuantity >= 0 AND CalculatedSuggestedQuantity >= 0 AND FinalQuantity >= 0 AND (OrderMultiple IS NULL OR OrderMultiple > 0)),
        CONSTRAINT CK_ProcurementPlanningRunLines_Adjustment CHECK (FinalQuantity = CalculatedSuggestedQuantity OR NULLIF(LTRIM(RTRIM(AdjustmentReason)), N'') IS NOT NULL)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ProcurementPlanningRunLines_RunItem' AND object_id = OBJECT_ID(N'dbo.ProcurementPlanningRunLines'))
    CREATE UNIQUE INDEX UX_ProcurementPlanningRunLines_RunItem ON dbo.ProcurementPlanningRunLines(PlanningRunId, MaterialItemId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProcurementPlanningRuns_History' AND object_id = OBJECT_ID(N'dbo.ProcurementPlanningRuns'))
    CREATE INDEX IX_ProcurementPlanningRuns_History ON dbo.ProcurementPlanningRuns(CalculatedAtUtc DESC, Status, FromDate, ToDate);
GO

/* Configurable sales channels. INS is Instamart. */
MERGE dbo.SalesChannels AS target
USING (VALUES
    (N'AMZ', N'Amazon', 10),
    (N'BLI', N'Blinkit', 20),
    (N'INS', N'Instamart', 30)
) AS source(Code, Name, DisplayOrder)
ON target.Code = source.Code AND target.IsDeleted = 0
WHEN MATCHED THEN UPDATE SET Name = source.Name, DisplayOrder = source.DisplayOrder, IsActive = 1, ModifiedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(Code, Name, DisplayOrder, IsActive) VALUES(source.Code, source.Name, source.DisplayOrder, 1);
GO

/* Navigation uses existing page-based actions. SuperAdmin alone receives the seeded grants. */
MERGE dbo.Pages AS target
USING (VALUES (N'ProcurementPlanning', N'Procurement Planning', N'/procurement-planning', N'clipboard-list', 80))
    AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,source.SortOrder,1);
GO

DECLARE @ProcurementParentId INT = (SELECT Id FROM dbo.Pages WHERE Name = N'ProcurementPlanning');
MERGE dbo.Pages AS target
USING (VALUES
    (N'ProcurementPlanning.SalesImport', N'Sales Import', N'/procurement-planning/sales-import', N'file-up', 81),
    (N'ProcurementPlanning.SkuMapping', N'Channel SKU Mapping', N'/procurement-planning/sku-mapping', N'git-merge', 82),
    (N'ProcurementPlanning.BomMapping', N'BOM Mapping', N'/procurement-planning/bom-mapping', N'network', 83),
    (N'ProcurementPlanning.Settings', N'Procurement Settings', N'/procurement-planning/settings', N'settings', 84),
    (N'ProcurementPlanning.GeneratePlan', N'Generate Plan', N'/procurement-planning/generate', N'calculator', 85),
    (N'ProcurementPlanning.PlanningHistory', N'Planning History', N'/procurement-planning/history', N'history', 86)
) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,ParentPageId=@ProcurementParentId,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,@ProcurementParentId,source.SortOrder,1);
GO

DECLARE @SuperAdminRoleId INT = (SELECT Id FROM dbo.Roles WHERE Name = N'SuperAdmin');
IF @SuperAdminRoleId IS NOT NULL
BEGIN
    MERGE dbo.RolePermissions AS target
    USING (SELECT @SuperAdminRoleId RoleId, Id PageId FROM dbo.Pages WHERE Name LIKE N'ProcurementPlanning%') AS source
    ON target.RoleId=source.RoleId AND target.PageId=source.PageId
    WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanExport=1,CanApprove=1
    WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove)
        VALUES(source.RoleId,source.PageId,1,1,1,1,1,1);
END;
GO

/* Extend existing Item procedures without changing existing records or ItemType semantics. */
CREATE OR ALTER PROCEDURE dbo.sp_Item_GetById @Id BIGINT AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.Id,i.Name,i.ItemCode,i.Barcode,i.CategoryId,c.Name CategoryName,i.UnitId,u.Name UnitName,u.ShortName UnitShortName,
           i.ItemType,i.ProcurementClassification,i.PurchasePrice,i.SalesPrice,i.HSNCode,i.GSTRate,i.TrackInventory,
           i.OpeningStock,i.OpeningStockValue,i.CurrentStock,i.ReservedStock,i.MinimumStock,i.Description,i.ImageUrl,
           i.IsActive,i.CreatedAt,i.CreatedBy,i.ModifiedAt,i.ModifiedBy,i.IsDeleted
    FROM dbo.Items i JOIN dbo.Categories c ON c.Id=i.CategoryId JOIN dbo.Units u ON u.Id=i.UnitId
    WHERE i.Id=@Id AND i.IsDeleted=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetList
    @Search NVARCHAR(200)=NULL,@Barcode NVARCHAR(100)=NULL,@ItemCode NVARCHAR(50)=NULL,@CategoryId BIGINT=NULL,@ProcurementClassification INT=NULL,@IsActive BIT=NULL,
    @PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=N'Name',@SortDirection NVARCHAR(4)=N'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SET @SortBy=CASE WHEN @SortBy IN(N'Name',N'ItemCode',N'Barcode',N'SalesPrice',N'PurchasePrice',N'CurrentStock',N'CreatedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection=IIF(UPPER(@SortDirection)=N'DESC',N'DESC',N'ASC');
    DECLARE @Sql NVARCHAR(MAX)=N'SELECT i.Id,i.Name,i.ItemCode,i.Barcode,i.CategoryId,c.Name CategoryName,i.UnitId,u.Name UnitName,u.ShortName UnitShortName,
        i.ItemType,i.ProcurementClassification,i.SalesPrice,i.PurchasePrice,i.CurrentStock,i.ReservedStock,i.MinimumStock,i.TrackInventory,i.IsActive,i.CreatedAt,i.ModifiedAt,COUNT(1) OVER() TotalCount
        FROM dbo.Items i JOIN dbo.Categories c ON c.Id=i.CategoryId JOIN dbo.Units u ON u.Id=i.UnitId WHERE i.IsDeleted=0
        AND (@IsActive IS NULL OR i.IsActive=@IsActive) AND (@CategoryId IS NULL OR i.CategoryId=@CategoryId)
        AND (@ProcurementClassification IS NULL OR i.ProcurementClassification=@ProcurementClassification)
        AND (@BarcodePattern IS NULL OR i.Barcode LIKE @BarcodePattern) AND (@ItemCodePattern IS NULL OR i.ItemCode LIKE @ItemCodePattern)
        AND (@SearchPattern IS NULL OR i.Name LIKE @SearchPattern) ORDER BY i.'+QUOTENAME(@SortBy)+N' '+@SortDirection+N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    DECLARE @SearchPattern NVARCHAR(210)=IIF(NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Search))+N'%');
    DECLARE @BarcodePattern NVARCHAR(110)=IIF(NULLIF(LTRIM(RTRIM(@Barcode)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@Barcode))+N'%');
    DECLARE @ItemCodePattern NVARCHAR(60)=IIF(NULLIF(LTRIM(RTRIM(@ItemCode)),N'') IS NULL,NULL,N'%'+LTRIM(RTRIM(@ItemCode))+N'%');
    DECLARE @Offset INT=(@PageNumber-1)*@PageSize;
    EXEC sp_executesql @Sql,N'@SearchPattern NVARCHAR(210),@BarcodePattern NVARCHAR(110),@ItemCodePattern NVARCHAR(60),@CategoryId BIGINT,@ProcurementClassification INT,@IsActive BIT,@Offset INT,@PageSize INT',
        @SearchPattern,@BarcodePattern,@ItemCodePattern,@CategoryId,@ProcurementClassification,@IsActive,@Offset,@PageSize;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Create
    @Name NVARCHAR(200),@ItemCode NVARCHAR(50),@Barcode NVARCHAR(100)=NULL,@CategoryId BIGINT,@UnitId BIGINT,@ItemType INT,
    @ProcurementClassification INT=NULL,@PurchasePrice DECIMAL(18,2),@SalesPrice DECIMAL(18,2),@HSNCode NVARCHAR(50)=NULL,
    @GSTRate DECIMAL(5,2),@TrackInventory BIT,@OpeningStock DECIMAL(18,2),@OpeningStockValue DECIMAL(18,2),
    @CurrentStock DECIMAL(18,2),@ReservedStock DECIMAL(18,2),@MinimumStock DECIMAL(18,2),@Description NVARCHAR(1000)=NULL,
    @ImageUrl NVARCHAR(1000)=NULL,@IsActive BIT=1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS(SELECT 1 FROM dbo.Items WHERE ItemCode=LTRIM(RTRIM(@ItemCode)) AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Item code already exists.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Categories WHERE Id=@CategoryId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Category was not found.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Units WHERE Id=@UnitId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Unit was not found.' Message;RETURN;END;
        INSERT dbo.Items(Name,ItemCode,Barcode,CategoryId,UnitId,ItemType,ProcurementClassification,PurchasePrice,SalesPrice,HSNCode,GSTRate,TrackInventory,
            OpeningStock,OpeningStockValue,CurrentStock,ReservedStock,MinimumStock,Description,ImageUrl,IsActive)
        VALUES(LTRIM(RTRIM(@Name)),LTRIM(RTRIM(@ItemCode)),@Barcode,@CategoryId,@UnitId,@ItemType,@ProcurementClassification,@PurchasePrice,@SalesPrice,@HSNCode,@GSTRate,@TrackInventory,
            @OpeningStock,@OpeningStockValue,@CurrentStock,@ReservedStock,@MinimumStock,@Description,@ImageUrl,@IsActive);
        DECLARE @Id BIGINT=SCOPE_IDENTITY(); SELECT 201 StatusCode,N'Item created.' Message; EXEC dbo.sp_Item_GetById @Id;
    END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_Update
    @Id BIGINT,@Name NVARCHAR(200),@ItemCode NVARCHAR(50),@Barcode NVARCHAR(100)=NULL,@CategoryId BIGINT,@UnitId BIGINT,@ItemType INT,
    @ProcurementClassification INT=NULL,@PurchasePrice DECIMAL(18,2),@SalesPrice DECIMAL(18,2),@HSNCode NVARCHAR(50)=NULL,
    @GSTRate DECIMAL(5,2),@TrackInventory BIT,@OpeningStock DECIMAL(18,2),@OpeningStockValue DECIMAL(18,2),
    @CurrentStock DECIMAL(18,2),@ReservedStock DECIMAL(18,2),@MinimumStock DECIMAL(18,2),@Description NVARCHAR(1000)=NULL,
    @ImageUrl NVARCHAR(1000)=NULL,@IsActive BIT=1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Item was not found.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM dbo.Items WHERE ItemCode=LTRIM(RTRIM(@ItemCode)) AND Id<>@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Item code already exists.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Categories WHERE Id=@CategoryId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Category was not found.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Units WHERE Id=@UnitId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Unit was not found.' Message;RETURN;END;
        UPDATE dbo.Items SET Name=LTRIM(RTRIM(@Name)),ItemCode=LTRIM(RTRIM(@ItemCode)),Barcode=@Barcode,CategoryId=@CategoryId,UnitId=@UnitId,ItemType=@ItemType,
            ProcurementClassification=@ProcurementClassification,PurchasePrice=@PurchasePrice,SalesPrice=@SalesPrice,HSNCode=@HSNCode,GSTRate=@GSTRate,
            TrackInventory=@TrackInventory,OpeningStock=@OpeningStock,OpeningStockValue=@OpeningStockValue,CurrentStock=@CurrentStock,ReservedStock=@ReservedStock,
            MinimumStock=@MinimumStock,Description=@Description,ImageUrl=@ImageUrl,IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME()
        WHERE Id=@Id AND IsDeleted=0;
        SELECT 200 StatusCode,N'Item updated.' Message; EXEC dbo.sp_Item_GetById @Id;
    END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;
GO

/* Sales channel and channel-SKU configuration */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Channel_List
    @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20
AS
BEGIN
    SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SELECT Id,Code,Name,DisplayOrder,IsActive,CreatedAt,CreatedBy,ModifiedAt,ModifiedBy,COUNT(1) OVER() TotalCount
    FROM dbo.SalesChannels WHERE IsDeleted=0 AND (@IsActive IS NULL OR IsActive=@IsActive)
      AND (@Search IS NULL OR Code LIKE N'%'+@Search+N'%' OR Name LIKE N'%'+@Search+N'%')
    ORDER BY DisplayOrder,Name OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Channel_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;SELECT Id,Code,Name,DisplayOrder,IsActive,CreatedAt,CreatedBy,ModifiedAt,ModifiedBy FROM dbo.SalesChannels WHERE Id=@Id AND IsDeleted=0;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Channel_Save
    @Id BIGINT=NULL,@Code NVARCHAR(20),@Name NVARCHAR(100),@DisplayOrder INT,@IsActive BIT,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;BEGIN TRY
        SET @Code=UPPER(LTRIM(RTRIM(@Code)));SET @Name=LTRIM(RTRIM(@Name));
        IF EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Code=@Code AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'Sales channel code already exists.' Message;RETURN;END;
        IF @Id IS NULL BEGIN INSERT dbo.SalesChannels(Code,Name,DisplayOrder,IsActive,CreatedBy) VALUES(@Code,@Name,@DisplayOrder,@IsActive,@UserId);SET @Id=SCOPE_IDENTITY();END
        ELSE BEGIN UPDATE dbo.SalesChannels SET Code=@Code,Name=@Name,DisplayOrder=@DisplayOrder,IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
            IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Sales channel was not found.' Message;RETURN;END;END;
        SELECT IIF(@@TRANCOUNT=0,200,200) StatusCode,N'Sales channel saved.' Message;EXEC dbo.sp_ProcurementPlanning_Channel_Get @Id;
    END TRY BEGIN CATCH IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'Sales channel code already exists.' Message;ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Channel_SetStatus @Id BIGINT,@IsActive BIT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;UPDATE dbo.SalesChannels SET IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Sales channel was not found.',N'Sales channel status updated.') Message;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_SkuMapping_List
    @Search NVARCHAR(300)=NULL,@SalesChannelId BIGINT=NULL,@ItemId BIGINT=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20
AS
BEGIN
    SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
    SELECT m.Id,m.SalesChannelId,c.Code ChannelCode,c.Name ChannelName,m.ChannelSku,m.ChannelProductName,m.ItemId,i.ItemCode,i.Name ItemName,
           i.ProcurementClassification,m.IsActive,m.CreatedAt,m.CreatedBy,m.ModifiedAt,m.ModifiedBy,COUNT(1) OVER() TotalCount
    FROM dbo.ChannelSkuMappings m JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId JOIN dbo.Items i ON i.Id=m.ItemId
    WHERE m.IsDeleted=0 AND (@SalesChannelId IS NULL OR m.SalesChannelId=@SalesChannelId) AND (@ItemId IS NULL OR m.ItemId=@ItemId)
      AND (@IsActive IS NULL OR m.IsActive=@IsActive) AND (@Search IS NULL OR m.ChannelSku LIKE N'%'+@Search+N'%' OR m.ChannelProductName LIKE N'%'+@Search+N'%' OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%')
    ORDER BY c.DisplayOrder,m.ChannelSku OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_SkuMapping_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;SELECT m.Id,m.SalesChannelId,c.Code ChannelCode,c.Name ChannelName,m.ChannelSku,m.ChannelProductName,m.ItemId,i.ItemCode,i.Name ItemName,
 i.ProcurementClassification,m.IsActive,m.CreatedAt,m.CreatedBy,m.ModifiedAt,m.ModifiedBy FROM dbo.ChannelSkuMappings m JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId JOIN dbo.Items i ON i.Id=m.ItemId WHERE m.Id=@Id AND m.IsDeleted=0;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_SkuMapping_Save
    @Id BIGINT=NULL,@SalesChannelId BIGINT,@ChannelSku NVARCHAR(150),@ChannelProductName NVARCHAR(300)=NULL,@ItemId BIGINT,@IsActive BIT,@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;BEGIN TRY
        SET @ChannelSku=LTRIM(RTRIM(@ChannelSku));
        IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@SalesChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Sales channel is invalid or inactive.' Message;RETURN;END;
        IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1 AND (ProcurementClassification IS NULL OR ProcurementClassification=1)) BEGIN SELECT 400 StatusCode,N'ERP item is invalid, inactive, or not a finished product.' Message;RETURN;END;
        IF @IsActive=1 AND EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@SalesChannelId AND ChannelSku=@ChannelSku AND IsDeleted=0 AND IsActive=1 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'An active mapping already exists for this channel SKU.' Message;RETURN;END;
        IF @Id IS NULL BEGIN INSERT dbo.ChannelSkuMappings(SalesChannelId,ChannelSku,ChannelProductName,ItemId,IsActive,CreatedBy) VALUES(@SalesChannelId,@ChannelSku,@ChannelProductName,@ItemId,@IsActive,@UserId);SET @Id=SCOPE_IDENTITY();END
        ELSE BEGIN UPDATE dbo.ChannelSkuMappings SET SalesChannelId=@SalesChannelId,ChannelSku=@ChannelSku,ChannelProductName=@ChannelProductName,ItemId=@ItemId,IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
            IF @@ROWCOUNT=0 BEGIN SELECT 404 StatusCode,N'Channel SKU mapping was not found.' Message;RETURN;END;END;
        /* Resolve previously imported unmapped rows without overwriting already mapped history. */
        IF @IsActive=1 UPDATE dbo.ProcurementSalesHistory SET ItemId=@ItemId,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE SalesChannelId=@SalesChannelId AND ChannelSku=@ChannelSku AND ItemId IS NULL AND IsDeleted=0;
        SELECT 200 StatusCode,N'Channel SKU mapping saved.' Message;EXEC dbo.sp_ProcurementPlanning_SkuMapping_Get @Id;
    END TRY BEGIN CATCH IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'An active mapping already exists for this channel SKU.' Message;ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_SkuMapping_SetStatus @Id BIGINT,@IsActive BIT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF @IsActive=1 AND EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings x JOIN dbo.ChannelSkuMappings y ON y.Id=@Id WHERE x.SalesChannelId=y.SalesChannelId AND x.ChannelSku=y.ChannelSku AND x.IsDeleted=0 AND x.IsActive=1 AND x.Id<>@Id) BEGIN SELECT 409 StatusCode,N'Another active mapping exists for this channel SKU.' Message;RETURN;END;
 UPDATE dbo.ChannelSkuMappings SET IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsDeleted=0;
 SELECT IIF(@@ROWCOUNT=0,404,200) StatusCode,IIF(@@ROWCOUNT=0,N'Channel SKU mapping was not found.',N'Channel SKU mapping status updated.') Message;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_SkuMapping_Unmapped AS
BEGIN SET NOCOUNT ON;SELECT s.SalesChannelId,c.Code ChannelCode,s.ChannelSku,MAX(s.ChannelProductName) ChannelProductName,COUNT(1) OccurrenceCount,MIN(s.SalesDate) FirstSalesDate,MAX(s.SalesDate) LastSalesDate
FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId WHERE s.IsDeleted=0 AND s.ItemId IS NULL GROUP BY s.SalesChannelId,c.Code,s.ChannelSku ORDER BY c.Code,s.ChannelSku;END;
GO

/* Sales preview lookup and transactional import */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Import_Lookup AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id SalesChannelId,c.Code,m.Id MappingId,m.ChannelSku,m.ItemId,i.ItemCode,i.Name ItemName
    FROM dbo.SalesChannels c
    LEFT JOIN dbo.ChannelSkuMappings m ON m.SalesChannelId=c.Id AND m.IsDeleted=0 AND m.IsActive=1
    LEFT JOIN dbo.Items i ON i.Id=m.ItemId AND i.IsDeleted=0 AND i.IsActive=1
    WHERE c.IsDeleted=0 AND c.IsActive=1 ORDER BY c.DisplayOrder,m.ChannelSku;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Import_FileExists @FileHash CHAR(64) AS
BEGIN SET NOCOUNT ON;SELECT CAST(IIF(EXISTS(SELECT 1 FROM dbo.ProcurementSalesImportBatches WHERE FileHash=@FileHash AND Status=1 AND IsDeleted=0),1,0) AS BIT);END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Import_Confirm
    @OriginalFileName NVARCHAR(260),@FileHash CHAR(64),@AllowDuplicate BIT=0,@CorrectionReason NVARCHAR(1000)=NULL,
    @RowsJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
        IF ISJSON(@RowsJson)<>1 BEGIN SELECT 400 StatusCode,N'Import rows are invalid.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM dbo.ProcurementSalesImportBatches WHERE FileHash=@FileHash AND Status=1 AND IsDeleted=0) AND @AllowDuplicate=0 BEGIN SELECT 409 StatusCode,N'This file was already imported.' Message;RETURN;END;
        IF @AllowDuplicate=1 AND NULLIF(LTRIM(RTRIM(@CorrectionReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'Correction reason is required for an intentional duplicate import.' Message;RETURN;END;
        DECLARE @Rows TABLE(RowNumber INT PRIMARY KEY,SalesDate DATE,SalesChannelId BIGINT,ChannelSku NVARCHAR(150),ChannelProductName NVARCHAR(300),ItemId BIGINT NULL,Quantity DECIMAL(19,6),SourceRowJson NVARCHAR(MAX));
        INSERT @Rows(RowNumber,SalesDate,SalesChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,SourceRowJson)
        SELECT rowNumber,salesDate,salesChannelId,channelSku,channelProductName,itemId,quantity,sourceRowJson
        FROM OPENJSON(@RowsJson) WITH(rowNumber INT '$.rowNumber',salesDate DATE '$.salesDate',salesChannelId BIGINT '$.salesChannelId',channelSku NVARCHAR(150) '$.channelSku',channelProductName NVARCHAR(300) '$.channelProductName',itemId BIGINT '$.itemId',quantity DECIMAL(19,6) '$.quantity',sourceRowJson NVARCHAR(MAX) '$.sourceRowJson');
        IF NOT EXISTS(SELECT 1 FROM @Rows) BEGIN SELECT 400 StatusCode,N'Import contains no rows.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Rows r LEFT JOIN dbo.SalesChannels c ON c.Id=r.SalesChannelId AND c.IsDeleted=0 AND c.IsActive=1 WHERE c.Id IS NULL OR r.SalesDate IS NULL OR NULLIF(r.ChannelSku,N'') IS NULL OR r.Quantity<=0) BEGIN SELECT 400 StatusCode,N'Import rows failed server validation.' Message;RETURN;END;
        IF EXISTS(SELECT 1 FROM @Rows r JOIN dbo.Items i ON i.Id=r.ItemId WHERE r.ItemId IS NOT NULL AND (i.IsDeleted=1 OR i.IsActive=0)) BEGIN SELECT 400 StatusCode,N'Import contains an invalid or inactive item.' Message;RETURN;END;
        BEGIN TRAN;
        DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
        SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ProcurementSalesImport';
        IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ProcurementSalesImport',N'PSI-',2,6);SET @Next=1;SET @Prefix=N'PSI-';SET @Padding=6;END
        ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ProcurementSalesImport';
        DECLARE @BatchNumber NVARCHAR(30)=@Prefix+RIGHT(REPLICATE('0',@Padding)+CONVERT(VARCHAR(20),@Next),@Padding);
        DECLARE @Total INT=(SELECT COUNT(1) FROM @Rows),@Unmapped INT=(SELECT COUNT(1) FROM @Rows WHERE ItemId IS NULL);
        INSERT dbo.ProcurementSalesImportBatches(BatchNumber,OriginalFileName,FileHash,TotalRows,ImportedRows,UnmappedRows,Status,CorrectionReason,CreatedBy)
        VALUES(@BatchNumber,RIGHT(@OriginalFileName,260),@FileHash,@Total,@Total,@Unmapped,1,@CorrectionReason,@UserId);
        DECLARE @BatchId BIGINT=SCOPE_IDENTITY();
        INSERT dbo.ProcurementSalesHistory(SalesDate,SalesChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,ImportBatchId,SourceRowNumber,SourceRowJson,IsManual,CreatedBy)
        SELECT SalesDate,SalesChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,@BatchId,RowNumber,SourceRowJson,0,@UserId FROM @Rows;
        COMMIT;
        SELECT 201 StatusCode,N'Sales import completed.' Message;
        SELECT @BatchId BatchId,@BatchNumber BatchNumber,@Total ImportedRows,@Unmapped UnmappedRows,@FileHash FileHash;
    END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_ImportBatch_List @PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
SELECT Id,BatchNumber,OriginalFileName,FileHash,TotalRows,ImportedRows,UnmappedRows,Status,CorrectionReason,CreatedAt,CreatedBy,COUNT(1) OVER() TotalCount
FROM dbo.ProcurementSalesImportBatches WHERE IsDeleted=0 ORDER BY CreatedAt DESC,Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_ImportBatch_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;SELECT Id,BatchNumber,OriginalFileName,FileHash,TotalRows,ImportedRows,UnmappedRows,Status,CorrectionReason,CreatedAt,CreatedBy FROM dbo.ProcurementSalesImportBatches WHERE Id=@Id AND IsDeleted=0;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_ImportBatch_Rows @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT s.Id,s.SalesDate,s.SalesChannelId,c.Code ChannelCode,s.ChannelSku,s.ChannelProductName,s.ItemId,i.ItemCode,i.Name ItemName,s.Quantity,
        s.ImportBatchId,s.IsManual,s.Notes,s.CreatedAt,s.CreatedBy
 FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId LEFT JOIN dbo.Items i ON i.Id=s.ItemId
 WHERE s.ImportBatchId=@Id AND s.IsDeleted=0 ORDER BY s.SourceRowNumber,s.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_ImportBatch_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementSalesImportBatches WHERE Id=@Id AND Status=1 AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Only a completed, active sales import batch may be cancelled.' Message;RETURN;END;
 BEGIN TRAN;
 UPDATE dbo.ProcurementSalesHistory SET IsDeleted=1,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE ImportBatchId=@Id AND IsDeleted=0;
 UPDATE dbo.ProcurementSalesImportBatches SET Status=2,CorrectionReason=LTRIM(RTRIM(@Reason)),ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;
 COMMIT;SELECT 200 StatusCode,N'Sales import batch cancelled.' Message;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Sales_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;SELECT s.Id,s.SalesDate,s.SalesChannelId,c.Code ChannelCode,s.ChannelSku,s.ChannelProductName,s.ItemId,i.ItemCode,i.Name ItemName,s.Quantity,s.ImportBatchId,s.IsManual,s.Notes,s.CreatedAt,s.CreatedBy
FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId LEFT JOIN dbo.Items i ON i.Id=s.ItemId WHERE s.Id=@Id AND s.IsDeleted=0;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Sales_ManualSave
    @Id BIGINT=NULL,@SalesDate DATE,@SalesChannelId BIGINT,@ChannelSku NVARCHAR(150),@ChannelProductName NVARCHAR(300)=NULL,@ItemId BIGINT=NULL,@Quantity DECIMAL(19,6),@Notes NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@SalesChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Sales channel is invalid or inactive.' Message;RETURN;END;
 IF @ItemId IS NULL SELECT TOP(1) @ItemId=ItemId FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@SalesChannelId AND ChannelSku=LTRIM(RTRIM(@ChannelSku)) AND IsDeleted=0 AND IsActive=1;
 IF @ItemId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Item is invalid or inactive.' Message;RETURN;END;
 IF @Id IS NULL BEGIN INSERT dbo.ProcurementSalesHistory(SalesDate,SalesChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,IsManual,Notes,CreatedBy) VALUES(@SalesDate,@SalesChannelId,LTRIM(RTRIM(@ChannelSku)),@ChannelProductName,@ItemId,@Quantity,1,@Notes,@UserId);SET @Id=SCOPE_IDENTITY();END
 ELSE BEGIN UPDATE dbo.ProcurementSalesHistory SET SalesDate=@SalesDate,SalesChannelId=@SalesChannelId,ChannelSku=LTRIM(RTRIM(@ChannelSku)),ChannelProductName=@ChannelProductName,ItemId=@ItemId,Quantity=@Quantity,Notes=@Notes,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsManual=1 AND IsDeleted=0;
 IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Only an existing manual sales entry can be updated.' Message;RETURN;END;END;
 SELECT 200 StatusCode,N'Manual sales entry saved.' Message;EXEC dbo.sp_ProcurementPlanning_Sales_Get @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Sales_ManualDelete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;UPDATE dbo.ProcurementSalesHistory SET IsDeleted=1,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id AND IsManual=1 AND IsDeleted=0;
SELECT IIF(@@ROWCOUNT=0,409,200) StatusCode,IIF(@@ROWCOUNT=0,N'Only an existing manual sales entry can be deleted.',N'Manual sales entry deleted.') Message;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Sales_List
    @FromDate DATE=NULL,@ToDate DATE=NULL,@SalesChannelId BIGINT=NULL,@ItemId BIGINT=NULL,@ImportBatchId BIGINT=NULL,@IsMapped BIT=NULL,@PageNumber INT=1,@PageSize INT=20
AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
SELECT s.Id,s.SalesDate,s.SalesChannelId,c.Code ChannelCode,s.ChannelSku,s.ChannelProductName,s.ItemId,i.ItemCode,i.Name ItemName,s.Quantity,s.ImportBatchId,s.IsManual,s.Notes,s.CreatedAt,s.CreatedBy,COUNT(1) OVER() TotalCount
FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId LEFT JOIN dbo.Items i ON i.Id=s.ItemId WHERE s.IsDeleted=0
 AND (@FromDate IS NULL OR s.SalesDate>=@FromDate) AND (@ToDate IS NULL OR s.SalesDate<=@ToDate) AND (@SalesChannelId IS NULL OR s.SalesChannelId=@SalesChannelId)
 AND (@ItemId IS NULL OR s.ItemId=@ItemId) AND (@ImportBatchId IS NULL OR s.ImportBatchId=@ImportBatchId)
 AND (@IsMapped IS NULL OR (@IsMapped=1 AND s.ItemId IS NOT NULL) OR (@IsMapped=0 AND s.ItemId IS NULL))
ORDER BY s.SalesDate DESC,s.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Sales_SummaryChannels AS
BEGIN SET NOCOUNT ON;SELECT Id,Code,Name,DisplayOrder FROM dbo.SalesChannels WHERE IsDeleted=0 AND IsActive=1 ORDER BY DisplayOrder,Name;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Sales_Summary @FromDate DATE,@ToDate DATE AS
BEGIN SET NOCOUNT ON;SELECT s.ItemId,i.ItemCode,i.Name ItemName,s.SalesChannelId,c.Code ChannelCode,SUM(s.Quantity) Quantity
FROM dbo.ProcurementSalesHistory s JOIN dbo.Items i ON i.Id=s.ItemId JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId
WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NOT NULL GROUP BY s.ItemId,i.ItemCode,i.Name,s.SalesChannelId,c.Code ORDER BY i.Name,c.Code;END;
GO

/* BOM is replaced transactionally; previous lines are retained as inactive history. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Bom_Get @FinishedProductItemId BIGINT AS
BEGIN SET NOCOUNT ON;
SELECT i.Id FinishedProductItemId,i.ItemCode FinishedProductItemCode,i.Name FinishedProductItemName,i.ProcurementClassification FROM dbo.Items i WHERE i.Id=@FinishedProductItemId AND i.IsDeleted=0;
SELECT b.Id,b.FinishedProductItemId,b.ComponentItemId,i.ItemCode ComponentItemCode,i.Name ComponentItemName,b.UnitId,u.Name UnitName,u.ShortName UnitShortName,b.QuantityRequired,b.IsActive,b.CreatedAt,b.CreatedBy,b.ModifiedAt,b.ModifiedBy
FROM dbo.ProductBomComponents b JOIN dbo.Items i ON i.Id=b.ComponentItemId JOIN dbo.Units u ON u.Id=b.UnitId WHERE b.FinishedProductItemId=@FinishedProductItemId AND b.IsDeleted=0 AND b.IsActive=1 ORDER BY i.Name;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Bom_Save @FinishedProductItemId BIGINT,@ComponentsJson NVARCHAR(MAX),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@FinishedProductItemId AND IsDeleted=0 AND IsActive=1 AND (ProcurementClassification IS NULL OR ProcurementClassification=1)) BEGIN SELECT 400 StatusCode,N'Finished product is invalid, inactive, or incorrectly classified.' Message;RETURN;END;
 IF ISJSON(@ComponentsJson)<>1 BEGIN SELECT 400 StatusCode,N'BOM components are invalid.' Message;RETURN;END;
 DECLARE @Components TABLE(ComponentItemId BIGINT,QuantityRequired DECIMAL(19,6),UnitId BIGINT NULL,IsActive BIT);
 INSERT @Components SELECT componentItemId,quantityRequired,unitId,isActive FROM OPENJSON(@ComponentsJson) WITH(componentItemId BIGINT '$.componentItemId',quantityRequired DECIMAL(19,6) '$.quantityRequired',unitId BIGINT '$.unitId',isActive BIT '$.isActive');
 IF NOT EXISTS(SELECT 1 FROM @Components) OR EXISTS(SELECT 1 FROM @Components WHERE QuantityRequired<=0 OR ComponentItemId=@FinishedProductItemId) BEGIN SELECT 400 StatusCode,N'BOM must contain valid positive component quantities and cannot reference itself.' Message;RETURN;END;
 IF EXISTS(SELECT ComponentItemId FROM @Components WHERE IsActive=1 GROUP BY ComponentItemId HAVING COUNT(1)>1) BEGIN SELECT 409 StatusCode,N'Duplicate active BOM components are not allowed.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM @Components x LEFT JOIN dbo.Items i ON i.Id=x.ComponentItemId AND i.IsDeleted=0 AND i.IsActive=1 WHERE i.Id IS NULL OR i.ProcurementClassification=1 OR (x.UnitId IS NOT NULL AND x.UnitId<>i.UnitId)) BEGIN SELECT 400 StatusCode,N'A component is invalid, inactive, classified as a finished product, or uses an incompatible unit.' Message;RETURN;END;
 BEGIN TRAN;
 UPDATE dbo.ProductBomComponents SET IsActive=0,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE FinishedProductItemId=@FinishedProductItemId AND IsDeleted=0 AND IsActive=1;
 INSERT dbo.ProductBomComponents(FinishedProductItemId,ComponentItemId,QuantityRequired,UnitId,IsActive,CreatedBy)
 SELECT @FinishedProductItemId,x.ComponentItemId,x.QuantityRequired,COALESCE(x.UnitId,i.UnitId),x.IsActive,@UserId FROM @Components x JOIN dbo.Items i ON i.Id=x.ComponentItemId;
 COMMIT;SELECT 200 StatusCode,N'Product BOM saved.' Message;EXEC dbo.sp_ProcurementPlanning_Bom_Get @FinishedProductItemId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Bom_Issues AS
BEGIN SET NOCOUNT ON;
SELECT N'MISSING_BOM' Code,i.Id ItemId,i.ItemCode,i.Name ItemName,N'Finished product has sales history but no active BOM.' Message
FROM dbo.Items i WHERE i.IsDeleted=0 AND i.IsActive=1 AND EXISTS(SELECT 1 FROM dbo.ProcurementSalesHistory s WHERE s.ItemId=i.Id AND s.IsDeleted=0)
 AND NOT EXISTS(SELECT 1 FROM dbo.ProductBomComponents b WHERE b.FinishedProductItemId=i.Id AND b.IsDeleted=0 AND b.IsActive=1)
UNION ALL
SELECT N'INACTIVE_COMPONENT',i.Id,i.ItemCode,i.Name,N'An active BOM references an inactive component.' FROM dbo.ProductBomComponents b JOIN dbo.Items i ON i.Id=b.ComponentItemId
WHERE b.IsDeleted=0 AND b.IsActive=1 AND (i.IsDeleted=1 OR i.IsActive=0);
END;
GO

/* Material-level procurement settings and independent lead-time history. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Settings_GetByItem @ItemId BIGINT AS
BEGIN SET NOCOUNT ON;
SELECT s.Id,s.ItemId,i.ItemCode,i.Name ItemName,i.UnitId,u.Name UnitName,s.ConfiguredLeadTimeDays,s.LeadTimeOverrideDays,
       h.AverageHistoricalLeadTimeDays,s.SafetyFactor,s.MinimumOrderQuantity,s.OrderMultiple,s.AutomaticCalculationEnabled,s.ManualPlanning,
       s.RoundingRule,s.IsActive,s.CreatedAt,s.CreatedBy,s.ModifiedAt,s.ModifiedBy
FROM dbo.ProcurementSettings s JOIN dbo.Items i ON i.Id=s.ItemId JOIN dbo.Units u ON u.Id=i.UnitId
OUTER APPLY(SELECT CAST(AVG(CAST(LeadTimeDays AS DECIMAL(19,6))) AS DECIMAL(9,3)) AverageHistoricalLeadTimeDays FROM dbo.ProcurementLeadTimeHistory WHERE ItemId=s.ItemId AND IsDeleted=0) h
WHERE s.ItemId=@ItemId AND s.IsDeleted=0;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Settings_List
 @Search NVARCHAR(200)=NULL,@AutomaticCalculationEnabled BIT=NULL,@ManualPlanning BIT=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20
AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
SELECT s.Id,s.ItemId,i.ItemCode,i.Name ItemName,i.UnitId,u.Name UnitName,s.ConfiguredLeadTimeDays,s.LeadTimeOverrideDays,
       h.AverageHistoricalLeadTimeDays,s.SafetyFactor,s.MinimumOrderQuantity,s.OrderMultiple,s.AutomaticCalculationEnabled,s.ManualPlanning,
       s.RoundingRule,s.IsActive,s.CreatedAt,s.CreatedBy,s.ModifiedAt,s.ModifiedBy,COUNT(1) OVER() TotalCount
FROM dbo.ProcurementSettings s JOIN dbo.Items i ON i.Id=s.ItemId JOIN dbo.Units u ON u.Id=i.UnitId
OUTER APPLY(SELECT CAST(AVG(CAST(LeadTimeDays AS DECIMAL(19,6))) AS DECIMAL(9,3)) AverageHistoricalLeadTimeDays FROM dbo.ProcurementLeadTimeHistory WHERE ItemId=s.ItemId AND IsDeleted=0) h
WHERE s.IsDeleted=0 AND (@AutomaticCalculationEnabled IS NULL OR s.AutomaticCalculationEnabled=@AutomaticCalculationEnabled) AND (@ManualPlanning IS NULL OR s.ManualPlanning=@ManualPlanning)
 AND (@IsActive IS NULL OR s.IsActive=@IsActive) AND (@Search IS NULL OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%')
ORDER BY i.Name OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Settings_Save
 @ItemId BIGINT,@ConfiguredLeadTimeDays DECIMAL(9,3)=NULL,@LeadTimeOverrideDays DECIMAL(9,3)=NULL,@SafetyFactor DECIMAL(19,6),
 @MinimumOrderQuantity DECIMAL(19,6),@OrderMultiple DECIMAL(19,6)=NULL,@AutomaticCalculationEnabled BIT,@ManualPlanning BIT,@RoundingRule INT,@IsActive BIT,@UserId BIGINT=NULL
AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1 AND TrackInventory=1 AND (ProcurementClassification IS NULL OR ProcurementClassification IN(2,3,4))) BEGIN SELECT 400 StatusCode,N'Procurement settings require an active inventory material/component item.' Message;RETURN;END;
 IF @ConfiguredLeadTimeDays<0 OR @LeadTimeOverrideDays<0 OR @SafetyFactor<0 OR @MinimumOrderQuantity<0 OR (@OrderMultiple IS NOT NULL AND @OrderMultiple<=0) OR @RoundingRule NOT IN(1,2) BEGIN SELECT 400 StatusCode,N'Procurement settings contain invalid values.' Message;RETURN;END;
 DECLARE @Id BIGINT=(SELECT Id FROM dbo.ProcurementSettings WHERE ItemId=@ItemId AND IsDeleted=0);
 IF @Id IS NULL BEGIN INSERT dbo.ProcurementSettings(ItemId,ConfiguredLeadTimeDays,LeadTimeOverrideDays,SafetyFactor,MinimumOrderQuantity,OrderMultiple,AutomaticCalculationEnabled,ManualPlanning,RoundingRule,IsActive,CreatedBy)
 VALUES(@ItemId,@ConfiguredLeadTimeDays,@LeadTimeOverrideDays,@SafetyFactor,@MinimumOrderQuantity,@OrderMultiple,@AutomaticCalculationEnabled,@ManualPlanning,@RoundingRule,@IsActive,@UserId);SET @Id=SCOPE_IDENTITY();END
 ELSE UPDATE dbo.ProcurementSettings SET ConfiguredLeadTimeDays=@ConfiguredLeadTimeDays,LeadTimeOverrideDays=@LeadTimeOverrideDays,SafetyFactor=@SafetyFactor,MinimumOrderQuantity=@MinimumOrderQuantity,
 OrderMultiple=@OrderMultiple,AutomaticCalculationEnabled=@AutomaticCalculationEnabled,ManualPlanning=@ManualPlanning,RoundingRule=@RoundingRule,IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;
 SELECT 200 StatusCode,N'Procurement settings saved.' Message;EXEC dbo.sp_ProcurementPlanning_Settings_GetByItem @ItemId;
 END TRY BEGIN CATCH IF ERROR_NUMBER() IN(2601,2627) SELECT 409 StatusCode,N'Procurement settings already exist for the item.' Message;ELSE SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Settings_Missing AS
BEGIN SET NOCOUNT ON;SELECT N'MISSING_SETTINGS' Code,i.Id ItemId,i.ItemCode,i.Name ItemName,N'BOM component has no active procurement settings.' Message
FROM dbo.Items i WHERE i.IsDeleted=0 AND EXISTS(SELECT 1 FROM dbo.ProductBomComponents b WHERE b.ComponentItemId=i.Id AND b.IsDeleted=0 AND b.IsActive=1)
AND NOT EXISTS(SELECT 1 FROM dbo.ProcurementSettings s WHERE s.ItemId=i.Id AND s.IsDeleted=0 AND s.IsActive=1) ORDER BY i.Name;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_LeadTime_Add
 @ItemId BIGINT,@Reference NVARCHAR(100)=NULL,@OrderedDate DATE,@ReceivedDate DATE,@Notes NVARCHAR(1000)=NULL,@UserId BIGINT=NULL
AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF @ReceivedDate<@OrderedDate BEGIN SELECT 400 StatusCode,N'Received date cannot be before ordered date.' Message;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 404 StatusCode,N'Item was not found or is inactive.' Message;RETURN;END;
 INSERT dbo.ProcurementLeadTimeHistory(ItemId,Reference,OrderedDate,ReceivedDate,Notes,CreatedBy) VALUES(@ItemId,@Reference,@OrderedDate,@ReceivedDate,@Notes,@UserId);DECLARE @Id BIGINT=SCOPE_IDENTITY();
 SELECT 201 StatusCode,N'Lead-time history added.' Message;
 SELECT h.Id,h.ItemId,i.ItemCode,i.Name ItemName,h.Reference,h.OrderedDate,h.ReceivedDate,CAST(h.LeadTimeDays AS DECIMAL(9,3)) LeadTimeDays,h.Notes,h.CreatedAt,h.CreatedBy FROM dbo.ProcurementLeadTimeHistory h JOIN dbo.Items i ON i.Id=h.ItemId WHERE h.Id=@Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_LeadTime_List @ItemId BIGINT AS
BEGIN SET NOCOUNT ON;SELECT h.Id,h.ItemId,i.ItemCode,i.Name ItemName,h.Reference,h.OrderedDate,h.ReceivedDate,CAST(h.LeadTimeDays AS DECIMAL(9,3)) LeadTimeDays,h.Notes,h.CreatedAt,h.CreatedBy
FROM dbo.ProcurementLeadTimeHistory h JOIN dbo.Items i ON i.Id=h.ItemId WHERE h.ItemId=@ItemId AND h.IsDeleted=0 ORDER BY h.ReceivedDate DESC,h.Id DESC;END;
GO

/* One aggregated read supplies the calculation engine; no per-item/N+1 queries. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_CalculationInputs @FromDate DATE,@ToDate DATE AS
BEGIN
 SET NOCOUNT ON;
 WITH ProductSales AS
 (
  SELECT s.ItemId,SUM(s.Quantity) Quantity FROM dbo.ProcurementSalesHistory s
  WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NOT NULL GROUP BY s.ItemId
 )
 SELECT p.ItemId,i.ItemCode,i.Name ItemName,i.IsActive,i.ProcurementClassification,p.Quantity
 FROM ProductSales p JOIN dbo.Items i ON i.Id=p.ItemId;

 WITH ProductSales AS
 (
  SELECT s.ItemId,SUM(s.Quantity) Quantity FROM dbo.ProcurementSalesHistory s
  WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NOT NULL GROUP BY s.ItemId
 )
 SELECT b.FinishedProductItemId,b.ComponentItemId,ci.ItemCode ComponentItemCode,ci.Name ComponentItemName,ci.IsActive ComponentIsActive,
        ci.ProcurementClassification,b.UnitId,u.Name UnitName,u.ShortName UnitShortName,b.QuantityRequired,ci.TrackInventory,ci.CurrentStock,
        ps.Id SettingId,ps.ConfiguredLeadTimeDays,ps.LeadTimeOverrideDays,history.AverageHistoricalLeadTimeDays,ps.SafetyFactor,ps.MinimumOrderQuantity,
        ps.OrderMultiple,ps.AutomaticCalculationEnabled,ps.ManualPlanning,ps.RoundingRule,ps.IsActive SettingIsActive
 FROM ProductSales sales JOIN dbo.ProductBomComponents b ON b.FinishedProductItemId=sales.ItemId AND b.IsDeleted=0 AND b.IsActive=1
 JOIN dbo.Items ci ON ci.Id=b.ComponentItemId JOIN dbo.Units u ON u.Id=b.UnitId
 LEFT JOIN dbo.ProcurementSettings ps ON ps.ItemId=b.ComponentItemId AND ps.IsDeleted=0
 OUTER APPLY(SELECT CAST(AVG(CAST(h.LeadTimeDays AS DECIMAL(19,6))) AS DECIMAL(9,3)) AverageHistoricalLeadTimeDays FROM dbo.ProcurementLeadTimeHistory h WHERE h.ItemId=b.ComponentItemId AND h.IsDeleted=0) history;

 SELECT c.Code ChannelCode,s.ChannelSku,COUNT(1) OccurrenceCount FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId
 WHERE s.IsDeleted=0 AND s.SalesDate BETWEEN @FromDate AND @ToDate AND s.ItemId IS NULL GROUP BY c.Code,s.ChannelSku;
END;
GO

/* Snapshot queries shared by save/get/finalize. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
SELECT Id,RunNumber,FromDate,ToDate,NumberOfDays,Status,CalculatedAtUtc,CalculationVersion,InventoryBasis,Notes,CreatedAt,CreatedBy,FinalizedAt,FinalizedBy FROM dbo.ProcurementPlanningRuns WHERE Id=@Id;
SELECT Id,PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,
 LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,
 CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation,ModifiedAt,ModifiedBy
FROM dbo.ProcurementPlanningRunLines WHERE PlanningRunId=@Id ORDER BY MaterialItemName,MaterialItemCode;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Save
 @FromDate DATE,@ToDate DATE,@NumberOfDays INT,@CalculatedAtUtc DATETIME2(3),@Notes NVARCHAR(1000)=NULL,@CalculationVersion NVARCHAR(100),@InventoryBasis NVARCHAR(300),@LinesJson NVARCHAR(MAX),@UserId BIGINT=NULL
AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF @ToDate<@FromDate OR @NumberOfDays<>DATEDIFF(DAY,@FromDate,@ToDate)+1 BEGIN SELECT 400 StatusCode,N'Planning date range is invalid.' Message;RETURN;END;
 IF ISJSON(@LinesJson)<>1 BEGIN SELECT 400 StatusCode,N'Planning lines are invalid.' Message;RETURN;END;
 BEGIN TRAN;
 DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
 SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ProcurementPlanning';
 IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ProcurementPlanning',N'PP-',2,6);SET @Next=1;SET @Prefix=N'PP-';SET @Padding=6;END
 ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ProcurementPlanning';
 DECLARE @RunNumber NVARCHAR(30)=@Prefix+RIGHT(REPLICATE('0',@Padding)+CONVERT(VARCHAR(20),@Next),@Padding);
 INSERT dbo.ProcurementPlanningRuns(RunNumber,FromDate,ToDate,NumberOfDays,Status,CalculatedAtUtc,CalculationVersion,InventoryBasis,Notes,CreatedBy)
 VALUES(@RunNumber,@FromDate,@ToDate,@NumberOfDays,1,@CalculatedAtUtc,@CalculationVersion,@InventoryBasis,@Notes,@UserId);DECLARE @Id BIGINT=SCOPE_IDENTITY();
 INSERT dbo.ProcurementPlanningRunLines(PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,
  LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation)
 SELECT @Id,materialItemId,materialItemCode,materialItemName,unitId,unitName,unitShortName,materialRequirement,averageDailyUsage,leadTimeDays,leadTimeSource,leadTimeDemand,safetyFactor,safetyStock,reorderPoint,
  physicalStock,shortage,minimumOrderQuantity,orderMultiple,roundingRule,automaticCalculationEnabled,manualPlanning,calculatedSuggestedQuantity,finalQuantity,adjustmentReason,warningState,calculationExplanation
 FROM OPENJSON(@LinesJson) WITH(materialItemId BIGINT '$.materialItemId',materialItemCode NVARCHAR(50) '$.materialItemCode',materialItemName NVARCHAR(200) '$.materialItemName',unitId BIGINT '$.unitId',unitName NVARCHAR(100) '$.unitName',unitShortName NVARCHAR(20) '$.unitShortName',
  materialRequirement DECIMAL(19,6) '$.materialRequirement',averageDailyUsage DECIMAL(19,6) '$.averageDailyUsage',leadTimeDays DECIMAL(9,3) '$.leadTimeDays',leadTimeSource NVARCHAR(50) '$.leadTimeSource',leadTimeDemand DECIMAL(19,6) '$.leadTimeDemand',safetyFactor DECIMAL(19,6) '$.safetyFactor',
  safetyStock DECIMAL(19,6) '$.safetyStock',reorderPoint DECIMAL(19,6) '$.reorderPoint',physicalStock DECIMAL(19,6) '$.physicalStock',shortage DECIMAL(19,6) '$.shortage',minimumOrderQuantity DECIMAL(19,6) '$.minimumOrderQuantity',orderMultiple DECIMAL(19,6) '$.orderMultiple',roundingRule INT '$.roundingRule',
  automaticCalculationEnabled BIT '$.automaticCalculationEnabled',manualPlanning BIT '$.manualPlanning',calculatedSuggestedQuantity DECIMAL(19,6) '$.calculatedSuggestedQuantity',finalQuantity DECIMAL(19,6) '$.finalQuantity',adjustmentReason NVARCHAR(1000) '$.adjustmentReason',warningState NVARCHAR(2000) '$.warningState',calculationExplanation NVARCHAR(4000) '$.calculationExplanation');
 COMMIT;SELECT 201 StatusCode,N'Planning run saved.' Message;EXEC dbo.sp_ProcurementPlanning_Run_Get @Id;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_List @FromDate DATE=NULL,@ToDate DATE=NULL,@Status INT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
SELECT r.Id,r.RunNumber,r.FromDate,r.ToDate,r.NumberOfDays,r.Status,r.CalculatedAtUtc,r.CreatedAt,r.CreatedBy,u.FullName CreatedByName,r.Notes,
 COUNT(l.Id) LineCount,SUM(CASE WHEN l.FinalQuantity>0 THEN 1 ELSE 0 END) PurchaseLineCount,COUNT(1) OVER() TotalCount
FROM dbo.ProcurementPlanningRuns r LEFT JOIN dbo.ProcurementPlanningRunLines l ON l.PlanningRunId=r.Id LEFT JOIN dbo.Users u ON u.Id=r.CreatedBy
WHERE (@FromDate IS NULL OR r.ToDate>=@FromDate) AND (@ToDate IS NULL OR r.FromDate<=@ToDate) AND (@Status IS NULL OR r.Status=@Status)
GROUP BY r.Id,r.RunNumber,r.FromDate,r.ToDate,r.NumberOfDays,r.Status,r.CalculatedAtUtc,r.CreatedAt,r.CreatedBy,u.FullName,r.Notes
ORDER BY r.CalculatedAtUtc DESC,r.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_RunLine_List
    @RunId BIGINT,@Search NVARCHAR(200)=NULL,@PurchaseOnly BIT=NULL,@HasWarnings BIT=NULL,@ManualPlanning BIT=NULL
AS
BEGIN SET NOCOUNT ON;
 SELECT Id,PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,
  LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,
  CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation,ModifiedAt,ModifiedBy
 FROM dbo.ProcurementPlanningRunLines
 WHERE PlanningRunId=@RunId
  AND (@Search IS NULL OR MaterialItemCode LIKE N'%'+@Search+N'%' OR MaterialItemName LIKE N'%'+@Search+N'%')
  AND (@PurchaseOnly IS NULL OR @PurchaseOnly=0 OR FinalQuantity>0)
  AND (@HasWarnings IS NULL OR (@HasWarnings=1 AND WarningState IS NOT NULL) OR (@HasWarnings=0 AND WarningState IS NULL))
  AND (@ManualPlanning IS NULL OR ManualPlanning=@ManualPlanning)
 ORDER BY MaterialItemName,MaterialItemCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_RunLine_Update @RunId BIGINT,@LineId BIGINT,@FinalQuantity DECIMAL(19,6),@AdjustmentReason NVARCHAR(1000)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.ProcurementPlanningRuns WHERE Id=@RunId AND Status=1) BEGIN SELECT 409 StatusCode,N'Only a draft planning run may be adjusted.' Message;RETURN;END;
 DECLARE @Calculated DECIMAL(19,6)=(SELECT CalculatedSuggestedQuantity FROM dbo.ProcurementPlanningRunLines WHERE Id=@LineId AND PlanningRunId=@RunId);
 IF @Calculated IS NULL BEGIN SELECT 404 StatusCode,N'Planning run line was not found.' Message;RETURN;END;
 IF @FinalQuantity<>@Calculated AND NULLIF(LTRIM(RTRIM(@AdjustmentReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'Adjustment reason is required when final quantity differs from calculated quantity.' Message;RETURN;END;
 UPDATE dbo.ProcurementPlanningRunLines SET FinalQuantity=@FinalQuantity,AdjustmentReason=IIF(@FinalQuantity=@Calculated,NULL,@AdjustmentReason),ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@LineId AND PlanningRunId=@RunId;
 SELECT 200 StatusCode,N'Planning quantity updated.' Message;
 SELECT Id,PlanningRunId,MaterialItemId,MaterialItemCode,MaterialItemName,UnitId,UnitName,UnitShortName,MaterialRequirement,AverageDailyUsage,LeadTimeDays,LeadTimeSource,LeadTimeDemand,SafetyFactor,SafetyStock,ReorderPoint,PhysicalStock,Shortage,MinimumOrderQuantity,OrderMultiple,RoundingRule,AutomaticCalculationEnabled,ManualPlanning,CalculatedSuggestedQuantity,FinalQuantity,AdjustmentReason,WarningState,CalculationExplanation,ModifiedAt,ModifiedBy
 FROM dbo.ProcurementPlanningRunLines WHERE Id=@LineId;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Run_Finalize @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 UPDATE dbo.ProcurementPlanningRuns SET Status=2,FinalizedAt=SYSUTCDATETIME(),FinalizedBy=@UserId WHERE Id=@Id AND Status=1;
 IF @@ROWCOUNT=0 BEGIN SELECT 409 StatusCode,N'Planning run was not found or is already finalized.' Message;RETURN;END;
 SELECT 200 StatusCode,N'Planning run finalized.' Message;EXEC dbo.sp_ProcurementPlanning_Run_Get @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

/* Verification queries (read-only) */
SELECT N'ProcurementPlanning.Tables' CheckName,COUNT(1) ActualCount
FROM sys.tables WHERE name IN(N'SalesChannels',N'ChannelSkuMappings',N'ProcurementSalesImportBatches',N'ProcurementSalesHistory',N'ProductBomComponents',N'ProcurementSettings',N'ProcurementLeadTimeHistory',N'ProcurementPlanningRuns',N'ProcurementPlanningRunLines');
SELECT N'ProcurementPlanning.Channels' CheckName,COUNT(1) ActualCount FROM dbo.SalesChannels WHERE Code IN(N'AMZ',N'BLI',N'INS') AND IsDeleted=0;
GO
