/*
    WARNING: Destructive reset script for Cosmos ERP objects only.
    - Run only against a selected CosmosERP_Staging or CosmosERP_Production database.
    - This drops ERP procedures, views, foreign keys, tables, and table types.
    - It does NOT drop the database itself.
    - Do NOT run this on production after live data exists unless you intentionally want to remove ERP data.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.sp_AuditLog_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_AuditLog_Create;
IF OBJECT_ID(N'dbo.sp_Auth_ChangePassword', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_ChangePassword;
IF OBJECT_ID(N'dbo.sp_Auth_ForgotPassword', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_ForgotPassword;
IF OBJECT_ID(N'dbo.sp_Auth_Login', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_Login;
IF OBJECT_ID(N'dbo.sp_Auth_Logout', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_Logout;
IF OBJECT_ID(N'dbo.sp_Auth_RefreshToken', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_RefreshToken;
IF OBJECT_ID(N'dbo.sp_Auth_ResetPassword', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_ResetPassword;
IF OBJECT_ID(N'dbo.sp_Auth_SaveRefreshToken', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Auth_SaveRefreshToken;
IF OBJECT_ID(N'dbo.sp_Category_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Create;
IF OBJECT_ID(N'dbo.sp_Category_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Delete;
IF OBJECT_ID(N'dbo.sp_Category_Exists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Exists;
IF OBJECT_ID(N'dbo.sp_Category_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_GetById;
IF OBJECT_ID(N'dbo.sp_Category_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_GetList;
IF OBJECT_ID(N'dbo.sp_Category_NameExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_NameExists;
IF OBJECT_ID(N'dbo.sp_Category_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Category_Update;
IF OBJECT_ID(N'dbo.sp_Expense_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Expense_Delete;
IF OBJECT_ID(N'dbo.sp_Expense_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Expense_GetById;
IF OBJECT_ID(N'dbo.sp_Expense_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Expense_GetList;
IF OBJECT_ID(N'dbo.sp_Expense_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Expense_Save;
IF OBJECT_ID(N'dbo.sp_ExpenseCategory_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_ExpenseCategory_Delete;
IF OBJECT_ID(N'dbo.sp_ExpenseCategory_Exists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_ExpenseCategory_Exists;
IF OBJECT_ID(N'dbo.sp_ExpenseCategory_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_ExpenseCategory_GetById;
IF OBJECT_ID(N'dbo.sp_ExpenseCategory_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_ExpenseCategory_GetList;
IF OBJECT_ID(N'dbo.sp_ExpenseCategory_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_ExpenseCategory_Save;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_CheckIn', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_CheckIn;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_CheckOut', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_CheckOut;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_DepartmentReport', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_DepartmentReport;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_GetByEmployee', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_GetByEmployee;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_GetById;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_ManualEntry', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_ManualEntry;
IF OBJECT_ID(N'dbo.sp_HR_Attendance_MonthlyReport', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Attendance_MonthlyReport;
IF OBJECT_ID(N'dbo.sp_HR_AttendanceAdjustment_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_AttendanceAdjustment_Create;
IF OBJECT_ID(N'dbo.sp_HR_AttendanceAdjustment_Decide', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_AttendanceAdjustment_Decide;
IF OBJECT_ID(N'dbo.sp_HR_Department_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Department_Create;
IF OBJECT_ID(N'dbo.sp_HR_Department_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Department_Delete;
IF OBJECT_ID(N'dbo.sp_HR_Department_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Department_GetById;
IF OBJECT_ID(N'dbo.sp_HR_Department_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Department_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Department_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Department_Update;
IF OBJECT_ID(N'dbo.sp_HR_Department_ValueExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Department_ValueExists;
IF OBJECT_ID(N'dbo.sp_HR_Designation_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Designation_Create;
IF OBJECT_ID(N'dbo.sp_HR_Designation_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Designation_Delete;
IF OBJECT_ID(N'dbo.sp_HR_Designation_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Designation_GetById;
IF OBJECT_ID(N'dbo.sp_HR_Designation_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Designation_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Designation_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Designation_Update;
IF OBJECT_ID(N'dbo.sp_HR_Employee_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_Create;
IF OBJECT_ID(N'dbo.sp_HR_Employee_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_Delete;
IF OBJECT_ID(N'dbo.sp_HR_Employee_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_GetById;
IF OBJECT_ID(N'dbo.sp_HR_Employee_GetDropdown', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_GetDropdown;
IF OBJECT_ID(N'dbo.sp_HR_Employee_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Employee_GetReportingManagers', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_GetReportingManagers;
IF OBJECT_ID(N'dbo.sp_HR_Employee_Rejoin', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_Rejoin;
IF OBJECT_ID(N'dbo.sp_HR_Employee_Resign', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_Resign;
IF OBJECT_ID(N'dbo.sp_HR_Employee_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_Update;
IF OBJECT_ID(N'dbo.sp_HR_Employee_ValueExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Employee_ValueExists;
IF OBJECT_ID(N'dbo.sp_HR_EmployeeBank_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_EmployeeBank_Create;
IF OBJECT_ID(N'dbo.sp_HR_EmployeeBank_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_EmployeeBank_GetList;
IF OBJECT_ID(N'dbo.sp_HR_EmployeeDocument_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_EmployeeDocument_Create;
IF OBJECT_ID(N'dbo.sp_HR_EmployeeDocument_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_EmployeeDocument_Delete;
IF OBJECT_ID(N'dbo.sp_HR_EmployeeDocument_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_EmployeeDocument_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Entity_Exists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Entity_Exists;
IF OBJECT_ID(N'dbo.sp_HR_Leave_Action', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Leave_Action;
IF OBJECT_ID(N'dbo.sp_HR_Leave_Apply', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Leave_Apply;
IF OBJECT_ID(N'dbo.sp_HR_Leave_GetBalance', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Leave_GetBalance;
IF OBJECT_ID(N'dbo.sp_HR_Leave_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Leave_GetById;
IF OBJECT_ID(N'dbo.sp_HR_Leave_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Leave_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Leave_GetPendingApprovals', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Leave_GetPendingApprovals;
IF OBJECT_ID(N'dbo.sp_HR_Payroll_Approve', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Payroll_Approve;
IF OBJECT_ID(N'dbo.sp_HR_Payroll_GetHistory', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Payroll_GetHistory;
IF OBJECT_ID(N'dbo.sp_HR_Payroll_GetPayslip', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Payroll_GetPayslip;
IF OBJECT_ID(N'dbo.sp_HR_Payroll_GetRun', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Payroll_GetRun;
IF OBJECT_ID(N'dbo.sp_HR_Payroll_GetRunDetails', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Payroll_GetRunDetails;
IF OBJECT_ID(N'dbo.sp_HR_Payroll_Process', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Payroll_Process;
IF OBJECT_ID(N'dbo.sp_HR_Shift_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Shift_Create;
IF OBJECT_ID(N'dbo.sp_HR_Shift_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Shift_Delete;
IF OBJECT_ID(N'dbo.sp_HR_Shift_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Shift_GetById;
IF OBJECT_ID(N'dbo.sp_HR_Shift_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Shift_GetList;
IF OBJECT_ID(N'dbo.sp_HR_Shift_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_HR_Shift_Update;
IF OBJECT_ID(N'dbo.sp_Item_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Item_Create;
IF OBJECT_ID(N'dbo.sp_Item_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Item_Delete;
IF OBJECT_ID(N'dbo.sp_Item_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Item_GetById;
IF OBJECT_ID(N'dbo.sp_Item_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Item_GetList;
IF OBJECT_ID(N'dbo.sp_Item_ItemCodeExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Item_ItemCodeExists;
IF OBJECT_ID(N'dbo.sp_Item_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Item_Update;
IF OBJECT_ID(N'dbo.sp_Page_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Page_Create;
IF OBJECT_ID(N'dbo.sp_Page_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Page_Delete;
IF OBJECT_ID(N'dbo.sp_Page_GetAll', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Page_GetAll;
IF OBJECT_ID(N'dbo.sp_Page_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Page_GetById;
IF OBJECT_ID(N'dbo.sp_Page_GetEntityById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Page_GetEntityById;
IF OBJECT_ID(N'dbo.sp_Page_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Page_Update;
IF OBJECT_ID(N'dbo.sp_Party_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Party_Create;
IF OBJECT_ID(N'dbo.sp_Party_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Party_Delete;
IF OBJECT_ID(N'dbo.sp_Party_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Party_GetById;
IF OBJECT_ID(N'dbo.sp_Party_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Party_GetList;
IF OBJECT_ID(N'dbo.sp_Party_SetActive', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Party_SetActive;
IF OBJECT_ID(N'dbo.sp_Party_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Party_Update;
IF OBJECT_ID(N'dbo.sp_PartySettings_Get', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PartySettings_Get;
IF OBJECT_ID(N'dbo.sp_PartySettings_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PartySettings_Update;
IF OBJECT_ID(N'dbo.sp_Permission_GetByRoleId', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Permission_GetByRoleId;
IF OBJECT_ID(N'dbo.sp_Permission_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Permission_Save;
IF OBJECT_ID(N'dbo.sp_Permission_UserHasAccess', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Permission_UserHasAccess;
IF OBJECT_ID(N'dbo.sp_PurchaseBill_Cancel', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseBill_Cancel;
IF OBJECT_ID(N'dbo.sp_PurchaseBill_Confirm', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseBill_Confirm;
IF OBJECT_ID(N'dbo.sp_PurchaseBill_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseBill_Delete;
IF OBJECT_ID(N'dbo.sp_PurchaseBill_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseBill_GetById;
IF OBJECT_ID(N'dbo.sp_PurchaseBill_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseBill_GetList;
IF OBJECT_ID(N'dbo.sp_PurchaseBill_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseBill_Save;
IF OBJECT_ID(N'dbo.sp_PurchaseExpense_ItemExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpense_ItemExists;
IF OBJECT_ID(N'dbo.sp_PurchaseExpense_SupplierExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpense_SupplierExists;
IF OBJECT_ID(N'dbo.sp_PurchaseExpenseReport_CategoryWiseExpense', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpenseReport_CategoryWiseExpense;
IF OBJECT_ID(N'dbo.sp_PurchaseExpenseReport_ExpenseSummary', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpenseReport_ExpenseSummary;
IF OBJECT_ID(N'dbo.sp_PurchaseExpenseReport_ItemPurchaseHistory', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpenseReport_ItemPurchaseHistory;
IF OBJECT_ID(N'dbo.sp_PurchaseExpenseReport_PurchaseSummary', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpenseReport_PurchaseSummary;
IF OBJECT_ID(N'dbo.sp_PurchaseExpenseReport_SupplierOutstanding', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseExpenseReport_SupplierOutstanding;
IF OBJECT_ID(N'dbo.sp_PurchaseOrder_Cancel', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseOrder_Cancel;
IF OBJECT_ID(N'dbo.sp_PurchaseOrder_Convert', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseOrder_Convert;
IF OBJECT_ID(N'dbo.sp_PurchaseOrder_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseOrder_Delete;
IF OBJECT_ID(N'dbo.sp_PurchaseOrder_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseOrder_GetById;
IF OBJECT_ID(N'dbo.sp_PurchaseOrder_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseOrder_GetList;
IF OBJECT_ID(N'dbo.sp_PurchaseOrder_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseOrder_Save;
IF OBJECT_ID(N'dbo.sp_PurchaseReturn_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseReturn_Delete;
IF OBJECT_ID(N'dbo.sp_PurchaseReturn_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseReturn_GetById;
IF OBJECT_ID(N'dbo.sp_PurchaseReturn_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseReturn_GetList;
IF OBJECT_ID(N'dbo.sp_PurchaseReturn_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_PurchaseReturn_Save;
IF OBJECT_ID(N'dbo.sp_Role_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Role_Create;
IF OBJECT_ID(N'dbo.sp_Role_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Role_Delete;
IF OBJECT_ID(N'dbo.sp_Role_GetAll', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Role_GetAll;
IF OBJECT_ID(N'dbo.sp_Role_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Role_GetById;
IF OBJECT_ID(N'dbo.sp_Role_GetEntityById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Role_GetEntityById;
IF OBJECT_ID(N'dbo.sp_Role_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Role_Update;
IF OBJECT_ID(N'dbo.sp_Sales_CustomerExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Sales_CustomerExists;
IF OBJECT_ID(N'dbo.sp_Sales_ItemExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Sales_ItemExists;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_AddPayment', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_AddPayment;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_Cancel', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_Cancel;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_Confirm', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_Confirm;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_Create;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_GetById;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_GetList;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_GetPayments', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_GetPayments;
IF OBJECT_ID(N'dbo.sp_SalesInvoice_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesInvoice_Update;
IF OBJECT_ID(N'dbo.sp_SalesReport_CustomerReceivables', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesReport_CustomerReceivables;
IF OBJECT_ID(N'dbo.sp_SalesReport_ItemWiseSales', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesReport_ItemWiseSales;
IF OBJECT_ID(N'dbo.sp_SalesReport_Summary', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SalesReport_Summary;
IF OBJECT_ID(N'dbo.sp_SupplierPayment_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SupplierPayment_Delete;
IF OBJECT_ID(N'dbo.sp_SupplierPayment_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SupplierPayment_GetById;
IF OBJECT_ID(N'dbo.sp_SupplierPayment_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SupplierPayment_GetList;
IF OBJECT_ID(N'dbo.sp_SupplierPayment_Save', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_SupplierPayment_Save;
IF OBJECT_ID(N'dbo.sp_Unit_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_Create;
IF OBJECT_ID(N'dbo.sp_Unit_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_Delete;
IF OBJECT_ID(N'dbo.sp_Unit_Exists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_Exists;
IF OBJECT_ID(N'dbo.sp_Unit_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_GetById;
IF OBJECT_ID(N'dbo.sp_Unit_GetList', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_GetList;
IF OBJECT_ID(N'dbo.sp_Unit_NameExists', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_NameExists;
IF OBJECT_ID(N'dbo.sp_Unit_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_Unit_Update;
IF OBJECT_ID(N'dbo.sp_User_AssignRoles', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_AssignRoles;
IF OBJECT_ID(N'dbo.sp_User_Create', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_Create;
IF OBJECT_ID(N'dbo.sp_User_Delete', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_Delete;
IF OBJECT_ID(N'dbo.sp_User_GetAll', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_GetAll;
IF OBJECT_ID(N'dbo.sp_User_GetById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_GetById;
IF OBJECT_ID(N'dbo.sp_User_GetEntityById', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_GetEntityById;
IF OBJECT_ID(N'dbo.sp_User_GetPagePermissions', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_GetPagePermissions;
IF OBJECT_ID(N'dbo.sp_User_GetRoles', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_GetRoles;
IF OBJECT_ID(N'dbo.sp_User_SetActive', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_SetActive;
IF OBJECT_ID(N'dbo.sp_User_Update', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_User_Update;
GO

IF OBJECT_ID(N'dbo.vw_UserEffectivePermissions', N'V') IS NOT NULL DROP VIEW dbo.vw_UserEffectivePermissions;
GO

DECLARE @Tables TABLE (Name SYSNAME PRIMARY KEY);
INSERT INTO @Tables(Name) VALUES
(N'AuditLogs'),
(N'Categories'),
(N'ExpenseCategories'),
(N'Expenses'),
(N'HR_Attendance'),
(N'HR_AttendanceAdjustments'),
(N'HR_Departments'),
(N'HR_Designations'),
(N'HR_EmployeeAddresses'),
(N'HR_EmployeeBankAccounts'),
(N'HR_EmployeeDocuments'),
(N'HR_Employees'),
(N'HR_EmployeeSalaryStructures'),
(N'HR_LeaveApplications'),
(N'HR_LeaveBalances'),
(N'HR_LeaveTypes'),
(N'HR_PayrollDetails'),
(N'HR_PayrollRuns'),
(N'HR_SalaryComponents'),
(N'HR_SalaryStructureComponents'),
(N'HR_SalaryStructures'),
(N'HR_Shifts'),
(N'Items'),
(N'NumberSequences'),
(N'Pages'),
(N'Parties'),
(N'PartyLedgerEntries'),
(N'PartySettings'),
(N'PasswordResetTokens'),
(N'PaymentModes'),
(N'PurchaseBillItems'),
(N'PurchaseBills'),
(N'PurchaseOrderItems'),
(N'PurchaseOrders'),
(N'PurchaseReturnItems'),
(N'PurchaseReturns'),
(N'RefreshTokens'),
(N'RolePermissions'),
(N'Roles'),
(N'SalesInvoiceItems'),
(N'SalesInvoicePayments'),
(N'SalesInvoices'),
(N'StockMovements'),
(N'SupplierPaymentAllocations'),
(N'SupplierPayments'),
(N'Units'),
(N'UserRoles'),
(N'Users');

DECLARE @Sql NVARCHAR(MAX) = N'';
SELECT @Sql = @Sql + N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + CHAR(13) + CHAR(10)
FROM sys.foreign_keys fk
JOIN sys.tables t ON t.object_id = fk.parent_object_id
JOIN @Tables et ON et.Name = t.name
WHERE SCHEMA_NAME(t.schema_id) = N'dbo';
EXEC sp_executesql @Sql;
GO

DECLARE @Tables TABLE (Name SYSNAME PRIMARY KEY);
INSERT INTO @Tables(Name) VALUES
(N'AuditLogs'),
(N'Categories'),
(N'ExpenseCategories'),
(N'Expenses'),
(N'HR_Attendance'),
(N'HR_AttendanceAdjustments'),
(N'HR_Departments'),
(N'HR_Designations'),
(N'HR_EmployeeAddresses'),
(N'HR_EmployeeBankAccounts'),
(N'HR_EmployeeDocuments'),
(N'HR_Employees'),
(N'HR_EmployeeSalaryStructures'),
(N'HR_LeaveApplications'),
(N'HR_LeaveBalances'),
(N'HR_LeaveTypes'),
(N'HR_PayrollDetails'),
(N'HR_PayrollRuns'),
(N'HR_SalaryComponents'),
(N'HR_SalaryStructureComponents'),
(N'HR_SalaryStructures'),
(N'HR_Shifts'),
(N'Items'),
(N'NumberSequences'),
(N'Pages'),
(N'Parties'),
(N'PartyLedgerEntries'),
(N'PartySettings'),
(N'PasswordResetTokens'),
(N'PaymentModes'),
(N'PurchaseBillItems'),
(N'PurchaseBills'),
(N'PurchaseOrderItems'),
(N'PurchaseOrders'),
(N'PurchaseReturnItems'),
(N'PurchaseReturns'),
(N'RefreshTokens'),
(N'RolePermissions'),
(N'Roles'),
(N'SalesInvoiceItems'),
(N'SalesInvoicePayments'),
(N'SalesInvoices'),
(N'StockMovements'),
(N'SupplierPaymentAllocations'),
(N'SupplierPayments'),
(N'Units'),
(N'UserRoles'),
(N'Users');

DECLARE @Sql NVARCHAR(MAX) = N'';
SELECT @Sql = @Sql + N'DROP TABLE dbo.' + QUOTENAME(Name) + N';' + CHAR(13) + CHAR(10)
FROM @Tables
WHERE OBJECT_ID(N'dbo.' + Name, N'U') IS NOT NULL
ORDER BY Name DESC;
EXEC sp_executesql @Sql;
GO

DECLARE @Types TABLE (Name SYSNAME PRIMARY KEY);
INSERT INTO @Types(Name) VALUES
(N'IntIdList'),
(N'PermissionList'),
(N'PurchaseLineInput'),
(N'SalesInvoiceItemInput'),
(N'SupplierPaymentAllocationInput');

DECLARE @Sql NVARCHAR(MAX) = N'';
SELECT @Sql = @Sql + N'DROP TYPE dbo.' + QUOTENAME(Name) + N';' + CHAR(13) + CHAR(10)
FROM @Types
WHERE TYPE_ID(N'dbo.' + Name) IS NOT NULL;
EXEC sp_executesql @Sql;
GO

SELECT N'Cosmos ERP reset completed for selected database.' AS [Message];
GO
