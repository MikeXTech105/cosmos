/*
    COSMOS ERP - General Dashboard Phase 1
    Idempotent, non-destructive migration.
    - Reuses the existing Dashboard page.
    - Grants SuperAdmin Dashboard View permission by role-name lookup.
    - Creates read-only dashboard stored procedures.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

MERGE dbo.Pages AS target
USING (VALUES (N'Dashboard', N'Dashboard', N'/dashboard', N'layout-dashboard', 10))
    AS source(Name, DisplayName, Route, Icon, SortOrder)
ON target.Name = source.Name
WHEN MATCHED THEN
    UPDATE SET DisplayName = source.DisplayName, Route = source.Route, Icon = source.Icon, SortOrder = source.SortOrder, IsActive = 1
WHEN NOT MATCHED THEN
    INSERT(Name, DisplayName, Route, Icon, SortOrder, IsActive)
    VALUES(source.Name, source.DisplayName, source.Route, source.Icon, source.SortOrder, 1);
GO

INSERT dbo.RolePermissions(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
SELECT r.Id, p.Id, 1, 0, 0, 0, 0, 0
FROM dbo.Roles r
JOIN dbo.Pages p ON p.Name = N'Dashboard'
WHERE r.Name = N'SuperAdmin'
  AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PageId = p.Id);

UPDATE rp
SET CanView = 1
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.Id = rp.RoleId
JOIN dbo.Pages p ON p.Id = rp.PageId
WHERE r.Name = N'SuperAdmin'
  AND p.Name = N'Dashboard';
GO

IF OBJECT_ID(N'dbo.sp_Dashboard_HrSummary', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_HrSummary AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Dashboard_Overview', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_Overview AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Dashboard_SalesPurchaseTrend', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_SalesPurchaseTrend AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Dashboard_TopSellingItems', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_TopSellingItems AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Dashboard_TopParties', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_TopParties AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Dashboard_Alerts', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_Alerts AS BEGIN SET NOCOUNT ON; END');
IF OBJECT_ID(N'dbo.sp_Dashboard_RevenueExpenseTrend', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.sp_Dashboard_RevenueExpenseTrend AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_Dashboard_Overview
    @FromDate DATE,
    @ToDate DATE,
    @PreviousFromDate DATE,
    @PreviousToDate DATE,
    @Today DATE,
    @MonthStart DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COALESCE(SUM(CASE WHEN InvoiceDate = @Today AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) TodaySales,
        COALESCE(SUM(CASE WHEN InvoiceDate >= @MonthStart AND InvoiceDate <= @Today AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) CurrentMonthSales,
        COALESCE(SUM(CASE WHEN InvoiceDate BETWEEN @FromDate AND @ToDate AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) SelectedPeriodSales,
        COALESCE(SUM(CASE WHEN InvoiceDate BETWEEN @PreviousFromDate AND @PreviousToDate AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) PreviousComparablePeriodSales,
        CAST(NULL AS DECIMAL(18,2)) GrowthPercentage,
        COUNT(CASE WHEN InvoiceDate BETWEEN @FromDate AND @ToDate AND Status IN (2, 3, 4) THEN 1 END) SalesInvoiceCount,
        COALESCE(SUM(CASE WHEN InvoiceDate BETWEEN @FromDate AND @ToDate AND Status IN (2, 3, 4) THEN PaidAmount ELSE 0 END), 0) AmountReceived,
        COALESCE(SUM(CASE WHEN Status IN (2, 3, 4) THEN DueAmount ELSE 0 END), 0) SalesOutstanding
    FROM dbo.SalesInvoices
    WHERE IsDeleted = 0;

    SELECT
        COALESCE(SUM(CASE WHEN BillDate = @Today AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) TodayPurchases,
        COALESCE(SUM(CASE WHEN BillDate >= @MonthStart AND BillDate <= @Today AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) CurrentMonthPurchases,
        COALESCE(SUM(CASE WHEN BillDate BETWEEN @FromDate AND @ToDate AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) SelectedPeriodPurchases,
        COALESCE(SUM(CASE WHEN BillDate BETWEEN @PreviousFromDate AND @PreviousToDate AND Status IN (2, 3, 4) THEN GrandTotal ELSE 0 END), 0) PreviousComparablePeriodPurchases,
        CAST(NULL AS DECIMAL(18,2)) GrowthPercentage,
        COUNT(CASE WHEN BillDate BETWEEN @FromDate AND @ToDate AND Status IN (2, 3, 4) THEN 1 END) PurchaseBillCount,
        COALESCE(SUM(CASE WHEN BillDate BETWEEN @FromDate AND @ToDate AND Status IN (2, 3, 4) THEN PaidAmount ELSE 0 END), 0) AmountPaid,
        COALESCE(SUM(CASE WHEN Status IN (2, 3, 4) THEN BalanceAmount ELSE 0 END), 0) PurchaseOutstanding
    FROM dbo.PurchaseBills
    WHERE IsDeleted = 0;

    WITH expense_totals AS
    (
        SELECT
            e.CategoryId,
            c.Name CategoryName,
            SUM(CASE WHEN e.ExpenseDate BETWEEN @FromDate AND @ToDate THEN e.TotalAmount ELSE 0 END) PeriodAmount
        FROM dbo.Expenses e
        JOIN dbo.ExpenseCategories c ON c.Id = e.CategoryId
        WHERE e.IsDeleted = 0
        GROUP BY e.CategoryId, c.Name
    )
    SELECT
        COALESCE((SELECT SUM(TotalAmount) FROM dbo.Expenses WHERE IsDeleted = 0 AND ExpenseDate = @Today), 0) TodayExpenses,
        COALESCE((SELECT SUM(TotalAmount) FROM dbo.Expenses WHERE IsDeleted = 0 AND ExpenseDate BETWEEN @MonthStart AND @Today), 0) CurrentMonthExpenses,
        COALESCE((SELECT SUM(TotalAmount) FROM dbo.Expenses WHERE IsDeleted = 0 AND ExpenseDate BETWEEN @FromDate AND @ToDate), 0) SelectedPeriodExpenses,
        (SELECT TOP (1) CategoryName FROM expense_totals WHERE PeriodAmount > 0 ORDER BY PeriodAmount DESC, CategoryName) HighestExpenseCategory,
        COALESCE((SELECT TOP (1) PeriodAmount FROM expense_totals WHERE PeriodAmount > 0 ORDER BY PeriodAmount DESC, CategoryName), 0) HighestExpenseCategoryAmount,
        (SELECT COUNT(1) FROM dbo.Expenses WHERE IsDeleted = 0 AND ExpenseDate BETWEEN @FromDate AND @ToDate) ExpenseTransactionCount;

    SELECT
        COALESCE(SUM(DueAmount), 0) TotalOutstanding,
        COALESCE(SUM(CASE WHEN DueDate IS NOT NULL AND DueDate < @Today THEN DueAmount ELSE 0 END), 0) OverdueAmount,
        COUNT(DISTINCT CASE WHEN DueAmount > 0 THEN CustomerPartyId END) PartyCountWithOutstanding,
        MAX(CASE WHEN DueDate IS NOT NULL AND DueDate < @Today AND DueAmount > 0 THEN DATEDIFF(DAY, DueDate, @Today) END) OldestOverdueDays,
        COUNT(CASE WHEN DueDate IS NOT NULL AND DueDate < @Today AND DueAmount > 0 THEN 1 END) OverdueDocumentCount
    FROM dbo.SalesInvoices
    WHERE IsDeleted = 0 AND Status IN (2, 3, 4);

    SELECT
        COALESCE(SUM(BalanceAmount), 0) TotalOutstanding,
        COALESCE(SUM(CASE WHEN DueDate IS NOT NULL AND DueDate < @Today THEN BalanceAmount ELSE 0 END), 0) OverdueAmount,
        COUNT(DISTINCT CASE WHEN BalanceAmount > 0 THEN SupplierId END) PartyCountWithOutstanding,
        MAX(CASE WHEN DueDate IS NOT NULL AND DueDate < @Today AND BalanceAmount > 0 THEN DATEDIFF(DAY, DueDate, @Today) END) OldestOverdueDays,
        COUNT(CASE WHEN DueDate IS NOT NULL AND DueDate < @Today AND BalanceAmount > 0 THEN 1 END) OverdueDocumentCount
    FROM dbo.PurchaseBills
    WHERE IsDeleted = 0 AND Status IN (2, 3, 4);

    SELECT
        COALESCE(SUM(CurrentStock * PurchasePrice), 0) CurrentStockValue,
        COUNT(1) TotalInventoryTrackedItems,
        COUNT(CASE WHEN MinimumStock > 0 AND CurrentStock <= MinimumStock THEN 1 END) LowStockCount,
        COUNT(CASE WHEN CurrentStock = 0 THEN 1 END) OutOfStockCount,
        COUNT(CASE WHEN CurrentStock < 0 THEN 1 END) NegativeStockCount,
        CAST(NULL AS DECIMAL(18,2)) DeadStockValue,
        N'Items.CurrentStock x Items.PurchasePrice' ValuationMethod
    FROM dbo.Items
    WHERE IsDeleted = 0 AND IsActive = 1 AND TrackInventory = 1;

    SELECT
        (SELECT COUNT(1) FROM dbo.SalesInvoices si WHERE si.IsDeleted = 0 AND si.Status IN (2, 3, 4) AND NOT EXISTS (SELECT 1 FROM dbo.EInvoices ei WHERE ei.SalesInvoiceId = si.Id AND ei.IsDeleted = 0 AND ei.Status <> N'Cancelled')) PendingEInvoices,
        (SELECT COUNT(1) FROM dbo.GstApiLogs WHERE ApiType LIKE N'%EInvoice%' AND IsSuccess = 0) FailedEInvoices,
        (SELECT COUNT(1) FROM dbo.EInvoices WHERE IsDeleted = 0 AND Status = N'Cancelled') CancelledEInvoices,
        (SELECT COUNT(1) FROM dbo.SalesInvoices si WHERE si.IsDeleted = 0 AND si.Status IN (2, 3, 4) AND NOT EXISTS (SELECT 1 FROM dbo.EWayBills ew WHERE ew.SalesInvoiceId = si.Id AND ew.IsDeleted = 0 AND ew.Status <> N'Cancelled')) PendingEWayBills,
        (SELECT COUNT(1) FROM dbo.GstApiLogs WHERE ApiType LIKE N'%EWay%' AND IsSuccess = 0) FailedEWayBills,
        (SELECT COUNT(1) FROM dbo.EWayBills WHERE IsDeleted = 0 AND Status = N'Cancelled') CancelledEWayBills,
        (SELECT COUNT(1) FROM dbo.EWayBills WHERE IsDeleted = 0 AND Status = N'Generated' AND ValidUpTo IS NOT NULL AND CONVERT(DATE, ValidUpTo) BETWEEN @Today AND DATEADD(DAY, 3, @Today)) ExpiringEWayBills;

    EXEC dbo.sp_Dashboard_HrSummary @AttendanceDate = @Today;

    SELECT
        (SELECT COUNT(1) FROM dbo.Items WHERE IsDeleted = 0 AND IsActive = 1 AND TrackInventory = 1 AND (CurrentStock = 0 OR CurrentStock < 0 OR (MinimumStock > 0 AND CurrentStock <= MinimumStock))) InventoryAlerts,
        (SELECT COUNT(1) FROM dbo.SalesInvoices WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND DueAmount > 0 AND DueDate IS NOT NULL AND DueDate < @Today) ReceivableAlerts,
        (SELECT COUNT(1) FROM dbo.PurchaseBills WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND BalanceAmount > 0 AND DueDate IS NOT NULL AND DueDate < @Today) PayableAlerts,
        (SELECT COUNT(1) FROM dbo.GstApiLogs WHERE IsSuccess = 0) GstAlerts;
END;
GO

ALTER PROCEDURE dbo.sp_Dashboard_SalesPurchaseTrend
    @FromDate DATE,
    @ToDate DATE,
    @GroupBy NVARCHAR(20) = N'Month'
AS
BEGIN
    SET NOCOUNT ON;

    WITH dates AS
    (
        SELECT @FromDate Dt
        UNION ALL
        SELECT DATEADD(DAY, 1, Dt) FROM dates WHERE Dt < @ToDate
    ),
    periods AS
    (
        SELECT DISTINCT
            CASE
                WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), Dt, 23)
                WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt), 23)
                ELSE CONVERT(CHAR(7), Dt, 23)
            END PeriodKey,
            CASE
                WHEN @GroupBy = N'Day' THEN CONVERT(NVARCHAR(20), Dt, 106)
                WHEN @GroupBy = N'Week' THEN N'Week of ' + CONVERT(NVARCHAR(20), DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt), 106)
                ELSE FORMAT(Dt, N'yyyy-MM')
            END PeriodLabel,
            CASE
                WHEN @GroupBy = N'Day' THEN Dt
                WHEN @GroupBy = N'Week' THEN DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt)
                ELSE DATEFROMPARTS(YEAR(Dt), MONTH(Dt), 1)
            END PeriodStart,
            CASE
                WHEN @GroupBy = N'Day' THEN Dt
                WHEN @GroupBy = N'Week' THEN DATEADD(DAY, 6, DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt))
                ELSE EOMONTH(Dt)
            END PeriodEnd
        FROM dates
    ),
    sales AS
    (
        SELECT
            CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), InvoiceDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, InvoiceDate) % 7, InvoiceDate), 23) ELSE CONVERT(CHAR(7), InvoiceDate, 23) END PeriodKey,
            SUM(GrandTotal) SalesAmount,
            COUNT(1) SalesTransactionCount
        FROM dbo.SalesInvoices
        WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND InvoiceDate BETWEEN @FromDate AND @ToDate
        GROUP BY CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), InvoiceDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, InvoiceDate) % 7, InvoiceDate), 23) ELSE CONVERT(CHAR(7), InvoiceDate, 23) END
    ),
    purchases AS
    (
        SELECT
            CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), BillDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, BillDate) % 7, BillDate), 23) ELSE CONVERT(CHAR(7), BillDate, 23) END PeriodKey,
            SUM(GrandTotal) PurchaseAmount,
            COUNT(1) PurchaseTransactionCount
        FROM dbo.PurchaseBills
        WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND BillDate BETWEEN @FromDate AND @ToDate
        GROUP BY CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), BillDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, BillDate) % 7, BillDate), 23) ELSE CONVERT(CHAR(7), BillDate, 23) END
    )
    SELECT
        p.PeriodKey,
        p.PeriodLabel,
        p.PeriodStart,
        CASE WHEN p.PeriodEnd > @ToDate THEN @ToDate ELSE p.PeriodEnd END PeriodEnd,
        COALESCE(s.SalesAmount, 0) SalesAmount,
        COALESCE(b.PurchaseAmount, 0) PurchaseAmount,
        COALESCE(s.SalesAmount, 0) - COALESCE(b.PurchaseAmount, 0) Difference,
        COALESCE(s.SalesTransactionCount, 0) SalesTransactionCount,
        COALESCE(b.PurchaseTransactionCount, 0) PurchaseTransactionCount
    FROM periods p
    LEFT JOIN sales s ON s.PeriodKey = p.PeriodKey
    LEFT JOIN purchases b ON b.PeriodKey = p.PeriodKey
    ORDER BY p.PeriodStart
    OPTION (MAXRECURSION 400);
END;
GO

ALTER PROCEDURE dbo.sp_Dashboard_TopSellingItems
    @FromDate DATE,
    @ToDate DATE,
    @CategoryId BIGINT = NULL,
    @Top INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    WITH rows AS
    (
        SELECT
            ROW_NUMBER() OVER(ORDER BY SUM(ii.Quantity) DESC, SUM(ii.LineTotal) DESC, i.Id) Rank,
            i.Id ItemId,
            i.ItemCode,
            i.Name ItemName,
            c.Name CategoryName,
            SUM(ii.Quantity) QuantitySold,
            SUM(ii.LineTotal) SalesAmount,
            COUNT(DISTINCT si.Id) TransactionCount,
            i.CurrentStock
        FROM dbo.SalesInvoiceItems ii
        JOIN dbo.SalesInvoices si ON si.Id = ii.SalesInvoiceId
        JOIN dbo.Items i ON i.Id = ii.ItemId
        JOIN dbo.Categories c ON c.Id = i.CategoryId
        WHERE ii.IsDeleted = 0
          AND si.IsDeleted = 0
          AND si.Status IN (2, 3, 4)
          AND si.InvoiceDate BETWEEN @FromDate AND @ToDate
          AND (@CategoryId IS NULL OR i.CategoryId = @CategoryId)
        GROUP BY i.Id, i.ItemCode, i.Name, c.Name, i.CurrentStock
    )
    SELECT TOP (@Top) * FROM rows ORDER BY Rank;
END;
GO

ALTER PROCEDURE dbo.sp_Dashboard_TopParties
    @FromDate DATE,
    @ToDate DATE,
    @PartyType NVARCHAR(20) = N'Customer',
    @Top INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    IF @PartyType = N'Supplier'
    BEGIN
        ;WITH rows AS
        (
            SELECT
                ROW_NUMBER() OVER(ORDER BY SUM(b.GrandTotal) DESC, p.Id) Rank,
                p.Id PartyId,
                p.PartyCode,
                p.PartyName,
                N'Supplier' PartyType,
                COUNT(1) TransactionCount,
                SUM(b.GrandTotal) GrossAmount,
                SUM(b.PaidAmount) ReceivedOrPaidAmount,
                SUM(b.BalanceAmount) OutstandingAmount
            FROM dbo.PurchaseBills b
            JOIN dbo.Parties p ON p.Id = b.SupplierId
            WHERE b.IsDeleted = 0 AND b.Status IN (2, 3, 4) AND b.BillDate BETWEEN @FromDate AND @ToDate
            GROUP BY p.Id, p.PartyCode, p.PartyName
        )
        SELECT TOP (@Top) * FROM rows ORDER BY Rank;
        RETURN;
    END;

    ;WITH rows AS
    (
        SELECT
            ROW_NUMBER() OVER(ORDER BY SUM(i.GrandTotal) DESC, p.Id) Rank,
            p.Id PartyId,
            p.PartyCode,
            p.PartyName,
            N'Customer' PartyType,
            COUNT(1) TransactionCount,
            SUM(i.GrandTotal) GrossAmount,
            SUM(i.PaidAmount) ReceivedOrPaidAmount,
            SUM(i.DueAmount) OutstandingAmount
        FROM dbo.SalesInvoices i
        JOIN dbo.Parties p ON p.Id = i.CustomerPartyId
        WHERE i.IsDeleted = 0 AND i.Status IN (2, 3, 4) AND i.InvoiceDate BETWEEN @FromDate AND @ToDate
        GROUP BY p.Id, p.PartyCode, p.PartyName
    )
    SELECT TOP (@Top) * FROM rows ORDER BY Rank;
END;
GO

ALTER PROCEDURE dbo.sp_Dashboard_Alerts
    @Today DATE,
    @PreviewLimit INT = 5,
    @MinimumAmount DECIMAL(18,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT N'Inventory' AlertType, COUNT(1) [Count], CAST(NULL AS DECIMAL(18,2)) Amount, CAST(NULL AS INT) OldestAgeDays
    FROM dbo.Items
    WHERE IsDeleted = 0 AND IsActive = 1 AND TrackInventory = 1 AND (CurrentStock = 0 OR CurrentStock < 0 OR (MinimumStock > 0 AND CurrentStock <= MinimumStock));

    SELECT TOP (@PreviewLimit)
        CASE WHEN CurrentStock < 0 THEN N'Critical' WHEN CurrentStock = 0 THEN N'High' ELSE N'Medium' END Severity,
        CASE WHEN CurrentStock < 0 THEN N'Negative stock' WHEN CurrentStock = 0 THEN N'Out of stock' ELSE N'Low stock' END Title,
        N'Item' EntityType,
        CONVERT(NVARCHAR(50), Id) EntityId,
        ItemCode ReferenceNumber,
        CurrentStock Amount,
        CAST(NULL AS INT) AgeDays,
        N'/reports/inventory/stock-summary' RelatedRoute
    FROM dbo.Items
    WHERE IsDeleted = 0 AND IsActive = 1 AND TrackInventory = 1 AND (CurrentStock = 0 OR CurrentStock < 0 OR (MinimumStock > 0 AND CurrentStock <= MinimumStock))
    ORDER BY CASE WHEN CurrentStock < 0 THEN 0 WHEN CurrentStock = 0 THEN 1 ELSE 2 END, CurrentStock, Name;

    SELECT N'Receivables' AlertType, COUNT(1) [Count], COALESCE(SUM(DueAmount), 0) Amount, MAX(DATEDIFF(DAY, DueDate, @Today)) OldestAgeDays
    FROM dbo.SalesInvoices
    WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND DueAmount > 0 AND DueDate IS NOT NULL AND DueDate < @Today AND (@MinimumAmount IS NULL OR DueAmount >= @MinimumAmount);

    SELECT TOP (@PreviewLimit)
        N'High' Severity,
        N'Overdue receivable' Title,
        N'SalesInvoice' EntityType,
        CONVERT(NVARCHAR(50), Id) EntityId,
        InvoiceNumber ReferenceNumber,
        DueAmount Amount,
        DATEDIFF(DAY, DueDate, @Today) AgeDays,
        N'/reports/parties/receivable-aging' RelatedRoute
    FROM dbo.SalesInvoices
    WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND DueAmount > 0 AND DueDate IS NOT NULL AND DueDate < @Today AND (@MinimumAmount IS NULL OR DueAmount >= @MinimumAmount)
    ORDER BY DueDate, DueAmount DESC;

    SELECT N'Payables' AlertType, COUNT(1) [Count], COALESCE(SUM(BalanceAmount), 0) Amount, MAX(DATEDIFF(DAY, DueDate, @Today)) OldestAgeDays
    FROM dbo.PurchaseBills
    WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND BalanceAmount > 0 AND DueDate IS NOT NULL AND DueDate < @Today AND (@MinimumAmount IS NULL OR BalanceAmount >= @MinimumAmount);

    SELECT TOP (@PreviewLimit)
        N'High' Severity,
        N'Overdue payable' Title,
        N'PurchaseBill' EntityType,
        CONVERT(NVARCHAR(50), Id) EntityId,
        PurchaseBillNo ReferenceNumber,
        BalanceAmount Amount,
        DATEDIFF(DAY, DueDate, @Today) AgeDays,
        N'/reports/parties/payable-aging' RelatedRoute
    FROM dbo.PurchaseBills
    WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND BalanceAmount > 0 AND DueDate IS NOT NULL AND DueDate < @Today AND (@MinimumAmount IS NULL OR BalanceAmount >= @MinimumAmount)
    ORDER BY DueDate, BalanceAmount DESC;

    SELECT N'GST' AlertType, COUNT(1) [Count], CAST(NULL AS DECIMAL(18,2)) Amount, CAST(NULL AS INT) OldestAgeDays
    FROM dbo.GstApiLogs
    WHERE IsSuccess = 0;

    SELECT TOP (@PreviewLimit)
        N'High' Severity,
        N'GST API failure' Title,
        N'GstApiLog' EntityType,
        CONVERT(NVARCHAR(50), Id) EntityId,
        ApiType ReferenceNumber,
        CAST(NULL AS DECIMAL(18,2)) Amount,
        DATEDIFF(DAY, CONVERT(DATE, CreatedAt), @Today) AgeDays,
        N'/gst/api-logs' RelatedRoute
    FROM dbo.GstApiLogs
    WHERE IsSuccess = 0
    ORDER BY CreatedAt DESC;
END;
GO

ALTER PROCEDURE dbo.sp_Dashboard_HrSummary
    @AttendanceDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MonthStart DATE = DATEFROMPARTS(YEAR(@AttendanceDate), MONTH(@AttendanceDate), 1);

    SELECT
        COUNT(CASE WHEN e.Status = 1 AND e.IsDeleted = 0 THEN 1 END) ActiveEmployees,
        COUNT(CASE WHEN e.Status = 1 AND a.AttendanceStatus IN (1, 3, 7) THEN 1 END) PresentToday,
        COUNT(CASE WHEN e.Status = 1 AND a.AttendanceStatus = 2 THEN 1 END) AbsentToday,
        COUNT(CASE WHEN e.Status = 1 AND (a.AttendanceStatus = 4 OR la.Id IS NOT NULL) THEN 1 END) OnLeaveToday,
        COUNT(CASE WHEN e.Status = 1 AND a.Id IS NULL AND la.Id IS NULL THEN 1 END) NotCheckedIn,
        CAST(NULL AS INT) LateArrivals,
        COUNT(CASE WHEN e.Status = 3 AND e.IsDeleted = 0 THEN 1 END) ResignedEmployees,
        COUNT(CASE WHEN e.IsDeleted = 0 AND e.JoiningDate BETWEEN @MonthStart AND @AttendanceDate THEN 1 END) NewJoinersThisMonth,
        @AttendanceDate AttendanceDate
    FROM dbo.HR_Employees e
    LEFT JOIN dbo.HR_Attendance a ON a.EmployeeId = e.Id AND a.AttendanceDate = @AttendanceDate AND a.IsDeleted = 0
    OUTER APPLY
    (
        SELECT TOP (1) Id
        FROM dbo.HR_LeaveApplications l
        WHERE l.EmployeeId = e.Id
          AND l.IsDeleted = 0
          AND l.Status = 2
          AND @AttendanceDate BETWEEN l.StartDate AND l.EndDate
    ) la
    WHERE e.IsDeleted = 0;
END;
GO

ALTER PROCEDURE dbo.sp_Dashboard_RevenueExpenseTrend
    @FromDate DATE,
    @ToDate DATE,
    @GroupBy NVARCHAR(20) = N'Month'
AS
BEGIN
    SET NOCOUNT ON;

    WITH dates AS
    (
        SELECT @FromDate Dt
        UNION ALL
        SELECT DATEADD(DAY, 1, Dt) FROM dates WHERE Dt < @ToDate
    ),
    periods AS
    (
        SELECT DISTINCT
            CASE
                WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), Dt, 23)
                WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt), 23)
                ELSE CONVERT(CHAR(7), Dt, 23)
            END PeriodKey,
            CASE
                WHEN @GroupBy = N'Day' THEN CONVERT(NVARCHAR(20), Dt, 106)
                WHEN @GroupBy = N'Week' THEN N'Week of ' + CONVERT(NVARCHAR(20), DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt), 106)
                ELSE FORMAT(Dt, N'yyyy-MM')
            END PeriodLabel,
            CASE
                WHEN @GroupBy = N'Day' THEN Dt
                WHEN @GroupBy = N'Week' THEN DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt)
                ELSE DATEFROMPARTS(YEAR(Dt), MONTH(Dt), 1)
            END PeriodStart,
            CASE
                WHEN @GroupBy = N'Day' THEN Dt
                WHEN @GroupBy = N'Week' THEN DATEADD(DAY, 6, DATEADD(DAY, -DATEDIFF(DAY, 0, Dt) % 7, Dt))
                ELSE EOMONTH(Dt)
            END PeriodEnd
        FROM dates
    ),
    sales AS
    (
        SELECT
            CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), InvoiceDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, InvoiceDate) % 7, InvoiceDate), 23) ELSE CONVERT(CHAR(7), InvoiceDate, 23) END PeriodKey,
            SUM(GrandTotal) SalesRevenue
        FROM dbo.SalesInvoices
        WHERE IsDeleted = 0 AND Status IN (2, 3, 4) AND InvoiceDate BETWEEN @FromDate AND @ToDate
        GROUP BY CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), InvoiceDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, InvoiceDate) % 7, InvoiceDate), 23) ELSE CONVERT(CHAR(7), InvoiceDate, 23) END
    ),
    expenses AS
    (
        SELECT
            CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), ExpenseDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, ExpenseDate) % 7, ExpenseDate), 23) ELSE CONVERT(CHAR(7), ExpenseDate, 23) END PeriodKey,
            SUM(TotalAmount) ExpenseAmount
        FROM dbo.Expenses
        WHERE IsDeleted = 0 AND ExpenseDate BETWEEN @FromDate AND @ToDate
        GROUP BY CASE WHEN @GroupBy = N'Day' THEN CONVERT(CHAR(10), ExpenseDate, 23) WHEN @GroupBy = N'Week' THEN CONVERT(CHAR(10), DATEADD(DAY, -DATEDIFF(DAY, 0, ExpenseDate) % 7, ExpenseDate), 23) ELSE CONVERT(CHAR(7), ExpenseDate, 23) END
    )
    SELECT
        p.PeriodKey,
        p.PeriodLabel,
        p.PeriodStart,
        CASE WHEN p.PeriodEnd > @ToDate THEN @ToDate ELSE p.PeriodEnd END PeriodEnd,
        COALESCE(s.SalesRevenue, 0) SalesRevenue,
        COALESCE(e.ExpenseAmount, 0) ExpenseAmount,
        COALESCE(s.SalesRevenue, 0) - COALESCE(e.ExpenseAmount, 0) OperatingDifference
    FROM periods p
    LEFT JOIN sales s ON s.PeriodKey = p.PeriodKey
    LEFT JOIN expenses e ON e.PeriodKey = p.PeriodKey
    ORDER BY p.PeriodStart
    OPTION (MAXRECURSION 400);
END;
GO

/*
Manual verification after applying:
EXEC dbo.sp_Dashboard_Overview @FromDate='2026-07-01', @ToDate='2026-07-10', @PreviousFromDate='2026-06-21', @PreviousToDate='2026-06-30', @Today='2026-07-10', @MonthStart='2026-07-01';
EXEC dbo.sp_Dashboard_SalesPurchaseTrend @FromDate='2026-01-01', @ToDate='2026-07-10', @GroupBy=N'Month';
EXEC dbo.sp_Dashboard_Alerts @Today='2026-07-10', @PreviewLimit=5;
*/
