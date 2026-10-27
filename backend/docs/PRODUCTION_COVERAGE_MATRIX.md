# Production scope and verification evidence

This is a behavior/evidence matrix, not a claim that mentioning an ID proves completion. `Mnn` refers to `20261027_nn_*.sql` in `database/migrations`; M00b is the deployed procedure precision migration. `SQL gate` means real SQL execution is still required. Domain/Swagger tests do not remove that gate. Source audit was read-only. No workbook row was posted into a company catalog.

## Backend deliverable B01–B13

| ID | Delivered behavior and concrete evidence | Verification / limit |
|---|---|---|
| B01 | Existing controller→service→repository→SP→table/posting-owner map in the handoff; traced legacy Item/BOM, procurement, purchase conversion, dispatch, invoice, return and freight flows. Local UI preference distinguished from `Items.IsManufactured`. | Read existing definitions and final integration diffs; actual routes generated from the running application. |
| B02 | M01/02/07/08/19: two masters, three child families, active/effective references, non-overlap, ordered steps, actual OEE/HR references and deactivation/effectivity closure. | Typed Swagger/security checks; SQL gate for all FK/effectivity races. |
| B03 | Domain enum + M03/04/19: separate order and completion aggregates, frozen context, partials, rejects, short close, cancel, amendments and linked reversal. Legacy numeric meanings unchanged. | Enum/domain tests; executable SQL lifecycle/amendment tests supplied but skipped locally. |
| B04 | M03/04/13: owned reservation/events; one transaction for actual issue, accepted output, cache/state/audit; cumulative partial allocation and free+own reservation protection. | Guarded competing releases, partial/reject/retry, rollback, reversal and controlled-adjustment tests. SQL gate. |
| B05 | M00/00b/15/17/21/22/25: coordinated quantity precision, additive TVP V2, canonical output basis, verified ratios, Item balance-edit prohibition, controlled audited adjustment. | Six-place validation and rational/BH-25 domain tests; ScriptDom migration parse; SQL range/index/rollback gate. |
| B06 | M05/09/14/20/22/26: observed demand, stable finished snapshot, material shared pool, selected source-line drafts, dated inbound, revision conflicts, v3 procurement and selected approved PO drafts. | Calculation/shared-pool tests; SQL snapshot/cutover/lifecycle tests; stale/race/procedure gate remains. |
| B07 | M08: actual shift windows/timezone, overnight windows, explicit breaks/downtime, rate/cavity distinctions, resource-exclusive reservation only on explicit schedule. | Overnight interval-union and unknown-rate tests; SQL multi-resource scheduling gate. |
| B08 | M10/11/12/20/24: real supplier Party IDs, typed lead/default supplier, price provenance, selected PO conversion, promised dates/history, partial dispositions, later bill links, returns and financial credits. | Guarded receipt→bill→return→credit test; SQL actual money/receipt conversion and supplier-performance gate. |
| B09 | M06/13/21/23: explicit invoice line owner + shipment line links, grouped free-stock dispatch, verified pack snapshots, protected return/cancel paths and preserved freight/docket sections. | Existing configured/parity dispatch tests; guarded both action orders, two partial shipments, standalone confirm/cancel tests. SQL gate. |
| B10 | M05/18/22: posted actual manufacturing, ledger/as-of, signed scorecard, plan-v-actual, capacity, flags and full-filter unit totals. Existing CSV + paged NDJSON export. | Frontend adapter tests and runtime schemas. Large concurrent export is not an immutable operational snapshot; SQL totals/date gate. |
| B11 | Existing envelopes/DI/auth/actions; trusted catalog company JWT + scope; typed 81-operation route inventory, six generated OpenAPI documents; parameterized commands, cancellation, duplicate/version/error mapping. | Real application Swagger + 401 checks, reflection permission contracts, company-scope/domain validation tests. Authenticated SQL journey gate. |
| B12 | M05/16/22/25: source file/tab/cell/event provenance, map/validate/reconcile/approve/post selected rows, rational conversion snapshots, duplicate detection, openings vs history vs aggregate vs evidence. Ordered scripts and cutover/reconciliation guide. | 22-tab read audit; guarded opening/as-of test. No business data fabricated. SQL import rerun and migration gate. |
| B13 | Automated domain/calculation/shared-pool/validation/Swagger/parser tests; guarded real SQL lifecycle, financial/physical ownership and cutover journeys. Full baseline suites rerun with separate SQL skip and existing frontend-failure reporting. | Exact results in migration guide. SQL unavailability is explicitly recorded per B13; no full end-to-end claim. |

