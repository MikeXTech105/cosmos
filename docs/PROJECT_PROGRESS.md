# COSMOS ERP - Project Progress Document

## Rojmel My Wallet 403 Authorization Fix - 2026-07-21

Status: Implemented; focused authorization/service/SQL contract tests added. Target database verification remains a deployment step.

Completed:

- Corrected `POST /api/v1/rojmel/my-wallet/income` and `/expense` to require only `Rojmel.MyWallet/Create`; the general `/api/v1/rojmel/transactions` endpoints retain `Rojmel.Transactions/Create`.
- Preserved JWT actor scoping and stored-procedure ownership checks. Self-service routes still resolve the caller's linked wallet internally and cannot target another wallet.
- Added an explicit, safe missing-wallet HTTP 404 response with `ROJMEL_MY_WALLET_NOT_PROVISIONED`, plus structured permission-denial logging without tokens, request bodies, or credentials.
- Added `backend/database/verify_rojmel_my_wallet_403.sql`, a read-only target-environment report for User 2's status, roles, effective Rojmel permissions, wallet links, duplicate/orphan detection, and required Rojmel objects.
- Updated frontend and Rojmel module integration guidance, including the fact that personal wallets are administrator-provisioned rather than automatically created by the current migration.

Deployment: deploy the API change, then run `backend/database/verify_rojmel_my_wallet_403.sql` against the selected target database. A user with `Rojmel.MyWallet/View = 1`, `Rojmel.MyWallet/Create = 1`, and `Rojmel.Transactions/Create = 0` must be able to post income/expense to their linked wallet and remain unable to use general transaction creation.

## Runtime/API Contract Repair - 2026-07-21

Status: Implemented; automated build and test verification is recorded with this change.

Completed:

- Fixed party-list Dapper materialization by mapping the SQL-specific `PartyType` column through an internal persistence row model into the unchanged public DTO.
- Fixed purchase/expense list summaries to use explicit summary-only parameter objects. Paging and sorting parameters can no longer leak into summary stored-procedure calls; purchase-bill totals retain Search, SupplierId, Status, FromDate, and ToDate filters.
- Completed employee-update validation for field lengths, active foreign keys, optional reporting managers, enum values, date ordering, uniqueness exclusion by route ID, and self-manager prevention.
- Enforced employee lifecycle integrity in services and SQL: resign/rejoin must use their dedicated routes, resigned records cannot be soft deleted, and `Status` and `IsActive` are written consistently.
- Added safe field/error-name validation diagnostics, a rerunnable SQL repair migration, and a read-only API/database contract deployment gate.

Deployment order for an existing server: apply `backend/database/migrations/20260720_backend_api_frontend_fixes.sql`, then `backend/database/migrations/20260721_runtime_api_contract_fixes.sql`, then run `backend/database/verify_runtime_api_contracts.sql` before starting the upgraded API.

## Backend API Frontend Stabilization Update - 2026-07-20

Status: Implemented and locally verified against a disposable SQL Server database. API runtime/browser smoke testing remains a deployment follow-up.

Completed:

- Standardized API success/failure envelopes with correlation IDs, exact FluentValidation field maps, actionable 409 conflict maps, safe authorization failures, and no internal details in unhandled-error responses.
- Added optional full-result `summary` objects to item, category, unit, sales invoice, purchase/expense, HR, and OEE paginated lists. Summaries are produced by filter-aware stored procedures, independent of page size/number.
- Extended Party lists and exports with `PartyType`, `HasGstin`, and `HasCreditLimit`; the tab summary deliberately ignores only `PartyType`, while `totalCount` applies every list filter.
- Added permission-protected CSV exports for users, roles, parties, and the supported generic reports registry. Files use UTF-8 BOM, deterministic names, correct content disposition, and safe business columns only.
- Added authenticated `GET`/`PUT /api/auth/me` with self-only FullName/Email updates. Duplicate email returns `409`, an `Email` field map, and `conflictCode: USER_EMAIL_EXISTS`.
- Made login/profile `isSuperAdmin` database-authoritative through protected-owner flags plus an exact trusted-role alias procedure; server-side permission enforcement remains authoritative for every protected action.
- Added a signature-validated, size-limited, safe-name `POST /api/uploads/images` endpoint for item images; CORS now uses configured exact origins, credentials, exposed `Content-Disposition`/`X-Correlation-Id`, and pre-auth OPTIONS handling.
- Added filter/sort guardrails where this API surface introduced them, including Party’s maximum page size of 200 and deterministic Party ID tie-breakers.

Verification:

- Applied the canonical setup, procurement, System Owner, OEE, and this migration to `Cosmos_BackendFixes_Verify_20260720`; executed every new summary procedure, Party export/filter checks, user export procedure, and profile update/conflict procedure.
- Built `backend/src/Cosmos.API/Cosmos.API.csproj` into a separate verification output directory: success with the pre-existing `Microsoft.OpenApi` NU1903 advisory warning.
- Existing automated suite passed: 112/112 tests.
- Target-environment follow-up: apply `backend/database/migrations/20260720_backend_api_frontend_fixes.sql`, set the exact production frontend CORS origin, and validate HTTPS, multipart upload, Swagger, browser CORS, and report exports with deployment identities/data.

## Rojmel / Wallet Module Update - 2026-07-20

Status: Implemented / Build Verified / Tests Verified (112/112) / Disposable SQL DB Verified / Swagger Needs Runtime Verification / Export Pending.

Completed:

- Added the Rojmel wallet ledger slice: contracts and wallet enums, permission constants, FluentValidation, five application services, Dapper repository, six authenticated API controllers, DI registrations, and Swagger group `rojmel`.
- Added page/action permissions: `Rojmel.Dashboard`, `Rojmel.MyWallet`, `Rojmel.Wallets`, `Rojmel.Transactions`, `Rojmel.Transfers`, `Rojmel.Reports`, and `Rojmel.Admin`; migration grants all actions only to `SuperAdmin` by default.
- Renamed the module's database procedures from the SQL Server-reserved `sp_` prefix to `usp_`, preventing master-database procedure shadowing during deployment and runtime lookup.
- Enforced two levels of protection: controller action permissions and current-user/all-wallet scope passed to every wallet repository procedure. Normal users receive only their linked user wallet records; company and external wallets remain administrator-only.
- Added wallet, category, transaction, and transfer tables with filtered company/default-wallet uniqueness indexes; seed categories and an empty company master wallet are idempotent.
- Added balance-changing SQL procedures with explicit transactions, `UPDLOCK/HOLDLOCK`, non-negative balance checks, linked transfer in/out ledger rows, and cancellation reversal rows. Transfers are excluded from income/expense totals.
- Added Rojmel dashboard and seven report endpoints, three module docs, rules/ownership/report-exclusion tests, Dapper contract mapping tests, and controller permission-metadata tests.
- Applied the canonical setup and the Rojmel migration three times on a fresh disposable local SQL Server database. Verified company/user/external wallet creation, income, transfer linked entries, insufficient-balance rejection, normal-user filtering, income/expense transfer exclusion, and both transfer and transaction reversal paths. The disposable database was then removed.

API inventory additions: `/api/v1/rojmel/my-wallet`, `/wallets`, `/transactions`, `/transfers`, `/dashboard`, and `/reports` as documented in `backend/docs/ROJMEL_WALLET_FRONTEND_INTEGRATION.md`.

Database migration addition: `backend/database/migrations/20260720_rojmel_wallet_module.sql`.

Known risks / next roadmap:

- Apply the migration to the target environment and repeat the documented wallet/transfer/ownership smoke tests with representative production-like roles and data.
- Run the API and inspect `/swagger/rojmel/swagger.json`; runtime Swagger verification was not yet performed.
- Export, attachment storage, editable categories, and an approval/draft workflow are deferred Phase 2 work.

## Protected System Owner Update — 2026-07-16

Status: Backend implemented, unit-tested, and verified against a disposable local SQL Server database. No frontend changes were made.

Completed:

- Added `Users.IsSystemUser` and `Roles.IsSystemRole` with safe defaults and filtered unique indexes.
- Added idempotent migration `backend/database/migrations/20260716_system_owner.sql`, matching canonical setup overrides, reset support, and `verify_system_owner.sql`.
- Added secure environment-only, BCrypt-based, transaction-locked one-time provisioning. Startup fails when an owner is missing and required configuration is absent or when protected records conflict.
- Added centralized flag/link owner detection in `PermissionService`; normal `SuperAdmin` remains `RolePermissions`-based.
- Added dynamic all-action permissions for every active page on login and refresh, including future pages without protected-role permission rows.
- Added service and stored-procedure protections for hidden user/role lookup, mutation, assignment, password reset, and role-permission operations.
- Preserved authenticated actor IDs and added safe mutation/provisioning audit metadata without request bodies or credentials.
- Added 29 focused security/provisioning/SQL-contract regressions; full suite passes 93/93.
- Executed canonical setup, migration reruns, concurrent bootstrap, API login/refresh, future-page refresh, protected SQL guards, and verification queries on a disposable local SQL Server database; all passed, then the database was removed.

Deployment and break-glass recovery: `backend/docs/SYSTEM_OWNER.md`.

Build result: passed with the existing `Microsoft.OpenApi` NU1903 advisory warning. Production/staging SQL deployment was not performed.

## Procurement Planning Update — 2026-07-15

Status: Backend implemented and verified; frontend and confirmed client data mapping remain.

The new Procurement Planning module accepts manual or CSV/XLSX channel sales, maps marketplace SKUs to existing finished-product Items, expands sales through configurable BOMs, applies physical stock/lead-time/safety/MOQ rules, and saves auditable Draft/Finalized recommendation snapshots. It does not create purchase orders.

Completed:

- Added nullable backward-compatible Item `ProcurementClassification` without changing Product/Service `ItemType` stock semantics.
- Added nine module tables, supporting constraints/indexes, stored procedures, AMZ/BLI/INS seeds, one parent page, and six child pages.
- Added application contracts, validators, pure calculation engine, Dapper repository, services, permission-protected controllers, true XLSX/CSV import/export, audit events, and module Swagger document.
- Inspected the supplied workbook and produced a six-sheet migration/compatibility report. No workbook Item was guessed or auto-created.
- Applied and reapplied the migration on staging; transactional database smoke test passed and rolled back.
- Full xUnit suite passed: 64/64, including existing regressions and procurement calculation/import/workbook cases.

Current data/frontend actions:

- Confirm Item classification/matching, real AMZ/BLI/INS SKUs, BOM rows, lead time, safety factor, MOQ, and order multiples using the migration report.
- Build the React screens from `backend/docs/PROCUREMENT_PLANNING_FRONTEND_INTEGRATION.md`.
- The repository has no common warehouse/company stock dimension, so planning is explicitly global on `Items.CurrentStock`; warehouse/tenant scoping requires a future cross-module design.

## 1. Project Overview

COSMOS ERP is a .NET 10 ASP.NET Core Web API backend with SQL Server, Dapper, JWT authentication, SQL-backed roles/pages/permissions, audit logging tables, and module-wise Swagger grouping. The repository also contains a small Vite/React frontend placeholder and SQL setup/verification assets.

This review is based on the current code and SQL scripts. Later module updates append implementation status and verification notes below.

Verified facts:
- Backend builds successfully with `dotnet build Cosmos.slnx --no-restore`.
- Target framework is `net10.0`.
- API is controller-based ASP.NET Core, not Minimal APIs.
- Persistence uses Dapper and stored procedures.
- Swagger JSON was inspected from the running API at `http://127.0.0.1:5199/swagger/...`.
- Swagger group `dashboard` now contains Dashboard Phase 1 endpoints; Swagger group `general` currently contains zero endpoints.

## 2. Solution Architecture

### Repository structure

| Path | Purpose | Status |
|---|---|---|
| `/backend/Cosmos.slnx` | .NET solution file. | Active |
| `/backend/src/Cosmos.API` | ASP.NET Core Web API host, controllers, middleware, Swagger, auth filter. | Active |
| `/backend/src/Cosmos.Application` | Application services, validators, commands/queries, service/repository abstractions. | Active |
| `/backend/src/Cosmos.Contracts` | Public DTOs/request/response contracts grouped by module. | Active |
| `/backend/src/Cosmos.Domain` | Domain entities/enums/security permission constants. | Active |
| `/backend/src/Cosmos.Infrastructure` | JWT token service, BCrypt password hasher, GSTZen HTTP provider, options validation. | Active |
| `/backend/src/Cosmos.Persistence` | SQL connection factory, Dapper repositories, stored procedure executor, type handlers. | Active |
| `/backend/src/Cosmos.Shared` | Common API responses, exceptions, options, current user abstraction. | Active |
| `/backend/tests/Cosmos.Tests` | Unit tests for security, validation, sales calculations, GST provider, purchase/expense validators. | Partial |
| `/backend/database` | SQL Server setup, verification stub, GST script, migrations. | Active but needs verification |
| `/backend/docs` | Existing GSTZen documentation. | Active |
| `/frontend` | Vite/React placeholder app calling `/test/*`. | Placeholder; backend has no `/test` APIs in Swagger |
| `/Database_Verification_Output` | Generated database remediation/check scripts and verification report. | Review artifact |

