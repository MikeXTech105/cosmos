# Project Business Flow Audit

**Audit date:** 21 September 2026  
**Scope:** repository source and SQL scripts. The 21 September 2026 Manufacturing foundation is recorded below; no live database schema or data was changed by this documentation update.

## 1. Executive Summary

Cosmos is a .NET 10, controller-based ERP API with SQL Server persistence. It already contains an Item master and global inventory (`Items.CurrentStock`), sales/purchase functions, a procurement-planning module, shared supply-chain masters, dispatch planning, and shipment operations.

**Business meaning:** the application can calculate material purchase suggestions from mapped sales and BOMs, plan dispatch quantities by channel warehouse, and execute shipments with packages, dockets, appointments, tracking, receipts, returns, and freight. Excel import is supported for selected workflows; it is not the intended operational source of truth.

**Audit conclusion:** **READY AFTER CLIENT CONFIRMATION.** The implemented planning/dispatch/shipment modules are usable foundations, but the end-to-end target process is not yet complete. The largest gaps are a missing procurement-recommendation-to-purchase-order workflow, no supplier-SKU/lead-time ownership model, global rather than warehouse inventory, manually captured inbound snapshots, and unconfirmed workbook/channel rules. The specific RAINBOW YGP ratio rule was not found.

The codebase should not be described as a separate application consuming an external Vyapar-like stock system. Its own `Items`/`StockMovements` tables are the stock implementation and current source of truth in this repository. No external Item/Stock API or synchronization worker was found.

## 2. Current Architecture

```text
Client/frontend (not present in this repository)
        ↓ HTTP + JWT
Cosmos.API controllers / permission filter / validators
        ↓
Cosmos.Application services and calculation engines
        ↓
Cosmos.Persistence repositories (Dapper)
        ↓
SQL Server stored procedures and tables
        ↓
Items.CurrentStock + StockMovements / business transaction tables

External integrations: GSTZen only; no stock, marketplace, transporter, Amazon,
Blinkit, Instamart, or tracking-provider API integration was found.
```

Projects: `Cosmos.API` (host/controllers/middleware), `Cosmos.Application` (services/validators), `Cosmos.Contracts` (DTOs), `Cosmos.Domain` (enums/entities/permissions), `Cosmos.Persistence` (Dapper repositories/SQL connection), `Cosmos.Infrastructure` (including GST provider/security helpers), `Cosmos.Shared` (options/errors/responses), and `Cosmos.Tests`.

There is **no EF Core, `DbContext`, EF entity configuration, or EF migration**. `SqlConnectionFactory` opens a SQL Server connection named `CosmosDb`; repositories call stored procedures through Dapper. `database/001_Full_Database_Setup.sql` and `database/migrations/*.sql` are the database authority available to this audit. A live database was not queried, so deployed schema/data are not independently verified.

The API uses JWT authentication, SQL-backed page/action permissions, FluentValidation, global exception/correlation/request/audit middleware, CORS, Swagger, rate limiting for public website writes, and `/health`. No hosted service, queue consumer, or background scheduler was found.

## 3. Current Module List

| Module | Current status | Actual implementation |
|---|---|---|
| Item, category, unit master | IMPLEMENTED | Item/category/unit controllers → services → Dapper repositories → `Items`, `Categories`, `Units`. |
| Global inventory | IMPLEMENTED, limited | `Items.CurrentStock` and `StockMovements`; no warehouse/bin/batch inventory model. |
| Parties/suppliers | IMPLEMENTED | `Parties` master. Supplier is a Party identifier; transporters use additive `PartyRoles`. |
| Sales/purchase/expense | IMPLEMENTED | Sales invoices, purchase bills/orders/returns, supplier payments and reports. |
| Procurement planning | IMPLEMENTED, isolated | Sales history/import → channel mapping → BOM → calculation → saved planning run. No PO creation hand-off. |
| Manufacturing / production | FOUNDATION IMPLEMENTED; SQL CRUD deployment work remains | Versioned transactional BOM/production contracts, protected API surface, and stock post/cancel procedure definitions. No live deployment has occurred. |
| Supply-chain masters | IMPLEMENTED | shared channels, channel warehouses, channel SKU mappings, packaging profiles, audited import batches. |
| Dispatch planning | IMPLEMENTED | warehouse sales/stock/inbound snapshots → recommendation → allocation → finalization. |
| Shipment operations | IMPLEMENTED | shipment/package/docket/appointment/tracking/receipt/return/freight lifecycle. |
| Amazon/Blinkit/Instamart integrations | MISSING | Generic channel records and shipment fields only; no provider APIs or channel-specific workflow services. |
| Dashboard/reports | PARTIALLY IMPLEMENTED | dashboard/report controllers and shipment/dispatch reports; not a single end-to-end procurement-to-delivery dashboard. |
| Background synchronization/jobs | MISSING | No `IHostedService`, queue consumer, or scheduled sync. |

