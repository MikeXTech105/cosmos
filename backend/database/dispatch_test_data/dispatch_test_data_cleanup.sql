/*
  DSPTEST cleanup. Refuses if a DSPTEST run exists: runs are lifecycle/audit records
  and must be cancelled/handled through the application before direct seed cleanup.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() NOT LIKE N'CosmosDispatchIntegrationTests[_]%'
    THROW 52020,N'Refusing cleanup outside CosmosDispatchIntegrationTests_*.',1;
IF EXISTS(SELECT 1 FROM dbo.DispatchPlanningRuns WHERE Notes LIKE N'DSPTEST%')
    THROW 52021,N'DSPTEST planning runs exist. Do not delete lifecycle data directly; use the application or recreate the disposable test database.',1;
BEGIN TRY
 BEGIN TRANSACTION;
 DELETE s FROM dbo.DispatchImportStagedRows s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId WHERE b.ModuleType=N'DispatchPlanning' AND b.OriginalFileName LIKE N'DSPTEST-%';
 DELETE s FROM dbo.DispatchWarehouseSalesSnapshots s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId WHERE b.ModuleType=N'DispatchPlanning' AND b.OriginalFileName LIKE N'DSPTEST-%';
 DELETE s FROM dbo.DispatchWarehouseStockSnapshots s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId WHERE b.ModuleType=N'DispatchPlanning' AND b.OriginalFileName LIKE N'DSPTEST-%';
 DELETE s FROM dbo.DispatchWarehouseInboundSnapshots s JOIN dbo.SupplyChainImportBatches b ON b.Id=s.ImportBatchId WHERE b.ModuleType=N'DispatchPlanning' AND b.OriginalFileName LIKE N'DSPTEST-%';
 DELETE r FROM dbo.SupplyChainImportRows r JOIN dbo.SupplyChainImportBatches b ON b.Id=r.BatchId WHERE b.ModuleType=N'DispatchPlanning' AND b.OriginalFileName LIKE N'DSPTEST-%';
 DELETE FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName LIKE N'DSPTEST-%';
 DELETE FROM dbo.DispatchSkuSettings WHERE ItemId IN(SELECT Id FROM dbo.Items WHERE ItemCode LIKE N'DSPTEST-%');
 DELETE FROM dbo.ItemPackagingProfiles WHERE ItemId IN(SELECT Id FROM dbo.Items WHERE ItemCode LIKE N'DSPTEST-%');
 DELETE FROM dbo.ChannelSkuMappings WHERE SalesChannelId IN(SELECT Id FROM dbo.SalesChannels WHERE Code=N'DSPTEST');
 DELETE FROM dbo.ChannelWarehouses WHERE ChannelId IN(SELECT Id FROM dbo.SalesChannels WHERE Code=N'DSPTEST');
 DELETE FROM dbo.SalesChannels WHERE Code=N'DSPTEST';
 DELETE FROM dbo.Items WHERE ItemCode LIKE N'DSPTEST-%';
 DELETE FROM dbo.Categories WHERE Name=N'DSPTEST Dispatch Category' AND NOT EXISTS(SELECT 1 FROM dbo.Items WHERE CategoryId=dbo.Categories.Id);
 DELETE FROM dbo.Units WHERE ShortName=N'DSPT' AND NOT EXISTS(SELECT 1 FROM dbo.Items WHERE UnitId=dbo.Units.Id);
 COMMIT TRANSACTION;
 SELECT N'DSPTEST seed data removed.' Result;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH;
