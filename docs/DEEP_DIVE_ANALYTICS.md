# COSMOS Deep Dive Analytics

Implemented as a frontend module inside the existing authenticated application. No backend, database, permissions schema, credentials, or dependencies were changed. The reference images guided the information hierarchy; their sample metrics, sensor feeds and filing statuses are not production data.

## Repository findings and implementation decisions

- React 19, Vite, React Router, Redux Toolkit, Axios, Recharts and Lucide were already available. Existing PageHeader, MetricCard, AppButton, AppSelect, AppDateRangeFilter and AppModal provide the visual and interaction foundation.
- The app uses accent palettes and light content surfaces. Sidebar dark/light variants do not constitute a global dark-content theme. Deep Dive follows the active accent and existing light canvas, with navy inherited from the sidebar. No parallel theme or forced dark screen was added.
- Sidebar aliases support `permissionTargets` and `preservePresentation`. Deep Dive reuses actual existing page grants, keeping its five labels distinct from their source modules.
- OEE production entries have shots, saved targets, date, machine, mould, entered on-time and reason. They do **not** contain measured runtime, ideal-cycle time, good/rejected counts or event durations. The displayed production ratio is explicitly target achievement, not A × P × Q.
- Dispatch recommendation reports are paginated finalized-run snapshots. Their quantities describe allocation, not shipment execution or delivery SLA.
- Procurement history provides planning runs and material lines, not purchase-order currency values.
- Rojmel dashboard balances are current snapshots. Summary income/expense follows the date query. Daily cashflow is an authoritative, non-paginated income/expense report with cancelled rows, transfers, adjustments and opening balances excluded by SQL.
- Important live verification finding: the Rojmel **recent-transactions** dashboard endpoint accepts a dashboard query but its repository passes only count and access scope, ignoring dates. Deep Dive therefore uses the date-filtered, complete **transactions** endpoint under its own `Rojmel.Transactions` grant.
- GST configuration is not a heartbeat; operation logs are not government filing confirmations. Invoice/waybill list feeds and ITC reconciliation are unavailable.

## Pages and how to open them

Open **Deep Dive** in the Cosmos sidebar. The root `/deep-dive-analytics` redirects to Command Center.

| Page | Route | Implemented experience |
| --- | --- | --- |
| Executive Command Center | `/deep-dive-analytics/executive-command-center` | Four sourced KPIs with record drill-down, independent module pulse, dispatch streams, manufacturing summary, cashflow, financial journal, evidence-based review signals and source health |
| OEE Manufacturing Telemetry | `/deep-dive-analytics/oee-telemetry` | Machine selector, shot-target gauges, real prior-period comparison, output trend, issue-frequency Pareto, calendar/ledger grouped once per date and all-machine daily details |
| Rojmel Financial Hub | `/deep-dive-analytics/rojmel-financial-hub` | Scoped current balances, period income/expense/transfers, daily cashflow chart/table, wallet register and complete period transaction ledger with inspect actions |
| GST & Statutory Intelligence | `/deep-dive-analytics/gst-intelligence` | Provider configuration, explicit unknown health, registration coverage, completed/failed/unknown observations and safe operation details |
| Cross-Module Intelligence | `/deep-dive-analytics/cross-module-intelligence` | Independent review signals, procurement run/material drill-down and finalized dispatch allocation records; no invented causal links |

`from=YYYY-MM-DD&to=YYYY-MM-DD` persists the date scope; `q=` persists the debounced record search; `machine=` persists the manufacturing selection. Deep Dive navigation keeps these values. URLs can be bookmarked; no centrally governed saved-view store was introduced. The default is the last 30 calendar dates in IST. Ranges must be real, ordered dates spanning at most 366 days. Date-picker presets and custom dates are supported. Search filters visible record tables, while KPI scope stays explicit and unchanged.

## Architecture and changed files

New files under `frontend/src/pages/deepDive/`:

