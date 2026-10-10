/* Read-only verification after 20261006_unify_procurement_with_manufacturing_boms.sql. */
DECLARE @AsOfDate DATE = CONVERT(DATE, SYSUTCDATETIME());
DECLARE @FinishedItemId BIGINT = 12; /* Change only for a targeted verification; this script makes no data changes. */

IF OBJECT_ID(N'dbo.ufn_ManufacturingBom_Applicable', N'IF') IS NULL
    THROW 51000, 'Applicable Manufacturing BOM resolver is missing.', 1;
IF OBJECT_ID(N'dbo.sp_ManufacturingBom_GetApplicable', N'P') IS NULL
    THROW 51001, 'Applicable Manufacturing BOM procedure is missing.', 1;

SELECT b.Id,b.BomNumber,b.FinishedItemId,b.Version,b.Status,b.IsDefault,b.IsActive,
       b.EffectiveFrom,b.EffectiveTo,
       (SELECT COUNT(*) FROM dbo.ManufacturingBomItems x WHERE x.BomId=b.Id AND x.IsDeleted=0) AS ComponentCount
FROM dbo.ManufacturingBoms b
WHERE b.FinishedItemId=@FinishedItemId AND b.IsDeleted=0
ORDER BY b.EffectiveFrom,b.Version;

SELECT b.Id,b.BomNumber,b.FinishedItemId,b.Version,b.Status,b.IsDefault,b.EffectiveFrom,b.EffectiveTo,
       COUNT(x.Id) AS ComponentCount
FROM dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b
LEFT JOIN dbo.ManufacturingBomItems x ON x.BomId=b.Id AND x.IsDeleted=0
WHERE b.FinishedItemId=@FinishedItemId
GROUP BY b.Id,b.BomNumber,b.FinishedItemId,b.Version,b.Status,b.IsDefault,b.EffectiveFrom,b.EffectiveTo;

EXEC dbo.sp_ManufacturingBom_GetList @FinishedItemId=@FinishedItemId,@PageNumber=1,@PageSize=100;
EXEC dbo.sp_ManufacturingBom_GetApplicable @FinishedItemId=@FinishedItemId,@AsOfDate=@AsOfDate;
EXEC dbo.sp_ProcurementPlanning_Bom_Get @FinishedProductItemId=@FinishedItemId;
EXEC dbo.sp_ProcurementPlanning_Bom_Issues;
