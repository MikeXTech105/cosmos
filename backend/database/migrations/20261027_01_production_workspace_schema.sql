/* Additive production workspace. CatalogCompanyKey must be configured by the operator.
   No source workbook value, company, stock balance, routing or resource mapping is seeded. */
SET XACT_ABORT ON;
GO
-- Existing canonical BOM contracts are per one base output. This preserves that verified convention.
IF COL_LENGTH('dbo.ManufacturingBoms','OutputBaseQuantity') IS NULL
 ALTER TABLE dbo.ManufacturingBoms ADD OutputBaseQuantity DECIMAL(22,6) NOT NULL CONSTRAINT DF_MB_OutputBasis DEFAULT(1) CONSTRAINT CK_MB_OutputBasis CHECK(OutputBaseQuantity>0);
IF COL_LENGTH('dbo.ManufacturingBoms','ConcurrencyVersion') IS NULL ALTER TABLE dbo.ManufacturingBoms ADD ConcurrencyVersion ROWVERSION;
GO
IF OBJECT_ID('dbo.ProductionWorkCentres','U') IS NULL
CREATE TABLE dbo.ProductionWorkCentres(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, Code NVARCHAR(50) NOT NULL,
 Name NVARCHAR(200) NOT NULL, IsActive BIT NOT NULL, DefaultShiftId BIGINT NULL REFERENCES dbo.HR_Shifts(Id),
 CapacityBasis NVARCHAR(20) NOT NULL CHECK(CapacityBasis=N'Minutes'), Notes NVARCHAR(1000) NULL,
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 ModifiedBy BIGINT NULL, ModifiedAtUtc DATETIME2(3) NULL, RowVersion ROWVERSION,
 CONSTRAINT UQ_PWC_Code UNIQUE(CompanyKey,Code));
IF OBJECT_ID('dbo.ProductionOperations','U') IS NULL
CREATE TABLE dbo.ProductionOperations(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, Code NVARCHAR(50) NOT NULL,
 Name NVARCHAR(200) NOT NULL, IsActive BIT NOT NULL, RateBasis INT NOT NULL CHECK(RateBasis IN(1,2,3)),
 DefaultRate DECIMAL(22,6) NULL CHECK(DefaultRate>0), Notes NVARCHAR(1000) NULL,
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 ModifiedBy BIGINT NULL, ModifiedAtUtc DATETIME2(3) NULL, RowVersion ROWVERSION,
 CONSTRAINT UQ_POP_Code UNIQUE(CompanyKey,Code));
IF OBJECT_ID('dbo.ItemProductionRoutings','U') IS NULL
CREATE TABLE dbo.ItemProductionRoutings(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),
 Revision NVARCHAR(50) NOT NULL, EffectiveFrom DATE NOT NULL, EffectiveTo DATE NULL, IsActive BIT NOT NULL DEFAULT 1,
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), RowVersion ROWVERSION,
 CONSTRAINT CK_IPR_Dates CHECK(EffectiveTo IS NULL OR EffectiveTo>=EffectiveFrom),
 CONSTRAINT UQ_IPR_Revision UNIQUE(CompanyKey,ItemId,Revision));
IF OBJECT_ID('dbo.ItemProductionRoutingSteps','U') IS NULL
CREATE TABLE dbo.ItemProductionRoutingSteps(
 Id BIGINT IDENTITY PRIMARY KEY, RoutingId BIGINT NOT NULL REFERENCES dbo.ItemProductionRoutings(Id),
 Sequence INT NOT NULL CHECK(Sequence>0), OperationId BIGINT NOT NULL REFERENCES dbo.ProductionOperations(Id),
 WorkCentreId BIGINT NOT NULL REFERENCES dbo.ProductionWorkCentres(Id), RateBasis INT NOT NULL CHECK(RateBasis IN(1,2,3)),
 Rate DECIMAL(22,6) NOT NULL CHECK(Rate>0), SetupMinutes DECIMAL(22,6) NOT NULL CHECK(SetupMinutes>=0),
 QuantityBasis DECIMAL(22,6) NOT NULL CHECK(QuantityBasis>0), MachineId BIGINT NULL REFERENCES dbo.OeeMachines(Id),
 MouldId BIGINT NULL REFERENCES dbo.OeeMoulds(Id), CONSTRAINT UQ_IPRS_Sequence UNIQUE(RoutingId,Sequence));
