# Dispatch Planning frontend integration

All endpoints require a JWT. UI access must be driven by the SQL-backed page action shown below; do not infer access from menu visibility.

| Endpoint | Method | Permission | Purpose |
|---|---:|---|---|
| `/api/v1/dispatch-planning/settings` | GET/POST | `DispatchPlanning.SkuSettings` View/Create | List or create effective-dated SKU settings |
| `/api/v1/dispatch-planning/settings/{id}` | GET/PUT/DELETE | Settings View/Edit/Delete | Read, change, or soft-delete a setting |
| `/api/v1/dispatch-planning/imports/validate` | POST | `DispatchPlanning.Imports.Create` | Store and validate typed snapshot rows in a shared import batch |
| `/api/v1/dispatch-planning/imports/manual/validate` | POST | `DispatchPlanning.Imports.Create` | Validate one manually entered snapshot row and create its staged batch |
| `/api/v1/dispatch-planning/imports/{id}/commit` | POST | Imports Create | Commit valid snapshot rows |
| `/api/v1/dispatch-planning/imports/{id}/cancel` | POST | Imports Delete | Cancel only uncommitted batches |
| `/api/v1/dispatch-planning/imports` | GET | Imports View | Paginated batch history |
| `/api/v1/dispatch-planning/runs` | POST/GET | PlanningRuns Create/View | Create draft or list planning history |
| `/api/v1/dispatch-planning/runs/{id}` | GET | PlanningRuns View | Run detail, result matrix, and company-stock snapshots |
| `/api/v1/dispatch-planning/runs/{id}/calculate` | POST | PlanningRuns Create | Calculate normalized recommendations |
| `/api/v1/dispatch-planning/runs/{id}/recommendations` | GET | PlanningRuns View | Filtered recommendation matrix |
| `/api/v1/dispatch-planning/runs/{runId}/recommendations/{id}` | PATCH | PlanningRuns Edit | Override final quantity with a mandatory reason |
| `/api/v1/dispatch-planning/runs/{id}/allocate` | POST | Allocation Edit | Allocate immutable company-stock snapshots |
| `/api/v1/dispatch-planning/runs/{id}/finalize` | POST | PlanningRuns Approve | Lock an Allocated run |
| `/api/v1/dispatch-planning/runs/{id}/cancel` | POST | PlanningRuns Delete | Cancel Draft/Calculated/Allocated run |
| `/api/v1/dispatch-planning/reports/recommendations` | GET | Reports View | Paginated finalized-recommendation report |
| `/api/v1/dispatch-planning/reports/recommendations/export` | GET | Reports Export | CSV export of up to 500 filtered rows |

## Request shapes

`SaveDispatchSkuSettingRequest` contains Item/optional Channel/optional packaging profile, `tier`, positive safety and recurring factors, minimum quantity, loose flag, rounding mode, allocation priority, active flag, and optional effective dates.

`ValidateDispatchSnapshotImportRequest` is the adapter boundary after the shared importer/parser has read the source file. It contains `originalFileName`, optional SHA-256 `fileHash`, `importType` (`1` sales, `2` stock, `3` inbound), `channelId`, and typed rows. The API accepts a valid client-generated hash when available; when it is omitted, the server creates a deterministic hash from the normalized channel, type, and rows. This allows the CSV flow to work in browser contexts that do not expose Web Crypto.

`ValidateManualDispatchSnapshotRequest` contains one `row` plus `importType` and `channelId`. Use `POST /imports/manual/validate` for a Manual Entry form; the server creates both the batch name and hash. Manual and CSV entries use the same row validation, duplicate detection, commit endpoint, immutable snapshot tables, and audit trail.

Every row contains `rowNumber`, `warehouseId`, exact `channelSku`, and type-specific values:

- Sales: `periodFrom`, `periodTo`, `salesQuantity`.
- Stock: `snapshotDate`, `availableQuantity`, optional `reservedQuantity` and `damagedQuantity` (zero when absent).
- Inbound: `snapshotDate`, `inboundQuantity`, `inboundStatus`, optional expected arrival and reference.

Do not send Item codes or product names as a fallback for `channelSku`; mapping is exact active `ChannelItemMappings` only. Validation returns a batch id, counts, `rowErrors`, unmatched-SKU count, and `canCommit`. Render row errors beside the uploaded preview and disable Commit unless `canCommit` is true. Duplicate rows are retained in the audit preview but excluded from committed snapshots; show that count before Commit.

`CreateDispatchPlanningRunRequest` names the selected Channel, planning date, committed sales batch, committed warehouse-stock batch, optional inbound batch, and notes. The released source is system company stock (`companyStockSourceType: 1`).

### Warehouse + SKU result identity

As of the 2026-10-08 database migration, a recommendation is identified by **run + warehouse + channel SKU mapping**, not only by internal Item. A channel can map more than one channel SKU to the same Item. Frontends must therefore use the returned recommendation `id` as the row key and display `channelSku` alongside `itemCode`; do not de-duplicate or aggregate rows using only `itemId + warehouseId`.

Inbound rows are also resolved at that same mapping identity. When preparing inbound imports, submit the exact channel SKU represented by the inbound row. Do not merge multiple channel SKUs that happen to map to the same internal Item.

`UpdateDispatchRecommendationRequest` contains non-negative `finalRecommendationQuantity` and non-empty `overrideReason`. Do not offer it once allocation has occurred.

## Recommended screens and behavior

- **Dispatch Dashboard:** query final report; show current finalized totals and export only when `Reports.Export` is present.
- **Dispatch SKU Settings:** show global and channel rows distinctly; enforce effective-date overlap errors returned by the API.
- **Import Centre:** provide separate **CSV import** and **Manual entry** tabs. CSV parses into typed rows before validation; Manual entry captures one warehouse/SKU row. Call the corresponding validate endpoint, show exact-mapping errors, and retain the returned batch id for Commit.
- **Planning Run Wizard:** require committed snapshot batches for the same Channel before Create; then call Calculate.
- **Recommendation Matrix:** pivot API rows visually by warehouse but keep each API row as a `run + item + warehouse + channel SKU mapping` record. Use the recommendation `id` for React/table keys and show calculation and final quantities side by side.
- **Allocation Screen:** call Allocate once, then show company snapshot available/allocated values and zero allocations. The backend, not the browser, is authoritative.
- **Planning Detail:** use status to control buttons: Draft → Calculate; Calculated → Override/Allocate; Allocated → Finalize; Finalized → read only; Finalized has no cancel/edit controls.
- **Reports:** use pagination; CSV export follows the same filters.

Validation failures return the standard error envelope and field errors where applicable. Business conflicts include uncommitted/mismatched batches, duplicate import files, missing settings/packaging, illegal status transitions, allocation limits, and finalized immutability. Surface `message` and correlation id; do not silently retry mutations.
