/*
    COSMOS ERP - read-only verification gate for 20260803_prepare_clean_staging_database.sql

    This script makes no data or schema changes. Configure the expected database and the same
    explicit staging administrator identity used by the cleanup script, then run it after cleanup.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* Verification returns result sets before session-scoped work tables are automatically removed. */
DROP TABLE IF EXISTS #ForeignKeyOrphans;
DROP TABLE IF EXISTS #TableCounts;
DROP TABLE IF EXISTS #ExpectedTables;
DROP TABLE IF EXISTS #Findings;

/* =============================================================================
   OPERATOR CONFIGURATION
   ============================================================================= */
DECLARE @ExpectedDatabaseName sysname = N'CHANGE_ME_TO_THE_VERIFIED_STAGING_COPY_NAME';
DECLARE @ExpectedStagingAdminUsername nvarchar(100) = N'CHANGE_ME';
DECLARE @ExpectedStagingAdminEmail nvarchar(256) = NULL;
DECLARE @ExpectedStagingAdminRoleName nvarchar(100) = N'SuperAdmin';
DECLARE @ExpectedUserCount int = 2;
DECLARE @ExpectResetItemStock bit = 1;
DECLARE @ExpectResetPartyOpeningBalances bit = 1;
DECLARE @ExpectPartyMastersPreserved bit = 1;
DECLARE @ExpectEmployeesPreserved bit = 0;
DECLARE @ExpectEmployeePersonalDetailsPreserved bit = 0;
DECLARE @ExpectPrivilegedUserWalletsPreserved bit = 0;
DECLARE @ExpectCompanyGstRegistrationsPreserved bit = 0;
DECLARE @ExpectAuditLogsPreserved bit = 0;
DECLARE @ExpectResetDocumentSequences bit = 1;

DECLARE @CurrentDatabaseName sysname=DB_NAME();
CREATE TABLE #Findings
(
    Severity varchar(7) NOT NULL CHECK(Severity IN('PASS','FAIL','WARNING')),
    CheckName nvarchar(200) NOT NULL,
    Detail nvarchar(2000) NOT NULL
);

IF @ExpectedDatabaseName=N'CHANGE_ME_TO_THE_VERIFIED_STAGING_COPY_NAME'
    INSERT #Findings VALUES('FAIL',N'Expected database name',N'@ExpectedDatabaseName is still the placeholder.');
ELSE IF @CurrentDatabaseName<>@ExpectedDatabaseName
    INSERT #Findings VALUES('FAIL',N'Expected database name',N'Connected database is '+QUOTENAME(@CurrentDatabaseName)+N', not '+QUOTENAME(@ExpectedDatabaseName)+N'.');
ELSE
    INSERT #Findings VALUES('PASS',N'Expected database name',N'Connected to the reviewed staging-copy database name.');
IF UPPER(@CurrentDatabaseName) LIKE N'%PROD%' OR UPPER(@CurrentDatabaseName) LIKE N'%PRODUCTION%' OR UPPER(@CurrentDatabaseName) LIKE N'%LIVE%' OR UPPER(@CurrentDatabaseName) LIKE N'%MAIN%'
    INSERT #Findings VALUES('FAIL',N'Production-like database name',N'This verification gate must not be used to approve a production-like database name.');

