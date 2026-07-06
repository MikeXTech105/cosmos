/*
04_MASTER_DATA_FIXES.sql
Insert-only safety net for required setup/master data.
No transaction/test business data is inserted.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'SuperAdmin')
        INSERT dbo.Roles(Name, Description, IsActive, CreatedOn) VALUES (N'SuperAdmin', N'Unrestricted Cosmos ERP administrator', 1, SYSUTCDATETIME());

    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'Manager')
        INSERT dbo.Roles(Name, Description, IsActive, CreatedOn) VALUES (N'Manager', N'', 1, SYSUTCDATETIME());

    IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = 1 OR Name = N'Cash')
        INSERT dbo.PaymentModes(Id, Name, IsActive) VALUES (1, N'Cash', 1);

    IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = 2 OR Name = N'Bank Transfer')
        INSERT dbo.PaymentModes(Id, Name, IsActive) VALUES (2, N'Bank Transfer', 1);

    IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = 3 OR Name = N'Card')
        INSERT dbo.PaymentModes(Id, Name, IsActive) VALUES (3, N'Card', 1);

    IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = 4 OR Name = N'UPI')
        INSERT dbo.PaymentModes(Id, Name, IsActive) VALUES (4, N'UPI', 1);

    IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = 5 OR Name = N'Cheque')
        INSERT dbo.PaymentModes(Id, Name, IsActive) VALUES (5, N'Cheque', 1);

    IF OBJECT_ID(N'dbo.PaymentModes', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.PaymentModes WHERE Id = 99 OR Name = N'Other')
        INSERT dbo.PaymentModes(Id, Name, IsActive) VALUES (99, N'Other', 1);

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Categories')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Categories', N'Categories', N'/categories', N'tags', NULL, 41, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Items')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Items', N'Items', N'/items', N'package', NULL, 40, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Units')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Units', N'Units', N'/units', N'ruler', NULL, 42, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Party')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Party', N'Party Management', N'/parties', N'contact', NULL, 35, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Users')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Users', N'Users', N'/security/users', N'user-cog', NULL, 100, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Roles')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Roles', N'Roles', N'/security/roles', N'shield', NULL, 110, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Pages')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Pages', N'Pages', N'/security/pages', N'panel-top', NULL, 120, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Permissions')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Permissions', N'Permissions', N'/security/permissions', N'key-round', NULL, 130, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Sales.Invoice')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Sales.Invoice', N'Sales Invoices', N'/sales/invoices', N'receipt', NULL, 60, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'Sales.Report')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'Sales.Report', N'Sales Reports', N'/sales/reports', N'chart-column', NULL, 61, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.PurchaseBill')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.PurchaseBill', N'Purchase Bills', N'/purchase/bills', N'receipt', NULL, 70, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.PaymentOut')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.PaymentOut', N'Payment-Out', N'/purchase/payments', N'wallet', NULL, 71, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.ExpenseCategory')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.ExpenseCategory', N'Expense Categories', N'/expenses/categories', N'tags', NULL, 72, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.Expense')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.Expense', N'Expenses', N'/expenses', N'banknote', NULL, 73, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.PurchaseOrder')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.PurchaseOrder', N'Purchase Orders', N'/purchase/orders', N'clipboard-list', NULL, 74, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.PurchaseReturn')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.PurchaseReturn', N'Purchase Returns', N'/purchase/returns', N'rotate-ccw', NULL, 75, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'PurchaseExpense.Report')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'PurchaseExpense.Report', N'Purchase & Expense Reports', N'/purchase/reports', N'chart-column', NULL, 76, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Department')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Department', N'HR Departments', N'/hr/departments', N'building', NULL, 100, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Designation')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Designation', N'HR Designations', N'/hr/designations', N'badge', NULL, 101, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Shift')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Shift', N'HR Shifts', N'/hr/shifts', N'clock', NULL, 102, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Employee')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Employee', N'HR Employees', N'/hr/employees', N'users', NULL, 103, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Attendance')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Attendance', N'HR Attendance', N'/hr/attendance', N'calendar', NULL, 104, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Leave')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Leave', N'HR Leave', N'/hr/leaves', N'calendar-off', NULL, 105, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'HR.Payroll')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'HR.Payroll', N'HR Payroll', N'/hr/payroll', N'wallet', NULL, 106, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST', N'GST Integration', N'/gst', N'receipt-text', NULL, 300, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.Configuration')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.Configuration', N'GST Configuration', N'/gst/configuration', N'settings', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 301, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.Registration')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.Registration', N'GST Registrations', N'/gst/registrations', N'building-2', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 302, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.Verification')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.Verification', N'GSTIN Verification', N'/gst/verify-gstin', N'badge-check', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 303, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.EWayBill')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.EWayBill', N'E-Way Bills', N'/gst/eway-bills', N'truck', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 304, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.EInvoice')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.EInvoice', N'E-Invoices', N'/gst/e-invoices', N'file-check-2', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 305, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.Session')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.Session', N'GST Sessions', N'/gst/sessions', N'key-round', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 306, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'GST.Logs')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'GST.Logs', N'GST API Logs', N'/gst/api-logs', N'list-checks', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'GST'), 307, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE', N'OEE', N'/oee', N'gauge', NULL, 400, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE.Dashboard')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE.Dashboard', N'OEE Dashboard', N'/oee/dashboard', N'gauge', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'OEE'), 401, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE.ProductionEntries')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE.ProductionEntries', N'Daily Production Entry', N'/oee/production-entry', N'clipboard-list', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'OEE'), 402, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE.Machines')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE.Machines', N'OEE Machines', N'/oee/machines', N'factory', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'OEE'), 403, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE.Moulds')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE.Moulds', N'OEE Moulds', N'/oee/moulds', N'box', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'OEE'), 404, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE.DowntimeReasons')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE.DowntimeReasons', N'OEE Downtime Reasons', N'/oee/downtime-reasons', N'circle-alert', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'OEE'), 405, 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pages WHERE Name = N'OEE.Reports')
    BEGIN
        INSERT dbo.Pages(Name, DisplayName, Route, Icon, ParentPageId, SortOrder, IsActive)
        VALUES (N'OEE.Reports', N'OEE Reports', N'/oee/reports', N'chart-column', (SELECT TOP (1) Id FROM dbo.Pages WHERE Name = N'OEE'), 406, 1);
    END;

    DECLARE @SuperAdminRoleId INT = (SELECT TOP (1) Id FROM dbo.Roles WHERE Name = N'SuperAdmin');

    IF @SuperAdminRoleId IS NOT NULL
    BEGIN
        INSERT dbo.RolePermissions(RoleId, PageId, CanView, CanCreate, CanEdit, CanDelete, CanExport, CanApprove)
        SELECT @SuperAdminRoleId, p.Id, 1, 1, 1, 1, 1, 1
        FROM dbo.Pages p
        WHERE p.IsActive = 1
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.RolePermissions rp
              WHERE rp.RoleId = @SuperAdminRoleId AND rp.PageId = p.Id
          );
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
