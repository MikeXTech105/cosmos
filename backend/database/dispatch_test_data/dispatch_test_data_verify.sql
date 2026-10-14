/* Read-only verification for the DSPTEST Dispatch UI scenario. */
SET NOCOUNT ON;
IF DB_NAME() NOT LIKE N'CosmosDispatchIntegrationTests[_]%'
    THROW 52010,N'Refusing verification outside CosmosDispatchIntegrationTests_*.',1;
SELECT DB_NAME() AS DatabaseName, @@SERVERNAME AS ServerName, SUSER_SNAME() AS LoginName;
SELECT c.Id ChannelId,c.Code ChannelCode,w.Id WarehouseId,w.WarehouseCode,w.Priority FROM dbo.SalesChannels c JOIN dbo.ChannelWarehouses w ON w.ChannelId=c.Id WHERE c.Code=N'DSPTEST' ORDER BY w.Priority;
SELECT i.Id ItemId,i.ItemCode,i.Name,i.CurrentStock,i.ReservedStock,m.Id MappingId,m.ChannelSku,p.Id PackagingProfileId,p.UnitsPerBox,s.Id DispatchSettingId,s.RoundingMode,s.SafetyStockFactor,s.RecurringDemandFactor,s.AllocationPriority FROM dbo.Items i JOIN dbo.ChannelSkuMappings m ON m.ItemId=i.Id JOIN dbo.ItemPackagingProfiles p ON p.ItemId=i.Id JOIN dbo.DispatchSkuSettings s ON s.ItemId=i.Id WHERE i.ItemCode LIKE N'DSPTEST-%' AND i.IsDeleted=0 ORDER BY i.ItemCode;
SELECT Id,OriginalFileName,ImportType,Status,TotalRows,ValidRows,InvalidRows,CommittedRows,CommittedAtUtc FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName LIKE N'DSPTEST-%' ORDER BY Id;
SELECT r.Id,r.RunNumber,r.Status,r.PlanningDate,r.Notes,COUNT(x.Id) RecommendationCount,SUM(x.FinalRecommendationQuantity) FinalRecommendationQuantity,SUM(x.AllocatedQuantity) AllocatedQuantity FROM dbo.DispatchPlanningRuns r LEFT JOIN dbo.DispatchRecommendationResults x ON x.PlanningRunId=r.Id WHERE r.Notes LIKE N'DSPTEST%' GROUP BY r.Id,r.RunNumber,r.Status,r.PlanningDate,r.Notes ORDER BY r.Id;
SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.SalesChannels WHERE Code=N'DSPTEST' AND IsActive=1 AND IsDeleted=0) AND (SELECT COUNT(*) FROM dbo.SupplyChainImportBatches WHERE ModuleType=N'DispatchPlanning' AND OriginalFileName LIKE N'DSPTEST-%' AND Status=5)=3 THEN N'READY' ELSE N'NOT READY' END AS ScenarioReadiness;