CREATE TABLE #ExpectedTables(TableName sysname NOT NULL PRIMARY KEY,Classification char(1) NOT NULL,ModuleName nvarchar(100) NOT NULL);
INSERT #ExpectedTables VALUES
(N'Users','B',N'Security'),(N'Roles','A',N'Security'),(N'UserRoles','B',N'Security'),(N'Pages','A',N'Security'),(N'RolePermissions','A',N'Security'),(N'RefreshTokens','B',N'Security'),(N'PasswordResetTokens','B',N'Security'),(N'AuditLogs','B',N'Audit'),
(N'Parties','B',N'Parties'),(N'PartySettings','A',N'Parties'),(N'PartyRoles','B',N'Shipment operations'),
(N'Units','A',N'Items'),(N'Categories','A',N'Items'),(N'Items','A',N'Items'),(N'NumberSequences','A',N'Configuration'),(N'PaymentModes','A',N'Configuration'),
(N'SalesInvoices','C',N'Sales'),(N'SalesInvoiceItems','C',N'Sales'),(N'SalesInvoicePayments','C',N'Sales'),(N'StockMovements','C',N'Inventory'),
(N'PurchaseBills','C',N'Purchase'),(N'PurchaseBillItems','C',N'Purchase'),(N'SupplierPayments','C',N'Purchase'),(N'SupplierPaymentAllocations','C',N'Purchase'),(N'ExpenseCategories','A',N'Purchase and expenses'),(N'Expenses','C',N'Purchase and expenses'),(N'PurchaseOrders','C',N'Purchase'),(N'PurchaseOrderItems','C',N'Purchase'),(N'PurchaseReturns','C',N'Purchase'),(N'PurchaseReturnItems','C',N'Purchase'),(N'PartyLedgerEntries','C',N'Parties'),
(N'HR_Departments','A',N'HR'),(N'HR_Designations','A',N'HR'),(N'HR_Shifts','A',N'HR'),(N'HR_Employees','B',N'HR'),(N'HR_EmployeeAddresses','B',N'HR'),(N'HR_EmployeeBankAccounts','B',N'HR'),(N'HR_EmployeeDocuments','B',N'HR'),(N'HR_Attendance','C',N'HR'),(N'HR_AttendanceAdjustments','C',N'HR'),(N'HR_LeaveTypes','A',N'HR'),(N'HR_LeaveBalances','B',N'HR'),(N'HR_LeaveApplications','C',N'HR'),(N'HR_SalaryStructures','A',N'HR'),(N'HR_SalaryComponents','A',N'HR'),(N'HR_SalaryStructureComponents','A',N'HR'),(N'HR_EmployeeSalaryStructures','B',N'HR'),(N'HR_PayrollRuns','C',N'HR'),(N'HR_PayrollDetails','C',N'HR'),
(N'CompanyGstRegistrations','B',N'GST/GSTZen'),(N'CompanyGstSessions','C',N'GST/GSTZen'),(N'GstVerificationLogs','C',N'GST/GSTZen'),(N'EWayBills','C',N'GST/GSTZen'),(N'EInvoices','C',N'GST/GSTZen'),(N'GstApiLogs','C',N'GST/GSTZen'),
(N'OeeMachines','A',N'OEE'),(N'OeeMoulds','A',N'OEE'),(N'OeeDowntimeReasons','A',N'OEE'),(N'OeeProductionEntries','C',N'OEE'),
(N'SalesChannels','A',N'Supply chain'),(N'ChannelSkuMappings','A',N'Supply chain'),(N'ChannelWarehouses','A',N'Supply chain'),(N'ItemPackagingProfiles','A',N'Supply chain'),(N'SupplyChainImportBatches','C',N'Supply chain'),(N'SupplyChainImportRows','C',N'Supply chain'),
(N'ProductBomComponents','A',N'Procurement planning'),(N'ProcurementSettings','A',N'Procurement planning'),(N'ProcurementSalesImportBatches','C',N'Procurement planning'),(N'ProcurementSalesHistory','C',N'Procurement planning'),(N'ProcurementLeadTimeHistory','C',N'Procurement planning'),(N'ProcurementInboundStockSnapshots','C',N'Procurement planning'),(N'ProcurementPlanningRuns','C',N'Procurement planning'),(N'ProcurementPlanningRunLines','C',N'Procurement planning'),
(N'ManufacturingBoms','C',N'Manufacturing'),(N'ManufacturingBomItems','C',N'Manufacturing'),(N'ManufacturingProductions','C',N'Manufacturing'),(N'ManufacturingProductionMaterials','C',N'Manufacturing'),
(N'DispatchSkuSettings','A',N'Dispatch planning'),(N'DispatchImportStagedRows','C',N'Dispatch planning'),(N'DispatchWarehouseSalesSnapshots','C',N'Dispatch planning'),(N'DispatchWarehouseStockSnapshots','C',N'Dispatch planning'),(N'DispatchWarehouseInboundSnapshots','C',N'Dispatch planning'),(N'DispatchPlanningRuns','C',N'Dispatch planning'),(N'DispatchCompanyStockSnapshots','C',N'Dispatch planning'),(N'DispatchRecommendationResults','C',N'Dispatch planning'),(N'DispatchAllocations','C',N'Dispatch planning'),
(N'Wallets','B',N'Rojmel'),(N'WalletCategories','A',N'Rojmel'),(N'WalletTransfers','C',N'Rojmel'),(N'WalletTransactions','C',N'Rojmel'),
(N'Shipments','C',N'Shipment operations'),(N'ShipmentItems','C',N'Shipment operations'),(N'ShipmentPackages','C',N'Shipment operations'),(N'ShipmentPackageItems','C',N'Shipment operations'),(N'ShipmentDockets','C',N'Shipment operations'),(N'ShipmentAppointments','C',N'Shipment operations'),(N'ShipmentTrackingEvents','C',N'Shipment operations'),(N'ShipmentDeliveryAttempts','C',N'Shipment operations'),(N'ShipmentReceipts','C',N'Shipment operations'),(N'ShipmentReceiptItems','C',N'Shipment operations'),(N'ShipmentReturns','C',N'Shipment operations'),(N'ShipmentReturnItems','C',N'Shipment operations'),(N'ShipmentFreightCharges','C',N'Shipment operations'),(N'ShipmentImportStagedRows','C',N'Shipment operations');

