/*
    COSMOS ERP - Supply Chain Common Foundation
    Prerequisite: 20260715_procurement_planning_module.sql.
    This migration deliberately reuses dbo.SalesChannels and dbo.ChannelSkuMappings
    as the shared Channel and Channel Item Mapping masters. It is additive and rerunnable.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

/* Extend the existing canonical channel master; do not create a duplicate Channels table. */
IF COL_LENGTH(N'dbo.SalesChannels', N'Description') IS NULL ALTER TABLE dbo.SalesChannels ADD Description NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.SalesChannels', N'DeletedAtUtc') IS NULL ALTER TABLE dbo.SalesChannels ADD DeletedAtUtc DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.SalesChannels', N'DeletedBy') IS NULL ALTER TABLE dbo.SalesChannels ADD DeletedBy BIGINT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_SalesChannels_Name' AND object_id=OBJECT_ID(N'dbo.SalesChannels'))
    CREATE UNIQUE INDEX UX_SalesChannels_Name ON dbo.SalesChannels(Name) WHERE IsDeleted=0;
GO

/* Extend the existing canonical ChannelSkuMappings table without renaming its existing SalesChannelId column. */
IF COL_LENGTH(N'dbo.ChannelSkuMappings', N'ExternalItemId') IS NULL ALTER TABLE dbo.ChannelSkuMappings ADD ExternalItemId NVARCHAR(150) NULL;
IF COL_LENGTH(N'dbo.ChannelSkuMappings', N'IsPrimary') IS NULL ALTER TABLE dbo.ChannelSkuMappings ADD IsPrimary BIT NOT NULL CONSTRAINT DF_ChannelSkuMappings_IsPrimary DEFAULT(0);
IF COL_LENGTH(N'dbo.ChannelSkuMappings', N'EffectiveFrom') IS NULL ALTER TABLE dbo.ChannelSkuMappings ADD EffectiveFrom DATE NULL;
IF COL_LENGTH(N'dbo.ChannelSkuMappings', N'EffectiveTo') IS NULL ALTER TABLE dbo.ChannelSkuMappings ADD EffectiveTo DATE NULL;
IF COL_LENGTH(N'dbo.ChannelSkuMappings', N'DeletedAtUtc') IS NULL ALTER TABLE dbo.ChannelSkuMappings ADD DeletedAtUtc DATETIME2(3) NULL;
IF COL_LENGTH(N'dbo.ChannelSkuMappings', N'DeletedBy') IS NULL ALTER TABLE dbo.ChannelSkuMappings ADD DeletedBy BIGINT NULL;
GO
IF OBJECT_ID(N'dbo.CK_ChannelSkuMappings_EffectiveDates', N'C') IS NULL
    ALTER TABLE dbo.ChannelSkuMappings ADD CONSTRAINT CK_ChannelSkuMappings_EffectiveDates CHECK(EffectiveTo IS NULL OR EffectiveFrom IS NULL OR EffectiveTo>=EffectiveFrom);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_ChannelSkuMappings_Primary' AND object_id=OBJECT_ID(N'dbo.ChannelSkuMappings'))
    CREATE UNIQUE INDEX UX_ChannelSkuMappings_Primary ON dbo.ChannelSkuMappings(ItemId,SalesChannelId) WHERE IsDeleted=0 AND IsActive=1 AND IsPrimary=1;
GO