## 4. Master Data

| Entity / table | Current implementation and source | Purpose | Status / recommendation |
|---|---|---|---|
| `Items` | Internal Item API; fields include item code/name, unit, `CurrentStock`, `TrackInventory`, classification | Item/SKU and global stock | IMPLEMENTED. It is the repository's source of truth, not a reference-only external source. Confirm whether it must be replaced/integrated with existing stock software. |
| `Units`, `Categories` | Internal masters | Unit/category | IMPLEMENTED. |
| `Parties` | Internal Party API; `PurchaseOrders.SupplierId` FK | Supplier/customer identity | IMPLEMENTED. No dedicated `Suppliers` table. |
| Supplier-SKU mapping | Not found | supplier-specific item, price, lead time, MOQ | MISSING. Procurement settings are per Item, not per supplier-item. |
| `SalesChannels` | Shared channel master (AMZ/BLI/INS may be records) | Channel | IMPLEMENTED. It duplicates prior procurement channel ownership only conceptually: it was deliberately shared by migration. |
| `ChannelSkuMappings` | Channel → existing `Items` mapping | Marketplace SKU identity | IMPLEMENTED; not a duplicate Item master. |
| `ChannelWarehouses` | Channel-scoped destination warehouse master | dispatch/shipment destination | IMPLEMENTED. This is not stock-by-warehouse. |
| `ItemPackagingProfiles` | Existing Item plus effective date/default/channel | units/box, L/W/H, gross/net weight, unit, volumetric divisor | IMPLEMENTED. It acts as SKU-box and SKU packaging master. |
| `ProcurementSettings` | per material Item | lead-time fallback, safety factor, MOQ (labelled workbook EOQ), order multiple, flags | IMPLEMENTED; no actual EOQ optimisation formula. |
| `ProductBomComponents` | finished Item → component Item/quantity | demand/composition rule | IMPLEMENTED; required for calculated procurement. |
| `ProcurementLeadTimeHistory` | per Item historic receipt lead times | lead-time average | IMPLEMENTED; not supplier-specific. |
| `ProcurementInboundStockSnapshots` | manually saved dated Item quantity/reference | valid inbound in procurement availability | IMPLEMENTED as a local snapshot/cache-like input; no automatic PO linkage or sync. |
| `DispatchSkuSettings` | Item/channel effective-dated policy | recurring/safety factors, box rounding, allocation priority | IMPLEMENTED. |
| Status configuration | enums and SQL constrained statuses | planning/dispatch/shipment lifecycle | PARTIALLY IMPLEMENTED; statuses are code-defined, not an editable status master. |
| `Users`, `Roles`, `Pages`, permissions | SQL-backed auth administration | login and RBAC | IMPLEMENTED. |

## 5. Procurement Flow

```text
Manual sales or CSV/XLSX sales import
 → SalesChannels + ChannelSkuMappings resolve Items
 → ProcurementSalesHistory
 → ProductBomComponents
 → ProcurementCalculationService.Calculate
 → preview or Draft ProcurementPlanningRun / RunLines
 → reviewed line adjustment (reason required)
 → finalized planning snapshot

STOP: no PurchaseRequest, approval record, supplier selection, or automatic PO creation.
```

**Technical implementation:** `ProcurementPlanningControllers` → request DTO → FluentValidation → `ProcurementPlanningService` → `ProcurementCalculationService` → `ProcurementPlanningRepository` → Dapper procedures `sp_ProcurementPlanning_*` / `usp_ProcurementInboundSnapshot_Save` → procurement tables. The run save recalculates from current inputs and blocks on validation errors; a finalized run is a snapshot and does not update stock or create downstream transactions.

