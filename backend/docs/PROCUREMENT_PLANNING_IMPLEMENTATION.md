# Procurement Planning Module

## Outcome

The module converts dated, channel-level finished-product sales into material purchase recommendations. It is recommendation-only: it does not create, approve, or track purchase orders.

The implementation follows the existing COSMOS pipeline:

`Controller -> Application service -> Repository abstraction -> Dapper repository -> SQL stored procedure`

All APIs use JWT authentication, the existing `ApiResponse<T>` envelope, existing exception middleware, page/action permissions, audit repository, UTC audit timestamps, Dapper, SQL Server stored procedures, and Swagger group `procurement-planning`.

## Discovery Record

The solution, current modules, database package, documentation, tests, and supplied workbook were inspected before implementation.

| Area | Existing behavior found | Decision |
|---|---|---|
| Architecture | Layered API, Application, Contracts, Domain, Infrastructure, Persistence, Shared projects. | Added the module within the same layers. |
| API conventions | Versioned controller routes, `ApiControllerBase`, `ApiResponse<T>`, FluentValidation, exception middleware. | Reused unchanged. |
| Persistence | Repositories open connections through `ISqlConnectionFactory` and call stored procedures through shared Dapper executors. | Added one repository and module procedures. |
| Transactions | Multi-row SQL workflows use `XACT_ABORT`, `TRY/CATCH`, explicit transactions, and status result sets. | Import, BOM replacement, run saving, and import cancellation are transactional. |
| Security | JWT `[Authorize]`, page names, and `View/Create/Edit/Delete/Export/Approve` actions. | Added one module page and six child pages. Granular workflows map to existing actions. |
| Audit | Tables use created/modified user and UTC timestamp columns; application actions can also write audit entries. | Applied both table audit columns and application audit events for mutations. |
| Soft delete | Existing modules use `IsDeleted`; conventions vary slightly by older module. | New mutable masters/history use `IsDeleted`; planning snapshots remain retained. |
| Item master | Existing `Items` has Product/Service `ItemType` and stock columns. Existing stock-changing SQL assumes those two values. | Added a nullable, independent `ProcurementClassification`; did not change `ItemType`. |
| Unit/category | Existing item foreign keys and APIs already cover both. | Reused directly. |
| Inventory | Current snapshot is `Items.CurrentStock`; `StockMovements` records movements. There is no general warehouse/company/branch stock-balance model in this repository. | Planning is global and snapshots `Items.CurrentStock`. `ReservedStock`, inbound, open orders, and helper stock are excluded. |
| Excel/CSV | No reusable production XLSX import/export framework was present; one legacy export emits HTML with an `.xls` extension. | Added a small internal XLSX reader/writer plus RFC-style CSV parsing for this module. |
| Reporting | Existing report modules use service/repository procedures but no reusable XLSX package. | Planning export is a true `.xlsx`. |
| Tests | xUnit, FluentAssertions, and Moq are already used. | Added pure calculation, spreadsheet, and workbook-regression tests. |
| Frontend | React directory is a placeholder; module UI is not implemented. | Published an exact frontend integration contract. |
| Documentation | Module guides, implementation trackers, feature inventory, and project progress files are used. | Added this guide, frontend guide, workbook report, and project/package updates. |

## Workbook Findings

The supplied workbook contains six sheets: `30 DAYSALE`, `STOCK`, `ADU`, `LEAD TIME`, `OUTPUT`, and `WHITE BOX DATA`.

Included:

- Finished-product/channel quantities from `30 DAYSALE`.
- Physical material stock from `STOCK` column B.
- BOM-like coefficients, safety factors, and EOQ/MOQ values from `ADU`.
- Lead-time records/averages from `LEAD TIME`.
- Displayed results from `OUTPUT` for compatibility analysis.

Excluded:

- `WHITE BOX DATA`.
- Open Order 1, Open Order 2, and Open Order 3.
- Inbound stock.
- Purchase-order workflows.

`INS` is seeded as Instamart.

Important workbook defects were not copied into the ERP logic:

- Many `ADU`/`OUTPUT` formulas reference `STOCK` column G, which contains changing/helper values, instead of column B physical stock.
- Several box/output row references are shifted or duplicated.
- Spring and rivet are dependent material formulas. They were flattened into per-finished-product BOM coefficients in the migration report.

Compatibility status uses an absolute tolerance of `0.00001` material units. The API snapshots six decimal places; this tolerance is smaller than a displayed five-decimal workbook difference while allowing the workbook's truncated repeating decimals. Exact packing/whole-piece order constraints should be expressed through `OrderMultiple`, not a looser comparison tolerance.

