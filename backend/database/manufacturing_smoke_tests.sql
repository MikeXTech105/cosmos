/* Run only in an approved disposable database after the Manufacturing migration. Rolls back all data changes. */
SET XACT_ABORT ON;
BEGIN TRANSACTION;
/* Preconditions: replace the IDs below with active, inventory-tracked raw/finished Items and an active BOM. */
DECLARE @FinishedItemId BIGINT = 8, @BomId BIGINT = 1, @UserId BIGINT = 1;
IF @FinishedItemId IS NULL OR @BomId IS NULL THROW 51000, 'Set @FinishedItemId and @BomId before running this smoke test.', 1;
DECLARE @BeforeFinished DECIMAL(18,4)=(SELECT CurrentStock FROM dbo.Items WHERE Id=@FinishedItemId);
DECLARE @ProductionDate DATE = CONVERT(DATE, SYSUTCDATETIME());
EXEC dbo.sp_ManufacturingProduction_Create @ProductionDate=@ProductionDate,@FinishedItemId=@FinishedItemId,@BomId=@BomId,@PlannedQuantity=1,@ProducedQuantity=1,@Notes=N'Smoke test',@ReferenceNumber=N'SMOKE',@UserId=@UserId;
DECLARE @ProductionId BIGINT=(SELECT TOP(1) Id FROM dbo.ManufacturingProductions WHERE ReferenceNumber=N'SMOKE' ORDER BY Id DESC);
EXEC dbo.sp_ManufacturingProduction_Post @Id=@ProductionId,@UserId=@UserId;
IF (SELECT Status FROM dbo.ManufacturingProductions WHERE Id=@ProductionId)<>2 THROW 51004, 'Production was not posted. Inspect the procedure result set for the business conflict code.', 1;
IF NOT EXISTS(SELECT 1 FROM dbo.StockMovements WHERE SourceType=N'ManufacturingProduction' AND SourceId=@ProductionId) THROW 51001, 'Expected manufacturing stock movements were not created.', 1;
IF (SELECT CurrentStock FROM dbo.Items WHERE Id=@FinishedItemId) <= @BeforeFinished THROW 51002, 'Finished-item stock was not increased.', 1;
EXEC dbo.sp_ManufacturingProduction_Cancel @Id=@ProductionId,@Reason=N'Smoke rollback',@UserId=@UserId;
IF (SELECT Status FROM dbo.ManufacturingProductions WHERE Id=@ProductionId)<>3 THROW 51003, 'Production was not cancelled.', 1;
ROLLBACK TRANSACTION;
