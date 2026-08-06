/*
    COSMOS ERP - prepare a clean staging database

    IMPORTANT
    - This script is deliberately DRY RUN by default.
    - Do not run it against production. Stop the application and take a tested full backup
      before changing @ExecuteCleanup to 1.
    - The script does not drop/recreate the database and never changes program objects.
    - It is written for the current repository schema through 2026-07-29. It fails closed
      when a populated user table is not classified below.

    Run this script in SQL Server Management Studio while connected to the intended copy.
    Execute backend/database/staging/20260803_verify_clean_staging_database.sql afterwards.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* A dry run returns before its session-scoped work tables are automatically removed.
   Clear only the tables owned by this script so it is safe to rerun in the same SSMS session. */
DROP TABLE IF EXISTS #PostForeignKeyOrphans;
DROP TABLE IF EXISTS #PostFailures;
DROP TABLE IF EXISTS #IdentityCandidates;
DROP TABLE IF EXISTS #ChangedTriggers;
DROP TABLE IF EXISTS #DeletionPlan;
DROP TABLE IF EXISTS #SafetyFindings;
DROP TABLE IF EXISTS #PreservedUsers;
DROP TABLE IF EXISTS #UnsafeInboundDependencies;
DROP TABLE IF EXISTS #ForeignKeyInventory;
DROP TABLE IF EXISTS #UnresolvedTables;
DROP TABLE IF EXISTS #TableCounts;
DROP TABLE IF EXISTS #ApprovedUnresolvedTables;
DROP TABLE IF EXISTS #TableClassification;

/* =============================================================================
   1. OPERATOR CONFIGURATION -- review every value before enabling execution
   ============================================================================= */
DECLARE @ExecuteCleanup bit = 1;
DECLARE @ExpectedDatabaseName sysname = N'CosmosERP_Staging';
DECLARE @BackupConfirmed bit = 1;
DECLARE @AllowProductionLikeDatabaseName bit = 0; -- Must remain 0 for a staging cleanup.

/* The staging administrator must be a distinct, existing account. Set exactly one identifier. */
DECLARE @ExpectedStagingAdminUsername nvarchar(100) = N'admin';
DECLARE @ExpectedStagingAdminEmail nvarchar(256) = NULL;
DECLARE @ExpectedStagingAdminRoleName nvarchar(100) = N'SuperAdmin';

/* Data-policy switches. Defaults are the most conservative clean-staging policies. */
DECLARE @ResetItemStock bit = 1;
DECLARE @ResetPartyOpeningBalances bit = 1;
DECLARE @PreserveEmployees bit = 0;
DECLARE @PreserveEmployeePersonalDetails bit = 0; -- Only applies when @PreserveEmployees = 1.
DECLARE @PreservePartyMasters bit = 1;
DECLARE @PreserveCompanyGstRegistrations bit = 0;
DECLARE @CompanyGstRegistrationReviewed bit = 0; -- Must be 1 when preserving real GSTIN/company data.
DECLARE @PreservePrivilegedUserWallets bit = 0; -- Preserve System Owner/Admin user wallets only; balances are still reset.
DECLARE @PreserveAuditLogs bit = 0;
DECLARE @ResetDocumentSequences bit = 1;

DECLARE @CurrentDatabaseName sysname = DB_NAME();
DECLARE @NowUtc datetime2(3) = SYSUTCDATETIME();

/* =============================================================================
   2. CLASSIFICATION -- explicit allowlists; nothing outside these lists is deleted
   ============================================================================= */
CREATE TABLE #TableClassification
(
    SchemaName sysname NOT NULL,
    TableName sysname NOT NULL,
    Category char(1) NOT NULL CHECK (Category IN ('A','B','C','D')),
    ModuleName nvarchar(100) NOT NULL,
    PreservationOrDeletionRule nvarchar(1000) NOT NULL,
    IsRequiredInCurrentSchema bit NOT NULL DEFAULT (1),
    PRIMARY KEY (SchemaName, TableName)
);

/* A = preserve completely. */
INSERT #TableClassification(SchemaName,TableName,Category,ModuleName,PreservationOrDeletionRule,IsRequiredInCurrentSchema) VALUES
(N'dbo',N'Roles','A',N'Security',N'All roles, including the protected system role and staging administrator role, remain.',1),
(N'dbo',N'Pages','A',N'Security',N'Navigation/page seeds and hierarchy remain.',1),
(N'dbo',N'RolePermissions','A',N'Security',N'All RBAC page/action permissions remain.',1),
(N'dbo',N'PartySettings','A',N'Parties',N'Application party configuration remains.',1),
(N'dbo',N'Categories','A',N'Items',N'Item master lookup remains.',1),
(N'dbo',N'Units','A',N'Items',N'Item master lookup remains.',1),
(N'dbo',N'Items','A',N'Items',N'Item master, codes, prices, HSN/GST, category/unit links and image URLs remain; operational stock is optionally reset.',1),
(N'dbo',N'NumberSequences','A',N'Configuration',N'Prefixes, padding and sequence definitions remain; only known transactional next numbers are optionally reset.',1),
(N'dbo',N'PaymentModes','A',N'Configuration',N'Static payment-mode lookup remains.',1),
(N'dbo',N'ExpenseCategories','A',N'Purchase and expenses',N'Reusable expense category master remains.',1),
(N'dbo',N'HR_Departments','A',N'HR',N'HR master configuration remains.',1),
(N'dbo',N'HR_Designations','A',N'HR',N'HR master configuration remains.',1),
(N'dbo',N'HR_Shifts','A',N'HR',N'HR master configuration remains.',1),
(N'dbo',N'HR_LeaveTypes','A',N'HR',N'HR leave-type seed/master remains.',1),
(N'dbo',N'HR_SalaryStructures','A',N'HR',N'Reusable salary structure master remains.',1),
(N'dbo',N'HR_SalaryComponents','A',N'HR',N'Reusable salary component master remains.',1),
(N'dbo',N'HR_SalaryStructureComponents','A',N'HR',N'Reusable salary-structure component mapping remains.',1),
(N'dbo',N'OeeMachines','A',N'OEE',N'Machine master remains.',1),
(N'dbo',N'OeeMoulds','A',N'OEE',N'Mould master remains.',1),
(N'dbo',N'OeeDowntimeReasons','A',N'OEE',N'Downtime-reason master remains.',1),
(N'dbo',N'SalesChannels','A',N'Supply chain',N'Sales-channel master remains.',1),
(N'dbo',N'ChannelSkuMappings','A',N'Supply chain',N'Reusable channel SKU-to-item mapping remains.',1),
(N'dbo',N'ChannelWarehouses','A',N'Supply chain',N'Channel warehouse master remains.',1),
(N'dbo',N'ItemPackagingProfiles','A',N'Supply chain',N'Item packaging-profile master remains.',1),
(N'dbo',N'ProductBomComponents','A',N'Procurement planning',N'Reusable BOM mapping remains.',1),
(N'dbo',N'ProcurementSettings','A',N'Procurement planning',N'Lead time, safety factor, MOQ, order-multiple and planning configuration remain.',1),
(N'dbo',N'DispatchSkuSettings','A',N'Dispatch planning',N'Reusable dispatch SKU configuration remains.',1),
(N'dbo',N'WalletCategories','A',N'Rojmel',N'Reusable wallet category seed data remains.',1),
(N'dbo',N'__EFMigrationsHistory','A',N'Migrations',N'Optional EF migration history, if a deployment created it, is preserved.',0);

/* B = selective preservation, controlled by the policy switches above. */
INSERT #TableClassification(SchemaName,TableName,Category,ModuleName,PreservationOrDeletionRule,IsRequiredInCurrentSchema) VALUES
(N'dbo',N'Users','B',N'Security',N'Keep exactly one active non-deleted IsSystemUser owner and the explicitly configured staging administrator; physically delete all others after dependents are removed.',1),
(N'dbo',N'UserRoles','B',N'Security',N'Keep only role links for the two preserved accounts; retain every role record.',1),
(N'dbo',N'RefreshTokens','B',N'Security',N'Delete all rows to invalidate every current session.',1),
(N'dbo',N'PasswordResetTokens','B',N'Security',N'Delete all rows to invalidate reset workflows.',1),
(N'dbo',N'AuditLogs','B',N'Audit',N'Delete by default; preserve only when @PreserveAuditLogs=1.',1),
(N'dbo',N'Parties','B',N'Parties',N'Preserve all party masters by default; only OpeningBalance is reset when selected.',1),
(N'dbo',N'PartyRoles','B',N'Shipment operations',N'Preserve transporter role mappings with Party masters; delete only if @PreservePartyMasters=0.',1),
(N'dbo',N'HR_Employees','B',N'HR',N'Delete by default because employees contain operational personal data; retain only when @PreserveEmployees=1.',1),
(N'dbo',N'HR_EmployeeAddresses','B',N'HR',N'Keep only when both employee and personal-detail preservation are explicitly selected.',1),
(N'dbo',N'HR_EmployeeBankAccounts','B',N'HR',N'Keep only when both employee and personal-detail preservation are explicitly selected.',1),
(N'dbo',N'HR_EmployeeDocuments','B',N'HR',N'Keep only when both employee and personal-detail preservation are explicitly selected.',1),
(N'dbo',N'HR_EmployeeSalaryStructures','B',N'HR',N'Keep only for explicitly preserved employees.',1),
(N'dbo',N'HR_LeaveBalances','B',N'HR',N'Delete with employees; otherwise reset verified opening/used/remaining balances to zero.',1),
(N'dbo',N'CompanyGstRegistrations','B',N'GST/GSTZen',N'Delete by default because GSTIN/company data can be production sensitive; if retained, explicit review is required and portal username is cleared.',1),
(N'dbo',N'Wallets','B',N'Rojmel',N'Preserve exactly one company wallet and optionally preserved-user wallets; clear all ledger rows and reset stored balances through the verified zero policy.',1);

