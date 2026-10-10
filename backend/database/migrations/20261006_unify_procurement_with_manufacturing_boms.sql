/*
   Makes versioned Manufacturing BOMs the single authoritative BOM source for
   Procurement Planning. This migration is additive and does not delete or
   rewrite ProductBomComponents history.

   Applicability rule (also used by the API): an eligible BOM is active,
   non-deleted, effective on @AsOfDate, and has the same FinishedItemId. The
   effective default wins; otherwise the latest EffectiveFrom, then Version,
   wins. Id is deliberately not a business-selection criterion.
*/
SET XACT_ABORT ON;
GO

CREATE OR ALTER FUNCTION dbo.ufn_ManufacturingBom_Applicable
(
    @AsOfDate DATE
)
RETURNS TABLE
AS
RETURN
(
    WITH Eligible AS
    (
        SELECT b.Id, b.BomNumber, b.FinishedItemId, b.Version, b.Status,
               b.EffectiveFrom, b.EffectiveTo, b.Notes, b.IsDefault, b.IsActive,
               ROW_NUMBER() OVER
               (
                   PARTITION BY b.FinishedItemId
                   ORDER BY b.IsDefault DESC, b.EffectiveFrom DESC, b.Version DESC
               ) AS SelectionRank
        FROM dbo.ManufacturingBoms b
        WHERE b.IsDeleted = 0
          AND b.IsActive = 1
          AND b.Status = 2
          AND b.EffectiveFrom <= @AsOfDate
          AND (b.EffectiveTo IS NULL OR b.EffectiveTo >= @AsOfDate)
    )
    SELECT Id, BomNumber, FinishedItemId, Version, Status, EffectiveFrom, EffectiveTo,
           Notes, IsDefault, IsActive
    FROM Eligible
    WHERE SelectionRank = 1
);
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_GetApplicable
    @FinishedItemId BIGINT,
    @AsOfDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT b.Id, b.BomNumber, b.FinishedItemId, i.ItemCode AS FinishedItemCode,
           i.Name AS FinishedItemName, b.Version, b.Status, b.EffectiveFrom,
           b.EffectiveTo, b.Notes, b.IsDefault, b.IsActive
    FROM dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b
    JOIN dbo.Items i ON i.Id = b.FinishedItemId
    WHERE b.FinishedItemId = @FinishedItemId;

    SELECT x.Id, x.ComponentItemId, i.ItemCode AS ComponentItemCode,
           i.Name AS ComponentItemName, x.Quantity, x.UnitId, u.Name AS UnitName,
           x.WastagePercentage,
           CAST(x.Quantity * (1 + x.WastagePercentage / 100.0) AS DECIMAL(18,4)) AS ConsumptionPerUnit,
           x.Notes, x.SortOrder
    FROM dbo.ManufacturingBomItems x
    JOIN dbo.Items i ON i.Id = x.ComponentItemId
    JOIN dbo.Units u ON u.Id = x.UnitId
    JOIN dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b ON b.Id = x.BomId
    WHERE b.FinishedItemId = @FinishedItemId
      AND x.IsDeleted = 0
    ORDER BY x.SortOrder, x.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ManufacturingBom_GetList
    @Search NVARCHAR(200) = NULL,
    @FinishedItemId BIGINT = NULL,
    @Status INT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50,
    @SortBy NVARCHAR(50) = N'CreatedAt',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;
    SET @PageNumber = IIF(@PageNumber < 1, 1, @PageNumber);
    SET @PageSize = IIF(@PageSize < 1, 50, IIF(@PageSize > 200, 200, @PageSize));
    SET @SortBy = CASE WHEN @SortBy IN (N'BomNumber',N'Version',N'EffectiveFrom',N'CreatedAt') THEN @SortBy ELSE N'CreatedAt' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'ASC' THEN N'ASC' ELSE N'DESC' END;
    DECLARE @Pattern NVARCHAR(210) = CASE WHEN NULLIF(LTRIM(RTRIM(@Search)),N'') IS NULL THEN NULL ELSE N'%'+LTRIM(RTRIM(@Search))+N'%' END;
    DECLARE @Offset INT = (@PageNumber-1)*@PageSize;
    DECLARE @Sql NVARCHAR(MAX) = N'
        SELECT b.Id,b.BomNumber,b.FinishedItemId,i.ItemCode FinishedItemCode,i.Name FinishedItemName,
               b.Version,b.Status,b.EffectiveFrom,b.EffectiveTo,b.IsDefault,b.IsActive,
               (SELECT COUNT(*) FROM dbo.ManufacturingBomItems x WHERE x.BomId=b.Id AND x.IsDeleted=0) ComponentCount,
               COUNT(1) OVER() TotalCount
        FROM dbo.ManufacturingBoms b
        JOIN dbo.Items i ON i.Id=b.FinishedItemId
        WHERE b.IsDeleted=0
          AND (@FinishedItemId IS NULL OR b.FinishedItemId=@FinishedItemId)
          AND (@Status IS NULL OR b.Status=@Status)
          AND (@Pattern IS NULL OR b.BomNumber LIKE @Pattern OR i.ItemCode LIKE @Pattern OR i.Name LIKE @Pattern OR b.Version LIKE @Pattern)
        ORDER BY '+QUOTENAME(@SortBy)+N' '+@SortDirection+N'
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;';
    EXEC sys.sp_executesql @Sql,
        N'@FinishedItemId BIGINT,@Status INT,@Pattern NVARCHAR(210),@Offset INT,@PageSize INT',
        @FinishedItemId,@Status,@Pattern,@Offset,@PageSize;
