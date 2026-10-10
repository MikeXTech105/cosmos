# Cosmos Backend System Documentation

> **Evidence boundary.** This document was produced from the repository source, SQL setup/migration scripts, tests, and existing implementation notes on 8 October 2026. It does **not** query a live SQL Server or a deployed API. A database object described below is therefore an implemented database contract, not proof that it has been deployed. Text marked **UNKNOWN / NEEDS BUSINESS CONFIRMATION** deliberately avoids inventing business meaning.

## 1. Executive Summary

**Cosmos** is a controller-based .NET ERP backend. It manages security administration, item/party masters, sales, purchase and expense records, HR, OEE, GST documents, reporting, procurement planning, manufacturing, supply-chain masters, dispatch planning, shipment operations, a wallet/rojmel ledger, data-book records, activity audit logs, and a public/managed website.

At runtime the core request path is:

```text
Browser/client
  -> ASP.NET Core API controller
  -> FluentValidation + permission filter
  -> Application service / calculation engine
  -> Dapper repository
  -> SQL Server stored procedure
  -> tables, views, and transaction logic
  -> ApiResponse<T> (or public-website response)
```

The most operationally significant planning path is:

```text
Mapped channel sales -> BOM components -> procurement calculation -> planning run
Warehouse sales/stock/inbound snapshots -> dispatch calculation -> allocation -> dispatch run
Finalized allocation -> shipment (optional/manual hand-off) -> stock movement on dispatch
```

The system is an ERP backend, not an adapter to an external inventory product: the repository's stock source is `Items.CurrentStock` with `StockMovements`. Stock is global; there is no warehouse/bin/batch ledger. The only confirmed external provider is GSTZen.

## 2. Technology & Architecture

| Concern | Confirmed implementation |
|---|---|
| Language/runtime | C#, .NET 10 target (solution/project configuration) |
| HTTP framework | ASP.NET Core controllers, API version-like route prefixes (not a global versioning package) |
| Persistence | Microsoft SQL Server, Dapper, `SqlConnectionFactory`, stored procedures and SQL scripts |
| Architecture | Layered / clean-style: API -> Application -> Persistence/Infrastructure -> Domain/Shared; Contracts carries DTOs |
| Validation | FluentValidation, registered from `Cosmos.Application` assembly |
| Authentication | JWT bearer access token plus persisted refresh tokens |
| Authorization | `[Authorize]` and page/action permissions via `[RequirePermission]` / `RequirePermissionFilter` |
| Logging | Serilog console and rolling daily `logs/cosmos-api-*.log`; request/audit middleware |
| API discovery | Swagger documents grouped by business module; `/health` health check |
| File storage | local server file storage for managed website assets; static files served by API |
| Background work | **None found**: no hosted service, queue consumer, scheduler, Hangfire, Quartz, or message broker |

### Runtime pipeline

`Program.cs` registers CORS, DI for the three main layers, controllers, rate limiting, Swagger and health checks. Startup invokes `ISystemOwnerProvisioningService.EnsureProvisionedAsync`. Middleware order is significant:

```text
optional trusted reverse-proxy forwarding
-> correlation ID
-> global exception handling
-> HSTS outside Development
-> Swagger / Swagger UI
-> HTTPS redirection, static files, Serilog request logging, request logging
-> CORS
-> authentication -> JwtClaimsMiddleware -> authorization -> rate limiter -> audit middleware
-> controllers / GET /health
```

The public website's write endpoints use fixed-window rate limiting keyed by remote IP: 8 requests per 10 minutes, no queue. All non-public API responses normally use `ApiResponse<T>`; public website responses have a distinct public error envelope.

## 3. Project Structure

```text
backend/
├── src/
│   ├── Cosmos.API/             host, controllers, middleware, security filters, exports
│   ├── Cosmos.Application/     services, validators, pure calculation engines, abstractions
│   ├── Cosmos.Contracts/       API request/response DTOs and shared response-shaping helpers
│   ├── Cosmos.Domain/          entities, enums, permission-name constants
│   ├── Cosmos.Persistence/     Dapper repositories, SQL connection, procedure executor, unit of work
│   ├── Cosmos.Infrastructure/  JWT/BCrypt, GSTZen client, local website file storage
│   └── Cosmos.Shared/          options, exceptions, current-user abstraction, ApiResponse
├── database/
│   ├── 001_Full_Database_Setup.sql  baseline tables, procedures and security objects
│   ├── 003_gst_integration_module.sql
│   ├── migrations/             additive module/schema contracts
│   └── verify_* / *_smoke_tests.sql
├── tests/Cosmos.Tests/         focused service, validator, SQL-contract, security tests
├── docs/                       module-specific handoff/implementation records
└── deploy/nginx/               reverse-proxy example
```

### Layer responsibilities

| Location | Responsibility | Used by |
|---|---|---|
| `Cosmos.API/Controllers` | Binds route/query/body/form input, delegates to a service, turns `ApiResponse` into HTTP results | HTTP clients |
| `Cosmos.API/Middleware` | correlation, error response shaping, JWT-claim guard, request/audit logging | every request |
| `Cosmos.Application/Services` | validation orchestration, authorization-adjacent business rules, audit calls, calculation coordination | controllers |
| `Cosmos.Application/ShipmentOperations` and `Rojmel` | deterministic shipment and ledger rules | shipment/rojmel services and tests |
| `Cosmos.Application/Validators` | field, range, file and workflow input rules | services/controllers |
| `Cosmos.Persistence/Repositories` | maps DTOs to stored procedure parameters/results through Dapper | application services |
| `Cosmos.Infrastructure` | cryptography and outbound GSTZen HTTP provider | auth/GST/website services |
| `Cosmos.Domain` | data names/enums and permission constants; not an ORM model | all upper layers |
| SQL scripts | actual relational schema, stored-procedure transactions, constraints and much state mutation | repositories |