| Expected capability | Status | Evidence / qualification |
|---|---|---|
| Sales/demand input | IMPLEMENTED | Manual entry and CSV/XLSX preview/confirm into `ProcurementSalesHistory`. |
| Monthly requirement | PARTIALLY IMPLEMENTED | Any inclusive date range is supported; no month-only entity. Material requirement derives from sales × BOM. |
| Demand/composition rules | IMPLEMENTED | Configurable BOM coefficients in `ProductBomComponents`. |
| Lead time | IMPLEMENTED | precedence: override → historical average → configured Item value. |
| Recurring demand | UNCLEAR | No named procurement recurring-demand formula; material requirement and ADU are calculated. Dispatch has a separate recurring factor. |
| Safety stock/factor | IMPLEMENTED | material requirement × configured safety factor. |
| Reorder point | IMPLEMENTED | lead-time demand + safety stock. |
| Current stock | IMPLEMENTED | `Items.CurrentStock`, global. |
| Inbound stock | PARTIALLY IMPLEMENTED | latest valid manual snapshot added; not derived from PO. |
| Sufficiency / purchase required | IMPLEMENTED as quantity logic | strict `projectedAvailableStock > reorderPoint` returns zero; no stored boolean decision. |
| Suggested quantity | IMPLEMENTED | shortage/MOQ/order-multiple calculation. |
| EOQ | INCORRECT / NEEDS REVIEW | `MinimumOrderQuantity` is labelled “MOQ/workbook EOQ”; no EOQ economic-order formula exists. |
| MOQ | IMPLEMENTED | configured Item value. |
| Supplier selection | MISSING | no supplier item mapping/selection in planning. |
| Recommendation | PARTIALLY IMPLEMENTED | planning run lines are recommendation-like snapshots, but not a separate actionable recommendation workflow. |
| Purchase request/approval | MISSING | planning finalization is permission-gated approval, but no purchase request entity/approval trail. |
| Purchase order | IMPLEMENTED separately | generic PO module; no relationship to planning run. |
| Inbound tracking/goods receipt | PARTIALLY IMPLEMENTED | purchase bill confirmation increases stock; no PO line receipts, expected inbound schedule, or partial receipt. |

## 6. Procurement Calculation Logic

**Code:** `src/Cosmos.Application/Services/ProcurementCalculationService.cs`, `Calculate`; input query is `sp_ProcurementPlanning_CalculationInputs`, and persisted output is `ProcurementPlanningRunLines` through `sp_ProcurementPlanning_Run_Save`.

| Calculation | Implemented formula | Stored / consumed |
|---|---|---|
| Finished product sales | sum mapped `ProcurementSalesHistory.Quantity` for period | calculation input only |
| Material requirement | Σ(finished-product sales × BOM `QuantityRequired`) | run line `MaterialRequirement` |
| ADU | material requirement / inclusive day count | `AverageDailyUsage` |
| Monthly requirement | No independent formula | Use material requirement only when selected period is a month; otherwise UNCLEAR — REQUIRES BUSINESS CONFIRMATION. |
| Recurring demand | No procurement formula | MISSING/UNCLEAR. |
| Effective lead time | override; else historical average; else configured | `LeadTimeDays`, `LeadTimeSource` |
| Lead-time demand | ADU × effective lead time | `LeadTimeDemand` |
| Safety stock | material requirement × safety factor | `SafetyStock` |
| Reorder point | lead-time demand + safety stock | `ReorderPoint` |
| Physical stock | `Items.CurrentStock` | `PhysicalStock` |
| Inbound | latest valid snapshot dated on/before planning end | `InboundStock` |
| Available stock | physical stock + inbound | `ProjectedAvailableStock` |
| Shortage | max(0, reorder point − projected available) | `Shortage` |
| Suggested quantity | if projected stock > reorder point: 0; otherwise max(shortage, MOQ); optionally round up to order multiple | `CalculatedSuggestedQuantity`, then `FinalQuantity` |
| EOQ | No formula | configuration label only; BUSINESS CONFIRMATION REQUIRED. |

Quantities use six decimal places, midpoint away from zero. The strict comparison means stock exactly at reorder point still produces at least MOQ. Reservations and open orders are explicitly excluded from the procurement inventory basis.

## 7. RAINBOW YGP Analysis

**Result: MISSING.** A repository search found no `RAINBOW`/`YGP` class, Item rule, calculation method, or hard-coded coefficients `27/158`, `45/158`, `30/158`, `15/158`.

The closest supported mechanism is a configurable BOM: a RAINBOW YGP material can receive demand from finished-product sales when each related product is mapped to a BOM component with the approved quantity coefficient. The calculation would then aggregate `sales × QuantityRequired`. This is **not evidence** that the listed ratios mean BOM coefficients.

| Required business fact | Code evidence | Audit status |
|---|---|---|
| Unit KG | Item/Unit configuration supports units, but no RAINBOW record verified | UNCLEAR |
| Safety factor 2.5 | `ProcurementSettings.SafetyFactor` supports it, but no record verified | UNCLEAR |
| EOQ 42 KG | `MinimumOrderQuantity` supports numeric 42, but is not true EOQ | UNCLEAR / NEEDS REVIEW |
| 27/158, 45/158, 30/158, 15/158 | no implementation | MISSING — **BUSINESS MEANING REQUIRES CLIENT CONFIRMATION** |

## 8. Purchase Order Flow

