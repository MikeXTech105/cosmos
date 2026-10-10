/* Run after the two 20260727 Supply Chain migrations. Fails fast on a broken contract. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @RequiredTables TABLE(Name SYSNAME PRIMARY KEY);
INSERT @RequiredTables VALUES
 (N'SalesChannels'),(N'ChannelSkuMappings'),(N'ChannelWarehouses'),(N'ItemPackagingProfiles'),(N'SupplyChainImportBatches'),(N'SupplyChainImportRows'),(N'ProcurementInboundStockSnapshots');
IF EXISTS(SELECT 1 FROM @RequiredTables r WHERE OBJECT_ID(N'dbo.'+r.Name,N'U') IS NULL)
    THROW 51000, 'Supply-chain verification failed: required table is missing.', 1;

DECLARE @RequiredColumns TABLE(TableName SYSNAME,ColumnName SYSNAME,TypeName SYSNAME,PRIMARY KEY(TableName,ColumnName));
INSERT @RequiredColumns VALUES
 (N'SalesChannels',N'Description',N'nvarchar'),(N'SalesChannels',N'DeletedAtUtc',N'datetime2'),
 (N'ChannelSkuMappings',N'ExternalItemId',N'nvarchar'),(N'ChannelSkuMappings',N'IsPrimary',N'bit'),(N'ChannelSkuMappings',N'EffectiveFrom',N'date'),(N'ChannelSkuMappings',N'EffectiveTo',N'date'),
 (N'ChannelWarehouses',N'ChannelId',N'bigint'),(N'ChannelWarehouses',N'WarehouseCode',N'nvarchar'),(N'ChannelWarehouses',N'IsDeleted',N'bit'),
 (N'ItemPackagingProfiles',N'ItemId',N'bigint'),(N'ItemPackagingProfiles',N'CalculatedVolumetricWeight',N'decimal'),(N'ItemPackagingProfiles',N'DimensionUnit',N'nvarchar'),(N'ItemPackagingProfiles',N'WeightUnit',N'nvarchar'),
 (N'SupplyChainImportBatches',N'ImportType',N'nvarchar'),(N'SupplyChainImportBatches',N'FileHash',N'char'),(N'SupplyChainImportBatches',N'CorrelationId',N'nvarchar'),
 (N'SupplyChainImportRows',N'ErrorsJson',N'nvarchar'),(N'ProcurementInboundStockSnapshots',N'InboundQuantity',N'decimal'),
 (N'ProcurementPlanningRunLines',N'InboundStock',N'decimal'),(N'ProcurementPlanningRunLines',N'ProjectedAvailableStock',N'decimal');
IF EXISTS
(
    SELECT 1 FROM @RequiredColumns r
    LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(N'dbo.'+r.TableName) AND c.name=r.ColumnName
    LEFT JOIN sys.types t ON t.user_type_id=c.user_type_id
    WHERE c.column_id IS NULL OR t.name<>r.TypeName
)
    THROW 51001, 'Supply-chain verification failed: required column or data type is missing.', 1;

DECLARE @RequiredForeignKeys TABLE(Name SYSNAME PRIMARY KEY);
INSERT @RequiredForeignKeys VALUES
 (N'FK_ChannelWarehouses_SalesChannels'),(N'FK_ItemPackagingProfiles_Items'),(N'FK_ItemPackagingProfiles_SalesChannels'),
 (N'FK_SupplyChainImportBatches_Channel'),(N'FK_SupplyChainImportRows_Batch'),(N'FK_SupplyChainImportRows_Channel'),(N'FK_SupplyChainImportRows_Item'),(N'FK_ProcurementInboundStockSnapshots_Items');
IF EXISTS(SELECT 1 FROM @RequiredForeignKeys r WHERE NOT EXISTS(SELECT 1 FROM sys.foreign_keys f WHERE f.name=r.Name))
    THROW 51002, 'Supply-chain verification failed: required foreign key is missing.', 1;

DECLARE @RequiredIndexes TABLE(Name SYSNAME PRIMARY KEY);
INSERT @RequiredIndexes VALUES
 (N'UX_SalesChannels_Code'),(N'UX_SalesChannels_Name'),(N'UX_ChannelSkuMappings_ActiveSku'),(N'UX_ChannelSkuMappings_Primary'),
 (N'UX_ChannelWarehouses_ChannelCode'),(N'UX_ItemPackagingProfiles_DefaultGlobal'),(N'UX_ItemPackagingProfiles_DefaultChannel'),(N'IX_SupplyChainImportBatches_Hash');
IF EXISTS(SELECT 1 FROM @RequiredIndexes r WHERE NOT EXISTS(SELECT 1 FROM sys.indexes i WHERE i.name=r.Name))
    THROW 51003, 'Supply-chain verification failed: required index is missing.', 1;
IF EXISTS(SELECT 1 FROM sys.indexes WHERE name IN(N'UX_SalesChannels_Code',N'UX_SalesChannels_Name',N'UX_ChannelSkuMappings_Primary',N'UX_ItemPackagingProfiles_DefaultGlobal',N'UX_ItemPackagingProfiles_DefaultChannel') AND has_filter=0)
    THROW 51004, 'Supply-chain verification failed: a required unique index is not filtered.', 1;

DECLARE @RequiredProcedures TABLE(Name SYSNAME PRIMARY KEY);
INSERT @RequiredProcedures VALUES
 (N'usp_SupplyChain_Channel_List'),(N'usp_SupplyChain_Channel_Save'),(N'usp_SupplyChain_Warehouse_List'),(N'usp_SupplyChain_Warehouse_Save'),
 (N'usp_SupplyChain_ItemMapping_List'),(N'usp_SupplyChain_ItemMapping_Save'),(N'usp_SupplyChain_PackagingProfile_List'),(N'usp_SupplyChain_PackagingProfile_Save'),
 (N'usp_SupplyChain_Import_Validate'),(N'usp_SupplyChain_Import_Commit'),(N'usp_SupplyChain_Import_Cancel'),(N'usp_ProcurementInboundSnapshot_Save'),(N'usp_ProcurementPlanning_Run_Cancel');
IF EXISTS(SELECT 1 FROM @RequiredProcedures r WHERE OBJECT_ID(N'dbo.'+r.Name,N'P') IS NULL)
    THROW 51005, 'Supply-chain verification failed: required procedure is missing.', 1;

IF EXISTS(SELECT 1 FROM sys.procedures WHERE name LIKE N'usp_SupplyChain%' AND name LIKE N'sp[_]%')
    THROW 51006, 'Supply-chain verification failed: a new procedure uses the reserved sp_ prefix.', 1;

IF (SELECT COUNT(DISTINCT Code) FROM dbo.SalesChannels WHERE Code IN(N'AMZ',N'BLI',N'INS') AND IsDeleted=0)<>3
    THROW 51007, 'Supply-chain verification failed: AMZ, BLI, and INS channel seeds are missing.', 1;
IF EXISTS(SELECT Code FROM dbo.SalesChannels WHERE IsDeleted=0 GROUP BY Code HAVING COUNT(*)>1)
    THROW 51008, 'Supply-chain verification failed: duplicate active channel code.', 1;
IF EXISTS(SELECT ChannelId,WarehouseCode FROM dbo.ChannelWarehouses WHERE IsDeleted=0 GROUP BY ChannelId,WarehouseCode HAVING COUNT(*)>1)
    THROW 51009, 'Supply-chain verification failed: duplicate warehouse code within a channel.', 1;
IF EXISTS(SELECT SalesChannelId,ChannelSku FROM dbo.ChannelSkuMappings WHERE IsDeleted=0 GROUP BY SalesChannelId,ChannelSku HAVING COUNT(*)>1)
    THROW 51010, 'Supply-chain verification failed: duplicate channel SKU.', 1;
IF EXISTS(SELECT ItemId,ChannelId FROM dbo.ItemPackagingProfiles WHERE IsDeleted=0 AND IsActive=1 AND IsDefault=1 GROUP BY ItemId,ChannelId HAVING COUNT(*)>1)
    THROW 51011, 'Supply-chain verification failed: multiple default packaging profiles.', 1;
IF EXISTS(SELECT 1 FROM dbo.ChannelWarehouses w LEFT JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE c.Id IS NULL)
    THROW 51012, 'Supply-chain verification failed: orphan warehouse reference.', 1;
IF EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings m LEFT JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId LEFT JOIN dbo.Items i ON i.Id=m.ItemId WHERE c.Id IS NULL OR i.Id IS NULL)
    THROW 51013, 'Supply-chain verification failed: orphan channel Item mapping reference.', 1;
IF EXISTS(SELECT 1 FROM dbo.ProcurementSalesHistory s LEFT JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId WHERE c.Id IS NULL)
    THROW 51014, 'Supply-chain verification failed: Procurement channel reference is not aligned to the shared master.', 1;
IF OBJECT_ID(N'dbo.Channels',N'U') IS NOT NULL OR OBJECT_ID(N'dbo.ChannelItemMappings',N'U') IS NOT NULL
    THROW 51015, 'Supply-chain verification failed: duplicate shared channel or Item mapping table detected.', 1;

DECLARE @RequiredPages TABLE(Name NVARCHAR(100) PRIMARY KEY);
INSERT @RequiredPages VALUES(N'SupplyChain.Channels'),(N'SupplyChain.Warehouses'),(N'SupplyChain.ItemMappings'),(N'SupplyChain.PackagingProfiles'),(N'SupplyChain.Imports');
IF EXISTS(SELECT 1 FROM @RequiredPages p LEFT JOIN dbo.Pages pg ON pg.Name=p.Name AND pg.IsActive=1 WHERE pg.Id IS NULL)
    THROW 51016, 'Supply-chain verification failed: required page seed is missing.', 1;
DECLARE @SuperAdminId INT=(SELECT Id FROM dbo.Roles WHERE Name=N'SuperAdmin');
IF @SuperAdminId IS NOT NULL AND EXISTS(SELECT 1 FROM @RequiredPages p JOIN dbo.Pages pg ON pg.Name=p.Name LEFT JOIN dbo.RolePermissions rp ON rp.PageId=pg.Id AND rp.RoleId=@SuperAdminId WHERE rp.PageId IS NULL)
    THROW 51017, 'Supply-chain verification failed: SuperAdmin permission seed is missing.', 1;

SELECT N'Supply-chain common foundation verification passed.' Result,
       (SELECT COUNT(1) FROM dbo.SalesChannels WHERE IsDeleted=0) ActiveChannels,
       (SELECT COUNT(1) FROM dbo.ChannelWarehouses WHERE IsDeleted=0) ActiveWarehouses,
       (SELECT COUNT(1) FROM dbo.ChannelSkuMappings WHERE IsDeleted=0) ActiveItemMappings,
       (SELECT COUNT(1) FROM dbo.ItemPackagingProfiles WHERE IsDeleted=0) ActivePackagingProfiles;