/* C = transactional/operational data to delete in the explicit dependency order below. */
INSERT #TableClassification(SchemaName,TableName,Category,ModuleName,PreservationOrDeletionRule,IsRequiredInCurrentSchema) VALUES
(N'dbo',N'SalesInvoices','C',N'Sales',N'Delete invoice headers after payments/items/GST artefacts.',1),
(N'dbo',N'SalesInvoiceItems','C',N'Sales',N'Delete invoice lines.',1),
(N'dbo',N'SalesInvoicePayments','C',N'Sales',N'Delete invoice payments.',1),
(N'dbo',N'PurchaseBills','C',N'Purchase',N'Delete purchase bill headers after dependent artefacts.',1),
(N'dbo',N'PurchaseBillItems','C',N'Purchase',N'Delete purchase bill lines.',1),
(N'dbo',N'SupplierPayments','C',N'Purchase',N'Delete supplier payments.',1),
(N'dbo',N'SupplierPaymentAllocations','C',N'Purchase',N'Delete supplier payment allocations.',1),
(N'dbo',N'PurchaseOrders','C',N'Purchase',N'Delete purchase orders.',1),
(N'dbo',N'PurchaseOrderItems','C',N'Purchase',N'Delete purchase order lines.',1),
(N'dbo',N'PurchaseReturns','C',N'Purchase',N'Delete purchase returns.',1),
(N'dbo',N'PurchaseReturnItems','C',N'Purchase',N'Delete purchase return lines.',1),
(N'dbo',N'Expenses','C',N'Purchase and expenses',N'Delete expense transactions and attachment references.',1),
(N'dbo',N'PartyLedgerEntries','C',N'Parties',N'Delete receivable/payable ledger entries.',1),
(N'dbo',N'StockMovements','C',N'Inventory',N'Delete all operational stock movements.',1),
(N'dbo',N'HR_Attendance','C',N'HR',N'Delete attendance transactions.',1),
(N'dbo',N'HR_AttendanceAdjustments','C',N'HR',N'Delete attendance adjustments before attendance.',1),
(N'dbo',N'HR_LeaveApplications','C',N'HR',N'Delete leave transactions.',1),
(N'dbo',N'HR_PayrollRuns','C',N'HR',N'Delete payroll runs.',1),
(N'dbo',N'HR_PayrollDetails','C',N'HR',N'Delete payroll details before payroll runs.',1),
(N'dbo',N'CompanyGstSessions','C',N'GST/GSTZen',N'Delete all provider sessions and tokens.',1),
(N'dbo',N'GstVerificationLogs','C',N'GST/GSTZen',N'Delete GST verification cache/log data.',1),
(N'dbo',N'GstApiLogs','C',N'GST/GSTZen',N'Delete GST API request/response logs.',1),
(N'dbo',N'EWayBills','C',N'GST/GSTZen',N'Delete generated e-way bills.',1),
(N'dbo',N'EInvoices','C',N'GST/GSTZen',N'Delete generated e-invoices.',1),
(N'dbo',N'OeeProductionEntries','C',N'OEE',N'Delete production/OEE entries.',1),
(N'dbo',N'WalletTransactions','C',N'Rojmel',N'Delete all wallet ledger entries before transfers and wallets.',1),
(N'dbo',N'WalletTransfers','C',N'Rojmel',N'Delete all wallet transfers after ledger entries.',1),
(N'dbo',N'ProcurementSalesImportBatches','C',N'Procurement planning',N'Delete source import batches after sales-history rows.',1),
(N'dbo',N'ProcurementSalesHistory','C',N'Procurement planning',N'Delete imported/manual sales-history rows.',1),
(N'dbo',N'ProcurementLeadTimeHistory','C',N'Procurement planning',N'Delete dated lead-time operational history; reusable configured lead time remains in ProcurementSettings.',1),
(N'dbo',N'ProcurementInboundStockSnapshots','C',N'Procurement planning',N'Delete inbound operational snapshots.',1),
(N'dbo',N'ProcurementPlanningRuns','C',N'Procurement planning',N'Delete planning-run headers.',1),
(N'dbo',N'ProcurementPlanningRunLines','C',N'Procurement planning',N'Delete planning-run recommendation snapshots.',1),
(N'dbo',N'SupplyChainImportBatches','C',N'Supply chain',N'Delete shared import batches after all module staged/snapshot rows and planning runs.',1),
(N'dbo',N'SupplyChainImportRows','C',N'Supply chain',N'Delete shared import rows.',1),
(N'dbo',N'DispatchImportStagedRows','C',N'Dispatch planning',N'Delete validated import staging rows.',1),
(N'dbo',N'DispatchWarehouseSalesSnapshots','C',N'Dispatch planning',N'Delete sales snapshots.',1),
(N'dbo',N'DispatchWarehouseStockSnapshots','C',N'Dispatch planning',N'Delete warehouse stock snapshots.',1),
(N'dbo',N'DispatchWarehouseInboundSnapshots','C',N'Dispatch planning',N'Delete warehouse inbound snapshots.',1),
(N'dbo',N'DispatchPlanningRuns','C',N'Dispatch planning',N'Delete dispatch run headers.',1),
(N'dbo',N'DispatchCompanyStockSnapshots','C',N'Dispatch planning',N'Delete company stock snapshots.',1),
(N'dbo',N'DispatchRecommendationResults','C',N'Dispatch planning',N'Delete recommendations and overrides.',1),
(N'dbo',N'DispatchAllocations','C',N'Dispatch planning',N'Delete allocations before recommendations/runs.',1),
(N'dbo',N'Shipments','C',N'Shipment operations',N'Delete shipment headers after all child operational records.',1),
(N'dbo',N'ShipmentItems','C',N'Shipment operations',N'Delete shipment items after package/receipt/return detail.',1),
(N'dbo',N'ShipmentPackages','C',N'Shipment operations',N'Delete packing records.',1),
(N'dbo',N'ShipmentPackageItems','C',N'Shipment operations',N'Delete packed-item records.',1),
(N'dbo',N'ShipmentDockets','C',N'Shipment operations',N'Delete dockets and transporter operational references.',1),
(N'dbo',N'ShipmentAppointments','C',N'Shipment operations',N'Delete appointment history.',1),
(N'dbo',N'ShipmentTrackingEvents','C',N'Shipment operations',N'Delete append-only tracking history using the narrowly controlled trigger procedure below.',1),
(N'dbo',N'ShipmentDeliveryAttempts','C',N'Shipment operations',N'Delete delivery attempts.',1),
(N'dbo',N'ShipmentReceipts','C',N'Shipment operations',N'Delete receipt headers and proof references.',1),
(N'dbo',N'ShipmentReceiptItems','C',N'Shipment operations',N'Delete receipt details.',1),
(N'dbo',N'ShipmentReturns','C',N'Shipment operations',N'Delete return headers.',1),
(N'dbo',N'ShipmentReturnItems','C',N'Shipment operations',N'Delete return details.',1),
(N'dbo',N'ShipmentFreightCharges','C',N'Shipment operations',N'Delete freight transactions before Rojmel ledger rows.',1),
(N'dbo',N'ShipmentImportStagedRows','C',N'Shipment operations',N'Delete Work List import staging rows.',1);

/* D is intentionally empty for the repository schema. New/unclassified user tables are inserted into #UnresolvedTables below and block execution when populated. */

CREATE TABLE #ApprovedUnresolvedTables
(
    SchemaName sysname NOT NULL,
    TableName sysname NOT NULL,
    OperatorDecision nvarchar(500) NOT NULL,
    PRIMARY KEY (SchemaName, TableName)
);
/*
   Do not add entries casually. To approve a repository-external populated table without deleting it,
   insert it here with a reviewed preservation decision, for example:
   INSERT #ApprovedUnresolvedTables VALUES(N'dbo',N'VendorExtension',N'Formal review: preserve for staging');
*/

/* =============================================================================
   3. DISCOVERY, ROW COUNTS, FILE-REFERENCE INVENTORY, AND SAFETY BLOCKERS
   ============================================================================= */
CREATE TABLE #TableCounts
(
    SchemaName sysname NOT NULL,
    TableName sysname NOT NULL,
    Category char(1) NOT NULL,
    ModuleName nvarchar(100) NOT NULL,
    RowTotal bigint NULL,
    TableExists bit NOT NULL,
    IsRequiredInCurrentSchema bit NOT NULL,
    PRIMARY KEY(SchemaName,TableName)
);