There is no EF Core `DbContext` or EF migration infrastructure. `IUnitOfWork` exists for transaction-capable repository paths; database stored procedures also contain explicit SQL transactions where a multi-table mutation must be atomic.

## 4. Module Inventory

| Module | Purpose and principal data | Main API/service path |
|---|---|---|
| Security administration | users, roles, pages, role permissions, system owner | `UsersController`, `RolesController`, `PagesController`, `PermissionsController` -> `User/Role/Page/PermissionService` |
| Authentication | login, refresh, logout, password reset | `AuthController` -> `AuthService` -> `AuthRepository` |
| Masters | categories, units, items, parties/settings | respective controllers -> services -> repositories |
| Sales | invoices, invoice lines/payments, sales reports | `SalesInvoicesController`, `SalesReportsController` -> `SalesService` / `SalesCalculationService` |
| Purchase & expense | bills, orders, returns, supplier payments, expenses/categories | purchase/expense controllers -> `PurchaseExpenseService` |
| Inventory reports | stock state, ledger, valuation, stock speed/ageing | `InventoryReportsV1Controller` -> `ReportsService` |
| HR | departments, designations, shifts, employees, attendance, leave, payroll | `HR/*Controller` -> `HrService` |
| OEE | machines, moulds, downtime reasons, production entries/reports/dashboard | OEE controllers -> `OeeService` |
| GST | registrations, verification, sessions, e-invoices, e-way bills, API audit logs | GST controllers -> GST services -> `GstZenProviderService` |
| Dashboard/reports | cross-module read models and CSV exports | dashboard/report controllers -> `DashboardService` / `ReportsService` |
| Procurement planning | channel sales import/history, BOM, material suggestion, planning runs | procurement controllers -> `ProcurementPlanningService` / `ProcurementCalculationService` |
| Manufacturing | versioned BOMs and production material/production lifecycle | manufacturing controllers -> `ManufacturingService` |
| Supply-chain foundation | sales channels, channel warehouses/SKUs, packaging profiles and imports | supply-chain controllers -> `SupplyChainService` |
| Dispatch planning | snapshot imports, SKU settings, recommendations and company-stock allocation | dispatch controllers -> `DispatchPlanningService`, calculation/allocation services |
| Shipment operations | shipment execution, packages, dockets, appointments, receipts/returns/freight | shipment controllers -> `ShipmentOperationsService` |
| Data Book | private, user-owned structured entries with history | `DataBookEntriesController` -> `DataBookService` |
| Website management | managed products/content/warranty workflow/public contacts | website controllers -> website services/repository/storage |
| Rojmel / wallet | wallets, posted movements, transfers, scoped dashboards/reports | rojmel controllers -> specialized Rojmel services |
| Activity logs | permanent business/security audit feed | `ActivityLogsController` -> `ActivityLogService` |

Every module follows controller -> service -> repository -> stored procedure unless it is a pure in-memory calculation, local file operation, or outbound GST request.

## 5. API Documentation

### Response and authorization contract

Protected controllers normally require a valid JWT and a page/action permission. `RequirePermissionFilter` reads the `UserId` claim and calls `IPermissionService.UserHasPermissionAsync`; denial is 401 when unauthenticated/missing claim and 403 when permission is absent. Request DTOs are validated before service persistence. Successful protected APIs return `ApiResponse<T>` with `success`, `message`, `data`, and correlation ID; validation/business failures use the same envelope with errors/field errors.

`GET` list APIs conventionally accept paging, sort and search query DTOs. Create/update operations take named Contracts request DTOs; exact field-level requirements are in the corresponding `*Validators.cs` and request DTO file. This prevents this document from incorrectly implying the same body shape for every CRUD resource.

### Complete route inventory (grouped)