### Architecture pattern

The backend follows a Clean Architecture / layered module structure:
- API layer: controllers and middleware.
- Application layer: services, validation, use-case commands/queries.
- Contracts layer: DTOs and request models exposed to API clients.
- Domain layer: entities, enums, permission constants.
- Persistence layer: Dapper repositories and SQL stored procedure calls.
- Infrastructure layer: external services and security implementations.

Overall structure is clean and understandable. Main inconsistencies:
- Some controllers are formatted as single-line compressed files, especially Purchase/Expense, reducing maintainability and Swagger metadata quality.
- HR is broad: one `HrService` and one `HrRepository` cover departments, designations, shifts, employees, attendance, leave, and payroll.
- `IUnitOfWork` exists but repositories open their own connections, so unit-of-work is not transactionally effective.
- `backend/database/002_Verify_Database_Setup.sql` is effectively empty.
- SQL scripts are large monoliths plus ad-hoc migrations, with no automated database migration runner.

## 3. Module Status Summary

| Module | Status | Evidence | Main risk |
|---|---|---|---|
| Dashboard | Phase 1 Implemented / Needs DB Verification | General dashboard controller/service/repository/contracts plus SQL migration `20260710_dashboard_phase1.sql`. OEE dashboard remains separate. | SQL migration must be applied and verified against a live database; recent activity and export are pending. |
| Party / Customer / Supplier | Partially Completed | Parties controller/service/repository/SQL present. Party table has no explicit customer/supplier type column in reviewed schema. | Party is generic; customer/supplier role semantics need verification. |
| Items | Partially Completed | Items CRUD, image upload on create, item table, stock columns. | Update image replacement/storage hardening missing; inventory is embedded, not separate stock module. |
| Categories | Completed | CRUD API, service, repository, SQL, permissions. | Needs DB integration testing. |
| Units | Completed | CRUD API, service, repository, SQL, permissions. | Needs DB integration testing. |
| Sales | Partially Completed | Sales invoice CRUD/status/payment/report APIs and SQL. | Sales returns/quotations/orders not found; stock side effects need integration tests. |
| Purchase | Partially Completed | Purchase bills, orders, returns, supplier payments, reports, SQL. | Controllers lack detailed Swagger response metadata; workflow needs DB tests. |
| Expenses | Partially Completed | Expense categories and expenses CRUD plus reports. | No attachment file upload implementation; only attachment path model. |
| Inventory / Stock | Partially Completed | Items stock columns and `StockMovements`; sales/purchase procedures adjust stock. | No standalone inventory/stock controller or stock adjustment APIs found. |
| HR | Partially Completed | Departments, designations, shifts, employees, attendance, leave, payroll APIs and SQL. | Salary structure tables lack APIs; documents are metadata only; broad service/repository. |
| Security / Users / Roles / Permissions / Pages | Partially Completed | JWT, login/refresh/logout, user/role/page/permission APIs, SQL-backed permissions. | Secrets committed; forgot-password email missing; audit attribution inconsistent. |
| GSTZen / GST Integration | Partially Completed / Needs Verification | GST registration, GSTIN verification, e-way bill, e-invoice, session, API log APIs and SQL. | Production token/config committed; some GSTN/GSTR paths blank; live provider verification required. |
| Reports | Phase 1 Implemented / Needs DB Verification | New common reports controllers/services/repository/contracts plus SQL migration `20260709_phase1_reports_module.sql`; legacy sales/purchase/OEE report APIs remain. | SQL migration must be applied and verified against a live database; export framework is pending. |
| OEE / Manufacturing | Partially Completed | OEE machines, moulds, downtime reasons, production entries, dashboard, reports. | Added as migration; manufacturing beyond OEE not present. |
| Frontend | Not Started / Placeholder | Vite page calls `/test/hello` and `/test/db-test`; no matching backend APIs in Swagger. | Real frontend must be built against auth/pages/permissions APIs. |

## 4. Detailed Module Review

### Dashboard

Status: Phase 1 Implemented / Needs DB Verification.

Evidence:
- Swagger group: `dashboard`.
- Controller: `DashboardController` at `api/v1/dashboard`.
- Service/repository/contracts: `IDashboardService`, `DashboardService`, `IDashboardRepository`, `DashboardRepository`, `Cosmos.Contracts/Dashboard`.
- SQL migration: `backend/database/migrations/20260710_dashboard_phase1.sql`.

Missing pieces:
- Live SQL Server execution and data verification.
- Recent activity timeline.
- Export endpoints.
- Company/branch filters; no general dimension exists across the current source tables.

Known risks:
- Dashboard KPIs are stored-procedure driven and need verification with representative operational data.
- Frontend must keep the general dashboard separate from OEE dashboard endpoints unless an explicit manufacturing context is selected.

### Party / Customer / Supplier

Status: Partially Completed.

Controllers:
- `PartiesController` (`api/v1/parties`, Swagger group `parties`)
- `PartySettingsController` (`api/v1/settings/party`, Swagger group `settings`)

Services:
- `PartyService`
- `PartySettingsService`

Repositories / Dapper:
- `PartyRepository`: `sp_Party_GetById`, `sp_Party_GetList`, `sp_Party_Create`, `sp_Party_Update`, `sp_Party_Delete`, `sp_Party_SetActive`
- `PartySettingsRepository`: `sp_PartySettings_Get`, `sp_PartySettings_Update`

DTOs / models:
- `Cosmos.Contracts.Parties.PartyDtos`
- `Cosmos.Application.Parties.Commands`
- `Cosmos.Application.Parties.Queries`

Database:
- Tables: `Parties`, `PartySettings`, `PartyLedgerEntries` used by purchase/sales ledgers.
- Important columns: `PartyCode`, `PartyName`, `MobileNo`, `Email`, `GSTTreatment`, `GSTIN`, legal/trade names, billing/shipping addresses, opening balance, credit limit/period, `IsActive`, audit fields, `IsDeleted`.
- Indexes: party name, mobile, GSTIN, deleted flag.
- Pages/permissions: `Party` with View/Create/Edit/Delete seeded.

Missing pieces:
- Explicit customer/supplier classification was not visible in `Parties` table columns reviewed; module treats party as generic. Needs Verification if customer/supplier separation is intended through UI or business rules.
- Party grouping settings exist, but no party group table/API was found.

Known risks:
- `CreatedBy`/`ModifiedBy` on party are `UNIQUEIDENTIFIER`, while security user IDs are `int`; audit identity mapping needs verification.

### Items

Status: Partially Completed.

Controllers:
- `ItemsController` (`api/items`, Swagger group `items`)

Services:
- `ItemService`

Repositories / Dapper:
- `ItemRepository`: `sp_Item_GetById`, `sp_Item_GetList`, `sp_Item_ItemCodeExists`, `sp_Item_Create`, `sp_Item_Update`, `sp_Item_Delete`, plus category/unit existence checks.

DTOs / models:
- `Cosmos.Contracts.Items.ItemDtos`
- `Cosmos.Application.Items.Commands`
- `Cosmos.Application.Items.Queries`
- `CreateItemFormRequest` in `ItemsController` for multipart create.

Database:
- Table: `Items`
- Key columns: `Name`, `ItemCode`, `Barcode`, `CategoryId`, `UnitId`, `ItemType`, `PurchasePrice`, `SalesPrice`, `HSNCode`, `GSTRate`, `TrackInventory`, `OpeningStock`, `CurrentStock`, `ReservedStock`, `MinimumStock`, `ImageUrl`, `IsActive`, audit fields, `IsDeleted`.
- Indexes: unique active `ItemCode`, barcode, name, category, unit.
- Foreign keys: `CategoryId -> Categories`, `UnitId -> Units`.
- Pages/permissions: `Items` View/Create/Edit/Delete.

Missing pieces:
- Create supports image upload to local `wwwroot/uploads/items`; update does not expose image replacement.
- No storage abstraction, content-signature validation, or cleanup strategy.
- No standalone stock adjustment/stock transfer APIs found.

Known risks:
- Local file upload does not scale across multiple app instances.
- Inventory correctness depends on sales/purchase stored procedures and needs database integration tests.

### Categories

Status: Completed, pending DB/integration testing.

Controllers:
- `CategoriesController` (`api/categories`, Swagger group `masters`)

Services:
- `CategoryService`

Repositories / Dapper:
- `CategoryRepository`: `sp_Category_GetById`, `sp_Category_GetList`, `sp_Category_NameExists`, `sp_Category_Create`, `sp_Category_Update`, `sp_Category_Delete`

DTOs / models:
- Category commands/queries in `Cosmos.Application.Items`
- Category DTOs in `Cosmos.Contracts.Items`

Database:
- Table: `Categories`
- Index: unique active name.
- Permissions: `Categories` View/Create/Edit/Delete.

Missing pieces:
- None obvious from static review.

Known risks:
- Needs end-to-end DB tests for procedure/result mapping.

### Units

Status: Completed, pending DB/integration testing.

Controllers:
- `UnitsController` (`api/units`, Swagger group `masters`)

Services:
- `UnitService`

Repositories / Dapper:
- `UnitRepository`: `sp_Unit_GetById`, `sp_Unit_GetList`, `sp_Unit_NameExists`, `sp_Unit_Create`, `sp_Unit_Update`, `sp_Unit_Delete`

DTOs / models:
- Unit commands/queries in `Cosmos.Application.Items`
- Unit DTOs in `Cosmos.Contracts.Items`

Database:
- Table: `Units`
- Index: unique active name.
- Permissions: `Units` View/Create/Edit/Delete.

Missing pieces:
- None obvious from static review.

Known risks:
- Needs end-to-end DB tests for procedure/result mapping.

### Sales

Status: Partially Completed.

Controllers:
- `SalesInvoicesController` (`api/v1/sales/invoices`, Swagger group `sales`)
- `SalesReportsController` (`api/v1/sales/reports`, Swagger group `reports`)

Services:
- `SalesService`
- `SalesCalculationService`

Repositories / Dapper:
- `SalesRepository`: `sp_SalesInvoice_Create`, `sp_SalesInvoice_Update`, `sp_SalesInvoice_GetById`, `sp_SalesInvoice_GetList`, `sp_SalesInvoice_Confirm`, `sp_SalesInvoice_Cancel`, `sp_SalesInvoice_AddPayment`, `sp_SalesInvoice_GetPayments`, `sp_SalesReport_Summary`, `sp_SalesReport_CustomerReceivables`, `sp_SalesReport_ItemWiseSales`, `sp_Sales_CustomerExists`, `sp_Sales_ItemExists`

DTOs / models:
- `Cosmos.Contracts.Sales.SalesDtos`
- `Cosmos.Application.Sales.SalesRequests`

Database:
- Tables: `SalesInvoices`, `SalesInvoiceItems`, `SalesInvoicePayments`, `StockMovements`, `PartyLedgerEntries`
- Key flow: draft invoice create/update, confirm deducts product stock, cancel/payment operations, reports.
- Permissions: `Sales.Invoice` View/Create/Edit/Delete/Approve and `Sales.Report` View.
- Swagger groups: `sales` and `reports`.

Missing pieces:
- Sales orders, quotations/estimates, delivery challans, sales returns not found.
- Invoice print/PDF/export endpoints not found.

Known risks:
- Stock and ledger side effects are procedure-driven and need integration tests.

### Purchase

Status: Partially Completed.

Controllers:
- `PurchaseBillsController` (`api/purchase-bills`, Swagger group `Purchase & Expense`)
- `PurchaseOrdersController` (`api/purchase-orders`, Swagger group `Purchase & Expense`)
- `PurchaseReturnsController` (`api/purchase-returns`, Swagger group `Purchase & Expense`)
- `SupplierPaymentsController` (`api/supplier-payments`, Swagger group `Purchase & Expense`)
- `PurchaseExpenseReportsController` (`api/purchase-expense/reports`, Swagger group `Purchase & Expense`)

Services:
- `PurchaseExpenseService`

Repositories / Dapper:
- `PurchaseExpenseRepository` calls purchase bill/order/return/payment/report procedures including `sp_PurchaseBill_Save`, `sp_PurchaseBill_Confirm`, `sp_PurchaseOrder_Convert`, `sp_PurchaseReturn_Save`, `sp_SupplierPayment_Save`.

DTOs / models:
- `Cosmos.Contracts.PurchaseExpense.PurchaseExpenseDtos`
- `Cosmos.Application.PurchaseExpense.PurchaseExpenseRequests`

