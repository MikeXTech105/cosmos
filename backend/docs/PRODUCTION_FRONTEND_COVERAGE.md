# Cosmos production frontend coverage and independent review

The later [fresh verification](PRODUCTION_FRONTEND_REVERIFICATION.md) supplements this original map with the subsequently discovered and corrected date/resource, recovery/race, document precision, positional import identity and real SQL summary casing defects. Current results and39-script SQL execution boundary are in that report and the machine-readable verification file.

Reviewed 27 October 2026 against the current workspace, `PRODUCTION_COVERAGE_MATRIX.md`, `PRODUCTION_API_CONTRACT.md`, the complete frontend implementation prompt and `FRONTEND_ACCEPTANCE_CHECKLIST.md` in the supplied handoff. The starting repository snapshot was `f6937755cf04349de2f014b40a5cac25b9bcf6de`; later work was preserved. This document maps implementation behavior and verification boundaries. A route, label, mocked response or passing schema test does not establish SQL transaction correctness.

## Evidence keys and actual integration map

Paths below are relative to the repository root. `P` denotes `frontend/src/pages`, `S` denotes `frontend/src/services`, and `T` denotes `backend/tests/Cosmos.Tests`. Endpoint names are the actual controller paths, not proposed APIs.

| Key | Concrete screen, route, service and permission evidence |
|---|---|
| CFG | `P/manufacturing/configuration/ConfigurationPage.jsx`, `/manufacturing/configuration`: exactly Work Centre and Operation list/create/edit/active-state/version forms. `S/manufacturing/productionConfigurationService.js` reads/writes `/api/v1/manufacturing/work-centres` and `/operations`. `Manufacturing.Configuration` View/Create/Edit gates correspond to backend actions. |
| CHILD | `P/manufacturing/configuration/ItemProductionConfiguration.jsx`, mounted in existing `P/inventory/items/ItemManufacturingTab.jsx`: ordered routing revisions and Item–Machine–Mould eligibility. Work Centre owns shift capacity/effectivity/calendar in CFG. Actual OEE Machine/Mould and HR Shift services are permission-gated and fully paged; no resource IDs are seeded. Configuration Edit creates revisions; Approve closes effectivity or replaces a dated calendar. |
| CAL | CFG reads `/api/v1/manufacturing/shift-capacity/{id}/calendar?businessDate=...` and loads its authoritative version/offset intervals before enabling replacement PUT. Explicit offsets, non-overlap, configured break duration and closed-business-date checks are made before submit; server validates actual shift windows and reservations. |
| PACK | `P/manufacturing/configuration/PackagingConversionPanel.jsx`, mounted in existing `P/supplyChain/packagingProfiles/PackagingProfileFormPage.jsx`: GET/PUT `/api/v1/supply-chain/packaging-profiles/{id}/conversion`, real existing Unit lookup, source/base rational quantity bases and required provenance. Existing packaging profile View/Approve and Unit View are distinct gates. |
| ORDER | `P/manufacturing/orders/{OrdersPage,OrderFormPage,OrderDetailPage,OrderCommandModal,OrderCapacity}.jsx`, `/manufacturing/orders`, `/new`, `/:id/edit`, `/:id`. `S/manufacturing/productionOrderService.js` implements real orders/context/release/completions/amend/close/cancel/completion reversal/capacity/schedule contracts. `Manufacturing.Orders` View/Create/Edit/Approve gates are separate. Frozen BOM/route, owned reservation, completion/material history and explicit offset schedule are displayed. |
| PLAN | `P/manufacturing/planning/PlanningPage.jsx`, `/manufacturing/planning`, uses `S/manufacturing/productionWorkspaceService.js`: observed demand, `/planning/finished`, saved `/planning/snapshots/{id}`, and `/planning/materials`. It renders server freshness, quantity/unit/date/revision and shared material allocation; selected source lines become actual ORDER drafts with snapshot and line IDs. Orders View/Edit/Create permissions apply to their respective operations. |
| PROC | Existing `P/procurement/{generatePlan,planningHistory,settings}`, routes `/procurement/generate-plan`, `/procurement/planning-history`, `/procurement/settings`. Existing calculations/history/settings are reused. `P/manufacturing/integrations/ProcurementPurchasePanel.jsx` adds actual supplier/typed lead source and finalized-source-to-PO conversion. `S/procurement/planningService.js` preserves exact preview/snapshot/edit quantities; `S/manufacturing/physicalInventoryService.js` supplies policy/conversion/source-document recovery. Settings View/Edit, Planning History Approve and PO Create/View remain separate. |
| PUR | Existing `/purchase/orders/:id` and `/purchase/bills/:id` mount `PurchasePhysicalPanel.jsx` / `PurchaseBillReceiptPanel.jsx`; `/purchase/operations` uses `PurchaseOperationsPage.jsx`. `physicalInventoryService` implements actual PO approve/promise/follow-up/performance/close-remainder, accepted/reject/quarantine receipts, original receipt returns, bill links and physical-return credit. PO View/Edit/Approve, Bill View/Approve and Purchase Return Approve are checked separately. |
| OWN | Existing `/sales/invoices/:id` mounts `InvoiceOwnershipPanel.jsx`; `/shipments/work-list/:id?tab=ownership` mounts `ShipmentPhysicalPanel.jsx`. `physicalInventoryService` reads/writes invoice inventory ownership, actual invoice/shipment line allocations and verified packing context. Invoice and Shipment permissions are required for their own commands and lookups. Existing invoice confirmation, shipment dispatch/cancel/return, carton/loose, docket/freight/Rojmel flows remain in their original pages. |
| IMP | `P/manufacturing/imports/{ImportsPage.jsx,productionImportAdapter.js}`, `/manufacturing/imports`: actual CSV/TSV tab export staging; original cell/header/row/file/event evidence; map→validate→reconcile→selected approve→selected post. `productionWorkspaceService` implements `/imports/stage`, `/{batch}/preview`, `/map` and action endpoints. Orders Create/Edit/Approve gates differ; supplier, PO, packaging and Unit lookups retain their own View gates. |
| STOCK | Controlled adjustment panel in IMP: `/api/items/{id}/stock-balance` and `/stock-adjustments`, Item View/Approve, actual unit/version/date/reason/source. Existing Item current/reserved and update opening balances remain read-only. Approved start-of-day openings use the import disposition rather than direct cache edits. |
| RPT | Existing actual Manufacturing Reports remain under `/reports/manufacturing`. `P/manufacturing/reports/OperationalReportsPage.jsx`, `/reports/manufacturing/operations`, adds stock-as-of, signed ledger, production+dispatch scorecard, plan-actual and capacity. Server paging, full-filter unit summaries, real dates/channel/source/quality flags and NDJSON export use `/api/v1/manufacturing/reports/operational/{kind}` and `/export`. `productionReportingHelpers.js` consumes authoritative source document type/ID for completion/receipt/return drilldowns rather than confusing child IDs with parent IDs. Reports View/Export gates remain separate. |
| CORE | `frontend/src/routes/AppRoutes.jsx`, `frontend/src/config/sidebar.js`, `P/manufacturing/{WorkspaceShared.jsx,workspaceHooks.js}`; existing permission resolver/guards, Cosmos controls and modal focus behavior. `frontend/src/utils/productionValues.js` + `S/manufacturing/productionApi.js` preserve exact JSON numeric tokens, long IDs, six-place posting and twelve-place source evidence. `/api/v1/manufacturing/runtime` supplies verified company business date/timezone/closed-through date; browser locale is a display preference only. |

