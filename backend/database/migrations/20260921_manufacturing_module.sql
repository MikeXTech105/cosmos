/* Manufacturing is distinct from procurement ProductBomComponents: it snapshots versioned production definitions. Safe to rerun. */
SET XACT_ABORT ON;
IF COL_LENGTH('dbo.Items','IsManufactured') IS NULL ALTER TABLE dbo.Items ADD IsManufactured BIT NOT NULL CONSTRAINT DF_Items_IsManufactured DEFAULT(0);
IF OBJECT_ID('dbo.ManufacturingBoms','U') IS NULL CREATE TABLE dbo.ManufacturingBoms(
 Id BIGINT IDENTITY PRIMARY KEY,BomNumber NVARCHAR(40) NOT NULL,FinishedItemId BIGINT NOT NULL,Version NVARCHAR(30) NOT NULL,Status INT NOT NULL CONSTRAINT DF_MB_Status DEFAULT(1),EffectiveFrom DATE NOT NULL,EffectiveTo DATE NULL,Notes NVARCHAR(1000) NULL,IsDefault BIT NOT NULL DEFAULT(0),IsActive BIT NOT NULL DEFAULT(0),CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,ModifiedAtUtc DATETIME2(3) NULL,ModifiedBy BIGINT NULL,IsDeleted BIT NOT NULL DEFAULT(0),CONSTRAINT FK_MB_Item FOREIGN KEY(FinishedItemId) REFERENCES dbo.Items(Id),CONSTRAINT CK_MB_Status CHECK(Status IN(1,2,3)),CONSTRAINT UQ_MB_Version UNIQUE(FinishedItemId,Version),CONSTRAINT UQ_MB_Number UNIQUE(BomNumber));
IF OBJECT_ID('dbo.ManufacturingBomItems','U') IS NULL CREATE TABLE dbo.ManufacturingBomItems(
 Id BIGINT IDENTITY PRIMARY KEY,BomId BIGINT NOT NULL,ComponentItemId BIGINT NOT NULL,Quantity DECIMAL(18,4) NOT NULL,UnitId BIGINT NOT NULL,WastagePercentage DECIMAL(5,2) NOT NULL DEFAULT(0),Notes NVARCHAR(1000) NULL,SortOrder INT NOT NULL DEFAULT(0),CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,ModifiedAtUtc DATETIME2(3) NULL,ModifiedBy BIGINT NULL,IsDeleted BIT NOT NULL DEFAULT(0),CONSTRAINT FK_MBI_Bom FOREIGN KEY(BomId) REFERENCES dbo.ManufacturingBoms(Id),CONSTRAINT FK_MBI_Item FOREIGN KEY(ComponentItemId) REFERENCES dbo.Items(Id),CONSTRAINT FK_MBI_Unit FOREIGN KEY(UnitId) REFERENCES dbo.Units(Id),CONSTRAINT CK_MBI_Qty CHECK(Quantity>0),CONSTRAINT CK_MBI_Waste CHECK(WastagePercentage>=0 AND WastagePercentage<=100));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_MBI_Component') CREATE UNIQUE INDEX UX_MBI_Component ON dbo.ManufacturingBomItems(BomId,ComponentItemId) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_MB_Default') CREATE UNIQUE INDEX UX_MB_Default ON dbo.ManufacturingBoms(FinishedItemId) WHERE IsDefault=1 AND IsActive=1 AND IsDeleted=0;
IF OBJECT_ID('dbo.ManufacturingProductions','U') IS NULL CREATE TABLE dbo.ManufacturingProductions(
 Id BIGINT IDENTITY PRIMARY KEY,ProductionNumber NVARCHAR(40) NOT NULL UNIQUE,ProductionDate DATE NOT NULL,FinishedItemId BIGINT NOT NULL,BomId BIGINT NOT NULL,BomVersion NVARCHAR(30) NOT NULL,PlannedQuantity DECIMAL(18,4) NOT NULL,ProducedQuantity DECIMAL(18,4) NOT NULL,Status INT NOT NULL DEFAULT(1),Notes NVARCHAR(1000) NULL,ReferenceNumber NVARCHAR(100) NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,ModifiedAtUtc DATETIME2(3) NULL,ModifiedBy BIGINT NULL,PostedAtUtc DATETIME2(3) NULL,PostedBy BIGINT NULL,CancelledAtUtc DATETIME2(3) NULL,CancelledBy BIGINT NULL,CancellationReason NVARCHAR(1000) NULL,IsDeleted BIT NOT NULL DEFAULT(0),CONSTRAINT FK_MP_Item FOREIGN KEY(FinishedItemId) REFERENCES dbo.Items(Id),CONSTRAINT FK_MP_Bom FOREIGN KEY(BomId) REFERENCES dbo.ManufacturingBoms(Id),CONSTRAINT CK_MP_Status CHECK(Status IN(1,2,3)),CONSTRAINT CK_MP_Qty CHECK(PlannedQuantity>=0 AND ProducedQuantity>0));