## All 22 source dispositions

Counts are populated/displayed column spans from the full read, including repeated positional headers, rather than sheet allocation size. `PRODUCTION_SOURCE_AUDIT.json` enumerates every populated column, repeated header and 232 normalized formula families with an example source cell/formula and occurrence count. It also retains the distinction between input cells and displayed spill values.

| ID / exact source tab | Read evidence | Disposition and contract | Existing product surface / verification |
|---|---|---|---|
| T01 Form Responses 2 | 50 populated columns; 3 displayed rows; repeated question headers retained by position | Raw import evidence, event fingerprint, explicit mapping; never a second physical posting beside normalized grids. | Import APIs/Swagger; source audit positional headers; duplicate validation M16. |
| T02 Form Responses 1 | 98 columns; 3 rows; repeated question/date headers | Same provenance pipeline, with explicit submission/date/Item mapping. | Import preview/map/validate; original JSON preserved. |
| T03 DISPATCH DATA | 25 columns; 368 rows; 24 historical SKU columns | Pre-cutover dated dispatch history; after cutover, existing draft Shipment Operations and explicit dispatch ownership. | Existing Shipment Operations; signed scorecard/ledger, M06/16/18/21/23. SQL action-order tests supplied. |
| T04 PRODUCTION DATA | 25 columns; 369 rows; 24 formula cells/families | Pre-cutover historical production evidence; new order completion requires actual source/context/materials. Totals are not fresh completions. | Existing manufacturing entry/BOM + new completion API; M04/16/18. |
| T05 PRODUCTION PLANNING canvas | Blank rendered canvas; verified PRODUCTION DATA + ADU dependencies | Finished top-up snapshot from verified demand + actual stock/open output/due inbound. No hidden layout invented. | Finished planning/material API, existing Item/Reports areas; new complete workspace UI remains separate. |
| T06 CURREENT STOCK | 28 columns; 373 rows; 8,496 formula cells / 71 families | Approved opening anchors + dated signed ledger + owned reservation history; negative/unexplained balances remain exceptions. | Stock-as-of/ledger; opening/adjustment APIs, M16/18/22. |
| T07 ADU | 24 columns; 9 rows; 115 formula cells / 95 families | Declared period demand, normalized30, actual7-day and separate quarter-month, 21/15 target/cover. Pack meanings require verified conversion. | Finished snapshot and observed-demand APIs; 21/15/7-day/quarter-month domain tests. |
| T08 FORM_CONFIG | 9 columns; 25 rows; 23 formulas / 1 family | Reuse active/effective channel/SKU mappings; preserve ordering/disabled-column evidence in staging. Do not delete inactive source history. | Existing Supply Chain Item mappings; M16 evidence/history. No new form-config master. |
| T09 LAST 30 DAYS SALE | 1 formula input column spilling into 7 displayed columns / 37 rows; 1 formula family | Aggregate demand observation with declared observed period + explicit refresh; no fictional daily distribution. | Demand observation/import APIs, M14/16; stale July hint quarantined until verified. |
| T10 JUNCTION | 16 columns; 12 rows; 11 formula cells / 1 family; 11 SKUs × 3 component pairs | Existing canonical BOM; real component IDs, per-output-box source basis, verified base output, additive waste. | Item > Manufacturing BOM editor, M15; BH-25 tests. |
| T11 RAW_MATERIAL_MASTER | 7 columns; 33 displayed rows; 99 formula cells / 1 family | Existing Items/Units/Categories + procurement settings/default supplier; blank formulas are not new Items. | Existing Item and procurement settings; policy/conversion APIs. |
| T12 PROCUREMENT PLANNING canvas | Blank rendered canvas; RM_CURRENT_STOCK dependency | v3 raw procurement recommendations from declared demand/BOM/inbound basis. | Existing Procurement Planning root and history; M20. |
| T13 PROCUREMENT_INWARD | 9 columns; 2 rows; one populated receipt | Preserve source date/unit/PO/supplier/cost/received-by text; unmatched PO/cost/actor proof remains an exception. No fabricated receipt or PO. | Staging and actual existing-PO receipt APIs; M10/16. |
| T14 VENDOR_MASTER | 3 columns; 24 displayed rows; seven named vendors plus blank rows | Match actual existing supplier Parties; never create blank suppliers or infer a user ID from role text. | Existing Parties/supplier views, typed supplier policy. |
| T15 Sheet6 | 0 populated/display columns/rows | Explicit empty/no-import evidence disposition. | Manifest only; no navigation/module/table created for it. |
| T16 PO_TRACKER | 15 columns; 7 displayed rows; 136 formula cells / 10 families (more formula-only input rows) | Existing PO source identity, accepted/pending/rejected/quarantined/returned quantities and promised dates. | Existing Purchase Orders plus follow-up/receipt context; M10/12/20/24. |
| T17 PURCHASE TRACKER canvas | Blank rendered canvas; PO_TRACKER dependency | Same real PO read model; no duplicate tracker master. | Existing Purchase area and follow-up API. |
| T18 PURCHASE IN canvas | Blank rendered canvas; RM master + inward + vendor dependencies | Existing-PO partial receipt/return/bill continuity, with source exception staging first. | Existing Purchase area, physical receipt APIs. |
| T19 RM_CURRENT_STOCK | 16 columns; 37 rows; 493 formula cells / 28 families | Reconciled material balances; normalized30 half-month safety, typed lead, shortage-before-MOQ and genuine multiple. Workbook REORDER flag is not imported as truth. | Existing Procurement Planning/settings and stock-as-of API; calculation tests. |
| T20 RAW MATERIAL canvas | Blank rendered canvas; RM_CURRENT_STOCK dependency | Existing Item + raw planning/read models; no separate raw-material master. | Existing Items/Procurement. |
| T21 VENDORS canvas | Blank rendered canvas; VENDOR_MASTER dependency | Existing Party supplier view. Additional receipt-based supplier performance has a distinct name/denominator. | Existing Parties/Purchase; supplier-performance API. |
| T22 SCORECARD canvas | Blank rendered canvas; DISPATCH DATA + PRODUCTION DATA dependencies | Signed dated production AND dispatch, Item/channel comparisons, unit totals, actual dates; no invented canvas/OEE metrics. | Operational `scorecard` API/export; existing Reports integration and explicit UI limit. |