IF OBJECT_ID('dbo.ItemProductionEligibility','U') IS NULL
CREATE TABLE dbo.ItemProductionEligibility(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),
 MachineId BIGINT NOT NULL REFERENCES dbo.OeeMachines(Id), MouldId BIGINT NOT NULL REFERENCES dbo.OeeMoulds(Id),
 SkuOutputPerShot DECIMAL(22,6) NOT NULL CHECK(SkuOutputPerShot>0), EffectiveFrom DATE NOT NULL,
 EffectiveTo DATE NULL, IsActive BIT NOT NULL, CreatedBy BIGINT NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), RowVersion ROWVERSION,
 CONSTRAINT CK_IPE_Dates CHECK(EffectiveTo IS NULL OR EffectiveTo>=EffectiveFrom));
IF OBJECT_ID('dbo.ProductionWorkCentreShifts','U') IS NULL
CREATE TABLE dbo.ProductionWorkCentreShifts(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL,
 WorkCentreId BIGINT NOT NULL REFERENCES dbo.ProductionWorkCentres(Id), ShiftId BIGINT NOT NULL REFERENCES dbo.HR_Shifts(Id),
 EffectiveFrom DATE NOT NULL, EffectiveTo DATE NULL, BreakMinutes INT NOT NULL CHECK(BreakMinutes>=0),
 CapacityFactor DECIMAL(9,6) NOT NULL CHECK(CapacityFactor>0 AND CapacityFactor<=1), IsActive BIT NOT NULL,
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), RowVersion ROWVERSION,
 CONSTRAINT CK_PWCS_Dates CHECK(EffectiveTo IS NULL OR EffectiveTo>=EffectiveFrom));
IF OBJECT_ID('dbo.ProductionOrders','U') IS NULL
CREATE TABLE dbo.ProductionOrders(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, OrderNumber NVARCHAR(50) NOT NULL,
 Status INT NOT NULL DEFAULT 1 CHECK(Status BETWEEN 1 AND 6), BusinessDate DATE NOT NULL,
 PlannedStart DATE NOT NULL, DueDate DATE NOT NULL, ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),
 UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id), BomId BIGINT NOT NULL REFERENCES dbo.ManufacturingBoms(Id),
 RoutingId BIGINT NOT NULL REFERENCES dbo.ItemProductionRoutings(Id),
 PlannedQuantity DECIMAL(22,6) NOT NULL CHECK(PlannedQuantity>0), ReleasedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,
 CompletedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0, RejectedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,
 MachineId BIGINT NOT NULL REFERENCES dbo.OeeMachines(Id), MouldId BIGINT NOT NULL REFERENCES dbo.OeeMoulds(Id),
 ShiftId BIGINT NOT NULL REFERENCES dbo.HR_Shifts(Id), ChannelId BIGINT NULL REFERENCES dbo.SalesChannels(Id),
 SourcePlanId UNIQUEIDENTIFIER NULL, SourceLineId NVARCHAR(100) NULL, Reference NVARCHAR(100) NULL,
 Notes NVARCHAR(1000) NULL, BomSnapshotJson NVARCHAR(MAX) NULL, RouteSnapshotJson NVARCHAR(MAX) NULL,
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 ModifiedBy BIGINT NULL, ModifiedAtUtc DATETIME2(3) NULL, RowVersion ROWVERSION,
 CONSTRAINT UQ_PO_Number UNIQUE(CompanyKey,OrderNumber),
 CONSTRAINT CK_PO_Quantities CHECK(ReleasedQuantity>=0 AND ReleasedQuantity<=PlannedQuantity AND CompletedQuantity>=0 AND RejectedQuantity>=0 AND CompletedQuantity+RejectedQuantity<=ReleasedQuantity),
 CONSTRAINT CK_PO_Dates CHECK(DueDate>=PlannedStart));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionOrders') AND name='UX_PO_SourceLine')
 CREATE UNIQUE INDEX UX_PO_SourceLine ON dbo.ProductionOrders(CompanyKey,SourcePlanId,SourceLineId) WHERE SourcePlanId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionOrders') AND name='IX_PO_StatusDate')
 CREATE INDEX IX_PO_StatusDate ON dbo.ProductionOrders(CompanyKey,Status,DueDate,Id) INCLUDE(ItemId,ReleasedQuantity,CompletedQuantity,RejectedQuantity);
