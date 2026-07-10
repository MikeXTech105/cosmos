/*
    COSMOS ERP - Stock Reports Module
    Idempotent extension of Reports Phase 1.
    Movement semantics observed in current SQL:
    1 = sales issue/outward, 2 = sales cancellation inward,
    3 = purchase/return-delete inward, 4 = purchase return or purchase cancellation outward.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

MERGE dbo.Pages AS target
USING (VALUES (N'Reports.Inventory', N'Inventory Reports', N'/reports/inventory', N'boxes', 173))
    AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN
    UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN
    INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive)
    VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
GO

INSERT dbo.RolePermissions(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
SELECT r.Id, p.Id, 1, 0, 0, 0, 1, 0
FROM dbo.Roles r
JOIN dbo.Pages p ON p.Name = N'Reports.Inventory'
WHERE r.Name = N'SuperAdmin'
  AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PageId = p.Id);

UPDATE rp
SET CanView = 1, CanExport = 1
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.Id = rp.RoleId
JOIN dbo.Pages p ON p.Id = rp.PageId
WHERE r.Name = N'SuperAdmin'
  AND p.Name = N'Reports.Inventory';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Report_StockMovements_Source' AND object_id = OBJECT_ID(N'dbo.StockMovements'))
    CREATE INDEX IX_Report_StockMovements_Source ON dbo.StockMovements(SourceType, SourceId, ItemId);
GO

IF OBJECT_ID(N'dbo.sp_Report_Inventory_StockSummary', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_StockSummary AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_StockLedger', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_StockLedger AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_ItemLedger', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_ItemLedger AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_LowStock', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_LowStock AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_NegativeStock', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_NegativeStock AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_StockMovements', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_StockMovements AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_StockValuation', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_StockValuation AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_DeadStock', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_DeadStock AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_FastMovingItems', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_FastMovingItems AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Report_Inventory_SlowMovingItems', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Report_Inventory_SlowMovingItems AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_StockSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AsOfDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @StockStatus NVARCHAR(50) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'ItemName',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EffectiveTo DATE = COALESCE(@AsOfDate, @ToDate, CONVERT(DATE, SYSUTCDATETIME()));
    DECLARE @Status NVARCHAR(50) = LOWER(REPLACE(COALESCE(@StockStatus, N''), N' ', N''));

    WITH movement_base AS
    (
        SELECT
            sm.ItemId,
            CAST(sm.CreatedAtUtc AS DATE) MovementDate,
            sm.MovementType,
            CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (1, 4) THEN -sm.Quantity ELSE sm.Quantity END SignedQuantity
        FROM dbo.StockMovements sm
        WHERE CAST(sm.CreatedAtUtc AS DATE) <= @EffectiveTo
    ),
    item_stock AS
    (
        SELECT
            i.Id ItemId,
            i.ItemCode,
            i.Name ItemName,
            c.Name CategoryName,
            u.Name UnitName,
            i.MinimumStock,
            i.PurchasePrice,
            i.SalesPrice,
            i.CurrentStock,
            i.ReservedStock,
            CASE WHEN @FromDate IS NULL THEN i.OpeningStock ELSE i.OpeningStock + COALESCE(SUM(CASE WHEN m.MovementDate < @FromDate THEN m.SignedQuantity ELSE 0 END), 0) END OpeningQuantity,
            COALESCE(SUM(CASE WHEN m.MovementDate >= COALESCE(@FromDate, '19000101') AND m.MovementType = 3 AND m.SignedQuantity > 0 THEN m.SignedQuantity ELSE 0 END), 0) PurchaseQuantity,
            COALESCE(SUM(CASE WHEN m.MovementDate >= COALESCE(@FromDate, '19000101') AND m.MovementType = 1 AND m.SignedQuantity < 0 THEN ABS(m.SignedQuantity) ELSE 0 END), 0) SalesQuantity,
            COALESCE(SUM(CASE WHEN m.MovementDate >= COALESCE(@FromDate, '19000101') AND m.MovementType = 4 AND m.SignedQuantity < 0 THEN ABS(m.SignedQuantity) ELSE 0 END), 0) PurchaseReturnQuantity,
            COALESCE(SUM(CASE WHEN m.MovementDate >= COALESCE(@FromDate, '19000101') AND m.MovementType = 2 AND m.SignedQuantity > 0 THEN m.SignedQuantity ELSE 0 END), 0) SalesReturnQuantity,
            CASE WHEN @FromDate IS NULL AND @ToDate IS NULL AND @AsOfDate IS NULL
                 THEN i.CurrentStock
                 ELSE i.OpeningStock + COALESCE(SUM(m.SignedQuantity), 0)
            END ClosingQuantity
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        LEFT JOIN movement_base m ON m.ItemId = i.Id
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@ItemId IS NULL OR i.Id = @ItemId)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@UnitId IS NULL OR i.UnitId = @UnitId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
        GROUP BY i.Id, i.ItemCode, i.Name, c.Name, u.Name, i.OpeningStock, i.CurrentStock, i.ReservedStock, i.MinimumStock, i.PurchasePrice, i.SalesPrice
    ),
    rows AS
    (
        SELECT
            *,
            ClosingQuantity - ReservedStock AvailableQuantity,
            ClosingQuantity * PurchasePrice StockValue,
            CASE
                WHEN ClosingQuantity < 0 THEN N'Negative Stock'
                WHEN ClosingQuantity = 0 THEN N'Out of Stock'
                WHEN MinimumStock > 0 AND ClosingQuantity <= MinimumStock THEN N'Low Stock'
                ELSE N'In Stock'
            END StockStatus
        FROM item_stock
    ),
    filtered AS
    (
        SELECT * FROM rows
        WHERE @Status = N''
           OR (@Status = N'instock' AND StockStatus = N'In Stock')
           OR (@Status = N'lowstock' AND StockStatus = N'Low Stock')
           OR (@Status = N'outofstock' AND StockStatus = N'Out of Stock')
           OR (@Status = N'negativestock' AND StockStatus = N'Negative Stock')
    )
    SELECT
        COUNT(1) ItemCount,
        COALESCE(SUM(OpeningQuantity), 0) TotalOpeningQuantity,
        COALESCE(SUM(PurchaseQuantity), 0) TotalPurchaseQuantity,
        COALESCE(SUM(SalesQuantity), 0) TotalSalesQuantity,
        COALESCE(SUM(PurchaseReturnQuantity), 0) TotalPurchaseReturnQuantity,
        COALESCE(SUM(SalesReturnQuantity), 0) TotalSalesReturnQuantity,
        COALESCE(SUM(ClosingQuantity), 0) TotalClosingQuantity,
        COALESCE(SUM(ReservedStock), 0) TotalReservedQuantity,
        COALESCE(SUM(AvailableQuantity), 0) TotalAvailableQuantity,
        COALESCE(SUM(StockValue), 0) TotalStockValue
    FROM filtered;

    SELECT
        ItemId, ItemCode, ItemName, CategoryName, UnitName,
        OpeningQuantity, PurchaseQuantity, SalesQuantity, PurchaseReturnQuantity, SalesReturnQuantity,
        CAST(0 AS DECIMAL(18,2)) AdjustmentInQuantity,
        CAST(0 AS DECIMAL(18,2)) AdjustmentOutQuantity,
        ClosingQuantity, CurrentStock, ReservedStock ReservedQuantity, AvailableQuantity, MinimumStock,
        PurchasePrice PurchaseRate, SalesPrice SalesRate, StockValue, StockStatus,
        COUNT(1) OVER() TotalCount
    FROM filtered
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'ItemCode' THEN ItemCode END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'ItemCode' THEN ItemCode END DESC,
        CASE WHEN @SortDirection = N'ASC' AND COALESCE(@SortBy, N'ItemName') = N'ItemName' THEN ItemName END ASC,
        CASE WHEN @SortDirection = N'DESC' AND COALESCE(@SortBy, N'ItemName') = N'ItemName' THEN ItemName END DESC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'StockValue' THEN StockValue END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'StockValue' THEN StockValue END DESC,
        ItemId
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_StockLedger
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AsOfDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @MovementType NVARCHAR(50) = NULL,
    @SourceType NVARCHAR(50) = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'MovementDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Movement NVARCHAR(50) = LOWER(REPLACE(COALESCE(@MovementType, N''), N' ', N''));

    WITH base AS
    (
        SELECT
            sm.Id,
            sm.CreatedAtUtc MovementDateTime,
            CAST(sm.CreatedAtUtc AS DATE) MovementDate,
            sm.ItemId,
            i.ItemCode,
            i.Name ItemName,
            sm.SourceType,
            sm.SourceId,
            COALESCE(si.InvoiceNumber, pb.PurchaseBillNo, pr.PurchaseReturnNo) VoucherNumber,
            sm.MovementType,
            CASE sm.MovementType WHEN 1 THEN N'Sale' WHEN 2 THEN N'Sales Cancel Return' WHEN 3 THEN N'Purchase' WHEN 4 THEN N'Purchase Return' ELSE N'Unknown' END MovementTypeName,
            p.Id PartyId,
            p.PartyName,
            CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (1, 4) THEN -sm.Quantity ELSE sm.Quantity END SignedQuantity,
            COALESCE(sii.Rate, pbi.PurchasePrice, pri.PurchasePrice) Rate
        FROM dbo.StockMovements sm
        JOIN dbo.Items i ON i.Id = sm.ItemId
        LEFT JOIN dbo.SalesInvoices si ON sm.SourceType = N'SalesInvoice' AND si.Id = sm.SourceId
        LEFT JOIN dbo.PurchaseBills pb ON sm.SourceType = N'PurchaseBill' AND pb.Id = sm.SourceId
        LEFT JOIN dbo.PurchaseReturns pr ON sm.SourceType = N'PurchaseReturn' AND pr.Id = sm.SourceId
        LEFT JOIN dbo.Parties p ON p.Id = COALESCE(si.CustomerPartyId, pb.SupplierId, pr.SupplierId)
        OUTER APPLY (SELECT TOP (1) Rate FROM dbo.SalesInvoiceItems x WHERE x.SalesInvoiceId = sm.SourceId AND x.ItemId = sm.ItemId AND x.IsDeleted = 0) sii
        OUTER APPLY (SELECT TOP (1) PurchasePrice FROM dbo.PurchaseBillItems x WHERE x.PurchaseBillId = sm.SourceId AND x.ItemId = sm.ItemId AND x.IsDeleted = 0) pbi
        OUTER APPLY (SELECT TOP (1) PurchasePrice FROM dbo.PurchaseReturnItems x WHERE x.PurchaseReturnId = sm.SourceId AND x.ItemId = sm.ItemId AND x.IsDeleted = 0) pri
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@ToDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) <= @ToDate)
          AND (@AsOfDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) <= @AsOfDate)
          AND (@ItemId IS NULL OR sm.ItemId = @ItemId)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@UnitId IS NULL OR i.UnitId = @UnitId)
          AND (@SourceType IS NULL OR sm.SourceType = @SourceType)
          AND (@PartyId IS NULL OR p.Id = @PartyId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%' OR COALESCE(si.InvoiceNumber, pb.PurchaseBillNo, pr.PurchaseReturnNo) LIKE N'%' + @Search + N'%')
          AND (@Movement = N'' OR (@Movement IN (N'sale', N'salesissue') AND sm.MovementType = 1) OR (@Movement = N'salescancelreturn' AND sm.MovementType = 2) OR (@Movement = N'purchase' AND sm.MovementType = 3) OR (@Movement = N'purchasereturn' AND sm.MovementType = 4))
    ),
    with_balance AS
    (
        SELECT
            *,
            SUM(SignedQuantity) OVER(PARTITION BY ItemId ORDER BY MovementDateTime, Id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) RunningQuantityBalance
        FROM base
    ),
    filtered AS
    (
        SELECT * FROM with_balance
        WHERE @FromDate IS NULL OR MovementDate >= @FromDate
    )
    SELECT
        COALESCE(SUM(CASE WHEN MovementDate < COALESCE(@FromDate, '19000101') THEN SignedQuantity ELSE 0 END), 0) OpeningBalance,
        COALESCE(SUM(CASE WHEN MovementDate >= COALESCE(@FromDate, '19000101') AND SignedQuantity > 0 THEN SignedQuantity ELSE 0 END), 0) TotalInward,
        COALESCE(SUM(CASE WHEN MovementDate >= COALESCE(@FromDate, '19000101') AND SignedQuantity < 0 THEN ABS(SignedQuantity) ELSE 0 END), 0) TotalOutward,
        COALESCE(SUM(SignedQuantity), 0) ClosingBalance,
        COUNT(CASE WHEN MovementDate >= COALESCE(@FromDate, '19000101') THEN 1 END) TransactionCount
    FROM with_balance;

    SELECT
        Id, MovementDateTime, MovementDate, ItemId, ItemCode, ItemName, SourceType, SourceId, VoucherNumber,
        MovementType, MovementTypeName, PartyId, PartyName,
        CASE WHEN SignedQuantity > 0 THEN SignedQuantity ELSE 0 END QuantityIn,
        CASE WHEN SignedQuantity < 0 THEN ABS(SignedQuantity) ELSE 0 END QuantityOut,
        RunningQuantityBalance,
        Rate,
        CASE WHEN Rate IS NULL THEN NULL ELSE ABS(SignedQuantity) * Rate END Value,
        CAST(NULL AS NVARCHAR(500)) Remarks,
        COUNT(1) OVER() TotalCount
    FROM filtered
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' THEN MovementDateTime END ASC,
        CASE WHEN @SortDirection <> N'ASC' THEN MovementDateTime END DESC,
        CASE WHEN @SortDirection = N'ASC' THEN Id END ASC,
        CASE WHEN @SortDirection <> N'ASC' THEN Id END DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_ItemLedger
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AsOfDate DATE = NULL,
    @ItemId BIGINT,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @MovementType NVARCHAR(50) = NULL,
    @SourceType NVARCHAR(50) = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'MovementDate',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Opening DECIMAL(18,2);
    SELECT @Opening = i.OpeningStock + COALESCE(SUM(CASE WHEN CAST(sm.CreatedAtUtc AS DATE) < COALESCE(@FromDate, '19000101') THEN CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (1, 4) THEN -sm.Quantity ELSE sm.Quantity END ELSE 0 END), 0)
    FROM dbo.Items i
    LEFT JOIN dbo.StockMovements sm ON sm.ItemId = i.Id
    WHERE i.Id = @ItemId
    GROUP BY i.OpeningStock;

    DECLARE @Rows TABLE
    (
        Id BIGINT, MovementDateTime DATETIME2(3), MovementDate DATE, ItemId BIGINT, ItemCode NVARCHAR(50), ItemName NVARCHAR(200),
        SourceType NVARCHAR(50), SourceId BIGINT, VoucherNumber NVARCHAR(50), MovementType INT, MovementTypeName NVARCHAR(50),
        PartyId UNIQUEIDENTIFIER NULL, PartyName NVARCHAR(200) NULL, SignedQuantity DECIMAL(18,2), Rate DECIMAL(18,2) NULL
    );

    INSERT @Rows
    SELECT
        sm.Id, sm.CreatedAtUtc, CAST(sm.CreatedAtUtc AS DATE), sm.ItemId, i.ItemCode, i.Name,
        sm.SourceType, sm.SourceId, COALESCE(si.InvoiceNumber, pb.PurchaseBillNo, pr.PurchaseReturnNo),
        sm.MovementType, CASE sm.MovementType WHEN 1 THEN N'Sale' WHEN 2 THEN N'Sales Cancel Return' WHEN 3 THEN N'Purchase' WHEN 4 THEN N'Purchase Return' ELSE N'Unknown' END,
        p.Id, p.PartyName,
        CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (1, 4) THEN -sm.Quantity ELSE sm.Quantity END,
        COALESCE(sii.Rate, pbi.PurchasePrice, pri.PurchasePrice)
    FROM dbo.StockMovements sm
    JOIN dbo.Items i ON i.Id = sm.ItemId
    LEFT JOIN dbo.SalesInvoices si ON sm.SourceType = N'SalesInvoice' AND si.Id = sm.SourceId
    LEFT JOIN dbo.PurchaseBills pb ON sm.SourceType = N'PurchaseBill' AND pb.Id = sm.SourceId
    LEFT JOIN dbo.PurchaseReturns pr ON sm.SourceType = N'PurchaseReturn' AND pr.Id = sm.SourceId
    LEFT JOIN dbo.Parties p ON p.Id = COALESCE(si.CustomerPartyId, pb.SupplierId, pr.SupplierId)
    OUTER APPLY (SELECT TOP (1) Rate FROM dbo.SalesInvoiceItems x WHERE x.SalesInvoiceId = sm.SourceId AND x.ItemId = sm.ItemId AND x.IsDeleted = 0) sii
    OUTER APPLY (SELECT TOP (1) PurchasePrice FROM dbo.PurchaseBillItems x WHERE x.PurchaseBillId = sm.SourceId AND x.ItemId = sm.ItemId AND x.IsDeleted = 0) pbi
    OUTER APPLY (SELECT TOP (1) PurchasePrice FROM dbo.PurchaseReturnItems x WHERE x.PurchaseReturnId = sm.SourceId AND x.ItemId = sm.ItemId AND x.IsDeleted = 0) pri
    WHERE sm.ItemId = @ItemId
      AND (@FromDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) <= @ToDate)
      AND (@AsOfDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) <= @AsOfDate);

    SELECT
        i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
        COALESCE(@Opening, i.OpeningStock) OpeningBalance,
        COALESCE(SUM(CASE WHEN r.SignedQuantity > 0 THEN r.SignedQuantity ELSE 0 END), 0) TotalInward,
        COALESCE(SUM(CASE WHEN r.SignedQuantity < 0 THEN ABS(r.SignedQuantity) ELSE 0 END), 0) TotalOutward,
        COALESCE(@Opening, i.OpeningStock) + COALESCE(SUM(r.SignedQuantity), 0) ClosingBalance,
        i.CurrentStock, i.ReservedStock, i.CurrentStock - i.ReservedStock AvailableStock
    FROM dbo.Items i
    JOIN dbo.Categories c ON c.Id = i.CategoryId
    JOIN dbo.Units u ON u.Id = i.UnitId
    LEFT JOIN @Rows r ON r.ItemId = i.Id
    WHERE i.Id = @ItemId
    GROUP BY i.Id, i.ItemCode, i.Name, c.Name, u.Name, i.OpeningStock, i.CurrentStock, i.ReservedStock;

    SELECT
        Id, MovementDateTime, MovementDate, ItemId, ItemCode, ItemName, SourceType, SourceId, VoucherNumber,
        MovementType, MovementTypeName, PartyId, PartyName,
        CASE WHEN SignedQuantity > 0 THEN SignedQuantity ELSE 0 END QuantityIn,
        CASE WHEN SignedQuantity < 0 THEN ABS(SignedQuantity) ELSE 0 END QuantityOut,
        COALESCE(@Opening, 0) + SUM(SignedQuantity) OVER(ORDER BY MovementDateTime, Id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) RunningQuantityBalance,
        Rate,
        CASE WHEN Rate IS NULL THEN NULL ELSE ABS(SignedQuantity) * Rate END Value,
        CAST(NULL AS NVARCHAR(500)) Remarks,
        COUNT(1) OVER() TotalCount
    FROM @Rows
    ORDER BY MovementDateTime, Id;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_LowStock
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'CurrentStock',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    WITH rows AS
    (
        SELECT
            i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
            i.CurrentStock, i.ReservedStock, i.CurrentStock - i.ReservedStock AvailableStock,
            i.MinimumStock, i.MinimumStock - i.CurrentStock ReorderShortage, i.PurchasePrice,
            (i.MinimumStock - i.CurrentStock) * i.PurchasePrice EstimatedReorderValue
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND i.MinimumStock > 0
          AND i.CurrentStock <= i.MinimumStock
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@UnitId IS NULL OR i.UnitId = @UnitId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    )
    SELECT COUNT(1) ItemCount, COALESCE(SUM(CurrentStock), 0) TotalCurrentStock, COALESCE(SUM(AvailableStock), 0) TotalAvailableStock, COALESCE(SUM(ReorderShortage), 0) TotalShortageQuantity, COALESCE(SUM(EstimatedReorderValue), 0) EstimatedValueImpact FROM rows;

    SELECT *, COUNT(1) OVER() TotalCount
    FROM rows
    ORDER BY ReorderShortage DESC, ItemName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_NegativeStock
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'CurrentStock',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    WITH rows AS
    (
        SELECT
            i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
            i.CurrentStock, i.CurrentStock - i.ReservedStock AvailableStock, i.MinimumStock,
            lm.CreatedAtUtc LastStockMovementDate,
            CASE lm.MovementType WHEN 1 THEN N'Sale' WHEN 2 THEN N'Sales Cancel Return' WHEN 3 THEN N'Purchase' WHEN 4 THEN N'Purchase Return' ELSE NULL END LastMovementType,
            ABS(i.CurrentStock) NegativeQuantity,
            ABS(i.CurrentStock) * i.PurchasePrice EstimatedStockValueImpact
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        OUTER APPLY (SELECT TOP (1) CreatedAtUtc, MovementType FROM dbo.StockMovements sm WHERE sm.ItemId = i.Id ORDER BY CreatedAtUtc DESC, Id DESC) lm
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND i.CurrentStock < 0
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@UnitId IS NULL OR i.UnitId = @UnitId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    )
    SELECT COUNT(1) ItemCount, COALESCE(SUM(CurrentStock), 0) TotalCurrentStock, COALESCE(SUM(AvailableStock), 0) TotalAvailableStock, COALESCE(SUM(NegativeQuantity), 0) TotalShortageQuantity, COALESCE(SUM(EstimatedStockValueImpact), 0) EstimatedValueImpact FROM rows;

    SELECT *, COUNT(1) OVER() TotalCount
    FROM rows
    ORDER BY CurrentStock ASC, ItemName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_StockMovements
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AsOfDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @MovementType NVARCHAR(50) = NULL,
    @SourceType NVARCHAR(50) = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'MovementDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.sp_Report_Inventory_StockLedger
        @FromDate = @FromDate, @ToDate = @ToDate, @AsOfDate = @AsOfDate, @ItemId = @ItemId,
        @CategoryId = @CategoryId, @UnitId = @UnitId, @MovementType = @MovementType,
        @SourceType = @SourceType, @PartyId = @PartyId, @Search = @Search, @IncludeInactive = @IncludeInactive,
        @PageNumber = @PageNumber, @PageSize = @PageSize, @SortBy = @SortBy, @SortDirection = @SortDirection;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_StockValuation
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AsOfDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @UnitId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @StockStatus NVARCHAR(50) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'StockValue',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    WITH rows AS
    (
        SELECT
            i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
            i.CurrentStock ClosingQuantity, i.PurchasePrice UnitCost,
            i.CurrentStock * i.PurchasePrice StockValue,
            N'ClosingQuantity x Items.PurchasePrice' ValuationMethod
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@ItemId IS NULL OR i.Id = @ItemId)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@UnitId IS NULL OR i.UnitId = @UnitId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    )
    SELECT COALESCE(SUM(ClosingQuantity), 0) TotalQuantity, COALESCE(SUM(StockValue), 0) TotalStockValue, COUNT(1) ItemCount FROM rows;

    SELECT *, COUNT(1) OVER() TotalCount
    FROM rows
    ORDER BY StockValue DESC, ItemName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_DeadStock
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @AsOfDate DATE = NULL,
    @InactiveDays INT = 90,
    @CategoryId BIGINT = NULL,
    @ItemId BIGINT = NULL,
    @MinimumStockValue DECIMAL(18,2) = NULL,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'DaysSinceLastSale',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AsOf DATE = COALESCE(@AsOfDate, @ToDate, CONVERT(DATE, SYSUTCDATETIME()));

    WITH rows AS
    (
        SELECT
            i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
            i.CurrentStock CurrentQuantity,
            i.CurrentStock * i.PurchasePrice StockValue,
            last_sale.LastSoldDate,
            CASE WHEN last_sale.LastSoldDate IS NULL THEN NULL ELSE DATEDIFF(DAY, last_sale.LastSoldDate, @AsOf) END DaysSinceLastSale,
            last_purchase.LastPurchaseDate,
            CASE
                WHEN last_sale.LastSoldDate IS NULL THEN N'NeverSold'
                WHEN DATEDIFF(DAY, last_sale.LastSoldDate, @AsOf) BETWEEN 30 AND 59 THEN N'30-59 days'
                WHEN DATEDIFF(DAY, last_sale.LastSoldDate, @AsOf) BETWEEN 60 AND 89 THEN N'60-89 days'
                WHEN DATEDIFF(DAY, last_sale.LastSoldDate, @AsOf) BETWEEN 90 AND 179 THEN N'90-179 days'
                ELSE N'180+ days'
            END StockAgeClassification,
            CAST(CASE WHEN last_sale.LastSoldDate IS NULL THEN 1 ELSE 0 END AS BIT) NeverSold
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        OUTER APPLY (SELECT MAX(CAST(sm.CreatedAtUtc AS DATE)) LastSoldDate FROM dbo.StockMovements sm WHERE sm.ItemId = i.Id AND sm.MovementType = 1 AND CAST(sm.CreatedAtUtc AS DATE) <= @AsOf) last_sale
        OUTER APPLY (SELECT MAX(CAST(sm.CreatedAtUtc AS DATE)) LastPurchaseDate FROM dbo.StockMovements sm WHERE sm.ItemId = i.Id AND sm.MovementType = 3 AND CAST(sm.CreatedAtUtc AS DATE) <= @AsOf) last_purchase
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND i.CurrentStock > 0
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@ItemId IS NULL OR i.Id = @ItemId)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    ),
    filtered AS
    (
        SELECT * FROM rows
        WHERE (LastSoldDate IS NULL OR DaysSinceLastSale >= @InactiveDays)
          AND (@MinimumStockValue IS NULL OR StockValue >= @MinimumStockValue)
    )
    SELECT COUNT(1) ItemCount, COALESCE(SUM(CurrentQuantity), 0) TotalQuantity, COALESCE(SUM(StockValue), 0) TotalStockValue FROM filtered;

    SELECT *, COUNT(1) OVER() TotalCount
    FROM filtered
    ORDER BY NeverSold DESC, DaysSinceLastSale DESC, StockValue DESC, ItemName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_FastMovingItems
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @Top INT = NULL,
    @MinimumTransactions INT = 1,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'TotalSoldQuantity',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @End DATE = COALESCE(@ToDate, CONVERT(DATE, SYSUTCDATETIME()));
    DECLARE @Start DATE = COALESCE(@FromDate, DATEADD(DAY, -90, @End));
    DECLARE @Days INT = DATEDIFF(DAY, @Start, @End) + 1;

    WITH sales AS
    (
        SELECT
            i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
            COALESCE(SUM(sii.Quantity), 0) TotalSoldQuantity,
            COUNT(DISTINCT si.Id) SalesTransactionCount,
            COALESCE(SUM(sii.LineTotal), 0) SalesValue,
            i.CurrentStock
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        JOIN dbo.SalesInvoiceItems sii ON sii.ItemId = i.Id AND sii.IsDeleted = 0
        JOIN dbo.SalesInvoices si ON si.Id = sii.SalesInvoiceId AND si.IsDeleted = 0 AND si.Status IN (2, 3, 4)
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND si.InvoiceDate BETWEEN @Start AND @End
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
        GROUP BY i.Id, i.ItemCode, i.Name, c.Name, u.Name, i.CurrentStock
        HAVING COUNT(DISTINCT si.Id) >= @MinimumTransactions
    ),
    ranked AS
    (
        SELECT
            ROW_NUMBER() OVER(ORDER BY TotalSoldQuantity DESC, SalesValue DESC, ItemId) Rank,
            *,
            CASE WHEN SalesTransactionCount = 0 THEN 0 ELSE TotalSoldQuantity / SalesTransactionCount END AverageQuantityPerTransaction,
            CASE WHEN TotalSoldQuantity <= 0 THEN NULL ELSE CurrentStock / (TotalSoldQuantity / NULLIF(@Days, 0)) END EstimatedDaysOfStock
        FROM sales
    ),
    filtered AS
    (
        SELECT * FROM ranked WHERE @Top IS NULL OR Rank <= @Top
    )
    SELECT COUNT(1) ItemCount, COALESCE(SUM(TotalSoldQuantity), 0) TotalSoldQuantity, COALESCE(SUM(SalesTransactionCount), 0) TotalSalesTransactions, COALESCE(SUM(SalesValue), 0) TotalSalesValue FROM filtered;

    SELECT *, COUNT(1) OVER() TotalCount
    FROM filtered
    ORDER BY Rank
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

ALTER PROCEDURE dbo.sp_Report_Inventory_SlowMovingItems
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @Top INT = NULL,
    @MinimumTransactions INT = 0,
    @Search NVARCHAR(200) = NULL,
    @IncludeInactive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'SoldQuantity',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @End DATE = COALESCE(@ToDate, CONVERT(DATE, SYSUTCDATETIME()));
    DECLARE @Start DATE = COALESCE(@FromDate, DATEADD(DAY, -90, @End));

    WITH rows AS
    (
        SELECT
            i.Id ItemId, i.ItemCode, i.Name ItemName, c.Name CategoryName, u.Name UnitName,
            COALESCE(SUM(CASE WHEN si.InvoiceDate BETWEEN @Start AND @End THEN sii.Quantity ELSE 0 END), 0) SoldQuantity,
            COUNT(DISTINCT CASE WHEN si.InvoiceDate BETWEEN @Start AND @End THEN si.Id END) SalesTransactionCount,
            i.CurrentStock,
            i.CurrentStock * i.PurchasePrice StockValue,
            MAX(CASE WHEN si.Status IN (2, 3, 4) THEN si.InvoiceDate END) LastSoldDate
        FROM dbo.Items i
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        JOIN dbo.Units u ON u.Id = i.UnitId
        LEFT JOIN dbo.SalesInvoiceItems sii ON sii.ItemId = i.Id AND sii.IsDeleted = 0
        LEFT JOIN dbo.SalesInvoices si ON si.Id = sii.SalesInvoiceId AND si.IsDeleted = 0 AND si.Status IN (2, 3, 4)
        WHERE i.IsDeleted = 0
          AND i.TrackInventory = 1
          AND i.CurrentStock > 0
          AND (@IncludeInactive = 1 OR i.IsActive = 1)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
        GROUP BY i.Id, i.ItemCode, i.Name, c.Name, u.Name, i.CurrentStock, i.PurchasePrice
    ),
    classified AS
    (
        SELECT
            *,
            CASE WHEN LastSoldDate IS NULL THEN NULL ELSE DATEDIFF(DAY, LastSoldDate, @End) END DaysSinceLastSale,
            CASE
                WHEN SoldQuantity = 0 THEN N'Zero Sale'
                WHEN SalesTransactionCount <= @MinimumTransactions THEN N'Low Sale'
                ELSE N'Slow Moving'
            END MovementClassification,
            ROW_NUMBER() OVER(ORDER BY SoldQuantity ASC, SalesTransactionCount ASC, StockValue DESC, ItemId) SlowRank
        FROM rows
    ),
    filtered AS
    (
        SELECT * FROM classified WHERE @Top IS NULL OR SlowRank <= @Top
    )
    SELECT COUNT(1) ItemCount, COALESCE(SUM(SoldQuantity), 0) TotalSoldQuantity, COALESCE(SUM(SalesTransactionCount), 0) TotalSalesTransactions, CAST(0 AS DECIMAL(18,2)) TotalSalesValue FROM filtered;

    SELECT
        ItemId, ItemCode, ItemName, CategoryName, UnitName, SoldQuantity, SalesTransactionCount,
        CurrentStock, StockValue, LastSoldDate, DaysSinceLastSale, MovementClassification,
        COUNT(1) OVER() TotalCount
    FROM filtered
    ORDER BY SoldQuantity ASC, SalesTransactionCount ASC, StockValue DESC, ItemId
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

/*
Manual verification query after migration:
SELECT i.Id, i.ItemCode, i.CurrentStock,
       i.OpeningStock + COALESCE(SUM(CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (1,4) THEN -sm.Quantity ELSE sm.Quantity END), 0) MovementDerivedStock
FROM dbo.Items i
LEFT JOIN dbo.StockMovements sm ON sm.ItemId = i.Id
WHERE i.TrackInventory = 1 AND i.IsDeleted = 0
GROUP BY i.Id, i.ItemCode, i.CurrentStock, i.OpeningStock
HAVING i.CurrentStock <> i.OpeningStock + COALESCE(SUM(CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (1,4) THEN -sm.Quantity ELSE sm.Quantity END), 0);
*/
