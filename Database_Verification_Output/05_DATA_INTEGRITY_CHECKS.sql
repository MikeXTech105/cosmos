/*
05_DATA_INTEGRITY_CHECKS.sql
SELECT-only validation checks. Review every result set before running fixes in production.
*/
SET NOCOUNT ON;

PRINT 'Missing stored procedures referenced by backend code';
DECLARE @ExpectedProcedures TABLE (Name SYSNAME PRIMARY KEY);
INSERT @ExpectedProcedures(Name) VALUES
(N'sp_AuditLog_Create'),
(N'sp_Auth_ChangePassword'),
(N'sp_Auth_ForgotPassword'),
(N'sp_Auth_Login'),
(N'sp_Auth_Logout'),
(N'sp_Auth_RefreshToken'),
(N'sp_Auth_ResetPassword'),
(N'sp_Auth_SaveRefreshToken'),
(N'sp_Category_Create'),
(N'sp_Category_Delete'),
(N'sp_Category_Exists'),
(N'sp_Category_GetById'),
(N'sp_Category_GetList'),
(N'sp_Category_NameExists'),
(N'sp_Category_Update'),
(N'sp_EInvoice_Cancel'),
(N'sp_EInvoice_Create'),
(N'sp_EInvoice_GetByIrn'),
(N'sp_EWayBill_Cancel'),
(N'sp_EWayBill_Create'),
(N'sp_EWayBill_GetByNumber'),
(N'sp_Expense_Delete'),
(N'sp_Expense_GetById'),
(N'sp_Expense_GetList'),
(N'sp_Expense_Save'),
(N'sp_ExpenseCategory_Delete'),
(N'sp_ExpenseCategory_Exists'),
(N'sp_ExpenseCategory_GetById'),
(N'sp_ExpenseCategory_GetList'),
(N'sp_ExpenseCategory_Save'),
(N'sp_GstApiLog_Create'),
(N'sp_GstApiLog_GetList'),
(N'sp_GstRegistration_Create'),
(N'sp_GstRegistration_Delete'),
(N'sp_GstRegistration_GetById'),
(N'sp_GstRegistration_GetList'),
(N'sp_GstRegistration_GstinExists'),
(N'sp_GstRegistration_SetDefault'),
(N'sp_GstRegistration_Update'),
(N'sp_GstRegistration_UpdateVerification'),
(N'sp_GstSession_GetStatus'),
(N'sp_GstSession_Save'),
(N'sp_GstVerification_GetCached'),
(N'sp_GstVerificationLog_Create'),
(N'sp_HR_Attendance_CheckIn'),
(N'sp_HR_Attendance_CheckOut'),
(N'sp_HR_Attendance_DepartmentReport'),
(N'sp_HR_Attendance_GetByEmployee'),
(N'sp_HR_Attendance_GetList'),
(N'sp_HR_Attendance_ManualEntry'),
(N'sp_HR_Attendance_MonthlyReport'),
(N'sp_HR_AttendanceAdjustment_Create'),
(N'sp_HR_AttendanceAdjustment_Decide'),
(N'sp_HR_Department_Create'),
(N'sp_HR_Department_Delete'),
(N'sp_HR_Department_GetById'),
(N'sp_HR_Department_GetList'),
(N'sp_HR_Department_Update'),
(N'sp_HR_Department_ValueExists'),
(N'sp_HR_Designation_Create'),
(N'sp_HR_Designation_Delete'),
(N'sp_HR_Designation_GetById'),
(N'sp_HR_Designation_GetList'),
(N'sp_HR_Designation_Update'),
(N'sp_HR_Employee_Create'),
(N'sp_HR_Employee_Delete'),
(N'sp_HR_Employee_GetById'),
(N'sp_HR_Employee_GetDropdown'),
(N'sp_HR_Employee_GetList'),
(N'sp_HR_Employee_GetReportingManagers'),
(N'sp_HR_Employee_Update'),
(N'sp_HR_Employee_ValueExists'),
(N'sp_HR_EmployeeBank_Create'),
(N'sp_HR_EmployeeBank_GetList'),
(N'sp_HR_EmployeeDocument_Create'),
(N'sp_HR_EmployeeDocument_Delete'),
(N'sp_HR_EmployeeDocument_GetList'),
(N'sp_HR_Entity_Exists'),
(N'sp_HR_Leave_Action'),
(N'sp_HR_Leave_Apply'),
(N'sp_HR_Leave_GetBalance'),
(N'sp_HR_Leave_GetList'),
(N'sp_HR_Leave_GetPendingApprovals'),
(N'sp_HR_Payroll_Approve'),
(N'sp_HR_Payroll_GetHistory'),
(N'sp_HR_Payroll_GetPayslip'),
(N'sp_HR_Payroll_GetRun'),
(N'sp_HR_Payroll_GetRunDetails'),
(N'sp_HR_Payroll_Process'),
(N'sp_HR_Shift_Create'),
(N'sp_HR_Shift_Delete'),
(N'sp_HR_Shift_GetById'),
(N'sp_HR_Shift_GetList'),
(N'sp_HR_Shift_Update'),
(N'sp_Item_Create'),
(N'sp_Item_Delete'),
(N'sp_Item_GetById'),
(N'sp_Item_GetList'),
(N'sp_Item_ItemCodeExists'),
(N'sp_Item_Update'),
(N'sp_OeeDashboard_DailyTrend'),
(N'sp_OeeDashboard_MachineWise'),
(N'sp_OeeDashboard_MouldWise'),
(N'sp_OeeDashboard_Summary'),
(N'sp_OeeDashboard_TopDowntimeReasons'),
(N'sp_OeeDowntimeReason_Delete'),
(N'sp_OeeDowntimeReason_Exists'),
(N'sp_OeeDowntimeReason_GetById'),
(N'sp_OeeDowntimeReason_GetList'),
(N'sp_OeeDowntimeReason_Save'),
(N'sp_OeeMachine_Delete'),
(N'sp_OeeMachine_Exists'),
(N'sp_OeeMachine_GetById'),
(N'sp_OeeMachine_GetList'),
(N'sp_OeeMachine_Save'),
(N'sp_OeeMould_Delete'),
(N'sp_OeeMould_Exists'),
(N'sp_OeeMould_GetById'),
(N'sp_OeeMould_GetList'),
(N'sp_OeeMould_Save'),
(N'sp_OeeProductionEntry_Delete'),
(N'sp_OeeProductionEntry_GetById'),
(N'sp_OeeProductionEntry_GetList'),
(N'sp_OeeProductionEntry_Save'),
(N'sp_OeeProductionEntry_SaveBulk'),
(N'sp_OeeReport_Daily'),
(N'sp_OeeReport_Downtime'),
(N'sp_OeeReport_MachinePerformance'),
(N'sp_OeeReport_MouldPerformance'),
(N'sp_Page_Create'),
(N'sp_Page_Delete'),
(N'sp_Page_GetAll'),
(N'sp_Page_GetById'),
(N'sp_Page_GetEntityById'),
(N'sp_Page_Update'),
(N'sp_Party_Create'),
(N'sp_Party_Delete'),
(N'sp_Party_GetById'),
(N'sp_Party_GetList'),
(N'sp_Party_SetActive'),
(N'sp_Party_Update'),
(N'sp_PartySettings_Get'),
(N'sp_PartySettings_Update'),
(N'sp_Permission_GetByRoleId'),
(N'sp_Permission_Save'),
(N'sp_Permission_UserHasAccess'),
(N'sp_PurchaseBill_Cancel'),
(N'sp_PurchaseBill_Confirm'),
(N'sp_PurchaseBill_Delete'),
(N'sp_PurchaseBill_GetById'),
(N'sp_PurchaseBill_GetList'),
(N'sp_PurchaseBill_Save'),
(N'sp_PurchaseExpense_ItemExists'),
(N'sp_PurchaseExpense_SupplierExists'),
(N'sp_PurchaseExpenseReport_CategoryWiseExpense'),
(N'sp_PurchaseExpenseReport_ExpenseSummary'),
(N'sp_PurchaseExpenseReport_ItemPurchaseHistory'),
(N'sp_PurchaseExpenseReport_PurchaseSummary'),
(N'sp_PurchaseExpenseReport_SupplierOutstanding'),
(N'sp_PurchaseOrder_Cancel'),
(N'sp_PurchaseOrder_Convert'),
(N'sp_PurchaseOrder_Delete'),
(N'sp_PurchaseOrder_GetById'),
(N'sp_PurchaseOrder_GetList'),
(N'sp_PurchaseOrder_Save'),
(N'sp_PurchaseReturn_Delete'),
(N'sp_PurchaseReturn_GetById'),
(N'sp_PurchaseReturn_GetList'),
(N'sp_PurchaseReturn_Save'),
(N'sp_Role_Create'),
(N'sp_Role_Delete'),
(N'sp_Role_GetAll'),
(N'sp_Role_GetById'),
(N'sp_Role_GetEntityById'),
(N'sp_Role_Update'),
(N'sp_Sales_CustomerExists'),
(N'sp_Sales_ItemExists'),
(N'sp_SalesInvoice_AddPayment'),
(N'sp_SalesInvoice_Cancel'),
(N'sp_SalesInvoice_Confirm'),
(N'sp_SalesInvoice_Create'),
(N'sp_SalesInvoice_GetById'),
(N'sp_SalesInvoice_GetList'),
(N'sp_SalesInvoice_GetPayments'),
(N'sp_SalesInvoice_Update'),
(N'sp_SalesReport_CustomerReceivables'),
(N'sp_SalesReport_ItemWiseSales'),
(N'sp_SalesReport_Summary'),
(N'sp_SupplierPayment_Delete'),
(N'sp_SupplierPayment_GetById'),
(N'sp_SupplierPayment_GetList'),
(N'sp_SupplierPayment_Save'),
(N'sp_Unit_Create'),
(N'sp_Unit_Delete'),
(N'sp_Unit_Exists'),
(N'sp_Unit_GetById'),
(N'sp_Unit_GetList'),
(N'sp_Unit_NameExists'),
(N'sp_Unit_Update'),
(N'sp_User_AssignRoles'),
(N'sp_User_Create'),
(N'sp_User_Delete'),
(N'sp_User_GetAll'),
(N'sp_User_GetById'),
(N'sp_User_GetEntityById'),
(N'sp_User_GetPagePermissions'),
(N'sp_User_GetRoles'),
(N'sp_User_SetActive'),
(N'sp_User_Update');