| Module | Methods / endpoint family | Purpose | Auth / main service |
|---|---|---|---|
| Auth | `POST /api/auth/login`, `refresh`, `logout`, `forgot-password`, `reset-password` | token/session and credential operations | anonymous endpoints; `AuthService` |
| Users/roles/pages/permissions | `/api/users`, `/api/roles`, `/api/pages`, `/api/permissions` CRUD plus user role/status/export paths | security administration | JWT + page/action; corresponding security services |
| Masters | `/api/categories`, `/api/units`, `/api/items`, `/api/parties`, `/api/party-settings` | CRUD and activation/settings | JWT + master permissions; master services |
| Sales | `/api/sales/invoices`, `/api/sales/reports` | invoice CRUD, confirm/cancel/payment/report paths | JWT + Sales permissions; `SalesService` |
| Purchase & expense | `/api/purchase-bills`, `/api/purchase-orders`, `/api/purchase-returns`, `/api/supplier-payments`, `/api/expenses`, `/api/expense-categories`, `/api/purchase-expense-reports` | procurement transactions and reports | JWT + `PurchaseExpense.*`; `PurchaseExpenseService` |
| HR | `/api/hr/departments`, `designations`, `shifts`, `employees`, `attendance`, `leaves`, `payroll` | HR masters, lifecycle and operational records | JWT + HR permissions; `HrService` |
| OEE | `/api/v1/oee/machines`, `moulds`, `downtime-reasons`, `production-entries`, `reports`, `dashboard` | manufacturing efficiency inputs/reports | JWT + OEE permissions; `OeeService` |
| GST | `/api/v1/gst/registrations`, `verification`, `sessions`, `configuration`, `api-logs`, `e-invoices`, `eway-bills` | GST setup, provider calls and document actions | JWT + GST permissions; GST services |
| Dashboard | `GET /api/v1/dashboard/{overview,sales-purchase-trend,revenue-expense-trend,top-selling-items,top-parties,alerts,hr-summary,recent-activity}` | read-only operational KPIs | JWT + `Dashboard.View`; `DashboardService` |
| Reports | `/api/v1/reports/{sales,purchase,expense,party,inventory,export}` | report read models and allowed CSV exports | JWT + report permissions; `ReportsService` |
| Procurement | `/api/v1/procurement-planning/{channels,sku-mappings,sales-imports,sales-history,settings,boms,inbound-stock,planning-runs}` | inputs, preview/import, compute/save/finalize/export plan | JWT + procurement permissions; `ProcurementPlanningService` |
| Manufacturing | `/api/v1/manufacturing/boms`, `/productions` | BOM/production draft, confirm/cancel paths | JWT + manufacturing permissions; `ManufacturingService` |
| Supply chain | `/api/v1/supply-chain/{channels,warehouses,item-mappings,packaging-profiles,imports}` | shared channel/warehouse/SKU/packaging master and import flow | JWT + supply-chain permissions; `SupplyChainService` |
| Dispatch | `/api/v1/dispatch-planning/{settings,imports,runs,reports}` | SKU policy, snapshot import, calculate/override/allocate/finalize and reports | JWT + dispatch permissions; `DispatchPlanningService` |
| Shipments | `/api/v1/shipment-operations/{shipments,returns,freight-charges,transporters,reports,imports}` and shipment subpaths | execution lifecycle, package/docket/appointment/tracking/receipt | JWT + shipment permissions; `ShipmentOperationsService` |
| Data Book | `/api/v1/data-book/entries` including `/{id}/history` | private entry CRUD/history | JWT + Data Book permissions; `DataBookService` |
| Website admin | `/api/v1/website-management/{dashboard,products,blog-posts,blog-categories,announcements,warranty-claims,settings,contact-enquiries}` | managed content and service cases | JWT + website permissions; website services |
| Website public | `GET /api/website/{products,blog-posts,blog-posts/{slug},announcements,settings}`; `POST /api/website/{warranty-claims,contact-enquiries}` | public read/contact/intake | anonymous; writes rate-limited; public response envelope |
| Rojmel | `/api/v1/rojmel/{my-wallet,wallets,transactions,transfers,dashboard,reports}` | user/company wallet ledger and reports | JWT + Rojmel permissions/scope; Rojmel services |
| Audit | `/api/v1/activity-logs` | list/filter/detail/export activity data | JWT + activity-log permissions; `ActivityLogService` |
| Uploads/health | `POST /api/uploads`; `GET /health` | protected image upload / liveness check | JWT upload authorization / anonymous health |

### Important endpoint flows

* **Planning run compute/save/finalize:** controller validates request -> `ProcurementPlanningService` loads calculation inputs -> `ProcurementCalculationService.Calculate` -> blocking validation messages stop persistence -> repository calls planning procedures -> draft run lines can be adjusted with a reason -> finalization snapshots the run. It neither changes stock nor creates a purchase order.
* **Dispatch calculate/allocate/finalize:** imported snapshot batches and effective SKU/packaging settings create a run -> pure calculator creates recommendation rows -> changes require an override reason -> allocator consumes immutable company-stock snapshot quantities in priority order -> SQL saves allocations -> finalization freezes the run. It does not itself mutate `Items.CurrentStock`.
* **Shipment dispatch:** shipment operations persist lifecycle events. The confirmed SQL contract is that transition `ReadyForDispatch -> Dispatched` decrements global item stock once and records `StockMovements` with source `ShipmentDispatch`.
* **Purchase bill confirmation/PO conversion:** SQL creates/changes purchase documents and increases `Items.CurrentStock`, adding stock movements. A converted PO becomes a purchase bill; it is not linked to a procurement planning run.
* **Website public intake:** anonymous warranty/contact POSTs are bound and validated, throttled, then persisted via website services. The public error envelope does not expose the protected API's internal response format.

For every exact method, route suffix, DTO and permission, use the controller files under `src/Cosmos.API/Controllers` with the matching service and validator. This is the repository’s executable API authority; generated Swagger mirrors it by group.

## 6. Database Architecture

### Persistence rules

SQL Server is accessed through `SqlConnectionFactory` using the `CosmosDb` named connection string. Dapper repositories call procedures, use table-valued parameters where required, and materialize Contracts DTOs. Most operational tables carry deletion/audit fields (`IsDeleted`, timestamps, user IDs); SQL filters frequently require `IsDeleted=0`.

### Core relationship map

```text
Users --< UserRoles >-- Roles --< RolePermissions >-- Pages
Users --< RefreshTokens / PasswordResetTokens / AuditLogs
Categories --< Items >-- Units
Parties --< SalesInvoices / PurchaseBills / PurchaseOrders / supplier payments
Items --< SalesInvoiceItems, PurchaseBillItems, PurchaseOrderItems, PurchaseReturnItems, StockMovements
Items --< ProductBomComponents / ProcurementSettings / packaging / channel mappings
SalesChannels --< ChannelSkuMappings >-- Items
SalesChannels --< ChannelWarehouses; Items --< ItemPackagingProfiles
Planning/dispatch/shipment runs point to their snapshot/result/line tables
```

### Major table groups