IF OBJECT_ID('dbo.ManufacturingProductionMaterials','U') IS NULL CREATE TABLE dbo.ManufacturingProductionMaterials(
 Id BIGINT IDENTITY PRIMARY KEY,ProductionId BIGINT NOT NULL,ComponentItemId BIGINT NOT NULL,RequiredQuantity DECIMAL(18,4) NOT NULL,WastageQuantity DECIMAL(18,4) NOT NULL,TotalConsumedQuantity DECIMAL(18,4) NOT NULL,UnitId BIGINT NOT NULL,CreatedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),CreatedBy BIGINT NULL,CONSTRAINT FK_MPM_Production FOREIGN KEY(ProductionId) REFERENCES dbo.ManufacturingProductions(Id),CONSTRAINT FK_MPM_Item FOREIGN KEY(ComponentItemId) REFERENCES dbo.Items(Id),CONSTRAINT FK_MPM_Unit FOREIGN KEY(UnitId) REFERENCES dbo.Units(Id),CONSTRAINT CK_MPM_Qty CHECK(RequiredQuantity>=0 AND WastageQuantity>=0 AND TotalConsumedQuantity>0));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_MP_DateStatus') CREATE INDEX IX_MP_DateStatus ON dbo.ManufacturingProductions(ProductionDate,Status,FinishedItemId) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_MPM_Component') CREATE INDEX IX_MPM_Component ON dbo.ManufacturingProductionMaterials(ComponentItemId);
GO
CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_Post @Id BIGINT,@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;DECLARE @StartedTransaction BIT=0;BEGIN TRY IF @@TRANCOUNT=0 BEGIN TRANSACTION; SET @StartedTransaction=1; END ELSE SAVE TRANSACTION ManufacturingProductionPost;
 IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0 AND Status=1) BEGIN IF @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE ROLLBACK TRANSACTION ManufacturingProductionPost; SELECT 409 StatusCode,N'MANUFACTURING_PRODUCTION_NOT_EDITABLE' Message;RETURN;END
 IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingProductionMaterials WHERE ProductionId=@Id) BEGIN IF @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE ROLLBACK TRANSACTION ManufacturingProductionPost; SELECT 409 StatusCode,N'MANUFACTURING_BOM_INVALID' Message;RETURN;END
 IF EXISTS(SELECT 1 FROM dbo.ManufacturingProductionMaterials m JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=m.ComponentItemId WHERE m.ProductionId=@Id AND i.TrackInventory=1 AND i.CurrentStock<m.TotalConsumedQuantity) BEGIN IF @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE ROLLBACK TRANSACTION ManufacturingProductionPost; SELECT 409 StatusCode,N'MANUFACTURING_INSUFFICIENT_STOCK' Message;RETURN;END
 UPDATE i SET CurrentStock=i.CurrentStock-m.TotalConsumedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductionMaterials m ON m.ComponentItemId=i.Id WHERE m.ProductionId=@Id AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT ComponentItemId,N'ManufacturingProduction',@Id,5,-TotalConsumedQuantity,@UserId FROM dbo.ManufacturingProductionMaterials WHERE ProductionId=@Id;
 UPDATE i SET CurrentStock=i.CurrentStock+p.ProducedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductions p ON p.FinishedItemId=i.Id WHERE p.Id=@Id AND i.TrackInventory=1;
 INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT FinishedItemId,N'ManufacturingProduction',@Id,6,ProducedQuantity,@UserId FROM dbo.ManufacturingProductions WHERE Id=@Id;
 UPDATE dbo.ManufacturingProductions SET Status=2,PostedAtUtc=SYSUTCDATETIME(),PostedBy=@UserId WHERE Id=@Id;IF @StartedTransaction=1 COMMIT TRANSACTION;SELECT 200 StatusCode,N'Manufacturing production posted.' Message;END TRY BEGIN CATCH IF XACT_STATE()<>0 AND @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE IF XACT_STATE()=1 ROLLBACK TRANSACTION ManufacturingProductionPost;THROW;END CATCH END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingProduction_Cancel @Id BIGINT,@Reason NVARCHAR(1000),@UserId BIGINT=NULL AS