- `deepDiveConfig.js`: five pages, source permission registry and sidebar aliases.
- `deepDiveData.js`: existing-service adapters, complete pagination, contract validation, date conversion, safe errors and numeric aggregation.
- `useDeepDive.js`: independent source state, at most four source workers, cancellation, auth-snapshot isolation and freshness clock.
- `DeepDivePage.jsx`: page composition, authorization gate, date/search URL state, navigation, shared KPI modal and source transparency.
- `DeepDiveSections.jsx`: functional manufacturing, finance, GST, procurement, dispatch and evidence sections.
- `DeepDiveShared.jsx`: shared panels, KPIs, status badges, sortable/paged/searchable/exportable tables, details and accessible charts.
- `deepDive.css`: scoped layout, Cosmos accent tokens, responsive grids, keyboard focus and reduced-motion rules.
- `deepDiveData.test.js`: permission, pagination, contract, date, privacy and aggregation tests.

Existing files changed: `frontend/src/config/sidebar.js`, `frontend/src/routes/AppRoutes.jsx`, `frontend/src/hooks/useSidebarMenu.test.js`. OEE helpers, daily calendar/detail components, service clients, permission resolver, CSV sanitizer and monetary summation are reused. Existing feature pages were not rewritten.

## Authorization and data lifecycle

The sidebar and route require at least one applicable **view** permission. Each individual source additionally checks its own exact route/page target before requesting anything. OEE access never enables financial or GST reads. Rojmel reports, dashboard and transaction grants remain independent. CSV requires the corresponding source's **export** permission; there is no view-to-export fallback. Backend authentication and scope enforcement remain authoritative.

Source data is isolated by page, period, refresh revision and auth snapshot. Obsolete results are ignored; AbortSignal is passed where the existing client supports it. Procurement/dispatch clients currently lack cancellation arguments, so an in-flight request may finish, but its result is discarded and remaining pagination stops. Four workers cap simultaneous sources; pages are fetched sequentially per source. No N+1 details are fetched: procurement material lines load only when a run is opened.

Each source renders loading, empty, unavailable or restricted states independently. Source errors do not erase other modules. Old data is not retained as if it belonged to a new filter. Page-size is 200; generic lists cap at 25 pages / 5,000 rows, and the existing OEE loader caps at 100 pages / 20,000 rows. Count changes, repeated pages and truncated collections fail visibly rather than producing sample-based KPIs. High-volume users must narrow the window until aggregation endpoints are available.

Refresh is manual, with per-source fetched timestamps and a ten-minute stale-snapshot notice. A visibility-aware minute timer updates freshness text only; it does not poll the backend or manufacture data. No claims of live synchronization are made. Current balances/configuration/registrations are explicitly independent of the date window.

## Verified API contracts used

All calls are GET through existing Axios services and response unwrapping. No mutation or provider refresh action is called.

