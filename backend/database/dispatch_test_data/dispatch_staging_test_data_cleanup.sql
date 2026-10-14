/* DATA-CHANGING. Run manually only after approval, on srv1791248 / CosmosERP_Staging. */
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME()<>N'CosmosERP_Staging' OR @@SERVERNAME<>N'srv1791248' THROW 52220,N'Refusing outside approved staging.',1;
DECLARE @P NVARCHAR(30)=N'DSPSTG20261014';
/* A run is operational/audited data. Never delete it or its dependents directly. */
IF EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Notes LIKE @P+N'%') THROW 52221,N'Scenario run exists. Cancel/manage it through the UI; this cleanup will not delete runs.',1;
/* Ownership is established only by the exact scenario channel plus prefixed batch names. */
IF EXISTS(SELECT 1 FROM dbo.SupplyChainImportBatches b WHERE b.OriginalFileName LIKE @P+N'%' AND NOT EXISTS(SELECT 1 FROM dbo.SalesChannels c WHERE c.Id=b.ChannelId AND c.Code=@P)) THROW 52222,N'Batch ownership cannot be established.',1;
BEGIN TRY BEGIN TRAN;
DELETE s FROM dbo.DispatchImportStagedRows s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE c.Code=@P AND b.OriginalFileName LIKE @P+N'%';
DELETE s FROM dbo.DispatchWarehouseSalesSnapshots s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE c.Code=@P AND b.OriginalFileName LIKE @P+N'%';
DELETE s FROM dbo.DispatchWarehouseStockSnapshots s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE c.Code=@P AND b.OriginalFileName LIKE @P+N'%';
DELETE s FROM dbo.DispatchWarehouseInboundSnapshots s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE c.Code=@P AND b.OriginalFileName LIKE @P+N'%';
DELETE r FROM dbo.SupplyChainImportRows r JOIN dbo.SupplyChainImportBatches b ON b.Id=r.BatchId JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE c.Code=@P AND b.OriginalFileName LIKE @P+N'%';
DELETE b FROM dbo.SupplyChainImportBatches b JOIN dbo.SalesChannels c ON c.Id=b.ChannelId WHERE c.Code=@P AND b.OriginalFileName LIKE @P+N'%';
DELETE s FROM dbo.DispatchSkuSettings s JOIN dbo.Items i ON i.Id=s.ItemId WHERE i.ItemCode LIKE @P+N'%'; DELETE p FROM dbo.ItemPackagingProfiles p JOIN dbo.Items i ON i.Id=p.ItemId WHERE i.ItemCode LIKE @P+N'%'; DELETE m FROM dbo.ChannelSkuMappings m JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId WHERE c.Code=@P; DELETE w FROM dbo.ChannelWarehouses w JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE c.Code=@P; DELETE FROM dbo.SalesChannels WHERE Code=@P; DELETE FROM dbo.Items WHERE ItemCode LIKE @P+N'%'; DELETE c FROM dbo.Categories c WHERE c.Name=@P+N' Dispatch Category' AND NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.CategoryId=c.Id); DELETE u FROM dbo.Units u WHERE u.ShortName=N'DS14' AND u.Name=@P+N' Unit' AND NOT EXISTS(SELECT 1 FROM dbo.Items i WHERE i.UnitId=u.Id); COMMIT; SELECT N'Owned staging scenario input data removed.' Result;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