| Tables | Purpose / important relationships |
|---|---|
| `Users`, `Roles`, `Pages`, `UserRoles`, `RolePermissions`, `RefreshTokens`, `PasswordResetTokens` | security. A SQL view `vw_UserEffectivePermissions` resolves effective access. Filtered unique indexes protect system owner/system role constraints. |
| `Categories`, `Units`, `Items`, `StockMovements`, `NumberSequences` | catalog and global inventory. `Items` contains code/name, unit/category, purchase/sales price, tracked/current/reserved/minimum stock. Movements link item/source/type/quantity. |
| `Parties`, `PartySettings`, `PartyLedgerEntries`, `PaymentModes` | customer/supplier identity, financial behavior and balances. A supplier is a Party, not a `Suppliers` table. |
| `SalesInvoices`, `SalesInvoiceItems`, `SalesInvoicePayments` | customer invoice header/lines/payments. Lines link Item and Unit; invoice operations feed stock/party ledgers. |
| `PurchaseBills`, `PurchaseBillItems`, `PurchaseOrders`, `PurchaseOrderItems`, `PurchaseReturns`, `PurchaseReturnItems`, `SupplierPayments`, `SupplierPaymentAllocations`, `Expenses`, `ExpenseCategories` | purchase/expense lifecycle. SQL procedures calculate/persist totals, allocations, status and stock movement effects. |
| `HR_*` | departments, designations, shifts, employees and related address/bank/document/salary data, attendance adjustments, leave, payroll runs/details. |
| `OeeMachines`, `OeeMoulds`, `OeeDowntimeReasons`, `OeeProductionEntries` | OEE master/input records and analytical source. |
| GST tables | `CompanyGstRegistrations`, `CompanyGstSessions`, `GstVerificationLogs`, `GstApiLogs`, `EInvoices`, `EWayBills`; persistence/audit for provider workflows. |
| Procurement tables | `SalesChannels`, `ChannelSkuMappings`, `ProcurementSalesHistory`, `ProcurementSalesImportBatches`, `ProductBomComponents`, `ProcurementSettings`, `ProcurementLeadTimeHistory`, `ProcurementInboundStockSnapshots`, runs/lines. |
| Supply/dispatch tables | channel warehouses, packaging profiles, supply import staging; dispatch SKU settings, three snapshot types, runs/results/allocations/import staging. |
| Shipment tables | shipment header/items, packages/package items, docket, appointment, tracking event, attempts, receipt/receipt items, return/return items, freight charges/import staging. |
| Rojmel tables | `Wallets`, `WalletCategories`, `WalletTransactions`, `WalletTransfers`; filtered uniqueness supports one active company wallet and an active linked user's default wallet. |
| Supporting modules | `DataBookEntries`/history, `AuditLogs`, website content/warranty/contact tables, `ManufacturingBoms`/items and production/material tables. |

### Constraints and indexes worth knowing

* Rojmel procedure locking uses `UPDLOCK, HOLDLOCK` and explicit transactions for balance changes; posted/cancelled ledger history is retained.
* Dispatch settings constrain tier to 1–3, positive safety/recurring factors, nonnegative minimum/priority and one of six rounding modes; recommendation values cannot be negative and allocation cannot exceed final recommendation.
* The baseline `Items` model has a non-negative current-stock constraint; a negative-stock report is consequently normally empty unless deployed schema/data differ.
* Unique/security constraints are often procedure-enforced in addition to database indexes (for example names/codes and active/system entities). Inspect the source procedure for each resource for exact enforcement.

## 7. Master Data

| Master | Represents / used by | Managed through |
|---|---|---|
| Categories, Units, Items | product catalog; Items drive sales/purchase/stock, BOM, planning, dispatch, shipments | category/unit/item APIs |
| Parties and Party Settings | customers/suppliers and defaults/settings | party/settings APIs |
| Users, Roles, Pages, permissions | identity and page/action authorization | security-admin APIs; system owner startup provisioning |
| Sales channels and channel SKU mapping | selling channel and external SKU -> internal Item mapping | shared supply-chain/procurement APIs |
| Channel warehouses | channel destination/warehouse metadata, priority | supply-chain APIs; not an inventory balance table |
| Item packaging profiles | units per box, dimensions, gross/net weight, effective dates/channel/default | supply-chain APIs; dispatch/shipment packing |
| Procurement settings/BOM/lead-time history | per-component planning policy and finished-product composition | procurement APIs |
| Dispatch SKU settings | item/channel dispatch factors, packaging/rounding/allocation policy | dispatch settings API |
| HR/OEE masters | organization/workforce and production efficiency reference data | HR/OEE APIs |
| GST registrations/configuration | company/provider operational setup | GST APIs |
| Wallet categories | seeded/read-only financial classification in current Rojmel scope | no category-admin API found |

**UNKNOWN / NEEDS BUSINESS CONFIRMATION:** who is organizationally allowed to create/update each master is not encoded beyond permissions. The exact intended meaning of procurement `MinimumOrderQuantity` being labelled workbook “EOQ” is not an economic-order-quantity calculation.

## 8. Inventory / Stock

### Confirmed stock model

```text
Items.CurrentStock (one global value per item)
  + inbound snapshot (procurement or dispatch calculation only)
  - outgoing sales/shipment movement when relevant procedure executes
  + purchase confirmation / qualified return-restock movement
```

`Items.CurrentStock` is the operational current-stock source. `StockMovements` records event history. There is no warehouse stock ledger, reservation workflow, bin, lot, serial, or inventory-transfer API. `Items.ReservedStock` is read by reports to expose available stock as `CurrentStock - ReservedStock`; procurement explicitly excludes reservations.

### Confirmed movement meanings

