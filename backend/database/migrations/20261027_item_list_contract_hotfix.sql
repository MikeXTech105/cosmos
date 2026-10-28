/*
   Restores the Item list stored-procedure contract expected by the current API.
   Safe to rerun: modifies only dbo.sp_Item_GetList and does not change data.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Item_GetList
    @Search NVARCHAR(200) = NULL,
    @Barcode NVARCHAR(100) = NULL,
    @ItemCode NVARCHAR(50) = NULL,
    @CategoryId BIGINT = NULL,
    @ProcurementClassification INT = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'Name',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'Name', N'ItemCode', N'Barcode', N'SalesPrice', N'PurchasePrice', N'CurrentStock', N'CreatedAt') THEN @SortBy ELSE N'Name' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;

    DECLARE @SearchPattern NVARCHAR(210) = CASE WHEN NULLIF(LTRIM(RTRIM(@Search)), N'') IS NULL THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @BarcodePattern NVARCHAR(110) = CASE WHEN NULLIF(LTRIM(RTRIM(@Barcode)), N'') IS NULL THEN NULL ELSE N'%' + LTRIM(RTRIM(@Barcode)) + N'%' END;
    DECLARE @ItemCodePattern NVARCHAR(60) = CASE WHEN NULLIF(LTRIM(RTRIM(@ItemCode)), N'') IS NULL THEN NULL ELSE N'%' + LTRIM(RTRIM(@ItemCode)) + N'%' END;
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    SELECT i.Id, i.Name, i.ItemCode, i.Barcode, i.CategoryId, c.Name AS CategoryName,
           i.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName, i.ItemType,
           i.ProcurementClassification, i.SalesPrice, i.PurchasePrice, i.CurrentStock,
           i.ReservedStock, i.MinimumStock, i.TrackInventory, i.IsManufactured,
           i.IsActive, i.CreatedAt, i.ModifiedAt, COUNT(1) OVER() AS TotalCount
    FROM dbo.Items i
    INNER JOIN dbo.Categories c ON c.Id = i.CategoryId
    INNER JOIN dbo.Units u ON u.Id = i.UnitId
    WHERE i.IsDeleted = 0
      AND (@IsActive IS NULL OR i.IsActive = @IsActive)
      AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
      AND (@ProcurementClassification IS NULL OR i.ProcurementClassification = @ProcurementClassification)
      AND (@BarcodePattern IS NULL OR i.Barcode LIKE @BarcodePattern)
      AND (@ItemCodePattern IS NULL OR i.ItemCode LIKE @ItemCodePattern)
      AND (@SearchPattern IS NULL OR i.Name LIKE @SearchPattern)
    ORDER BY
        CASE WHEN @SortBy = N'Name' AND @SortDirection = N'ASC' THEN i.Name END ASC,
        CASE WHEN @SortBy = N'Name' AND @SortDirection = N'DESC' THEN i.Name END DESC,
        CASE WHEN @SortBy = N'ItemCode' AND @SortDirection = N'ASC' THEN i.ItemCode END ASC,
        CASE WHEN @SortBy = N'ItemCode' AND @SortDirection = N'DESC' THEN i.ItemCode END DESC,
        CASE WHEN @SortBy = N'Barcode' AND @SortDirection = N'ASC' THEN i.Barcode END ASC,
        CASE WHEN @SortBy = N'Barcode' AND @SortDirection = N'DESC' THEN i.Barcode END DESC,
        CASE WHEN @SortBy = N'SalesPrice' AND @SortDirection = N'ASC' THEN i.SalesPrice END ASC,
        CASE WHEN @SortBy = N'SalesPrice' AND @SortDirection = N'DESC' THEN i.SalesPrice END DESC,
        CASE WHEN @SortBy = N'PurchasePrice' AND @SortDirection = N'ASC' THEN i.PurchasePrice END ASC,
        CASE WHEN @SortBy = N'PurchasePrice' AND @SortDirection = N'DESC' THEN i.PurchasePrice END DESC,
        CASE WHEN @SortBy = N'CurrentStock' AND @SortDirection = N'ASC' THEN i.CurrentStock END ASC,
        CASE WHEN @SortBy = N'CurrentStock' AND @SortDirection = N'DESC' THEN i.CurrentStock END DESC,
        CASE WHEN @SortBy = N'CreatedAt' AND @SortDirection = N'ASC' THEN i.CreatedAt END ASC,
        CASE WHEN @SortBy = N'CreatedAt' AND @SortDirection = N'DESC' THEN i.CreatedAt END DESC,
        i.Name ASC,
        i.Id ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