```text
Manual CreatePurchaseOrderRequest
 → PurchaseOrders / PurchaseOrderItems (supplier and Item FKs)
 → update / cancel
 → ConvertPurchaseOrder
 → PurchaseBill / PurchaseBillItems
 → Items.CurrentStock + StockMovements increase
```

**Technical:** `PurchaseOrdersController` → `PurchaseExpenseService` → `PurchaseExpenseRepository` → `sp_PurchaseOrder_Save`, `sp_PurchaseOrder_Convert` and SQL tables. The conversion procedure immediately creates a purchase bill and increases stock. A separate `sp_PurchaseBill_Confirm` also increments stock for a directly created bill.

| Expected check | Result |
|---|---|
| Recommendation → request → PO | MISSING: PO is manual and unlinked to procurement plan. |
| Approval statuses | PARTIALLY IMPLEMENTED: convert uses `Approve` permission; PO statuses include draft/active/converted/cancelled behavior, but no multi-step request approval. |
| Supplier / SKU linkage | IMPLEMENTED for supplier → PO and Item → PO line. Supplier-SKU master mapping is MISSING. |
| Warehouse linkage | MISSING. `PurchaseOrders` has no warehouse FK. |
| Expected delivery | IMPLEMENTED on PO header. |
| Inbound / received quantity | MISSING at PO-line level. No received/remaining quantities or inbound dates. |
| Partial receiving | MISSING. Conversion copies all lines and receives all stock at once. |
| Stock update after receipt | IMPLEMENTED as purchase-bill confirmation/conversion, updating global `Items.CurrentStock`. |
| Stock owner | Cosmos internal Item master, global quantity. |

## 9. Dispatch Flow

```text
Validated/imported warehouse sales + stock + inbound snapshots
 → DispatchPlanningRun
 → DispatchCalculationService
 → DispatchRecommendationResults
 → override (reason required)
 → allocation against immutable company-stock snapshot
 → finalize
 → optional Shipment Operations creation from allocation
```

**Business meaning:** dispatch planning recommends what a destination warehouse/channel should receive. It does not move inventory by itself.

**Technical:** `DispatchPlanningControllers` → validators → `DispatchPlanningService` / pure `DispatchCalculationService` / `DispatchAllocationService` → `DispatchPlanningRepository` → `usp_DispatchPlanning_*` → snapshot/run/result/allocation tables. Finalization does not update `Items` or `StockMovements`; shipment dispatch does.

Implemented: dispatch planning, Item/quantity, units-per-box and number of boxes, warehouse/channel, recommendation and allocation. Missing/limited: no invoice generation in this flow (shipment accepts invoice number/id), no automatic docket, no external channel handoff, and no warehouse stock ledger.

## 10. Amazon Flow

**Generic implementation only:** an Amazon record can exist in `SalesChannels`; mapped channel SKUs, channel warehouses, dispatch recommendations, and generic shipment/docket/tracking/delivery records are reusable.

`AMAZON dispatch → docket → shipment → tracking → delivery` is **PARTIALLY IMPLEMENTED** through shared dispatch/shipment tables. No Amazon API, label/document integration, marketplace-specific statuses, or Amazon-specific service/controller was found.

## 11. Blinkit Flow

**Generic implementation only:** shipment appointments support `AppointmentReference`, date, start/end time, status, remarks, and cancellation reason. Shipment header supports `StoNumber`. Delivery attempts support attempt time/outcome/reason/next date. Shipment lifecycle stores close date/time through status fields.

Blinkit-specific `appointment date`, `time slot`, and `STO number` are therefore PARTIALLY IMPLEMENTED. There is no Blinkit adapter, explicit Blinkit-only `Attempt` field (generic delivery attempts are numbered by row/history), nor a dedicated Blinkit close-date field. Confirm whether shipment `ClosedAtUtc` satisfies “Close Date” and how an external attempt number must be represented.

## 12. Instamart Flow

As with Amazon, shared channel/warehouse/dispatch/shipment/docket/tracking/delivery functionality can model Instamart operations. It is **PARTIALLY IMPLEMENTED** only generically. No Instamart API, required reference/appointment rule, or specialized workflow was found.

## 13. Shipment & Tracking Flow

`ShipmentOperationsControllers` → validators → `ShipmentOperationsService` → `ShipmentOperationsRepository` → `usp_ShipmentOperations_*` → `Shipments`, items, packages, dockets, appointments, append-only tracking events, delivery attempts, receipts, returns and freight tables.