Database:
- Tables: `PurchaseBills`, `PurchaseBillItems`, `SupplierPayments`, `SupplierPaymentAllocations`, `PurchaseOrders`, `PurchaseOrderItems`, `PurchaseReturns`, `PurchaseReturnItems`, `PartyLedgerEntries`, `StockMovements`, `NumberSequences`.
- Permissions: `PurchaseExpense.PurchaseBill`, `PurchaseExpense.PurchaseOrder`, `PurchaseExpense.PurchaseReturn`, `PurchaseExpense.PaymentOut`, `PurchaseExpense.Report`.

Missing pieces:
- Controller files are heavily compressed; Swagger response schemas often show generic `OK`.
- Purchase receiving/GRN and vendor debit note modules not found.

Known risks:
- Purchase operations mutate stock and party ledger inside stored procedures; needs DB integration tests.
- Route and group name `Purchase & Expense` contains spaces and ampersand. Works in Swagger but may be awkward for automation.

### Expenses

Status: Partially Completed.

Controllers:
- `ExpenseCategoriesController` (`api/expense-categories`)
- `ExpensesController` (`api/expenses`)
- `PurchaseExpenseReportsController` expense report endpoints.

Services:
- `PurchaseExpenseService`

Repositories / Dapper:
- `PurchaseExpenseRepository`: expense category and expense procedures.

DTOs / models:
- `CreateExpenseCategoryRequest`, `UpdateExpenseCategoryRequest`
- `CreateExpenseRequest`, `UpdateExpenseRequest`, report DTOs.

Database:
- Tables: `ExpenseCategories`, `Expenses`
- Important columns: `ExpenseNo`, `ExpenseDate`, `CategoryId`, `PaidToPartyId`, `Amount`, `TaxAmount`, persisted `TotalAmount`, `PaymentMode`, `ReferenceNo`, `AttachmentPath`, audit fields, `IsDeleted`.
- Permissions: `PurchaseExpense.ExpenseCategory`, `PurchaseExpense.Expense`, `PurchaseExpense.Report`.

Missing pieces:
- No binary attachment upload endpoint found; API only accepts/stores `AttachmentPath`.

Known risks:
- Expense and purchase are combined in one service/repository, which may become hard to maintain.

### Inventory / Stock

Status: Partially Completed.

Controllers:
- No dedicated stock/inventory controller found.

Services/repositories:
- Stock behavior is embedded in item, sales, purchase SQL workflows.

Database:
- `Items` has stock fields.
- `StockMovements` tracks movement source/type/quantity.
- Sales confirm/cancel and purchase bill/return procedures insert stock movements and update `Items.CurrentStock`.

Missing pieces:
- Stock adjustment, stock transfer, stock ledger APIs.
- Inventory valuation/report APIs.
- Low-stock report APIs.

Known risks:
- Inventory is operationally important but not isolated as a module yet.

### Reports Phase 1

Status: Implemented, pending manual SQL execution and API verification.

New controllers:
- `Reports/SalesReportsV1Controller` (`api/v1/reports/sales`, Swagger group `reports`)
- `Reports/PurchaseReportsV1Controller` (`api/v1/reports/purchase`, Swagger group `reports`)
- `Reports/ExpenseReportsV1Controller` (`api/v1/reports/expenses`, Swagger group `reports`)
- `Reports/InventoryReportsV1Controller` (`api/v1/reports/inventory`, Swagger group `reports`)
- `Reports/PartyReportsV1Controller` (`api/v1/reports/parties`, Swagger group `reports`)

New services/repositories:
- `IReportsService` / `ReportsService`
- `IReportsRepository` / `ReportsRepository`
- FluentValidation report query validators

New contracts:
- `Cosmos.Contracts/Reports/ReportRequestDtos.cs`
- `Cosmos.Contracts/Reports/SalesReportDtos.cs`
- `Cosmos.Contracts/Reports/PurchaseReportDtos.cs`
- `Cosmos.Contracts/Reports/ExpenseReportDtos.cs`
- `Cosmos.Contracts/Reports/InventoryReportDtos.cs`
- `Cosmos.Contracts/Reports/PartyReportDtos.cs`

SQL migration:
- `backend/database/migrations/20260709_phase1_reports_module.sql`

Pages/permissions added:
- `Reports.Sales`
- `Reports.Purchase`
- `Reports.Expenses`
- `Reports.Inventory`
- `Reports.Parties`
- `SuperAdmin` is seeded with `CanView` and `CanExport` for each page by role-name lookup.

Documentation:
- `backend/docs/REPORTS_PHASE1.md`
- `backend/docs/REPORTS_PHASE1_IMPLEMENTATION_TRACKER.md`

Known limitations:
- Export support is prepared through permissions only; no Excel/PDF endpoints were added.
- Customer statement depends on `PartyLedgerEntries` sales rows, but current sales procedures primarily expose receivables from `SalesInvoices`.
- Stock valuation uses `Items.PurchasePrice` because no weighted-average cost store exists.
- SQL procedures need live database verification after migration execution.

### HR

Status: Partially Completed.

Controllers:
- `HR/DepartmentsController` (`api/hr/departments`)
- `HR/DesignationsController` (`api/hr/designations`)
- `HR/ShiftsController` (`api/hr/shifts`)
- `HR/EmployeesController` (`api/hr/employees`)
- `HR/AttendanceController` (`api/hr/attendance`)
- `HR/LeavesController` (`api/hr/leaves`)
- `HR/PayrollController` (`api/hr/payroll`)

Services:
- `HrService`

Repositories / Dapper:
- `HrRepository` calls procedures for departments, designations, shifts, employees, employee documents, bank details, attendance, attendance adjustments, leave, payroll.

DTOs / models:
- `Cosmos.Contracts.HR.HrDtos`
- `Cosmos.Application.HR.HrRequests`
- HR enums/entities in `Cosmos.Domain.HR`

Database:
- Tables include `HR_Departments`, `HR_Designations`, `HR_Shifts`, `HR_Employees`, `HR_EmployeeAddresses`, `HR_EmployeeDocuments`, `HR_EmployeeBankAccounts`, `HR_Attendance`, `HR_AttendanceAdjustments`, `HR_LeaveTypes`, `HR_LeaveApplications`, `HR_LeaveBalances`, `HR_SalaryComponents`, `HR_SalaryStructures`, `HR_SalaryStructureComponents`, `HR_EmployeeSalaryStructures`, `HR_PayrollRuns`, `HR_PayrollDetails`.
- Migration `20260703_hr_employee_resignation_rejoin.sql` adds resignation/rejoin columns and overrides employee procedures.
- Permissions: `HR.Department`, `HR.Designation`, `HR.Shift`, `HR.Employee`, `HR.Attendance`, `HR.Leave`, `HR.Payroll`.

Missing pieces:
- Salary structure/component APIs were not found despite tables existing.
- Employee documents are metadata endpoints; no file upload/storage integration found.
- HR module lacks narrower services/repositories by subdomain.

Known risks:
- `HrService` and `HrRepository` are broad and may be hard to test/evolve.
- Employee status/resignation/rejoin behavior needs frontend care: use `status`, `includeResigned`, `includeResigned=false` dropdown defaults.

### Security / Users / Roles / Permissions / Pages

Status: Partially Completed.

Controllers:
- `AuthController` (`api/auth`, Swagger group `settings`)
- `UsersController` (`api/users`, Swagger group `settings`)
- `RolesController` (`api/roles`, Swagger group `settings`)
- `PagesController` (`api/pages`, Swagger group `settings`)
- `PermissionsController` (`api/permissions`, Swagger group `settings`)

Services:
- `AuthService`, `UserService`, `RoleService`, `PageService`, `PermissionService`

Repositories / Dapper:
- `AuthRepository`, `UserRepository`, `RoleRepository`, `PageRepository`, `PermissionRepository`

DTOs / models:
- `Cosmos.Contracts.Auth.AuthDtos`
- `Cosmos.Contracts.Users.UserDtos`
- `Cosmos.Contracts.Roles.RoleDtos`
- `Cosmos.Contracts.Pages.PageDtos`
- `Cosmos.Contracts.Permissions.PermissionDtos`

Database:
- Tables: `Users`, `Roles`, `UserRoles`, `Pages`, `RolePermissions`, `RefreshTokens`, `PasswordResetTokens`, `AuditLogs`
- Permissions: `Users`, `Roles`, `Pages`, `Permissions`
- Supported actions: `View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`

Missing pieces:
- Forgot-password email delivery is not implemented; token generation exists.
- Password reset tokens are stored as raw tokens in SQL.
- No MFA/email confirmation/account lockout found.

Known risks:
- `appsettings.json` contains committed SQL credentials, JWT signing key, and GSTZen token.
- Seeded admin user exists in SQL with a committed BCrypt hash.
- Swagger is enabled unconditionally, including non-development.

### GSTZen / GST Integration

Status: Partially Completed / Needs Verification.

Controllers:
- `GstConfigurationController` (`api/v1/gst/configuration`)
- `GstRegistrationsController` (`api/v1/gst/registrations`)
- `GstVerificationController` (`api/v1/gst/verify-gstin`)
- `GstSessionsController` (`api/v1/gst/sessions`)
- `EWayBillsController` (`api/v1/gst/eway-bills`)
- `EInvoicesController` (`api/v1/gst/e-invoices`)
- `GstApiLogsController` (`api/v1/gst/api-logs`)

Services:
- `GstRegistrationService`, `GstVerificationService`, `EWayBillService`, `EInvoiceService`, `GstSessionService`, `GstApiLogService`
- `GstZenProviderService` in Infrastructure

Repositories / Dapper:
- `GstRepository` calls GST registration, verification, e-way bill, e-invoice, session, and API log procedures.

DTOs / models:
- `Cosmos.Contracts.Gst.GstDtos`
- `Cosmos.Application.Gst.GstRequests`

Database:
- Tables: `CompanyGstRegistrations`, `CompanyGstSessions`, `GstVerificationLogs`, `EWayBills`, `EInvoices`, `GstApiLogs`.
- Script: `003_gst_integration_module.sql`.
- Pages: `GST.Configuration`, `GST.Registration`, `GST.Verification`, `GST.EWayBill`, `GST.EInvoice`, `GST.Session`, `GST.Logs`.

Missing pieces:
- `GstnGenerateOtpPath`, `GstnAuthenticateOtpPath`, `Gstr1Path`, and `Gstr3BPath` are blank in config.
- E-way bill extend path is blank.
- Needs live/sandbox GSTZen verification with valid credentials and representative payloads.

Known risks:
- Production GSTZen token is committed in config.
- External provider behavior and GST compliance workflows require environment verification.

### Reports

Status: Partially Completed.

Controllers:
- `SalesReportsController` (`api/v1/sales/reports`, Swagger group `reports`)
- `PurchaseExpenseReportsController` (`api/purchase-expense/reports`, Swagger group `Purchase & Expense`)
- `OeeReportsController` (`api/v1/oee/reports`, Swagger group `OEE`)

Services/repositories:
- `SalesService`/`SalesRepository`
- `PurchaseExpenseService`/`PurchaseExpenseRepository`
- `OeeService`/`OeeRepository`

Database:
- Sales report stored procedures.
- Purchase/expense report stored procedures.
- OEE report stored procedures.

Missing pieces:
- Common reports Phase 1 architecture now exists.
- Inventory stock reports and general dashboard Phase 1 now exist; GST return reports, financial statements, and export framework remain pending.
- OEE Excel export endpoint returns a string response schema in Swagger; actual export behavior needs verification.

Known risks:
- Reports are module-local and may diverge in shape/export behavior.

### OEE / Manufacturing

Status: Partially Completed.

Controllers:
- `OeeMachinesController`
- `OeeMouldsController`
- `OeeDowntimeReasonsController`
- `OeeProductionEntriesController`
- `OeeDashboardController`
- `OeeReportsController`

Services:
- `OeeService`

Repositories / Dapper:
- `OeeRepository` with OEE master, production entry, dashboard, and report procedures.

DTOs / models:
- `Cosmos.Contracts.Oee.OeeDtos`
- `Cosmos.Application.Oee.OeeRequests`

Database:
- Migration: `20260703_oee_module.sql`
- Tables: `OeeMachines`, `OeeMoulds`, `OeeDowntimeReasons`, `OeeProductionEntries`
- Pages: `OEE.Dashboard`, `OEE.ProductionEntries`, `OEE.Machines`, `OEE.Moulds`, `OEE.DowntimeReasons`, `OEE.Reports`

Missing pieces:
- Broader manufacturing/MRP/work order/BOM modules not found.

Known risks:
- OEE schema is migration-based and may not be included in a fresh database if only `001_Full_Database_Setup.sql` is run.

## 5. API Inventory

Notes:
- Inventory is based on Swagger JSON from the running API.
- `Auth` is `No` only where `[AllowAnonymous]` was visible. All other rows require JWT either by `[Authorize]` or permission filter.
- Many Purchase/Expense and HR endpoints return generic `OK` in Swagger because explicit response metadata is absent.