## Behavioral verification evidence

| Key | Actual tests / checks and what they establish |
|---|---|
| VCFG | `P/manufacturing/configuration/configurationHelpers.test.js`, `configurationAccess.test.jsx`, `S/manufacturing/productionConfigurationService.test.js`: six-place boundary, required shot resources/basis, immutable sequence moves, actual date ranges, overnight offset overlap rejection, multi-page actual lookups, forbidden/read-only/localized states, correct routes/versions and dated calendar read→write version. |
| VORDER | `P/manufacturing/orders/{orderHelpers.test.js,OrderViews.test.jsx,orderText.test.js}`, `S/manufacturing/productionOrderService.test.js`: separate six-state enum, exact source/resource/version payloads, partial good/reject/consume/scrap/staging return, identical unknown retries, scoped source-snapshot eligibility, ordered offset booking and blocked unknown/overlap/outside/short duration. |
| VWORK | `P/manufacturing/{workspaceCommands.test.jsx,workspaceViews.test.jsx}`, planning/report helper tests: duplicate click lock, changed intent after uncertainty blocked, stale conflict latch, committed write with failed readback, selected full-range snapshot→material request, stale unselectable/forbidden no-fetch, 101-row paging, full-filter unit totals, null display and export using applied filters. |
| VIMP | `P/manufacturing/imports/productionImportAdapter.test.js`: repeated headers and logical blank rows retain their positions; quoted multiline evidence is preserved; Approved/Posted rows cannot revalidate; nonzero reconciliation differences and duplicates block advancement. |
| VPHYS | `P/manufacturing/integrations/{physicalHelpers.test.js,physicalCommand.test.js}`, `S/manufacturing/physicalInventoryService.test.js`: exact source-priced PO payloads, partial receipt/return balances, actual multi-receipt bill allocation, original confirmed bill-source credit, exact partial ownership bounds and stable/uncertain command intent. |
| VPREC | `frontend/src/utils/productionValues.test.js`, `P/procurement/procurementHelpers.test.js`, `S/procurement/planningPrecision.test.js`: exact DECIMAL(22,6)/long-ID JSON roundtrip, source scale12, zero/null/percent distinction, timezone/DST/date behavior, `0.000001` shortage display and full-range edited procurement payload. Generic price/currency display retains its existing two-place convention. |
| VBASE | Existing `P/manufacturing/manufacturingHelpers.test.js`, Item manufacturing/BOM validation tests, procurement/dispatch helper tests; backend `T/Manufacturing/ProductionCalculationsTests.cs`, `T/ProcurementPlanning/{ProcurementVersion3Tests,WorkbookCompatibilityTests}.cs`, `T/DispatchPlanning/{DispatchPlanningEngineTests,DispatchExcelParityCalculationServiceTests}.cs`. These protect the actual calculation policies and unchanged flows; they are not authenticated SQL journeys. |

