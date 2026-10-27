# Production and material workspace backend handoff

Reviewed against the requested specification on 27 October 2026, on branch `lucifer-dev`. The existing backend was traced before implementation. No live company database was altered, no source business identities were invented, and no changes have been committed or deployed.

## Delivery and verification boundary

This delivery contains the backend contracts, services, repositories, authorization, migrations, staged cutover workflow, operational read models, exports, and integration with the existing Item, BOM, procurement, purchasing, invoice and shipment posting paths. The subsequent frontend implementation now adds the integrated production-order/configuration/planning/cutover workspace and existing purchase/invoice/shipment panels. See [the current frontend implementation and verification handoff](PRODUCTION_FRONTEND_IMPLEMENTATION.md) and [frontend coverage](PRODUCTION_FRONTEND_COVERAGE.md). Authenticated SQL execution remains a separate gate.

The new SQL has parser coverage and guarded executable integration tests, but has **not** been executed against SQL Server on this machine. A SQL Server instance, LocalDB, Docker and an explicitly configured disposable integration catalog were unavailable. SQL procedure binding, migration bootstrap/repeatability, real transaction rollback and concurrency remain unverified until the supplied runner and SQL tests succeed. Compiler, domain, contract and Swagger tests are not substitutes for this gate.

Read these alongside this document:

- [Coverage and source dispositions](PRODUCTION_COVERAGE_MATRIX.md)
- [Migration, reconciliation and cutover](PRODUCTION_MIGRATION_CUTOVER.md)
- [Actual API and frontend contract](PRODUCTION_API_CONTRACT.md)
- [All source columns, repeated headers and formula examples](PRODUCTION_SOURCE_AUDIT.json)
- [Generated actual route inventory](production-contracts/implemented-routes.json) and the six module OpenAPI documents in that folder.

## Existing flow map and physical posting owners

| Flow | Existing integration points | Authoritative data / posting owner |
|---|---|---|
| Item / unit / opening | `ItemsController`, `ItemService`, Item repository, `sp_Item_Create/Update`, existing Item screens | `Items`, `Units`, `Categories`. Create accepts explicit opening only; ordinary editing cannot change opening/current/reserved/valuation. Metadata edits share the stock lock. Controlled adjustments have reason/source/event audit. |
| Packaging / SKU | Supply Chain controllers/service/repository and packaging profiles, channel/SKU mappings | Existing `ItemPackagingProfiles`, `SalesChannels`, `ChannelSkuMappings`, `ChannelWarehouses`. External warehouses remain destinations. Verified rational conversions extend packaging profiles. |
| BOM | `ManufacturingBomsController`, `ManufacturingService`, `ManufacturingRepository`, `sp_ManufacturingBom_*` | Existing versioned `ManufacturingBoms/Items`, with output base quantity and concurrency token. `ProductBomComponents` is historical only. |
| Demand | Existing sales import/manual history + production demand observation/import endpoints | Genuine dated `ProcurementSalesHistory`; period aggregates in `ProductionDemandObservations`. Aggregate identity suppresses matching daily demand rather than adding it twice. |
| Finished / material planning | `ProductionPlanningReportsController`, `ProductionWorkspaceService`, `ProductionWorkspaceRepository`, `sp_ProductionPlanning_*` | Stable JSON `ProductionPlanningSnapshots`; what-if shares one component pool and never reserves. Current physical supply, distinct remaining released output and dated eligible PO supply are explicitly netted. |
| Procurement | Existing `/api/v1/procurement-planning/plans`, `ProcurementPlanningService`, calculator/repository | Existing planning runs and settings. v3 changes normalized safety and positive-shortage MOQ. A source revision is compared at save, finalization and PO conversion. |
| Legacy production | Existing manufacturing production controller/service/repository and `sp_ManufacturingProduction_*` | Legacy Draft=1, Posted=2, Cancelled=3 remains intact. Legacy post owns its actual historical material deduction and good output; new legacy postings capture output unit. It does not also create a new completion. |
| New production orders | Workspace order controller/service/repository, `sp_ProductionOrder_*` | Order release owns reservation only. Completion owns actual component consumption + material scrap and accepted FG output in one transaction. Rejected output is recorded but is not sellable stock. |
| Purchasing | Existing purchase controllers, `PurchaseExpenseService/Repository`, `sp_PurchaseOrder_*`, `sp_PurchaseBill_*`; added physical receipt APIs | Physical receipt owns accepted stock-in. Receipt-linked bill lines have owner=2 and do not post stock. Direct owner=1 bills retain existing stock-in behavior. Whole-PO conversion creates receipt ownership for only the unreceived remainder. |
| Supplier return / credit | Physical purchase return command + existing PurchaseReturn/PartyLedger tables | Original receipt return owns stock-out once. Later billed-goods credit creates the existing financial return/party ledger without stock-out. Unbilled rejected/quarantine stock has no invented financial credit. |
| Dispatch / invoice | Existing dispatch calculator/allocation and Shipment Operations; `sp_SalesInvoice_Confirm/Cancel`, shipment transition | Shipment owns linked physical stock-out. Explicit invoice line owner=1 remains standalone; owner=2 is shipment-owned. Line links reconcile partial/multiple shipments and invoices. Invoice cancellation reverses only its own original net stock posting. |
| Packing / freight / returns | Existing Shipment Operations package/docket/return/freight/Freight Rojmel services/procedures | Existing packing, docket and financial freight flow remains. Verified profile and base-unit snapshots are checked before dispatch. A historical shipment return references its original dispatched line and cannot exceed the returnable quantity. |
| Reports / export | Manufacturing report service, operational report endpoints, existing `ReportExportsV1Controller` | Server queries page before serialization and compute full-filter unit totals. Existing CSV export infrastructure serves manufacturing history/consumption. Operational reports support paged NDJSON streaming. |