SELECT ep.Name AS MissingProcedure
FROM @ExpectedProcedures ep
WHERE OBJECT_ID(N'dbo.' + ep.Name, N'P') IS NULL
ORDER BY ep.Name;

PRINT 'Missing permission pages required by controllers';
DECLARE @ExpectedPages TABLE (Name NVARCHAR(100) PRIMARY KEY);
INSERT @ExpectedPages(Name) VALUES
(N'Categories'),
(N'GST.Configuration'),
(N'GST.EInvoice'),
(N'GST.EWayBill'),
(N'GST.Logs'),
(N'GST.Registration'),
(N'GST.Session'),
(N'GST.Verification'),
(N'HR.Attendance'),
(N'HR.Department'),
(N'HR.Designation'),
(N'HR.Employee'),
(N'HR.Leave'),
(N'HR.Payroll'),
(N'HR.Shift'),
(N'Items'),
(N'OEE.Dashboard'),
(N'OEE.DowntimeReasons'),
(N'OEE.Machines'),
(N'OEE.Moulds'),
(N'OEE.ProductionEntries'),
(N'OEE.Reports'),
(N'Pages'),
(N'Party'),
(N'Permissions'),
(N'PurchaseExpense.Expense'),
(N'PurchaseExpense.ExpenseCategory'),
(N'PurchaseExpense.PaymentOut'),
(N'PurchaseExpense.PurchaseBill'),
(N'PurchaseExpense.PurchaseOrder'),
(N'PurchaseExpense.PurchaseReturn'),
(N'PurchaseExpense.Report'),
(N'Roles'),
(N'Sales.Invoice'),
(N'Sales.Report'),
(N'Units'),
(N'Users');