The system supports manual shipment or creation from finalized dispatch allocation; packages and package items; docket history; optional appointment; tracking events; delivery attempts; receipts; returns; freight submit/approve/reject/paid and explicit Rojmel hand-off; reports/dashboard/export; and historical import. Confirmed shipment transition `ReadyForDispatch → Dispatched` decreases global `Items.CurrentStock` once and adds `StockMovements` with source `ShipmentDispatch`. Receipt itself does not update stock; it represents destination receipt. Restockable return receipt increases stock once (`ShipmentReturnRestock`).

## 14. Box / Weight / Dimension Flow

| Capability | Current implementation | Status |
|---|---|---|
| SKU/package configuration | `ItemPackagingProfiles` tied to existing Item, optionally channel/default/effective dated | IMPLEMENTED |
| Quantity per box / boxes | `UnitsPerBox`; dispatch calculation rounds and reports `Recommendation / UnitsPerBox` | IMPLEMENTED |
| Dimensions / gross/net weight | Profile and shipment package values support L/W/H, CM/MM and KG/G | IMPLEMENTED |
| Volumetric weight | packing service uses volume divided by supplied profile/package divisor | IMPLEMENTED, divisor meaning requires confirmation |
| Chargeable weight | package uses max(gross weight, volumetric weight); freight can record its own actual/volumetric/chargeable values | IMPLEMENTED |
| Shipping charge | freight charge header has base, surcharge, handling, loading, unloading, appointment, return, other, tax, discount | IMPLEMENTED as manual/recorded charges, not rule-engine calculation |
| Fixed factor 18 | Not found in audited source | No conclusion; any divisor must be **BUSINESS CONFIRMATION REQUIRED**. |

## 15. Stock Integration

### Manufacturing stock process — added 21 September 2026

```text
Manufacturing BOM version
  → Production draft (no stock effect)
  → SQL transaction with item-row locks
  → validate component availability
  → component StockMovements: ManufacturingProduction, negative quantity
  → finished-item StockMovement: ManufacturingProduction, positive quantity
  → update Items.CurrentStock
  → Posted production

Posted production cancellation
  → reverse component movement/stock
  → reverse finished-item movement/stock
  → Cancelled production
```

Wastage is `base component quantity × produced quantity × wastage percentage ÷ 100`; total consumption is the base amount plus wastage. Posting and cancellation are designed as `XACT_ABORT` SQL transactions. Component validation locks use `UPDLOCK, HOLDLOCK` to prevent concurrent production postings from oversubscribing component balances.

Manufacturing reuses global `Items.CurrentStock` and `StockMovements`; it does not change Sales/Purchase behavior, create a stock engine, or link to OEE. OEE remains independent. Procurement Planning continues to use `ProductBomComponents` for demand calculation; Manufacturing uses versioned BOM headers/lines for production history.

**Remaining deployment work:** source contracts, DI, controllers, Swagger, schema migration, post/cancel SQL procedures, and a read-only verification script exist. Complete the BOM and production CRUD/read stored procedures referenced by the Dapper repository, seed/verify Manufacturing pages and role permissions, add manufacturing integration/concurrency/rollback tests, then run the migration and `database/verify_manufacturing_module.sql` in an approved database. SQL execution, runtime Swagger, and stock rollback/concurrency verification have not yet been performed.

| Question | Evidence-based answer |
|---|---|
| Item/SKU source | `dbo.Items`, exposed by internal Items API. Channel SKU is an integration mapping to that Item. |
| Current stock source | `dbo.Items.CurrentStock`. |
| Warehouse stock source | Not an inventory ledger. Dispatch uses manually/imported `DispatchWarehouseStockSnapshots`; warehouses are destination masters. |
| Inbound source | Procurement: manual `ProcurementInboundStockSnapshots`. Dispatch: imported `DispatchWarehouseInboundSnapshots` with eligible statuses. |
| Is stock duplicated? | Yes, several immutable planning snapshot tables duplicate quantities for calculation/audit. They are snapshots, not a second operational stock ledger. `Items.CurrentStock` remains operational global stock. |
| Existing stock-system API/sync | Not found. |
| Manual/synchronized? | Current stock changes through Cosmos sales/purchase/shipment SQL; planning inbound/warehouse quantities are manual/import inputs. No scheduled synchronization exists. |
| Source of truth | In this repository, Cosmos `Items`/`StockMovements`; external-source ownership is unimplemented. |

High-priority gap: if a separate Vyapar-like system is truly authoritative, an explicit integration contract, identifiers, ownership, sync direction, conflict policy, and failure/reconciliation process are required before daily operations use both systems.

## 16. Database Entity Map