The complete extracted inventory, proposed BOM, settings, channel blockers, compatibility results, and assumptions are in `PROCUREMENT_PLANNING_WORKBOOK_MIGRATION_REPORT.xlsx`. The staging database had one unrelated Item named `xyz`; no workbook item was auto-created or guessed.

Representative regression results:

| Material | Workbook displayed | Cleaned API | Difference | Status |
|---|---:|---:|---:|---|
| BLACK HANGER | 24630 | 24630 | 0 | Compatible |
| GREY HANGER | 8600 | 8600 | 0 | Compatible |
| WHITE HANGER | 7440 | 7440 | 0 | Compatible |
| MH HANGER | 5960 | 5960 | 0 | Compatible |
| FLEXI BLACK HANGER | 3360 | 3360 | 0 | Compatible |
| OREO CLIP (DZN) | 2908.5 | 2908.5 | 0 | Compatible |
| DELUX CLIP (DZN) | 1614 | 1609 | -5 | Expected difference: physical stock 95 vs helper stock 90 |
| KEEPER 55 | 845.833333 | 872.833333 | 27 | Expected difference: physical stock 64 vs helper stock 91 |

## Database Design

Migration: `database/migrations/20260715_procurement_planning_module.sql`

| Table/change | Purpose |
|---|---|
| `Items.ProcurementClassification` | Nullable classification: Finished Product, Raw Material, Component, or Packing Material. |
| `SalesChannels` | Configurable channel master; seeds AMZ, BLI, INS. |
| `ChannelSkuMappings` | One active Item mapping per channel/SKU. |
| `ProcurementSalesImportBatches` | File hash, counts, state, correction/cancellation reason, and audit history. |
| `ProcurementSalesHistory` | Daily/channel/SKU sales, optional resolved Item, source row, import batch or manual origin. |
| `ProductBomComponents` | Legacy active/historical finished-product/component coefficients retained for history. From the Manufacturing consolidation migration, live planning reads the applicable versioned Manufacturing BOM instead. |
| `ProcurementSettings` | Material lead time, safety factor, MOQ, order multiple, calculation/manual flags, rounding. |
| `ProcurementLeadTimeHistory` | Ordered/received dates and calculated lead-time days. |
| `ProcurementPlanningRuns` | Draft/finalized run header and calculation metadata. |
| `ProcurementPlanningRunLines` | Complete immutable input/result snapshot plus draft final quantity and adjustment reason. |

Key controls:

- Unique channel code.
- Filtered uniqueness for an active channel/SKU mapping.
- Positive sales and BOM quantities.
- One active procurement setting per Item.
- Valid status/rounding/classification constraints.
- Unique run number and one run line per material.
- Adjustment reason required when final quantity differs from calculated quantity.
- Import hash lookup plus unique active source row within a batch.
- Supporting indexes for period/item/channel, unmapped SKU, BOM, settings, lead history, and planning history queries.

The migration is additive and idempotent. It extends the existing Item stored procedures without invalidating existing records or changing Product/Service stock behavior.

## Calculation Specification

For an inclusive period of `N` days:

```text
FinishedProductSales = sum(valid mapped sales quantity by finished product)
MaterialRequirement = sum(FinishedProductSales × BOM.QuantityRequired)
ADU = MaterialRequirement / N
EffectiveLeadTime = override, else average lead-time history, else configured lead time
LeadTimeDemand = ADU × EffectiveLeadTime
SafetyStock = MaterialRequirement × SafetyFactor
ReorderPoint = LeadTimeDemand + SafetyStock
Shortage = max(0, ReorderPoint − PhysicalStock)
SuggestedQuantity = PhysicalStock > ReorderPoint
                    ? 0
                    : max(Shortage, MinimumOrderQuantity)
FinalQuantity = round SuggestedQuantity up to OrderMultiple when configured
```

Rules:

- Decimal outputs are rounded to six places, away from zero at midpoint.
- The comparison is strict `>`; stock equal to reorder point still applies the MOQ branch.
- Physical stock is the global `Items.CurrentStock` snapshot. Reservations, inbound stock, open orders, and workbook helpers are excluded.
- A manual-planning material remains visible, carries a warning, and receives zero automatic suggestion.
- Disabled automatic calculation behaves similarly.
- Unmapped SKUs, no sales, missing BOM, inactive inputs, missing settings, missing effective lead time, missing safety factor, or missing MOQ are reported explicitly. Blocking errors prevent saving a run.
- Preview does not persist. Saving recalculates from current authoritative data and stores a draft snapshot.

## Import Behavior

Accepted files: `.csv` or `.xlsx`, maximum 10 MB.