## Complete capability F01–F24

| ID | Backend behavior / reuse | Evidence / remaining product boundary |
|---|---|---|
| F01 | Flow inventory, posting owners, decisions and gaps recorded. | Handoff + actual generated route inventory. |
| F02 | Two masters and three child families only. | M01/02/08/19; no Product/Vendor/Warehouse clones. |
| F03 | Existing Item/Unit/category/packaging/supplier enhancements, stock-edit guards and rational conversion. | M00/15/20/21/22/25; Item/BOM UI integration. |
| F04 | One canonical versioned/effective BOM with declared output basis, frozen raw material basis and waste. | M03/15/19/21; BH-25 and rational tests. |
| F05 | Existing active/effective channel/SKU mappings and inactive source history preserved as evidence. | Source audit including INS HAPPY20; Supply Chain reused, importer never deletes disabled history. |
| F06 | Period aggregates, actual dated demand, dedup, refresh and stale/missing/zero distinctions. | M14/16 and demand calculation tests. |
| F07 | 21-day total target/15-day warning, dated eligible supply and explainable stable top-up snapshot. | M05/22/26, domain examples. |
| F08 | Effective BOM explosion, deterministic shared pool, bottleneck/shortage and non-reserving what-if. | M09 and four material-feasibility tests. |
| F09 | Route/resource/HR shift feasibility, unavailable rates, approved windows and explicit reservations. | M02/08/19; domain overnight/rate tests; SQL schedule gate. |
| F10 | Owned release, partial actual completion/rejects, amendment, short close/cancel and eligible compensation. | M03/04/19; guarded lifecycle tests. |
| F11 | Dated new completions and linked corrections; historical production separately staged/archived. | M04/16/18; existing legacy entry retained. |
| F12 | Existing draft/packing/dispatch workflow; explicit invoice line ownership; historical dispatch separate. | M06/16/21/23; guarded both action-order tests. |
| F13 | Approved cutover openings, signed dated ledger, owned reservation events and controlled adjustment. | M16/17/18/22; guarded opening/as-of/adjustment tests. |
| F14 | Half normalized month, typed weeks/calendar days, positive-shortage MOQ/multiple, explicit inventory basis. | v3 calculator + M20; equality/tiny fractional/10-day/45-day tests. |
| F15 | Selected approved v3 lines create existing numbered PO draft, source-line uniqueness and sourced price. | M20 and actual procurement-root API. It posts no stock or financial journal. |
| F16 | Promise history, current PO follow-up, supplier default/provenance and separately weighted performance. | M10/12/20; actual dates only, missing due dates excluded. |
| F17 | Accepted/rejected/quarantine receipts, zero over-accepted tolerance, bill links, supplier returns and later financial credit. | M10/11/24; guarded end-to-end procedure test. |
| F18 | Existing configured dispatch and separately tested parity helper; no unimplemented selector advertised. | Existing dispatch/parity tests retained; no default policy change. |
| F19 | Existing package/docket/freight/Freight Rojmel/return paths; verified pack guards and legacy draft repair command. | M06/13/21/23; SQL freight/return operational gate remains. |
| F20 | Production AND dispatch scorecard, plan/actual, actual consumption, capacity, stock and exports. | M05/18/22 and report adapter tests. New report screen composition beyond existing reports is not claimed. |
| F21 | All 22 source dispositions, actual column/formula audit, safe-row staged cutover and negative/unmatched exception list. | Source manifest, M16, cutover guide. No business import was executed. |
| F22 | Existing RBAC/actions, trusted catalog company, actor audit, versions, keyed retry, transaction locking. | Security/contract tests, M02/13; real SQL/authenticated gate. |
| F23 | Existing Cosmos Item/BOM/report components/theme remain, existing localized navigation reused; backend contracts support real empty/unavailable/error states. | **Not a completed new React workspace.** Full new order/configuration/capacity/import responsive/localized/accessibility journeys require frontend implementation; this backend deliverable does not claim them. |
| F24 | Actual Swagger fixtures + existing frontend adapters, behavioral tests, reconciliation/cutover documentation and exact results. | Existing report/BOM/Item integrations tested. Authenticated real SQL journeys and a complete new UI remain explicit gates. |