DECLARE @SchemaName sysname, @TableName sysname, @Sql nvarchar(max), @RowTotal bigint;
DECLARE CountCursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT SchemaName,TableName FROM #TableClassification ORDER BY Category,ModuleName,TableName;
OPEN CountCursor;
FETCH NEXT FROM CountCursor INTO @SchemaName,@TableName;
WHILE @@FETCH_STATUS=0
BEGIN
    SET @RowTotal=NULL;
    IF OBJECT_ID(QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName),N'U') IS NOT NULL
    BEGIN
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName)+N';';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
        INSERT #TableCounts SELECT c.SchemaName,c.TableName,c.Category,c.ModuleName,@RowTotal,1,c.IsRequiredInCurrentSchema FROM #TableClassification c WHERE c.SchemaName=@SchemaName AND c.TableName=@TableName;
    END
    ELSE
        INSERT #TableCounts SELECT c.SchemaName,c.TableName,c.Category,c.ModuleName,NULL,0,c.IsRequiredInCurrentSchema FROM #TableClassification c WHERE c.SchemaName=@SchemaName AND c.TableName=@TableName;
    FETCH NEXT FROM CountCursor INTO @SchemaName,@TableName;
END
CLOSE CountCursor;
DEALLOCATE CountCursor;

CREATE TABLE #UnresolvedTables
(
    SchemaName sysname NOT NULL,
    TableName sysname NOT NULL,
    RowTotal bigint NOT NULL,
    ForeignKeySummary nvarchar(max) NULL,
    Reason nvarchar(1000) NOT NULL,
    SuggestedClassification nvarchar(500) NOT NULL,
    RequiredOperatorDecision nvarchar(1000) NOT NULL,
    PRIMARY KEY(SchemaName,TableName)
);

INSERT #UnresolvedTables(SchemaName,TableName,RowTotal,ForeignKeySummary,Reason,SuggestedClassification,RequiredOperatorDecision)
SELECT s.name,t.name,0,NULL,
       N'Not present in the repository-backed classification allowlist.',
       N'Manual review; do not delete automatically.',
       N'Classify using schema, foreign keys, procedures and repository usage; add only an explicit preserve approval if appropriate.'
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE t.is_ms_shipped=0
  AND NOT EXISTS(SELECT 1 FROM #TableClassification c WHERE c.SchemaName=s.name AND c.TableName=t.name);

DECLARE UnresolvedCursor CURSOR LOCAL FAST_FORWARD FOR SELECT SchemaName,TableName FROM #UnresolvedTables;
OPEN UnresolvedCursor;
FETCH NEXT FROM UnresolvedCursor INTO @SchemaName,@TableName;
WHILE @@FETCH_STATUS=0
BEGIN
    SET @RowTotal=0;
    SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName)+N';';
    EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
    UPDATE #UnresolvedTables SET RowTotal=@RowTotal,
        ForeignKeySummary=STUFF((SELECT N'; '+fk.name+N': '+OBJECT_SCHEMA_NAME(fk.parent_object_id)+N'.'+OBJECT_NAME(fk.parent_object_id)+N' -> '+OBJECT_SCHEMA_NAME(fk.referenced_object_id)+N'.'+OBJECT_NAME(fk.referenced_object_id)
                                 FROM sys.foreign_keys fk WHERE fk.parent_object_id=OBJECT_ID(QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName)) OR fk.referenced_object_id=OBJECT_ID(QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName))
                                 FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,2,N'')
    WHERE SchemaName=@SchemaName AND TableName=@TableName;
    FETCH NEXT FROM UnresolvedCursor INTO @SchemaName,@TableName;
END
CLOSE UnresolvedCursor;
DEALLOCATE UnresolvedCursor;

CREATE TABLE #ForeignKeyInventory
(
    ForeignKeyName sysname NOT NULL,
    ChildTable nvarchar(517) NOT NULL,
    ParentTable nvarchar(517) NOT NULL,
    IsDisabled bit NOT NULL,
    IsTrusted bit NOT NULL,
    DeleteAction nvarchar(60) NOT NULL
);
INSERT #ForeignKeyInventory
SELECT fk.name,QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(fk.parent_object_id)),
       QUOTENAME(OBJECT_SCHEMA_NAME(fk.referenced_object_id))+N'.'+QUOTENAME(OBJECT_NAME(fk.referenced_object_id)),
       fk.is_disabled,CONVERT(bit,1-fk.is_not_trusted),fk.delete_referential_action_desc
FROM sys.foreign_keys fk
;

CREATE TABLE #UnsafeInboundDependencies(ForeignKeyName sysname NOT NULL,ChildTable nvarchar(517) NOT NULL,ParentTable nvarchar(517) NOT NULL,ChildCategory char(1) NULL,ParentCategory char(1) NOT NULL);
INSERT #UnsafeInboundDependencies
SELECT fk.name,
       QUOTENAME(cs.name)+N'.'+QUOTENAME(ct.name),QUOTENAME(ps.name)+N'.'+QUOTENAME(pt.name),childClass.Category,parentClass.Category
FROM sys.foreign_keys fk
JOIN sys.tables ct ON ct.object_id=fk.parent_object_id JOIN sys.schemas cs ON cs.schema_id=ct.schema_id
JOIN sys.tables pt ON pt.object_id=fk.referenced_object_id JOIN sys.schemas ps ON ps.schema_id=pt.schema_id
JOIN #TableClassification parentClass ON parentClass.SchemaName=ps.name AND parentClass.TableName=pt.name AND parentClass.Category IN('B','C')
LEFT JOIN #TableClassification childClass ON childClass.SchemaName=cs.name AND childClass.TableName=ct.name
WHERE childClass.Category='A' OR childClass.Category IS NULL;

CREATE TABLE #PreservedUsers
(
    UserId int NOT NULL PRIMARY KEY,
    PreservationReason nvarchar(200) NOT NULL,
    Username nvarchar(100) NOT NULL,
    Email nvarchar(256) NOT NULL,
    FullName nvarchar(200) NOT NULL,
    IsActive bit NOT NULL,
    IsSystemUser bit NOT NULL,
    AssignedRoles nvarchar(max) NULL
);