All new workspace SQL access follows the existing Dapper/stored-procedure convention through a typed JSON result envelope; controllers retain `ApiResponse<T>` and `PagedResult<T>`. New services are registered in existing DI. DTOs are in `Cosmos.Contracts/Manufacturing`, domain status enums are in the domain layer, and no EF or second inventory subsystem was added.

## Masters, scope and permissions

Exactly **two** new business masters exist: Work Centre and Operation. Exactly **three** child configuration families exist: Item routing (with ordered steps), Item–Machine–Mould eligibility, and Work Centre shift/capacity (including dated calendar blocks). Orders, completions, reservations, events, snapshots, imports, adjustments and reconciliation anchors are transaction/audit records, not additional masters.

The existing `Items.IsManufactured` is authoritative. `useManufacturingPreference` is a browser preference only. Existing OEE machines/moulds and HR shifts are referenced, not cloned. Shared/family mould output requires explicit SKU output per shot within actual cavity limits. Unknown rates yield unavailable capacity.

Existing Items/Units/Parties have no common company key. Scope is therefore **one trusted company per database catalog**, configured with `Manufacturing:CatalogCompanyKey`; the authenticated JWT `CompanyKey` must match it. New tables are also filtered by that key. A shared multi-company Item catalog is unsupported. Actor IDs come from authenticated server context; imported role text is never an actor ID. `PartyRoles` is transporter-specific in this repository; purchasing reuses active shared Parties as the existing purchase flow does, and does not invent a Supplier role.

JWT generation adds the configured company claim. Existing tokens must be refreshed or users must sign in again after enabling catalog scope. SQL pooled connections explicitly set/clear company, business date and closed-through session context. Configure `Manufacturing:BusinessTimeZone` with a verified SQL Server-supported timezone, e.g. `India Standard Time`. Never infer business date from UTC creation timestamps when the source business date exists.

New configuration uses `Manufacturing.Configuration`; orders/planning/import use `Manufacturing.Orders`; reports use `Manufacturing.Reports`. Release, completion, amendment, close, cancel, reversal, schedule, import approval/post and adjustments require **Approve**. Invoice ownership and shipment links use their actual existing pages; linking requires both invoice and shipment permissions. Procurement-to-PO needs planning approval and PO Create. Exports require Export. Migration grants the new manufacturing pages only to existing SuperAdmin; protected System Owner behavior remains existing policy. Operators are not automatically granted approval.

## State, idempotency and quantity contract

New order status: Draft=1, Released=2, InProgress=3, Completed=4, Closed=5, Cancelled=6. It is a separate enum from legacy production status. Draft updates require the returned version. Release can explicitly release less than the plan and reserves the entire approved allocation atomically. It never performs a partial success or deducts on-hand stock.