| Entity/table group | Type / purpose | Relationships / source / used by | Status |
|---|---|---|---|
| `Items`, `Units`, `Categories` | Master / global inventory | Item references Unit/Category; used by sales, purchase, procurement, dispatch, shipment | IMPLEMENTED; global-only stock |
| `Parties`, `PartyRoles` | Master | PO supplier, transporter role | IMPLEMENTED |
| `SalesChannels`, `ChannelSkuMappings`, `ChannelWarehouses`, `ItemPackagingProfiles` | Master/configuration | Item/channel/warehouse relations; dispatch and shipment | IMPLEMENTED |
| `ProcurementSalesHistory`, import batches/rows | Transaction/input | channel/SKU → Item; planning | IMPLEMENTED |
| `ProductBomComponents`, `ProcurementSettings`, lead-time history | Configuration | Item-based BOM/settings | IMPLEMENTED; supplier dimension absent |
| `ProcurementInboundStockSnapshots` | Calculation input snapshot | Item FK | PARTIALLY IMPLEMENTED; manual source |
| `ProcurementPlanningRuns`, `ProcurementPlanningRunLines` | Calculation/audit transaction | snapshot result per material | IMPLEMENTED; no downstream PO FK |
| `PurchaseOrders` / Items, `PurchaseBills` / Items | Transaction | Party and Item FKs | IMPLEMENTED; warehouse and partial receipt absent |
| `Dispatch*Snapshots`, Runs, Recommendations, Allocations | Calculation/audit transaction | Item/channel/warehouse and immutable inputs | IMPLEMENTED; not inventory source |
| `Shipments` + items/packages/dockets/appointments/tracking/receipts/returns/freight | Transaction | channel, destination warehouse, Item, transporter, dispatch allocation | IMPLEMENTED |
| `StockMovements` | Operational transaction/audit | Item movement source | IMPLEMENTED, global stock only |
| `Users`, `Roles`, `Pages`, role mappings | Security master/configuration | user authorization | IMPLEMENTED |

Important relationships missing for the expected process: planning run line → supplier/SKU → purchase request → PO line → inbound/receipt line → warehouse inventory. No evidence supports manually editing calculated planning snapshots after finalization; only draft line overrides with reason are intended.

## 17. API Map

This is the business-critical surface, not every CRUD endpoint.

| Group | Method / route family | Controller → service | Purpose / input-output | Status |
|---|---|---|---|---|
| AUTH | `POST /api/auth/login`, refresh/logout/password routes | `AuthController` → `AuthService` | JWT and account lifecycle | IMPLEMENTED |
| MASTER | `/api/items`, `/api/categories`, `/api/units`; `/api/v1/parties` | masters/party controllers → services | existing Item/unit/party data | IMPLEMENTED |
| PROCUREMENT | `/api/v1/procurement-planning/channels`, mappings, sales imports/history, BOMs, settings, lead-times, runs | procurement controllers → planning/calculation service | configure, import demand, preview/save/finalize/export plan | IMPLEMENTED |
| PURCHASE ORDER | `/api/purchase-orders`, `/{id}/convert-to-purchase-bill` | `PurchaseOrdersController` → `PurchaseExpenseService` | manual PO and full conversion | IMPLEMENTED, disconnected |
| SUPPLY CHAIN | `/api/v1/supply-chain/channels`, warehouses, item-mappings, packaging-profiles, imports | supply-chain controllers → `SupplyChainService` | common masters/import | IMPLEMENTED |
| DISPATCH | `/api/v1/dispatch-planning/settings`, imports, runs, recommendations, allocation, reports | dispatch controllers → planning services | calculation/override/allocation/finalize | IMPLEMENTED |
| SHIPMENT | `/api/v1/shipment-operations/shipments`, packages/dockets/appointments/tracking/receipts/returns/freight/reports/imports | shipment controllers → shipment service | shipment execution | IMPLEMENTED |
| TRACKING | `.../tracking-events`, `.../delivery-attempts` | shipment controller/service | manual tracking history | IMPLEMENTED; no external feed |
| REPORTS | `/api/v1/shipment-operations/reports`, dispatch recommendations export and generic reports/dashboard routes | report/dashboard services | reporting | PARTIALLY IMPLEMENTED |

All protected endpoints use `[Authorize]` plus `RequirePermission(page, View/Create/Edit/Delete/Export/Approve)` where applicable. DTOs are in `Cosmos.Contracts`; validators are in `Cosmos.Application/Validators`; repository calls use stored procedures.

## 18. User Roles

One login and role/action permission infrastructure is IMPLEMENTED: JWT claims identify the user; `RequirePermissionFilter` checks SQL-backed user role/page action permissions. Actions are `View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`.