IF OBJECT_ID('dbo.ProductionOrderMaterials','U') IS NULL
CREATE TABLE dbo.ProductionOrderMaterials(
 Id BIGINT IDENTITY PRIMARY KEY, OrderId BIGINT NOT NULL REFERENCES dbo.ProductionOrders(Id),
 ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id), UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id),
 QuantityPerOutput DECIMAL(28,12) NOT NULL CHECK(QuantityPerOutput>0),
 WastePercent DECIMAL(9,6) NOT NULL CHECK(WastePercent BETWEEN 0 AND 100),
 RequiredQuantity DECIMAL(22,6) NOT NULL, ConsumedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,
 BaselineOutputQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,BaselineExpectedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,
 SourceComponentQuantity DECIMAL(22,6) NOT NULL, OutputBaseQuantity DECIMAL(22,6) NOT NULL,
 CONSTRAINT UQ_POM_Item UNIQUE(OrderId,ItemId));
IF OBJECT_ID('dbo.ProductionReservations','U') IS NULL
CREATE TABLE dbo.ProductionReservations(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, OrderId BIGINT NOT NULL REFERENCES dbo.ProductionOrders(Id),
 SourceLineId BIGINT NOT NULL REFERENCES dbo.ProductionOrderMaterials(Id), ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),
 ReservedQuantity DECIMAL(22,6) NOT NULL CHECK(ReservedQuantity>=0), ConsumedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0,
 ReleasedQuantity DECIMAL(22,6) NOT NULL DEFAULT 0, RowVersion ROWVERSION,
 CONSTRAINT UQ_PR_Owner UNIQUE(CompanyKey,OrderId,ItemId),
 CONSTRAINT CK_PR_Balances CHECK(ConsumedQuantity>=0 AND ReleasedQuantity>=0 AND ConsumedQuantity+ReleasedQuantity<=ReservedQuantity));
IF OBJECT_ID('dbo.ProductionReservationEvents','U') IS NULL
CREATE TABLE dbo.ProductionReservationEvents(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, ReservationId BIGINT NOT NULL REFERENCES dbo.ProductionReservations(Id),
 BusinessDate DATE NOT NULL, ReservedDelta DECIMAL(22,6) NOT NULL, ConsumedDelta DECIMAL(22,6) NOT NULL,
 ReleasedDelta DECIMAL(22,6) NOT NULL, EventType NVARCHAR(30) NOT NULL, SourceId BIGINT NOT NULL,
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.ProductionCompletions','U') IS NULL
CREATE TABLE dbo.ProductionCompletions(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, OrderId BIGINT NOT NULL REFERENCES dbo.ProductionOrders(Id),
 BusinessDate DATE NOT NULL, OccurredAt DATETIMEOFFSET NOT NULL, GoodOutput DECIMAL(22,6) NOT NULL CHECK(GoodOutput>=0),
 RejectedOutput DECIMAL(22,6) NOT NULL CHECK(RejectedOutput>=0), MachineId BIGINT NOT NULL REFERENCES dbo.OeeMachines(Id),
 MouldId BIGINT NOT NULL REFERENCES dbo.OeeMoulds(Id), ShiftId BIGINT NOT NULL REFERENCES dbo.HR_Shifts(Id),
 SourceReference NVARCHAR(100) NULL, VarianceReason NVARCHAR(1000) NULL,
 ReversalOfId BIGINT NULL REFERENCES dbo.ProductionCompletions(Id), ReversedById BIGINT NULL REFERENCES dbo.ProductionCompletions(Id),
 CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionCompletions') AND name='UX_PC_Reversal')
 CREATE UNIQUE INDEX UX_PC_Reversal ON dbo.ProductionCompletions(ReversalOfId) WHERE ReversalOfId IS NOT NULL;
IF OBJECT_ID('dbo.ProductionCompletionMaterials','U') IS NULL
CREATE TABLE dbo.ProductionCompletionMaterials(
 Id BIGINT IDENTITY PRIMARY KEY, CompletionId BIGINT NOT NULL REFERENCES dbo.ProductionCompletions(Id),
 ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id), UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id),
 ExpectedQuantity DECIMAL(22,6) NOT NULL, ConsumedQuantity DECIMAL(22,6) NOT NULL CHECK(ConsumedQuantity>=0),
 ScrapQuantity DECIMAL(22,6) NOT NULL CHECK(ScrapQuantity>=0), ReturnedQuantity DECIMAL(22,6) NOT NULL CHECK(ReturnedQuantity>=0),
 ReservationConsumed DECIMAL(22,6) NOT NULL, CONSTRAINT UQ_PCM_Item UNIQUE(CompletionId,ItemId));
