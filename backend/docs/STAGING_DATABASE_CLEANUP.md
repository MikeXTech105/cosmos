# COSMOS staging database cleanup

`backend/database/staging/20260803_prepare_clean_staging_database.sql` prepares a reviewed copy of the current COSMOS SQL Server database for staging. It removes business/operational data without dropping or rebuilding the database. It preserves the schema, views, procedures, functions, indexes, constraints, triggers, pages, permissions, roles, seed/configuration data, and selected master records.

> Never run this script against production without a verified backup, exact database-name validation, reviewed table classification and formal approval.

The script was authored from the canonical setup, all migrations through `20260729_shipment_operations_module.sql`, all database verification/smoke-test scripts, the System Owner migration/documentation, module documentation, and the Dapper repository SQL usage. The repository schema contains stored computed columns (including HR activity and shipment/dispatch calculations), audit tables, and the documented append-only/finalization triggers; it contains no temporal/system-versioned table definition. The dry run still reports computed, identity, temporal, trigger, and foreign-key metadata and blocks execution if a selective/transactional table is temporal. It is not a substitute for reviewing database extensions that are not in this repository.

## Assets

- `backend/database/staging/20260803_prepare_clean_staging_database.sql` — guarded cleanup and dry-run report.
- `backend/database/staging/20260803_verify_clean_staging_database.sql` — separate, read-only post-cleanup PASS/FAIL/WARNING gate.

`20260803_purge_demo_item_catalog.sql` is also available as a separately guarded, opt-in removal of demo item/catalog masters.

None of the scripts has a `USE` statement. Open a new SSMS query connected to the intended verified copy, then run the file. This makes the target connection visible rather than hiding it in the script.

## Safety model

The cleanup script starts with `@ExecuteCleanup = 0`. In this mode it performs no `DELETE`, `UPDATE`, `DBCC`, trigger change, or transaction. It reports the current database and SQL Server version, classifications, row counts, protected users/roles, master tables, stock and balance totals, financial/shipment/planning counts, session/token rows, foreign keys, file-reference columns, unresolved tables, and every blocking finding.

Execution requires all of the following:

- `@ExecuteCleanup = 1`
- an exact non-placeholder `@ExpectedDatabaseName` equal to `DB_NAME()`
- `@BackupConfirmed = 1`
- a database name that does not look like production (`Prod`, `Production`, `Live`, or `Main`)
- one active non-deleted `Users.IsSystemUser = 1` account, with one active `Roles.IsSystemRole = 1` role assignment
- one separately configured, active staging administrator identified by exact username or email and assigned to the configured exact `Admin`/`SuperAdmin` role
- all current repository tables present, no disabled/untrusted foreign key or check constraint, and no disabled DML trigger
- no populated unclassified user table unless it has a deliberate preserve-only entry in `#ApprovedUnresolvedTables`
- exactly one non-deleted company wallet before the Rojmel cleanup
- an explicit GST data review if company GST registrations are to remain.

The database-name setting must be changed from the placeholder; no example database name is considered safe. The `@AllowProductionLikeDatabaseName` setting is deliberately not a bypass.

The destructive part uses `SET XACT_ABORT ON`, `TRY/CATCH`, one explicit transaction, rollback on any error, and in-transaction post-cleanup assertions. No constraints are disabled. The only temporary object-state changes are the known append-only `dbo.TR_ShipmentTrackingEvents_AppendOnly` trigger and the two finalization-immutability triggers on `DispatchRecommendationResults` and `DispatchAllocations`. Their original enabled states are recorded; they are disabled only to remove otherwise immutable historical rows, then re-enabled and checked before commit. Any error triggers rollback and an additional trigger-state repair attempt.

## Required backup and execution process

1. Restore/clone a full backup into a clearly named isolated database. Stop the COSMOS application and all integration jobs against that copy.
2. Take and verify a fresh full backup of that isolated copy. Verify both the backup completion and that it can be restored.
3. In the cleanup script, set the exact copied database name, the exact existing staging administrator username or email, and the exact required role name. The dry-run `STAGING_ADMINISTRATOR_CANDIDATES` report lists the active non-System-Owner accounts and their active roles to support that choice; select one deliberately and do not use a username heuristic such as `admin`.
4. Keep `@ExecuteCleanup = 0` and run the script. Review every `SAFETY_FINDINGS`, `UNRESOLVED_MANUAL_REVIEW`, protected-user, classification, foreign-key, file-reference, sequence, stock, wallet, and financial report.
5. Resolve every blocking finding. If an extension table is populated, classify it from its schema, foreign keys, procedures, repository use, and data owner decision. It is never deleted merely because it is unknown.
6. Review the policy switches below with the data owner. Set `@BackupConfirmed = 1`, then set `@ExecuteCleanup = 1` only in the reviewed copy.
7. Run the cleanup script once. A failure rolls back; do not make manual partial deletes to “finish” it.
8. Run `20260803_verify_clean_staging_database.sql` against the same database with the same database and administrator values and matching policy switches (including the employee, stock, party-balance, wallet, GST, audit, and document-sequence policy values). A `FAIL` blocks staging use. A `WARNING` requires a documented decision and comparison with the cleanup pre-count report.
9. Apply staging-only application configuration, restore/move the verified database as needed, and test login, permissions, item masters, and a small non-production workflow.