BEGIN SET NOCOUNT ON;SET XACT_ABORT ON;DECLARE @StartedTransaction BIT=0;BEGIN TRY IF @@TRANCOUNT=0 BEGIN TRANSACTION; SET @StartedTransaction=1; END ELSE SAVE TRANSACTION ManufacturingProductionCancel;IF NOT EXISTS(SELECT 1 FROM dbo.ManufacturingProductions WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND Status=2 AND IsDeleted=0) BEGIN IF @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE ROLLBACK TRANSACTION ManufacturingProductionCancel;SELECT 409 StatusCode,N'MANUFACTURING_PRODUCTION_ALREADY_CANCELLED' Message;RETURN;END
UPDATE i SET CurrentStock=i.CurrentStock+m.TotalConsumedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductionMaterials m ON i.Id=m.ComponentItemId WHERE m.ProductionId=@Id AND i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT ComponentItemId,N'ManufacturingCancellation',@Id,7,TotalConsumedQuantity,@UserId FROM dbo.ManufacturingProductionMaterials WHERE ProductionId=@Id;
IF EXISTS(SELECT 1 FROM dbo.ManufacturingProductions p JOIN dbo.Items i WITH(UPDLOCK,HOLDLOCK) ON i.Id=p.FinishedItemId WHERE p.Id=@Id AND i.TrackInventory=1 AND i.CurrentStock<p.ProducedQuantity) BEGIN IF @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE ROLLBACK TRANSACTION ManufacturingProductionCancel;SELECT 409 StatusCode,N'MANUFACTURING_INSUFFICIENT_STOCK' Message;RETURN;END
UPDATE i SET CurrentStock=i.CurrentStock-p.ProducedQuantity,ModifiedAt=SYSUTCDATETIME(),ModifiedBy=@UserId FROM dbo.Items i JOIN dbo.ManufacturingProductions p ON i.Id=p.FinishedItemId WHERE p.Id=@Id AND i.TrackInventory=1;INSERT dbo.StockMovements(ItemId,SourceType,SourceId,MovementType,Quantity,CreatedBy) SELECT FinishedItemId,N'ManufacturingCancellation',@Id,8,-ProducedQuantity,@UserId FROM dbo.ManufacturingProductions WHERE Id=@Id;UPDATE dbo.ManufacturingProductions SET Status=3,CancelledAtUtc=SYSUTCDATETIME(),CancelledBy=@UserId,CancellationReason=@Reason WHERE Id=@Id;IF @StartedTransaction=1 COMMIT TRANSACTION;SELECT 200 StatusCode,N'Manufacturing production cancelled.' Message;END TRY BEGIN CATCH IF XACT_STATE()<>0 AND @StartedTransaction=1 ROLLBACK TRANSACTION; ELSE IF XACT_STATE()=1 ROLLBACK TRANSACTION ManufacturingProductionCancel;THROW;END CATCH END;
GO

/* Navigation and normal SuperAdmin permissions. Protected System Owner access remains dynamic. */
MERGE dbo.Pages AS target
USING (VALUES (N'Manufacturing', N'Manufacturing', N'/manufacturing', N'factory', 150)) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, ParentPageId = NULL, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, NULL, source.SortOrder, 1);
GO

DECLARE @ManufacturingParentPageId INT = (SELECT Id FROM dbo.Pages WHERE Name = N'Manufacturing');
MERGE dbo.Pages AS target
USING (VALUES
    (N'Manufacturing.Boms', N'Manufacturing BOMs', N'/manufacturing/boms', N'list-tree', 151),
    (N'Manufacturing.Productions', N'Manufacturing Productions', N'/manufacturing/productions', N'clipboard-check', 152)
) AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, ParentPageId = @ManufacturingParentPageId, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN INSERT(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive) VALUES(source.Name, source.DisplayName, source.Route, source.Icon, @ManufacturingParentPageId, source.SortOrder, 1);
GO

;WITH RequiredPermissions AS
(
    SELECT N'Manufacturing' AS PageName, CAST(1 AS bit) AS CanView, CAST(0 AS bit) AS CanCreate, CAST(0 AS bit) AS CanEdit, CAST(0 AS bit) AS CanDelete, CAST(0 AS bit) AS CanExport, CAST(0 AS bit) AS CanApprove
    UNION ALL SELECT N'Manufacturing.Boms', 1, 1, 1, 1, 0, 0
    UNION ALL SELECT N'Manufacturing.Productions', 1, 1, 1, 0, 0, 0
)
MERGE dbo.RolePermissions AS target
USING
(
    SELECT r.Id AS RoleId, p.Id AS PageId, required.CanView, required.CanCreate, required.CanEdit, required.CanDelete, required.CanExport, required.CanApprove
    FROM dbo.Roles r
    CROSS JOIN RequiredPermissions required
    JOIN dbo.Pages p ON p.Name = required.PageName
    WHERE r.Name = N'SuperAdmin'
) AS source
ON target.RoleId = source.RoleId AND target.PageId = source.PageId
WHEN MATCHED THEN UPDATE SET CanView = source.CanView, CanCreate = source.CanCreate, CanEdit = source.CanEdit, CanDelete = source.CanDelete, CanExport = source.CanExport, CanApprove = source.CanApprove
WHEN NOT MATCHED THEN INSERT(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove) VALUES(source.RoleId, source.PageId, source.CanView, source.CanCreate, source.CanEdit, source.CanDelete, source.CanExport, source.CanApprove);
GO