Expected named roles `ADMIN`, `PROCUREMENT`, `DISPATCH`, and `MANAGEMENT` were not verified as seeded names. SuperAdmin provisioning and permission seeding are present. Procurement, dispatch, shipment, supply-chain and generic purchase permissions are sufficiently granular to configure the expected roles, but the role-to-business-duty mapping must be explicitly configured and tested. Missing: a dedicated procurement-request approver workflow and segregation-of-duties rules between requestor, approver, receiver and stock-adjuster.

## 19. Excel → Application Mapping

| Excel sheet/area | Classification | Current application mapping | Action |
|---|---|---|---|
| `30 DAYSALE` | Transaction/Input | `ProcurementSalesHistory` via mapped channel SKU | Import/maintain; do not keep as operational source. |
| `STOCK` | Existing system | `Items.CurrentStock` | Reuse; confirm external-system ownership. |
| `ADU` | Calculation/configuration | BOM + planning run calculation | Do not copy helper formulas; validate rule. |
| `LEAD TIME` | Configuration | Procurement settings / lead-time history | Map after supplier ownership decision. |
| `OUTPUT` | Calculation/report | procurement run lines/export | Replace Excel output with reviewed snapshots. |
| `WHITE BOX DATA` | Master data | `ItemPackagingProfiles` | Import after source validation. |
| `WEIGHT & DIMENSIONS` | Master data | packaging profile + shipment package snapshot | Confirm units/divisor. |
| `AMAZON DOCKET DATA` | Transaction | generic shipment/docket | Map only after Amazon-specific rules confirmed. |
| `BLINKIT DOCKET DATA` | Transaction | generic shipment/docket/STO | Confirm external fields. |
| `BLINKIT APPOINTMENT` | Transaction | `ShipmentAppointments` | Map date/time/reference; confirm close/attempt fields. |
| `INSTAMART DOCKET DATA` | Transaction | generic shipment/docket | Confirm requirements. |
| `TRACKING DATA` | Transaction | `ShipmentTrackingEvents`, delivery attempts | Map provider/status semantics. |
| `SUMMARIZED DATA` / `DASHBOARD` | Report | report/dashboard endpoints | Define final KPIs. |
| `ROJMEL` / Expense | Separate transaction | existing Rojmel/expense modules | Remove from supply-chain scope unless client requests integration. |

The original Dispatch Scheduling and Work List workbooks were not present; their formulas and headers were therefore not independently audited. The procurement workbook was only indirectly represented through migration artifacts.

## 20. Duplications / Problems

| Finding | Why it appears duplicated | Recommendation |
|---|---|---|
| Global stock plus procurement/dispatch snapshots | snapshots preserve calculation inputs and audit history | Keep snapshots, but name/document them as snapshots; never treat them as concurrent inventory truth. |
| Procurement `SalesChannels` and shared `SalesChannels` | foundation migration intentionally unified the concept | Keep one shared master; avoid reintroducing procurement-only channel tables. |
| Packaging profile versus package fields | profile is master; shipment package is execution-time snapshot | Keep both; profile changes must not rewrite historical shipment measurements. |
| Generic PO vs procurement planning recommendation | currently disconnected, not duplicate | Add a controlled hand-off, not a second PO system. |
| Channel-specific desired workflows vs generic shipment tables | generic model prevents three duplicate channel implementations | Keep generic core; add adapters/rules only where confirmed. |
| Current stock and destination warehouse snapshots | different meanings, but easy to confuse | Clarify global ownership; implement warehouse inventory only if required. |

Other concerns: committed configuration contains sensitive connection/JWT/provider values; move all secrets to a managed secret store and rotate exposed credentials. This security observation does not change the business-flow conclusion.

## 21. Missing Functionality

1. Supplier-SKU master with supplier-specific lead time, MOQ/order multiple, pricing and active/preferred supplier selection.
2. Procurement recommendation → purchase request → approval → PO line traceability.
3. PO warehouse/delivery destination, expected inbound schedule, received/remaining quantities and partial receipt.
4. Automatic inbound stock based on approved/open PO and receipts; reconciliation of manual inbound snapshots.
5. A verified integration with the stated existing Item/Stock system, if that external system owns stock.
6. Warehouse/batch/bin inventory if operational warehouse stock must be authoritative.
7. RAINBOW YGP configured rule after ratio meaning is confirmed.
8. Amazon/Blinkit/Instamart API adapters, documents/labels, status mapping and channel-specific validations if required.
9. External transporter tracking polling/webhooks and retry/reconciliation jobs.
10. Original Dispatch/Work List workbook migration mapping and business-rule validation.

## 22. Business Rules Requiring Client Confirmation