END;
GO

/* Procurement read contracts now project the applicable Manufacturing BOM. */
CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Bom_Get
    @FinishedProductItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AsOfDate DATE = CONVERT(DATE, SYSUTCDATETIME());
    SELECT i.Id AS FinishedProductItemId, i.ItemCode AS FinishedProductItemCode,
           i.Name AS FinishedProductItemName, i.ProcurementClassification
    FROM dbo.Items i WHERE i.Id=@FinishedProductItemId AND i.IsDeleted=0;
    SELECT x.Id, b.FinishedItemId AS FinishedProductItemId, x.ComponentItemId,
           i.ItemCode AS ComponentItemCode, i.Name AS ComponentItemName,
           x.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName,
           CAST(x.Quantity * (1 + x.WastagePercentage / 100.0) AS DECIMAL(19,6)) AS QuantityRequired,
           CAST(1 AS bit) AS IsActive, x.CreatedAtUtc AS CreatedAt, x.CreatedBy,
           x.ModifiedAtUtc AS ModifiedAt, x.ModifiedBy
    FROM dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b
    JOIN dbo.ManufacturingBomItems x ON x.BomId=b.Id AND x.IsDeleted=0
    JOIN dbo.Items i ON i.Id=x.ComponentItemId
    JOIN dbo.Units u ON u.Id=x.UnitId
    WHERE b.FinishedItemId=@FinishedProductItemId
    ORDER BY x.SortOrder,x.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Bom_Save
    @FinishedProductItemId BIGINT,
    @ComponentsJson NVARCHAR(MAX),
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 409 AS StatusCode,
           N'Procurement BOM editing has moved to Manufacturing BOMs. Create or update a versioned Manufacturing BOM instead.' AS Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Bom_Issues
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AsOfDate DATE = CONVERT(DATE, SYSUTCDATETIME());

    SELECT N'MISSING_BOM' AS Code, i.Id AS ItemId, i.ItemCode, i.Name AS ItemName,
           N'No active effective Manufacturing BOM is configured for a sold finished product.' AS Message
    FROM dbo.Items i
    WHERE i.IsDeleted=0 AND i.IsActive=1
      AND EXISTS (SELECT 1 FROM dbo.ProcurementSalesHistory s WHERE s.ItemId=i.Id AND s.IsDeleted=0)
      AND NOT EXISTS (SELECT 1 FROM dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b WHERE b.FinishedItemId=i.Id)
    UNION ALL
    SELECT N'BOM_HAS_NO_COMPONENTS', i.Id, i.ItemCode, i.Name,
           N'The applicable Manufacturing BOM has no valid components.'
    FROM dbo.Items i
    JOIN dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b ON b.FinishedItemId=i.Id
    WHERE i.IsDeleted=0 AND i.IsActive=1
      AND EXISTS (SELECT 1 FROM dbo.ProcurementSalesHistory s WHERE s.ItemId=i.Id AND s.IsDeleted=0)
      AND NOT EXISTS (SELECT 1 FROM dbo.ManufacturingBomItems x WHERE x.BomId=b.Id AND x.IsDeleted=0)
    UNION ALL
    SELECT N'INACTIVE_COMPONENT', i.Id, i.ItemCode, i.Name,
           N'The applicable Manufacturing BOM references an inactive component.'
    FROM dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b
    JOIN dbo.ManufacturingBomItems x ON x.BomId=b.Id AND x.IsDeleted=0
    JOIN dbo.Items i ON i.Id=x.ComponentItemId
    WHERE i.IsDeleted=1 OR i.IsActive=0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_Settings_Missing
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AsOfDate DATE = CONVERT(DATE, SYSUTCDATETIME());
    SELECT N'MISSING_SETTINGS' AS Code, i.Id AS ItemId, i.ItemCode, i.Name AS ItemName,
           N'Applicable Manufacturing BOM component has no active procurement settings.' AS Message
    FROM dbo.Items i
    WHERE i.IsDeleted=0
      AND EXISTS
      (
          SELECT 1
          FROM dbo.ufn_ManufacturingBom_Applicable(@AsOfDate) b
          JOIN dbo.ManufacturingBomItems x ON x.BomId=b.Id AND x.IsDeleted=0
          WHERE x.ComponentItemId=i.Id
      )
      AND NOT EXISTS (SELECT 1 FROM dbo.ProcurementSettings s WHERE s.ItemId=i.Id AND s.IsDeleted=0 AND s.IsActive=1)
    ORDER BY i.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcurementPlanning_CalculationInputs
    @FromDate DATE,
    @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    WITH ProductSales AS
    (
        SELECT s.ItemId, SUM(s.Quantity) AS Quantity
        FROM dbo.ProcurementSalesHistory s
        WHERE s.IsDeleted=0 AND s.ItemId IS NOT NULL AND s.SalesDate BETWEEN @FromDate AND @ToDate
        GROUP BY s.ItemId
    )
    SELECT ItemId, i.ItemCode, i.Name AS ItemName, i.IsActive, i.ProcurementClassification, Quantity
    FROM ProductSales ps JOIN dbo.Items i ON i.Id=ps.ItemId;

    WITH ProductSales AS
    (
        SELECT s.ItemId, SUM(s.Quantity) AS Quantity
        FROM dbo.ProcurementSalesHistory s
        WHERE s.IsDeleted=0 AND s.ItemId IS NOT NULL AND s.SalesDate BETWEEN @FromDate AND @ToDate
        GROUP BY s.ItemId
    )
    SELECT b.FinishedItemId AS FinishedProductItemId, x.ComponentItemId,
           ci.ItemCode AS ComponentItemCode, ci.Name AS ComponentItemName,
           ci.IsActive AS ComponentIsActive, ci.ProcurementClassification,
           x.UnitId, u.Name AS UnitName, u.ShortName AS UnitShortName,
           CAST(x.Quantity * (1 + x.WastagePercentage / 100.0) AS DECIMAL(19,6)) AS QuantityRequired,
           ci.TrackInventory, ci.CurrentStock,
           ps.Id AS SettingId, ps.ConfiguredLeadTimeDays, ps.LeadTimeOverrideDays,
           history.AverageHistoricalLeadTimeDays, ps.SafetyFactor, ps.MinimumOrderQuantity,
           ps.OrderMultiple, ps.AutomaticCalculationEnabled, ps.ManualPlanning,
           ps.RoundingRule, ps.IsActive AS SettingIsActive,
           CAST(0 AS DECIMAL(19,6)) AS ValidInboundQuantity
    FROM ProductSales sales
    JOIN dbo.ufn_ManufacturingBom_Applicable(@ToDate) b ON b.FinishedItemId=sales.ItemId
    JOIN dbo.ManufacturingBomItems x ON x.BomId=b.Id AND x.IsDeleted=0
    JOIN dbo.Items ci ON ci.Id=x.ComponentItemId
    JOIN dbo.Units u ON u.Id=x.UnitId
    LEFT JOIN dbo.ProcurementSettings ps ON ps.ItemId=x.ComponentItemId AND ps.IsDeleted=0
    OUTER APPLY
    (
        SELECT CAST(AVG(CAST(h.LeadTimeDays AS DECIMAL(19,6))) AS DECIMAL(9,3)) AS AverageHistoricalLeadTimeDays
        FROM dbo.ProcurementLeadTimeHistory h
        WHERE h.ItemId=x.ComponentItemId AND h.IsDeleted=0
    ) history;

    SELECT c.Code AS ChannelCode, s.ChannelSku, COUNT(*) AS OccurrenceCount
    FROM dbo.ProcurementSalesHistory s
    JOIN dbo.SalesChannels c ON c.Id=s.SalesChannelId
    WHERE s.IsDeleted=0 AND s.ItemId IS NULL AND s.SalesDate BETWEEN @FromDate AND @ToDate
    GROUP BY c.Code,s.ChannelSku;
END;
GO

/* Read-only post-deployment evidence. */
SELECT N'Applicable Manufacturing BOM resolver' AS CheckName, COUNT(*) AS ActualCount
FROM sys.objects WHERE object_id=OBJECT_ID(N'dbo.ufn_ManufacturingBom_Applicable') AND type IN (N'IF',N'TF');
GO