## Confirmed U01–U06

| Rule | Behavior and evidence |
|---|---|
| U01 | Item/context/effectivity-specific identity and verified packaging ratio; source quantity/unit + factor + exact bases preserved in normalized provenance. Missing/unknown/cross-dimension mappings remain staged. Domain ratio/fraction/BH-25 tests; SQL effective profile gate. |
| U02 | Release reserves; completion alone consumes actual material/scrap and adds good FG atomically. Custody return is informational. Owned partial reservation survives; actual rejects do not enter sellable output. Guarded release/partial/rollback tests. |
| U03 | `FinishedDemand` multiplies unrounded daily demand by 21 and 15, never adds them; examples 231/165 and top-up91. |
| U04 | Raw shortage is tested before quantity rounding/MOQ. Equality/surplus zero, tiny positive MOQ, and genuine multiple behavior are tested. Configured dispatch minimum is unchanged. |
| U05 | Normalize observation to30; safety factor .5 means15-day equivalent. Supplier2weeks means14 calendar days. Non30-day and typed duration tests. |
| U06 | Explicit owner2 invoice lines produce no invoice stock movement; source-line links allocate actual partial shipments. Owner1 standalone remains physical. Guarded before/after-two-dispatch and standalone/cancel tests supplied. |

## C01–C16 calculation and transaction families