| Module | Method | Endpoint | Controller | Request model | Response model | Auth | Permission | Status / notes |
|---|---|---|---|---|---|---|---|---|
| masters | GET | `/api/categories` | Categories | `GetCategoriesQuery` | `CategoryListItemDtoPagedResultApiResponse` | Yes | `Categories.View` | Active |
| masters | POST | `/api/categories` | Categories | `CreateCategoryCommand` | `CategoryDtoApiResponse` | Yes | `Categories.Create` | Active |
| masters | GET | `/api/categories/{id}` | Categories | route id | `CategoryDtoApiResponse` | Yes | `Categories.View` | Active |
| masters | PUT | `/api/categories/{id}` | Categories | `UpdateCategoryCommand` | `CategoryDtoApiResponse` | Yes | `Categories.Edit` | Active |
| masters | DELETE | `/api/categories/{id}` | Categories | route id | `ApiResponse` | Yes | `Categories.Delete` | Active |
| masters | GET | `/api/units` | Units | `GetUnitsQuery` | `UnitListItemDtoPagedResultApiResponse` | Yes | `Units.View` | Active |
| masters | POST | `/api/units` | Units | `CreateUnitCommand` | `UnitDtoApiResponse` | Yes | `Units.Create` | Active |
| masters | GET | `/api/units/{id}` | Units | route id | `UnitDtoApiResponse` | Yes | `Units.View` | Active |
| masters | PUT | `/api/units/{id}` | Units | `UpdateUnitCommand` | `UnitDtoApiResponse` | Yes | `Units.Edit` | Active |
| masters | DELETE | `/api/units/{id}` | Units | route id | `ApiResponse` | Yes | `Units.Delete` | Active |
| items | GET | `/api/items` | Items | `GetItemsQuery` | `ItemListItemDtoPagedResultApiResponse` | Yes | `Items.View` | Active |
| items | POST | `/api/items` | Items | `CreateItemFormRequest` multipart | `ItemDtoApiResponse` | Yes | `Items.Create` | Active; image upload on create |
| items | GET | `/api/items/{id}` | Items | route id | `ItemDtoApiResponse` | Yes | `Items.View` | Active |
| items | PUT | `/api/items/{id}` | Items | `UpdateItemCommand` | `ItemDtoApiResponse` | Yes | `Items.Edit` | Active |
| items | DELETE | `/api/items/{id}` | Items | route id | `ApiResponse` | Yes | `Items.Delete` | Active |
| parties | GET | `/api/v1/parties` | Parties | `GetPartiesQuery` | `PartyListItemDtoPagedResultApiResponse` | Yes | `Party.View` | Active |
| parties | POST | `/api/v1/parties` | Parties | `CreatePartyCommand` | `PartyDtoApiResponse` | Yes | `Party.Create` | Active |
| parties | GET | `/api/v1/parties/{id}` | Parties | route id | `PartyDtoApiResponse` | Yes | `Party.View` | Active |
| parties | PUT | `/api/v1/parties/{id}` | Parties | `UpdatePartyCommand` | `PartyDtoApiResponse` | Yes | `Party.Edit` | Active |
| parties | DELETE | `/api/v1/parties/{id}` | Parties | route id | `ApiResponse` | Yes | `Party.Delete` | Active |
| parties | PATCH | `/api/v1/parties/{id}/status` | Parties | `ChangePartyStatusCommand` | `ApiResponse` | Yes | `Party.Edit` | Active |
| sales | GET | `/api/v1/sales/invoices` | SalesInvoices | `GetSalesInvoicesQuery` | `SalesInvoiceDtoPagedResultApiResponse` | Yes | `Sales.Invoice.View` | Active |
| sales | POST | `/api/v1/sales/invoices` | SalesInvoices | `CreateSalesInvoiceCommand` | `SalesInvoiceDetailDtoApiResponse` | Yes | `Sales.Invoice.Create` | Active |
| sales | GET | `/api/v1/sales/invoices/{id}` | SalesInvoices | route id | `SalesInvoiceDetailDtoApiResponse` | Yes | `Sales.Invoice.View` | Active |
| sales | PUT | `/api/v1/sales/invoices/{id}` | SalesInvoices | `UpdateSalesInvoiceCommand` | `SalesInvoiceDetailDtoApiResponse` | Yes | `Sales.Invoice.Edit` | Active |
| sales | POST | `/api/v1/sales/invoices/{id}/confirm` | SalesInvoices | route id | `SalesInvoiceDetailDtoApiResponse` | Yes | `Sales.Invoice.Approve` | Active; deducts stock |
| sales | POST | `/api/v1/sales/invoices/{id}/cancel` | SalesInvoices | route id | `SalesInvoiceDetailDtoApiResponse` | Yes | `Sales.Invoice.Delete` | Active |
| sales | POST | `/api/v1/sales/invoices/{id}/payments` | SalesInvoices | `AddSalesPaymentCommand` | `SalesPaymentDtoApiResponse` | Yes | `Sales.Invoice.Edit` | Active |
| sales | GET | `/api/v1/sales/invoices/{id}/payments` | SalesInvoices | route id | `SalesPaymentDtoIReadOnlyCollectionApiResponse` | Yes | `Sales.Invoice.View` | Active |
| reports | GET | `/api/v1/sales/reports/summary` | SalesReports | `GetSalesSummaryReportQuery` | `SalesSummaryReportDtoApiResponse` | Yes | `Sales.Report.View` | Active |
| reports | GET | `/api/v1/sales/reports/customer-receivables` | SalesReports | `GetCustomerReceivablesQuery` | `CustomerReceivableReportDtoIReadOnlyCollectionApiResponse` | Yes | `Sales.Report.View` | Active |
| reports | GET | `/api/v1/sales/reports/item-wise-sales` | SalesReports | `GetItemWiseSalesReportQuery` | `ItemWiseSalesReportDtoIReadOnlyCollectionApiResponse` | Yes | `Sales.Report.View` | Active |
| Purchase & Expense | GET | `/api/purchase-bills` | PurchaseBillsController | `PurchaseBillListQuery` | `OK` | Yes | `PurchaseExpense.PurchaseBill.View` | Active; schema not documented |
| Purchase & Expense | POST | `/api/purchase-bills` | PurchaseBillsController | `CreatePurchaseBillRequest` | `OK` | Yes | `PurchaseExpense.PurchaseBill.Create` | Active |
| Purchase & Expense | GET | `/api/purchase-bills/{id}` | PurchaseBillsController | route id | `OK` | Yes | `PurchaseExpense.PurchaseBill.View` | Active |
| Purchase & Expense | GET | `/api/purchase-bills/supplier/{supplierId}` | PurchaseBillsController | supplierId + `PurchaseBillListQuery` | `OK` | Yes | `PurchaseExpense.PurchaseBill.View` | Active |
| Purchase & Expense | PUT | `/api/purchase-bills/{id}` | PurchaseBillsController | `UpdatePurchaseBillRequest` | `OK` | Yes | `PurchaseExpense.PurchaseBill.Edit` | Active |
| Purchase & Expense | DELETE | `/api/purchase-bills/{id}` | PurchaseBillsController | route id | `OK` | Yes | `PurchaseExpense.PurchaseBill.Delete` | Active |
| Purchase & Expense | POST | `/api/purchase-bills/{id}/confirm` | PurchaseBillsController | route id | `OK` | Yes | `PurchaseExpense.PurchaseBill.Approve` | Active |
| Purchase & Expense | POST | `/api/purchase-bills/{id}/cancel` | PurchaseBillsController | route id | `OK` | Yes | `PurchaseExpense.PurchaseBill.Delete` | Active |
| Purchase & Expense | GET | `/api/purchase-orders` | PurchaseOrdersController | `PurchaseOrderListQuery` | `OK` | Yes | `PurchaseExpense.PurchaseOrder.View` | Active |
| Purchase & Expense | POST | `/api/purchase-orders` | PurchaseOrdersController | `CreatePurchaseOrderRequest` | `OK` | Yes | `PurchaseExpense.PurchaseOrder.Create` | Active |
| Purchase & Expense | GET | `/api/purchase-orders/{id}` | PurchaseOrdersController | route id | `OK` | Yes | `PurchaseExpense.PurchaseOrder.View` | Active |
| Purchase & Expense | PUT | `/api/purchase-orders/{id}` | PurchaseOrdersController | `UpdatePurchaseOrderRequest` | `OK` | Yes | `PurchaseExpense.PurchaseOrder.Edit` | Active |
| Purchase & Expense | DELETE | `/api/purchase-orders/{id}` | PurchaseOrdersController | route id | `OK` | Yes | `PurchaseExpense.PurchaseOrder.Delete` | Active |
| Purchase & Expense | POST | `/api/purchase-orders/{id}/cancel` | PurchaseOrdersController | route id | `OK` | Yes | `PurchaseExpense.PurchaseOrder.Delete` | Active |
| Purchase & Expense | POST | `/api/purchase-orders/{id}/convert-to-purchase-bill` | PurchaseOrdersController | `ConvertPurchaseOrderRequest` | `OK` | Yes | `PurchaseExpense.PurchaseOrder.Approve` | Active |
| Purchase & Expense | GET | `/api/purchase-returns` | PurchaseReturnsController | `PurchaseReturnListQuery` | `OK` | Yes | `PurchaseExpense.PurchaseReturn.View` | Active |
| Purchase & Expense | POST | `/api/purchase-returns` | PurchaseReturnsController | `CreatePurchaseReturnRequest` | `OK` | Yes | `PurchaseExpense.PurchaseReturn.Create` | Active |
| Purchase & Expense | GET | `/api/purchase-returns/{id}` | PurchaseReturnsController | route id | `OK` | Yes | `PurchaseExpense.PurchaseReturn.View` | Active |
| Purchase & Expense | PUT | `/api/purchase-returns/{id}` | PurchaseReturnsController | `UpdatePurchaseReturnRequest` | `OK` | Yes | `PurchaseExpense.PurchaseReturn.Edit` | Active |
| Purchase & Expense | DELETE | `/api/purchase-returns/{id}` | PurchaseReturnsController | route id | `OK` | Yes | `PurchaseExpense.PurchaseReturn.Delete` | Active |
| Purchase & Expense | GET | `/api/supplier-payments` | SupplierPaymentsController | `SupplierPaymentListQuery` | `OK` | Yes | `PurchaseExpense.PaymentOut.View` | Active |
| Purchase & Expense | POST | `/api/supplier-payments` | SupplierPaymentsController | `CreateSupplierPaymentRequest` | `OK` | Yes | `PurchaseExpense.PaymentOut.Create` | Active |
| Purchase & Expense | GET | `/api/supplier-payments/{id}` | SupplierPaymentsController | route id | `OK` | Yes | `PurchaseExpense.PaymentOut.View` | Active |
| Purchase & Expense | PUT | `/api/supplier-payments/{id}` | SupplierPaymentsController | `UpdateSupplierPaymentRequest` | `OK` | Yes | `PurchaseExpense.PaymentOut.Edit` | Active |
| Purchase & Expense | DELETE | `/api/supplier-payments/{id}` | SupplierPaymentsController | route id | `OK` | Yes | `PurchaseExpense.PaymentOut.Delete` | Active |
| Purchase & Expense | GET | `/api/expense-categories` | ExpenseCategoriesController | `ExpenseCategoryListQuery` | `OK` | Yes | `PurchaseExpense.ExpenseCategory.View` | Active |
| Purchase & Expense | POST | `/api/expense-categories` | ExpenseCategoriesController | `CreateExpenseCategoryRequest` | `OK` | Yes | `PurchaseExpense.ExpenseCategory.Create` | Active |
| Purchase & Expense | GET | `/api/expense-categories/{id}` | ExpenseCategoriesController | route id | `OK` | Yes | `PurchaseExpense.ExpenseCategory.View` | Active |
| Purchase & Expense | PUT | `/api/expense-categories/{id}` | ExpenseCategoriesController | `UpdateExpenseCategoryRequest` | `OK` | Yes | `PurchaseExpense.ExpenseCategory.Edit` | Active |
| Purchase & Expense | DELETE | `/api/expense-categories/{id}` | ExpenseCategoriesController | route id | `OK` | Yes | `PurchaseExpense.ExpenseCategory.Delete` | Active |
| Purchase & Expense | GET | `/api/expenses` | ExpensesController | `ExpenseListQuery` | `OK` | Yes | `PurchaseExpense.Expense.View` | Active |
| Purchase & Expense | POST | `/api/expenses` | ExpensesController | `CreateExpenseRequest` | `OK` | Yes | `PurchaseExpense.Expense.Create` | Active |
| Purchase & Expense | GET | `/api/expenses/{id}` | ExpensesController | route id | `OK` | Yes | `PurchaseExpense.Expense.View` | Active |
| Purchase & Expense | PUT | `/api/expenses/{id}` | ExpensesController | `UpdateExpenseRequest` | `OK` | Yes | `PurchaseExpense.Expense.Edit` | Active |
| Purchase & Expense | DELETE | `/api/expenses/{id}` | ExpensesController | route id | `OK` | Yes | `PurchaseExpense.Expense.Delete` | Active |
| Purchase & Expense | GET | `/api/purchase-expense/reports/purchase-summary` | PurchaseExpenseReportsController | `DateRangeReportQuery` | `OK` | Yes | `PurchaseExpense.Report.View` | Active |
| Purchase & Expense | GET | `/api/purchase-expense/reports/supplier-outstanding` | PurchaseExpenseReportsController | none | `OK` | Yes | `PurchaseExpense.Report.View` | Active |
| Purchase & Expense | GET | `/api/purchase-expense/reports/expense-summary` | PurchaseExpenseReportsController | `DateRangeReportQuery` | `OK` | Yes | `PurchaseExpense.Report.View` | Active |
| Purchase & Expense | GET | `/api/purchase-expense/reports/category-wise-expense` | PurchaseExpenseReportsController | `DateRangeReportQuery` | `OK` | Yes | `PurchaseExpense.Report.View` | Active |
| Purchase & Expense | GET | `/api/purchase-expense/reports/item-purchase-history` | PurchaseExpenseReportsController | `itemId` query | `OK` | Yes | `PurchaseExpense.Report.View` | Active |
| gst | GET | `/api/v1/gst/configuration/status` | GstConfiguration | none | `GstConfigurationStatusResponseApiResponse` | Yes | `GST.Configuration.View` | Active |
| gst | GET | `/api/v1/gst/registrations` | GstRegistrations | `CompanyGstRegistrationListRequest` | `CompanyGstRegistrationResponsePagedResultApiResponse` | Yes | `GST.Registration.View` | Active |
| gst | POST | `/api/v1/gst/registrations` | GstRegistrations | `CreateCompanyGstRegistrationRequest` | `CompanyGstRegistrationResponseApiResponse` | Yes | `GST.Registration.Create` | Active |
| gst | GET | `/api/v1/gst/registrations/{id}` | GstRegistrations | route id | `CompanyGstRegistrationResponseApiResponse` | Yes | `GST.Registration.View` | Active |
| gst | PUT | `/api/v1/gst/registrations/{id}` | GstRegistrations | `UpdateCompanyGstRegistrationRequest` | `CompanyGstRegistrationResponseApiResponse` | Yes | `GST.Registration.Edit` | Active |
| gst | DELETE | `/api/v1/gst/registrations/{id}` | GstRegistrations | route id | `ApiResponse` | Yes | `GST.Registration.Delete` | Active |
| gst | POST | `/api/v1/gst/registrations/{id}/verify` | GstRegistrations | route id | `CompanyGstRegistrationResponseApiResponse` | Yes | `GST.Registration.Approve` | Active |
| gst | POST | `/api/v1/gst/registrations/{id}/set-default` | GstRegistrations | `SetDefaultCompanyGstRegistrationRequest` | `CompanyGstRegistrationResponseApiResponse` | Yes | `GST.Registration.Edit` | Active |
| gst | POST | `/api/v1/gst/verify-gstin` | GstVerification | `VerifyGstinRequest` | `GstinVerificationResponseApiResponse` | Yes | `GST.Verification.View` | Active; calls/cache GSTZen |
| gst | POST | `/api/v1/gst/sessions/generate-otp` | GstSessions | `GenerateGstOtpRequest` | `GstSessionResponseApiResponse` | Yes | `GST.Session.Edit` | Active; path config blank Needs Verification |
| gst | POST | `/api/v1/gst/sessions/authenticate-otp` | GstSessions | `AuthenticateGstOtpRequest` | `GstSessionResponseApiResponse` | Yes | `GST.Session.Edit` | Active; path config blank Needs Verification |
| gst | GET | `/api/v1/gst/sessions/{companyGstRegistrationId}/status` | GstSessions | route id | `GstSessionResponseApiResponse` | Yes | `GST.Session.View` | Active |
| gst | POST | `/api/v1/gst/eway-bills/generate` | EWayBills | `GenerateEWayBillRequest` | `EWayBillResponseApiResponse` | Yes | `GST.EWayBill.Create` | Active |
| gst | POST | `/api/v1/gst/eway-bills/cancel` | EWayBills | `CancelEWayBillRequest` | `EWayBillResponseApiResponse` | Yes | `GST.EWayBill.Delete` | Active |
| gst | POST | `/api/v1/gst/eway-bills/update-vehicle` | EWayBills | `UpdateEWayBillVehicleRequest` | `EWayBillResponseApiResponse` | Yes | `GST.EWayBill.Edit` | Active |
| gst | POST | `/api/v1/gst/eway-bills/extend` | EWayBills | `ExtendEWayBillRequest` | `EWayBillResponseApiResponse` | Yes | `GST.EWayBill.Edit` | Active; extend path blank Needs Verification |
| gst | POST | `/api/v1/gst/eway-bills/get-details` | EWayBills | `GetEWayBillDetailsRequest` | `EWayBillResponseApiResponse` | Yes | `GST.EWayBill.View` | Active |
| gst | GET | `/api/v1/gst/eway-bills/{ewayBillNumber}` | EWayBills | route ewayBillNumber | `EWayBillResponseApiResponse` | Yes | `GST.EWayBill.View` | Active |
| gst | POST | `/api/v1/gst/e-invoices/generate` | EInvoices | `GenerateEInvoiceRequest` | `EInvoiceResponseApiResponse` | Yes | `GST.EInvoice.Create` | Active |
| gst | POST | `/api/v1/gst/e-invoices/cancel` | EInvoices | `CancelEInvoiceRequest` | `EInvoiceResponseApiResponse` | Yes | `GST.EInvoice.Delete` | Active |
| gst | POST | `/api/v1/gst/e-invoices/get-details` | EInvoices | `GetEInvoiceDetailsRequest` | `EInvoiceResponseApiResponse` | Yes | `GST.EInvoice.View` | Active |
| gst | GET | `/api/v1/gst/e-invoices/{irn}` | EInvoices | route irn | `EInvoiceResponseApiResponse` | Yes | `GST.EInvoice.View` | Active |
| gst | GET | `/api/v1/gst/api-logs` | GstApiLogs | `GstApiLogListRequest` | `GstApiLogResponsePagedResultApiResponse` | Yes | `GST.Logs.View` | Active |
| OEE | GET | `/api/v1/oee/dashboard/summary` | OeeDashboard | `OeeDateRangeRequest` | `OeeDashboardSummaryDtoApiResponse` | Yes | `OEE.Dashboard.View` | Active |
| OEE | GET | `/api/v1/oee/dashboard/machine-wise` | OeeDashboard | `OeeDateRangeRequest` | `OeeMachineWiseDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Dashboard.View` | Active |
| OEE | GET | `/api/v1/oee/dashboard/mould-wise` | OeeDashboard | `OeeDateRangeRequest` | `OeeMouldWiseDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Dashboard.View` | Active |
| OEE | GET | `/api/v1/oee/dashboard/top-downtime-reasons` | OeeDashboard | `OeeDateRangeRequest` | `OeeDowntimeReasonSummaryDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Dashboard.View` | Active |
| OEE | GET | `/api/v1/oee/dashboard/daily-trend` | OeeDashboard | `OeeDateRangeRequest` | `OeeDailyTrendDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Dashboard.View` | Active |
| OEE | GET | `/api/v1/oee/machines` | OeeMachines | `OeePagedRequest` | `OeeMachineDtoPagedResultApiResponse` | Yes | `OEE.Machines.View` | Active |
| OEE | POST | `/api/v1/oee/machines` | OeeMachines | `CreateOeeMachineRequest` | `OeeMachineDtoApiResponse` | Yes | `OEE.Machines.Create` | Active |
| OEE | GET | `/api/v1/oee/machines/{id}` | OeeMachines | route id | `OeeMachineDtoApiResponse` | Yes | `OEE.Machines.View` | Active |
| OEE | PUT | `/api/v1/oee/machines/{id}` | OeeMachines | `UpdateOeeMachineRequest` | `OeeMachineDtoApiResponse` | Yes | `OEE.Machines.Edit` | Active |
| OEE | DELETE | `/api/v1/oee/machines/{id}` | OeeMachines | route id | `ApiResponse` | Yes | `OEE.Machines.Delete` | Active |
| OEE | GET | `/api/v1/oee/moulds` | OeeMoulds | `OeePagedRequest` | `OeeMouldDtoPagedResultApiResponse` | Yes | `OEE.Moulds.View` | Active |
| OEE | POST | `/api/v1/oee/moulds` | OeeMoulds | `CreateOeeMouldRequest` | `OeeMouldDtoApiResponse` | Yes | `OEE.Moulds.Create` | Active |
| OEE | GET | `/api/v1/oee/moulds/{id}` | OeeMoulds | route id | `OeeMouldDtoApiResponse` | Yes | `OEE.Moulds.View` | Active |
| OEE | PUT | `/api/v1/oee/moulds/{id}` | OeeMoulds | `UpdateOeeMouldRequest` | `OeeMouldDtoApiResponse` | Yes | `OEE.Moulds.Edit` | Active |
| OEE | DELETE | `/api/v1/oee/moulds/{id}` | OeeMoulds | route id | `ApiResponse` | Yes | `OEE.Moulds.Delete` | Active |
| OEE | GET | `/api/v1/oee/downtime-reasons` | OeeDowntimeReasons | `OeePagedRequest` | `OeeDowntimeReasonDtoPagedResultApiResponse` | Yes | `OEE.DowntimeReasons.View` | Active |
| OEE | POST | `/api/v1/oee/downtime-reasons` | OeeDowntimeReasons | `CreateOeeDowntimeReasonRequest` | `OeeDowntimeReasonDtoApiResponse` | Yes | `OEE.DowntimeReasons.Create` | Active |
| OEE | GET | `/api/v1/oee/downtime-reasons/{id}` | OeeDowntimeReasons | route id | `OeeDowntimeReasonDtoApiResponse` | Yes | `OEE.DowntimeReasons.View` | Active |
| OEE | PUT | `/api/v1/oee/downtime-reasons/{id}` | OeeDowntimeReasons | `UpdateOeeDowntimeReasonRequest` | `OeeDowntimeReasonDtoApiResponse` | Yes | `OEE.DowntimeReasons.Edit` | Active |
| OEE | DELETE | `/api/v1/oee/downtime-reasons/{id}` | OeeDowntimeReasons | route id | `ApiResponse` | Yes | `OEE.DowntimeReasons.Delete` | Active |
| OEE | POST | `/api/v1/oee/production-entries/bulk` | OeeProductionEntries | `BulkCreateOeeProductionEntriesRequest` | `OeeProductionEntryDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.ProductionEntries.Create` | Active |
| OEE | GET | `/api/v1/oee/production-entries` | OeeProductionEntries | `OeeProductionEntryListRequest` | `OeeProductionEntryDtoPagedResultApiResponse` | Yes | `OEE.ProductionEntries.View` | Active |
| OEE | GET | `/api/v1/oee/production-entries/{id}` | OeeProductionEntries | route id | `OeeProductionEntryDtoApiResponse` | Yes | `OEE.ProductionEntries.View` | Active |
| OEE | PUT | `/api/v1/oee/production-entries/{id}` | OeeProductionEntries | `UpdateOeeProductionEntryRequest` | `OeeProductionEntryDtoApiResponse` | Yes | `OEE.ProductionEntries.Edit` | Active |
| OEE | DELETE | `/api/v1/oee/production-entries/{id}` | OeeProductionEntries | route id | `ApiResponse` | Yes | `OEE.ProductionEntries.Delete` | Active |
| OEE | GET | `/api/v1/oee/reports/daily` | OeeReports | `OeeReportRequest` | `OeeDailyReportDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Reports.View` | Active |
| OEE | GET | `/api/v1/oee/reports/machine-performance` | OeeReports | `OeeReportRequest` | `OeeMachineWiseDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Reports.View` | Active |
| OEE | GET | `/api/v1/oee/reports/mould-performance` | OeeReports | `OeeReportRequest` | `OeeMouldWiseDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Reports.View` | Active |
| OEE | GET | `/api/v1/oee/reports/downtime` | OeeReports | `OeeReportRequest` | `OeeDowntimeReasonSummaryDtoIReadOnlyCollectionApiResponse` | Yes | `OEE.Reports.View` | Active |
| OEE | GET | `/api/v1/oee/reports/export/excel` | OeeReports | `OeeReportRequest` | `string` | Yes | `OEE.Reports.Export` | Needs Verification |
| hr | GET | `/api/hr/departments` | Departments | `HrPagedQuery` | `OK` | Yes | `HR.Department.View` | Active |
| hr | POST | `/api/hr/departments` | Departments | `CreateDepartmentCommand` | `OK` | Yes | `HR.Department.Create` | Active |
| hr | GET | `/api/hr/departments/{id}` | Departments | route id | `OK` | Yes | `HR.Department.View` | Active |
| hr | PUT | `/api/hr/departments/{id}` | Departments | `UpdateDepartmentCommand` | `OK` | Yes | `HR.Department.Edit` | Active |
| hr | DELETE | `/api/hr/departments/{id}` | Departments | route id | `OK` | Yes | `HR.Department.Delete` | Active |
| hr | GET | `/api/hr/designations` | Designations | `HrPagedQuery` | `OK` | Yes | `HR.Designation.View` | Active |
| hr | POST | `/api/hr/designations` | Designations | `CreateDesignationCommand` | `OK` | Yes | `HR.Designation.Create` | Active |
| hr | GET | `/api/hr/designations/{id}` | Designations | route id | `OK` | Yes | `HR.Designation.View` | Active |
| hr | PUT | `/api/hr/designations/{id}` | Designations | `UpdateDesignationCommand` | `OK` | Yes | `HR.Designation.Edit` | Active |
| hr | DELETE | `/api/hr/designations/{id}` | Designations | route id | `OK` | Yes | `HR.Designation.Delete` | Active |
| hr | GET | `/api/hr/shifts` | Shifts | `HrPagedQuery` | `OK` | Yes | `HR.Shift.View` | Active |
| hr | POST | `/api/hr/shifts` | Shifts | `CreateShiftCommand` | `OK` | Yes | `HR.Shift.Create` | Active |
| hr | GET | `/api/hr/shifts/{id}` | Shifts | route id | `OK` | Yes | `HR.Shift.View` | Active |
| hr | PUT | `/api/hr/shifts/{id}` | Shifts | `UpdateShiftCommand` | `OK` | Yes | `HR.Shift.Edit` | Active |
| hr | DELETE | `/api/hr/shifts/{id}` | Shifts | route id | `OK` | Yes | `HR.Shift.Delete` | Active |
| hr | GET | `/api/hr/employees` | Employees | `GetEmployeesQuery` | `EmployeeListItemDtoPagedResultApiResponse` | Yes | `HR.Employee.View` | Active |
| hr | POST | `/api/hr/employees` | Employees | `CreateEmployeeCommand` | `EmployeeDtoApiResponse` | Yes | `HR.Employee.Create` | Active |
| hr | GET | `/api/hr/employees/dropdown` | Employees | `search`, `includeResigned` | `EmployeeDropdownDtoIReadOnlyCollectionApiResponse` | Yes | `HR.Employee.View` | Active |
| hr | GET | `/api/hr/employees/reporting-managers` | Employees | `departmentId`, `excludingEmployeeId` | `OK` | Yes | `HR.Employee.View` | Active |
| hr | GET | `/api/hr/employees/{id}` | Employees | route id | `EmployeeDtoApiResponse` | Yes | `HR.Employee.View` | Active |
| hr | PUT | `/api/hr/employees/{id}` | Employees | `UpdateEmployeeCommand` | `EmployeeDtoApiResponse` | Yes | `HR.Employee.Edit` | Active |
| hr | PUT | `/api/hr/employees/{id}/resign` | Employees | `ResignEmployeeCommand` | `EmployeeDtoApiResponse` | Yes | `HR.Employee.Edit` | Active |
| hr | PUT | `/api/hr/employees/{id}/rejoin` | Employees | `RejoinEmployeeCommand` | `EmployeeDtoApiResponse` | Yes | `HR.Employee.Edit` | Active |
| hr | DELETE | `/api/hr/employees/{id}` | Employees | route id | `ApiResponse` | Yes | `HR.Employee.Delete` | Active |
| hr | GET | `/api/hr/employees/{id}/documents` | Employees | route id | `OK` | Yes | `HR.Employee.View` | Metadata only |
| hr | POST | `/api/hr/employees/{id}/documents` | Employees | `AddEmployeeDocumentCommand` | `OK` | Yes | `HR.Employee.Edit` | Metadata only |
| hr | DELETE | `/api/hr/employees/documents/{id}` | Employees | route id | `OK` | Yes | `HR.Employee.Edit` | Active |
| hr | GET | `/api/hr/employees/{id}/bank-details` | Employees | route id | `OK` | Yes | `HR.Employee.View` | Active |
| hr | POST | `/api/hr/employees/{id}/bank-details` | Employees | `AddEmployeeBankDetailsCommand` | `OK` | Yes | `HR.Employee.Edit` | Active |
| hr | POST | `/api/hr/attendance/check-in` | Attendance | `AttendanceCheckInCommand` | `OK` | Yes | `HR.Attendance.Edit` | Active |
| hr | POST | `/api/hr/attendance/check-out` | Attendance | `AttendanceCheckOutCommand` | `OK` | Yes | `HR.Attendance.Edit` | Active |
| hr | POST | `/api/hr/attendance/manual-entry` | Attendance | `AttendanceManualEntryCommand` | `OK` | Yes | `HR.Attendance.Edit` | Active |
| hr | GET | `/api/hr/attendance` | Attendance | `AttendanceListQuery` | `OK` | Yes | `HR.Attendance.View` | Active |
| hr | GET | `/api/hr/attendance/{employeeId}` | Attendance | `fromDate`, `toDate` | `OK` | Yes | `HR.Attendance.View` | Active |
| hr | POST | `/api/hr/attendance/adjustment-request` | Attendance | `AttendanceAdjustmentRequestCommand` | `OK` | Yes | `HR.Attendance.Edit` | Active |
| hr | POST | `/api/hr/attendance/approve-adjustment` | Attendance | `AttendanceAdjustmentDecisionCommand` | `OK` | Yes | `HR.Attendance.Approve` | Active |
| hr | POST | `/api/hr/attendance/reject-adjustment` | Attendance | `AttendanceAdjustmentDecisionCommand` | `OK` | Yes | `HR.Attendance.Approve` | Active |
| hr | GET | `/api/hr/attendance/monthly-report` | Attendance | `MonthlyAttendanceReportQuery` | `OK` | Yes | `HR.Attendance.View` | Active |
| hr | GET | `/api/hr/attendance/department-report` | Attendance | `DepartmentAttendanceReportQuery` | `OK` | Yes | `HR.Attendance.View` | Active |
| hr | GET | `/api/hr/leaves` | Leaves | `LeaveListQuery` | `OK` | Yes | `HR.Leave.View` | Active |
| hr | POST | `/api/hr/leaves/apply` | Leaves | `ApplyLeaveCommand` | `OK` | Yes | `HR.Leave.Create` | Active |
| hr | POST | `/api/hr/leaves/cancel` | Leaves | `LeaveActionCommand` | `OK` | Yes | `HR.Leave.Create` | Active |
| hr | POST | `/api/hr/leaves/approve` | Leaves | `LeaveActionCommand` | `OK` | Yes | `HR.Leave.Approve` | Active |
| hr | POST | `/api/hr/leaves/reject` | Leaves | `LeaveActionCommand` | `OK` | Yes | `HR.Leave.Approve` | Active |
| hr | GET | `/api/hr/leaves/balance` | Leaves | `employeeId` | `OK` | Yes | `HR.Leave.View` | Active |
| hr | GET | `/api/hr/leaves/pending-approvals` | Leaves | `PendingLeaveApprovalsQuery` | `OK` | Yes | `HR.Leave.Approve` | Active |
| hr | POST | `/api/hr/payroll/process` | Payroll | `ProcessPayrollCommand` | `OK` | Yes | `HR.Payroll.Create` | Active |
| hr | POST | `/api/hr/payroll/approve` | Payroll | `ApprovePayrollCommand` | `OK` | Yes | `HR.Payroll.Approve` | Active |
| hr | GET | `/api/hr/payroll/run/{id}` | Payroll | route id | `OK` | Yes | `HR.Payroll.View` | Active |
| hr | GET | `/api/hr/payroll/history/{employeeId}` | Payroll | route employeeId | `OK` | Yes | `HR.Payroll.View` | Active |
| hr | GET | `/api/hr/payroll/payslip/{employeeId}` | Payroll | `payrollMonth`, `payrollYear` | `OK` | Yes | `HR.Payroll.View` | Active |
| settings | POST | `/api/auth/login` | Auth | `LoginRequest` | `LoginResponseApiResponse` | No | None | Active |
| settings | POST | `/api/auth/refresh-token` | Auth | `RefreshTokenRequest` | `LoginResponseApiResponse` | No | None | Active |
| settings | POST | `/api/auth/logout` | Auth | `LogoutRequest` | `ApiResponse` | Yes | None | Active |
| settings | POST | `/api/auth/change-password` | Auth | `ChangePasswordRequest` | `ApiResponse` | Yes | None | Active |
| settings | POST | `/api/auth/forgot-password` | Auth | `ForgotPasswordRequest` | `ApiResponse` | No | None | Token only; email missing |
| settings | POST | `/api/auth/reset-password` | Auth | `ResetPasswordRequest` | `ApiResponse` | No | None | Active |
| settings | GET | `/api/users` | Users | none | `UserDtoIReadOnlyCollectionApiResponse` | Yes | `Users.View` | Active |
| settings | POST | `/api/users` | Users | `CreateUserRequest` | `OK` | Yes | `Users.Create` | Active |
| settings | GET | `/api/users/{id}` | Users | route id | `OK` | Yes | `Users.View` | Active |
| settings | PUT | `/api/users/{id}` | Users | `UpdateUserRequest` | `OK` | Yes | `Users.Edit` | Active |
| settings | DELETE | `/api/users/{id}` | Users | route id | `OK` | Yes | `Users.Delete` | Active |
| settings | PATCH | `/api/users/{id}/activate` | Users | route id | `OK` | Yes | `Users.Edit` | Active |
| settings | PATCH | `/api/users/{id}/deactivate` | Users | route id | `OK` | Yes | `Users.Edit` | Active |
| settings | POST | `/api/users/{id}/roles` | Users | `AssignUserRolesRequest` | `OK` | Yes | `Users.Edit` | Active |
| settings | GET | `/api/roles` | Roles | none | `OK` | Yes | `Roles.View` | Active |
| settings | POST | `/api/roles` | Roles | `CreateRoleRequest` | `OK` | Yes | `Roles.Create` | Active |
| settings | GET | `/api/roles/{id}` | Roles | route id | `OK` | Yes | `Roles.View` | Active |
| settings | PUT | `/api/roles/{id}` | Roles | `UpdateRoleRequest` | `OK` | Yes | `Roles.Edit` | Active |
| settings | DELETE | `/api/roles/{id}` | Roles | route id | `OK` | Yes | `Roles.Delete` | Active |
| settings | GET | `/api/pages` | Pages | none | `OK` | Yes | `Pages.View` | Active |
| settings | POST | `/api/pages` | Pages | `CreatePageRequest` | `OK` | Yes | `Pages.Create` | Active |
| settings | GET | `/api/pages/{id}` | Pages | route id | `OK` | Yes | `Pages.View` | Active |
| settings | PUT | `/api/pages/{id}` | Pages | `UpdatePageRequest` | `OK` | Yes | `Pages.Edit` | Active |
| settings | DELETE | `/api/pages/{id}` | Pages | route id | `OK` | Yes | `Pages.Delete` | Active |
| settings | GET | `/api/permissions/role/{roleId}` | Permissions | route roleId | `OK` | Yes | `Permissions.View` | Active |
| settings | PUT | `/api/permissions/role/{roleId}` | Permissions | `SaveRolePermissionsRequest` | `OK` | Yes | `Permissions.Edit` | Active |
| settings | GET | `/api/v1/settings/party` | PartySettings | none | `PartySettingsDtoApiResponse` | Yes | `Party.View` | Active |
| settings | PUT | `/api/v1/settings/party` | PartySettings | `UpdatePartySettingsCommand` | `PartySettingsDtoApiResponse` | Yes | `Party.Edit` | Active |