The stock reporting SQL documents movement types: `1` sales issue (out), `2` sales-cancel reversal (in), `3` purchase confirmation or purchase-return deletion reversal (in), `4` purchase return or purchase-bill cancellation (out). Shipment dispatch additionally uses source `ShipmentDispatch`; restockable return receipt uses `ShipmentReturnRestock`.

### Report formulas

* Available stock: `CurrentStock - ReservedStock`.
* Low stock: tracked item with `MinimumStock > 0` and `CurrentStock <= MinimumStock`.
* Stock valuation: `ClosingQuantity * Items.PurchasePrice` (not FIFO/weighted average).
* Signed historical movement: negative `Quantity` remains negative; otherwise types 1 and 4 are negated and other listed types are positive.

**UNKNOWN / NEEDS BUSINESS CONFIRMATION:** safety/reservation semantics are not a complete reservation system; inbound snapshots are manually supplied/local and not an open-PO schedule.

## 9. Procurement / Dispatch / Planning

### Procurement calculation engine

Source: `src/Cosmos.Application/Services/ProcurementCalculationService.cs`, `Calculate` (lines 15–265).

Inputs are mapped finished-product sales for an inclusive date range, active BOM components, component planning settings, current global stock and latest valid inbound snapshot. Sales must map through channels/SKUs. A sold inactive item, missing/invalid BOM, inactive/non-stock component, missing settings/safety/MOQ, and missing lead time for automatic planning generate blocking messages; manual/disabled automatic calculation is a warning with zero suggestion.

| Name | Formula actually implemented |
|---|---|
| Days | `toDate - fromDate + 1` |
| Material requirement | `SUM(finishedProductSaleQuantity * BOM.QuantityRequired)` per component |
| ADU | `materialRequirement / days` |
| Effective lead time | override, else historic average, else configured value |
| Lead-time demand | `ADU * effectiveLeadTime` |
| Safety stock | `materialRequirement * SafetyFactor` |
| Reorder point | `leadTimeDemand + safetyStock` |
| Projected available | `Items.CurrentStock + validInboundSnapshotQuantity` |
| Shortage | `MAX(0, reorderPoint - projectedAvailable)` |
| Suggested | `0` if projected available **>** reorder point; otherwise `MAX(shortage, MOQ)`, optionally `CEILING(suggested/orderMultiple)*orderMultiple` |

Values are rounded to six decimal places, midpoint away from zero. Equality to reorder point therefore still produces at least MOQ. Example using invented explanatory values: sales 100 finished units, BOM component quantity 2, range 10 days, lead time 5, safety factor .2, stock 50, inbound 10, MOQ 30: requirement 200, ADU 20, lead-time demand 100, safety 40, reorder point 140, projected stock 60, shortage 80, suggested 80. These values are **examples, not repository data**.

### Dispatch calculation and allocation

Sources: `DispatchCalculationService.Calculate/CalculateLine` (lines 13–72) and `DispatchAllocationService.Allocate` (lines 9–45).

| Name | Formula / rule |
|---|---|
| Total warehouse stock | `currentSellableQuantity + eligibleInboundQuantity` |
| Recurring demand | `salesQuantity * RecurringDemandFactor` |
| Safety stock | `recurringDemand * SafetyStockFactor` |
| Reorder point | `recurringDemand + safetyStock` |
| Raw shortage | `MAX(0, reorderPoint - totalWarehouseStock)` |
| Before rounding | `MAX(rawShortage, minimumDispatchQuantity)` |
| Recommendation | loose/exact -> unchanged; otherwise round by box policy and `UnitsPerBox` |
| Boxes | `recommendation / UnitsPerBox` when positive |

Six rounding modes exist: exact, nearest box, up, down, exact-below-one-box/otherwise up, and half-box threshold. Allocation groups by item, orders recommendations by allocation priority, tier, warehouse priority and ID, then consumes each item’s company stock snapshots in snapshot-ID order. It is deterministic and does not mutate inventory itself.

**SKU identity repair (migration `20261008_dispatch_planning_sku_snapshot_integrity.sql`):** Dispatch result/snapshot grain is `PlanningRunId + ItemId + WarehouseId + ChannelItemMappingId`. Sales, stock, and eligible inbound snapshots are grouped at this same channel-SKU mapping identity. This prevents distinct channel SKUs that map to one internal Item from being rejected or sharing inbound quantity. Company-stock allocation remains grouped by internal Item because the company stock source is global Item stock.

Example (invented): sales 20, recurring factor 1.5, safety .25, sellable 10, inbound 5, minimum 12, 10 units/box, round-up: recurring=30, safety=7.5, reorder=37.5, total=15, shortage=22.5, pre-round=22.5, recommendation=30.

### Planning dependency graph

```text
channel/SKU mapping + sales history -> finished-product sales
finished-product sales + BOM -> component requirement
requirement + period -> ADU
ADU + lead time; requirement + safety factor -> reorder point
global stock + valid inbound -> projected stock
reorder point + projected stock + MOQ/multiple -> procurement suggestion

warehouse snapshots + dispatch SKU policy + packaging -> dispatch recommendation
recommendations + company stock snapshots -> allocations -> finalized dispatch run
```

**UNKNOWN / NEEDS BUSINESS CONFIRMATION:** no automatic purchase request/order/supplier selection is built from a planning run; no true EOQ, recurring-procurement-demand formula, supplier-SKU model, PO-based inbound forecast, marketplace adapter, or warehouse stock allocation exists.

## 10. Calculation Engine (other important rules)