The cleanup and verification scripts are rerunnable in the same SSMS session, including after a dry run or a failed execution: each first drops only its own session-scoped work tables, then all cleaned tables remain empty, balances remain at the selected clean values, and document sequences remain at their starting next number. If cleanup encounters an unknown populated table, constraint issue, or account inconsistency it stops rather than guessing.

## Operator policy switches

| Setting | Default | Effect |
|---|---:|---|
| `@ResetItemStock` | `1` | Sets stored `Items.OpeningStock`, `OpeningStockValue`, `CurrentStock`, and `ReservedStock` to zero after deleting `StockMovements`. `MinimumStock` is configuration and remains. |
| `@ResetPartyOpeningBalances` | `1` | Preserved Party masters remain, but their verified stored `OpeningBalance` becomes zero. It does not alter GSTIN, contact, address, credit limit, credit period, or opening-balance type configuration. |
| `@PreserveEmployees` | `0` | Deletes employee records and all dependent address, bank, document, salary-assignment, and leave-balance rows after HR transactions are removed. |
| `@PreserveEmployeePersonalDetails` | `0` | If employees are preserved, this must still be set to `1` to retain addresses, bank accounts, and document references. By default those personal details are deleted. |
| `@PreservePartyMasters` | `1` | Retains all party masters and transporter role mappings. Set to `0` only if a reviewed staging policy permits removing all parties. |
| `@PreserveCompanyGstRegistrations` | `0` | Removes registration data by default. Setting it to `1` additionally requires `@CompanyGstRegistrationReviewed = 1`; portal usernames are cleared in either retained registration. Sessions, tokens, logs, e-way bills, and e-invoices are always removed. |
| `@PreservePrivilegedUserWallets` | `0` | Keeps the company wallet only by default. When set to `1`, wallets linked to the two preserved accounts remain too. Every retained wallet has opening/current balance reset to zero; all ledger/transfer history is deleted. |
| `@PreserveAuditLogs` | `0` | Deletes audit-log rows for a clean staging copy, while keeping the audit table and application logging configuration. |
| `@ResetDocumentSequences` | `1` | Resets only known transaction number definitions to next number `1` while keeping prefixes/padding. |

No preserved password hash is selected, printed, or changed. All `RefreshTokens`, `PasswordResetTokens`, and `CompanyGstSessions` are deleted so the retained users must log in again. The current repository has no separate OTP, device-session, API-session-cache, or password-reset table beyond these tables; new tables are fail-closed as unresolved.

## Optional demo item-catalog purge

The primary cleanup preserves the item catalog as master data. If the catalog itself is confirmed demo data, run `20260803_purge_demo_item_catalog.sql` only after the primary cleanup verification has passed. It is a separate dry-run-first operation with its own exact database-name and backup acknowledgement guards.

It removes only the explicit catalog scope: item dispatch settings, packaging profiles, channel SKU mappings, channel warehouses, BOM components, item procurement settings, items, categories, units, and sales channels. Before deleting anything, it blocks if a populated non-target table has an inbound catalog foreign key or an item/catalog reference column, preventing removal if new business data has been entered since cleanup. It physically deletes the catalog rows and reseeds affected identity columns; it does not remove item-image files from external storage.

After the catalog purge, run the read-only verification script again. Empty item/catalog masters produce the verification script's documented warning rather than a failure; record that the zero counts were deliberate for this blank-catalog staging copy.

## Classification summary

The scripts contain an explicit entry for every current repository application table. Category D has no known repository tables today; it is generated for every database user table outside this list and blocks execution when populated.