| ID | Exact policy / concrete evidence |
|---|---|
| C01 | Verified source/base rational bases on existing packaging profile and imported snapshot; same base factor1 only when IDs match. Count/mass/length/volume validation recognizes known units; unknown aliases remain exceptions. Tests330/11,10×11,1,000,000/3 and invalid dimensions. |
| C02 | Output/BOM basis × component × additive waste once. Frozen source basis and cumulative expected budget. Required/actual/scrap/reject not substituted. BH-25 and partial residue tests. |
| C03 | Approved start-of-cutover opening + signed movements on/after cutover up to as-of; owned reservation events reconstruct history. Null/flags for missing proof. Item edits cannot mutate caches; guarded adjustment/opening tests. |
| C04 | Q/N unrounded before horizon multiplication; normalized30, actual7-day and source30/4 kept distinct. Separate missing/stale/zero. No inferred daily sales. |
| C05 | One 21-day target, physical + distinct remaining released output + dated real PO remainder; no second21-day requirement, no double subtraction of forecast-linked reservation. Dated receipt horizon is explicit. Source revision checked before release. |
| C06 | Selected remaining proposed output explodes one effective canonical BOM per Item, shares free component pool by ItemId, returns bottleneck and shortages. Durable reservation begins only on release; cancelled/closed work is not added as open demand. |
| C07 | Setup/runtime under units/minute, sec/unit or verified shots/cavity output; ordered route steps, actual timezone/overnight boundaries, explicit approved exclusions, exclusive booking windows. Unknown/missing calendar/rate is unavailable. |
| C08 | Forecast basis is declared observed finished demand, separate from actual consumption. R30 normalization, safety=.5R30, typed lead; physical+dedup eligible inbound policy is explicit and unchanged regarding reserved subtraction. |
| C09 | max(0,ROP-position), zero before MOQ; baseline=max(positive shortage,MOQ), genuine multiple ceiling. No fractional positive loss before MOQ; six-place final quantization. |
| C10 | Pending=ordered−accepted under zero over-accepted tolerance; reject/quarantine/returns shown separately. Return does not reopen PO supply. Receipt owns physical event; billed return credit does not post it again. |
| C11 | Existing configured service, exact six dispatch rounding modes and loose-quantity bypass retained; minimum can still apply at zero configured shortage. Existing dispatch test suite. |
| C12 | Existing parity helper kept separate; strict tier boundaries, positive denominator/warehouse≤network validation and midpoint-away box behavior retained. No API selector advertised. Existing helper tests. |
| C13 | Snapshot allocations are not reservations. Dispatch rechecks free stock/pack/unit/ownership in transaction. Header/source-line/physical-event uniqueness permits distinct partial shipments. Compensations use original net posted quantity. |
| C14 | Signed production+dispatch+returns/history with business date, Item/channel/unit filters; full-filter unit totals. On-time numerator/denominator only when actual due/completion dates exist; supplier performance separately labeled. |
| C15 | Existing expected date plus revised promise history, actual receipt date and captured promise; current-business-date pending/overdue due list. No external email/message/automation created. Source +3days is not an invented SLA. |
| C16 | Verified shipment pack snapshots, existing freight/docket/Rojmel kept operational; sourced price required, missing cost stays null, currency policy separate. No invented absorption/freight allocation/tax/valuation journals. |

