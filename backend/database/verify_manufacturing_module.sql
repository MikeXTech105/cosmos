/* Read-only deployment verification. */
SELECT name AS MissingTable FROM (VALUES(N'ManufacturingBoms'),(N'ManufacturingBomItems'),(N'ManufacturingProductions'),(N'ManufacturingProductionMaterials')) x(name) WHERE OBJECT_ID(N'dbo.'+x.name,N'U') IS NULL;
SELECT N'Items.IsManufactured' AS MissingColumn WHERE COL_LENGTH(N'dbo.Items',N'IsManufactured') IS NULL;
SELECT name AS MissingProcedure FROM (VALUES(N'sp_Item_GetById'),(N'sp_Item_GetList'),(N'sp_Item_Create'),(N'sp_Item_Update'),(N'sp_ManufacturingProduction_Post'),(N'sp_ManufacturingProduction_Cancel'),(N'sp_ManufacturingBom_GetApplicable')) x(name) WHERE OBJECT_ID(N'dbo.'+x.name,N'P') IS NULL;
SELECT N'ApplicableBomResolver' AS MissingObject WHERE OBJECT_ID(N'dbo.ufn_ManufacturingBom_Applicable') IS NULL;
SELECT FinishedItemId,COUNT(*) AS DefaultBomCount FROM dbo.ManufacturingBoms WHERE IsDefault=1 AND IsActive=1 AND IsDeleted=0 GROUP BY FinishedItemId HAVING COUNT(*)>1;
SELECT p.Id AS OrphanProduction FROM dbo.ManufacturingProductions p LEFT JOIN dbo.ManufacturingBoms b ON b.Id=p.BomId WHERE b.Id IS NULL;