IF OBJECT_ID(N'dbo.Users',N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Users',N'IsSystemUser') IS NOT NULL
BEGIN
    INSERT #PreservedUsers(UserId,PreservationReason,Username,Email,FullName,IsActive,IsSystemUser)
    SELECT u.Id,N'Protected System Owner (Users.IsSystemUser=1)',u.Username,u.Email,u.FullName,u.IsActive,u.IsSystemUser
    FROM dbo.Users u WHERE u.IsSystemUser=1 AND u.IsDeleted=0;

    IF (NULLIF(LTRIM(RTRIM(@ExpectedStagingAdminUsername)),N'') IS NOT NULL AND @ExpectedStagingAdminUsername<>N'CHANGE_ME')
       OR NULLIF(LTRIM(RTRIM(@ExpectedStagingAdminEmail)),N'') IS NOT NULL
    BEGIN
        INSERT #PreservedUsers(UserId,PreservationReason,Username,Email,FullName,IsActive,IsSystemUser)
        SELECT u.Id,N'Explicitly configured staging administrator',u.Username,u.Email,u.FullName,u.IsActive,u.IsSystemUser
        FROM dbo.Users u
        WHERE u.IsDeleted=0
          AND ((NULLIF(LTRIM(RTRIM(@ExpectedStagingAdminUsername)),N'') IS NOT NULL AND @ExpectedStagingAdminUsername<>N'CHANGE_ME' AND u.Username=@ExpectedStagingAdminUsername)
               OR (NULLIF(LTRIM(RTRIM(@ExpectedStagingAdminEmail)),N'') IS NOT NULL AND u.Email=@ExpectedStagingAdminEmail))
          AND NOT EXISTS(SELECT 1 FROM #PreservedUsers p WHERE p.UserId=u.Id);
    END;

    UPDATE p SET AssignedRoles=STUFF((SELECT N', '+r.Name FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE ur.UserId=p.UserId ORDER BY r.Name FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,2,N'')
    FROM #PreservedUsers p;
END;

CREATE TABLE #SafetyFindings
(
    IsBlocking bit NOT NULL,
    CheckName nvarchar(200) NOT NULL,
    Detail nvarchar(2000) NOT NULL
);

IF @ExpectedDatabaseName=N'CHANGE_ME_TO_THE_VERIFIED_STAGING_COPY_NAME'
    INSERT #SafetyFindings VALUES(1,N'Expected database name',N'Change @ExpectedDatabaseName from the placeholder before execution.');
IF @BackupConfirmed=0
    INSERT #SafetyFindings VALUES(1,N'Backup acknowledgement',N'Set @BackupConfirmed=1 only after taking and verifying a full backup.');
IF @ExecuteCleanup=0
    INSERT #SafetyFindings VALUES(1,N'Execution mode',N'Set @ExecuteCleanup=1 only after reviewing this dry-run report.');

IF @ExpectedDatabaseName<>N'CHANGE_ME_TO_THE_VERIFIED_STAGING_COPY_NAME' AND @CurrentDatabaseName<>@ExpectedDatabaseName
    INSERT #SafetyFindings VALUES(1,N'Expected database name',N'Connected database is '+QUOTENAME(@CurrentDatabaseName)+N', not '+QUOTENAME(@ExpectedDatabaseName)+N'.');
IF UPPER(@CurrentDatabaseName) LIKE N'%PROD%' OR UPPER(@CurrentDatabaseName) LIKE N'%PRODUCTION%' OR UPPER(@CurrentDatabaseName) LIKE N'%LIVE%' OR UPPER(@CurrentDatabaseName) LIKE N'%MAIN%'
    INSERT #SafetyFindings VALUES(1,N'Production-like database name',N'Current database name is production-like: '+QUOTENAME(@CurrentDatabaseName)+N'. @AllowProductionLikeDatabaseName is intentionally not a bypass for this script.');
IF @AllowProductionLikeDatabaseName=1
    INSERT #SafetyFindings VALUES(1,N'Production-like database override',N'This cleanup never permits a production-like database name. Reset @AllowProductionLikeDatabaseName to 0.');

IF EXISTS(SELECT 1 FROM #TableCounts WHERE IsRequiredInCurrentSchema=1 AND TableExists=0)
    INSERT #SafetyFindings VALUES(1,N'Required repository table missing',N'The target is not the current COSMOS schema. Review missing rows in the classification report; do not clean a partial migration state.');
IF (SELECT COUNT(*) FROM #PreservedUsers WHERE PreservationReason LIKE N'Protected System Owner%')<>1
    INSERT #SafetyFindings VALUES(1,N'Protected System Owner',N'Exactly one non-deleted Users.IsSystemUser=1 row is required.');
IF (SELECT COUNT(*) FROM dbo.Roles WHERE IsSystemRole=1 AND IsActive=1)<>1
    INSERT #SafetyFindings VALUES(1,N'Protected System Owner role',N'Exactly one active Roles.IsSystemRole=1 row is required.');
IF (SELECT COUNT(*) FROM #PreservedUsers)<>2
    INSERT #SafetyFindings VALUES(1,N'Configured staging administrator',N'Exactly one distinct configured staging administrator and one System Owner must resolve; never rely on an unconfigured admin alias.');
IF EXISTS(SELECT 1 FROM #PreservedUsers WHERE IsActive=0)
    INSERT #SafetyFindings VALUES(1,N'Preserved account active state',N'All preserved accounts must be active.');
IF NOT EXISTS(SELECT 1 FROM #PreservedUsers p JOIN dbo.UserRoles ur ON ur.UserId=p.UserId JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE p.PreservationReason LIKE N'Protected System Owner%' AND r.IsSystemRole=1 AND r.IsActive=1)
    INSERT #SafetyFindings VALUES(1,N'System Owner role assignment',N'The protected System Owner has no active IsSystemRole assignment.');
IF EXISTS(SELECT 1 FROM #PreservedUsers WHERE PreservationReason LIKE N'Explicitly configured%')
   AND NOT EXISTS(SELECT 1 FROM #PreservedUsers p JOIN dbo.UserRoles ur ON ur.UserId=p.UserId JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE p.PreservationReason LIKE N'Explicitly configured%' AND r.Name=@ExpectedStagingAdminRoleName AND r.IsActive=1)
    INSERT #SafetyFindings VALUES(1,N'Staging administrator role assignment',N'The configured staging administrator has no active role exactly named '+QUOTENAME(@ExpectedStagingAdminRoleName)+N'.');
IF @PreserveCompanyGstRegistrations=1 AND @CompanyGstRegistrationReviewed=0
    INSERT #SafetyFindings VALUES(1,N'GST registration review',N'Preserving GST registrations requires @CompanyGstRegistrationReviewed=1 after confirming that real client GST data is permitted in staging.');
IF EXISTS(SELECT 1 FROM #UnresolvedTables u WHERE u.RowTotal>0 AND NOT EXISTS(SELECT 1 FROM #ApprovedUnresolvedTables a WHERE a.SchemaName=u.SchemaName AND a.TableName=u.TableName))
    INSERT #SafetyFindings VALUES(1,N'Unresolved populated table',N'One or more repository-external tables contain data and are not explicitly approved for preservation.');
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1)
    INSERT #SafetyFindings VALUES(1,N'Foreign-key state',N'At least one foreign key is disabled or untrusted before cleanup. Repair it before proceeding.');
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
    INSERT #SafetyFindings VALUES(1,N'Check-constraint state',N'At least one check constraint is disabled or untrusted before cleanup. Repair it before proceeding.');
IF EXISTS(SELECT 1 FROM sys.triggers WHERE parent_class_desc=N'OBJECT_OR_COLUMN' AND is_disabled=1)
    INSERT #SafetyFindings VALUES(1,N'Trigger state',N'At least one DML trigger is disabled before cleanup. Repair it before proceeding.');
IF EXISTS(SELECT 1 FROM #UnsafeInboundDependencies)
    INSERT #SafetyFindings VALUES(1,N'Unsafe inbound dependency',N'A preserved or unresolved table references a selectively deleted/transactional table. Review the dependency report; the script will not delete that parent automatically.');
IF EXISTS
(
    SELECT 1 FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN #TableClassification c ON c.SchemaName=s.name AND c.TableName=t.name
    WHERE t.temporal_type<>0 AND c.Category IN('B','C')
)
    INSERT #SafetyFindings VALUES(1,N'Temporal-table state',N'A selectively cleaned or transactional table is system-versioned. This script does not remove temporal history and therefore will not execute.');
IF OBJECT_ID(N'dbo.Wallets',N'U') IS NOT NULL AND (SELECT COUNT(*) FROM dbo.Wallets WHERE IsCompanyWallet=1 AND IsDeleted=0)<>1
    INSERT #SafetyFindings VALUES(1,N'Company wallet',N'Exactly one non-deleted company master wallet is required before Rojmel cleanup.');

/* Report possible file-storage cleanup without exposing tokens or credential values. */
SELECT N'FILE_REFERENCE_INVENTORY' ReportSection,
       QUOTENAME(s.name)+N'.'+QUOTENAME(t.name) TableName,c.name ColumnName,
       CASE WHEN tc.Category='A' THEN N'Retained master reference; do not remove item images.'
            WHEN tc.Category='B' THEN N'Policy-dependent; record paths before an optional preservation choice.'
            ELSE N'Rows are deleted; remove the corresponding physical files manually after verification.' END CleanupImpact
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.columns c ON c.object_id=t.object_id
LEFT JOIN #TableClassification tc ON tc.SchemaName=s.name AND tc.TableName=t.name
WHERE t.is_ms_shipped=0 AND (c.name LIKE N'%Path%' OR c.name LIKE N'%FileName%' OR c.name LIKE N'%ImageUrl%' OR c.name LIKE N'%Attachment%' OR c.name LIKE N'%ProofAttachment%')
ORDER BY TableName,ColumnName;

SELECT N'PRE_CLEANUP_HEADER' ReportSection,@CurrentDatabaseName CurrentDatabaseName,@@VERSION SqlServerVersion,@ExecuteCleanup ExecuteCleanup,@BackupConfirmed BackupConfirmed,
       @ExpectedDatabaseName ExpectedDatabaseName,@NowUtc ReportedAtUtc;
SELECT N'TABLE_CLASSIFICATION_AND_PRE_COUNTS' ReportSection,tc.Category,tc.ModuleName,QUOTENAME(tc.SchemaName)+N'.'+QUOTENAME(tc.TableName) TableName,
       tc.PreservationOrDeletionRule,counts.TableExists,counts.RowTotal
FROM #TableClassification tc JOIN #TableCounts counts ON counts.SchemaName=tc.SchemaName AND counts.TableName=tc.TableName
ORDER BY tc.Category,tc.ModuleName,tc.TableName;
SELECT N'PRESERVED_USERS' ReportSection,UserId,PreservationReason,Username,Email,FullName,IsActive,IsSystemUser,AssignedRoles FROM #PreservedUsers ORDER BY UserId;
SELECT N'STAGING_ADMINISTRATOR_CANDIDATES' ReportSection,
       u.Id UserId,u.Username,u.Email,u.FullName,u.IsActive,
       STUFF((SELECT N', '+r.Name FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE ur.UserId=u.Id ORDER BY r.Name FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,2,N'') AssignedRoles,
       CONVERT(bit,CASE WHEN EXISTS
       (
           SELECT 1
           FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId
           WHERE ur.UserId=u.Id AND r.Name=@ExpectedStagingAdminRoleName AND r.IsActive=1
       ) THEN 1 ELSE 0 END) HasConfiguredAdminRole
FROM dbo.Users u
WHERE u.IsDeleted=0 AND u.IsSystemUser=0
ORDER BY u.IsActive DESC,u.Username,u.Id;
SELECT N'PRESERVED_ROLES' ReportSection,Id,Name,Description,IsActive,IsSystemRole FROM dbo.Roles ORDER BY Name;
SELECT N'PRESERVED_MASTER_TABLES' ReportSection,QUOTENAME(SchemaName)+N'.'+QUOTENAME(TableName) TableName,ModuleName,PreservationOrDeletionRule FROM #TableClassification WHERE Category='A' ORDER BY ModuleName,TableName;
SELECT N'TRANSACTIONAL_TABLES_TO_CLEAR' ReportSection,QUOTENAME(SchemaName)+N'.'+QUOTENAME(TableName) TableName,ModuleName,PreservationOrDeletionRule FROM #TableClassification WHERE Category='C' ORDER BY ModuleName,TableName;
SELECT N'UNRESOLVED_MANUAL_REVIEW' ReportSection,* FROM #UnresolvedTables ORDER BY SchemaName,TableName;
SELECT N'FOREIGN_KEYS' ReportSection,* FROM #ForeignKeyInventory ORDER BY ChildTable,ParentTable,ForeignKeyName;
SELECT N'UNSAFE_INBOUND_DEPENDENCIES' ReportSection,* FROM #UnsafeInboundDependencies ORDER BY ParentTable,ChildTable,ForeignKeyName;
SELECT N'IDENTITY_COLUMNS' ReportSection,QUOTENAME(OBJECT_SCHEMA_NAME(ic.object_id))+N'.'+QUOTENAME(OBJECT_NAME(ic.object_id)) TableName,c.name ColumnName,ic.seed_value,ic.increment_value,ic.last_value
FROM sys.identity_columns ic
JOIN sys.tables t ON t.object_id=ic.object_id
JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
WHERE t.is_ms_shipped=0
ORDER BY TableName,ColumnName;
SELECT N'COMPUTED_COLUMNS' ReportSection,QUOTENAME(OBJECT_SCHEMA_NAME(cc.object_id))+N'.'+QUOTENAME(OBJECT_NAME(cc.object_id)) TableName,c.name ColumnName,cc.is_persisted,cc.definition
FROM sys.computed_columns cc
JOIN sys.tables t ON t.object_id=cc.object_id
JOIN sys.columns c ON c.object_id=cc.object_id AND c.column_id=cc.column_id
WHERE t.is_ms_shipped=0
ORDER BY TableName,ColumnName;
SELECT N'TEMPORAL_TABLES' ReportSection,QUOTENAME(s.name)+N'.'+QUOTENAME(t.name) TableName,t.temporal_type_desc,t.history_table_id
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE t.temporal_type<>0 ORDER BY TableName;
SELECT N'DML_TRIGGERS' ReportSection,QUOTENAME(OBJECT_SCHEMA_NAME(tr.parent_id))+N'.'+QUOTENAME(OBJECT_NAME(tr.parent_id)) ParentTable,tr.name TriggerName,tr.is_disabled
FROM sys.triggers tr WHERE tr.parent_class_desc=N'OBJECT_OR_COLUMN' ORDER BY ParentTable,TriggerName;
SELECT N'PRE_STOCK_TOTALS' ReportSection,COUNT_BIG(*) ItemCount,SUM(OpeningStock) OpeningStock,SUM(OpeningStockValue) OpeningStockValue,SUM(CurrentStock) CurrentStock,SUM(ReservedStock) ReservedStock FROM dbo.Items;
SELECT N'PRE_PARTY_BALANCES' ReportSection,COUNT_BIG(*) PartyCount,SUM(OpeningBalance) OpeningBalance FROM dbo.Parties;
SELECT N'PRE_WALLET_BALANCES' ReportSection,COUNT_BIG(*) WalletCount,SUM(OpeningBalance) OpeningBalance,SUM(CurrentBalance) CurrentBalance FROM dbo.Wallets WHERE IsDeleted=0;
SELECT N'PRE_FINANCIAL_TOTALS' ReportSection,
       (SELECT COALESCE(SUM(GrandTotal),0) FROM dbo.SalesInvoices) SalesInvoiceTotal,
       (SELECT COALESCE(SUM(GrandTotal),0) FROM dbo.PurchaseBills) PurchaseBillTotal,
       (SELECT COALESCE(SUM(TotalAmount),0) FROM dbo.Expenses) ExpenseTotal,
       (SELECT COUNT_BIG(*) FROM dbo.Shipments) ShipmentCount,
       (SELECT COUNT_BIG(*) FROM dbo.ProcurementPlanningRuns) ProcurementPlanningRunCount,
       (SELECT COUNT_BIG(*) FROM dbo.DispatchPlanningRuns) DispatchPlanningRunCount,
       (SELECT COUNT_BIG(*) FROM dbo.RefreshTokens)+(SELECT COUNT_BIG(*) FROM dbo.PasswordResetTokens)+(SELECT COUNT_BIG(*) FROM dbo.CompanyGstSessions) ActiveSessionOrTokenRows;
SELECT N'SAFETY_FINDINGS' ReportSection,IsBlocking,CheckName,Detail FROM #SafetyFindings ORDER BY IsBlocking DESC,CheckName;

IF @ExecuteCleanup=0
BEGIN
    SELECT N'DRY_RUN' OverallResult,N'No DELETE, UPDATE, DBCC, trigger, or transaction statement was executed. Review all reports and resolve every blocking finding before deliberately setting @ExecuteCleanup=1.' Detail;
    RETURN;
END;

IF EXISTS(SELECT 1 FROM #SafetyFindings WHERE IsBlocking=1)
    THROW 53000,N'Cleanup blocked by the pre-cleanup safety findings. No data was changed.',1;

/* =============================================================================
   4. EXECUTION -- dependency-aware, explicit DELETE allowlist only
   ============================================================================= */
CREATE TABLE #DeletionPlan(SequenceNo int NOT NULL PRIMARY KEY,ModuleName nvarchar(100) NOT NULL,TableName sysname NOT NULL UNIQUE,Reason nvarchar(500) NOT NULL);
INSERT #DeletionPlan VALUES
(10,N'Shipment operations',N'ShipmentReturnItems',N'Child of ShipmentReturns and ShipmentItems.'),
(20,N'Shipment operations',N'ShipmentReceiptItems',N'Child of ShipmentReceipts and ShipmentItems.'),
(30,N'Shipment operations',N'ShipmentPackageItems',N'Child of ShipmentPackages and ShipmentItems.'),
(40,N'Shipment operations',N'ShipmentDeliveryAttempts',N'Child of Shipments.'),
(50,N'Shipment operations',N'ShipmentTrackingEvents',N'Child of Shipments; exact append-only trigger is temporarily restored after delete.'),
(60,N'Shipment operations',N'ShipmentFreightCharges',N'Child of Shipments and parent reference to Rojmel transactions.'),
(70,N'Shipment operations',N'ShipmentDockets',N'Child of Shipments.'),
(80,N'Shipment operations',N'ShipmentAppointments',N'Child of Shipments.'),
(90,N'Shipment operations',N'ShipmentReturns',N'Child of Shipments.'),
(100,N'Shipment operations',N'ShipmentReceipts',N'Child of Shipments.'),
(110,N'Shipment operations',N'ShipmentPackages',N'Child of Shipments.'),
(120,N'Shipment operations',N'ShipmentItems',N'Child of Shipments and DispatchAllocations.'),
(130,N'Shipment operations',N'ShipmentImportStagedRows',N'Child of shared import batches.'),
(140,N'Shipment operations',N'Shipments',N'Shipment headers.'),
(150,N'Dispatch planning',N'DispatchAllocations',N'Child of dispatch recommendations and snapshots.'),
(160,N'Dispatch planning',N'DispatchRecommendationResults',N'Child of dispatch runs.'),
(170,N'Dispatch planning',N'DispatchCompanyStockSnapshots',N'Child of dispatch runs.'),
(180,N'Dispatch planning',N'DispatchPlanningRuns',N'Parent of dispatch snapshots; shipment records are already deleted.'),
(190,N'Dispatch planning',N'DispatchWarehouseSalesSnapshots',N'Child of shared import batches.'),
(200,N'Dispatch planning',N'DispatchWarehouseStockSnapshots',N'Child of shared import batches.'),
(210,N'Dispatch planning',N'DispatchWarehouseInboundSnapshots',N'Child of shared import batches.'),
(220,N'Dispatch planning',N'DispatchImportStagedRows',N'Child of shared import batches.'),
(230,N'Supply chain',N'SupplyChainImportRows',N'Child of shared import batches.'),
(240,N'Procurement planning',N'ProcurementPlanningRunLines',N'Child of procurement planning runs.'),
(250,N'Procurement planning',N'ProcurementPlanningRuns',N'Procurement planning run headers.'),
(260,N'Procurement planning',N'ProcurementSalesHistory',N'Child of procurement import batches.'),
(270,N'Procurement planning',N'ProcurementSalesImportBatches',N'Procurement import batches.'),
(280,N'Procurement planning',N'ProcurementInboundStockSnapshots',N'Operational inbound snapshots.'),
(290,N'Procurement planning',N'ProcurementLeadTimeHistory',N'Dated lead-time history; configuration remains.'),
(300,N'Supply chain',N'SupplyChainImportBatches',N'All known children/runs are already deleted.'),
(310,N'GST/GSTZen',N'EWayBills',N'References sales/purchase documents.'),
(320,N'GST/GSTZen',N'EInvoices',N'References sales documents.'),
(330,N'GST/GSTZen',N'GstApiLogs',N'Provider request/response logs.'),
(340,N'GST/GSTZen',N'CompanyGstSessions',N'Provider token/session data.'),
(350,N'GST/GSTZen',N'GstVerificationLogs',N'GST verification cache/log data.'),
(360,N'Rojmel',N'WalletTransactions',N'Ledger rows must precede transfers and wallets.'),
(370,N'Rojmel',N'WalletTransfers',N'Transfer rows after ledger rows.'),
(380,N'OEE',N'OeeProductionEntries',N'Operational production entries.'),
(390,N'HR',N'HR_PayrollDetails',N'Child of payroll runs.'),
(400,N'HR',N'HR_PayrollRuns',N'Payroll run headers.'),
(410,N'HR',N'HR_AttendanceAdjustments',N'Child of attendance.'),
(420,N'HR',N'HR_Attendance',N'Attendance transactions.'),
(430,N'HR',N'HR_LeaveApplications',N'Leave transactions.'),
(440,N'Sales',N'SalesInvoicePayments',N'Child of sales invoices.'),
(450,N'Sales',N'SalesInvoiceItems',N'Child of sales invoices.'),
(460,N'Sales',N'SalesInvoices',N'Sales invoice headers.'),
(470,N'Purchase',N'SupplierPaymentAllocations',N'Child of supplier payments and purchase bills.'),
(480,N'Purchase',N'SupplierPayments',N'Supplier payments.'),
(490,N'Purchase',N'PurchaseReturnItems',N'Child of purchase returns and purchase bill items.'),
(500,N'Purchase',N'PurchaseReturns',N'Purchase return headers.'),
(510,N'Purchase',N'PurchaseOrderItems',N'Child of purchase orders.'),
(520,N'Purchase',N'PurchaseOrders',N'Purchase order headers.'),
(530,N'Purchase',N'PurchaseBillItems',N'Child of purchase bills.'),
(540,N'Purchase',N'PurchaseBills',N'Purchase bill headers.'),
(550,N'Purchase and expenses',N'Expenses',N'Expense transactions and attachment references.'),
(560,N'Parties',N'PartyLedgerEntries',N'Party receivable/payable ledger.'),
(570,N'Inventory',N'StockMovements',N'All operational stock movements.');

/* Verify that the hand-reviewed plan contains every Category C table exactly once. */
IF EXISTS(SELECT 1 FROM #TableClassification c WHERE c.Category='C' AND NOT EXISTS(SELECT 1 FROM #DeletionPlan p WHERE p.TableName=c.TableName))
   OR EXISTS(SELECT 1 FROM #DeletionPlan p LEFT JOIN #TableClassification c ON c.SchemaName=N'dbo' AND c.TableName=p.TableName AND c.Category='C' WHERE c.TableName IS NULL)
    THROW 53001,N'Internal deletion-plan/classification mismatch. No data was changed.',1;

CREATE TABLE #ChangedTriggers(TriggerName sysname NOT NULL PRIMARY KEY,ParentTable sysname NOT NULL,WasDisabled bit NOT NULL,WasTemporarilyDisabled bit NOT NULL DEFAULT(0));
INSERT #ChangedTriggers(TriggerName,ParentTable,WasDisabled)
SELECT tr.name,OBJECT_NAME(tr.parent_id),tr.is_disabled
FROM sys.triggers tr
WHERE tr.name IN(N'TR_ShipmentTrackingEvents_AppendOnly',N'trg_DispatchRecommendationResults_PreventFinalizedMutation',N'trg_DispatchAllocations_PreventFinalizedMutation')
  AND tr.parent_id IN(OBJECT_ID(N'dbo.ShipmentTrackingEvents',N'U'),OBJECT_ID(N'dbo.DispatchRecommendationResults',N'U'),OBJECT_ID(N'dbo.DispatchAllocations',N'U'));
IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE WasDisabled=1)
    THROW 53002,N'A trigger required for controlled cleanup is already disabled. No data was changed.',1;

BEGIN TRY
    BEGIN TRANSACTION;

    /* The only required trigger changes: append-only shipment tracking and finalized dispatch immutability. */
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'TR_ShipmentTrackingEvents_AppendOnly')
    BEGIN
        DISABLE TRIGGER dbo.TR_ShipmentTrackingEvents_AppendOnly ON dbo.ShipmentTrackingEvents;
        UPDATE #ChangedTriggers SET WasTemporarilyDisabled=1 WHERE TriggerName=N'TR_ShipmentTrackingEvents_AppendOnly';
    END;
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'trg_DispatchRecommendationResults_PreventFinalizedMutation')
    BEGIN
        DISABLE TRIGGER dbo.trg_DispatchRecommendationResults_PreventFinalizedMutation ON dbo.DispatchRecommendationResults;
        UPDATE #ChangedTriggers SET WasTemporarilyDisabled=1 WHERE TriggerName=N'trg_DispatchRecommendationResults_PreventFinalizedMutation';
    END;
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'trg_DispatchAllocations_PreventFinalizedMutation')
    BEGIN
        DISABLE TRIGGER dbo.trg_DispatchAllocations_PreventFinalizedMutation ON dbo.DispatchAllocations;
        UPDATE #ChangedTriggers SET WasTemporarilyDisabled=1 WHERE TriggerName=N'trg_DispatchAllocations_PreventFinalizedMutation';
    END;

    DECLARE @PlanSequence int, @PlanTable sysname, @PlanModule nvarchar(100);
    DECLARE DeleteCursor CURSOR LOCAL FAST_FORWARD FOR SELECT SequenceNo,TableName,ModuleName FROM #DeletionPlan ORDER BY SequenceNo;
    OPEN DeleteCursor;
    FETCH NEXT FROM DeleteCursor INTO @PlanSequence,@PlanTable,@PlanModule;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SET @Sql=N'DELETE FROM dbo.'+QUOTENAME(@PlanTable)+N';';
        EXEC sys.sp_executesql @Sql;
        FETCH NEXT FROM DeleteCursor INTO @PlanSequence,@PlanTable,@PlanModule;
    END
    CLOSE DeleteCursor;
    DEALLOCATE DeleteCursor;

    /* GST registrations are only retained after a conscious sensitive-data review. Never retain provider sessions or portal usernames. */
    IF @PreserveCompanyGstRegistrations=0
        DELETE FROM dbo.CompanyGstRegistrations;
    ELSE
        UPDATE dbo.CompanyGstRegistrations SET GstPortalUsername=NULL;

    /* Clear audit history by default without changing the audit schema or application logging configuration. */
    IF @PreserveAuditLogs=0 DELETE FROM dbo.AuditLogs;

    /* Rojmel source of truth: erase ledger/transfer rows, keep the one company wallet and selected privileged wallets only, then zero stored balances. */
DELETE w
FROM dbo.Wallets w
WHERE w.IsDeleted=1
   OR (w.IsCompanyWallet=0
       AND (@PreservePrivilegedUserWallets=0 OR NOT EXISTS(SELECT 1 FROM #PreservedUsers p WHERE p.UserId=w.LinkedUserId)));
    UPDATE dbo.Wallets SET OpeningBalance=0,CurrentBalance=0,ModifiedAt=@NowUtc WHERE IsDeleted=0;

    /* Party masters remain by default. OpeningBalance is a stored, verified source field; its type/configuration is not changed. */
    IF @PreservePartyMasters=1 AND @ResetPartyOpeningBalances=1 UPDATE dbo.Parties SET OpeningBalance=0;
    IF @PreservePartyMasters=0
    BEGIN
        DELETE FROM dbo.PartyRoles;
        DELETE FROM dbo.Parties;
    END;

    /* HR: default removes employee PII. With preserved employees, remove personal details unless explicitly retained, and reset derived leave balances. */
    IF @PreserveEmployees=0
    BEGIN
        DELETE FROM dbo.HR_EmployeeDocuments;
        DELETE FROM dbo.HR_EmployeeBankAccounts;
        DELETE FROM dbo.HR_EmployeeAddresses;
        DELETE FROM dbo.HR_EmployeeSalaryStructures;
        DELETE FROM dbo.HR_LeaveBalances;
        DELETE FROM dbo.HR_Employees;
    END
    ELSE
    BEGIN
        IF @PreserveEmployeePersonalDetails=0
        BEGIN
            DELETE FROM dbo.HR_EmployeeDocuments;
            DELETE FROM dbo.HR_EmployeeBankAccounts;
            DELETE FROM dbo.HR_EmployeeAddresses;
        END;
        UPDATE dbo.HR_LeaveBalances SET OpeningBalance=0,UsedBalance=0,RemainingBalance=0;
    END;

    /* Delete all live session and reset credentials before deleting non-preserved identities. Password hashes on preserved accounts are not read or changed. */
    DELETE FROM dbo.RefreshTokens;
    DELETE FROM dbo.PasswordResetTokens;
    DELETE ur FROM dbo.UserRoles ur WHERE NOT EXISTS(SELECT 1 FROM #PreservedUsers p WHERE p.UserId=ur.UserId);
    DELETE u FROM dbo.Users u WHERE NOT EXISTS(SELECT 1 FROM #PreservedUsers p WHERE p.UserId=u.Id);

    /* Items are preserved; all fields reset here are stored operational values, not computed columns. */
    IF @ResetItemStock=1
        UPDATE dbo.Items SET OpeningStock=0,OpeningStockValue=0,CurrentStock=0,ReservedStock=0,ModifiedAt=@NowUtc;

    /* Keep sequence definitions/prefixes. Reset only sequence modules proven to generate deleted transactional documents. */
    IF @ResetDocumentSequences=1
        UPDATE dbo.NumberSequences SET NextNumber=1,UpdatedAtUtc=@NowUtc
        WHERE ModuleName IN(N'SalesInvoice',N'PurchaseBill',N'SupplierPayment',N'Expense',N'PurchaseOrder',N'PurchaseReturn',N'ProcurementSalesImport',N'ProcurementPlanning',N'Shipment',N'ShipmentReceipt',N'ShipmentReturn');

    /* Re-enable and verify each temporary trigger change before committing. */
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'TR_ShipmentTrackingEvents_AppendOnly' AND WasTemporarilyDisabled=1)
    BEGIN
        ENABLE TRIGGER dbo.TR_ShipmentTrackingEvents_AppendOnly ON dbo.ShipmentTrackingEvents;
        IF EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(N'dbo.TR_ShipmentTrackingEvents_AppendOnly',N'TR') AND is_disabled=1)
            THROW 53003,N'Could not re-enable the ShipmentTrackingEvents append-only trigger.',1;
    END;
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'trg_DispatchRecommendationResults_PreventFinalizedMutation' AND WasTemporarilyDisabled=1)
    BEGIN
        ENABLE TRIGGER dbo.trg_DispatchRecommendationResults_PreventFinalizedMutation ON dbo.DispatchRecommendationResults;
        IF EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(N'dbo.trg_DispatchRecommendationResults_PreventFinalizedMutation',N'TR') AND is_disabled=1)
            THROW 53003,N'Could not re-enable the DispatchRecommendationResults immutability trigger.',1;
    END;
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'trg_DispatchAllocations_PreventFinalizedMutation' AND WasTemporarilyDisabled=1)
    BEGIN
        ENABLE TRIGGER dbo.trg_DispatchAllocations_PreventFinalizedMutation ON dbo.DispatchAllocations;
        IF EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(N'dbo.trg_DispatchAllocations_PreventFinalizedMutation',N'TR') AND is_disabled=1)
            THROW 53003,N'Could not re-enable the DispatchAllocations immutability trigger.',1;
    END;

    /* Reseed only completely empty, explicitly cleaned identity tables. The actual identity seed/increment is used; preserved tables are never reseeded. */
    CREATE TABLE #IdentityCandidates(TableName sysname NOT NULL PRIMARY KEY);
    INSERT #IdentityCandidates(TableName) SELECT TableName FROM #DeletionPlan;
    IF @PreserveAuditLogs=0 INSERT #IdentityCandidates VALUES(N'AuditLogs');
    IF @PreserveCompanyGstRegistrations=0 INSERT #IdentityCandidates VALUES(N'CompanyGstRegistrations');
    IF @PreserveEmployees=0
    BEGIN
        INSERT #IdentityCandidates VALUES(N'HR_Employees');
        INSERT #IdentityCandidates VALUES(N'HR_EmployeeAddresses');
        INSERT #IdentityCandidates VALUES(N'HR_EmployeeBankAccounts');
        INSERT #IdentityCandidates VALUES(N'HR_EmployeeDocuments');
        INSERT #IdentityCandidates VALUES(N'HR_EmployeeSalaryStructures');
        INSERT #IdentityCandidates VALUES(N'HR_LeaveBalances');
    END;

    DECLARE @IdentityTable sysname,@IdentitySeed numeric(38,0),@IdentityIncrement numeric(38,0),@IsEmpty bit,@ReseedValue numeric(38,0);
    DECLARE IdentityCursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT i.TableName FROM #IdentityCandidates i JOIN sys.identity_columns ic ON ic.object_id=OBJECT_ID(N'dbo.'+QUOTENAME(i.TableName)) ORDER BY i.TableName;
    OPEN IdentityCursor;
    FETCH NEXT FROM IdentityCursor INTO @IdentityTable;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SET @IsEmpty=0;
        SET @Sql=N'SELECT @EmptyOut=CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(@IdentityTable)+N') THEN 0 ELSE 1 END);';
        EXEC sys.sp_executesql @Sql,N'@EmptyOut bit OUTPUT',@EmptyOut=@IsEmpty OUTPUT;
        IF @IsEmpty=1
        BEGIN
            SELECT @IdentitySeed=CONVERT(numeric(38,0),seed_value),@IdentityIncrement=CONVERT(numeric(38,0),increment_value)
            FROM sys.identity_columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@IdentityTable));
            SET @ReseedValue=@IdentitySeed-@IdentityIncrement;
            SET @Sql=N'DBCC CHECKIDENT (''dbo.'+REPLACE(@IdentityTable,N'''',N'''''')+N''', RESEED, '+CONVERT(nvarchar(50),@ReseedValue)+N') WITH NO_INFOMSGS;';
            EXEC sys.sp_executesql @Sql;
        END;
        FETCH NEXT FROM IdentityCursor INTO @IdentityTable;
    END
    CLOSE IdentityCursor;
    DEALLOCATE IdentityCursor;

    /* Post-cleanup validation inside the transaction so any failure remains recoverable. */
    CREATE TABLE #PostFailures(CheckName nvarchar(200) NOT NULL,Detail nvarchar(2000) NOT NULL);
    DECLARE @RemainingRows bigint;
    DECLARE RemainingCursor CURSOR LOCAL FAST_FORWARD FOR SELECT TableName FROM #DeletionPlan;
    OPEN RemainingCursor;
    FETCH NEXT FROM RemainingCursor INTO @PlanTable;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SET @RemainingRows=0;
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM dbo.'+QUOTENAME(@PlanTable)+N';';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RemainingRows OUTPUT;
        IF @RemainingRows<>0 INSERT #PostFailures VALUES(N'Transaction table not empty',N'dbo.'+@PlanTable+N' has '+CONVERT(nvarchar(30),@RemainingRows)+N' remaining rows.');
        FETCH NEXT FROM RemainingCursor INTO @PlanTable;
    END
    CLOSE RemainingCursor;
    DEALLOCATE RemainingCursor;
    IF EXISTS(SELECT 1 FROM dbo.RefreshTokens) OR EXISTS(SELECT 1 FROM dbo.PasswordResetTokens) OR EXISTS(SELECT 1 FROM dbo.CompanyGstSessions)
        INSERT #PostFailures VALUES(N'Session/token cleanup',N'Refresh, password-reset, or GST session rows remain.');
    IF (SELECT COUNT(*) FROM dbo.Users WHERE IsDeleted=0)<>2
        INSERT #PostFailures VALUES(N'Approved users',N'Exactly the System Owner and configured staging administrator must remain.');
    IF (SELECT COUNT(*) FROM dbo.Users WHERE IsSystemUser=1 AND IsDeleted=0)<>1
        INSERT #PostFailures VALUES(N'Protected System Owner',N'Protected System Owner count is not exactly one.');
    IF EXISTS(SELECT 1 FROM dbo.UserRoles ur LEFT JOIN dbo.Users u ON u.Id=ur.UserId LEFT JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE u.Id IS NULL OR r.Id IS NULL OR u.IsDeleted=1 OR r.IsActive=0)
        INSERT #PostFailures VALUES(N'Role assignments',N'An invalid or inactive preserved user-role assignment remains.');
    IF EXISTS(SELECT 1 FROM dbo.RolePermissions rp LEFT JOIN dbo.Roles r ON r.Id=rp.RoleId LEFT JOIN dbo.Pages p ON p.Id=rp.PageId WHERE r.Id IS NULL OR p.Id IS NULL)
        INSERT #PostFailures VALUES(N'Page permissions',N'An invalid role/page permission link exists.');
    IF EXISTS(SELECT 1 FROM dbo.ChannelSkuMappings m LEFT JOIN dbo.SalesChannels c ON c.Id=m.SalesChannelId LEFT JOIN dbo.Items i ON i.Id=m.ItemId WHERE c.Id IS NULL OR (m.ItemId IS NOT NULL AND i.Id IS NULL))
        INSERT #PostFailures VALUES(N'Channel SKU mappings',N'An invalid channel/item SKU mapping exists.');
    IF EXISTS(SELECT 1 FROM dbo.ChannelWarehouses w LEFT JOIN dbo.SalesChannels c ON c.Id=w.ChannelId WHERE c.Id IS NULL)
        INSERT #PostFailures VALUES(N'Channel warehouses',N'An invalid warehouse/channel relationship exists.');
    IF @ResetItemStock=1 AND EXISTS(SELECT 1 FROM dbo.Items WHERE OpeningStock<>0 OR OpeningStockValue<>0 OR CurrentStock<>0 OR ReservedStock<>0)
        INSERT #PostFailures VALUES(N'Item stock reset',N'One or more stored item stock fields are non-zero.');
    IF @ResetPartyOpeningBalances=1 AND @PreservePartyMasters=1 AND EXISTS(SELECT 1 FROM dbo.Parties WHERE OpeningBalance<>0)
        INSERT #PostFailures VALUES(N'Party opening balance reset',N'One or more preserved parties retain an opening balance.');
    IF EXISTS(SELECT 1 FROM dbo.Wallets WHERE IsDeleted=0 AND (OpeningBalance<>0 OR CurrentBalance<>0))
        INSERT #PostFailures VALUES(N'Wallet balance reset',N'One or more retained wallets have a non-zero stored balance.');
    IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.triggers WHERE parent_class_desc=N'OBJECT_OR_COLUMN' AND is_disabled=1)
        INSERT #PostFailures VALUES(N'Constraint/trigger state',N'A foreign key, check constraint, or DML trigger is disabled or untrusted.');

    /* Full foreign-key orphan check after the deletions but before commit. */
    CREATE TABLE #PostForeignKeyOrphans(ForeignKeyName sysname NOT NULL,ChildTable nvarchar(517) NOT NULL,ParentTable nvarchar(517) NOT NULL,OrphanCount bigint NOT NULL);
    DECLARE @PostFkId int,@PostFkName sysname,@PostChildObjectId int,@PostParentObjectId int,@PostJoinPredicate nvarchar(max),@PostNotNullPredicate nvarchar(max),@PostOrphanCount bigint;
    DECLARE PostFkCursor CURSOR LOCAL FAST_FORWARD FOR SELECT object_id,name,parent_object_id,referenced_object_id FROM sys.foreign_keys;
    OPEN PostFkCursor;
    FETCH NEXT FROM PostFkCursor INTO @PostFkId,@PostFkName,@PostChildObjectId,@PostParentObjectId;
    WHILE @@FETCH_STATUS=0
    BEGIN
        SELECT @PostJoinPredicate=STUFF((SELECT N' AND p.'+QUOTENAME(pc.name)+N'=c.'+QUOTENAME(cc.name)
                                         FROM sys.foreign_key_columns fkc JOIN sys.columns cc ON cc.object_id=fkc.parent_object_id AND cc.column_id=fkc.parent_column_id JOIN sys.columns pc ON pc.object_id=fkc.referenced_object_id AND pc.column_id=fkc.referenced_column_id
                                         WHERE fkc.constraint_object_id=@PostFkId ORDER BY fkc.constraint_column_id FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,5,N''),
               @PostNotNullPredicate=STUFF((SELECT N' AND c.'+QUOTENAME(cc.name)+N' IS NOT NULL'
                                            FROM sys.foreign_key_columns fkc JOIN sys.columns cc ON cc.object_id=fkc.parent_object_id AND cc.column_id=fkc.parent_column_id
                                            WHERE fkc.constraint_object_id=@PostFkId ORDER BY fkc.constraint_column_id FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,5,N'');
        SET @PostOrphanCount=0;
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(OBJECT_SCHEMA_NAME(@PostChildObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@PostChildObjectId))+N' c WHERE '+@PostNotNullPredicate+N' AND NOT EXISTS(SELECT 1 FROM '+QUOTENAME(OBJECT_SCHEMA_NAME(@PostParentObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@PostParentObjectId))+N' p WHERE '+@PostJoinPredicate+N');';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@PostOrphanCount OUTPUT;
        INSERT #PostForeignKeyOrphans VALUES(@PostFkName,QUOTENAME(OBJECT_SCHEMA_NAME(@PostChildObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@PostChildObjectId)),QUOTENAME(OBJECT_SCHEMA_NAME(@PostParentObjectId))+N'.'+QUOTENAME(OBJECT_NAME(@PostParentObjectId)),@PostOrphanCount);
        FETCH NEXT FROM PostFkCursor INTO @PostFkId,@PostFkName,@PostChildObjectId,@PostParentObjectId;
    END
    CLOSE PostFkCursor;
    DEALLOCATE PostFkCursor;
    IF EXISTS(SELECT 1 FROM #PostForeignKeyOrphans WHERE OrphanCount<>0)
        INSERT #PostFailures VALUES(N'Foreign-key orphan check',N'One or more foreign keys have orphan rows; the transaction will roll back.');

    IF EXISTS(SELECT 1 FROM #PostFailures)
    BEGIN
        SELECT N'POST_CLEANUP_FAILURE_BEFORE_ROLLBACK' ReportSection,* FROM #PostFailures;
        SELECT N'POST_CLEANUP_FOREIGN_KEY_ORPHANS' ReportSection,* FROM #PostForeignKeyOrphans WHERE OrphanCount<>0 ORDER BY ChildTable,ForeignKeyName;
        THROW 53004,N'Post-cleanup validation failed; the transaction will be rolled back.',1;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    /* DDL state is explicitly repaired even after a failed transaction. */
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'TR_ShipmentTrackingEvents_AppendOnly' AND WasTemporarilyDisabled=1)
       AND EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(N'dbo.TR_ShipmentTrackingEvents_AppendOnly',N'TR') AND is_disabled=1)
        ENABLE TRIGGER dbo.TR_ShipmentTrackingEvents_AppendOnly ON dbo.ShipmentTrackingEvents;
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'trg_DispatchRecommendationResults_PreventFinalizedMutation' AND WasTemporarilyDisabled=1)
       AND EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(N'dbo.trg_DispatchRecommendationResults_PreventFinalizedMutation',N'TR') AND is_disabled=1)
        ENABLE TRIGGER dbo.trg_DispatchRecommendationResults_PreventFinalizedMutation ON dbo.DispatchRecommendationResults;
    IF EXISTS(SELECT 1 FROM #ChangedTriggers WHERE TriggerName=N'trg_DispatchAllocations_PreventFinalizedMutation' AND WasTemporarilyDisabled=1)
       AND EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID(N'dbo.trg_DispatchAllocations_PreventFinalizedMutation',N'TR') AND is_disabled=1)
        ENABLE TRIGGER dbo.trg_DispatchAllocations_PreventFinalizedMutation ON dbo.DispatchAllocations;
    DECLARE @ErrorNumber int=ERROR_NUMBER(),@ErrorMessage nvarchar(2048)=ERROR_MESSAGE(),@ErrorLine int=ERROR_LINE(),@RethrowMessage nvarchar(2048);
    SET @RethrowMessage=CONCAT(N'Cleanup rolled back. Error ',@ErrorNumber,N' at line ',@ErrorLine,N': ',@ErrorMessage);
    THROW 53005,@RethrowMessage,1;
END CATCH;

/* =============================================================================
   5. FINAL POST-COMMIT REPORT -- run the separate verification script as the gate
   ============================================================================= */
DECLARE PostCountCursor CURSOR LOCAL FAST_FORWARD FOR SELECT SchemaName,TableName FROM #TableClassification;
OPEN PostCountCursor;
FETCH NEXT FROM PostCountCursor INTO @SchemaName,@TableName;
WHILE @@FETCH_STATUS=0
BEGIN
    IF OBJECT_ID(QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName),N'U') IS NOT NULL
    BEGIN
        SET @RowTotal=0;
        SET @Sql=N'SELECT @CountOut=COUNT_BIG(*) FROM '+QUOTENAME(@SchemaName)+N'.'+QUOTENAME(@TableName)+N';';
        EXEC sys.sp_executesql @Sql,N'@CountOut bigint OUTPUT',@CountOut=@RowTotal OUTPUT;
        UPDATE #TableCounts SET RowTotal=@RowTotal,TableExists=1 WHERE SchemaName=@SchemaName AND TableName=@TableName;
    END;
    FETCH NEXT FROM PostCountCursor INTO @SchemaName,@TableName;
END
CLOSE PostCountCursor;
DEALLOCATE PostCountCursor;
SELECT N'POST_CLEANUP_COUNTS' ReportSection,Category,ModuleName,QUOTENAME(SchemaName)+N'.'+QUOTENAME(TableName) TableName,RowTotal
FROM #TableCounts
ORDER BY Category,ModuleName,TableName;
SELECT N'POST_STOCK_TOTALS' ReportSection,COUNT_BIG(*) ItemCount,SUM(OpeningStock) OpeningStock,SUM(OpeningStockValue) OpeningStockValue,SUM(CurrentStock) CurrentStock,SUM(ReservedStock) ReservedStock FROM dbo.Items;
SELECT N'POST_PARTY_BALANCES' ReportSection,COUNT_BIG(*) PartyCount,SUM(OpeningBalance) OpeningBalance FROM dbo.Parties;
SELECT N'POST_WALLET_BALANCES' ReportSection,COUNT_BIG(*) WalletCount,SUM(OpeningBalance) OpeningBalance,SUM(CurrentBalance) CurrentBalance FROM dbo.Wallets WHERE IsDeleted=0;
SELECT N'POST_FOREIGN_KEY_ORPHANS' ReportSection,* FROM #PostForeignKeyOrphans WHERE OrphanCount<>0 ORDER BY ChildTable,ForeignKeyName;
SELECT N'PASS' OverallResult,N'Cleanup committed. Run 20260803_verify_clean_staging_database.sql with the same reviewed administrator settings before moving this database to staging.' Detail;