## Verification pass 2: independent journey/reconciliation walk

After building the matrix, the final paths were read again from the source. This pass caught and corrected: the actual `CreateFromDispatchPlan` procedure name; the shipment transition's `@Id` parameter; the transporter-only nature of `PartyRoles`; a stale Item-edit race; exact-flag bypass of genuine purchase multiples; missing raw BOM basis for rational procurement multiplication; unknown legacy output units; unsafe opening duplicates; stale procurement finalization; real dated inbound in finished planning; and financial credit after a physical supplier return.

1. Recomputed BH-25,21/15/7-day,normalized safety,equality/MOQ/multiple examples against domain tests.
2. Walked release→partial good/reject→amend→complete, shortage rollback, reversal and adjustment; executable real-SQL assertions reconcile caches, reservation balances and movement counts.
3. Walked receipt→later bill→accepted return→financial credit; one stock-in and one return stock-out, never bill/credit duplication. Whole-PO conversion reuses accepted receipt identities and only receives remainder.
4. Walked invoice confirmation both before and after two linked partial dispatches; standalone invoice cancellation restores only original own stock. Existing shipment return bounds are retained. New guarded SQL tests encode both sequences.
5. Walked stage→map→validate→reconcile→approve→post→stock-as-of. Adoption of an already reconciled opening changes the ledger anchor, not on-hand twice. Historical source totals remain history, not new ledger movements.
6. Read controller permissions, scope, generated DTO schemas, quantity boundaries and final changed integration files. New masters were counted by purpose and table ownership. SQL bindings/concurrency remain execution gates, not claimed successes.

## Source-data exceptions that remain deliberately quarantined

| Evidence | Required real resolution |
|---|---|
| 32 RM rows; 12 negative;20 zero-demand; all labeled REORDER REQUIRED | Reconcile Item/unit/opening/movement proof. Recalculate alerts from v3; do not copy source flags. Zero openings do not prove zero audited openings. |
| BLACK PP:13,256.25 KG cumulative assumed-box consumption,10,000 KG inward,−3,256.25 KG balance | Verify production source units/BOM basis and real opening/receipt evidence before posting. |
| BLI HAPPY30−1 and HAPPY40−6 | Resolve actual Item IDs, source context and unit; no clamping or invented adjustment. |
| Inactive INS HAPPY20 historical15;24 historical columns vs23 active | Preserve disabled history and explicit active mapping; do not discard history because current entry is inactive. |
| Eleven JUNCTION source SKUs and three component pairs each | Resolve actual Item/component IDs and perBOX output conversion for each. Exact codes: BH-20,BH-25,BH-40,MH-20,GH-20,WH-20,FX-16,HAPPY-20,HAPPY-25,HAPPY-30,HAPPY-40. |
| Aggregate sales last-update hint20Jul2026, operations inOctober | Supply real observed range/refresh proof; keep stale/unavailable until verified. |
| One inward:23Oct2026,PO-2026-001,MAHADEV POLYPLAST,GRN-BLACK-PP,10,000KG; no populated matching PO | Match an actual existing PO/receipt source. Missing cost remains unknown. “Store Supervisor” stays source text, never an arbitrary user ID. |
| Seven named vendors plus blank rows | Match existing Party identities; do not import blank supplier records or invented terms. |
| Repeated form headers/submissions and normalized grids | Use positional cell provenance and normalized event identity; retain duplicates as evidence rather than posting extra movements. |
| Seven blank canvases | Dependencies only are verified. Hidden metric definitions, visual design and interaction parity are unavailable. |
