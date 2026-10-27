SET XACT_ABORT ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ProductionPlanning_MaterialInputs @CompanyKey NVARCHAR(64),@UserId BIGINT,@RequestJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Snapshot UNIQUEIDENTIFIER=TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(@RequestJson,'$.snapshotId')),@AsOf DATE,@Data NVARCHAR(MAX);
 SELECT @AsOf=AsOfDate FROM dbo.ProductionPlanningSnapshots WHERE Id=@Snapshot AND CompanyKey=@CompanyKey;
 IF @AsOf IS NULL THROW 51104,N'NOT_FOUND|Source planning snapshot was not found.',1;
 DECLARE @Outputs TABLE(ItemId BIGINT PRIMARY KEY,Quantity DECIMAL(22,6));
 INSERT @Outputs SELECT * FROM OPENJSON(@RequestJson,'$.outputs') WITH(ItemId BIGINT '$.itemId',Quantity DECIMAL(22,6) '$.quantity');
 IF NOT EXISTS(SELECT 1 FROM @Outputs) OR EXISTS(SELECT 1 FROM @Outputs x WHERE x.Quantity<0 OR NOT EXISTS(SELECT 1 FROM dbo.ProductionPlanningSnapshots p CROSS APPLY OPENJSON(p.SnapshotJson,'$.lines') WITH(ItemId BIGINT '$.itemId') l WHERE p.Id=@Snapshot AND p.CompanyKey=@CompanyKey AND l.ItemId=x.ItemId)) THROW 51100,N'INVALID_PLAN_LINE|What-if output must refer to a source planning Item.',1;
 IF EXISTS(SELECT 1 FROM @Outputs x WHERE (SELECT COUNT(*) FROM dbo.ManufacturingBoms b WHERE b.FinishedItemId=x.ItemId AND b.Status=2 AND b.IsActive=1 AND b.IsDeleted=0 AND b.EffectiveFrom<=@AsOf AND(b.EffectiveTo IS NULL OR b.EffectiveTo>=@AsOf))<>1) THROW 51109,N'BOM_AMBIGUOUS_OR_INEFFECTIVE|Every selected output requires exactly one effective approved canonical BOM.',1;
 IF EXISTS(SELECT 1 FROM @Outputs x JOIN dbo.ufn_ManufacturingBom_Applicable(@AsOf) b ON b.FinishedItemId=x.ItemId WHERE NOT EXISTS(SELECT 1 FROM dbo.ManufacturingBomItems WHERE BomId=b.Id AND IsDeleted=0)) THROW 51109,N'EMPTY_BOM|A selected product has no material components.',1;
 IF EXISTS(SELECT 1 FROM @Outputs x JOIN dbo.ufn_ManufacturingBom_Applicable(@AsOf) b ON b.FinishedItemId=x.ItemId JOIN dbo.ManufacturingBomItems m ON m.BomId=b.Id AND m.IsDeleted=0 JOIN dbo.Items i ON i.Id=m.ComponentItemId WHERE i.IsActive=0 OR i.IsDeleted=1 OR i.TrackInventory=0 OR i.UnitId<>m.UnitId) THROW 51109,N'COMPONENT_UNIT_UNAVAILABLE|Verify active components and base-unit conversions before material explosion.',1;
 SET @Data=(SELECT x.ItemId ProductItemId,x.Quantity OutputQuantity,m.ComponentItemId MaterialItemId,m.UnitId,
  CONVERT(DECIMAL(28,12),m.Quantity/b.OutputBaseQuantity) QuantityPerOutput,m.WastagePercentage WastePercent,i.CurrentStock PhysicalStock,i.ReservedStock,
  b.Id BomId,b.Version BomVersion,CONVERT(DECIMAL(22,6),0.000001) OutputIncrement
  FROM @Outputs x JOIN dbo.ManufacturingBoms b ON b.FinishedItemId=x.ItemId AND b.Status=2 AND b.IsActive=1 AND b.IsDeleted=0 AND b.EffectiveFrom<=@AsOf AND(b.EffectiveTo IS NULL OR b.EffectiveTo>=@AsOf)
  JOIN dbo.ManufacturingBomItems m ON m.BomId=b.Id AND m.IsDeleted=0 JOIN dbo.Items i ON i.Id=m.ComponentItemId ORDER BY x.ItemId,m.ComponentItemId FOR JSON PATH);
 EXEC dbo.sp_ProductionWorkspace_Result @Data;
END;
GO
