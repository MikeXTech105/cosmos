/*
03_INDEX_FIXES.sql
Idempotent useful FK/index additions identified during verification.
Run during a maintenance window on large databases because CREATE INDEX can take locks.
The script skips creation when an index with the same leading key column already exists, even under a different name.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.CompanyGstSessions', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.CompanyGstSessions', N'CompanyGstRegistrationId') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.CompanyGstSessions') AND name = N'IX_CompanyGstSessions_CompanyGstRegistrationId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.CompanyGstSessions')
             AND i.is_hypothetical = 0
             AND c.name = N'CompanyGstRegistrationId'
       )
    BEGIN
        CREATE INDEX [IX_CompanyGstSessions_CompanyGstRegistrationId] ON [dbo].[CompanyGstSessions] ([CompanyGstRegistrationId]);
    END;

    IF OBJECT_ID(N'dbo.Expenses', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.Expenses', N'PaymentMode') IS NOT NULL AND COL_LENGTH(N'dbo.Expenses', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Expenses') AND name = N'IX_Expenses_PaymentMode')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.Expenses')
             AND i.is_hypothetical = 0
             AND c.name = N'PaymentMode'
       )
    BEGIN
        CREATE INDEX [IX_Expenses_PaymentMode] ON [dbo].[Expenses] ([PaymentMode], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.Expenses', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.Expenses', N'PaidToPartyId') IS NOT NULL AND COL_LENGTH(N'dbo.Expenses', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Expenses') AND name = N'IX_Expenses_PaidToPartyId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.Expenses')
             AND i.is_hypothetical = 0
             AND c.name = N'PaidToPartyId'
       )
    BEGIN
        CREATE INDEX [IX_Expenses_PaidToPartyId] ON [dbo].[Expenses] ([PaidToPartyId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_AttendanceAdjustments', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_AttendanceAdjustments', N'AttendanceId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_AttendanceAdjustments', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_AttendanceAdjustments') AND name = N'IX_HR_AttendanceAdjustments_AttendanceId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_AttendanceAdjustments')
             AND i.is_hypothetical = 0
             AND c.name = N'AttendanceId'
       )
    BEGIN
        CREATE INDEX [IX_HR_AttendanceAdjustments_AttendanceId] ON [dbo].[HR_AttendanceAdjustments] ([AttendanceId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_AttendanceAdjustments', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_AttendanceAdjustments', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_AttendanceAdjustments', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_AttendanceAdjustments') AND name = N'IX_HR_AttendanceAdjustments_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_AttendanceAdjustments')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_AttendanceAdjustments_EmployeeId] ON [dbo].[HR_AttendanceAdjustments] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_Designations', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_Designations', N'DepartmentId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_Designations', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_Designations') AND name = N'IX_HR_Designations_DepartmentId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_Designations')
             AND i.is_hypothetical = 0
             AND c.name = N'DepartmentId'
       )
    BEGIN
        CREATE INDEX [IX_HR_Designations_DepartmentId] ON [dbo].[HR_Designations] ([DepartmentId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_EmployeeAddresses', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_EmployeeAddresses', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_EmployeeAddresses', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_EmployeeAddresses') AND name = N'IX_HR_EmployeeAddresses_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_EmployeeAddresses')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_EmployeeAddresses_EmployeeId] ON [dbo].[HR_EmployeeAddresses] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_EmployeeBankAccounts', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_EmployeeBankAccounts', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_EmployeeBankAccounts', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_EmployeeBankAccounts') AND name = N'IX_HR_EmployeeBankAccounts_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_EmployeeBankAccounts')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_EmployeeBankAccounts_EmployeeId] ON [dbo].[HR_EmployeeBankAccounts] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_EmployeeDocuments', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_EmployeeDocuments', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_EmployeeDocuments', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_EmployeeDocuments') AND name = N'IX_HR_EmployeeDocuments_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_EmployeeDocuments')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_EmployeeDocuments_EmployeeId] ON [dbo].[HR_EmployeeDocuments] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_Employees', N'DepartmentId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_Employees', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_Employees') AND name = N'IX_HR_Employees_DepartmentId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_Employees')
             AND i.is_hypothetical = 0
             AND c.name = N'DepartmentId'
       )
    BEGIN
        CREATE INDEX [IX_HR_Employees_DepartmentId] ON [dbo].[HR_Employees] ([DepartmentId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_Employees', N'DesignationId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_Employees', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_Employees') AND name = N'IX_HR_Employees_DesignationId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_Employees')
             AND i.is_hypothetical = 0
             AND c.name = N'DesignationId'
       )
    BEGIN
        CREATE INDEX [IX_HR_Employees_DesignationId] ON [dbo].[HR_Employees] ([DesignationId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_Employees', N'ReportingManagerId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_Employees', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_Employees') AND name = N'IX_HR_Employees_ReportingManagerId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_Employees')
             AND i.is_hypothetical = 0
             AND c.name = N'ReportingManagerId'
       )
    BEGIN
        CREATE INDEX [IX_HR_Employees_ReportingManagerId] ON [dbo].[HR_Employees] ([ReportingManagerId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_Employees', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_Employees', N'ShiftId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_Employees', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_Employees') AND name = N'IX_HR_Employees_ShiftId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_Employees')
             AND i.is_hypothetical = 0
             AND c.name = N'ShiftId'
       )
    BEGIN
        CREATE INDEX [IX_HR_Employees_ShiftId] ON [dbo].[HR_Employees] ([ShiftId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_EmployeeSalaryStructures', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_EmployeeSalaryStructures', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures') AND name = N'IX_HR_EmployeeSalaryStructures_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_EmployeeSalaryStructures_EmployeeId] ON [dbo].[HR_EmployeeSalaryStructures] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_EmployeeSalaryStructures', N'SalaryStructureId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_EmployeeSalaryStructures', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures') AND name = N'IX_HR_EmployeeSalaryStructures_SalaryStructureId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_EmployeeSalaryStructures')
             AND i.is_hypothetical = 0
             AND c.name = N'SalaryStructureId'
       )
    BEGIN
        CREATE INDEX [IX_HR_EmployeeSalaryStructures_SalaryStructureId] ON [dbo].[HR_EmployeeSalaryStructures] ([SalaryStructureId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_LeaveApplications', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_LeaveApplications', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_LeaveApplications', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_LeaveApplications') AND name = N'IX_HR_LeaveApplications_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_LeaveApplications')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_LeaveApplications_EmployeeId] ON [dbo].[HR_LeaveApplications] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_LeaveApplications', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_LeaveApplications', N'LeaveTypeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_LeaveApplications', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_LeaveApplications') AND name = N'IX_HR_LeaveApplications_LeaveTypeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_LeaveApplications')
             AND i.is_hypothetical = 0
             AND c.name = N'LeaveTypeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_LeaveApplications_LeaveTypeId] ON [dbo].[HR_LeaveApplications] ([LeaveTypeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_LeaveBalances', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_LeaveBalances', N'LeaveTypeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_LeaveBalances', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_LeaveBalances') AND name = N'IX_HR_LeaveBalances_LeaveTypeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_LeaveBalances')
             AND i.is_hypothetical = 0
             AND c.name = N'LeaveTypeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_LeaveBalances_LeaveTypeId] ON [dbo].[HR_LeaveBalances] ([LeaveTypeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_PayrollDetails', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_PayrollDetails', N'EmployeeId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_PayrollDetails', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_PayrollDetails') AND name = N'IX_HR_PayrollDetails_EmployeeId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_PayrollDetails')
             AND i.is_hypothetical = 0
             AND c.name = N'EmployeeId'
       )
    BEGIN
        CREATE INDEX [IX_HR_PayrollDetails_EmployeeId] ON [dbo].[HR_PayrollDetails] ([EmployeeId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_SalaryStructureComponents', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_SalaryStructureComponents', N'SalaryComponentId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_SalaryStructureComponents', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_SalaryStructureComponents') AND name = N'IX_HR_SalaryStructureComponents_SalaryComponentId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_SalaryStructureComponents')
             AND i.is_hypothetical = 0
             AND c.name = N'SalaryComponentId'
       )
    BEGIN
        CREATE INDEX [IX_HR_SalaryStructureComponents_SalaryComponentId] ON [dbo].[HR_SalaryStructureComponents] ([SalaryComponentId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.HR_SalaryStructureComponents', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.HR_SalaryStructureComponents', N'SalaryStructureId') IS NOT NULL AND COL_LENGTH(N'dbo.HR_SalaryStructureComponents', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HR_SalaryStructureComponents') AND name = N'IX_HR_SalaryStructureComponents_SalaryStructureId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.HR_SalaryStructureComponents')
             AND i.is_hypothetical = 0
             AND c.name = N'SalaryStructureId'
       )
    BEGIN
        CREATE INDEX [IX_HR_SalaryStructureComponents_SalaryStructureId] ON [dbo].[HR_SalaryStructureComponents] ([SalaryStructureId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PasswordResetTokens', N'UserId') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PasswordResetTokens') AND name = N'IX_PasswordResetTokens_UserId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PasswordResetTokens')
             AND i.is_hypothetical = 0
             AND c.name = N'UserId'
       )
    BEGIN
        CREATE INDEX [IX_PasswordResetTokens_UserId] ON [dbo].[PasswordResetTokens] ([UserId]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseBillItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseBillItems', N'UnitId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseBillItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseBillItems') AND name = N'IX_PurchaseBillItems_UnitId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseBillItems')
             AND i.is_hypothetical = 0
             AND c.name = N'UnitId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseBillItems_UnitId] ON [dbo].[PurchaseBillItems] ([UnitId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseBills', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseBills', N'PaymentType') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseBills', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseBills') AND name = N'IX_PurchaseBills_PaymentType')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseBills')
             AND i.is_hypothetical = 0
             AND c.name = N'PaymentType'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseBills_PaymentType] ON [dbo].[PurchaseBills] ([PaymentType], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseOrderItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseOrderItems', N'ItemId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseOrderItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseOrderItems') AND name = N'IX_PurchaseOrderItems_ItemId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseOrderItems')
             AND i.is_hypothetical = 0
             AND c.name = N'ItemId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseOrderItems_ItemId] ON [dbo].[PurchaseOrderItems] ([ItemId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseOrderItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseOrderItems', N'PurchaseOrderId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseOrderItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseOrderItems') AND name = N'IX_PurchaseOrderItems_PurchaseOrderId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseOrderItems')
             AND i.is_hypothetical = 0
             AND c.name = N'PurchaseOrderId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseOrderItems_PurchaseOrderId] ON [dbo].[PurchaseOrderItems] ([PurchaseOrderId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseOrderItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseOrderItems', N'UnitId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseOrderItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseOrderItems') AND name = N'IX_PurchaseOrderItems_UnitId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseOrderItems')
             AND i.is_hypothetical = 0
             AND c.name = N'UnitId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseOrderItems_UnitId] ON [dbo].[PurchaseOrderItems] ([UnitId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseReturnItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseReturnItems', N'PurchaseBillItemId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseReturnItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseReturnItems') AND name = N'IX_PurchaseReturnItems_PurchaseBillItemId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseReturnItems')
             AND i.is_hypothetical = 0
             AND c.name = N'PurchaseBillItemId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseReturnItems_PurchaseBillItemId] ON [dbo].[PurchaseReturnItems] ([PurchaseBillItemId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseReturnItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseReturnItems', N'ItemId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseReturnItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseReturnItems') AND name = N'IX_PurchaseReturnItems_ItemId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseReturnItems')
             AND i.is_hypothetical = 0
             AND c.name = N'ItemId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseReturnItems_ItemId] ON [dbo].[PurchaseReturnItems] ([ItemId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseReturnItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseReturnItems', N'PurchaseReturnId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseReturnItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseReturnItems') AND name = N'IX_PurchaseReturnItems_PurchaseReturnId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseReturnItems')
             AND i.is_hypothetical = 0
             AND c.name = N'PurchaseReturnId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseReturnItems_PurchaseReturnId] ON [dbo].[PurchaseReturnItems] ([PurchaseReturnId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.PurchaseReturns', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.PurchaseReturns', N'PurchaseBillId') IS NOT NULL AND COL_LENGTH(N'dbo.PurchaseReturns', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PurchaseReturns') AND name = N'IX_PurchaseReturns_PurchaseBillId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.PurchaseReturns')
             AND i.is_hypothetical = 0
             AND c.name = N'PurchaseBillId'
       )
    BEGIN
        CREATE INDEX [IX_PurchaseReturns_PurchaseBillId] ON [dbo].[PurchaseReturns] ([PurchaseBillId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.SalesInvoiceItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.SalesInvoiceItems', N'ItemId') IS NOT NULL AND COL_LENGTH(N'dbo.SalesInvoiceItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SalesInvoiceItems') AND name = N'IX_SalesInvoiceItems_ItemId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.SalesInvoiceItems')
             AND i.is_hypothetical = 0
             AND c.name = N'ItemId'
       )
    BEGIN
        CREATE INDEX [IX_SalesInvoiceItems_ItemId] ON [dbo].[SalesInvoiceItems] ([ItemId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.SalesInvoiceItems', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.SalesInvoiceItems', N'UnitId') IS NOT NULL AND COL_LENGTH(N'dbo.SalesInvoiceItems', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SalesInvoiceItems') AND name = N'IX_SalesInvoiceItems_UnitId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.SalesInvoiceItems')
             AND i.is_hypothetical = 0
             AND c.name = N'UnitId'
       )
    BEGIN
        CREATE INDEX [IX_SalesInvoiceItems_UnitId] ON [dbo].[SalesInvoiceItems] ([UnitId], [IsDeleted]);
    END;

    IF OBJECT_ID(N'dbo.SalesInvoicePayments', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.SalesInvoicePayments', N'PaymentMode') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SalesInvoicePayments') AND name = N'IX_SalesInvoicePayments_PaymentMode')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.SalesInvoicePayments')
             AND i.is_hypothetical = 0
             AND c.name = N'PaymentMode'
       )
    BEGIN
        CREATE INDEX [IX_SalesInvoicePayments_PaymentMode] ON [dbo].[SalesInvoicePayments] ([PaymentMode]);
    END;

    IF OBJECT_ID(N'dbo.StockMovements', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.StockMovements', N'ItemId') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.StockMovements') AND name = N'IX_StockMovements_ItemId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.StockMovements')
             AND i.is_hypothetical = 0
             AND c.name = N'ItemId'
       )
    BEGIN
        CREATE INDEX [IX_StockMovements_ItemId] ON [dbo].[StockMovements] ([ItemId]);
    END;

    IF OBJECT_ID(N'dbo.SupplierPaymentAllocations', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.SupplierPaymentAllocations', N'PurchaseBillId') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SupplierPaymentAllocations') AND name = N'IX_SupplierPaymentAllocations_PurchaseBillId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.SupplierPaymentAllocations')
             AND i.is_hypothetical = 0
             AND c.name = N'PurchaseBillId'
       )
    BEGIN
        CREATE INDEX [IX_SupplierPaymentAllocations_PurchaseBillId] ON [dbo].[SupplierPaymentAllocations] ([PurchaseBillId]);
    END;

    IF OBJECT_ID(N'dbo.SupplierPaymentAllocations', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.SupplierPaymentAllocations', N'SupplierPaymentId') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SupplierPaymentAllocations') AND name = N'IX_SupplierPaymentAllocations_SupplierPaymentId')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.SupplierPaymentAllocations')
             AND i.is_hypothetical = 0
             AND c.name = N'SupplierPaymentId'
       )
    BEGIN
        CREATE INDEX [IX_SupplierPaymentAllocations_SupplierPaymentId] ON [dbo].[SupplierPaymentAllocations] ([SupplierPaymentId]);
    END;

    IF OBJECT_ID(N'dbo.SupplierPayments', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.SupplierPayments', N'PaymentMode') IS NOT NULL AND COL_LENGTH(N'dbo.SupplierPayments', N'IsDeleted') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SupplierPayments') AND name = N'IX_SupplierPayments_PaymentMode')
       AND NOT EXISTS (
           SELECT 1
           FROM sys.indexes i
           JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
           JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
           WHERE i.object_id = OBJECT_ID(N'dbo.SupplierPayments')
             AND i.is_hypothetical = 0
             AND c.name = N'PaymentMode'
       )
    BEGIN
        CREATE INDEX [IX_SupplierPayments_PaymentMode] ON [dbo].[SupplierPayments] ([PaymentMode], [IsDeleted]);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