| Category | Tables / group | Rule |
|---|---|---|
| A — preserve | `Roles`, `Pages`, `RolePermissions` | Security/navigation/permission seeds remain unchanged. |
| A — preserve | `PartySettings`, `Categories`, `Units`, `Items`, `NumberSequences`, `PaymentModes`, `ExpenseCategories` | General master/configuration data remains. Only selected stored stock fields and known document next numbers are reset. |
| A — preserve | `HR_Departments`, `HR_Designations`, `HR_Shifts`, `HR_LeaveTypes`, `HR_SalaryStructures`, `HR_SalaryComponents`, `HR_SalaryStructureComponents` | Reusable HR configuration remains. |
| A — preserve | `OeeMachines`, `OeeMoulds`, `OeeDowntimeReasons` | OEE masters remain. |
| A — preserve | `SalesChannels`, `ChannelSkuMappings`, `ChannelWarehouses`, `ItemPackagingProfiles`, `ProductBomComponents`, `ProcurementSettings`, `DispatchSkuSettings` | Supply-chain / planning / dispatch master mappings and reusable configuration remain. |
| A — preserve | `WalletCategories`, optional `__EFMigrationsHistory` | Wallet-category seed data and any EF history remain. |
| B — selective | `Users`, `UserRoles`, `RefreshTokens`, `PasswordResetTokens` | Exactly the flag-detected System Owner and configured staging administrator/role links remain. All sessions and reset tokens are deleted; every other user is physically deleted only after all verified dependencies are cleared. |
| B — selective | `Parties`, `PartyRoles` | Parties and transporter role mappings remain by default, with optional opening-balance reset. |
| B — selective | `HR_Employees`, `HR_EmployeeAddresses`, `HR_EmployeeBankAccounts`, `HR_EmployeeDocuments`, `HR_EmployeeSalaryStructures`, `HR_LeaveBalances` | Removed by default; employee data needs an explicit preservation choice. Retained leave balances are reset to zero. |
| B — selective | `CompanyGstRegistrations`, `Wallets`, `AuditLogs` | Controlled by the explicit GST, wallet, and audit switches described above. |
| C — delete | Sales/purchase/expense: `SalesInvoices`, `SalesInvoiceItems`, `SalesInvoicePayments`, `PurchaseBills`, `PurchaseBillItems`, `SupplierPayments`, `SupplierPaymentAllocations`, `PurchaseOrders`, `PurchaseOrderItems`, `PurchaseReturns`, `PurchaseReturnItems`, `Expenses`, `PartyLedgerEntries`, `StockMovements` | Operational commercial documents, allocations, ledger entries, and stock movements are deleted child-first. |
| C — delete | HR/OEE/GST: `HR_Attendance`, `HR_AttendanceAdjustments`, `HR_LeaveApplications`, `HR_PayrollRuns`, `HR_PayrollDetails`, `OeeProductionEntries`, `CompanyGstSessions`, `GstVerificationLogs`, `GstApiLogs`, `EWayBills`, `EInvoices` | Operational HR, production, and GST/GSTZen history is deleted. |
| C — delete | Rojmel: `WalletTransactions`, `WalletTransfers` | All financial ledger/transfer history is deleted before wallets are retained/reset. |
| C — delete | Procurement/supply/dispatch: `ProcurementSalesImportBatches`, `ProcurementSalesHistory`, `ProcurementLeadTimeHistory`, `ProcurementInboundStockSnapshots`, `ProcurementPlanningRuns`, `ProcurementPlanningRunLines`, `SupplyChainImportBatches`, `SupplyChainImportRows`, `DispatchImportStagedRows`, `DispatchWarehouseSalesSnapshots`, `DispatchWarehouseStockSnapshots`, `DispatchWarehouseInboundSnapshots`, `DispatchPlanningRuns`, `DispatchCompanyStockSnapshots`, `DispatchRecommendationResults`, `DispatchAllocations` | Imports, dated history, snapshots, runs, recommendations, overrides, and allocations are deleted. |
| C — delete | Shipment Operations: `Shipments`, `ShipmentItems`, `ShipmentPackages`, `ShipmentPackageItems`, `ShipmentDockets`, `ShipmentAppointments`, `ShipmentTrackingEvents`, `ShipmentDeliveryAttempts`, `ShipmentReceipts`, `ShipmentReceiptItems`, `ShipmentReturns`, `ShipmentReturnItems`, `ShipmentFreightCharges`, `ShipmentImportStagedRows` | Work List/shipment documents, packing/tracking/receipt/return/freight history and imports are deleted in dependency order. |

`ProcurementLeadTimeHistory` is classified as operational dated history because it holds ordered/received dated observations. Reusable configured lead-time values remain in `ProcurementSettings`. The repository has no persisted dashboard/cache table: dashboard and report procedures read the transactional tables above.