## 6. Database Review

### Database scripts reviewed

| Script | Purpose | Notes |
|---|---|---|
| `backend/database/000_Reset_Database.sql` | Reset/drop database objects. | Destructive by design; do not run casually. |
| `backend/database/001_Full_Database_Setup.sql` | Main schema, stored procedures, seeds for security, party, items, HR, sales, purchase/expense. | Large monolithic setup script. |
| `backend/database/002_Verify_Database_Setup.sql` | Intended verification script. | File content is only a few bytes; effectively empty. |
| `backend/database/003_gst_integration_module.sql` | GST/GSTZen schema, procedures, pages, permissions. | Separate from main setup; must be included in deployment order. |
| `backend/database/migrations/20260703_oee_module.sql` | OEE schema, seed data, procedures, pages, permissions. | Separate migration; must be included after main setup. |
| `backend/database/migrations/20260703_hr_employee_resignation_rejoin.sql` | HR employee resignation/rejoin columns and procedure updates. | Separate migration; must be included after HR tables exist. |
| `Database_Verification_Output/*` | Generated schema/index/master-data/integrity/manual-review fixes. | Review artifact; not integrated into primary setup automatically. |

### Tables

Security/system:
- `Users`, `Roles`, `UserRoles`, `Pages`, `RolePermissions`, `RefreshTokens`, `PasswordResetTokens`, `AuditLogs`

