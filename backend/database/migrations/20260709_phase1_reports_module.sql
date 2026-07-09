/*
    COSMOS ERP - Phase 1 Reports Module
    Safe/idempotent migration:
    - Adds report pages and SuperAdmin View/Export permissions.
    - Creates Phase 1 report stored procedures.
    - Adds supporting indexes when missing.
    - Does not drop or rewrite business data.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

MERGE dbo.Pages AS target
USING (VALUES
    (N'Reports.Sales', N'Sales Reports', N'/reports/sales', N'chart-column', 170),
    (N'Reports.Purchase', N'Purchase Reports', N'/reports/purchase', N'chart-column', 171),
    (N'Reports.Expenses', N'Expense Reports', N'/reports/expenses', N'chart-pie', 172),
    (N'Reports.Inventory', N'Inventory Reports', N'/reports/inventory', N'boxes', 173),
    (N'Reports.Parties', N'Party Reports', N'/reports/parties', N'book-open', 174)
) AS source(Name, DisplayName, Route, Icon, SortOrder)
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
JOIN dbo.Pages p ON p.Name IN (N'Reports.Sales', N'Reports.Purchase', N'Reports.Expenses', N'Reports.Inventory', N'Reports.Parties')
WHERE r.Name = N'SuperAdmin'
  AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PageId = p.Id);

UPDATE rp
SET CanView = 1, CanExport = 1
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.Id = rp.RoleId
JOIN dbo.Pages p ON p.Id = rp.PageId
WHERE r.Name = N'SuperAdmin'
  AND p.Name IN (N'Reports.Sales', N'Reports.Purchase', N'Reports.Expenses', N'Reports.Inventory', N'Reports.Parties');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Report_SalesInvoices_StatusPayment' AND object_id = OBJECT_ID(N'dbo.SalesInvoices'))
    CREATE INDEX IX_Report_SalesInvoices_StatusPayment ON dbo.SalesInvoices(Status, PaymentStatus, InvoiceDate, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Report_SalesInvoiceItems_Item' AND object_id = OBJECT_ID(N'dbo.SalesInvoiceItems'))
    CREATE INDEX IX_Report_SalesInvoiceItems_Item ON dbo.SalesInvoiceItems(ItemId, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Report_PurchaseBills_StatusPayment' AND object_id = OBJECT_ID(N'dbo.PurchaseBills'))
    CREATE INDEX IX_Report_PurchaseBills_StatusPayment ON dbo.PurchaseBills(Status, PaymentStatus, BillDate, IsDeleted);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Report_StockMovements_DateItem' AND object_id = OBJECT_ID(N'dbo.StockMovements'))
    CREATE INDEX IX_Report_StockMovements_DateItem ON dbo.StockMovements(CreatedAtUtc, ItemId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Report_PartyLedger_Date' AND object_id = OBJECT_ID(N'dbo.PartyLedgerEntries'))
    CREATE INDEX IX_Report_PartyLedger_Date ON dbo.PartyLedgerEntries(EntryDate, PartyId, IsDeleted);
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SalesSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(CASE WHEN Status <> 5 THEN 1 END) TotalInvoices,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN SubTotal + DiscountAmount ELSE 0 END), 0) GrossAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN SubTotal ELSE 0 END), 0) TaxableAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN TaxAmount ELSE 0 END), 0) TaxAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN DiscountAmount ELSE 0 END), 0) DiscountAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN GrandTotal ELSE 0 END), 0) TotalAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN PaidAmount ELSE 0 END), 0) PaidAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN DueAmount ELSE 0 END), 0) BalanceAmount,
        COALESCE(SUM(CASE WHEN Status = 5 THEN GrandTotal ELSE 0 END), 0) CancelledAmount
    FROM dbo.SalesInvoices
    WHERE IsDeleted = 0
      AND (@FromDate IS NULL OR InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR InvoiceDate <= @ToDate);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SalesInvoiceRegister
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Status INT = NULL,
    @PaymentStatus INT = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'InvoiceDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.Id,
        i.InvoiceNumber,
        i.InvoiceDate,
        i.CustomerPartyId,
        p.PartyName CustomerName,
        i.Status,
        i.PaymentStatus,
        i.SubTotal TaxableAmount,
        i.TaxAmount,
        i.GrandTotal TotalAmount,
        i.PaidAmount,
        i.DueAmount BalanceAmount,
        COUNT(1) OVER() TotalCount
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.IsDeleted = 0
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
      AND (@PartyId IS NULL OR i.CustomerPartyId = @PartyId)
      AND (@Status IS NULL OR i.Status = @Status)
      AND (@PaymentStatus IS NULL OR i.PaymentStatus = @PaymentStatus)
      AND (@Search IS NULL OR i.InvoiceNumber LIKE N'%' + @Search + N'%' OR p.PartyName LIKE N'%' + @Search + N'%')
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'InvoiceNumber' THEN i.InvoiceNumber END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'CustomerName' THEN p.PartyName END ASC,
        CASE WHEN @SortDirection = N'ASC' THEN i.InvoiceDate END ASC,
        CASE WHEN @SortDirection <> N'ASC' AND @SortBy = N'InvoiceNumber' THEN i.InvoiceNumber END DESC,
        CASE WHEN @SortDirection <> N'ASC' AND @SortBy = N'CustomerName' THEN p.PartyName END DESC,
        CASE WHEN @SortDirection <> N'ASC' THEN i.InvoiceDate END DESC,
        i.Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SalesByParty
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.Id PartyId,
        p.PartyName,
        COUNT(1) InvoiceCount,
        COALESCE(SUM(i.SubTotal), 0) TaxableAmount,
        COALESCE(SUM(i.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(i.GrandTotal), 0) TotalAmount,
        COALESCE(SUM(i.PaidAmount), 0) PaidAmount,
        COALESCE(SUM(i.DueAmount), 0) BalanceAmount
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.IsDeleted = 0
      AND i.Status <> 5
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
      AND (@PartyId IS NULL OR i.CustomerPartyId = @PartyId)
    GROUP BY p.Id, p.PartyName
    ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SalesByItem
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @ItemId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ii.ItemId,
        ii.ItemNameSnapshot ItemName,
        ii.HsnSacCodeSnapshot HsnSacCode,
        COALESCE(SUM(ii.Quantity), 0) Quantity,
        COALESCE(SUM(ii.Quantity * ii.Rate - ii.DiscountAmount), 0) TaxableAmount,
        COALESCE(SUM(ii.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(ii.LineTotal), 0) TotalAmount
    FROM dbo.SalesInvoiceItems ii
    JOIN dbo.SalesInvoices i ON i.Id = ii.SalesInvoiceId
    WHERE ii.IsDeleted = 0
      AND i.IsDeleted = 0
      AND i.Status <> 5
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
      AND (@ItemId IS NULL OR ii.ItemId = @ItemId)
    GROUP BY ii.ItemId, ii.ItemNameSnapshot, ii.HsnSacCodeSnapshot
    ORDER BY ii.ItemNameSnapshot;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PaymentIn
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'PaymentDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pay.Id,
        pay.SalesInvoiceId,
        i.InvoiceNumber,
        pay.PaymentDate,
        i.CustomerPartyId,
        p.PartyName CustomerName,
        pay.Amount,
        pay.PaymentMode,
        pay.ReferenceNumber,
        pay.Notes,
        COUNT(1) OVER() TotalCount
    FROM dbo.SalesInvoicePayments pay
    JOIN dbo.SalesInvoices i ON i.Id = pay.SalesInvoiceId
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE pay.IsDeleted = 0
      AND i.IsDeleted = 0
      AND (@FromDate IS NULL OR pay.PaymentDate >= @FromDate)
      AND (@ToDate IS NULL OR pay.PaymentDate <= @ToDate)
      AND (@PartyId IS NULL OR i.CustomerPartyId = @PartyId)
      AND (@Search IS NULL OR i.InvoiceNumber LIKE N'%' + @Search + N'%' OR p.PartyName LIKE N'%' + @Search + N'%' OR pay.ReferenceNumber LIKE N'%' + @Search + N'%')
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' THEN pay.PaymentDate END ASC,
        CASE WHEN @SortDirection <> N'ASC' THEN pay.PaymentDate END DESC,
        pay.Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_CustomerReceivables
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.Id PartyId,
        p.PartyName,
        COALESCE(SUM(i.GrandTotal), 0) TotalSales,
        COALESCE(SUM(i.PaidAmount), 0) PaidAmount,
        COALESCE(SUM(i.DueAmount), 0) BalanceAmount
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.IsDeleted = 0
      AND i.Status <> 5
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
      AND (@PartyId IS NULL OR i.CustomerPartyId = @PartyId)
    GROUP BY p.Id, p.PartyName
    HAVING COALESCE(SUM(i.DueAmount), 0) <> 0
    ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SalesTaxSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ii.HsnSacCodeSnapshot HsnSacCode,
        ii.TaxPercentageSnapshot GstRate,
        COALESCE(SUM(ii.Quantity * ii.Rate - ii.DiscountAmount), 0) TaxableAmount,
        COALESCE(SUM(ii.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(ii.LineTotal), 0) TotalAmount
    FROM dbo.SalesInvoiceItems ii
    JOIN dbo.SalesInvoices i ON i.Id = ii.SalesInvoiceId
    WHERE ii.IsDeleted = 0
      AND i.IsDeleted = 0
      AND i.Status <> 5
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
    GROUP BY ii.HsnSacCodeSnapshot, ii.TaxPercentageSnapshot
    ORDER BY ii.TaxPercentageSnapshot, ii.HsnSacCodeSnapshot;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PurchaseSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(CASE WHEN Status <> 5 THEN 1 END) TotalBills,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN SubTotal ELSE 0 END), 0) TaxableAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN TaxAmount ELSE 0 END), 0) TaxAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN GrandTotal ELSE 0 END), 0) TotalAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN PaidAmount ELSE 0 END), 0) PaidAmount,
        COALESCE(SUM(CASE WHEN Status <> 5 THEN BalanceAmount ELSE 0 END), 0) BalanceAmount
    FROM dbo.PurchaseBills
    WHERE IsDeleted = 0
      AND (@FromDate IS NULL OR BillDate >= @FromDate)
      AND (@ToDate IS NULL OR BillDate <= @ToDate);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PurchaseBillRegister
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Status INT = NULL,
    @PaymentStatus INT = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'BillDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.Id,
        b.PurchaseBillNo,
        b.SupplierInvoiceNo,
        b.BillDate,
        b.SupplierId,
        p.PartyName SupplierName,
        b.Status,
        b.PaymentStatus,
        b.SubTotal TaxableAmount,
        b.TaxAmount,
        b.GrandTotal TotalAmount,
        b.PaidAmount,
        b.BalanceAmount,
        COUNT(1) OVER() TotalCount
    FROM dbo.PurchaseBills b
    JOIN dbo.Parties p ON p.Id = b.SupplierId
    WHERE b.IsDeleted = 0
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
      AND (@PartyId IS NULL OR b.SupplierId = @PartyId)
      AND (@Status IS NULL OR b.Status = @Status)
      AND (@PaymentStatus IS NULL OR b.PaymentStatus = @PaymentStatus)
      AND (@Search IS NULL OR b.PurchaseBillNo LIKE N'%' + @Search + N'%' OR b.SupplierInvoiceNo LIKE N'%' + @Search + N'%' OR p.PartyName LIKE N'%' + @Search + N'%')
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'PurchaseBillNo' THEN b.PurchaseBillNo END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'SupplierName' THEN p.PartyName END ASC,
        CASE WHEN @SortDirection = N'ASC' THEN b.BillDate END ASC,
        CASE WHEN @SortDirection <> N'ASC' AND @SortBy = N'PurchaseBillNo' THEN b.PurchaseBillNo END DESC,
        CASE WHEN @SortDirection <> N'ASC' AND @SortBy = N'SupplierName' THEN p.PartyName END DESC,
        CASE WHEN @SortDirection <> N'ASC' THEN b.BillDate END DESC,
        b.Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PurchaseBySupplier
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.Id SupplierId,
        p.PartyName SupplierName,
        COUNT(1) BillCount,
        COALESCE(SUM(b.SubTotal), 0) TaxableAmount,
        COALESCE(SUM(b.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(b.GrandTotal), 0) TotalAmount,
        COALESCE(SUM(b.PaidAmount), 0) PaidAmount,
        COALESCE(SUM(b.BalanceAmount), 0) BalanceAmount
    FROM dbo.PurchaseBills b
    JOIN dbo.Parties p ON p.Id = b.SupplierId
    WHERE b.IsDeleted = 0
      AND b.Status <> 5
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
      AND (@PartyId IS NULL OR b.SupplierId = @PartyId)
    GROUP BY p.Id, p.PartyName
    ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PurchaseByItem
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @ItemId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        bi.ItemId,
        bi.ItemNameSnapshot ItemName,
        it.HSNCode HsnSacCode,
        COALESCE(SUM(bi.Quantity), 0) Quantity,
        COALESCE(SUM(bi.Quantity * bi.PurchasePrice - bi.DiscountAmount), 0) TaxableAmount,
        COALESCE(SUM(bi.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(bi.LineTotal), 0) TotalAmount
    FROM dbo.PurchaseBillItems bi
    JOIN dbo.PurchaseBills b ON b.Id = bi.PurchaseBillId
    JOIN dbo.Items it ON it.Id = bi.ItemId
    WHERE bi.IsDeleted = 0
      AND b.IsDeleted = 0
      AND b.Status <> 5
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
      AND (@ItemId IS NULL OR bi.ItemId = @ItemId)
    GROUP BY bi.ItemId, bi.ItemNameSnapshot, it.HSNCode
    ORDER BY bi.ItemNameSnapshot;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PaymentOut
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'PaymentDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pay.Id,
        pay.PaymentOutNo,
        pay.PaymentDate,
        pay.SupplierId,
        p.PartyName SupplierName,
        pay.Amount,
        pay.PaymentMode,
        pay.ReferenceNo,
        pay.Notes,
        COUNT(1) OVER() TotalCount
    FROM dbo.SupplierPayments pay
    JOIN dbo.Parties p ON p.Id = pay.SupplierId
    WHERE pay.IsDeleted = 0
      AND (@FromDate IS NULL OR pay.PaymentDate >= @FromDate)
      AND (@ToDate IS NULL OR pay.PaymentDate <= @ToDate)
      AND (@PartyId IS NULL OR pay.SupplierId = @PartyId)
      AND (@Search IS NULL OR pay.PaymentOutNo LIKE N'%' + @Search + N'%' OR p.PartyName LIKE N'%' + @Search + N'%' OR pay.ReferenceNo LIKE N'%' + @Search + N'%')
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' THEN pay.PaymentDate END ASC,
        CASE WHEN @SortDirection <> N'ASC' THEN pay.PaymentDate END DESC,
        pay.Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SupplierPayables
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.Id PartyId,
        p.PartyName,
        COALESCE(SUM(b.GrandTotal), 0) TotalPurchase,
        COALESCE(SUM(b.PaidAmount), 0) PaidAmount,
        COALESCE(SUM(b.BalanceAmount), 0) BalanceAmount
    FROM dbo.PurchaseBills b
    JOIN dbo.Parties p ON p.Id = b.SupplierId
    WHERE b.IsDeleted = 0
      AND b.Status <> 5
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
      AND (@PartyId IS NULL OR b.SupplierId = @PartyId)
    GROUP BY p.Id, p.PartyName
    HAVING COALESCE(SUM(b.BalanceAmount), 0) <> 0
    ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PurchaseTaxSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        it.HSNCode HsnSacCode,
        bi.TaxPercentage GstRate,
        COALESCE(SUM(bi.Quantity * bi.PurchasePrice - bi.DiscountAmount), 0) TaxableAmount,
        COALESCE(SUM(bi.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(bi.LineTotal), 0) TotalAmount
    FROM dbo.PurchaseBillItems bi
    JOIN dbo.PurchaseBills b ON b.Id = bi.PurchaseBillId
    JOIN dbo.Items it ON it.Id = bi.ItemId
    WHERE bi.IsDeleted = 0
      AND b.IsDeleted = 0
      AND b.Status <> 5
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
    GROUP BY it.HSNCode, bi.TaxPercentage
    ORDER BY bi.TaxPercentage, it.HSNCode;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_ExpenseSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(1) TotalExpenses,
        COALESCE(SUM(e.Amount), 0) ExpenseAmount,
        COALESCE(SUM(e.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(e.TotalAmount), 0) TotalAmount
    FROM dbo.Expenses e
    WHERE e.IsDeleted = 0
      AND (@FromDate IS NULL OR e.ExpenseDate >= @FromDate)
      AND (@ToDate IS NULL OR e.ExpenseDate <= @ToDate)
      AND (@CategoryId IS NULL OR e.CategoryId = @CategoryId)
      AND (@PartyId IS NULL OR e.PaidToPartyId = @PartyId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_ExpenseByCategory
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Id CategoryId,
        c.Name CategoryName,
        COUNT(1) ExpenseCount,
        COALESCE(SUM(e.Amount), 0) ExpenseAmount,
        COALESCE(SUM(e.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(e.TotalAmount), 0) TotalAmount
    FROM dbo.Expenses e
    JOIN dbo.ExpenseCategories c ON c.Id = e.CategoryId
    WHERE e.IsDeleted = 0
      AND c.IsDeleted = 0
      AND (@FromDate IS NULL OR e.ExpenseDate >= @FromDate)
      AND (@ToDate IS NULL OR e.ExpenseDate <= @ToDate)
      AND (@CategoryId IS NULL OR e.CategoryId = @CategoryId)
      AND (@PartyId IS NULL OR e.PaidToPartyId = @PartyId)
    GROUP BY c.Id, c.Name
    ORDER BY c.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_ExpenseByParty
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.PaidToPartyId PartyId,
        COALESCE(p.PartyName, N'Unassigned') PartyName,
        COUNT(1) ExpenseCount,
        COALESCE(SUM(e.Amount), 0) ExpenseAmount,
        COALESCE(SUM(e.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(e.TotalAmount), 0) TotalAmount
    FROM dbo.Expenses e
    LEFT JOIN dbo.Parties p ON p.Id = e.PaidToPartyId
    WHERE e.IsDeleted = 0
      AND (@FromDate IS NULL OR e.ExpenseDate >= @FromDate)
      AND (@ToDate IS NULL OR e.ExpenseDate <= @ToDate)
      AND (@CategoryId IS NULL OR e.CategoryId = @CategoryId)
      AND (@PartyId IS NULL OR e.PaidToPartyId = @PartyId)
    GROUP BY e.PaidToPartyId, p.PartyName
    ORDER BY PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_MonthlyExpenseSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CategoryId BIGINT = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        YEAR(e.ExpenseDate) ExpenseYear,
        MONTH(e.ExpenseDate) ExpenseMonth,
        DATENAME(MONTH, e.ExpenseDate) MonthName,
        COUNT(1) ExpenseCount,
        COALESCE(SUM(e.Amount), 0) ExpenseAmount,
        COALESCE(SUM(e.TaxAmount), 0) TaxAmount,
        COALESCE(SUM(e.TotalAmount), 0) TotalAmount
    FROM dbo.Expenses e
    WHERE e.IsDeleted = 0
      AND (@FromDate IS NULL OR e.ExpenseDate >= @FromDate)
      AND (@ToDate IS NULL OR e.ExpenseDate <= @ToDate)
      AND (@CategoryId IS NULL OR e.CategoryId = @CategoryId)
      AND (@PartyId IS NULL OR e.PaidToPartyId = @PartyId)
    GROUP BY YEAR(e.ExpenseDate), MONTH(e.ExpenseDate), DATENAME(MONTH, e.ExpenseDate)
    ORDER BY ExpenseYear, ExpenseMonth;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_StockSummary
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = NULL,
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.Id ItemId,
        i.ItemCode,
        i.Name ItemName,
        c.Name CategoryName,
        u.Name UnitName,
        i.OpeningStock,
        i.CurrentStock,
        i.ReservedStock,
        i.MinimumStock,
        i.CurrentStock * i.PurchasePrice StockValue
    FROM dbo.Items i
    JOIN dbo.Categories c ON c.Id = i.CategoryId
    JOIN dbo.Units u ON u.Id = i.UnitId
    WHERE i.IsDeleted = 0
      AND i.TrackInventory = 1
      AND (@ItemId IS NULL OR i.Id = @ItemId)
      AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
      AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    ORDER BY i.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_StockLedger
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'MovementDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    WITH movements AS
    (
        SELECT
            sm.Id,
            CAST(sm.CreatedAtUtc AS DATE) MovementDate,
            sm.ItemId,
            i.ItemCode,
            i.Name ItemName,
            sm.SourceType,
            sm.SourceId,
            sm.MovementType,
            CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (2, 4) THEN -sm.Quantity ELSE sm.Quantity END SignedQuantity
        FROM dbo.StockMovements sm
        JOIN dbo.Items i ON i.Id = sm.ItemId
        WHERE i.IsDeleted = 0
          AND (@FromDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) >= @FromDate)
          AND (@ToDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) <= @ToDate)
          AND (@ItemId IS NULL OR sm.ItemId = @ItemId)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    )
    SELECT
        Id,
        MovementDate,
        ItemId,
        ItemCode,
        ItemName,
        SourceType,
        SourceId,
        MovementType,
        CASE WHEN SignedQuantity > 0 THEN SignedQuantity ELSE 0 END InQuantity,
        CASE WHEN SignedQuantity < 0 THEN ABS(SignedQuantity) ELSE 0 END OutQuantity,
        SUM(SignedQuantity) OVER(PARTITION BY ItemId ORDER BY MovementDate, Id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) BalanceQuantity,
        COUNT(1) OVER() TotalCount
    FROM movements
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' THEN MovementDate END ASC,
        CASE WHEN @SortDirection <> N'ASC' THEN MovementDate END DESC,
        Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_ItemMovement
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'ItemName',
    @SortDirection NVARCHAR(4) = N'ASC'
AS
BEGIN
    SET NOCOUNT ON;

    WITH grouped AS
    (
        SELECT
            i.Id ItemId,
            i.ItemCode,
            i.Name ItemName,
            sm.MovementType,
            COALESCE(SUM(CASE WHEN (CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (2, 4) THEN -sm.Quantity ELSE sm.Quantity END) > 0 THEN ABS(sm.Quantity) ELSE 0 END), 0) InQuantity,
            COALESCE(SUM(CASE WHEN (CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (2, 4) THEN -sm.Quantity ELSE sm.Quantity END) < 0 THEN ABS(sm.Quantity) ELSE 0 END), 0) OutQuantity,
            COALESCE(SUM(CASE WHEN sm.Quantity < 0 THEN sm.Quantity WHEN sm.MovementType IN (2, 4) THEN -sm.Quantity ELSE sm.Quantity END), 0) NetQuantity
        FROM dbo.StockMovements sm
        JOIN dbo.Items i ON i.Id = sm.ItemId
        WHERE i.IsDeleted = 0
          AND (@FromDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) >= @FromDate)
          AND (@ToDate IS NULL OR CAST(sm.CreatedAtUtc AS DATE) <= @ToDate)
          AND (@ItemId IS NULL OR sm.ItemId = @ItemId)
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
          AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
        GROUP BY i.Id, i.ItemCode, i.Name, sm.MovementType
    )
    SELECT *, COUNT(1) OVER() TotalCount
    FROM grouped
    ORDER BY ItemName, MovementType
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_LowStock
    @CategoryId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.Id ItemId,
        i.ItemCode,
        i.Name ItemName,
        c.Name CategoryName,
        u.Name UnitName,
        i.CurrentStock,
        i.MinimumStock,
        i.MinimumStock - i.CurrentStock ShortageQuantity
    FROM dbo.Items i
    JOIN dbo.Categories c ON c.Id = i.CategoryId
    JOIN dbo.Units u ON u.Id = i.UnitId
    WHERE i.IsDeleted = 0
      AND i.TrackInventory = 1
      AND i.CurrentStock <= i.MinimumStock
      AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
      AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    ORDER BY i.CurrentStock, i.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_StockValuation
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @ItemId BIGINT = NULL,
    @CategoryId BIGINT = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = NULL,
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.Id ItemId,
        i.ItemCode,
        i.Name ItemName,
        c.Name CategoryName,
        i.CurrentStock,
        i.PurchasePrice ValuationRate,
        i.CurrentStock * i.PurchasePrice StockValue
    FROM dbo.Items i
    JOIN dbo.Categories c ON c.Id = i.CategoryId
    WHERE i.IsDeleted = 0
      AND i.TrackInventory = 1
      AND (@ItemId IS NULL OR i.Id = @ItemId)
      AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
      AND (@Search IS NULL OR i.Name LIKE N'%' + @Search + N'%' OR i.ItemCode LIKE N'%' + @Search + N'%')
    ORDER BY StockValue DESC, i.Name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PartyLedger
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL,
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'EntryDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    WITH ledger AS
    (
        SELECT
            l.Id,
            l.PartyId,
            p.PartyName,
            l.EntryDate,
            l.SourceType,
            l.SourceId,
            l.EntryType,
            CASE WHEN l.Amount > 0 THEN l.Amount ELSE 0 END Debit,
            CASE WHEN l.Amount < 0 THEN ABS(l.Amount) ELSE 0 END Credit,
            l.Amount,
            l.Notes
        FROM dbo.PartyLedgerEntries l
        JOIN dbo.Parties p ON p.Id = l.PartyId
        WHERE l.IsDeleted = 0
          AND (@FromDate IS NULL OR l.EntryDate >= @FromDate)
          AND (@ToDate IS NULL OR l.EntryDate <= @ToDate)
          AND (@PartyId IS NULL OR l.PartyId = @PartyId)
          AND (@Search IS NULL OR p.PartyName LIKE N'%' + @Search + N'%' OR l.SourceType LIKE N'%' + @Search + N'%' OR l.EntryType LIKE N'%' + @Search + N'%')
    )
    SELECT
        Id,
        PartyId,
        PartyName,
        EntryDate,
        SourceType,
        SourceId,
        EntryType,
        Debit,
        Credit,
        SUM(Amount) OVER(PARTITION BY PartyId ORDER BY EntryDate, Id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) Balance,
        Notes,
        COUNT(1) OVER() TotalCount
    FROM ledger
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' THEN EntryDate END ASC,
        CASE WHEN @SortDirection <> N'ASC' THEN EntryDate END DESC,
        Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_CustomerStatement
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.PartyId,
        p.PartyName,
        l.EntryDate,
        l.SourceType,
        l.SourceId,
        l.EntryType,
        CASE WHEN l.Amount > 0 THEN l.Amount ELSE 0 END Debit,
        CASE WHEN l.Amount < 0 THEN ABS(l.Amount) ELSE 0 END Credit,
        SUM(l.Amount) OVER(PARTITION BY l.PartyId ORDER BY l.EntryDate, l.Id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) Balance,
        l.Notes
    FROM dbo.PartyLedgerEntries l
    JOIN dbo.Parties p ON p.Id = l.PartyId
    WHERE l.IsDeleted = 0
      AND l.SourceType IN (N'SalesInvoice', N'SalesPayment')
      AND (@FromDate IS NULL OR l.EntryDate >= @FromDate)
      AND (@ToDate IS NULL OR l.EntryDate <= @ToDate)
      AND (@PartyId IS NULL OR l.PartyId = @PartyId)
    ORDER BY l.EntryDate, l.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_SupplierStatement
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.PartyId,
        p.PartyName,
        l.EntryDate,
        l.SourceType,
        l.SourceId,
        l.EntryType,
        CASE WHEN l.Amount > 0 THEN l.Amount ELSE 0 END Debit,
        CASE WHEN l.Amount < 0 THEN ABS(l.Amount) ELSE 0 END Credit,
        SUM(l.Amount) OVER(PARTITION BY l.PartyId ORDER BY l.EntryDate, l.Id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) Balance,
        l.Notes
    FROM dbo.PartyLedgerEntries l
    JOIN dbo.Parties p ON p.Id = l.PartyId
    WHERE l.IsDeleted = 0
      AND l.SourceType IN (N'PurchaseBill', N'SupplierPayment', N'PurchaseReturn')
      AND (@FromDate IS NULL OR l.EntryDate >= @FromDate)
      AND (@ToDate IS NULL OR l.EntryDate <= @ToDate)
      AND (@PartyId IS NULL OR l.PartyId = @PartyId)
    ORDER BY l.EntryDate, l.Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_ReceivableAging
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.Id PartyId,
        p.PartyName,
        COALESCE(SUM(i.DueAmount), 0) CurrentBalance,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, i.InvoiceDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) BETWEEN 0 AND 30 THEN i.DueAmount ELSE 0 END), 0) Days0To30,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, i.InvoiceDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) BETWEEN 31 AND 60 THEN i.DueAmount ELSE 0 END), 0) Days31To60,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, i.InvoiceDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) BETWEEN 61 AND 90 THEN i.DueAmount ELSE 0 END), 0) Days61To90,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, i.InvoiceDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) > 90 THEN i.DueAmount ELSE 0 END), 0) DaysOver90
    FROM dbo.SalesInvoices i
    JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
    WHERE i.IsDeleted = 0
      AND i.Status <> 5
      AND i.DueAmount > 0
      AND (@FromDate IS NULL OR i.InvoiceDate >= @FromDate)
      AND (@ToDate IS NULL OR i.InvoiceDate <= @ToDate)
      AND (@PartyId IS NULL OR i.CustomerPartyId = @PartyId)
    GROUP BY p.Id, p.PartyName
    ORDER BY p.PartyName;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Report_PayableAging
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @PartyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.Id PartyId,
        p.PartyName,
        COALESCE(SUM(b.BalanceAmount), 0) CurrentBalance,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, b.BillDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) BETWEEN 0 AND 30 THEN b.BalanceAmount ELSE 0 END), 0) Days0To30,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, b.BillDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) BETWEEN 31 AND 60 THEN b.BalanceAmount ELSE 0 END), 0) Days31To60,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, b.BillDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) BETWEEN 61 AND 90 THEN b.BalanceAmount ELSE 0 END), 0) Days61To90,
        COALESCE(SUM(CASE WHEN DATEDIFF(DAY, b.BillDate, COALESCE(@ToDate, CAST(GETDATE() AS DATE))) > 90 THEN b.BalanceAmount ELSE 0 END), 0) DaysOver90
    FROM dbo.PurchaseBills b
    JOIN dbo.Parties p ON p.Id = b.SupplierId
    WHERE b.IsDeleted = 0
      AND b.Status <> 5
      AND b.BalanceAmount > 0
      AND (@FromDate IS NULL OR b.BillDate >= @FromDate)
      AND (@ToDate IS NULL OR b.BillDate <= @ToDate)
      AND (@PartyId IS NULL OR b.SupplierId = @PartyId)
    GROUP BY p.Id, p.PartyName
    ORDER BY p.PartyName;
END;
GO