CREATE TABLE #TableCounts(TableName sysname NOT NULL PRIMARY KEY,Classification char(1) NOT NULL,ModuleName nvarchar(100) NOT NULL,TableExists bit NOT NULL,RowTotal bigint NULL);
DECLARE @TableName sysname,@Sql nvarchar(max),@Count bigint;
DECLARE VerifyCountCursor CURSOR LOCAL FAST_FORWARD FOR SELECT TableName FROM #ExpectedTables;
OPEN VerifyCountCursor;
FETCH NEXT FROM VerifyCountCursor INTO @TableName;
WHILE @@FETCH_STATUS=0
BEGIN
    SET @Count=NULL;
    IF OBJECT_ID(N'dbo.'+QUOTENAME(@TableName),N'U') IS NULL
    BEGIN
        INSERT #TableCounts SELECT TableName,Classification,ModuleName,0,NULL FROM #ExpectedTables WHERE TableName=@TableName;
        INSERT #Findings VALUES('FAIL',N'Required table',N'dbo.'+@TableName+N' is missing.');
    END
    ELSE
    BEGIN
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM dbo.'+QUOTENAME(@TableName)+N';';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@Count OUTPUT;
        INSERT #TableCounts SELECT TableName,Classification,ModuleName,1,@Count FROM #ExpectedTables WHERE TableName=@TableName;
        IF EXISTS(SELECT 1 FROM #ExpectedTables WHERE TableName=@TableName AND Classification='C') AND @Count<>0
            INSERT #Findings VALUES('FAIL',N'Transactional table empty',N'dbo.'+@TableName+N' has '+CONVERT(nvarchar(30),@Count)+N' remaining rows.');
    END;
    FETCH NEXT FROM VerifyCountCursor INTO @TableName;
END
CLOSE VerifyCountCursor;
DEALLOCATE VerifyCountCursor;

/* Security: exact account count, flags, role links, permission roots, and no active authentication material. */
IF (SELECT COUNT(*) FROM dbo.Users WHERE IsDeleted=0)<>@ExpectedUserCount
    INSERT #Findings VALUES('FAIL',N'Approved user count',N'Expected '+CONVERT(nvarchar(20),@ExpectedUserCount)+N' non-deleted users; found '+CONVERT(nvarchar(20),(SELECT COUNT(*) FROM dbo.Users WHERE IsDeleted=0))+N'.');
ELSE INSERT #Findings VALUES('PASS',N'Approved user count',N'Exactly the configured number of non-deleted users remains.');
IF (SELECT COUNT(*) FROM dbo.Users WHERE IsDeleted=0 AND IsSystemUser=1)<>1
    INSERT #Findings VALUES('FAIL',N'Protected System Owner',N'Expected exactly one non-deleted Users.IsSystemUser row.');
ELSE IF NOT EXISTS(SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.IsDeleted=0 AND u.IsSystemUser=1 AND u.IsActive=1 AND r.IsSystemRole=1 AND r.IsActive=1)
    INSERT #Findings VALUES('FAIL',N'System Owner role assignment',N'The protected owner has no active protected system-role assignment.');
ELSE INSERT #Findings VALUES('PASS',N'Protected System Owner',N'Exactly one active protected owner with an active protected system role remains.');
IF (SELECT COUNT(*) FROM dbo.Roles WHERE IsSystemRole=1 AND IsActive=1)<>1
    INSERT #Findings VALUES('FAIL',N'Protected System Owner role',N'Expected exactly one active Roles.IsSystemRole row.');
IF @ExpectedStagingAdminUsername=N'CHANGE_ME' AND NULLIF(@ExpectedStagingAdminEmail,N'') IS NULL
    INSERT #Findings VALUES('FAIL',N'Staging administrator configuration',N'Set an exact administrator username or email before using this gate.');
ELSE IF NOT EXISTS
(
    SELECT 1 FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId
    WHERE u.IsDeleted=0 AND u.IsActive=1 AND r.IsActive=1 AND r.Name=@ExpectedStagingAdminRoleName
      AND ((@ExpectedStagingAdminUsername<>N'CHANGE_ME' AND u.Username=@ExpectedStagingAdminUsername) OR (NULLIF(@ExpectedStagingAdminEmail,N'') IS NOT NULL AND u.Email=@ExpectedStagingAdminEmail))
)
    INSERT #Findings VALUES('FAIL',N'Staging administrator',N'The configured staging administrator does not have the exact required active role '+QUOTENAME(@ExpectedStagingAdminRoleName)+N'.');
ELSE INSERT #Findings VALUES('PASS',N'Staging administrator',N'The configured active administrator and required role assignment remain.');
IF EXISTS(SELECT 1 FROM dbo.RefreshTokens) OR EXISTS(SELECT 1 FROM dbo.PasswordResetTokens) OR EXISTS(SELECT 1 FROM dbo.CompanyGstSessions)
    INSERT #Findings VALUES('FAIL',N'Authentication/session cleanup',N'Refresh-token, password-reset-token, or GST session rows remain.');
ELSE INSERT #Findings VALUES('PASS',N'Authentication/session cleanup',N'No refresh-token, password-reset-token, or GST session rows remain.');
IF NOT EXISTS(SELECT 1 FROM dbo.Pages) OR NOT EXISTS(SELECT 1 FROM dbo.RolePermissions)
    INSERT #Findings VALUES('FAIL',N'Pages and permissions',N'Page or permission seed rows are missing.');
ELSE INSERT #Findings VALUES('PASS',N'Pages and permissions',N'Page and role-permission rows remain.');

/* Masters: output every count; static seed/configuration absence is a warning for review, not a deletion proof. */
IF NOT EXISTS(SELECT 1 FROM dbo.PaymentModes)
    INSERT #Findings VALUES('FAIL',N'Payment-mode seed',N'PaymentModes is empty.');
IF NOT EXISTS(SELECT 1 FROM dbo.PartySettings)
    INSERT #Findings VALUES('FAIL',N'Party configuration',N'PartySettings is empty.');
IF EXISTS(SELECT 1 FROM #TableCounts WHERE Classification='A' AND RowTotal=0)
    INSERT #Findings VALUES('WARNING',N'Empty preserved master table',N'At least one Category A table is empty. Compare the full master table count report to the pre-cleanup report before staging approval.');

/* Stock and financial policy checks. */
IF @ExpectResetItemStock=1 AND EXISTS(SELECT 1 FROM dbo.Items WHERE OpeningStock<>0 OR OpeningStockValue<>0 OR CurrentStock<>0 OR ReservedStock<>0 OR IsManufactured<>0)
    INSERT #Findings VALUES('FAIL',N'Item stock reset',N'One or more stored item stock values remain non-zero.');
ELSE IF @ExpectResetItemStock=1 INSERT #Findings VALUES('PASS',N'Item stock reset',N'OpeningStock, OpeningStockValue, CurrentStock, ReservedStock and IsManufactured are reset for every item.');
IF @ExpectResetPartyOpeningBalances=1 AND EXISTS(SELECT 1 FROM dbo.Parties WHERE OpeningBalance<>0)
    INSERT #Findings VALUES('FAIL',N'Party opening balance reset',N'One or more party opening balances remain non-zero.');
ELSE IF @ExpectResetPartyOpeningBalances=1 INSERT #Findings VALUES('PASS',N'Party opening balance reset',N'All preserved party opening balances are zero.');
IF @ExpectPartyMastersPreserved=0 AND (EXISTS(SELECT 1 FROM dbo.Parties) OR EXISTS(SELECT 1 FROM dbo.PartyRoles))
    INSERT #Findings VALUES('FAIL',N'Party-master preservation policy',N'Party or transporter-role rows remain although the configured policy expects all party masters removed.');
IF @ExpectEmployeesPreserved=0 AND
(
    EXISTS(SELECT 1 FROM dbo.HR_Employees) OR EXISTS(SELECT 1 FROM dbo.HR_EmployeeAddresses) OR EXISTS(SELECT 1 FROM dbo.HR_EmployeeBankAccounts)
    OR EXISTS(SELECT 1 FROM dbo.HR_EmployeeDocuments) OR EXISTS(SELECT 1 FROM dbo.HR_EmployeeSalaryStructures) OR EXISTS(SELECT 1 FROM dbo.HR_LeaveBalances)
)
    INSERT #Findings VALUES('FAIL',N'Employee removal policy',N'Employee or dependent HR personal/assignment/balance rows remain although the configured policy expects none.');
ELSE IF @ExpectEmployeesPreserved=0 INSERT #Findings VALUES('PASS',N'Employee removal policy',N'No employee or dependent HR personal/assignment/balance rows remain.');
IF @ExpectEmployeesPreserved=1 AND @ExpectEmployeePersonalDetailsPreserved=0 AND
(
    EXISTS(SELECT 1 FROM dbo.HR_EmployeeAddresses) OR EXISTS(SELECT 1 FROM dbo.HR_EmployeeBankAccounts) OR EXISTS(SELECT 1 FROM dbo.HR_EmployeeDocuments)
)
    INSERT #Findings VALUES('FAIL',N'Employee personal-detail policy',N'Employee personal-detail rows remain although the configured policy expects them removed.');
IF @ExpectEmployeesPreserved=1 AND EXISTS(SELECT 1 FROM dbo.HR_LeaveBalances WHERE OpeningBalance<>0 OR UsedBalance<>0 OR RemainingBalance<>0)
    INSERT #Findings VALUES('FAIL',N'Employee leave-balance reset',N'Preserved employees have non-zero derived leave balances.');
IF (SELECT COUNT(*) FROM dbo.Wallets WHERE IsDeleted=0 AND IsCompanyWallet=1)<>1
    INSERT #Findings VALUES('FAIL',N'Company wallet',N'Expected exactly one retained, non-deleted company wallet.');
IF @ExpectPrivilegedUserWalletsPreserved=0 AND (SELECT COUNT(*) FROM dbo.Wallets WHERE IsDeleted=0)<>1
    INSERT #Findings VALUES('FAIL',N'Privileged-wallet preservation policy',N'Only the company wallet should remain under the configured policy.');
IF @ExpectPrivilegedUserWalletsPreserved=1 AND (SELECT COUNT(*) FROM dbo.Wallets WHERE IsDeleted=0)>3
    INSERT #Findings VALUES('FAIL',N'Privileged-wallet preservation policy',N'More than the company, System Owner, and staging administrator wallets remain.');
IF EXISTS(SELECT 1 FROM dbo.Wallets WHERE IsDeleted=0 AND (OpeningBalance<>0 OR CurrentBalance<>0))
    INSERT #Findings VALUES('FAIL',N'Wallet balance reset',N'One or more retained wallet balances are non-zero.');
ELSE INSERT #Findings VALUES('PASS',N'Wallet balance reset',N'Every retained wallet has zero opening/current balance and no ledger rows remain.');
IF @ExpectCompanyGstRegistrationsPreserved=0 AND EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations)
    INSERT #Findings VALUES('FAIL',N'GST registration policy',N'Company GST registrations remain although the configured policy expects none.');
ELSE IF @ExpectCompanyGstRegistrationsPreserved=1 AND EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE GstPortalUsername IS NOT NULL)
    INSERT #Findings VALUES('FAIL',N'GST credential minimization',N'A retained GST registration still contains GstPortalUsername.');