SELECT ep.Name AS MissingPage
FROM @ExpectedPages ep
WHERE NOT EXISTS (SELECT 1 FROM dbo.Pages p WHERE p.Name = ep.Name);

PRINT 'Duplicate page names';
SELECT Name, COUNT(*) AS DuplicateCount FROM dbo.Pages GROUP BY Name HAVING COUNT(*) > 1;

PRINT 'Duplicate role names';
SELECT Name, COUNT(*) AS DuplicateCount FROM dbo.Roles GROUP BY Name HAVING COUNT(*) > 1;

PRINT 'Duplicate active category names';
SELECT Name, COUNT(*) AS DuplicateCount FROM dbo.Categories WHERE IsDeleted = 0 GROUP BY Name HAVING COUNT(*) > 1;

PRINT 'Duplicate active unit names';
SELECT Name, COUNT(*) AS DuplicateCount FROM dbo.Units WHERE IsDeleted = 0 GROUP BY Name HAVING COUNT(*) > 1;

PRINT 'Duplicate active item codes';
SELECT ItemCode, COUNT(*) AS DuplicateCount FROM dbo.Items WHERE IsDeleted = 0 GROUP BY ItemCode HAVING COUNT(*) > 1;

PRINT 'Duplicate active party codes';
SELECT PartyCode, COUNT(*) AS DuplicateCount FROM dbo.Parties WHERE IsDeleted = 0 GROUP BY PartyCode HAVING COUNT(*) > 1;

