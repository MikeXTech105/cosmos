# Production frontend implementation and verification

**Fresh verification update:** the later independent audit found additional real gaps and corrected them. [PRODUCTION_FRONTEND_REVERIFICATION.md](PRODUCTION_FRONTEND_REVERIFICATION.md) records the findings and current boundary. Latest checks:716 frontend tests passed with the same3 employee baseline failures;421 backend tests passed with14 SQL skips; build passed and whole-project lint retains its1 unchanged dispatch finding. There are now39 ordered production scripts, including new36/37, all still awaiting guarded SQL execution.

Implemented on 27 October 2026 in the existing Cosmos React application, on `lucifer-dev`, starting from `f6937755cf04349de2f014b40a5cac25b9bcf6de`. The supplied `PROMPT_2_FRONTEND_IMPLEMENTATION.txt`, actual generated API contracts, acceptance checklist and existing backend behavior were used together. The reference handoff directory was not treated as replacement application code. No live catalog was changed, no bundled backend credentials were used to start an application, and nothing was deployed or committed by this frontend task.

This document supersedes the earlier backend-only statement that the production React workspace was not delivered. The original backend/source/cutover documentation still governs stock, reservation and financial ownership. See [frontend acceptance/source coverage](PRODUCTION_FRONTEND_COVERAGE.md), [backend coverage](PRODUCTION_COVERAGE_MATRIX.md), [actual generated contracts](production-contracts/implemented-routes.json), and [migration/cutover prerequisites](PRODUCTION_MIGRATION_CUTOVER.md).

The exact changed-file inventory for this task is [PRODUCTION_FRONTEND_CHANGED_FILES.json](PRODUCTION_FRONTEND_CHANGED_FILES.json); it excludes the pre-existing reference `handoff/` package.

## Screens, services and permissions

| Actual screen / route | Behavior and existing integration | Service / permission |
|---|---|---|
| `/manufacturing/configuration` | Exactly two master lists/editors: Work Centre and Operation. Work Centre owns effective HR shift/capacity assignments and dated break/downtime read/edit. | `productionConfigurationService`; `Manufacturing.Configuration` View/Create/Edit/Approve |
| Existing Item → Manufacturing | Existing canonical BOM stays in place; routing revisions and Item–machine–mould eligibility are subordinate panels. No duplicate Item/BOM/resource master. | Same configuration service; existing Item/BOM and OEE/HR lookup permissions |
| Existing packaging profile editor | Saved profile verifies real source/base unit ratio and provenance with the returned opaque version. | Existing Supply Chain profile plus conversion API; `SupplyChain.PackagingProfiles` View/Approve |
| `/manufacturing/orders`, `/new`, `/:id`, `/:id/edit` | Real paging/filtering, draft create/edit, entire-allocation release, frozen BOM/routing/resource context, actual reservation/free-stock balances, repeated partial good/reject/consumption/scrap/staging return, amendment, capacity read, explicit booking/reschedule, close/cancel and eligible linked reversal. | `productionOrderService`; `Manufacturing.Orders` View/Create/Edit/Approve |
| `/manufacturing/planning?snapshot=…` | Observed demand and freshness, saved immutable stock/demand snapshots, target21/warning15/true7-day/quarter-month/normalized30, selected exact output quantities, one shared material pool, bottlenecks and source-linked draft review. Draft form reloads and verifies the actual saved source line. | `productionWorkspaceService`; Orders View/Edit/Create |
| Existing procurement settings/history | Typed CalendarDays/Weeks supplier lead, default supplier, v3 calculation evidence, exact fractional quantity display/adjustment, selected finalized positive purchase lines with sourced price/tax. Persisted PO source links support unknown-result recovery. | Existing precise planning reads plus `physicalInventoryService`; planning View/Approve, PO View/Create, supplier/Item lookup rights |
| Existing PO and purchase bill detail | PO Draft→Sent approval, promise changes/history, remainder close, accepted/reject/quarantine receipt, actual receipt-line return, later bill allocations and financial credit from a real confirmed billed source. Existing confirmation/payment/return screens remain in place. | Physical service; actual `PurchaseExpense.PurchaseOrder/PurchaseBill/PurchaseReturn` actions |
| `/purchase/operations` | Current-business-date follow-ups and supplier performance, separately labeled from production/dispatch scorecard; server paging and unit-separated full-filter summaries. | PO View; supplier lookup permissions |
| Existing invoice / shipment detail | Explicit line owner declaration; partial multi-line invoice/shipment links; persisted parent invoice links; separate shipment-only packing context/version; verified effective packaging/base units and reason. Existing carton/docket/freight/Rojmel/dispatch/return actions remain authoritative. | Physical service; both Sales.Invoice and ShipmentOperations.Shipments permissions for links; shipment permissions for packing |
| `/manufacturing/imports?batch=…` | Real CSV/TSV file adapter preserving duplicate headers, original strings and blank row positions; per-cell provenance/hash; all22 source dispositions; mapping/repair, selected validate/reconcile/approve/post, original/normalized evidence and exact balance differences; controlled signed stock adjustment. | Workspace service; Orders View/Create/Edit/Approve; adjustments require Items View/Approve |
| `/reports/manufacturing/operations` | Stock-as-of, signed ledger, production+dispatch scorecard, plan-actual and capacity, server filters/paging, full-filter unit totals, quality flags and authoritative parent-document drilldown. Matching operational NDJSON export. | Workspace service; Manufacturing.Reports View/Export |
| Existing `/reports/manufacturing` | Authoritative production/material report adapter and existing CSV export retained. Required/expected/actual/scrap/good/rejected remain separate; exact six-place manufacturing rendering and literal percentage points. | Existing manufacturing reports/export infrastructure with opt-in exact production transport |