Focused runs during this review passed 19 configuration/planning/report/import tests, then the procurement precision/formatter/rendered workspace group passed 11 tests. Targeted changed-area lint and production build passed. These are overlapping focused runs and must not be added together as a full-suite total. The main implementation verification handoff records the final full-suite/build/lint/browser commands, current totals and pre-existing employee-test baseline separately. DOM/SSR and mocked-browser evidence is distinct from real SQL evidence.

## A01–A30 acceptance reconciliation

| ID | Concrete outcome and evidence | Remaining verification boundary |
|---|---|---|
| A01 | Current repository/instructions reviewed; all T/F/U/C IDs below mapped to actual integrated behavior. | Historical source audit is not a claim that the live workbook was reimported. |
| A02 | CORE registers guarded configuration/orders/planning/import/report deep links and existing-module integrations; IDs are URL-backed and reloadable. | Browser results are recorded in the main verification handoff; live auth roles need disposable-catalog testing. |
| A03 | CFG contains exactly the two requested new business masters with code/name/active state and current version. VCFG. | SQL uniqueness and concurrent edits remain gated. |
| A04 | CHILD remains under Item or Work Centre, using actual OEE/HR identities and effective revisions; sequence/rate/basis/output-per-shot evidence required. VCFG. | FK/effectivity races require SQL. |
| A05 | Existing Item BOM declares output basis; PACK carries rational bases/provenance; unknown/cross-dimension evidence is rejected by server. VCFG/VPREC/VBASE. | BH-25 and 330÷11/10×11 are domain examples, not imported live identities. |
| A06 | ORDER has real paged drafts, edits and frozen detail/context/history with separate lifecycle meanings. VORDER. | Real authoritative readback needs guarded auth/SQL. |
| A07 | Explicit approved release amount and complete allocation preview precede reserve-only command. VORDER. | Actual atomic reservation/concurrent stock proof is SQL-gated. |
| A08 | Repeated completion form sends independent accepted/rejected/consumed/scrap/staging return values and shows remaining owned allocation. VORDER. | Real partial reservation exhaustion/rollback requires SQL. |
| A09 | ORDER exposes state-gated amendment/reschedule, short close/cancel and original linked completion reversal, with refreshed source recommendation. VORDER. | Server reversal dependency/stock protection needs SQL. |
| A10 | PLAN saves/reloads actual snapshots and distinguishes Current/Stale/Missing/No demand, 21/15 targets, true7-day versus quarter-month. VWORK/VBASE. | Source demand remains real operator evidence; freshness is server authoritative. |
| A11 | Selected item-filtered snapshot line, revision/date/freshness and quantity are verified before an actual sourced draft. VORDER/VWORK. | SQL unique source-line conversion/race gate. |
| A12 | PLAN sends selected outputs once to one shared material pool; returns bottleneck/shortage and labels proposal versus durable reservation. VWORK/VBASE. | Real shared-stock concurrency needs SQL. |
| A13 | CAL dated read/edit plus ORDER material-independent capacity and explicit ordered bookings; company timezone and real conflicts retained. VCFG/VORDER. | Actual resource exclusivity/overnight SQL windows remain gated. |
| A14 | PROC reuses versioned calculations/history, explicit typed supplier lead/default supplier and separate MOQ/multiple; six-place shortages stay visible. VBASE/VPREC. | v3 actual demand/inbound/valuation data needs SQL. |
| A15 | Finalized positive lines create existing PO drafts only with actual supplier, price, tax and provenance; saved conversion readback exposes already-converted lines. VPHYS. | SQL stale/already-converted uniqueness gate. |
| A16 | PUR approve→Sent, revised promises/history, current-business-date follow-up and close remainder. No external message is sent. VPHYS. | Actual due/inbound categorization needs SQL. |
| A17 | PUR independently records partial accepted/rejected/quarantined dispositions; later bill links do not receive stock again; returns/credit reference original sources. VPHYS. | One accepted physical return is credited against one actual confirmed billed source; spanning history remains an explicit reconciliation exception. |
| A18 | OWN declares line owner and links exact partial quantities; both action orders and standalone policy remain server-controlled. VPHYS. | Both real invoice/dispatch orders and two partial shipments remain SQL-gated. |
| A19 | OWN reads actual Item base unit/profile effectivity and verified conversion before packing; legacy repair/repack guidance accompanies existing freight/docket/Rojmel/returns. VPHYS. | Original dispatched-line return/cancel conservation requires SQL. |
| A20 | Existing Dispatch service/settings/run calculation version and rounding remain; parity helper is not exposed as a selectable API policy. VBASE. | Configured dispatch minimum is intentionally separate from purchase U04. |
| A21 | IMP handles all22 source dispositions, positional original evidence, duplicate/unresolved states and selected safe rows. VIMP/VWORK. | Input is one original-tab CSV/TSV export, not automatic multi-sheet workbook ingestion or unseen-canvas reconstruction. |
| A22 | STOCK controlled adjustment and IMP approved opening use unit/date/version/reason/source; Item cache fields remain protected. VPREC/VBASE. | Start-of-day/as-of reconciliation and opening adoption require SQL. |
| A23 | RPT separates actual output/reject/consume/waste, signed ledger/as-of/scorecard/plan-actual/capacity, source documents, nulls, channels and quality flags. VWORK. | Historical absent source/unit/date/reservation evidence stays unavailable. |
| A24 | Existing CSV and RPT NDJSON export all matching filters; server unit totals/paging are not client-page sums. VWORK. | Concurrent large operational export is not an immutable snapshot. |
| A25 | Versioned commands retain identical intent key on unknown retry, reject changed intent/duplicate clicks, and clear stale/unknown state only after successful readback. VWORK/VORDER/VPHYS. | Non-idempotent configuration creates/calendar writes require authoritative inspection after uncertainty; no invented keys are sent. |
| A26 | CORE plus panel-specific View/Create/Edit/Approve/Export and lookup permissions; forbidden UI does not load protected workspace data. VCFG/VORDER/VWORK. | Backend remains authority for 403 and trusted company scope. |
| A27 | CORE runtime/company date/timezone/closed-period and precision transport; exact source12/post6/long IDs/offset timestamps. VPREC. | Server/date/SQL precision constraints still need disposable integration execution. |
| A28 | Cosmos App controls/modals, responsive scrollable tables, labels and scoped en/hi-en copy; loading/empty/error/read-only/conflict states. VCFG/VORDER/VWORK. | Browser keyboard/focus/mobile findings belong to the main verification log; SSR alone does not prove them. |
| A29 | Existing Item/BOM/report code was extended in place; existing Purchase/Invoice/Shipment/Procurement flows retained. VBASE. | Final full regression results and baseline failures are in the main verification handoff. |
| A30 | First implementation mapping plus independent contract/DOM/value review corrected real defects listed below. Focused tests/lint/build ran. | No real SQL success is claimed; final aggregate execution evidence is separate. |