| Question | Current understanding | Code evidence | Why confirmation is needed | Priority |
|---|---|---|---|---|
| What do 27/158, 45/158, 30/158, 15/158 mean for RAINBOW YGP? | No rule is implemented. They might be BOM coefficients, but this is not assumed. | no RAINBOW/YGP/ratio match | Prevents incorrect material requirement/purchase | HIGH |
| Are RAINBOW YGP safety factor 2.5 and 42 KG EOQ/MOQ approved? | Configuration can hold values; no record verified. | `ProcurementSettings` | “EOQ” is currently MOQ label, not EOQ calculation | HIGH |
| Which system owns Item/current stock? | Cosmos owns it in code; brief says existing system should own it. | `Items.CurrentStock`, no external client | Determines integration and avoids duplicate daily updates | HIGH |
| What counts as inbound and when? | latest valid manual procurement snapshot / selected dispatch statuses | `ProcurementInboundStockSnapshots`; dispatch status logic | Avoids double counting PO/shipped/received stock | HIGH |
| Is stock global or warehouse-specific? | global current stock; warehouse data are planning snapshots | `Items.CurrentStock`; dispatch snapshots | Affects sufficiency, allocation and receipt design | HIGH |
| Which supplier supplies each material? | No relationship exists. | no SupplierItem table | Required before generating POs | HIGH |
| Exact dispatch factors/tier behavior/rounding | configurable, but workbook unavailable | `DispatchSkuSettings`, calculation service | Avoids false recommendations | HIGH |
| Packaging units and volumetric divisor | explicit KG/G, CM/MM and supplied divisor | packaging/profile validators | Cannot infer business meaning of divisor/fixed values | HIGH |
| Blinkit attempt/close-date semantics | generic attempts and `ClosedAtUtc` exist | shipment tables/services | Required for correct channel reports/integration | MEDIUM |
| Channel API/document obligations | only generic records exist | no provider adapter | Determines whether current generic workflow is sufficient | MEDIUM |

## 23. Recommended Changes

### MUST CHANGE

1. Confirm and document stock-system ownership, then implement one authoritative integration/operating boundary before dual daily use.
2. Confirm RAINBOW YGP ratio meanings, units, safety factor and MOQ/EOQ; implement only the approved rule as versioned configuration/calculation.
3. Add traceable procurement request/approval/PO workflow and supplier-item selection; do not turn a final planning snapshot directly into untraceable manual PO data.
4. Add PO receipt/inbound quantities, partial receipt and a single, idempotent stock-update point.
5. Resolve warehouse stock ownership and inbound definitions before relying on dispatch/procurement recommendations.

### SHOULD CHANGE

1. Model supplier-specific lead time/MOQ/pricing and effective dates.
2. Create a documented channel-rule layer over shared shipment core for Amazon/Blinkit/Instamart once requirements are supplied.
3. Add import reconciliation and exceptions for snapshots versus operational transactions.
4. Establish dashboards that trace demand, recommendation, approved PO, inbound, dispatch and delivery.
5. Rotate secrets and remove them from configuration files.

### OPTIONAL

1. Add transporter integrations/webhooks and background polling after provider contracts are selected.
2. Add warehouse/bin/batch/serial inventory if operations require it.
3. Add a generic document/attachment service for shipment proofs and channel documents.

## 24. Proposed Final Flow

```text
EXISTING ITEM/STOCK SYSTEM (or Cosmos Items, after ownership is confirmed)
        ↓
MASTER DATA: Item, Supplier-Item, Channel, Warehouse, Packaging
        ↓
SALES / DEMAND
        ↓
VERSIONED PROCUREMENT CALCULATION
        ↓
PURCHASE DECISION / REQUEST / APPROVAL
        ↓
PURCHASE ORDER
        ↓
INBOUND / PARTIAL GOODS RECEIPT
        ↓
AUTHORITATIVE STOCK SYSTEM
        ↓
DISPATCH PLAN / ALLOCATION
        ↓
DOCKET / APPOINTMENT / PACKAGE
        ↓
SHIPMENT
        ↓
TRACKING / DELIVERY / RETURN
        ↓
DASHBOARD AND AUDIT REPORTS
```

## 25. Development Readiness

**READY AFTER CLIENT CONFIRMATION**

Development is blocked from safely completing the target flow by missing business authority for RAINBOW YGP ratios and settings, stock-system ownership, inbound definitions, supplier selection, warehouse inventory semantics, packaging/divisor units, and marketplace-specific requirements. It is also blocked technically from an end-to-end procurement process because the current planning run has no purchase request/PO/receipt traceability and generic PO conversion cannot represent partial inbound delivery.

The existing modules can continue to be reviewed, tested and used as a controlled foundation, but the missing decisions should be resolved before modifying calculation or transaction logic.