Party/items:
- `Parties`, `PartySettings`, `Units`, `Categories`, `Items`

Sales/inventory:
- `SalesInvoices`, `SalesInvoiceItems`, `SalesInvoicePayments`, `StockMovements`, `NumberSequences`, `PaymentModes`

Purchase/expense:
- `PurchaseBills`, `PurchaseBillItems`, `SupplierPayments`, `SupplierPaymentAllocations`, `ExpenseCategories`, `Expenses`, `PurchaseOrders`, `PurchaseOrderItems`, `PurchaseReturns`, `PurchaseReturnItems`, `PartyLedgerEntries`

HR:
- `HR_Departments`, `HR_Designations`, `HR_Shifts`, `HR_Employees`, `HR_EmployeeAddresses`, `HR_EmployeeDocuments`, `HR_EmployeeBankAccounts`, `HR_Attendance`, `HR_AttendanceAdjustments`, `HR_LeaveTypes`, `HR_LeaveApplications`, `HR_LeaveBalances`, `HR_SalaryComponents`, `HR_SalaryStructures`, `HR_SalaryStructureComponents`, `HR_EmployeeSalaryStructures`, `HR_PayrollRuns`, `HR_PayrollDetails`

GST:
- `CompanyGstRegistrations`, `CompanyGstSessions`, `GstVerificationLogs`, `EWayBills`, `EInvoices`, `GstApiLogs`