IF OBJECT_ID('dbo.ProductionCommandEvents','U') IS NULL
CREATE TABLE dbo.ProductionCommandEvents(
 Id BIGINT IDENTITY PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, IdempotencyKey NVARCHAR(100) NOT NULL,
 Command NVARCHAR(30) NOT NULL, SourceId BIGINT NOT NULL, PayloadHash VARBINARY(32) NOT NULL,
 PayloadJson NVARCHAR(MAX) NOT NULL, ResultJson NVARCHAR(MAX) NOT NULL, CreatedBy BIGINT NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_PCE_Key UNIQUE(CompanyKey,IdempotencyKey));
IF OBJECT_ID('dbo.ProductionPlanningSnapshots','U') IS NULL
CREATE TABLE dbo.ProductionPlanningSnapshots(
 Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL, AsOfDate DATE NOT NULL,
 CalculationVersion NVARCHAR(100) NOT NULL, RequestJson NVARCHAR(MAX) NOT NULL,
 SnapshotJson NVARCHAR(MAX) NOT NULL, CreatedBy BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.ProductionImportBatches','U') IS NULL
CREATE TABLE dbo.ProductionImportBatches(
 Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, CompanyKey NVARCHAR(64) NOT NULL,
 FileFingerprint NVARCHAR(128) NOT NULL, FileName NVARCHAR(260) NOT NULL, CutoverDate DATE NOT NULL,
 Status NVARCHAR(30) NOT NULL DEFAULT N'Staged', CreatedBy BIGINT NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(), RowVersion ROWVERSION,
 CONSTRAINT UQ_PIB_File UNIQUE(CompanyKey,FileFingerprint));
IF OBJECT_ID('dbo.ProductionImportRows','U') IS NULL
CREATE TABLE dbo.ProductionImportRows(
 Id BIGINT IDENTITY PRIMARY KEY, BatchId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.ProductionImportBatches(Id),
 Tab NVARCHAR(100) NOT NULL, RowNumber INT NOT NULL, ColumnName NVARCHAR(100) NOT NULL,
 EventFingerprint NVARCHAR(128) NOT NULL, OriginalJson NVARCHAR(MAX) NOT NULL,
 NormalizedJson NVARCHAR(MAX) NULL, ExceptionCode NVARCHAR(100) NULL,
 CONSTRAINT UQ_PIR_Cell UNIQUE(BatchId,Tab,RowNumber,ColumnName));
IF COL_LENGTH('dbo.StockMovements','BusinessDate') IS NULL ALTER TABLE dbo.StockMovements ADD BusinessDate DATE NULL;
IF COL_LENGTH('dbo.StockMovements','PhysicalEventId') IS NULL ALTER TABLE dbo.StockMovements ADD PhysicalEventId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.StockMovements','SourceLineId') IS NULL ALTER TABLE dbo.StockMovements ADD SourceLineId BIGINT NULL;
IF COL_LENGTH('dbo.StockMovements','CompanyKey') IS NULL ALTER TABLE dbo.StockMovements ADD CompanyKey NVARCHAR(64) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.StockMovements') AND name='UX_SM_PhysicalLine')
 CREATE UNIQUE INDEX UX_SM_PhysicalLine ON dbo.StockMovements(PhysicalEventId,SourceLineId,ItemId) WHERE PhysicalEventId IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.ProductionReservationEvents') AND name='IX_PRE_AsOf')
 CREATE INDEX IX_PRE_AsOf ON dbo.ProductionReservationEvents(CompanyKey,BusinessDate,ReservationId) INCLUDE(ReservedDelta,ConsumedDelta,ReleasedDelta);
GO
IF OBJECT_ID('dbo.ProductionDemandObservations','U') IS NULL
CREATE TABLE dbo.ProductionDemandObservations(
 Id BIGINT IDENTITY PRIMARY KEY,CompanyKey NVARCHAR(64) NOT NULL,ItemId BIGINT NOT NULL REFERENCES dbo.Items(Id),UnitId BIGINT NOT NULL REFERENCES dbo.Units(Id),
 ChannelId BIGINT NULL REFERENCES dbo.SalesChannels(Id),ObservedFrom DATE NOT NULL,ObservedTo DATE NOT NULL,RefreshedOn DATE NOT NULL,
 SourceQuantity DECIMAL(28,12) NOT NULL CHECK(SourceQuantity>=0),BaseQuantity DECIMAL(22,6) NOT NULL CHECK(BaseQuantity>=0),
 ConversionFactor DECIMAL(28,12) NOT NULL CHECK(ConversionFactor>0),SourceReference NVARCHAR(100) NOT NULL,
 IsSuperseded BIT NOT NULL DEFAULT 0,CreatedBy BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),RowVersion ROWVERSION,
 CHECK(ObservedTo>=ObservedFrom AND RefreshedOn>=ObservedTo));
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionDemandSources(@CompanyKey NVARCHAR(64),@ItemId BIGINT,@From DATE,@To DATE,@Channel BIGINT,@Zone SYSNAME)
RETURNS TABLE AS RETURN
 WITH Observations AS(
  SELECT * FROM dbo.ProductionDemandObservations WHERE CompanyKey=@CompanyKey AND ItemId=@ItemId AND ObservedFrom=@From AND ObservedTo=@To AND IsSuperseded=0 AND(@Channel IS NULL OR ChannelId=@Channel)
 ), Daily AS(
  SELECT h.SalesChannelId ChannelId,SUM(h.Quantity) BaseQuantity,CONVERT(DATE,MAX(h.CreatedAt) AT TIME ZONE N'UTC' AT TIME ZONE @Zone) RefreshedOn,
   CONCAT(N'D:',MAX(h.Id),N':',COUNT_BIG(*),N':',SUM(h.Quantity),N':',CONVERT(NVARCHAR(40),MAX(COALESCE(h.ModifiedAt,h.CreatedAt)),126)) SourceStamp
  FROM dbo.ProcurementSalesHistory h WHERE h.ItemId=@ItemId AND h.IsDeleted=0 AND h.SalesDate BETWEEN @From AND @To AND(@Channel IS NULL OR h.SalesChannelId=@Channel)
  AND NOT EXISTS(SELECT 1 FROM Observations o WHERE o.ChannelId IS NULL OR o.ChannelId=h.SalesChannelId) GROUP BY h.SalesChannelId
 )
 SELECT ChannelId,BaseQuantity,RefreshedOn,CONVERT(NVARCHAR(200),CONCAT(N'A:',Id,N':',BaseQuantity,N':',CONVERT(NVARCHAR(18),RowVersion,1))) SourceStamp FROM Observations
 UNION ALL SELECT ChannelId,BaseQuantity,RefreshedOn,CONVERT(NVARCHAR(200),SourceStamp) FROM Daily;