Stock-sensitive commands take the common transaction-owned application lock `Cosmos.Production.Stock`, then lock source documents and Items in deterministic order. Legacy stock writers join the same lock domain. Rowversions are opaque `0x` plus 16 hex digits; clients reload on conflict. Idempotency keys are company-scoped and at most 100 characters. Retrying the same typed payload returns the original result; reusing the key with a different payload conflicts. Server-generated top-level action business date is excluded from the request hash so a retry across midnight remains the same command.

Completion records actual consumed, scrap and returned/staging quantities separately. `ConsumedQuantity + ScrapQuantity` leaves component stock; `ReturnedQuantity` describes custody/staging and does not add inventory because staging did not deduct inventory in this model. Good output enters stock; rejected output does not. Actual usage beyond expected requires a reason and Approve. Only the current partial allocation plus free stock can cover extra usage; another order's reservation is protected. Cumulative expected rounding assigns residues across partials, and unused reservations remain until final completion/short close/cancel.

Released amendments preserve existing actual history, recompute only the remaining material budget, adjust owned reservation deltas and require capacity rescheduling. An eligible reversal writes linked compensating movements once and closes the remaining work; it never silently reopens reservations. Output already unavailable/shipped/consumed blocks reversal. Use remainder close/cancel instead.

Posting quantities use six decimals, midpoint away from zero. Core legacy stock/transaction quantities widen to `decimal(22,6)`, preserving the old 16 integer digits. Planning/shipment historical `decimal(19,6)` fields retain their reviewed 13-integer-digit range; an overflow fails rather than truncates. Source imports preserve `decimal(28,12)` plus exact rational source/base bases where supplied. Currency remains the existing two-place policy; rates/taxes retain existing currency/rate precision. No production absorption cost or fabricated journal is posted.

BOM output basis defaults to one only for the old per-base-unit contract. Existing update requests omit it to preserve a verified basis. New source per-BOX BOMs must declare the real Item-base output quantity. Components must already be in their verified Item base units, waste is additive once, and exactly one active approved effective BOM is allowed for release. Overlapping activation fails; released definitions require a new effective revision.

## Planning policies and representative recomputations

| Case | Expected behavior |
|---|---|
| BH-25, verified 11 PCS/BOX, 13.090 KG/output BOX | 1.190 KG/PCS; 110 PCS requires 130.900 KG; additive 2% gives 133.518 KG. Inner-box source basis is separately verified. |
| Source 330 PCS, base BOX, ratio 11:1 | 30 BOX. Source 10 BOX, base PCS, ratio 1:11 gives 110 PCS. A source/base ratio is multiplied before division and final six-place rounding. |
| Finished demand 330 PCS / 30 days | Daily 11, target21=231, warning15=165, actual seven-day=77, source quarter-month=82.5. No 36-day or 42-day target. |
| Target231, eligible physical100, remaining released40 | Top-up91, before additional distinct dated inbound. Linked demand is not also added as a second full requirement. |
| RM R30=3000 KG, lead2 weeks | Lead14 calendar days; daily100; lead demand1400; half-month safety1500; ROP2900. Ten observed days with requirement1000 gives the same normalized safety. |
| ROP100, position100, MOQ50 | Suggest0. Position99 gives50. Shortage55, MOQ50, genuine multiple12 gives60. MOQ is not a multiple. |
| Fractional material 1/3 per unit, three partials of one | Cumulative rounding allocates .333333, .333334, .333333; total1.000000. |
| Zero / missing / stale demand | Explicit separate states. Missing and stale do not become zero; stale automatic suggestions are unavailable. No fictional daily sales are generated from an aggregate. |

Finished planning is a current-business-date 21-day top-up policy. Dated outstanding real PO supply due within the horizon is eligible; undated inbound is excluded with a flag. Stored snapshots retain their own dates, source revisions, lines and calculation version and have a paged read API. Historical stock is a separate ledger query, not a reconstruction from current stock.

Procurement v3 is `procurement-v3-normalized30-positive-shortage`. Inventory position follows the existing physical-plus-inbound policy; it does not secretly subtract reservations. Eligible inbound excludes unapproved Draft POs and prefers real Sent/PartiallyConverted PO accepted-outstanding supply; when no such real PO supply exists it uses the latest valid external inbound snapshot. These are alternative bases, never added together. Procurement forecast derives from the declared observed finished-demand period; it is separate from actual material ledger consumption and does not also add the same forecast as open-order demand. Saved finalized historical v1/v2 runs remain unchanged. A new approval requires a fresh v3 run. A genuine positive order multiple applies after positive shortage even if the legacy rounding flag was Exact.