| Calculation/rule | Implementation and source |
|---|---|
| Sales invoice totals | `SalesCalculationService.CalculateInvoiceTotals` lines 10–55: line=`qty*rate`; percentage discount when explicit amount absent; tax=`round((line-discount)*tax%,2)`; grand=`subtotal-totalDiscount+tax`; due=`grand-paid`. Rejects discounts over line/subtotal and invalid paid amount. |
| Wallet balance | `RojmelLedgerRules.ApplyPostedMovement` lines 18–31: income/transfer-in/opening/adjustment-in add; expense/transfer-out/adjustment-out subtract; reject result below zero. |
| Wallet income/expense | `CalculateIncomeExpense` lines 50–55: only posted `Income` and `Expense` types; transfers/opening/adjustments excluded. |
| Dashboard growth | `DashboardService` and Dashboard SQL contract: `(current-previous)/previous*100`; 0/0 -> 0, nonzero/0 -> null. |
| Stock valuation | report procedure: `closing quantity * item purchase price`. |
| Packing suggestion | `ShipmentPackingSuggestionService.Suggest`: divides quantity into full boxes plus loose quantity using packaging inputs. See its source for field/output details. |
| Purchase/sales totals and ledgers | SQL `sp_*_Save`, confirm/cancel and conversion procedures compute/copy totals/statuses and record stock/party ledger effects. |

## 11. End-to-End Business Workflows

### Sales to procurement plan

```text
CSV/XLSX or manual channel sale
-> validate/map channel SKU to Item
-> ProcurementSalesHistory
-> select date range and calculation inputs
-> BOM explosion and procurement formulas
-> preview / draft run with validation messages
-> user adjustments with reasons
-> finalized planning snapshot
```

### Purchase and stock

```text
manual purchase order or bill
-> SQL document/line validation and totals
-> bill confirmation or PO conversion
-> Items.CurrentStock increases + StockMovements persists
-> supplier ledger/payment allocation updates where applicable
```

### Dispatch to shipment

```text
import/validate warehouse sales, stock and inbound snapshots
-> calculate dispatch run
-> reviewed overrides and allocation from company snapshot
-> finalize run
-> create/exercise shipment execution (manual or run hand-off)
-> dispatch transition decrements global stock once
-> package/docket/tracking/receipt/return/freight events
```

### Wallet transfer/cancellation

```text
authorized scoped user -> request transfer or movement
-> SQL locks affected wallets in a transaction
-> post linked debit/credit movements / balance changes
-> audit record
-> cancellation creates reversal; original history remains
```

### Website warranty

```text
public warranty intake -> validation/rate limit -> warranty claim + attachments/history
-> privileged assignment/review/request info/approve/reject/resolve/complete
-> notes and customer messages retained as workflow history
```

## 12. Authentication & Authorization

`AuthService` coordinates repository login/token persistence. `JwtTokenService` issues HS256 JWTs with `UserId`, username, email, full name and JTI; access expiry and refresh expiry use configuration. Refresh tokens use 64 cryptographically random bytes. Passwords are BCrypt hashes with work factor 12. Password-reset token life is 30 minutes in `AuthService`.

The API requires a `UserId` claim after authentication (`JwtClaimsMiddleware`). `CurrentUser` derives identity from claims. Permission names are centrally represented under `Cosmos.Domain/Security`; controller attributes demand an action such as View/Create/Edit/Delete/Approve/Export. System owner provisioning reads environment-variable-backed `SystemOwnerOptions` at startup and validates setup rather than exposing secrets.

Do not copy real connection strings, JWT keys, provider tokens or system-owner credentials from configuration into documentation or clients. The committed development configuration contains sensitive-looking values and should be handled as a deployment secret, but this observation is not a source-code change request.

## 13. External Integrations

| Integration | Confirmed implementation |
|---|---|
| GSTZen | `GstZenProviderService`, `GstZenOptions`, GST controllers/services. Uses configured sandbox/production base URL, token header/token, timeout and endpoint paths for GSTIN verification, e-invoice and e-way-bill operations. Provider results and API logs persist in GST tables; mask-sensitive-log option exists. |
| Reverse proxy | configurable trusted proxy/network/forward limit; forwarded headers only when enabled. Nginx example exists under `deploy/nginx`. |
| Local website storage | `LocalWebsiteFileStorage` stores managed website files on server filesystem. |

No confirmed Amazon, Blinkit, Instamart, transporter/tracking, payment gateway, email/SMS, external stock-system, queue, or scheduled synchronization integration exists.

## 14. Background Jobs / Queues

No `IHostedService`, `BackgroundService`, Hangfire, Quartz, broker consumer, queue producer, cron configuration or timer-based operational worker was found. Import processing, planning calculations, exports, GST calls and audit writes execute within API requests. Any expectation of automatic retries/synchronization is **UNKNOWN / NEEDS BUSINESS CONFIRMATION** and is not present in code.

## 15. Error Handling & Observability

`GlobalExceptionMiddleware` catches `CosmosException` and returns its status/message/errors; it maps malformed HTTP requests to a 4xx response and logs unexpected exceptions before returning generic 500 text with correlation guidance. Model binding failures use the configured `InvalidModelStateResponseFactory`. `CorrelationIdMiddleware` creates/propagates an ID used in response envelopes and logs. Request/audit middleware captures request/business activity subject to audit serialization/sanitization. Repository procedures commonly return status/message result sets and use `TRY/CATCH`, `XACT_ABORT`, rollback and soft deletion.

There is no generic retry policy found for database or GST calls. Failures from outbound GST provider requests are persisted/logged through GST workflow paths; exact retry behavior is not implemented as a background mechanism.

## 16. Configuration