PRINT 'Duplicate active GSTIN values';
SELECT GSTIN, COUNT(*) AS DuplicateCount FROM dbo.Parties WHERE IsDeleted = 0 AND GSTIN IS NOT NULL GROUP BY GSTIN HAVING COUNT(*) > 1;

PRINT 'RolePermissions with missing role or page';
SELECT rp.* FROM dbo.RolePermissions rp LEFT JOIN dbo.Roles r ON r.Id = rp.RoleId LEFT JOIN dbo.Pages p ON p.Id = rp.PageId WHERE r.Id IS NULL OR p.Id IS NULL;

PRINT 'UserRoles with missing user or role';
SELECT ur.* FROM dbo.UserRoles ur LEFT JOIN dbo.Users u ON u.Id = ur.UserId LEFT JOIN dbo.Roles r ON r.Id = ur.RoleId WHERE u.Id IS NULL OR r.Id IS NULL;

PRINT 'Pages with missing parent page';
SELECT p.* FROM dbo.Pages p LEFT JOIN dbo.Pages parent ON parent.Id = p.ParentPageId WHERE p.ParentPageId IS NOT NULL AND parent.Id IS NULL;

PRINT 'Items with missing active category or unit';
SELECT i.Id, i.ItemCode, i.Name, i.CategoryId, i.UnitId FROM dbo.Items i LEFT JOIN dbo.Categories c ON c.Id = i.CategoryId AND c.IsDeleted = 0 LEFT JOIN dbo.Units u ON u.Id = i.UnitId AND u.IsDeleted = 0 WHERE i.IsDeleted = 0 AND (c.Id IS NULL OR u.Id IS NULL);

PRINT 'Parties with invalid GSTIN pattern';
SELECT Id, PartyCode, PartyName, GSTIN FROM dbo.Parties WHERE IsDeleted = 0 AND GSTIN IS NOT NULL AND GSTIN NOT LIKE '[0-9][0-9][A-Z][A-Z][A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][A-Z][1-9A-Z]Z[0-9A-Z]';

PRINT 'Company GST registrations with duplicate active GSTIN';
SELECT Gstin, COUNT(*) AS DuplicateCount FROM dbo.CompanyGstRegistrations WHERE IsDeleted = 0 GROUP BY Gstin HAVING COUNT(*) > 1;

PRINT 'OEE production entries with missing active master references';
SELECT e.Id, e.ProductionDate, e.MachineId, e.MouldId, e.DowntimeReasonId FROM dbo.OeeProductionEntries e LEFT JOIN dbo.OeeMachines m ON m.Id = e.MachineId AND m.IsDeleted = 0 LEFT JOIN dbo.OeeMoulds mo ON mo.Id = e.MouldId AND mo.IsDeleted = 0 LEFT JOIN dbo.OeeDowntimeReasons d ON d.Id = e.DowntimeReasonId AND d.IsDeleted = 0 WHERE e.IsDeleted = 0 AND (m.Id IS NULL OR mo.Id IS NULL OR (e.DowntimeReasonId IS NOT NULL AND d.Id IS NULL));