| Existing endpoint | Query / response used | Required existing page |
| --- | --- | --- |
| `/api/v1/oee/production-entries` | `FromDate`, `ToDate`, `Page`, `PageSize`, `SortBy=productionDate`; `items`, `totalCount`, `totalPages`; shots/target/machine/date/mould/reason | `OEE.ProductionEntries` |
| `/api/v1/procurement-planning/plans/runs` | `FromDate`, `ToDate`, `PageNumber`, `PageSize`; paged run summaries with id/runNumber/status/lineCount/purchaseLineCount | `ProcurementPlanning.PlanningHistory` |
| `/api/v1/procurement-planning/plans/runs/{id}` | On-demand run with material `lines`: stock, shortage, final quantity, unit, warnings and calculation explanation | `ProcurementPlanning.PlanningHistory` |
| `/api/v1/dispatch-planning/reports/recommendations` | `FromDate`, `ToDate`, `Status=4` (finalized), `PageNumber`, `PageSize`; paged run/item/warehouse/channel recommended and allocated quantities | `DispatchPlanning.Reports` |
| `/api/v1/rojmel/dashboard/summary` | `FromDate`, `ToDate`; `isAllWalletView`, current company/total balance and period income/expense/transfers | `Rojmel.Dashboard` |
| `/api/v1/rojmel/dashboard/wallet-balances` | Current accessible wallet balances; date-independent | `Rojmel.Dashboard` |
| `/api/v1/rojmel/transactions` | `FromDate`, `ToDate`, `SortBy=transactionDate`, `SortDirection=desc`, `PageNumber`, `PageSize`; complete period transactions, type/status/balance details | `Rojmel.Transactions` |
| `/api/v1/rojmel/reports/daily-cash-flow` | `FromDate`, `ToDate`; collection of transactionDate/income/expense/netIncomeExpense | `Rojmel.Reports` |
| `/api/v1/gst/configuration/status` | Environment, enabled features, missing setting **names**; no secrets | `GST.Configuration` |
| `/api/v1/gst/registrations` | Paged current GSTIN/legal name/branch/status/enabled-feature flags | `GST.Registration` |
| `/api/v1/gst/api-logs` | Complete paged logs, `CreatedAt DESC`, selected full IST days converted to UTC instants; safe whitelisted operation/status/duration fields only | `GST.Logs` |

GST request/response payloads, tokens, usernames, credentials and arbitrary error bodies are never rendered or exported by this module. Safe log summaries reuse the existing sanitizer. Export columns match the displayed whitelist and existing CSV formula-injection protection.

## Metric definitions

- **Open planning runs:** count of Draft (1), Calculated (3), Reviewed (4) run snapshots returned for the selected planning window. Not outstanding purchase orders or currency value.
- **Dispatch allocation:** sum of allocated quantity / sum of recommended quantity for rows with positive recommendations and nonnegative valid allocations. Missing values are excluded, not coerced to zero. Gaps sum positive line-level differences without over-allocation offset.
- **Production achievement:** sum of shots / sum of saved target for comparable readings only. Positive saved target and valid nonnegative shots are required. Not capped at 100%; the visual ring caps its fill only.
- **Reading shortfall:** sum of positive saved-target minus shot-count differences per comparable reading. Separate from a net factory gap.
- **Prior production period:** immediately preceding equal-length inclusive calendar range. Percentage-point changes for achievement; relative changes for output and reporting-machine counts. Missing baseline and zero denominator never produce fabricated percentages.
- **Current wallet balance:** total accessible wallet balance when `isAllWalletView`, otherwise company wallet balance as defined by the existing dashboard. Never added together with wallet rows or period flows.
- **Cashflow:** server-provided income, expense and net income/expense; sums use integer paise. Transfers and opening balances remain separate ledger types, not revenue.
- **GST outcomes:** explicit boolean true = Completed API operation; false = Failed; anything missing/other = Unknown. No outcome implies filing, ITC approval or current provider availability.
- **Review signals:** positive production target gaps, invalid comparable readings, repeated machine/date pairs, positive finalized allocation gaps and explicit failed GST operations. These are computed review prompts, not persisted incidents with resolution states. Repeated readings are not automatically errors. No arbitrary OEE threshold or causal stock-loss assertion is used.

## Backend dependencies — not implemented

These are the precise missing capabilities needed to realize the illustrated live command center. They require separate backend authorization and work; no proposed URL below is called by the frontend.