## T01–T22 source disposition

Every source tab appears in `productionImportAdapter.sourceManifest`. Original values/header positions are evidence, not fabricated Items, Units, suppliers, users or stock movements. Blank/unseen canvas data does not justify a duplicate master.

| ID / source | Actual frontend disposition and destination | Evidence / repair boundary |
|---|---|---|
| T01 Form Responses2 | IMP positional submissions→historical production/dispatch or evidence mapping. | File/event/cell provenance and selected duplicate-aware actions; VIMP. |
| T02 Form Responses1 | IMP repeated headers/row/date evidence retained before explicit mapping. | Actual user identity comes from auth; source role text remains original evidence. |
| T03 DISPATCH DATA | IMP historical dispatch; new daily drafts/dispatch use existing Shipment OWN flows; RPT scorecard. | Historical date must precede cutover; later physical events use actual shipments. |
| T04 PRODUCTION DATA | IMP historical production; new repeated daily output uses ORDER completion/history/correction; RPT. | Accepted/reject/material quantities remain distinct. |
| T05 PRODUCTION PLANNING canvas | PLAN real demand/snapshot/material recommendations from production+ADU evidence. | Blank canvas layout is not claimed as reproduced. |
| T06 CURREENT STOCK | IMP start-of-day opening/reconciliation; STOCK controlled adjustment; RPT ledger/as-of and PLAN cover. | Source spelling preserved; no arbitrary Item cache overwrite. |
| T07 ADU | PLAN observed period/refreshed date/normalized demand; PACK real rational conversion; IMP aggregate evidence. | Zero/stale/missing states separate; no fabricated daily sales. |
| T08 FORM_CONFIG | IMP MasterReference/evidence with inactive history; existing Item/channel/SKU mapping configuration reused. | Source columns retain exact ordering; no duplicate product/configuration master is created. |
| T09 LAST30DAYS SALE | IMP demand aggregate with actual observation period/refreshed date; PLAN observes demand. | Aggregate is not split into fictional individual transactions. |
| T10 JUNCTION | Existing Item Manufacturing BOM/output-basis editor; IMP source per-box/component mappings retained. | Real Item/unit identity and base output required; BH-25 rule is backend-tested. |
| T11 RAW_MATERIAL_MASTER | Existing Items/Units/Categories and PROC settings/default supplier. | Blank/formula-only rows remain evidence rather than new Items. |
| T12 PROCUREMENT PLANNING canvas | Existing PROC generation/history uses declared demand/BOM/inbound basis and v3 server result. | No separate purchase-planning master; SQL calculation gate. |
| T13 PROCUREMENT_INWARD | IMP stages source unit/date/supplier/PO/cost/received-by evidence; actual physical receipt uses PUR. | Unmatched PO/cost/actor remains repairable; no fabricated receipt. |
| T14 VENDOR_MASTER | Existing Party/Supplier lookup and typed supplier policy; IMP master reference. | Only real supplier GUIDs are submitted; blank vendors are not created. |
| T15 Sheet6 | Explicit blank EvidenceOnly row when an exported tab has no populated cells. | No new screen/master/table for blank source. |
| T16 PO_TRACKER | Existing PO + PUR accepted/pending/reject/quarantine/return, expected dates/promise history. | Actual source IDs and unpriced/undated exceptions remain visible. |
| T17 PURCHASE TRACKER canvas | Same PO follow-up/operations view as T16. | No duplicate tracker master or invented SLA. |
| T18 PURCHASE IN canvas | Existing PUR receipt/bill/return with actual source links; IMP evidence first. | Dependencies reuse raw Item/inward/supplier identities. |
| T19 RM_CURRENT_STOCK | PROC physical/inbound/shortage/safety/typed lead/MOQ/multiple and RPT reconciliation. | Workbook reorder flags are not imported as calculation authority. |
| T20 RAW MATERIAL canvas | Existing Items + PROC material planning and STOCK/RPT balances. | No new raw-material master. |
| T21 VENDORS canvas | Existing Parties/supplier policy; separately named dated supplier performance in PUR. | Supplier performance is not relabeled as production SCORECARD. |
| T22 SCORECARD canvas | RPT signed dated production AND dispatch/returns, Item/channel/unit filters and column, full-unit totals/export. | Event table/date ordering supports comparison; unseen canvas formulas/layout and unsupported metrics are not invented. |

