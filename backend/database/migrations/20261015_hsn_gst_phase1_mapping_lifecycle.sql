/*
 Phase 1 mapping lifecycle extension. Apply after 20261015_hsn_gst_phase1_foundation.sql.
 No legacy Items.HSNCode/GSTRate or transactional tax data is changed.
*/
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.CategoryHsnDefaults',N'U') IS NULL OR OBJECT_ID(N'dbo.ItemHsnOverrides',N'U') IS NULL
    THROW 51000,N'HSN/GST Phase 1 foundation tables are required before mapping lifecycle migration.',1;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.CategoryHsnDefaults') AND name=N'IX_CategoryHsnDefaults_Effective')
    CREATE INDEX IX_CategoryHsnDefaults_Effective ON dbo.CategoryHsnDefaults(CategoryId,EffectiveFrom,EffectiveTo) INCLUDE(HsnSacId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ItemHsnOverrides') AND name=N'IX_ItemHsnOverrides_Effective')
    CREATE INDEX IX_ItemHsnOverrides_Effective ON dbo.ItemHsnOverrides(ItemId,EffectiveFrom,EffectiveTo) INCLUDE(HsnSacId);
GO
CREATE OR ALTER PROCEDURE dbo.usp_CategoryHsnDefault_Save
 @CategoryId BIGINT,@HsnSacId BIGINT,@EffectiveFrom DATE,@EffectiveTo DATE=NULL,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Categories WHERE Id=@CategoryId) BEGIN ROLLBACK; SELECT 404 StatusCode,N'Category was not found.' Message; RETURN; END;
 IF NOT EXISTS(SELECT 1 FROM dbo.HsnSacMasters WHERE Id=@HsnSacId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK; SELECT 400 StatusCode,N'HSN/SAC must be active.' Message; RETURN; END;
 IF @EffectiveTo IS NOT NULL AND @EffectiveTo<@EffectiveFrom BEGIN ROLLBACK; SELECT 400 StatusCode,N'Effective-to date cannot be before effective-from date.' Message; RETURN; END;
 IF EXISTS(SELECT 1 FROM dbo.CategoryHsnDefaults WITH(UPDLOCK,HOLDLOCK) WHERE CategoryId=@CategoryId AND EffectiveFrom<=ISNULL(@EffectiveTo,'99991231') AND @EffectiveFrom<=ISNULL(EffectiveTo,'99991231')) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Category HSN effective dates overlap.' Message; RETURN; END;
 INSERT dbo.CategoryHsnDefaults(CategoryId,HsnSacId,EffectiveFrom,EffectiveTo,CreatedBy) VALUES(@CategoryId,@HsnSacId,@EffectiveFrom,@EffectiveTo,@UserId);
 COMMIT; SELECT 200 StatusCode,N'Category mapping saved.' Message;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ItemHsnOverride_Save
 @ItemId BIGINT,@HsnSacId BIGINT,@EffectiveFrom DATE,@EffectiveTo DATE=NULL,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@ItemId) BEGIN ROLLBACK; SELECT 404 StatusCode,N'Item was not found.' Message; RETURN; END;
 IF NOT EXISTS(SELECT 1 FROM dbo.HsnSacMasters WHERE Id=@HsnSacId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK; SELECT 400 StatusCode,N'HSN/SAC must be active.' Message; RETURN; END;
 IF @EffectiveTo IS NOT NULL AND @EffectiveTo<@EffectiveFrom BEGIN ROLLBACK; SELECT 400 StatusCode,N'Effective-to date cannot be before effective-from date.' Message; RETURN; END;
 IF EXISTS(SELECT 1 FROM dbo.ItemHsnOverrides WITH(UPDLOCK,HOLDLOCK) WHERE ItemId=@ItemId AND EffectiveFrom<=ISNULL(@EffectiveTo,'99991231') AND @EffectiveFrom<=ISNULL(EffectiveTo,'99991231')) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Product HSN effective dates overlap.' Message; RETURN; END;
 INSERT dbo.ItemHsnOverrides(ItemId,HsnSacId,EffectiveFrom,EffectiveTo,CreatedBy) VALUES(@ItemId,@HsnSacId,@EffectiveFrom,@EffectiveTo,@UserId);
 COMMIT; SELECT 200 StatusCode,N'Product override saved.' Message;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_CategoryHsnDefault_GetEffective @CategoryId BIGINT,@OnDate DATE
AS
 SELECT TOP 1 m.Id,m.HsnSacId,h.Code,h.CodeType,h.Description,m.EffectiveFrom,m.EffectiveTo
 FROM dbo.CategoryHsnDefaults m JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0
 WHERE m.CategoryId=@CategoryId AND m.EffectiveFrom<=@OnDate AND(m.EffectiveTo IS NULL OR m.EffectiveTo>=@OnDate)
 ORDER BY m.EffectiveFrom DESC,m.Id DESC;
GO
CREATE OR ALTER PROCEDURE dbo.usp_CategoryHsnDefault_Retire @CategoryId BIGINT,@MappingId BIGINT,@EffectiveTo DATE,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
 DECLARE @From DATE=(SELECT EffectiveFrom FROM dbo.CategoryHsnDefaults WITH(UPDLOCK,HOLDLOCK) WHERE Id=@MappingId AND CategoryId=@CategoryId);
 IF @From IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Category HSN mapping was not found.' Message; RETURN; END;
 IF @EffectiveTo<@From BEGIN ROLLBACK; SELECT 400 StatusCode,N'Effective-to date cannot be before effective-from date.' Message; RETURN; END;
 UPDATE dbo.CategoryHsnDefaults SET EffectiveTo=@EffectiveTo WHERE Id=@MappingId AND CategoryId=@CategoryId;
 COMMIT; SELECT 200 StatusCode,N'Category HSN default retired.' Message;
 SELECT m.Id,m.HsnSacId,h.Code,h.CodeType,h.Description,m.EffectiveFrom,m.EffectiveTo FROM dbo.CategoryHsnDefaults m JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId WHERE m.Id=@MappingId;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ItemHsnOverride_Retire @ItemId BIGINT,@MappingId BIGINT,@EffectiveTo DATE,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
 DECLARE @From DATE=(SELECT EffectiveFrom FROM dbo.ItemHsnOverrides WITH(UPDLOCK,HOLDLOCK) WHERE Id=@MappingId AND ItemId=@ItemId);
 IF @From IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Product HSN override was not found.' Message; RETURN; END;
 IF @EffectiveTo<@From BEGIN ROLLBACK; SELECT 400 StatusCode,N'Effective-to date cannot be before effective-from date.' Message; RETURN; END;
 UPDATE dbo.ItemHsnOverrides SET EffectiveTo=@EffectiveTo WHERE Id=@MappingId AND ItemId=@ItemId;
 COMMIT; SELECT 200 StatusCode,N'Product HSN override retired.' Message;
 SELECT m.Id,m.HsnSacId,h.Code,h.CodeType,h.Description,m.EffectiveFrom,m.EffectiveTo FROM dbo.ItemHsnOverrides m JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId WHERE m.Id=@MappingId;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_HsnSac_Save @Id BIGINT=NULL,@Code NVARCHAR(50),@CodeType NVARCHAR(3),@Description NVARCHAR(500),@IsActive BIT,@UserId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON; SET @Code=UPPER(LTRIM(RTRIM(@Code)));
 IF @Id IS NULL BEGIN IF EXISTS(SELECT 1 FROM dbo.HsnSacMasters WHERE Code=@Code AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'HSN/SAC code already exists.' Message; RETURN; END; INSERT dbo.HsnSacMasters(Code,CodeType,Description,IsActive,CreatedBy)VALUES(@Code,@CodeType,@Description,@IsActive,@UserId); SET @Id=SCOPE_IDENTITY(); END
 ELSE BEGIN IF @IsActive=0 AND (EXISTS(SELECT 1 FROM dbo.ItemHsnOverrides WHERE HsnSacId=@Id AND(EffectiveTo IS NULL OR EffectiveTo>=CAST(SYSUTCDATETIME() AS DATE))) OR EXISTS(SELECT 1 FROM dbo.CategoryHsnDefaults WHERE HsnSacId=@Id AND(EffectiveTo IS NULL OR EffectiveTo>=CAST(SYSUTCDATETIME() AS DATE)))) BEGIN SELECT 409 StatusCode,N'Cannot deactivate an HSN/SAC referenced by an active mapping.' Message; RETURN; END; UPDATE dbo.HsnSacMasters SET Code=@Code,CodeType=@CodeType,Description=@Description,IsActive=@IsActive,UpdatedAtUtc=SYSUTCDATETIME(),UpdatedBy=@UserId WHERE Id=@Id AND IsDeleted=0; END
 SELECT 200 StatusCode,N'HSN/SAC saved.' Message; EXEC dbo.usp_HsnSac_Get @Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ItemHsn_Resolve @ItemId BIGINT,@OnDate DATE
AS
BEGIN
 ;WITH candidates AS(
 SELECT i.Id ItemId,m.Id MappingId,h.Id HsnSacId,h.Code,h.CodeType,h.Description,N'ProductOverride' Source,m.EffectiveFrom,m.EffectiveTo,i.HSNCode LegacyHsnCode,1 Priority FROM dbo.Items i JOIN dbo.ItemHsnOverrides m ON m.ItemId=i.Id JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0 WHERE i.Id=@ItemId AND m.EffectiveFrom<=@OnDate AND(m.EffectiveTo IS NULL OR m.EffectiveTo>=@OnDate)
 UNION ALL SELECT i.Id,m.Id,h.Id,h.Code,h.CodeType,h.Description,N'CategoryDefault',m.EffectiveFrom,m.EffectiveTo,i.HSNCode,2 FROM dbo.Items i JOIN dbo.CategoryHsnDefaults m ON m.CategoryId=i.CategoryId JOIN dbo.HsnSacMasters h ON h.Id=m.HsnSacId AND h.IsActive=1 AND h.IsDeleted=0 WHERE i.Id=@ItemId AND m.EffectiveFrom<=@OnDate AND(m.EffectiveTo IS NULL OR m.EffectiveTo>=@OnDate))
 SELECT TOP 1 ItemId,MappingId,HsnSacId,Code,CodeType,Description,Source,EffectiveFrom,EffectiveTo,LegacyHsnCode FROM candidates ORDER BY Priority,EffectiveFrom DESC,MappingId DESC;
 IF @@ROWCOUNT=0 SELECT Id ItemId,CAST(NULL AS BIGINT) MappingId,CAST(NULL AS BIGINT) HsnSacId,CAST(NULL AS NVARCHAR(50)) Code,CAST(NULL AS NVARCHAR(3)) CodeType,CAST(NULL AS NVARCHAR(500)) Description,N'Missing' Source,CAST(NULL AS DATE) EffectiveFrom,CAST(NULL AS DATE) EffectiveTo,HSNCode LegacyHsnCode FROM dbo.Items WHERE Id=@ItemId;
END;
GO