Typed supplier lead values normalize Weeks to seven calendar days once; historical override/history/configured precedence stays explicit. Unknown supplier price is null and blocks selected PO conversion unless the caller supplies an explicit sourced price (including an explicitly justified zero). PO approval enters the existing Sent status without sending an external message. An approved close-remainder action removes unreceived supply while retaining actual receipts and financial history. Supplier performance uses accepted quantities weighted by actual receipt dates and the promised date captured at receipt, with missing-date denominators excluded. It is not T22.

The configured dispatch policy and its separate Excel parity helper are retained and tested. No new API policy selector was introduced. Configured dispatch minimum-at-zero-shortage behavior therefore remains unchanged. Snapshot allocation remains a recommendation, not an inventory reservation.

## Reports and existing frontend integration

`manufacturingReportsService` now makes one paged authoritative API call per report page. Required, expected, actual consumed, measured material scrap, good output and rejected output remain separate. Missing legacy scrap/reject/unit values remain null or flagged; planned waste is not measured waste. Full-filter summaries group by UnitId; unknown unit quantities are excluded from unit totals. Production/material reports show effective posted work; the scorecard/ledger show signed original and reversal events on their own business dates. Plan-v-actual includes open orders explicitly.

Existing Item forms show current/reserved as read-only and allow opening only at creation. The BOM editor sends output basis and describes component quantities per declared output. The later frontend delivery adds order/configuration/capacity/import/planning/report screens and existing-workflow integrations, with its actual tests and runtime boundaries recorded in the frontend handoff. The source canvas layout was unavailable, so pixel or interaction parity is not claimed.

Operational NDJSON export uses the same service filters/calculation semantics and 200-row pages. The current operational dataset can change between export pages; take a controlled reporting window for an audit export. Stored planning snapshots themselves are immutable. Stock-as-of returns unavailable when an approved opening, source business dates or unit evidence is missing; it does not quietly relabel or repair old history.

## Test results and remaining execution gate

Current automated results and exact rerun commands are recorded in [the cutover guide](PRODUCTION_MIGRATION_CUTOVER.md). Domain/non-SQL tests, real application Swagger generation, 401 authentication boundaries, migration syntax parsing, report adapter tests and the frontend production build have passed. The full frontend suite retains the three pre-existing employee-validation failures documented in the original baseline; they are separate from this implementation.

Guarded SQL tests cover competing releases, transaction rollback, actual partials/rejects, idempotency, correction, amendment, rounding residues, openings/as-of, controlled adjustments, receipt/bill/return/credit and invoice-before/after partial dispatches. These tests are **skipped, not passed**, without their explicit disposable SQL environment variables. Authenticated SQL user journeys, all deployment bindings and actual SQL migration repeatability must still run before any company cutover.

The source exceptions in the coverage document are business evidence that must be repaired by real source documents. The backend intentionally leaves those rows quarantined while safe unrelated selected rows may proceed. This is not permission to manufacture missing Item/unit/PO/cost/actor data to clear the exception list.

## Changed-file summary

The exact working-tree inventory is [PRODUCTION_CHANGED_FILES.json](PRODUCTION_CHANGED_FILES.json). Changes are grouped as follows:

- Thirty original ordered SQL implementation migrations plus nine frontend context/validation migrations29–37 (39 ordered scripts in total), a read-only reconciliation script and a guarded disposable SQL bootstrap/repeatability runner. The latest frontend audit and actual execution boundary are recorded in [PRODUCTION_FRONTEND_REVERIFICATION.md](PRODUCTION_FRONTEND_REVERIFICATION.md).
- Typed manufacturing/ownership/purchasing/import/capacity/planning/report contracts and controller endpoints following the existing module Swagger/envelope conventions.
- Application calculations, validation, company/date scope, services, Dapper repository/DI, JWT claim and SQL session context integration.
- Existing Item/BOM, TVP quantity, procurement version/snapshot, purchase conversion, invoice/shipment physical ownership and export paths extended.
- Existing frontend Item/BOM/report adapters and exact quantity/percent rendering corrected; targeted behavioral tests added.
- Domain/security/validation/runtime Swagger/parser tests, twelve guarded production SQL journeys, the corrected existing dispatch SQL skip guard, generated schemas,22-tab source audit and this handoff.

No live database, deployment configuration secrets, external messaging or repository history was modified.