## F01–F24 capability reconciliation

| ID | Implemented frontend behavior and concrete evidence |
|---|---|
| F01 | CORE integrates existing modules; this matrix records actual reuse, source dispositions and remaining runtime gates. |
| F02 | CFG two masters; CHILD exactly routing, eligibility and Work Centre shift/capacity families. VCFG. |
| F03 | Existing Item/Unit/category/packaging/supplier screens extended with PACK and PROC supplier policy; no parallel masters. |
| F04 | Existing Item BOM output basis/effectivity and ORDER frozen approved version; VBASE/VORDER. |
| F05 | Existing channel/SKU mapping and IMP inactive history/source identity repair; actual channel/profile lookups are gated. |
| F06 | PLAN observation period/refreshed date, freshness states, explicit normalization basis; IMP aggregate source. VWORK. |
| F07 | PLAN 21 total/15 warning, actual7 versus quarter-month, physical/released/inbound/quality explanations. VWORK/VBASE. |
| F08 | PLAN material explosion request and shared pool returns requested/feasible/bottleneck/shortage; no browser stock reservation. |
| F09 | CHILD operation/resource eligibility and CAL/ORDER timezone/explicit scheduling with unknown/conflict states. VCFG/VORDER. |
| F10 | ORDER explicit release, owned reservations, repeated partials, amend, short close/cancel and linked reversal. VORDER. |
| F11 | ORDER daily timestamped completion and linked correction; existing legacy Item production remains; IMP historical reconciliation. |
| F12 | Existing Shipment draft/detail/dispatch and OWN line ownership/linking; IMP historical dispatch; backend posts one physical event. |
| F13 | STOCK controlled adjustment, IMP opening, ORDER reservation history and RPT signed ledger/as-of/quality flags. |
| F14 | Existing PROC v3 calculations and history, typed lead source, normalized30 half-month safety and separate shortage/MOQ/multiple. VBASE/VPREC. |
| F15 | Positive finalized PROC lines→sourced-price actual PO draft and already-converted recovery links, with actual supplier/permissions. VPHYS. |
| F16 | PUR promise/current-date follow-up, source expected/received histories, actual supplier performance. No external notification side effect. |
| F17 | PUR partial dispositions, later multi-receipt bill links, original receipt returns and confirmed billed-source credit. VPHYS. |
| F18 | Existing configured Dispatch policy/version/rounding/pack basis retained. No fake parity-policy selector introduced. |
| F19 | OWN verified packing/legacy repair and original dispatch-return/cancel continuity; existing freight/docket/Rojmel retained. |
| F20 | Existing Manufacturing actual reports + RPT production/dispatch scorecard, ledger/as-of/plan-actual/capacity and exports; supplier metrics separate. |
| F21 | IMP manifest covers all22 tabs; positional CSV/TSV staging, safe selected actions, cutover/opening/history distinction. VIMP. |
| F22 | CORE actual RBAC/company scope; version/idempotency/unknown outcome/reload latches and original source audit. VWORK/VPHYS/VORDER. |
| F23 | Existing Cosmos controls/themes/layouts and scoped en/hi-en messages, accessible labels/modals and complete data states. Render/browser boundaries recorded separately. |
| F24 | Actual current controllers/DTOs and exact wire services, meaningful automated tests, schema generation and explicit SQL/data prerequisites. |

