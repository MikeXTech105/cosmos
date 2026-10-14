/* READ-ONLY staging scenario verification. */
SET NOCOUNT ON;
IF DB_NAME()<>N'CosmosERP_Staging' OR @@SERVERNAME<>N'srv1791248' THROW 52210,N'Refusing outside approved staging.',1;
DECLARE @P NVARCHAR(30)=N'DSPSTG20261014';
SELECT @@SERVERNAME ServerName,DB_NAME() DatabaseName,SUSER_SNAME() LoginName;
SELECT c.Id ChannelId,c.Code,w.Id WarehouseId,w.WarehouseCode,w.Priority FROM dbo.SalesChannels c JOIN dbo.ChannelWarehouses w ON w.ChannelId=c.Id WHERE c.Code=@P;
SELECT i.Id ItemId,i.ItemCode,i.CurrentStock,m.ChannelSku,p.PackagingCode,p.UnitsPerBox,s.RoundingMode,s.SafetyStockFactor,s.RecurringDemandFactor FROM dbo.Items i LEFT JOIN dbo.ChannelSkuMappings m ON m.ItemId=i.Id LEFT JOIN dbo.ItemPackagingProfiles p ON p.ItemId=i.Id LEFT JOIN dbo.DispatchSkuSettings s ON s.ItemId=i.Id WHERE i.ItemCode LIKE @P+N'%';
SELECT Id,OriginalFileName,ImportType,Status,TotalRows,ValidRows,InvalidRows,CommittedRows,CommittedAtUtc FROM dbo.SupplyChainImportBatches WHERE OriginalFileName LIKE @P+N'%';
SELECT r.Id,r.RunNumber,r.Status,r.Notes,COUNT(x.Id) RecommendationCount FROM dbo.DispatchPlanningRuns r LEFT JOIN dbo.DispatchRecommendationResults x ON x.PlanningRunId=r.Id WHERE r.Notes LIKE @P+N'%' GROUP BY r.Id,r.RunNumber,r.Status,r.Notes;