## Numbering and identity policy

`NumberSequences` remains intact as configuration. With `@ResetDocumentSequences = 1`, only transaction modules proven by repository stored procedures are set to next number `1`:

- `SalesInvoice`, `PurchaseBill`, `SupplierPayment`, `Expense`, `PurchaseOrder`, `PurchaseReturn`
- `ProcurementSalesImport`, `ProcurementPlanning`
- `Shipment`, `ShipmentReceipt`, `ShipmentReturn`

Prefixes and padding are never overwritten. Master code sequences and security identifiers are not reset. For explicitly deleted identity tables, the script first verifies that the table is fully empty, reads the actual SQL Server identity seed/increment, and only then uses `DBCC CHECKIDENT` to make the next value the original seed. It never reseeds a table that still has retained rows.

## Post-cleanup verification

The cleanup script checks zero rows in every Category C table, all session-token tables, user counts/role links, stock/balance policy, and enabled/trusted foreign keys/check constraints/triggers before commit. It then prints post-count and balance reports.

The separate verification script is the final gate. It reports `PASS`, `FAIL`, or `WARNING` and performs these read-only checks:

- exact database name and production-like name rejection
- full expected-table presence and count/classification output
- protected System Owner, system role/link, configured staging administrator, roles/pages/permissions, and all session/token rows
- all transaction tables empty; stock, party opening balance, wallet balance, GST registration, and audit policies honoured
- master/configuration counts for comparison against the cleanup pre-report
- every foreign-key orphan relationship, disabled/untrusted foreign/check constraints, disabled DML triggers, invalid role assignments, invalid page permissions, invalid SKU mappings, and invalid channel-warehouse links.

Do not call the database staging-ready merely because the cleanup committed. It must first be reviewed in dry-run mode, run on a verified backup copy, and pass this separate verification script.

## File storage and sensitive data

The SQL database contains references, not the physical files. The cleanup pre-report lists file/path/image/attachment columns without printing credentials. Relevant current references include:

- master `Items.ImageUrl` — retained with item masters; do not remove its files
- `Expenses.AttachmentPath` — references are deleted with expenses
- `HR_EmployeeDocuments.FilePath` and employee profile image URL — references are deleted by default or according to the employee-detail switch
- `ShipmentReceipts.ProofAttachmentUrl`, shipment docket/tracking URLs, and import `OriginalFileName`/file-hash metadata — operational rows are deleted.

After the SQL verification passes, inventory the application upload/object-storage location and safely remove only files associated with the deleted database references. Take a storage backup first; do not delete item images, files shared by other databases, or any path merely because its name resembles a deleted row. The current repository has no database-managed physical-file delete routine, so this remains a manual storage-owner operation.

Never retain or print access tokens, refresh tokens, password-reset tokens, password hashes, JWT signing keys, GSTZen credentials, API secrets, or request/response payload credentials. The cleanup deletes the known token/session/log rows; environment variables and staging secret stores need separate rotation/replacement.

## Moving the verified database to staging

Use the organization-approved backup/restore, SQL Server copy, or controlled deployment process after the verification gate passes. Before starting the staging API:

- point the staging API connection string at the restored staging database
- set a staging-only JWT signing key, CORS origin, upload/object-storage location, email/SMS provider configuration, GST/GSTZen configuration, and any external webhook/integration credentials
- keep production API keys, GST sessions, transport integrations, automated import jobs, and outbound email/SMS disabled until replaced with approved staging values
- confirm the System Owner provisioning configuration remains valid without creating a second owner, and test only the retained administrator accounts.

## Recovery and limitations

Within execution, an error or failed in-transaction validation rolls back the cleanup. After a successful commit, recovery is by restoring the verified backup/copy made before the operation. The script does not drop objects, alter stored-procedure business logic, modify migrations, or remove physical files.

Known limitations and mandatory review points:

- It intentionally fails on populated table extensions absent from this repository. Add a reviewed preservation entry or extend the repository-backed classification; never convert unknown tables into dynamic deletions.
- It assumes the current SQL asset set has been deployed completely. Missing current tables is a hard stop, not a compatibility mode for partial migration states.
- It uses one transaction. Large databases need a tested copy and maintenance window with adequate transaction-log capacity. Do not split it into phases without designing and reviewing resumable checkpoints and a new verification policy.
- It cannot prove a master table was preserved solely from the post-state; compare its post count with the script’s pre-cleanup report.
- It does not rotate environment/staging secrets or clean external storage. Those are deliberate out-of-database operations.