## U01–U06 confirmed policy reconciliation

| ID | Actual frontend behavior / authoritative calculation ownership |
|---|---|
| U01 | PACK/IMP/OWN submit explicit Item/source/base unit, quantity basis/provenance/effective context. Missing conversion is unresolved; no fabricated BOX/PCS assumption or factor1. VCFG/VPREC/VPHYS. |
| U02 | ORDER release preview/command reserves only; completion sends actual material/reject/good/staging return separately. Browser never subtracts stock locally; remaining owned reservation is read back. VORDER; SQL atomicity gate. |
| U03 | PLAN displays server Target21/Warning15 and documented total21 basis; it never adds 15 to21. VWORK/VBASE. |
| U04 | Existing PROC consumes v3 positive-shortage result; six-place shortage is visible and only positive finalized lines are PO candidates. MOQ and multiple remain separate. Equality0 and fractional shortage math live in backend policy tests. |
| U05 | PROC preserves normalized30 half-month safety, source duration/CalendarDays versus Weeks and override→history→configured precedence. A real2-week supplier lead is14 days; safety is not silently14 days. |
| U06 | OWN declares actual invoice line owner before linking exact partial shipment lines. Existing invoice/dispatch operations retain server physical ownership; returns/cancel reference original events. VPHYS; both real action orders are SQL-gated. |