OEE:
- `OeeMachines`, `OeeMoulds`, `OeeDowntimeReasons`, `OeeProductionEntries`

### Important columns and relationships

- `Users`: username/email/password hash, active/deleted flags.
- `RolePermissions`: permission flags `CanView`, `CanCreate`, `CanEdit`, `CanDelete`, `CanExport`, `CanApprove`.
- `Pages`: page `Name`, `DisplayName`, `Route`, `Icon`, parent page, sort order.
- `Items`: category/unit foreign keys, item type, GST rate, price and stock fields.
- `SalesInvoices` and `PurchaseBills`: totals, payment status, status, party links, audit fields.
- `StockMovements`: item, source type/id, movement type, quantity.
- `HR_Employees`: department/designation/shift/reporting manager plus resignation/rejoin fields after migration.
- `CompanyGstRegistrations`: GSTIN, legal/trade names, feature flags for e-invoice/e-way bill/returns, default flag.
- `OeeProductionEntries`: production date, machine, mould, machine on time, shot count, downtime reason, calculated OEE fields.

### Indexes

Important indexes found:
- Security: users active/deleted, user roles by role, pages parent/sort, role permissions by page, refresh token lookup, audit table/record.
- Party/items: party name/mobile/GSTIN/deleted, unique active unit/category names, unique active item code, item barcode/name/category/unit.
- HR: unique active codes/names for departments/designations/shifts/employees; attendance uniqueness by employee/date; payroll uniqueness by period/run/employee.
- Sales/purchase: invoice date/customer, sales invoice items/payments by invoice, purchase bill/order/return/payment number/date/supplier indexes.
- GST: active unique GSTIN, registration company/branch/state/status, verification cache, e-way/e-invoice identifiers/status, API log filters.
- OEE: active unique machine code/mould name/downtime reason, production date+machine uniqueness, date/machine/mould/downtime indexes.
- `Database_Verification_Output/03_INDEX_FIXES.sql` contains additional suggested indexes not reflected as guaranteed in primary setup. Needs Verification before applying.

### Stored procedures

Stored procedure coverage is broad and module-aligned:
- Auth: `sp_Auth_Login`, refresh/logout/change/forgot/reset password, save refresh token.
- Users/roles/pages/permissions: `sp_User_*`, `sp_Role_*`, `sp_Page_*`, `sp_Permission_*`.
- Audit: `sp_AuditLog_Create`.
- Party/settings: `sp_Party_*`, `sp_PartySettings_*`.
- Items/masters: `sp_Category_*`, `sp_Unit_*`, `sp_Item_*`.
- Sales: `sp_SalesInvoice_*`, `sp_SalesReport_*`, existence checks.
- Purchase/expense: `sp_PurchaseBill_*`, `sp_PurchaseOrder_*`, `sp_PurchaseReturn_*`, `sp_SupplierPayment_*`, `sp_Expense*`, `sp_PurchaseExpenseReport_*`.
- HR: `sp_HR_Department_*`, `sp_HR_Designation_*`, `sp_HR_Shift_*`, `sp_HR_Employee_*`, attendance, leave, payroll procedures.
- GST: `sp_GstRegistration_*`, `sp_GstVerification*`, `sp_EWayBill_*`, `sp_EInvoice_*`, `sp_GstSession_*`, `sp_GstApiLog_*`.
- OEE: `sp_OeeMachine_*`, `sp_OeeMould_*`, `sp_OeeDowntimeReason_*`, `sp_OeeProductionEntry_*`, `sp_OeeDashboard_*`, `sp_OeeReport_*`.

### Seed/master data

Seed data found:
- Role: `SuperAdmin`.
- User: `admin` / `admin@cosmoserp.com` with committed BCrypt hash.
- Pages and SuperAdmin permissions for security, party, items, HR, sales, purchase/expense, GST, OEE.
- Master data: HR leave/payroll/shift-related data, payment modes, OEE machines/downtime reasons/moulds were found in scripts.

Missing/inconsistent scripts:
- `002_Verify_Database_Setup.sql` is empty and should not be treated as real verification.
- GST and OEE are separate scripts/migrations; fresh database deployment must define order explicitly.
- Verification output scripts are not folded into the main database setup and may represent unresolved issues.
- No automated migration runner found.

## 7. Authentication & Authorization

JWT status:
- JWT bearer authentication is configured in `Cosmos.Infrastructure.DependencyInjection`.
- Tokens validate issuer, audience, signing key, lifetime, and use 30-second clock skew.
- `JwtTokenService` creates access tokens; tests verify identity claims and that roles/permissions/pages are not embedded.
- Access token lifetime configured as 15 minutes.
- Refresh token duration configured as 30 days.

Login/refresh flow:
- `POST /api/auth/login` validates BCrypt password, creates access token, saves refresh token, returns roles and page permissions.
- `POST /api/auth/refresh-token` validates refresh token from SQL, revokes it, and issues a rotated refresh token.
- `POST /api/auth/logout` revokes refresh token.
- `POST /api/auth/change-password` requires JWT.
- Forgot/reset password APIs exist, but email delivery is missing.

Role system:
- Roles stored in `Roles`.
- User-role links stored in `UserRoles`.
- Role CRUD APIs exist.

Permission system:
- Permissions are page-based and stored in `RolePermissions`.
- Supported actions: `View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`.
- `[RequirePermission(pageName, action)]` checks SQL via `PermissionService.UserHasPermissionAsync`.
- `RequirePermissionFilter` returns 401 when unauthenticated/missing `UserId`, 403 when permission check fails.

Page/menu system:
- Pages table provides `Name`, `DisplayName`, `Route`, `Icon`, parent page, sort order, active flag.
- Login response returns pages/permissions for frontend authorization state.
- Frontend should build menus from page permission data, not hard-code availability.

Frontend usage notes:
- Store access token separately from permission state.
- Treat permissions from login/refresh as database-sourced authorization state.
- Hide/disable UI actions by page/action flags, but still expect backend enforcement.
- Refresh token flow should update both token and permissions.

Issues/missing:
- Secrets and tokens are committed in `appsettings.json`.
- Password reset tokens are raw tokens in database scripts.
- No email provider for reset flow.
- No account lockout/MFA found.

## 8. Swagger & API Documentation

Swagger setup:
- Swagger is configured in `Program.cs` with documents: `dashboard`, `masters`, `items`, `parties`, `sales`, `Purchase & Expense`, `gst`, `OEE`, `hr`, `reports`, `settings`, `general`.
- Controllers use `[ApiExplorerSettings(GroupName = "...")]`.
- Bearer security definition is configured globally.
- XML comments are included if generated files exist.

Current grouping:
- Empty: `general`.
- Active: `dashboard`, `masters`, `items`, `parties`, `sales`, `Purchase & Expense`, `gst`, `OEE`, `hr`, `reports`, `settings`.

Controller names visibility:
- Many controllers use default tags like `Items`, `Categories`, `SalesInvoices`.
- Purchase/Expense controllers explicitly tag as `PurchaseBillsController`, etc.
- Some GST controllers tag as `GSTZen` for configuration/verification, which may be less clear than controller/module names.

Missing Swagger documentation:
- Many Purchase/Expense and HR actions lack explicit response types, so Swagger shows generic `OK`.
- Compressed one-line controllers have no summaries/descriptions.
- Permission requirements are not surfaced as OpenAPI metadata.
- Auth endpoints with `[AllowAnonymous]` still appear under global Swagger bearer requirement because security is globally added.

Duplicated/unclear endpoints:
- No duplicate routes found in Swagger.
- `Purchase & Expense` group name contains spaces and `&`, which is accepted but awkward for automation and URLs.
- The `dashboard` document is now populated by Dashboard Phase 1 endpoints.

## 9. Logging, Validation & Error Handling

Global exception handling:
- `GlobalExceptionMiddleware` catches `CosmosException` and generic exceptions.
- Error response uses `ApiResponse.Failure` with correlation ID when available.
- Generic errors return HTTP 500 and hide exception details.

Logging:
- Serilog is configured for console and rolling file logs under `logs/cosmos-api-.log`.
- `UseSerilogRequestLogging` and custom `RequestLoggingMiddleware` both log requests, so duplicate request logs are likely.
- `AuditMiddleware` logs auditable HTTP verbs but does not persist audit records.

Correlation:
- `CorrelationIdMiddleware` creates/propagates `X-Correlation-Id` and writes it to response headers.

Validation:
- FluentValidation validators are registered from Application assembly.
- Services call `ValidationRunner`.
- `[ApiController]` model binding is active, but most business validation is service-level.

API response structure:
- Success/failure envelope: `ApiResponse<T>` and `ApiResponse`.
- Controllers use `FromResponse`, mapping failed service responses to HTTP 400.
- Exceptions preserve status codes through middleware.

Inconsistencies:
- Some failures are returned as `ApiResponse` with HTTP 400; others throw typed exceptions with specific HTTP status.
- `JwtClaimsMiddleware` writes a plain `{ message = ... }` JSON response, not `ApiResponse`.
- Swagger response metadata is inconsistent across controllers.

## 10. Frontend Dependency Notes

Current frontend:
- Vite React app exists but is only a smoke test page.
- It calls `${VITE_API_URL}/test/hello` and `/test/db-test`; no such endpoints appeared in Swagger.
- It should be treated as placeholder, not ERP frontend.

Menus/pages frontend must support:
- Security/settings: Users, Roles, Pages, Permissions, Party Settings.
- Masters: Categories, Units.
- Parties: Party management.
- Items: Items, image upload on create.
- Sales: Sales invoices, payments, sales reports.
- Purchase/Expense: Purchase bills, purchase orders, purchase returns, supplier payments, expense categories, expenses, purchase/expense reports.
- GST: configuration, registrations, GSTIN verification, e-way bills, e-invoices, sessions, API logs.
- HR: departments, designations, shifts, employees, attendance, leave, payroll.
- OEE: dashboard, production entries, machines, moulds, downtime reasons, reports.

Permissions frontend must understand:
- Actions: `View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`.
- Page names are exact strings such as `Items`, `Sales.Invoice`, `GST.EWayBill`, `HR.Employee`, `OEE.Reports`.
- Login response returns roles plus page permissions.

Key dropdown/master APIs:
- Categories: `GET /api/categories`
- Units: `GET /api/units`
- Items: `GET /api/items`
- Parties/customers/suppliers: `GET /api/v1/parties`
- HR employees dropdown: `GET /api/hr/employees/dropdown?includeResigned=false`
- HR reporting managers: `GET /api/hr/employees/reporting-managers`
- OEE masters: machines/moulds/downtime reasons list endpoints
- GST registrations: `GET /api/v1/gst/registrations`

Report UI dependencies:
- Sales reports require date range and optional customer/item filters.
- Purchase/expense reports require date range and item ID where applicable.
- OEE reports require date range/last days and optional machine/mould/downtime filters.

GST UI dependencies:
- Registration must carry feature flags: e-invoice, e-way bill, GST return enabled.
- E-way/e-invoice request payloads may require raw GSTZen/NIC JSON (`RequestJson`) depending on workflow.
- GST session/OTP and GST return paths need verification because config paths are blank.