| Name/section | Purpose |
|---|---|
| `ConnectionStrings:CosmosDb` | SQL Server connection used by `SqlConnectionFactory` |
| `Jwt:Issuer`, `Audience`, `SigningKey`, `AccessTokenMinutes`, `RefreshTokenDays` | token issuer/validation/signing/lifetime |
| `GSTZen:*` | provider environment, base URLs, token header/value, timeouts, endpoint paths and log masking |
| `Dashboard:*` | business timezone, date/top-row/alert bounds |
| `Cors:AllowedOrigins` | credentialed browser origin allow-list |
| `ReverseProxy:*` | enablement, trusted proxies/networks and forwarding limit |
| `ImageUpload:AllowHttp` | HTTP URL/upload policy setting |
| `SYSTEM_OWNER_*` environment variables | startup system-owner username/email/password inputs (names defined by `SystemOwnerOptions`) |
| Serilog | minimum levels and sinks; host writes console and daily local files |

Development configuration only changes logging level. No feature-flag framework was found. The documented names above intentionally omit values.

## 17. Frontend -> Backend Flow

No frontend source is in this repository. The confirmed contract is browser/client -> JWT bearer header -> controller route -> DTO/model binding -> validation -> permission filter -> service/repository -> response envelope. Swagger is grouped by business module and is the best runtime route/schema discovery surface. Existing `docs/*FRONTEND_INTEGRATION*.md` files are handoff material, not executable frontend evidence.

## 18. Module Dependency Map

```text
Security administration
       -> all protected modules
Catalog + parties + units/categories
       -> sales, purchase, stock, procurement, dispatch, shipment, website products
Sales + channel SKU mappings + BOM + procurement policy
       -> procurement planning
Supply-chain channels/warehouses/packaging + dispatch policy/snapshots
       -> dispatch planning
Dispatch allocation (optional hand-off) + catalog/party/transporter
       -> shipment operations -> stock movements
Purchase bill / PO conversion / returns
       -> stock movements + party ledger
GST + sales documents
       -> GST provider documents/logs
All business mutations
       -> activity/audit logging and dashboard/report read models
```

## 19. Top Business Rules

1. **Mapped BOM only drives automatic procurement:** sold finished products need active BOM components; source `ProcurementCalculationService.Calculate`.
2. **Lead-time precedence is override -> history average -> configured:** same source, `SelectLeadTime`.
3. **Stock equal to procurement reorder point does not suppress MOQ:** suggestion uses strict `projected > reorderPoint`; same source.
4. **Automatic procurement can be disabled/manual:** suggested quantity is zero but the material remains visible with warnings; same source.
5. **Dispatch recommendation respects minimum and packaging rounding:** `DispatchCalculationService.CalculateLine/Round`.
6. **Dispatch allocation respects priority/tier/warehouse ordering:** `DispatchAllocationService.Allocate`.
7. **Wallet balances cannot become negative:** `RojmelLedgerRules.ApplyPostedMovement` and SQL transaction authority.
8. **Wallet cancellation is a reversal, not deletion:** `RojmelTransactionService.CancelAsync`, Rojmel SQL procedures.
9. **Sales invoice discounts/payments are bounded by calculated totals:** `SalesCalculationService.CalculateInvoiceTotals`.
10. **Protected actions are page/action permission checks, not role-name checks:** `RequirePermissionFilter.OnAuthorizationAsync`; permissions derive from SQL role/page mappings.

## 20. End-to-End Example

The following is an explanatory scenario, not a value found in the database.

```text
Finished product sales: 100 units over 10 days
Active BOM: 2 kg of material M per finished unit
Material requirement: 100 * 2 = 200 kg
ADU: 200 / 10 = 20 kg/day
Lead time: 5 days -> lead-time demand = 20 * 5 = 100 kg
Safety factor: .2 -> safety stock = 200 * .2 = 40 kg
Reorder point: 100 + 40 = 140 kg
Global stock: 50 kg; valid inbound snapshot: 10 kg
Projected available: 60 kg
Shortage: max(0, 140 - 60) = 80 kg
MOQ: 30 kg -> suggested order = max(80, 30) = 80 kg
```

The workflow source is `ProcurementCalculationService.Calculate`. The UI/API can save the result as a planning run, allow a reasoned adjustment and finalize it. It cannot, from this code, automatically select a supplier or make a purchase order.

## 21. Excel -> Backend Mapping

| Spreadsheet/business concept | Backend evidence | Certainty |
|---|---|---|
| sales import | procurement/dispatch/supply-chain import batches and staged rows | confirmed |
| SKU/channel mapping | `ChannelSkuMappings` and `SalesChannels` | confirmed |
| BOM/composition | `ProductBomComponents` / manufacturing BOMs | confirmed |
| material requirement, ADU, safety, reorder | `ProcurementCalculationService` fields/run lines | confirmed |
| MOQ / “workbook EOQ” | `ProcurementSettings.MinimumOrderQuantity` | confirmed field; **EOQ business meaning needs confirmation** |
| current/inbound stock | `Items.CurrentStock` plus procurement/dispatch snapshots | confirmed, but no warehouse ledger/PO inbound feed |
| dispatch boxes/rounding | packaging profiles + dispatch settings/calculation | confirmed |
| supplier selection, purchasing approval matrix, RAINBOW/YGP ratios | no corresponding calculation/model found | **UNKNOWN / NEEDS BUSINESS CONFIRMATION** |

## 22. Complete Data Flow

```text
Users/roles/pages -> authenticated/authorized API
                         |
Masters (items, parties, channel, packaging, BOM, policy)
                         |
Sales/purchase/HR/OEE/GST/website/rojmel inputs
                         |
SQL procedures <-> operational tables <-> audit/activity logs
                         |
reports/dashboard

Mapped sales + BOM + procurement policy + global/inbound stock -> procurement plan
Warehouse snapshots + dispatch policy + packaging -> dispatch plan -> allocation
Shipment execution -> stock movements -> inventory reports/dashboard
```

