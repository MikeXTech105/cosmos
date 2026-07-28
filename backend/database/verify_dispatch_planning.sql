/* Run after the prerequisite Supply Chain and Dispatch Planning migrations. Read-only verification. */
SET NOCOUNT ON;

DECLARE @RequiredTables TABLE(Name SYSNAME);
INSERT @RequiredTables VALUES
 (N'DispatchSkuSettings'),(N'DispatchImportStagedRows'),(N'DispatchWarehouseSalesSnapshots'),
 (N'DispatchWarehouseStockSnapshots'),(N'DispatchWarehouseInboundSnapshots'),(N'DispatchPlanningRuns'),
 (N'DispatchCompanyStockSnapshots'),(N'DispatchRecommendationResults'),(N'DispatchAllocations');

IF EXISTS(SELECT 1 FROM @RequiredTables x WHERE OBJECT_ID(N'dbo.'+x.Name,N'U') IS NULL)
    THROW 52000,N'Dispatch Planning table verification failed.',1;

DECLARE @RequiredProcedures TABLE(Name SYSNAME);
INSERT @RequiredProcedures VALUES
 (N'usp_DispatchPlanning_SkuSettings_Get'),(N'usp_DispatchPlanning_SkuSettings_List'),(N'usp_DispatchPlanning_SkuSettings_Save'),(N'usp_DispatchPlanning_SkuSettings_Delete'),
 (N'usp_DispatchPlanning_Import_Validate'),(N'usp_DispatchPlanning_Import_Commit'),(N'usp_DispatchPlanning_Import_Cancel'),(N'usp_DispatchPlanning_Import_List'),
 (N'usp_DispatchPlanning_Run_Create'),(N'usp_DispatchPlanning_Run_CalculationInputs'),(N'usp_DispatchPlanning_Run_SaveCalculation'),(N'usp_DispatchPlanning_Run_Allocate'),(N'usp_DispatchPlanning_Run_Finalize'),(N'usp_DispatchPlanning_Run_Cancel'),
 (N'usp_DispatchPlanning_Report_Recommendations');

IF EXISTS(SELECT 1 FROM @RequiredProcedures x WHERE OBJECT_ID(N'dbo.'+x.Name,N'P') IS NULL)
    THROW 52001,N'Dispatch Planning procedure verification failed.',1;

IF COL_LENGTH(N'dbo.DispatchWarehouseStockSnapshots',N'SellableQuantity') IS NULL
    THROW 52002,N'SellableQuantity computed snapshot column is missing.',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.DispatchRecommendationResults') AND name=N'CK_DispatchRecommendationResults_Values')
    THROW 52003,N'Dispatch recommendation allocation bounds constraint is missing.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Pages WHERE Name=N'DispatchPlanning')
    THROW 52004,N'Dispatch Planning parent page is missing.',1;
IF EXISTS(SELECT 1 FROM dbo.Pages WHERE Name IN(N'DispatchPlanning.SkuSettings',N'DispatchPlanning.Imports',N'DispatchPlanning.PlanningRuns',N'DispatchPlanning.Allocation',N'DispatchPlanning.Reports') GROUP BY Name HAVING COUNT(*)<>1)
    THROW 52005,N'Dispatch Planning permission pages are incomplete or duplicated.',1;

/* The module is intentionally planning-only. No Dispatch procedure may write Items or StockMovements. */
IF EXISTS
(
    SELECT 1 FROM sys.sql_modules m JOIN sys.objects o ON o.object_id=m.object_id
    WHERE o.name LIKE N'usp_DispatchPlanning_%' AND (m.definition LIKE N'%UPDATE dbo.Items%' OR m.definition LIKE N'%INSERT dbo.StockMovements%')
)
    THROW 52006,N'Dispatch Planning must not mutate Items stock or create StockMovements.',1;

SELECT N'PASS' Result, N'Dispatch Planning schema, procedures, pages, allocation constraints, and no-stock-mutation guard verified.' Detail;