ELSE INSERT #Findings VALUES('PASS',N'GST registration policy',N'GST registration retention follows the configured policy and no GST sessions remain.');
IF @ExpectAuditLogsPreserved=0 AND EXISTS(SELECT 1 FROM dbo.AuditLogs)
    INSERT #Findings VALUES('FAIL',N'Audit-log cleanup',N'Audit logs remain although the configured policy expects zero.');
IF @ExpectResetDocumentSequences=1 AND EXISTS
(
    SELECT 1 FROM dbo.NumberSequences
    WHERE ModuleName IN(N'SalesInvoice',N'PurchaseBill',N'SupplierPayment',N'Expense',N'PurchaseOrder',N'PurchaseReturn',N'ProcurementSalesImport',N'ProcurementPlanning',N'Shipment',N'ShipmentReceipt',N'ShipmentReturn',N'ManufacturingBom',N'ManufacturingProduction')
      AND NextNumber<>1
)
    INSERT #Findings VALUES('FAIL',N'Document sequence reset',N'At least one known transactional NumberSequences row does not have NextNumber = 1.');
ELSE IF @ExpectResetDocumentSequences=1 INSERT #Findings VALUES('PASS',N'Document sequence reset',N'All present known transaction sequence definitions have NextNumber = 1; prefixes/padding remain configuration.');