1. **True OEE / machine timeline:** tenant-scoped daily/shift machine metrics with `machineId`, `productionDate`, `shiftId`, `plannedProductionMinutes`, `runMinutes`, `idealCycleSeconds`, `totalCount`, `goodCount`, `rejectedCount`, measurement basis and generated timestamp. Event feed needs `eventId`, machine/shift IDs, UTC start/end, reason, state and authoritative source. Without these, availability/performance/quality, stop-minute Pareto, RPM/temperature and sensor status are unavailable.
2. **Operating scope/calendar:** authorized company/plant/shift lists and filter semantics, shift boundaries/timezone, production calendar/holidays and expected reporting machines. Needed before claiming missing-form SLA, shift completeness or idle production on unlogged dates.
3. **End-to-end operational trace:** explicit PO/order-line/material-item/BOM/production-batch/shipment/payment relationships, each with stable IDs, quantities/units, state and authoritative timestamps. Needed for vendor → warehouse → manufacturing → delivery trace, stock buffers, actual delivery SLA and causal cross-module shortage impacts.
4. **Financial reconciliation:** scoped outstanding AP/AR and due dates, bank-reconciled balances, currency, ledger/account IDs and cancellation rules. Balance snapshots alone cannot establish cash availability, outstanding payables or bank liquidity.
5. **GST registers and reconciliation:** paginated invoice/IRN/E-Way Bill records linked to company registration, invoice and shipment IDs; separately sourced authority statuses with observedAt/verifiedAt; return periods/filing acknowledgments; invoice-level GSTR-2B matching and ITC eligibility. Existing lookup/configuration/log APIs do not replace these.
6. **Integration health:** authenticated provider health/last-success/last-failure/observedAt and failure classification, with safe messages. Configured credentials and historical successful logs are insufficient for "Connected".
7. **Scale and synchronized snapshots:** aggregate period KPIs with coverage counts, stable snapshot/cursor ID and server generated timestamp. Current complete pagination detects count/repeated-page anomalies but cannot guarantee transaction-level consistency if records are concurrently edited without count changes.
8. **Shared saved views / alert workflow:** scoped saved filter definitions and persisted incident IDs, severity, acknowledged/resolved states, timestamps and entity links. Current bookmarked URLs and computed review signals remain local navigation and read-only analysis.

## Validation and QA

Validation on 22 October 2026:

- Full Vitest suite: **523 tests passed across 76 files**, including 17 new Deep Dive / sidebar cases.
- Production Vite build passed. Scoped ESLint on every changed frontend file passed. `git diff --check` passed.
- All five routes were exercised against the existing authenticated backend. The login session expired during testing; the user signed back in and verification continued without bypassing authentication.
- Verified: date preset changes persist in the URL; machine filter selection persists in the URL; equal previous-period comparison; daily modal lists both machines for 8 October; transaction details retain transfer type/status; dispatch detail shows actual warehouse quantities; numeric sort reverses 6/14 correctly; search narrows dispatch to Warehouse B; CSV export action runs for filtered records; attention cards open source evidence.
- Live examples: default-window dispatch allocation 20/30 = 66.7%; production achievement 7,500/7,500 = 100%; current wallet balance ₹74,350. September income ₹500, expense ₹6,250 and separate transfers ₹5,500 match the cashflow and summary sources. These are observations, never hardcoded application values.
- GST configuration returned Production with configured features; registrations and period logs were empty, correctly rendered without simulated successful filings. Procurement history was empty even for year-to-date; on-demand run-line integration was checked against the existing contract but a populated run modal could not be exercised against this data.
- A day-modal integration error found during browser QA was fixed and the flow was re-tested successfully. Final browser flows produced no new runtime errors. CSV download bytes were not independently retrieved from the browser download store.
- Screenshots: `output/deep-dive/`. No production data was created, edited or deleted during UI testing.

Layout uses explicit breakpoints for desktop/tablet/mobile, wrapping navigation, local table scrolling, one-column small-screen cards, labelled controls, visible focus, existing focus-trapped modals and chart-data table alternatives. Chart animation is disabled and CSS honors reduced-motion preferences. The available browser tool does not expose viewport resizing, so exact 390/768/1024/1366/1600/1920 device-size verification remains a manual QA item. There is no application-wide dark-content mode to certify independently of the existing theme.

No new package installation, backend migration, provider credential, commit or deployment is required for the implemented frontend. The unavailable live telemetry / reconciliation features above are clearly identified in the product and are not simulated.