The sidebar contains an integrated Production category and existing Purchase/Reports links. Deep links use the existing protected layout and permission resolver. Workspace navigation hides inaccessible destinations. OEE/HR/Party/Item/Unit/profile lookups retain their independent real permissions; unavailable access does not cause invented IDs or role grants.

## Precision, dates and recovery

`productionApi` reuses Cosmos's existing Axios authentication/refresh interceptors. Its opt-in lossless JSON parser returns safe integer counts/enums normally and keeps decimal/large numeric tokens as exact strings. Decimal and bigint request wrappers emit numeric JSON tokens, as required by the actual .NET contract. The serializer retains already serialized requests during authentication replay. Forms retain text through validation; no arbitrary22-digit quantity is first converted to a native floating point number.

The new authenticated runtime read obtains the verified catalog company, configured business date/timezone, browser-compatible zone and closed-through date. No company selector, actor override, workstation date or UTC-today substitute is introduced. Completion/booking times retain explicit offsets, including overnight boundaries; DST gaps/ambiguity are rejected by the conversion helper. Posting quantities allow six places; import source evidence allows twelve. Financial prices/tax keep their actual separate contract scales. Null, zero, missing, stale and no-demand remain distinct.

Stable keys belong to one intended command and remain unchanged for an identical unknown-result retry. Changed payloads cannot bypass an unknown result. Double clicks are locked before awaiting the network. Stale versions stop submission until successful authoritative reload. A committed write followed by failed context refresh is reported as committed/readback-failed, never as permission to post a new transaction. Endpoints without idempotency support (for example draft/master creation) use their honest unknown-result review workflow. No unsupported key is advertised as server protection.

## Minimal backend contract corrections

Nine additional ordered migrations extend the existing read model and source-validation conventions, without adding business masters or changing the physical posting owner:

- **29:** persisted order resource/source fields, completion material history and actual reservation/free-stock context.
- **30:** receipt header identities/versions, original PO canonical units, returns, actual bill allocations/statuses/numbers and promise history.
- **31:** persisted invoice parent identities and a shipment-only packing context that does not require invoice visibility.
- **32:** parent document IDs/types for operational event drilldown; event/source-line identities remain separate.
- **33:** dated break/downtime calendar readback with current shift-configuration version.
- **34:** persisted procurement recommendation→PO source links for review and unknown-result recovery.
- **35:** real supplier/Item/unit labels on purchasing operational reads.
- **36 (fresh audit):** actual capacity factor and exact whole-second booking lower bound used by the scheduling guard.
- **37 (fresh audit):** recommendation channel consistency through draft/release/amendment, cutover consistency on identical staging recovery and actual saved file/cutover metadata.

The fresh audit also preserves amendment material baselines already returned by the existing context and makes the intentionally unknown purchase remainder nullable. Current exact document form/lookup/quantity transport and summary alias corrections are detailed in the re-verification report.

`GET /api/v1/manufacturing/runtime` is a read-only authenticated company-context endpoint. The calendar, packing and procurement read additions retain the actual module permission boundaries. Six OpenAPI documents and the actual route inventory were regenerated through the real application Swagger factory with SQL forbidden. No backend was launched against bundled appsettings.

## Verification passes

Pass1 traced source/acceptance requirements to concrete routes, DTOs, existing screen integration, numeric/null ownership and permission semantics. The independent review matrix records all T/F/U/C identifiers and A01–A30 evidence.

Pass2 independently walked source-linked drafts, partial completion and reservation models, purchase/invoice/packing contexts, import transitions and report/export behavior. It found and corrected omitted real parent IDs, absent calendar readback, unsafe numeric decoding, fractional procurement display/adjustment, false empty report state, nested table headers, draft-filter versus applied-report labeling, premature unknown-result unlock and stale source document links. Meaningful DOM tests exercised selected exact quantities, unavailable stale rows, forbidden no-fetch behavior, real record count/unit totals/null display/export filters, duplicate-click locks and committed-write/readback-failure recovery.

The browser runner `frontend/scripts/production-browser-fixture.mjs` is explicitly test-only, binds127.0.0.1, labels synthetic data, and cannot run SQL or forward production API requests. It is not part of application startup and is not a production fallback. Actual browser checks and final automated counts are recorded in [verification results](PRODUCTION_FRONTEND_VERIFICATION.json). These mocked UI checks do not establish SQL transaction correctness.

## Explicit execution and source boundaries

- No disposable SQL Server/LocalDB/container runtime is configured here. All39 production SQL migration scripts need guarded bootstrap/binding/repeatability verification, followed by the authenticated guarded journeys in the cutover guide. SQL skips remain skips.
- Import accepts genuine one-tab CSV/TSV exports. A workbook must be exported per tab; it is not silently parsed through an invented multipart API. Full original header/cell text stays in provenance. The server limit is5,000 source cells per batch. Blank/canvas evidence is preserved and has no fabricated rendered metrics.
- The implemented financial credit command creates one full physical accepted-return credit against one actual confirmed bill line. A physical return spanning several billed sources cannot be credited by inventing one bill identity or changing the existing return. The UI validates/explains this boundary and preserves its audit. Separate documented return allocations can be posted against their actual billed sources where appropriate; automatic splitting/reversal and a new financial-credit allocation model were not introduced in a frontend task.
- Existing three employee validation test failures are separate baseline behavior. The unrelated existing dispatch-import effect lint finding is reported separately; production changes do not suppress the rule.
- Real source exceptions remain unresolved until source proof exists: negative/zero RM demand/status rows, negative BLACK PP stock from unverified BOX assumptions, unresolved BLI units, inactive INS history, JUNCTION output basis, stale sales period, unmatched inward PO/cost/actor text and vendor blanks. No user/supplier/Item/unit/PO/cost is fabricated to clear them.

No approval/posting rights, real transactions, migration binding, user authentication against a disposable catalog or unavailable source proof is inferred from a successful build, parser, mock or screenshot.