HR employee status dependencies:
- Employee list supports `status=active|inactive|resigned|terminated` and `includeResigned`.
- Dropdown defaults should exclude resigned employees unless a workflow explicitly needs them.
- Resign/rejoin APIs keep the same employee record/code.

## 11. Current Risks & Issues

Critical:
- `appsettings.json` contains committed SQL Server credentials, JWT signing key, and GSTZen token.
- Default admin seed exists in SQL.
- Swagger UI is enabled unconditionally.
- No automated database migration/deployment runner found.

High:
- `002_Verify_Database_Setup.sql` is empty; database verification is not automated.
- Unit-of-work abstraction does not appear transactionally effective because repositories open their own connections.
- Stock/ledger mutations are concentrated in stored procedures with limited automated integration tests.
- GST production behavior needs live provider verification.
- Frontend is placeholder and calls nonexistent `/test` endpoints.

Medium:
- Audit attribution is inconsistent; many audit writes pass null user.
- Purchase/Expense and HR Swagger metadata is incomplete.
- HR service/repository are too broad.
- File upload handling is local and lightly validated.
- Password reset email delivery is missing.
- Password reset tokens are stored raw.

Low:
- Controller formatting is inconsistent.
- `general` Swagger group is empty.
- Response status semantics are mixed between `ApiResponse` failures and exceptions.

## 12. Production Readiness Checklist

| Area | Status | Notes |
|---|---|---|
| Backend build | Passes | `dotnet build Cosmos.slnx --no-restore` succeeded. |
| Unit tests | Needs Verification | Tests exist; full test run should be part of CI. |
| Database schema | Needs Verification | Scripts exist but deployment order/verification automation missing. |
| Secrets management | Not ready | Credentials/tokens/signing key committed. |
| Authentication | Partially ready | JWT/login/refresh implemented; reset email missing. |
| Authorization | Partially ready | SQL-backed permissions implemented; frontend integration pending. |
| Swagger | Partially ready | Good grouping; incomplete response/permission docs; exposed unconditionally. |
| Logging | Partially ready | Serilog/correlation present; duplicate request logging likely. |
| Error handling | Partially ready | Global middleware present; response shapes inconsistent in some middleware. |
| Audit | Partially ready | Audit table/procedure/service calls exist; attribution incomplete. |
| Database migrations | Not ready | No runner; scripts/migrations must be manually ordered. |
| Frontend | Not ready | Placeholder only. |
| GSTZen production | Needs Verification | Config present; production token committed; blank paths for some features. |
| Inventory | Needs expansion | Stock is embedded, no standalone module. |
| Reports | Needs expansion | Module-local reports only. |

Production-ready today:
- Core code compiles.
- Authentication and permission enforcement are implemented at API boundaries.
- Basic CRUD/API surfaces exist for many modules.

Needs testing before production:
- All database stored procedures with a real SQL Server.
- Auth/permission filter integration.
- Sales/purchase stock and ledger side effects.
- GSTZen live/sandbox behavior.
- HR attendance/leave/payroll workflows.

Needs cleanup before production:
- Rotate and remove committed secrets.
- Disable/protect Swagger outside development.
- Add database deployment automation.
- Improve Swagger metadata for compressed controllers.
- Resolve audit/current-user attribution.

Modules safest to extend next:
- Categories/Units: small and stable.
- Party settings/party enhancements after confirming customer/supplier model.
- Reports architecture, because multiple modules already need shared report/export patterns.
- Inventory APIs after validating stock movement model.

## 13. Recommended Next Roadmap

### Phase 1: Stabilize existing modules

- Move secrets to environment/user-secrets/secure vault and rotate exposed credentials/tokens.
- Define database setup order: reset only when intended, full setup, GST script, OEE migration, HR resignation/rejoin migration, verification/remediation scripts as approved.
- Replace empty `002_Verify_Database_Setup.sql` with real verification or remove it from operational docs.
- Add integration tests for auth, permission filter, core CRUD, sales stock, purchase stock, HR employee status, GST repository mappings.
- Fix or document unit-of-work behavior.
- Improve Swagger response metadata for Purchase/Expense and HR.
- Confirm page/permission seeds match all `[RequirePermission]` page names.

### Phase 2: Reports architecture

- Introduce common report request/response/export conventions.
- Add report permissions consistently.
- Build core operational reports: sales, purchase, expense, stock, party ledger, receivables/payables.
- Add export strategy for Excel/PDF where required.

### Phase 3: GSTZen production verification

- Move GSTZen tokens to secure config.
- Verify GSTIN, e-way bill, e-invoice generate/cancel/get flows with sandbox/production rules.
- Resolve blank config paths for OTP/GSTR/e-way extend or explicitly disable those UI features.
- Add API log review UI and retry/error handling guidelines.

### Phase 4: HR improvements

- Split HR service/repository by subdomain.
- Add salary structure/component APIs if payroll needs configurable salary models.
- Add employee document binary upload/storage.
- Add attendance/payroll approval audit trails.
- Validate resignation/rejoin status behavior end to end with frontend.

### Phase 5: OEE / Manufacturing / advanced ERP modules

- Stabilize OEE migrations and include them in deployment automation.
- Add manufacturing modules only after inventory/reporting foundations are stable: BOM, work orders, production planning, material issue/receipt, quality checks.
- Keep OEE dashboards and manufacturing dashboards separate unless a shared dashboard architecture is introduced.

## 14. Codex Notes for Future Tasks

- Do not assume all modules are production-ready because controllers exist. Many workflows depend on SQL stored procedures and need real DB verification.
- Treat `PROJECT_PROGRESS.md` as the sync document before adding modules.
- Prefer extending existing Clean Architecture patterns: controller -> service -> repository abstraction -> Dapper repository -> stored procedure.
- When adding endpoints, include `[ApiExplorerSettings(GroupName = "...")]`, `[Authorize]`, `[RequirePermission]`, `ProducesResponseType`, request validators, service audit behavior, repository procedure mapping, and SQL page/permission seed.
- Keep page names exact; permission checks are string-based.
- Do not add frontend menus without confirming the page seed and permission name.
- For GST work, verify provider config paths and token handling before implementation.
- For inventory work, first document stock movement type semantics and current sales/purchase effects.
- For HR work, preserve resigned employee behavior: do not soft-delete for resignation; use resign/rejoin endpoints.
- Before changing SQL, check `Database_Verification_Output` because it contains pending generated remediation scripts.
- Current build warning: `Microsoft.OpenApi` package vulnerability `NU1903` was reported during build and should be reviewed during dependency maintenance.

## 15. Stock Reports Module Update - 2026-07-10

Status: Implemented / Build Verified / Swagger Verified / Needs DB Verification / Export Pending.

The Reports Phase 1 inventory scope was extended into a dedicated Stock Reports module without creating a duplicate reports architecture. The implementation reuses the existing controller -> service -> repository -> Dapper -> stored procedure pattern and the existing `Reports.Inventory` page permission.

### Module Status Summary Updates

| Module | Status | Notes |
|---|---|---|
| Inventory / Stock | Reports Implemented / Operational APIs Still Partial | Stock reports now cover summary, ledger, item ledger, low stock, negative stock, movements, valuation, dead stock, fast-moving, and slow-moving items. Stock adjustment, warehouse, batch/serial, and transfer APIs are still missing. |
| Reports | Phase 1 Extended / Needs DB Verification | Stock Reports extension added on top of Reports Phase 1. Export remains pending. |

### API Inventory Additions

All endpoints use Swagger group `reports`, JWT auth, and `Reports.Inventory.View`.

| Method | Route | Status |
|---|---|---|
| GET | `/api/v1/reports/inventory/stock-summary` | Implemented |
| GET | `/api/v1/reports/inventory/stock-ledger` | Implemented |
| GET | `/api/v1/reports/inventory/items/{itemId}/ledger` | Implemented |
| GET | `/api/v1/reports/inventory/low-stock` | Implemented |
| GET | `/api/v1/reports/inventory/negative-stock` | Implemented |
| GET | `/api/v1/reports/inventory/stock-movements` | Implemented |
| GET | `/api/v1/reports/inventory/stock-valuation` | Implemented |
| GET | `/api/v1/reports/inventory/dead-stock` | Implemented |
| GET | `/api/v1/reports/inventory/fast-moving-items` | Implemented |
| GET | `/api/v1/reports/inventory/slow-moving-items` | Implemented |

### Database Migration List Update

- `backend/database/migrations/20260710_stock_reports_module.sql` - Stock Reports stored procedures and `Reports.Inventory` permission reuse. Created, not executed against a live SQL Server in this pass.

### Stored Procedure List Update

- `sp_Report_Inventory_StockSummary`
- `sp_Report_Inventory_StockLedger`
- `sp_Report_Inventory_ItemLedger`
- `sp_Report_Inventory_LowStock`
- `sp_Report_Inventory_NegativeStock`
- `sp_Report_Inventory_StockMovements`
- `sp_Report_Inventory_StockValuation`
- `sp_Report_Inventory_DeadStock`
- `sp_Report_Inventory_FastMovingItems`
- `sp_Report_Inventory_SlowMovingItems`

### Pages And Permissions

- Reused page: `Reports.Inventory`
- View permission: `Reports.Inventory.View`
- Future export permission: `Reports.Inventory.Export`
- `SuperAdmin` seed uses role-name lookup. No hard-coded role/page IDs were added.

### Verification Status

| Area | Status |
|---|---|
| Restore | Passed with existing `Microsoft.OpenApi` NU1903 warning |
| Build | Passed with existing `Microsoft.OpenApi` NU1903 warning |
| Unit tests | Passed: 24/24 |
| SQL execution | Not executed |
| Live database verification | Pending |
| Swagger JSON inspection | Verified at `http://127.0.0.1:5278/swagger/reports/swagger.json` |

### Known Risks

- The base `Items` table has a non-negative `CurrentStock` check constraint, so the Negative Stock report may normally return no rows unless legacy data or schema changes exist.
- Sales returns and stock adjustments are not represented as distinct stock flows.
- Stock valuation remains purchase-price based, not weighted average or FIFO.
- Historical as-of reporting depends on `StockMovements.CreatedAtUtc`; business document dates are used only for sales velocity reports.
- Export buttons should remain disabled until a shared export framework exists.

### Recommended Next Roadmap

Next report milestone: Party Ledger and Outstanding Reports.

Potential reports:

- Customer Ledger
- Supplier Ledger
- Party Statement
- Receivables
- Payables
- Receivable Ageing
- Payable Ageing
- Party Transaction History

## 16. Dashboard Phase 1 Update - 2026-07-10

Status: Implemented / Build Verified / Tests Verified / Swagger Verified / Needs DB Verification.

Dashboard Phase 1 adds the general ERP dashboard backend without changing the existing OEE dashboard surface.

### API Additions

All endpoints use Swagger group `dashboard`, JWT auth, and `Dashboard.View`.

| Method | Route | Status |
|---|---|---|
| GET | `/api/v1/dashboard/overview` | Implemented |
| GET | `/api/v1/dashboard/sales-purchase-trend` | Implemented |
| GET | `/api/v1/dashboard/revenue-expense-trend` | Implemented |
| GET | `/api/v1/dashboard/top-selling-items` | Implemented |
| GET | `/api/v1/dashboard/top-parties` | Implemented |
| GET | `/api/v1/dashboard/alerts` | Implemented |
| GET | `/api/v1/dashboard/hr-summary` | Implemented |

### Database Migration List Update

- `backend/database/migrations/20260710_dashboard_phase1.sql` - Dashboard page/permission seed plus general dashboard stored procedures. Created, not executed against a live SQL Server in this pass.

### Stored Procedure List Update

- `sp_Dashboard_Overview`
- `sp_Dashboard_SalesPurchaseTrend`
- `sp_Dashboard_RevenueExpenseTrend`
- `sp_Dashboard_TopSellingItems`
- `sp_Dashboard_TopParties`
- `sp_Dashboard_Alerts`
- `sp_Dashboard_HrSummary`

### Documentation

- `backend/docs/DASHBOARD_PHASE1.md`
- `backend/docs/DASHBOARD_PHASE1_IMPLEMENTATION_TRACKER.md`
- `backend/docs/IMPLEMENTATION_INTERACTIONS.md`

### Verification Status

| Area | Status |
|---|---|
| Restore | Passed with existing `Microsoft.OpenApi` NU1903 warning |
| Build | Passed with existing `Microsoft.OpenApi` NU1903 warning |
| Unit tests | Passed |
| Swagger JSON inspection | Verified at `/swagger/dashboard/swagger.json` |
| SQL execution | Not executed |
| Live database verification | Pending |

### Known Risks

- Dashboard KPIs are stored-procedure driven and need validation against representative SQL Server data.
- Recent activity is pending until a common activity/audit source exists.
- Dashboard caching is pending until a shared cache abstraction exists.
- Export and drill-down endpoints are future work.