Required columns:

```text
SalesDate, ChannelCode, ChannelSku, ChannelProductName, Quantity
```

- Preview parses the file, reports every row error, resolves active channel/SKU mappings, computes SHA-256, and reports duplicate-file state.
- Unmapped rows are valid import records but remain visible and block planning until mapped.
- Confirm rejects invalid rows. An already-imported hash requires `allowDuplicate=true` and a non-empty correction reason.
- Confirm writes the batch and all rows atomically.
- Creating an active SKU mapping resolves matching historical unmapped rows without replacing already mapped history.
- Cancellation requires a reason, soft-deletes participating sales rows, retains the batch as `Cancelled`, and writes audit history.
- Manual entries are stored separately (`IsManual=1`) and can be updated/deleted only through their manual endpoints.

## BOM and Settings Lifecycle

- A finished product may contain multiple components; a component may be reused by many products.
- A product cannot reference itself.
- Duplicate active components are rejected.
- Component quantity must be positive and its unit must match the Item unit.
- Saving a BOM deactivates the prior active set and inserts the new set transactionally, preserving history.
- The settings page exposes missing/inactive configuration and lead-time history.
- Effective lead-time precedence is deterministic: override, history average, configured.

## Planning Lifecycle

1. Validate a date range and configuration.
2. Preview calculated lines and all messages.
3. Save the current calculation as a Draft run.
4. Optionally adjust a line's final quantity with a mandatory reason.
5. Finalize the run. Finalized runs cannot be edited.
6. Export the stored snapshot as a true XLSX file.

No saved run is recalculated when stock, BOM, settings, mappings, sales, or lead history changes later.

## Security

Pages:

- `ProcurementPlanning`
- `ProcurementPlanning.SalesImport`
- `ProcurementPlanning.SkuMapping`
- `ProcurementPlanning.BomMapping`
- `ProcurementPlanning.Settings`
- `ProcurementPlanning.GeneratePlan`
- `ProcurementPlanning.PlanningHistory`

The migration grants all six existing actions to `SuperAdmin` only. Administrators must grant other roles explicitly. Workflow permissions map as follows:

- Import/preview/calculate/save: `Create`.
- Configuration and draft adjustment: `Edit`.
- Import cancellation: `Delete`.
- Run export: `Export`.
- Finalization: `Approve`.
- Reads and validation: `View`.

## Performance and Reliability

- Calculation inputs are retrieved in one multi-result stored-procedure call; there is no per-product or per-material query loop.
- Lists are paged and capped at 200 rows per page.
- Calculation and monetary-independent quantities use `DECIMAL(19,6)` snapshots.
- Bulk import and run lines use JSON-to-table ingestion inside SQL transactions.
- XLSX cells beginning with formula characters are neutralized when exported as text; imported formula cells are rejected.

## Deployment

1. Back up the target database.
2. Deploy the backend binaries.
3. Run `database/migrations/20260715_procurement_planning_module.sql` against the selected database. Do not change the database inside the script.
4. Optionally run `database/migrations/20260715_procurement_planning_smoke_tests.sql`; it rolls back its test transaction.
5. Start the API and verify `/health` and `/swagger/procurement-planning/swagger.json`.
6. Grant child-page permissions to non-SuperAdmin roles.
7. Use the workbook migration report to map or explicitly create Items, then configure channel SKUs, BOMs, settings, and lead time.
8. Import a small sales file, preview, confirm, validate, preview a plan, save a draft, adjust with reason, finalize, and export.

## Rollback

Application rollback is safe because Item changes are additive and old clients ignore new fields. Database rollback after data is created must be deliberate:

1. Stop writes to procurement endpoints.
2. Export or back up all nine module tables.
3. Revoke/deactivate module pages if the API version is rolled back.
4. Drop module procedures and tables in reverse foreign-key order only if the stored history is no longer required.
5. Drop `Items.ProcurementClassification`, its check constraint, and index only after confirming no deployed API expects the field.

The migration intentionally contains no destructive down script.

## Verification Evidence

- Solution build: successful.
- xUnit suite: 64 passing, including all existing regressions and 27 procurement-focused cases.
- Database migration: applied and reapplied successfully, proving idempotency on staging.
- Database smoke test: PASS and rolled back.
- Workbook migration report: six sheets rendered and visually inspected; formula error scan found zero matches; exported XLSX re-imported successfully.
- Swagger/health: final rebuilt API returned health 200; module document exposed 32 paths/40 operations, global bearer security, success/error schemas, and multipart request bodies.

Frontend implementation details are in `PROCUREMENT_PLANNING_FRONTEND_INTEGRATION.md`.