## C01–C16 calculation/transaction family reconciliation

| ID | Frontend behavior, evidence and limits |
|---|---|
| C01 | PACK verified rational source/base bases; IMP original source12 plus normalized base/factor; OWN historical pack snapshot. VCFG/VPREC; server conversion examples330PCS→30BOX and10BOX→110PCS remain domain verification, not invented real mappings. |
| C02 | Existing Item BOM declares component quantity per output basis; ORDER release freezes approved BOM/route and shows actual accepted/reject/consume/scrap/return distinctly. VBASE/VORDER; backend additive waste once. |
| C03 | ORDER owned/free/reserved read models, STOCK controlled adjustment, IMP approved start-of-day opening and RPT signed date-cutoff ledger/as-of. No direct balance update or client cache compensation. |
| C04 | PLAN real Q/N period and Current/Stale/Missing/No-demand values, server daily/normalized30/21/15/true7/quarter-month fields. VWORK; no averaging percentages or invented daily events. |
| C05 | PLAN inventory basis labels physical+distinct remaining released output+eligible dated inbound and uses a stable source snapshot. ORDER verifies snapshot date/revision before sourced draft/release. Backend example231−100−40=91. |
| C06 | PLAN sends selected output quantities once, renders one shared component allocation and bottlenecks; ORDER durable reservation is a later explicit action. VWORK/VBASE. |
| C07 | CHILD rate basis, setup, quantity basis and verified SKU output/shot; CAL loaded dated breaks/downtime; ORDER explicit offset/sequence/window scheduling. VCFG/VORDER. No synthetic OEE telemetry score. |
| C08 | PROC declares requirement period/history/basis, displays physical/inbound/projection/reserved policy separately, typed supplier lead and normalized30 safety. Backend v3 tests own the calculation; UI does not silently alter policy. |
| C09 | PROC distinct shortage/MOQ/multiple, exact `0.000001` display and edited quantity transport. Positive finalized recommendations only; currency/price formatting stays separate. Backend policy equality and rounding tests retained. |
| C10 | PUR actual accepted/reject/quarantine/outstanding, nullable sourced cost, original receipts/bill links/returns/credits. A physical return does not silently reopen PO supply; complete-return financial credit must fit one confirmed billed source. VPHYS. |
| C11 | Existing Dispatch settings/run version and supply/packing basis preserved; actual rounding/loose/minimum semantics remain existing server policy. VBASE. U04 does not rewrite dispatch minimum. |
| C12 | Existing parity helper remains independently tested; frontend offers no unsupported API policy switch and does not relabel quarter-month as actual7-day demand. |
| C13 | Planning proposal is explicitly not a reservation; OWN line links preserve distinct valid partial dispatches, and original-event cancellation/returns remain server commands with current versions/keys. VPHYS/VWORK. |
| C14 | RPT signed dated production+dispatch/returns/history, explicit channel and Item/unit display, plan-actual and full-filter unit totals. Undefined dates/due denominators/null measures remain unavailable; supplier performance is separate. |
| C15 | PUR actual expected/revised promises and date-stamped receipts feed current-business-date pending/overdue follow-up. No fabricated+3-day SLA or external messages/automations. |
| C16 | OWN verified base-unit packing/repair and existing carton/loose/freight/docket/Rojmel continuity; sourced PO price/tax required, receipt source cost may be null. No invented absorption costing, freight allocation or journal posting. |