GO
CREATE OR ALTER FUNCTION dbo.ufn_ProductionPlanRevision(@CompanyKey NVARCHAR(64),@ItemId BIGINT,@AsOf DATE,@From DATE,@To DATE,@Channel BIGINT)
RETURNS VARCHAR(64) AS
BEGIN
 DECLARE @Parts NVARCHAR(MAX),@Demand NVARCHAR(MAX);
 SELECT @Demand=STRING_AGG(CONVERT(NVARCHAR(MAX),SourceStamp),N';') WITHIN GROUP(ORDER BY ChannelId,SourceStamp) FROM dbo.ufn_ProductionDemandSources(@CompanyKey,@ItemId,@From,@To,@Channel,N'UTC');
 SELECT @Parts=CONCAT(i.CurrentStock,N':',i.ReservedStock,N':',i.UnitId,N':',@Demand,N':',
  (SELECT COALESCE(SUM(ReleasedQuantity-CompletedQuantity-RejectedQuantity),0) FROM dbo.ProductionOrders WHERE CompanyKey=@CompanyKey AND ItemId=@ItemId AND Status IN(2,3) AND DueDate<=DATEADD(DAY,21,@AsOf)),N':',
  (SELECT MAX(CONVERT(BIGINT,ConcurrencyVersion)) FROM dbo.ManufacturingBoms WHERE FinishedItemId=@ItemId),N':',
  (SELECT MAX(CONVERT(BIGINT,RowVersion)) FROM dbo.ItemProductionRoutings WHERE CompanyKey=@CompanyKey AND ItemId=@ItemId)) FROM dbo.Items i WHERE i.Id=@ItemId;
 RETURN CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',@Parts),2);
END;
GO