/* Integrity checks: all FK orphans, enabled/trusted constraints, DML triggers, role/page links, mappings, warehouses. */
CREATE TABLE #ForeignKeyOrphans(ForeignKeyName sysname NOT NULL,ChildTable nvarchar(517) NOT NULL,ParentTable nvarchar(517) NOT NULL,OrphanCount bigint NOT NULL);
DECLARE @FkId int,@FkName sysname,@ChildObjectId int,@ParentObjectId int,@JoinPredicate nvarchar(max),@NotNullPredicate nvarchar(max),@OrphanCount bigint;
DECLARE FkCursor CURSOR LOCAL FAST_FORWARD FOR SELECT object_id,name,parent_object_id,referenced_object_id FROM sys.foreign_keys;
OPEN FkCursor;
FETCH NEXT FROM FkCursor INTO @FkId,@FkName,@ChildObjectId,@ParentObjectId;
WHILE @@FETCH_STATUS=0
BEGIN
    SELECT @JoinPredicate=STUFF((SELECT N' AND p.'+QUOTENAME(pc.name)+N'=c.'+QUOTENAME(cc.name)
                                 FROM sys.foreign_key_columns fkc JOIN sys.columns cc ON cc.object_id=fkc.parent_object_id AND cc.column_id=fkc.parent_column_id JOIN sys.columns pc ON pc.object_id=fkc.referenced_object_id AND pc.column_id=fkc.referenced_column_id
                                 WHERE fkc.constraint_object_id=@FkId ORDER BY fkc.constraint_column_id FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,5,N''),
           @NotNullPredicate=STUFF((SELECT N' AND c.'+QUOTENAME(cc.name)+N' IS NOT NULL'
                                    FROM sys.foreign_key_columns fkc JOIN sys.columns cc ON cc.object_id=fkc.parent_object_id AND cc.column_id=fkc.parent_column_id
                                    WHERE fkc.constraint_object_id=@FkId ORDER BY fkc.constraint_column_id FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,5,N'');
    SET @OrphanCount=0;
    SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(OBJECT_SCHEMA_NAME(@ChildObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@ChildObjectId))+N' c WHERE '+@NotNullPredicate+N' AND NOT EXISTS(SELECT 1 FROM '+QUOTENAME(OBJECT_SCHEMA_NAME(@ParentObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@ParentObjectId))+N' p WHERE '+@JoinPredicate+N');';
    EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@OrphanCount OUTPUT;
    INSERT #ForeignKeyOrphans VALUES(@FkName,QUOTENAME(OBJECT_SCHEMA_NAME(@ChildObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@ChildObjectId)),QUOTENAME(OBJECT_SCHEMA_NAME(@ParentObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@ParentObjectId)),@OrphanCount);
    FETCH NEXT FROM FkCursor INTO @FkId,@FkName,@ChildObjectId,@ParentObjectId;
END
CLOSE FkCursor;
DEALLOCATE FkCursor;
IF EXISTS(SELECT 1 FROM #ForeignKeyOrphans WHERE OrphanCount<>0)
    INSERT #Findings VALUES('FAIL',N'Foreign-key orphan check',N'One or more foreign keys have orphan rows; see FOREIGN_KEY_ORPHANS.');
ELSE INSERT #Findings VALUES('PASS',N'Foreign-key orphan check',N'No orphan rows were found for any foreign key.');
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
    INSERT #Findings VALUES('FAIL',N'Constraint state',N'At least one foreign key or check constraint is disabled or untrusted.');
ELSE INSERT #Findings VALUES('PASS',N'Constraint state',N'All foreign keys and check constraints are enabled and trusted.');
IF EXISTS(SELECT 1 FROM sys.triggers WHERE parent_class_desc=N'OBJECT_OR_COLUMN' AND is_disabled=1)
    INSERT #Findings VALUES('FAIL',N'DML trigger state',N'At least one DML trigger is disabled.');
ELSE INSERT #Findings VALUES('PASS',N'DML trigger state',N'No DML trigger is disabled.');
IF EXISTS(SELECT 1 FROM dbo.UserRoles ur LEFT JOIN dbo.Users u ON u.Id=ur.UserId LEFT JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id IS NULL OR r.Id IS NULL OR u.IsDeleted=1 OR u.IsActive=0 OR r.IsActive=0)
    INSERT #Findings VALUES('FAIL',N'Invalid role assignments',N'An assignment points to a missing, deleted, or inactive identity/role.');
IF EXISTS(SELECT 1 FROM dbo.RolePermissions rp LEFT JOIN dbo.Roles r ON r.Id=rp.RoleId LEFT JOIN dbo.Pages p ON p.Id=rp.PageId WHERE r.Id IS NULL OR p.Id IS NULL)
    INSERT #Findings VALUES('FAIL',N'Invalid page permissions',N'An RBAC permission points to a missing role or page.');
IF EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings m LEFT JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId LEFT JOIN dbo.Items i ON i.Id=m.ItemId WHERE c.Id IS NULL OR (m.ItemId IS NOT NULL AND i.Id IS NULL))
    INSERT #Findings VALUES('FAIL',N'Invalid SKU mapping',N'A channel SKU mapping has an invalid channel or item relationship.');
IF EXISTS(SELECT 1 FROM dbo.ChannelWarehouses w LEFT JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE c.Id IS NULL)
    INSERT #Findings VALUES('FAIL',N'Invalid warehouse/channel relationship',N'A channel warehouse has an invalid channel relationship.');

SELECT N'VERIFICATION_HEADER' ReportSection,@CurrentDatabaseName CurrentDatabaseName,@@VERSION SqlServerVersion,SYSUTCDATETIME() VerifiedAtUtc;
SELECT N'TABLE_COUNTS_AND_CLASSIFICATION' ReportSection,Classification,ModuleName,N'dbo.'+TableName TableName,TableExists,RowTotal FROM #TableCounts ORDER BY Classification,ModuleName,TableName;
SELECT N'PRESERVED_USERS' ReportSection,u.Id UserId,u.Username,u.Email,u.FullName,u.IsActive,u.IsSystemUser,
       STUFF((SELECT N', '+r.Name FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE ur.UserId=u.Id ORDER BY r.Name FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,2,N'') AssignedRoles
FROM dbo.Users u WHERE u.IsDeleted=0 ORDER BY u.Id;
SELECT N'PRESERVED_MASTER_COUNTS' ReportSection,ModuleName,N'dbo.'+TableName TableName,RowTotal FROM #TableCounts WHERE Classification='A' ORDER BY ModuleName,TableName;
SELECT N'NUMBER_SEQUENCE_STATE' ReportSection,ModuleName,Prefix,NextNumber,PaddingLength FROM dbo.NumberSequences ORDER BY ModuleName;
SELECT N'IDENTITY_STATE' ReportSection,QUOTENAME(OBJECT_SCHEMA_NAME(ic.object_id))+N'.'+QUOTENAME(OBJECT_NAME(ic.object_id)) TableName,c.name ColumnName,ic.seed_value,ic.increment_value,ic.last_value
FROM sys.identity_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id ORDER BY TableName,ColumnName;
SELECT N'FOREIGN_KEY_ORPHANS' ReportSection,* FROM #ForeignKeyOrphans WHERE OrphanCount<>0 ORDER BY ChildTable,ForeignKeyName;
SELECT N'CONSTRAINTS_REQUIRING_ATTENTION' ReportSection,N'FOREIGN_KEY' ObjectType,name ObjectName,OBJECT_SCHEMA_NAME(parent_object_id)+N'.'+OBJECT_NAME(parent_object_id) ParentObject,is_disabled IsDisabled,is_not_trusted IsUntrusted FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1
UNION ALL SELECT N'CONSTRAINTS_REQUIRING_ATTENTION',N'CHECK',name,OBJECT_SCHEMA_NAME(parent_object_id)+N'.'+OBJECT_NAME(parent_object_id),is_disabled,is_not_trusted FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT N'FINDINGS' ReportSection,Severity,CheckName,Detail FROM #Findings ORDER BY CASE Severity WHEN 'FAIL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,CheckName;
DECLARE @OverallResult varchar(7)=CASE WHEN EXISTS(SELECT 1 FROM #Findings WHERE Severity='FAIL') THEN 'FAIL' WHEN EXISTS(SELECT 1 FROM #Findings WHERE Severity='WARNING') THEN 'WARNING' ELSE 'PASS' END;
SELECT @OverallResult OverallResult,
       CASE @OverallResult WHEN 'PASS' THEN N'Clean staging verification passed. Review the reports and complete staging configuration before use.' WHEN 'WARNING' THEN N'No hard failure was found, but warnings require documented operator review before staging approval.' ELSE N'Clean staging verification failed. Do not move or use this database for staging until every failure is resolved.' END Detail;