## Independent second-pass corrections

The review followed values/identities through current UI, service, DTO and SQL read projection rather than checking labels. It found and corrected:

1. Completion/receipt/return child IDs were being used as parent document URLs. Authoritative `sourceDocumentType/sourceDocumentId` now drive drilldowns; unsafe child-ID fallbacks were removed.
2. Changing the unapplied report view could relabel old displayed rows. Visible measures now use the applied view, and exports use applied filters.
3. `DataTableShell` treats a nonempty `emptyTitle` as a forced empty state and wraps its own header row. Rendered tests exposed hidden real report records; conditional empty title, header fragments and proper width props fixed the actual behavior.
4. Demand observation UI advertised12-place posting although its current backend command permits6. Its validation/label now match; import source evidence still preserves12.
5. Import revalidation offered Approved rows although SQL freezes Approved/Posted evidence. The transition predicate now matches the actual state machine.
6. Reload buttons released unknown/stale command latches before readback succeeded. Imports and demand now await actual authoritative reads; committed writes with failed refresh are distinct from unknown writes.
7. Import packaging choices used nonexistent name fields. They now show actual packaging code/name and retain real identity.
8. Calendar replacement lacked readback. The added dated GET loads current intervals/version and must succeed before edit/replacement; exact break total and company closed-date checks remain in place.
9. Procurement quantity display rounded fractional shortage to0 and an edited final quantity passed through native Number. Quantity-specific formatting now preserves6 places/full range, exact decimal wire is used for adjustment, and preview/snapshot reads preserve exact numeric tokens. Price/money formatting was not globally changed.
10. Scorecard evidence lacked an explicit channel column. Actual channel identity/name is now visible alongside dates and unit-separated measures.

## Honest remaining gates and source exceptions

- No migration was executed against a live company catalog. All additive migrations, authenticated lifecycle actions, stock/reservation rollback, shared-resource races, receipt/bill/credit ownership, invoice/dispatch action orders, cutover/as-of reconciliation and real exports require the explicitly configured disposable guarded SQL catalog and existing SQL runner. Build, DOM, schema, NoSql Swagger and mocked-browser success do not satisfy that gate.
- The source adapter accepts CSV/TSV exports of one original tab, with original row/column order retained. It does not read an entire XLSX workbook automatically, scrape Sheets, resolve hidden canvas visuals or infer missing formulas/units/identities. Formula-only/blank canvas evidence is retained without fabricating business data.
- Missing source Unit/dimension/conversion, unknown Item/SKU/channel/supplier/PO line, missing source cost or timestamp, unresolved duplicate, inactive nonhistorical Item, undated legacy ledger/reservation, stale rate/cavity/BOM/route and pre-existing physical-owner conflicts remain repairable exceptions. A source role name is not a posting-user identity.
- A returned physical quantity spanning multiple confirmed billed sources is not automatically split into financial credits. The supported API credits one complete accepted return against one actual confirmed bill line; the UI blocks unsupported history and explains source reconciliation. New documented returns can follow actual billed sources without rewriting stock history.
- Operational exports read all matching pages and are not immutable concurrent snapshots. Quantity totals remain grouped by actual unit; unavailable numerator/denominator/quality evidence is not replaced by0 or100%.
- The user did not authorize deployment, external notifications or live-company data changes; none is required to inspect this implementation. Remaining guarded runtime checks require real disposable data, not invented production identities.
