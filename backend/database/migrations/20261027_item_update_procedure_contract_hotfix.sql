/* Repairs only legacy sp_Item_Update contracts that lack @IsManufactured.
   Current procedures are left untouched so later stock-safety amendments stay in effect. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Items', N'U') IS NULL
    THROW 51000, 'dbo.Items is required before updating sp_Item_Update.', 1;
IF COL_LENGTH(N'dbo.Items', N'IsManufactured') IS NULL
    THROW 51001, 'Items.IsManufactured is required; apply the manufacturing item migration first.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.parameters WHERE object_id=OBJECT_ID(N'dbo.sp_Item_Update') AND name=N'@IsManufactured')
BEGIN
 DECLARE @Definition NVARCHAR(MAX)=N'
CREATE OR ALTER PROCEDURE dbo.sp_Item_Update
 @Id BIGINT,@Name NVARCHAR(200),@ItemCode NVARCHAR(50),@Barcode NVARCHAR(100)=NULL,@CategoryId BIGINT,@UnitId BIGINT,@ItemType INT,
 @ProcurementClassification INT=NULL,@PurchasePrice DECIMAL(18,2),@SalesPrice DECIMAL(18,2),@HSNCode NVARCHAR(50)=NULL,
 @GSTRate DECIMAL(5,2),@TrackInventory BIT,@IsManufactured BIT=0,@OpeningStock DECIMAL(18,2),@OpeningStockValue DECIMAL(18,2),
 @CurrentStock DECIMAL(18,2),@ReservedStock DECIMAL(18,2),@MinimumStock DECIMAL(18,2),@Description NVARCHAR(1000)=NULL,@ImageUrl NVARCHAR(1000)=NULL,@IsActive BIT=1
AS
BEGIN
 SET NOCOUNT ON; BEGIN TRY
  IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Id=@Id AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N''Item was not found.'' Message;RETURN;END;
  IF EXISTS(SELECT 1 FROM dbo.Items WHERE ItemCode=LTRIM(RTRIM(@ItemCode)) AND Id<>@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N''Item code already exists.'' Message;RETURN;END;
  IF NOT EXISTS(SELECT 1 FROM dbo.Categories WHERE Id=@CategoryId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N''Category was not found.'' Message;RETURN;END;
  IF NOT EXISTS(SELECT 1 FROM dbo.Units WHERE Id=@UnitId AND IsDeleted=0) BEGIN SELECT 404 StatusCode,N''Unit was not found.'' Message;RETURN;END;
  UPDATE dbo.Items SET Name=LTRIM(RTRIM(@Name)),ItemCode=LTRIM(RTRIM(@ItemCode)),Barcode=@Barcode,CategoryId=@CategoryId,UnitId=@UnitId,ItemType=@ItemType,ProcurementClassification=@ProcurementClassification,PurchasePrice=@PurchasePrice,SalesPrice=@SalesPrice,HSNCode=@HSNCode,GSTRate=@GSTRate,TrackInventory=@TrackInventory,IsManufactured=@IsManufactured,OpeningStock=@OpeningStock,OpeningStockValue=@OpeningStockValue,CurrentStock=@CurrentStock,ReservedStock=@ReservedStock,MinimumStock=@MinimumStock,Description=@Description,ImageUrl=@ImageUrl,IsActive=@IsActive,ModifiedAt=SYSUTCDATETIME() WHERE Id=@Id;
  SELECT 200 StatusCode,N''Item updated.'' Message; EXEC dbo.sp_Item_GetById @Id;
 END TRY BEGIN CATCH SELECT 500 StatusCode,ERROR_MESSAGE() Message; END CATCH
END;';
 EXEC sys.sp_executesql @Definition;
END;
GO