IF OBJECT_ID(N'dbo.ChannelWarehouses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChannelWarehouses
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChannelWarehouses PRIMARY KEY,
        ChannelId BIGINT NOT NULL,
        WarehouseCode NVARCHAR(50) NOT NULL,
        WarehouseName NVARCHAR(200) NOT NULL,
        City NVARCHAR(100) NULL,
        State NVARCHAR(100) NULL,
        AddressLine1 NVARCHAR(250) NULL,
        AddressLine2 NVARCHAR(250) NULL,
        PostalCode NVARCHAR(20) NULL,
        Region NVARCHAR(100) NULL,
        Priority INT NOT NULL CONSTRAINT DF_ChannelWarehouses_Priority DEFAULT(0),
        SortOrder INT NOT NULL CONSTRAINT DF_ChannelWarehouses_SortOrder DEFAULT(0),
        IsActive BIT NOT NULL CONSTRAINT DF_ChannelWarehouses_IsActive DEFAULT(1),
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ChannelWarehouses_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ChannelWarehouses_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_ChannelWarehouses_SalesChannels FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT CK_ChannelWarehouses_Priority CHECK(Priority>=0),
        CONSTRAINT CK_ChannelWarehouses_SortOrder CHECK(SortOrder>=0)
    );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_ChannelWarehouses_ChannelCode' AND object_id=OBJECT_ID(N'dbo.ChannelWarehouses'))
    CREATE UNIQUE INDEX UX_ChannelWarehouses_ChannelCode ON dbo.ChannelWarehouses(ChannelId,WarehouseCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_ChannelWarehouses_Filter' AND object_id=OBJECT_ID(N'dbo.ChannelWarehouses'))
    CREATE INDEX IX_ChannelWarehouses_Filter ON dbo.ChannelWarehouses(ChannelId,IsActive,City,State,SortOrder) WHERE IsDeleted=0;
GO

IF OBJECT_ID(N'dbo.ItemPackagingProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ItemPackagingProfiles
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ItemPackagingProfiles PRIMARY KEY,
        ItemId BIGINT NOT NULL,
        ChannelId BIGINT NULL,
        PackagingCode NVARCHAR(50) NOT NULL,
        PackagingName NVARCHAR(150) NULL,
        UnitsPerBox DECIMAL(19,6) NOT NULL,
        Length DECIMAL(19,6) NOT NULL CONSTRAINT DF_ItemPackagingProfiles_Length DEFAULT(0),
        Width DECIMAL(19,6) NOT NULL CONSTRAINT DF_ItemPackagingProfiles_Width DEFAULT(0),
        Height DECIMAL(19,6) NOT NULL CONSTRAINT DF_ItemPackagingProfiles_Height DEFAULT(0),
        DimensionUnit NVARCHAR(5) NOT NULL,
        GrossWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ItemPackagingProfiles_GrossWeight DEFAULT(0),
        NetWeight DECIMAL(19,6) NOT NULL CONSTRAINT DF_ItemPackagingProfiles_NetWeight DEFAULT(0),
        WeightUnit NVARCHAR(5) NOT NULL,
        VolumetricDivisor DECIMAL(19,6) NULL,
        CalculatedVolumetricWeight AS (CASE WHEN VolumetricDivisor IS NULL OR VolumetricDivisor=0 THEN NULL ELSE (Length*Width*Height)/VolumetricDivisor END) PERSISTED,
        IsDefault BIT NOT NULL CONSTRAINT DF_ItemPackagingProfiles_IsDefault DEFAULT(0),
        IsActive BIT NOT NULL CONSTRAINT DF_ItemPackagingProfiles_IsActive DEFAULT(1),
        EffectiveFrom DATE NULL,
        EffectiveTo DATE NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ItemPackagingProfiles_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CreatedBy BIGINT NULL,
        UpdatedAtUtc DATETIME2(3) NULL,
        UpdatedBy BIGINT NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_ItemPackagingProfiles_IsDeleted DEFAULT(0),
        DeletedAtUtc DATETIME2(3) NULL,
        DeletedBy BIGINT NULL,
        CONSTRAINT FK_ItemPackagingProfiles_Items FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT FK_ItemPackagingProfiles_SalesChannels FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT CK_ItemPackagingProfiles_Values CHECK(UnitsPerBox>0 AND Length>=0 AND Width>=0 AND Height>=0 AND GrossWeight>=0 AND NetWeight>=0 AND NetWeight<=GrossWeight AND (VolumetricDivisor IS NULL OR VolumetricDivisor>0)),
        CONSTRAINT CK_ItemPackagingProfiles_Units CHECK(DimensionUnit IN(N'CM',N'MM') AND WeightUnit IN(N'KG',N'G')),
        CONSTRAINT CK_ItemPackagingProfiles_EffectiveDates CHECK(EffectiveTo IS NULL OR EffectiveFrom IS NULL OR EffectiveTo>=EffectiveFrom)
    );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_ItemPackagingProfiles_Code' AND object_id=OBJECT_ID(N'dbo.ItemPackagingProfiles'))
    CREATE UNIQUE INDEX UX_ItemPackagingProfiles_Code ON dbo.ItemPackagingProfiles(ItemId,ChannelId,PackagingCode) WHERE IsDeleted=0;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_ItemPackagingProfiles_DefaultGlobal' AND object_id=OBJECT_ID(N'dbo.ItemPackagingProfiles'))
    CREATE UNIQUE INDEX UX_ItemPackagingProfiles_DefaultGlobal ON dbo.ItemPackagingProfiles(ItemId) WHERE ChannelId IS NULL AND IsDeleted=0 AND IsActive=1 AND IsDefault=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_ItemPackagingProfiles_DefaultChannel' AND object_id=OBJECT_ID(N'dbo.ItemPackagingProfiles'))
    CREATE UNIQUE INDEX UX_ItemPackagingProfiles_DefaultChannel ON dbo.ItemPackagingProfiles(ItemId,ChannelId) WHERE ChannelId IS NOT NULL AND IsDeleted=0 AND IsActive=1 AND IsDefault=1;
GO

/* Generalized staged batches. Existing ProcurementSalesImportBatches remain a compatibility/audit projection. */
IF OBJECT_ID(N'dbo.SupplyChainImportBatches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SupplyChainImportBatches
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SupplyChainImportBatches PRIMARY KEY,
        ModuleType NVARCHAR(50) NOT NULL,
        ImportType NVARCHAR(50) NOT NULL,
        ChannelId BIGINT NULL,
        OriginalFileName NVARCHAR(260) NOT NULL,
        StoredFileName NVARCHAR(260) NULL,
        FileHash CHAR(64) NOT NULL,
        PeriodFrom DATE NULL,
        PeriodTo DATE NULL,
        SnapshotDate DATE NULL,
        Status INT NOT NULL,
        TotalRows INT NOT NULL,
        ValidRows INT NOT NULL,
        InvalidRows INT NOT NULL,
        DuplicateRows INT NOT NULL,
        CommittedRows INT NOT NULL CONSTRAINT DF_SupplyChainImportBatches_CommittedRows DEFAULT(0),
        ValidationSummaryJson NVARCHAR(MAX) NULL,
        LegacyProcurementBatchId BIGINT NULL,
        UploadedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SupplyChainImportBatches_UploadedAtUtc DEFAULT(SYSUTCDATETIME()),
        UploadedBy BIGINT NULL,
        CommittedAtUtc DATETIME2(3) NULL,
        CommittedBy BIGINT NULL,
        CancelledAtUtc DATETIME2(3) NULL,
        CancelledBy BIGINT NULL,
        CancellationReason NVARCHAR(1000) NULL,
        CorrelationId NVARCHAR(100) NULL,
        CONSTRAINT FK_SupplyChainImportBatches_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_SupplyChainImportBatches_LegacyProcurement FOREIGN KEY(LegacyProcurementBatchId) REFERENCES dbo.ProcurementSalesImportBatches(Id),
        CONSTRAINT CK_SupplyChainImportBatches_Status CHECK(Status IN(1,2,3,4,5,6)),
        CONSTRAINT CK_SupplyChainImportBatches_Counts CHECK(TotalRows>=0 AND ValidRows>=0 AND InvalidRows>=0 AND DuplicateRows>=0 AND CommittedRows>=0 AND ValidRows+InvalidRows=TotalRows),
        CONSTRAINT CK_SupplyChainImportBatches_Period CHECK(PeriodTo IS NULL OR PeriodFrom IS NULL OR PeriodTo>=PeriodFrom)
    );
END;
GO
IF OBJECT_ID(N'dbo.SupplyChainImportRows', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SupplyChainImportRows
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SupplyChainImportRows PRIMARY KEY,
        BatchId BIGINT NOT NULL,
        RowNumber INT NOT NULL,
        SalesDate DATE NULL,
        ChannelCode NVARCHAR(20) NULL,
        ChannelId BIGINT NULL,
        ChannelSku NVARCHAR(150) NULL,
        ChannelProductName NVARCHAR(300) NULL,
        ItemId BIGINT NULL,
        Quantity DECIMAL(19,6) NULL,
        IsDuplicate BIT NOT NULL CONSTRAINT DF_SupplyChainImportRows_IsDuplicate DEFAULT(0),
        ErrorsJson NVARCHAR(MAX) NULL,
        SourceRowJson NVARCHAR(MAX) NULL,
        CONSTRAINT FK_SupplyChainImportRows_Batch FOREIGN KEY(BatchId) REFERENCES dbo.SupplyChainImportBatches(Id),
        CONSTRAINT FK_SupplyChainImportRows_Channel FOREIGN KEY(ChannelId) REFERENCES dbo.SalesChannels(Id),
        CONSTRAINT FK_SupplyChainImportRows_Item FOREIGN KEY(ItemId) REFERENCES dbo.Items(Id),
        CONSTRAINT CK_SupplyChainImportRows_RowNumber CHECK(RowNumber>0),
        CONSTRAINT UQ_SupplyChainImportRows_BatchRow UNIQUE(BatchId,RowNumber)
    );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SupplyChainImportBatches_Hash' AND object_id=OBJECT_ID(N'dbo.SupplyChainImportBatches'))
    CREATE INDEX IX_SupplyChainImportBatches_Hash ON dbo.SupplyChainImportBatches(FileHash,ImportType,Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_SupplyChainImportRows_BatchValidity' AND object_id=OBJECT_ID(N'dbo.SupplyChainImportRows'))
    CREATE INDEX IX_SupplyChainImportRows_BatchValidity ON dbo.SupplyChainImportRows(BatchId,IsDuplicate) INCLUDE(ErrorsJson,ItemId,Quantity);
GO

/* Known channels are the only explicit master seeds. Warehouse codes require client confirmation. */
MERGE dbo.SalesChannels AS target
USING (VALUES (N'AMZ',N'Amazon',10),(N'BLI',N'Blinkit',20),(N'INS',N'Instamart',30)) source(Code,Name,DisplayOrder)
ON target.Code=source.Code AND target.IsDeleted=0
WHEN MATCHED THEN UPDATE SET Name=source.Name,DisplayOrder=source.DisplayOrder,IsActive=1,ModifiedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(Code,Name,DisplayOrder,IsActive) VALUES(source.Code,source.Name,source.DisplayOrder,1);
GO

MERGE dbo.Pages AS target
USING (VALUES (N'SupplyChain',N'Supply Chain',N'/supply-chain',N'truck',90)) source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,source.SortOrder,1);
GO
DECLARE @SupplyChainParentId INT=(SELECT Id FROM dbo.Pages WHERE Name=N'SupplyChain');
MERGE dbo.Pages AS target
USING (VALUES
 (N'SupplyChain.Channels',N'Channels',N'/supply-chain/channels',N'network',91),
 (N'SupplyChain.Warehouses',N'Channel Warehouses',N'/supply-chain/warehouses',N'warehouse',92),
 (N'SupplyChain.ItemMappings',N'Channel Item Mappings',N'/supply-chain/item-mappings',N'git-merge',93),
 (N'SupplyChain.PackagingProfiles',N'Packaging Profiles',N'/supply-chain/packaging-profiles',N'package',94),
 (N'SupplyChain.Imports',N'Supply Chain Imports',N'/supply-chain/imports',N'file-up',95)
) source(Name,DisplayName,Route,Icon,SortOrder)
ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,ParentPageId=@SupplyChainParentId,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,@SupplyChainParentId,source.SortOrder,1);
GO
DECLARE @SupplyChainSuperAdminRoleId INT=(SELECT Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
IF @SupplyChainSuperAdminRoleId IS NOT NULL
MERGE dbo.RolePermissions AS target
USING (SELECT @SupplyChainSuperAdminRoleId RoleId,Id PageId FROM dbo.Pages WHERE Name=N'SupplyChain' OR Name LIKE N'SupplyChain.%') source
ON target.RoleId=source.RoleId AND target.PageId=source.PageId
WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=1,CanEdit=1,CanDelete=1,CanExport=1,CanApprove=1
WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(source.RoleId,source.PageId,1,1,1,1,1,1);
GO

CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Channel_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT Id,Code,Name,Description,DisplayOrder SortOrder,IsActive,CreatedAt CreatedAtUtc,CreatedBy,ModifiedAt UpdatedAtUtc,ModifiedBy UpdatedBy
 FROM dbo.SalesChannels WHERE Id=@Id AND IsDeleted=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Channel_List
 @Search NVARCHAR(200)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT Id,Code,Name,Description,DisplayOrder SortOrder,IsActive,CreatedAt CreatedAtUtc,CreatedBy,ModifiedAt UpdatedAtUtc,ModifiedBy UpdatedBy,COUNT(1) OVER() TotalCount
 FROM dbo.SalesChannels WHERE IsDeleted=0 AND (@IsActive IS NULL OR IsActive=@IsActive) AND (@Search IS NULL OR Code LIKE N'%'+@Search+N'%' OR Name LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN UPPER(@SortDirection)=N'DESC' THEN -DisplayOrder ELSE DisplayOrder END,Name,Id OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Channel_Save
 @Id BIGINT=NULL,@Code NVARCHAR(20),@Name NVARCHAR(100),@Description NVARCHAR(500)=NULL,@SortOrder INT=0,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Code=@Code AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'Channel code already exists.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Name=@Name AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'Channel name already exists.' Message;RETURN;END;
 IF @Id IS NULL BEGIN INSERT dbo.SalesChannels(Code,Name,Description,DisplayOrder,IsActive,CreatedBy) VALUES(@Code,@Name,@Description,@SortOrder,@IsActive,@UserId);SET @Id=SCOPE_IDENTITY();END
 ELSE BEGIN IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel was not found.' Message;RETURN;END; UPDATE dbo.SalesChannels SET Code=@Code,Name=@Name,Description=@Description,DisplayOrder=@SortOrder,IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;END
 SELECT 200 StatusCode,N'Channel saved.' Message;EXEC dbo.usp_SupplyChain_Channel_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Channel_SetStatus @Id BIGINT,@IsActive BIT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel was not found.' Message;RETURN;END;
 UPDATE dbo.SalesChannels SET IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Channel status updated.' Message;END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Channel_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel was not found.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE ChannelId=@Id AND IsDeleted=0) OR EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@Id AND IsDeleted=0) OR EXISTS(SELECT 1 FROM dbo.ProcurementSalesHistory WHERE SalesChannelId=@Id AND IsDeleted=0)
 BEGIN SELECT 409 StatusCode,N'Channel is in use and cannot be deleted.' Message;RETURN;END;
 UPDATE dbo.SalesChannels SET IsDeleted=1,IsActive=0,DeletedAtUtc=SYSUTCDATETIME(),DeletedBy=@UserId,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Channel deleted.' Message;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Warehouse_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;SELECT w.Id,w.ChannelId,c.Code ChannelCode,c.Name ChannelName,w.WarehouseCode,w.WarehouseName,w.City,w.State,w.AddressLine1,w.AddressLine2,w.PostalCode,w.Region,w.Priority,w.SortOrder,w.IsActive,w.CreatedAtUtc,w.CreatedBy,w.UpdatedAtUtc,w.UpdatedBy FROM dbo.ChannelWarehouses w JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE w.Id=@Id AND w.IsDeleted=0;END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Warehouse_List
 @Search NVARCHAR(200)=NULL,@ChannelId BIGINT=NULL,@IsActive BIT=NULL,@City NVARCHAR(100)=NULL,@State NVARCHAR(100)=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT w.Id,w.ChannelId,c.Code ChannelCode,c.Name ChannelName,w.WarehouseCode,w.WarehouseName,w.City,w.State,w.AddressLine1,w.AddressLine2,w.PostalCode,w.Region,w.Priority,w.SortOrder,w.IsActive,w.CreatedAtUtc,w.CreatedBy,w.UpdatedAtUtc,w.UpdatedBy,COUNT(1) OVER() TotalCount
 FROM dbo.ChannelWarehouses w JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE w.IsDeleted=0 AND (@ChannelId IS NULL OR w.ChannelId=@ChannelId) AND (@IsActive IS NULL OR w.IsActive=@IsActive) AND (@City IS NULL OR w.City=@City) AND (@State IS NULL OR w.State=@State) AND (@Search IS NULL OR w.WarehouseCode LIKE N'%'+@Search+N'%' OR w.WarehouseName LIKE N'%'+@Search+N'%' OR c.Code LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN UPPER(@SortDirection)=N'DESC' THEN -w.SortOrder ELSE w.SortOrder END,w.WarehouseCode,w.Id OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Warehouse_Save
 @Id BIGINT=NULL,@ChannelId BIGINT,@WarehouseCode NVARCHAR(50),@WarehouseName NVARCHAR(200),@City NVARCHAR(100)=NULL,@State NVARCHAR(100)=NULL,@AddressLine1 NVARCHAR(250)=NULL,@AddressLine2 NVARCHAR(250)=NULL,@PostalCode NVARCHAR(20)=NULL,@Region NVARCHAR(100)=NULL,@Priority INT=0,@SortOrder INT=0,@IsActive BIT=1,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Channel is invalid or inactive.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE ChannelId=@ChannelId AND WarehouseCode=@WarehouseCode AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'Warehouse code already exists for this channel.' Message;RETURN;END;
 IF @Id IS NULL BEGIN INSERT dbo.ChannelWarehouses(ChannelId,WarehouseCode,WarehouseName,City,State,AddressLine1,AddressLine2,PostalCode,Region,Priority,SortOrder,IsActive,CreatedBy) VALUES(@ChannelId,@WarehouseCode,@WarehouseName,@City,@State,@AddressLine1,@AddressLine2,@PostalCode,@Region,@Priority,@SortOrder,@IsActive,@UserId);SET @Id=SCOPE_IDENTITY();END
 ELSE BEGIN IF NOT EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel warehouse was not found.' Message;RETURN;END;UPDATE dbo.ChannelWarehouses SET ChannelId=@ChannelId,WarehouseCode=@WarehouseCode,WarehouseName=@WarehouseName,City=@City,State=@State,AddressLine1=@AddressLine1,AddressLine2=@AddressLine2,PostalCode=@PostalCode,Region=@Region,Priority=@Priority,SortOrder=@SortOrder,IsActive=@IsActive,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;END
 SELECT 200 StatusCode,N'Channel warehouse saved.' Message;EXEC dbo.usp_SupplyChain_Warehouse_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Warehouse_SetStatus @Id BIGINT,@IsActive BIT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;IF NOT EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel warehouse was not found.' Message;RETURN;END;UPDATE dbo.ChannelWarehouses SET IsActive=@IsActive,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Channel warehouse status updated.' Message;END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Warehouse_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;IF NOT EXISTS(SELECT 1 FROM dbo.ChannelWarehouses WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel warehouse was not found.' Message;RETURN;END;
 /* No committed warehouse operational table exists yet. Future modules must add their usage guard before referencing this FK. */
 UPDATE dbo.ChannelWarehouses SET IsDeleted=1,IsActive=0,DeletedAtUtc=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Channel warehouse deleted.' Message;END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Warehouse_Dropdown @ChannelId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SELECT w.Id,w.ChannelId,c.Code ChannelCode,w.WarehouseCode,w.WarehouseName FROM dbo.ChannelWarehouses w JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE w.IsDeleted=0 AND w.IsActive=1 AND c.IsDeleted=0 AND c.IsActive=1 AND (@ChannelId IS NULL OR w.ChannelId=@ChannelId) ORDER BY c.DisplayOrder,w.SortOrder,w.WarehouseCode;END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_ItemMapping_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT m.Id,m.SalesChannelId ChannelId,c.Code ChannelCode,c.Name ChannelName,m.ItemId,i.ItemCode,i.Name ItemName,m.ChannelSku,m.ChannelProductName,m.ExternalItemId,m.IsPrimary,m.IsActive,m.EffectiveFrom,m.EffectiveTo,m.CreatedAt CreatedAtUtc,m.CreatedBy,m.ModifiedAt UpdatedAtUtc,m.ModifiedBy UpdatedBy
 FROM dbo.ChannelSkuMappings m JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId JOIN dbo.Items i ON i.Id=m.ItemId WHERE m.Id=@Id AND m.IsDeleted=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_ItemMapping_List
 @Search NVARCHAR(200)=NULL,@ChannelId BIGINT=NULL,@ItemId BIGINT=NULL,@IsActive BIT=NULL,@IsPrimary BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT m.Id,m.SalesChannelId ChannelId,c.Code ChannelCode,c.Name ChannelName,m.ItemId,i.ItemCode,i.Name ItemName,m.ChannelSku,m.ChannelProductName,m.ExternalItemId,m.IsPrimary,m.IsActive,m.EffectiveFrom,m.EffectiveTo,m.CreatedAt CreatedAtUtc,m.CreatedBy,m.ModifiedAt UpdatedAtUtc,m.ModifiedBy UpdatedBy,COUNT(1) OVER() TotalCount
 FROM dbo.ChannelSkuMappings m JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId JOIN dbo.Items i ON i.Id=m.ItemId
 WHERE m.IsDeleted=0 AND (@ChannelId IS NULL OR m.SalesChannelId=@ChannelId) AND (@ItemId IS NULL OR m.ItemId=@ItemId) AND (@IsActive IS NULL OR m.IsActive=@IsActive) AND (@IsPrimary IS NULL OR m.IsPrimary=@IsPrimary)
 AND (@Search IS NULL OR m.ChannelSku LIKE N'%'+@Search+N'%' OR m.ChannelProductName LIKE N'%'+@Search+N'%' OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN UPPER(@SortDirection)=N'DESC' THEN -m.Id ELSE m.Id END OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_ItemMapping_Save
 @Id BIGINT=NULL,@ChannelId BIGINT,@ItemId BIGINT,@ChannelSku NVARCHAR(150),@ChannelProductName NVARCHAR(300)=NULL,@ExternalItemId NVARCHAR(150)=NULL,@IsPrimary BIT=0,@IsActive BIT=1,@EffectiveFrom DATE=NULL,@EffectiveTo DATE=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF @EffectiveTo IS NOT NULL AND @EffectiveFrom IS NOT NULL AND @EffectiveTo<@EffectiveFrom BEGIN SELECT 400 StatusCode,N'EffectiveTo cannot precede EffectiveFrom.' Message;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Channel is invalid or inactive.' Message;RETURN;END;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Item is invalid or inactive.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@ChannelId AND ChannelSku=@ChannelSku AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'Channel SKU already exists for this channel.' Message;RETURN;END;
 IF @IsActive=1 AND @IsPrimary=1 AND EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE SalesChannelId=@ChannelId AND ItemId=@ItemId AND IsPrimary=1 AND IsActive=1 AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'An active primary mapping already exists for this Item and channel.' Message;RETURN;END;
 IF @Id IS NULL BEGIN INSERT dbo.ChannelSkuMappings(SalesChannelId,ChannelSku,ChannelProductName,ItemId,ExternalItemId,IsPrimary,IsActive,EffectiveFrom,EffectiveTo,CreatedBy) VALUES(@ChannelId,@ChannelSku,@ChannelProductName,@ItemId,@ExternalItemId,@IsPrimary,@IsActive,@EffectiveFrom,@EffectiveTo,@UserId);SET @Id=SCOPE_IDENTITY();END
 ELSE BEGIN IF NOT EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel Item mapping was not found.' Message;RETURN;END;UPDATE dbo.ChannelSkuMappings SET SalesChannelId=@ChannelId,ChannelSku=@ChannelSku,ChannelProductName=@ChannelProductName,ItemId=@ItemId,ExternalItemId=@ExternalItemId,IsPrimary=@IsPrimary,IsActive=@IsActive,EffectiveFrom=@EffectiveFrom,EffectiveTo=@EffectiveTo,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;END
 SELECT 200 StatusCode,N'Channel Item mapping saved.' Message;EXEC dbo.usp_SupplyChain_ItemMapping_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_ItemMapping_SetStatus @Id BIGINT,@IsActive BIT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel Item mapping was not found.' Message;RETURN;END;
 IF @IsActive=1 AND EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings x JOIN dbo.ChannelSkuMappings y ON y.Id=@Id WHERE x.SalesChannelId=y.SalesChannelId AND x.ChannelSku=y.ChannelSku AND x.IsDeleted=0 AND x.IsActive=1 AND x.Id<>@Id) BEGIN SELECT 409 StatusCode,N'Another active mapping already exists for this channel SKU.' Message;RETURN;END;
 IF @IsActive=1 AND EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings x JOIN dbo.ChannelSkuMappings y ON y.Id=@Id WHERE y.IsPrimary=1 AND x.SalesChannelId=y.SalesChannelId AND x.ItemId=y.ItemId AND x.IsPrimary=1 AND x.IsDeleted=0 AND x.IsActive=1 AND x.Id<>@Id) BEGIN SELECT 409 StatusCode,N'Another active primary mapping exists for this Item and channel.' Message;RETURN;END;
 UPDATE dbo.ChannelSkuMappings SET IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Channel Item mapping status updated.' Message;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_ItemMapping_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;IF NOT EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Channel Item mapping was not found.' Message;RETURN;END;
 UPDATE dbo.ChannelSkuMappings SET IsDeleted=1,IsActive=0,DeletedAtUtc=SYSUTCDATETIME(),DeletedBy=@UserId,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Channel Item mapping deleted.' Message;END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_ItemMapping_Unmatched AS
BEGIN SET NOCOUNT ON;
 SELECT s.SalesChannelId ChannelId,c.Code ChannelCode,s.ChannelSku,MAX(s.ChannelProductName) ChannelProductName,COUNT(1) OccurrenceCount,MIN(s.SalesDate) FirstSeenDate,MAX(s.SalesDate) LastSeenDate
 FROM dbo.ProcurementSalesHistory s JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId WHERE s.IsDeleted=0 AND s.ItemId IS NULL
 GROUP BY s.SalesChannelId,c.Code,s.ChannelSku ORDER BY c.Code,s.ChannelSku;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT p.Id,p.ItemId,i.ItemCode,i.Name ItemName,p.ChannelId,c.Code ChannelCode,p.PackagingCode,p.PackagingName,p.UnitsPerBox,p.Length,p.Width,p.Height,p.DimensionUnit,p.GrossWeight,p.NetWeight,p.WeightUnit,p.VolumetricDivisor,p.CalculatedVolumetricWeight,p.IsDefault,p.IsActive,p.EffectiveFrom,p.EffectiveTo,p.CreatedAtUtc,p.CreatedBy,p.UpdatedAtUtc,p.UpdatedBy
 FROM dbo.ItemPackagingProfiles p JOIN dbo.Items i ON i.Id=p.ItemId LEFT JOIN dbo.SalesChannels c ON c.Id=p.ChannelId WHERE p.Id=@Id AND p.IsDeleted=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_List
 @Search NVARCHAR(200)=NULL,@ItemId BIGINT=NULL,@ChannelId BIGINT=NULL,@IsActive BIT=NULL,@IsDefault BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT p.Id,p.ItemId,i.ItemCode,i.Name ItemName,p.ChannelId,c.Code ChannelCode,p.PackagingCode,p.PackagingName,p.UnitsPerBox,p.Length,p.Width,p.Height,p.DimensionUnit,p.GrossWeight,p.NetWeight,p.WeightUnit,p.VolumetricDivisor,p.CalculatedVolumetricWeight,p.IsDefault,p.IsActive,p.EffectiveFrom,p.EffectiveTo,p.CreatedAtUtc,p.CreatedBy,p.UpdatedAtUtc,p.UpdatedBy,COUNT(1) OVER() TotalCount
 FROM dbo.ItemPackagingProfiles p JOIN dbo.Items i ON i.Id=p.ItemId LEFT JOIN dbo.SalesChannels c ON c.Id=p.ChannelId WHERE p.IsDeleted=0 AND (@ItemId IS NULL OR p.ItemId=@ItemId) AND (@ChannelId IS NULL OR p.ChannelId=@ChannelId) AND (@IsActive IS NULL OR p.IsActive=@IsActive) AND (@IsDefault IS NULL OR p.IsDefault=@IsDefault) AND (@Search IS NULL OR p.PackagingCode LIKE N'%'+@Search+N'%' OR p.PackagingName LIKE N'%'+@Search+N'%' OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN UPPER(@SortDirection)=N'DESC' THEN -p.Id ELSE p.Id END OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_Save
 @Id BIGINT=NULL,@ItemId BIGINT,@ChannelId BIGINT=NULL,@PackagingCode NVARCHAR(50),@PackagingName NVARCHAR(150)=NULL,@UnitsPerBox DECIMAL(19,6),@Length DECIMAL(19,6),@Width DECIMAL(19,6),@Height DECIMAL(19,6),@DimensionUnit NVARCHAR(5),@GrossWeight DECIMAL(19,6),@NetWeight DECIMAL(19,6),@WeightUnit NVARCHAR(5),@VolumetricDivisor DECIMAL(19,6)=NULL,@IsDefault BIT=0,@IsActive BIT=1,@EffectiveFrom DATE=NULL,@EffectiveTo DATE=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Item is invalid or inactive.' Message;RETURN;END;
 IF @ChannelId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Id=@ChannelId AND IsDeleted=0 AND IsActive=1) BEGIN SELECT 400 StatusCode,N'Channel is invalid or inactive.' Message;RETURN;END;
 IF @EffectiveTo IS NOT NULL AND @EffectiveFrom IS NOT NULL AND @EffectiveTo<@EffectiveFrom BEGIN SELECT 400 StatusCode,N'EffectiveTo cannot precede EffectiveFrom.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles WHERE ItemId=@ItemId AND ((ChannelId=@ChannelId) OR (ChannelId IS NULL AND @ChannelId IS NULL)) AND PackagingCode=@PackagingCode AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'Packaging code already exists for this Item and channel scope.' Message;RETURN;END;
 IF @IsDefault=1 AND @IsActive=1 AND EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles WHERE ItemId=@ItemId AND ((ChannelId=@ChannelId) OR (ChannelId IS NULL AND @ChannelId IS NULL)) AND IsDefault=1 AND IsActive=1 AND IsDeleted=0 AND (@Id IS NULL OR Id<>@Id)) BEGIN SELECT 409 StatusCode,N'An active default packaging profile already exists for this Item and channel scope.' Message;RETURN;END;
 IF @Id IS NULL BEGIN INSERT dbo.ItemPackagingProfiles(ItemId,ChannelId,PackagingCode,PackagingName,UnitsPerBox,Length,Width,Height,DimensionUnit,GrossWeight,NetWeight,WeightUnit,VolumetricDivisor,IsDefault,IsActive,EffectiveFrom,EffectiveTo,CreatedBy) VALUES(@ItemId,@ChannelId,@PackagingCode,@PackagingName,@UnitsPerBox,@Length,@Width,@Height,@DimensionUnit,@GrossWeight,@NetWeight,@WeightUnit,@VolumetricDivisor,@IsDefault,@IsActive,@EffectiveFrom,@EffectiveTo,@UserId);SET @Id=SCOPE_IDENTITY();END
 ELSE BEGIN IF NOT EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Item packaging profile was not found.' Message;RETURN;END;UPDATE dbo.ItemPackagingProfiles SET ItemId=@ItemId,ChannelId=@ChannelId,PackagingCode=@PackagingCode,PackagingName=@PackagingName,UnitsPerBox=@UnitsPerBox,Length=@Length,Width=@Width,Height=@Height,DimensionUnit=@DimensionUnit,GrossWeight=@GrossWeight,NetWeight=@NetWeight,WeightUnit=@WeightUnit,VolumetricDivisor=@VolumetricDivisor,IsDefault=@IsDefault,IsActive=@IsActive,EffectiveFrom=@EffectiveFrom,EffectiveTo=@EffectiveTo,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;END
 SELECT 200 StatusCode,N'Item packaging profile saved.' Message;EXEC dbo.usp_SupplyChain_PackagingProfile_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_SetDefault @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;BEGIN TRY
 DECLARE @ItemId BIGINT,@ChannelId BIGINT;SELECT @ItemId=ItemId,@ChannelId=ChannelId FROM dbo.ItemPackagingProfiles WHERE Id=@Id AND IsDeleted=0 AND IsActive=1;
 IF @ItemId IS NULL BEGIN SELECT 404 StatusCode,N'An active item packaging profile was not found.' Message;RETURN;END;
 UPDATE dbo.ItemPackagingProfiles SET IsDefault=0,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE ItemId=@ItemId AND ((ChannelId=@ChannelId) OR (ChannelId IS NULL AND @ChannelId IS NULL)) AND IsDeleted=0 AND IsActive=1;
 UPDATE dbo.ItemPackagingProfiles SET IsDefault=1,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;
 SELECT 200 StatusCode,N'Default packaging profile set.' Message;EXEC dbo.usp_SupplyChain_PackagingProfile_Get @Id;
END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_Delete @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;IF NOT EXISTS(SELECT 1 FROM dbo.ItemPackagingProfiles WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N'Item packaging profile was not found.' Message;RETURN;END;UPDATE dbo.ItemPackagingProfiles SET IsDeleted=1,IsActive=0,IsDefault=0,DeletedAtUtc=SYSUTCDATETIME(),DeletedBy=@UserId,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id;SELECT 200 StatusCode,N'Item packaging profile deleted.' Message;END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Import_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT b.Id,b.ModuleType,b.ImportType,b.ChannelId,c.Code ChannelCode,b.OriginalFileName,b.FileHash,b.PeriodFrom,b.PeriodTo,b.SnapshotDate,b.Status,b.TotalRows,b.ValidRows,b.InvalidRows,b.DuplicateRows,b.CommittedRows,b.ValidationSummaryJson,b.UploadedAtUtc,b.UploadedBy,b.CommittedAtUtc,b.CommittedBy,b.CancelledAtUtc,b.CancelledBy,b.CorrelationId
 FROM dbo.SupplyChainImportBatches b LEFT JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE b.Id=@Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Import_List
 @ModuleType NVARCHAR(50)=NULL,@ImportType NVARCHAR(50)=NULL,@ChannelId BIGINT=NULL,@Status INT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT b.Id,b.ModuleType,b.ImportType,b.ChannelId,c.Code ChannelCode,b.OriginalFileName,b.FileHash,b.PeriodFrom,b.PeriodTo,b.SnapshotDate,b.Status,b.TotalRows,b.ValidRows,b.InvalidRows,b.DuplicateRows,b.CommittedRows,b.ValidationSummaryJson,b.UploadedAtUtc,b.UploadedBy,b.CommittedAtUtc,b.CommittedBy,b.CancelledAtUtc,b.CancelledBy,b.CorrelationId,COUNT(1) OVER() TotalCount
 FROM dbo.SupplyChainImportBatches b LEFT JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE (@ModuleType IS NULL OR b.ModuleType=@ModuleType) AND (@ImportType IS NULL OR b.ImportType=@ImportType) AND (@ChannelId IS NULL OR b.ChannelId=@ChannelId) AND (@Status IS NULL OR b.Status=@Status)
 ORDER BY b.UploadedAtUtc DESC,b.Id DESC OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Import_Errors @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT r.RowNumber,COALESCE(JSON_VALUE(e.value,N'$.field'),N'Row') Field,COALESCE(JSON_VALUE(e.value,N'$.message'),N'Invalid import row.') Message,JSON_VALUE(e.value,N'$.originalValue') OriginalValue
 FROM dbo.SupplyChainImportRows r CROSS APPLY OPENJSON(COALESCE(r.ErrorsJson,N'[]')) e WHERE r.BatchId=@Id ORDER BY r.RowNumber,e.[key];
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Import_Validate
 @OriginalFileName NVARCHAR(260),@FileHash CHAR(64),@ImportType NVARCHAR(50),@ChannelId BIGINT=NULL,@PeriodFrom DATE=NULL,@PeriodTo DATE=NULL,@RowsJson NVARCHAR(MAX),@CorrelationId NVARCHAR(100)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF @ImportType<>N'ProcurementSales' BEGIN SELECT 400 StatusCode,N'Only ProcurementSales is operationally enabled.' Message;RETURN;END;
 IF ISJSON(@RowsJson)<>1 BEGIN SELECT 400 StatusCode,N'Import rows are invalid.' Message;RETURN;END;
 DECLARE @Rows TABLE(RowNumber INT NOT NULL PRIMARY KEY,SalesDate DATE NULL,ChannelCode NVARCHAR(20) NULL,ChannelId BIGINT NULL,ChannelSku NVARCHAR(150) NULL,ChannelProductName NVARCHAR(300) NULL,ItemId BIGINT NULL,Quantity DECIMAL(19,6) NULL,IsDuplicate BIT NOT NULL,ErrorsJson NVARCHAR(MAX) NULL,SourceRowJson NVARCHAR(MAX) NULL);
 INSERT @Rows(RowNumber,SalesDate,ChannelCode,ChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,IsDuplicate,ErrorsJson,SourceRowJson)
 SELECT rowNumber,salesDate,channelCode,channelId,channelSku,channelProductName,itemId,quantity,isDuplicate,errors,sourceRowJson
 FROM OPENJSON(@RowsJson) WITH(rowNumber INT '$.rowNumber',salesDate DATE '$.salesDate',channelCode NVARCHAR(20) '$.channelCode',channelId BIGINT '$.channelId',channelSku NVARCHAR(150) '$.channelSku',channelProductName NVARCHAR(300) '$.channelProductName',itemId BIGINT '$.itemId',quantity DECIMAL(19,6) '$.quantity',isDuplicate BIT '$.isDuplicate',errors NVARCHAR(MAX) '$.errors' AS JSON,sourceRowJson NVARCHAR(MAX) '$.sourceRowJson');
 IF NOT EXISTS(SELECT 1 FROM @Rows) BEGIN SELECT 400 StatusCode,N'Import contains no rows.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM @Rows WHERE RowNumber<=0) BEGIN SELECT 400 StatusCode,N'Import row numbers are invalid.' Message;RETURN;END;
 DECLARE @Total INT=(SELECT COUNT(1) FROM @Rows),@Invalid INT=(SELECT COUNT(1) FROM @Rows WHERE NULLIF(ErrorsJson,N'[]') IS NOT NULL),@Duplicates INT=(SELECT COUNT(1) FROM @Rows WHERE IsDuplicate=1),@Valid INT;
 SET @Valid=@Total-@Invalid;
 DECLARE @UnmatchedItem INT=(SELECT COUNT(1) FROM @Rows WHERE NULLIF(ErrorsJson,N'[]') IS NULL AND ItemId IS NULL),@UnmatchedChannel INT=(SELECT COUNT(1) FROM @Rows WHERE EXISTS(SELECT 1 FROM OPENJSON(COALESCE(ErrorsJson,N'[]')) x WHERE JSON_VALUE(x.value,N'$.field')=N'ChannelCode')),@UnmatchedWarehouse INT=0;
 DECLARE @Warnings NVARCHAR(MAX)=CASE WHEN EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE FileHash=@FileHash AND ImportType=@ImportType AND Status=5) THEN N'["A committed import with this file hash already exists. Commit requires AllowDuplicate with a correction reason."]' ELSE N'[]' END;
 DECLARE @Summary NVARCHAR(MAX)=(SELECT @Total TotalRows,@Valid ValidRows,@Invalid InvalidRows,@Duplicates DuplicateRows,@UnmatchedItem UnmatchedItemCount,@UnmatchedChannel UnmatchedChannelCount,@UnmatchedWarehouse UnmatchedWarehouseCount,JSON_QUERY(@Warnings) Warnings FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 BEGIN TRAN;
 INSERT dbo.SupplyChainImportBatches(ModuleType,ImportType,ChannelId,OriginalFileName,FileHash,PeriodFrom,PeriodTo,Status,TotalRows,ValidRows,InvalidRows,DuplicateRows,ValidationSummaryJson,UploadedBy,CorrelationId)
 VALUES(N'ProcurementPlanning',@ImportType,@ChannelId,RIGHT(@OriginalFileName,260),@FileHash,@PeriodFrom,@PeriodTo,IIF(@Invalid=0,3,4),@Total,@Valid,@Invalid,@Duplicates,@Summary,@UserId,@CorrelationId);
 DECLARE @BatchId BIGINT=SCOPE_IDENTITY();
 INSERT dbo.SupplyChainImportRows(BatchId,RowNumber,SalesDate,ChannelCode,ChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,IsDuplicate,ErrorsJson,SourceRowJson)
 SELECT @BatchId,RowNumber,SalesDate,ChannelCode,ChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,IsDuplicate,ErrorsJson,SourceRowJson FROM @Rows;
 COMMIT;
 SELECT 201 StatusCode,N'Import validation completed.' Message;
 SELECT @BatchId BatchId,RIGHT(@OriginalFileName,260) FileName,@ImportType ImportType,@Total TotalRows,@Valid ValidRows,@Invalid InvalidRows,@Duplicates DuplicateRows,@UnmatchedItem UnmatchedItemCount,@UnmatchedChannel UnmatchedChannelCount,@UnmatchedWarehouse UnmatchedWarehouseCount,@Warnings WarningsJson,
 (SELECT r.RowNumber,COALESCE(JSON_VALUE(e.value,N'$.field'),N'Row') Field,COALESCE(JSON_VALUE(e.value,N'$.message'),N'Invalid import row.') Message,JSON_VALUE(e.value,N'$.originalValue') OriginalValue FROM @Rows r CROSS APPLY OPENJSON(COALESCE(r.ErrorsJson,N'[]')) e FOR JSON PATH) RowErrorsJson,CONVERT(BIT,IIF(@Invalid=0,1,0)) CanCommit;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Import_Commit @Id BIGINT,@AllowDuplicate BIT=0,@CorrectionReason NVARCHAR(1000)=NULL,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 DECLARE @ImportType NVARCHAR(50),@FileHash CHAR(64),@OriginalFileName NVARCHAR(260),@Status INT,@Invalid INT,@ExistingCommitted BIT;
 SELECT @ImportType=ImportType,@FileHash=FileHash,@OriginalFileName=OriginalFileName,@Status=Status,@Invalid=InvalidRows FROM dbo.SupplyChainImportBatches WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id;
 IF @ImportType IS NULL BEGIN SELECT 404 StatusCode,N'Supply-chain import batch was not found.' Message;RETURN;END;
 IF @Status<>3 OR @Invalid<>0 BEGIN SELECT 409 StatusCode,N'Only a fully validated import batch can be committed.' Message;RETURN;END;
 IF @ImportType<>N'ProcurementSales' BEGIN SELECT 409 StatusCode,N'This import type is not operationally enabled.' Message;RETURN;END;
 SET @ExistingCommitted=IIF(EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches WHERE Id<>@Id AND FileHash=@FileHash AND ImportType=@ImportType AND Status=5),1,0);
 IF @ExistingCommitted=1 AND @AllowDuplicate=0 BEGIN SELECT 409 StatusCode,N'This file was already committed. AllowDuplicate with a correction reason is required.' Message;RETURN;END;
 IF @AllowDuplicate=1 AND NULLIF(LTRIM(RTRIM(@CorrectionReason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'Correction reason is required for an intentional duplicate import.' Message;RETURN;END;
 IF EXISTS(SELECT 1 FROM dbo.SupplyChainImportRows r LEFT JOIN dbo.SalesChannels c ON c.Id=r.ChannelId AND c.IsDeleted=0 AND c.IsActive=1 LEFT JOIN dbo.Items i ON i.Id=r.ItemId AND i.IsDeleted=0 AND i.IsActive=1 WHERE r.BatchId=@Id AND (c.Id IS NULL OR r.SalesDate IS NULL OR NULLIF(r.ChannelSku,N'') IS NULL OR r.Quantity<=0 OR (r.ItemId IS NOT NULL AND i.Id IS NULL) OR NULLIF(r.ErrorsJson,N'[]') IS NOT NULL)) BEGIN SELECT 409 StatusCode,N'Import rows no longer satisfy server validation.' Message;RETURN;END;
 BEGIN TRAN;
 DECLARE @Next BIGINT,@Prefix NVARCHAR(20),@Padding INT;
 SELECT @Next=NextNumber,@Prefix=Prefix,@Padding=PaddingLength FROM dbo.NumberSequences WITH(UPDLOCK,HOLDLOCK) WHERE ModuleName=N'ProcurementSalesImport';
 IF @Next IS NULL BEGIN INSERT dbo.NumberSequences(ModuleName,Prefix,NextNumber,PaddingLength) VALUES(N'ProcurementSalesImport',N'PSI-',2,6);SET @Next=1;SET @Prefix=N'PSI-';SET @Padding=6;END ELSE UPDATE dbo.NumberSequences SET NextNumber=@Next+1,UpdatedAtUtc=SYSUTCDATETIME() WHERE ModuleName=N'ProcurementSalesImport';
 DECLARE @BatchNumber NVARCHAR(30)=@Prefix+RIGHT(REPLICATE('0',@Padding)+CONVERT(VARCHAR(20),@Next),@Padding),@Total INT=(SELECT COUNT(1) FROM dbo.SupplyChainImportRows WHERE BatchId=@Id),@Unmapped INT=(SELECT COUNT(1) FROM dbo.SupplyChainImportRows WHERE BatchId=@Id AND ItemId IS NULL);
 INSERT dbo.ProcurementSalesImportBatches(BatchNumber,OriginalFileName,FileHash,TotalRows,ImportedRows,UnmappedRows,Status,CorrectionReason,CreatedBy) VALUES(@BatchNumber,@OriginalFileName,@FileHash,@Total,@Total,@Unmapped,1,@CorrectionReason,@UserId);
 DECLARE @LegacyBatchId BIGINT=SCOPE_IDENTITY();
 INSERT dbo.ProcurementSalesHistory(SalesDate,SalesChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,ImportBatchId,SourceRowNumber,SourceRowJson,IsManual,CreatedBy)
 SELECT SalesDate,ChannelId,ChannelSku,ChannelProductName,ItemId,Quantity,@LegacyBatchId,RowNumber,SourceRowJson,0,@UserId FROM dbo.SupplyChainImportRows WHERE BatchId=@Id;
 UPDATE dbo.SupplyChainImportBatches SET Status=5,CommittedRows=@Total,LegacyProcurementBatchId=@LegacyBatchId,CommittedAtUtc=SYSUTCDATETIME(),CommittedBy=@UserId WHERE Id=@Id;
 COMMIT;SELECT 200 StatusCode,N'Import committed.' Message;EXEC dbo.usp_SupplyChain_Import_Get @Id;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_Import_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY
 IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL BEGIN SELECT 400 StatusCode,N'A cancellation reason is required.' Message;RETURN;END;
 DECLARE @Status INT,@LegacyBatchId BIGINT;SELECT @Status=Status,@LegacyBatchId=LegacyProcurementBatchId FROM dbo.SupplyChainImportBatches WHERE Id=@Id;
 IF @Status IS NULL BEGIN SELECT 404 StatusCode,N'Supply-chain import batch was not found.' Message;RETURN;END;
 IF @Status IN(5,6) BEGIN SELECT 409 StatusCode,N'A committed or cancelled import batch cannot be cancelled by this operation.' Message;RETURN;END;
 UPDATE dbo.SupplyChainImportBatches SET Status=6,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=LTRIM(RTRIM(@Reason)) WHERE Id=@Id;
 SELECT 200 StatusCode,N'Supply-chain import batch cancelled.' Message;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK;SELECT 500 StatusCode,ERROR_MESSAGE() Message;END CATCH END;
GO

/* Existing imports remain visible to old Procurement endpoints. New shared imports write legacy batches transactionally on commit. */
SELECT N'SupplyChainFoundation.Tables' CheckName,COUNT(1) ActualCount FROM sys.tables WHERE name IN(N'SalesChannels',N'ChannelSkuMappings',N'ChannelWarehouses',N'ItemPackagingProfiles',N'SupplyChainImportBatches',N'SupplyChainImportRows');
GO