## 23. Simple Business Explanation

Cosmos lets an organization keep its product, party, employee and operational information in one backend. Staff authenticate and only see operations their page/action permissions allow. They can create sales/purchase records, monitor stock and financial/operational reports, manage employees, and work with GST documents.

For planning, the system can turn mapped sales and product BOMs into a material purchase suggestion. It looks at demand over a chosen period, lead time, a configured safety factor, global stock and a manually recorded valid inbound amount. For dispatch, it turns per-warehouse snapshots and packaging rules into suggested quantities and then assigns available company stock by priority. Shipment operations record the real shipment lifecycle; dispatching a shipment affects the system’s global stock.

The user gets APIs and reports, not a standalone automatic supply-chain robot: supplier choice, purchase-order creation from plans, warehouse inventory and marketplace integration are not automated by the code reviewed here.

## 24. Unknown / Needs Confirmation

* Whether all SQL migrations through 7 October 2026 are deployed to each environment, and live data/schema behavior.
* The business meaning of the procurement safety factor and `MinimumOrderQuantity`/workbook “EOQ”. No EOQ optimization formula exists.
* Supplier-specific SKU, price, lead-time and approval ownership; no supplier-item master exists.
* Whether global `Items.CurrentStock` is acceptable in place of warehouse/bin/batch inventory.
* Whether manually captured inbound snapshots should become PO/receipt derived.
* The intended external behavior for Amazon, Blinkit, Instamart, transporters, notification channels and tracking. Generic records exist; adapters do not.
* The meaning/expectation of any legacy spreadsheet RAINBOW/YGP ratios; no code evidence was found.
* The production retention policy and legal/business retention requirements for audit, financial and website data.
* The business purpose of every enum/status numeric value where the code gives a label but not business policy prose.
* Who should receive/access particular master-data operations beyond the encoded permissions.

## 25. Source Traceability

| Topic | File / class / method (line or code section) |
|---|---|
| Application composition/pipeline | `src/Cosmos.API/Program.cs`, top-level configuration through `app.Run()` |
| API exception envelope | `src/Cosmos.API/Middleware/GlobalExceptionMiddleware.cs`, `InvokeAsync`, `WriteFailureAsync` |
| Permission enforcement | `src/Cosmos.API/Security/RequirePermissionFilter.cs`, `OnAuthorizationAsync` |
| JWT claim/token creation | `src/Cosmos.Infrastructure/Security/JwtTokenService.cs`, `CreateAccessToken`, `CreateRefreshToken` |
| Password hashing | `src/Cosmos.Infrastructure/Security/BcryptPasswordHasher.cs`, `Hash`, `Verify` |
| Procurement formulas | `src/Cosmos.Application/Services/ProcurementCalculationService.cs`, `Calculate` lines 15–234, `SelectLeadTime` lines 237–243 |
| Dispatch formulas | `src/Cosmos.Application/Services/DispatchCalculationService.cs`, `CalculateLine` lines 25–52, `Round` lines 54–70 |
| Dispatch allocation | `src/Cosmos.Application/Services/DispatchAllocationService.cs`, `Allocate` lines 9–45 |
| Sales invoice totals | `src/Cosmos.Application/Services/SalesCalculationService.cs`, `CalculateInvoiceTotals` lines 10–55 |
| Wallet rules | `src/Cosmos.Application/Rojmel/RojmelLedgerRules.cs`, all methods; SQL migration `database/migrations/20260720_rojmel_wallet_module.sql` |
| Procurement workflow/persistence contract | `src/Cosmos.Application/Services/ProcurementPlanningService.cs`; `database/migrations/20260715_procurement_planning_module.sql`, `20260727_procurement_shared_foundation_alignment.sql` |
| Dispatch persistence contract | `src/Cosmos.Application/Services/DispatchPlanningService.cs`; `database/migrations/20260728_dispatch_planning_module.sql` |
| Shipment lifecycle | `src/Cosmos.Application/Services/ShipmentOperationsService.cs`, `src/Cosmos.Application/ShipmentOperations/ShipmentStatusTransitionService.cs`; `database/migrations/20260729_shipment_operations_module.sql` |
| Manufacturing | `src/Cosmos.Application/Services/ManufacturingService.cs`; migrations dated 20260921/20260923/20261006 |
| Base sales/purchase/stock procedures | `database/001_Full_Database_Setup.sql`, `sp_Sales*`, `sp_Purchase*`, `sp_Stock*` sections |
| GST provider/schema | `src/Cosmos.Infrastructure/Gst/GstZenProviderService.cs`; `database/003_gst_integration_module.sql` |
| Dashboard/read models | `src/Cosmos.Application/Services/DashboardService.cs`; `database/migrations/20260710_dashboard_phase1.sql` |
| Stock reports | `src/Cosmos.Application/Services/ReportsService.cs`; `database/migrations/20260710_stock_reports_module.sql` |
| Website | `src/Cosmos.Application/Services/WebsiteManagementServices.cs`; `database/migrations/20260813_website_management_module.sql` |
| Data Book/audit | `DataBookService.cs`, `ActivityLogService.cs`; migrations dated 20260806 and 20260810 |

### Verification performed

* Enumerated all source projects, controllers, application services, repositories, domain/contract models, SQL baseline/migrations and focused test groups.
* Traced the principal calculation engines and their persistence callers.
* Searched for background workers, message brokers and provider adapters; none were found.
* Reviewed the active configuration structure without reproducing sensitive values.
* This documentation makes no claim that tests were rerun or that a live database was contacted during this documentation-only task.
