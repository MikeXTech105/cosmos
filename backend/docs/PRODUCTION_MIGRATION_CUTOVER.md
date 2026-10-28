# Migration, verification and controlled cutover

## Current UI/error audit and one-command SQL gate

On28 October the complete frontend suite passes745/745 across117 files; the whole frontend lint and build pass. Backend422 tests pass and14 SQL tests remain skipped. The previous three employee failures and dispatch lint error were resolved by matching the API's optional-email contract, making create/update empty payload semantics explicit, and scoping warehouse options to the selected channel. Existing employee address/bank replacements are preserved on update.

Run the existing guarded migration/repeatability and production SQL journeys together using:

```powershell
./backend/scripts/Test-ProductionWorkspace.ps1
```

The script uses an explicitly provided `COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING` with the runner's `CosmosProductionIntegrationTests_*` guard. If that variable is absent and Microsoft LocalDB is installed, it creates a uniquely named private instance and disposable test catalog, runs the existing bootstrap and real production tests, then stops its instance while retaining databases for inspection. It never reads appsettings or drops a database. Existing test catalogs require deliberate `-ReuseTestCatalog` after inspection.

This Windows session has no SQL runtime or test connection and is not an administrator, so the script exited2 before opening a database. Installing an engine requires the deployment/admin owner's environment setup; Microsoft's [LocalDB installation and private-instance documentation](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/sql-server-express-localdb?view=sql-server-ver16) describes the supported runtime. The application's approved company key and connection must still be configured as described below; no frontend fallback substitutes for them.

## 28 October: daily grid and Kanban backend handoff

The frontend daily desk uses existing order list/context/release/completion/close/cancel contracts and existing Orders permissions. No new backend business endpoint, master or migration was introduced for the grid or board. Six board columns query statuses1–6 independently with12-row pages; the daily grid uses the existing list paging and quantities remain exact text until numeric JSON serialization. Moving a card opens review; only the server's saved state determines its eventual column.

The current workspace has no actual application SQL connection, manufacturing company key/timezone, local SQL service or explicit disposable integration connection. Configuration must be completed by the backend deployment owner, using real catalog evidence:

1. Set `ConnectionStrings__CosmosDb` privately to the intended application catalog. Do not put secrets in Git or a handoff.
2. Set `Manufacturing__CatalogCompanyKey` to the approved key already used by that catalog's production records, and `Manufacturing__BusinessTimeZone` to the actual company timezone supported by .NET and SQL. Do not choose a new key merely to hide the scope error. `appsettings.Development.example.json` now lists the fields with deliberately empty values.
3. Preserve the real closed-period policy. Restart the API as appropriate and sign in again so the JWT CompanyKey, request scope and SQL session context agree. A frontend fallback, arbitrary company selector or bypassing the claim check is not a setup fix.
4. Verify the existing39 ordered production scripts in a disposable catalog before company cutover. Configure `COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING` privately to an explicitly prepared `CosmosProductionIntegrationTests_*` target, then run the guarded bootstrap/repeatability runner and SQL journeys below. This variable must never point to the client's catalog.
5. With actual authentication and roles, verify grid partials/rejects/materials, an identical uncertain retry, a failed readback, stale versions, queue stopping, Kanban release/completion/remainder actions, stock conservation and report reconciliation. The synthetic browser fixture cannot establish these results.

Checks on28 October: frontend735 passed /3 existing employee failures /738 total; backend422 passed /14 SQL skipped /436 total; production build passed. The guarded SQL runner refused to open any database because its explicit connection is absent. Logs are `frontend-daily-desk-*.log`; UI-only browser evidence is `PRODUCTION_DAILY_DESK_BROWSER.json`. No live database was changed.

## Latest frontend integration evidence

The frontend integration and fresh verification add migrations `20261027_29` through `20261027_37`; there are now39 ordered production scripts including the original precision/basis prerequisites. Apply the entire ordered set through the existing guarded disposable-catalog runner before authenticated integration testing. These context/validation additions are required by the current frontend; copying React files alone does not update database procedures.

Current verification: backend421 passed/0 failed/14 SQL skipped; frontend716 passed/3 known pre-existing employee failures; production build passed. Whole-project lint retains one finding in unchanged `DispatchImportsPage.jsx:179`; changed production areas pass targeted lint. Six OpenAPI contracts and85 controller/action entries were regenerated with SQL access forbidden. Exact commands, browser fixture evidence, current counts and remaining boundaries are recorded in [frontend verification](PRODUCTION_FRONTEND_VERIFICATION.json), [fresh audit](PRODUCTION_FRONTEND_REVERIFICATION.md) and [frontend implementation](PRODUCTION_FRONTEND_IMPLEMENTATION.md).

No production migration has been executed locally and no live catalog has been changed. The existing guarded SQL prerequisites and actual transaction journeys below remain mandatory; successful compiler/parser/mock tests do not remove them.

## Previous backend-delivery execution evidence

| Check | Actual result on 27 Oct2026 |
|---|---|
| Original backend non-SQL baseline | 338 passed before this work. |
| Latest complete backend test run | 401 passed,0 failed,13 SQL tests skipped;414 total. Includes real application Swagger/401 tests, domain/validation/calculation/shared-pool tests, and migration ScriptDom parsing. |
| SQL skip breakdown | 12 new production/ownership/cutover tests plus1 pre-existing configured-dispatch integration test. The old dispatch test's dynamic-skip mechanism was corrected to an explicit discovery-time skip, so unavailable SQL is no longer mislabeled as a failure. No SQL test was changed to a pass. |
| Guarded SQL migration runner | Builds; invocation without an explicitly disposable connection refused to run and printed the missing-variable instruction. No database was opened or created. |
| Full frontend suite | 581 passed,3 failed;584 total. The same three pre-existing employee-validation failures remain: optional employee email, optional bank form validation, and empty-address omission expectation. The supplied baseline had576/579 with those same failures. |
| Targeted manufacturing/report/Item helpers | 12 passed across4 files. |
| Frontend production build | Passed with Vite8.0.16;3,948 modules transformed. |
| Generated contracts | Actual running test-host Swagger for manufacturing,procurement-planning,supply-chain,sales,shipment-operations,Purchase & Expense;81 actual route operations inventoried. SQL connections are forbidden in that test factory. |
| Diff whitespace | `git diff --check` passed (normal LF→CRLF Git notices are not whitespace errors). |
| Real SQL binding/migrations/transactions/authenticated journeys | **Not executed**: no SQL Server/LocalDB/Docker runtime or explicit disposable connection available. These remain deployment gates. |

Known existing restore warnings: Microsoft.OpenApi2.4.1 and System.Security.Cryptography.Pkcs9.0.13 security advisories; existing NU1510 pruning warnings. This implementation did not silently upgrade unrelated dependencies. Resolve and regression-test dependency updates under their own review before production deployment.

## Rerun commands

From the repository root, with an installed .NET10 SDK (`dotnet` below), and Node dependencies already restored:

```powershell
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter 'Category!=SqlIntegration'
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj
$env:COSMOS_WRITE_PRODUCTION_CONTRACTS='1'
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter 'FullyQualifiedName~ProductionSwaggerRuntimeTests'
Remove-Item Env:COSMOS_WRITE_PRODUCTION_CONTRACTS
```

On the implementation machine the portable SDK path was `$env:TEMP/cosmos-dotnet/dotnet.exe`, version10.0.403. SDK availability is not SQL availability.

From `frontend`:

```powershell
npm test -- --run
npm test -- --run src/pages/manufacturing/manufacturingHelpers.test.js src/services/reports/manufacturingReportsService.test.js src/pages/inventory/items src/pages/reports/columns/manufacturingColumns.test.js
npm run build
```

The full frontend suite is intentionally reported with its existing3 failures; the manufacturing tests and build pass. Do not change unrelated employee behavior merely to hide the baseline result.

## Disposable SQL gate

Use an explicitly provisioned SQL Server test instance and a new catalog whose exact name matches `CosmosProductionIntegrationTests_[A-Za-z0-9_]+`. Do **not** copy the application's company/staging connection into this variable. The runner never reads appsettings or production secrets, rejects other catalog names, checks `DB_NAME()` around every batch, and never drops a database automatically.

Set `COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING` privately to that disposable target. Do not put a credential in Git, a report, console transcript or this guide. Then:

```powershell
dotnet run --project backend/tests/Cosmos.SqlVerification/Cosmos.SqlVerification.csproj
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter 'FullyQualifiedName~ProductionSqlIntegrationTests'
```

The runner creates the named test catalog only when absent using the same explicitly supplied server/account, applies `001_Full_Database_Setup.sql`, ordered ordinary migrations, and then replays all new20261027 migrations for repeatability. Existing catalogs require deliberate `--reuse-test-catalog`; inspect a failed test catalog before reuse. It excludes older manual smoke/verification/cleanup scripts but includes every new20261027 implementation script, including the packing-verification command migration.

The pre-existing dispatch integration suite has its own `COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING` guard and `CosmosDispatchIntegrationTests_*` fixture/catalog contract. Prepare its existing fixture separately. Do not point either integration suite to a company catalog or bypass either guard.

Required real SQL checks include:

- fresh bootstrap + upgrade from a backed-up deployed schema; repeat migrations; actual stored procedure/function/trigger binding;
- preserve quantity range, indexes/check/default definitions/trust/options, TVP compatibility and transaction rollback;
- two concurrent releases and dispatches, own-reservation protection, partial/reject/overuse/rounding/short-close/cancel/reversal/retry;
- source revision changes at save/finalize/PO conversion and release; changed BOM/routing/packing/effectivity;
- partial accepted/reject/quarantine receipt, over-accepted rejection, repeated event, whole-PO conversion after partials, later bill, supplier return/financial credit;
- invoice-before-dispatch and dispatch-before-invoice, two partial shipments, multiple invoice/ship links, standalone invoice, cancellation and original-line shipment returns;
- approved opening adoption, imported historical/aggregate evidence, duplicate events, safe selected rows beside unresolved rows, period controls and dated as-of reports;
- authenticated users with actual configured roles/company claims, including403, cross-company rejection, export and concurrency responses;
- full-filter paging/totals, large exports, actual freight/docket/Freight Rojmel continuity and scheduling with real overlapping resources.

Only actual successful SQL results satisfy this gate. The supplied guarded tests encode many journeys, but broader deployment-specific binding/freight/resource checks must also be run in the disposable clone.

## Configuration before any company enablement

Keep real connection strings and JWT keys in the existing secret/configuration mechanism. Add the following non-secret manufacturing values to the intended catalog's deployment configuration:

```json
{
  "Manufacturing": {
    "CatalogCompanyKey": "the-approved-key-for-this-catalog",
    "BusinessTimeZone": "India Standard Time",
    "ClosedThroughDate": "2026-09-30"
  }
}
```

The closed-through date is an example, **not** a company policy decision; use the actual approved period. Omit it only when the company's period is legitimately open. Verify the timezone in SQL `sys.time_zone_info` and in .NET. One company owns one catalog; accepting a client CompanyId is not a supported multi-tenant workaround. Existing users refresh tokens/sign in again to receive the configured claim.

## Preflight and ordered deployment

1. Take a recoverable database backup and restore-test it. Capture schema/procedure definitions, quantity ranges, check/default constraints, index metadata, current Item balances and the signed ledger. Plan a quiet write window for precision DDL and coupled application/TVP changes.
2. Inventory deployed migrations and actual tables. Apply missing existing prerequisites in repository order first, especially canonical manufacturing, supply-chain/dispatch/shipment, HSN/GST snapshots and PO conversion fixes. Do not replay the full setup against a live company catalog as an upgrade strategy.
3. Check every affected quantity column, computed/index/FK dependency, unsupported partitioned/specialized index, existing duplicate effective BOM, unmapped unit, negative stock and legacy double-posting conflict. M00 deliberately fails instead of guessing an unsupported deployed shape. Review such failures rather than removing the check.
4. Apply the new scripts in filename order: `00`, `00b`, then `01` through `28` (30 files total). Deploy the matching API/contracts and V2 TVP callers together. M00 widens core quantities; it skips repeated DDL once all target scales already meet6 and preserves reviewed ordinary index options/filegroups. Specialized deployment indexes require explicit review.
5. New tables/columns are additive. Procedure patches preserve deployed HSN/GST and freight integrations and contain preflight shape checks. A parser cannot verify those shapes against a deployed database; run the SQL gate first.
6. Configure company/timezone/period, refresh JWT claims, inspect SuperAdmin/protected-owner permissions and explicitly assign appropriate operator permissions. Do not grant everyone Approve as a shortcut.
7. Reconcile before and after every company cutover using [the read-only reconciliation script](../database/verification/production_workspace_reconciliation.sql), APIs and approved source documents. Preserve exports/evidence with company, period, units, input revisions and application version.

The implementation-file inventory is listed below. A failed migration transaction rolls itself back where declared. There is no automatic destructive down migration.

## Company-by-company source cutover

1. Freeze and fingerprint the verified workbook/file revision. Retain every tab disposition, original cells, repeated headers and inactive column history. Do not treat formulas/current source totals as ledger proof.
2. Resolve actual Item, Unit, Category, BOM, Party, channel/SKU, HR shift and OEE machine/mould IDs in the same catalog. Verify source context and effective date for each quantity. For unlike source/base units, approve a real rational conversion on the existing packaging profile; no default1 conversion is invented. Preserve original quantities and exact bases in normalized evidence.
3. Choose the approved **start-of-business-day cutover**. Historical production/dispatch evidence must be strictly before that date. The opening is the balance at the start of that day. Dated ledger movements on/after cutover are then added once, through the as-of cutoff. A historical total is not a new completion/receipt.
4. Stage up to5,000 cells/rows per request with file/tab/row/column/event fingerprints. Preview and map explicit dispositions. Repeat the same source file to recover the same batch, not to add inventory again. Deduplicate form responses against normalized physical events.
5. Validate selected real mappings. Reconcile opening + later signed movements to current physical cache; review missing units/business dates, active reservations, negative/different balances, missing cost and source PO proof. A new positive initial opening needs source valuation proof; an already reconciled opening is adopted as an anchor without adding stock twice. No all-zero raw opening import is authorized by a formula default.
6. Validate→reconcile→approve→post only safe selected rows using fresh versions/keys and a reason. Unknown rows remain repairable in the batch. Approval does not waive server identity/unit/date/duplicate/balance checks at posting.
7. Aggregate demand carries actual observed range and refresh date; it is not split into fictional daily transactions. Pending purchase rows require an actual existing PO line and remain source evidence; they do not silently create PO supply. Missing PO-2026-001 is an exception, not permission to invent it.
8. Reconcile quantities **per Item and Unit**, reservations by owner/event, original/reversed completion/dispatch, receipt/bill links, supplier returns/credits and financial party ledgers. Resolve legacy double postings through authorized corrections; never delete or mass-reverse history.
9. Verify new runtime journeys and reports with the intended roles, then enable the company's workflow only after the SQL and source-data gates pass. Existing unverified pending shipment units/packing require explicit `packing-verification` with a reason and removal of draft package allocations before repacking; historical dispatched quantities are never silently reinterpreted.

## Rollback limits

Before new operational postings, a tested backup restore plus matching previous application deployment is the reliable schema/data rollback. Do not shrink quantities back to two decimals after fractional data exists. Do not drop audit, owned reservations, immutable snapshots or transaction tables after cutover.

After new postings, preserve history and use the explicit eligible completion reversal, remainder close/cancel, original-line shipment return, receipt supplier return, audited stock adjustment or existing approved financial correction process. A receipt-return financial credit is immutable through the old stock-restoring edit/delete paths. A cancelled linked invoice does not restore shipment-owned goods. A returned accepted quantity does not automatically reopen PO supply under the delivered policy.

Archive and reconcile all old/new source links before any restore. A code rollback alone is unsafe once V2 quantity/ownership commands have posted; coordinate the database and application version and any real external shipments/payments with the company's normal accounting controls. This document authorizes no deployment or company-data correction by itself.

## Source exceptions

See the explicit negative/unit/stale-demand/unmatched-PO/cost/actor/blank-vendor/canvas exception list in [the coverage document](PRODUCTION_COVERAGE_MATRIX.md). These require real business evidence; they were not cleared by fabricated fixtures or arbitrary default mappings.

## Ordered implementation files (30)

- [20261027_00_quantity_precision.sql](../database/migrations/20261027_00_quantity_precision.sql)
- [20261027_00b_quantity_procedure_contracts.sql](../database/migrations/20261027_00b_quantity_procedure_contracts.sql)
- [20261027_01_production_workspace_schema.sql](../database/migrations/20261027_01_production_workspace_schema.sql)
- [20261027_02_production_workspace_commands.sql](../database/migrations/20261027_02_production_workspace_commands.sql)
- [20261027_03_production_orders.sql](../database/migrations/20261027_03_production_orders.sql)
- [20261027_04_production_completions.sql](../database/migrations/20261027_04_production_completions.sql)
- [20261027_05_production_reads_imports.sql](../database/migrations/20261027_05_production_reads_imports.sql)
- [20261027_06_physical_inventory_ownership.sql](../database/migrations/20261027_06_physical_inventory_ownership.sql)
- [20261027_07_workspace_context.sql](../database/migrations/20261027_07_workspace_context.sql)
- [20261027_08_production_capacity.sql](../database/migrations/20261027_08_production_capacity.sql)
- [20261027_09_material_feasibility.sql](../database/migrations/20261027_09_material_feasibility.sql)
- [20261027_10_purchase_physical_receipts.sql](../database/migrations/20261027_10_purchase_physical_receipts.sql)
- [20261027_11_purchase_posting_continuity.sql](../database/migrations/20261027_11_purchase_posting_continuity.sql)
- [20261027_12_purchase_read_models.sql](../database/migrations/20261027_12_purchase_read_models.sql)
- [20261027_13_stock_command_locking.sql](../database/migrations/20261027_13_stock_command_locking.sql)
- [20261027_14_demand_observations.sql](../database/migrations/20261027_14_demand_observations.sql)
- [20261027_15_canonical_bom_output_basis.sql](../database/migrations/20261027_15_canonical_bom_output_basis.sql)
- [20261027_16_import_reconciliation_cutover.sql](../database/migrations/20261027_16_import_reconciliation_cutover.sql)
- [20261027_17_posting_unit_business_dates.sql](../database/migrations/20261027_17_posting_unit_business_dates.sql)
- [20261027_18_authoritative_operational_reports.sql](../database/migrations/20261027_18_authoritative_operational_reports.sql)
- [20261027_19_amendments_effectivity.sql](../database/migrations/20261027_19_amendments_effectivity.sql)
- [20261027_20_procurement_snapshot_continuity.sql](../database/migrations/20261027_20_procurement_snapshot_continuity.sql)
- [20261027_21_stock_packing_effectivity_guards.sql](../database/migrations/20261027_21_stock_packing_effectivity_guards.sql)
- [20261027_22_snapshot_adjustment_read_integrity.sql](../database/migrations/20261027_22_snapshot_adjustment_read_integrity.sql)
- [20261027_23_legacy_packing_verification.sql](../database/migrations/20261027_23_legacy_packing_verification.sql)
- [20261027_24_receipt_return_financial_credit.sql](../database/migrations/20261027_24_receipt_return_financial_credit.sql)
- [20261027_25_verified_pack_conversion.sql](../database/migrations/20261027_25_verified_pack_conversion.sql)
- [20261027_26_finished_inbound_revision.sql](../database/migrations/20261027_26_finished_inbound_revision.sql)
- [20261027_27_planning_quantity_context.sql](../database/migrations/20261027_27_planning_quantity_context.sql)
- [20261027_28_legacy_period_edit_races.sql](../database/migrations/20261027_28_legacy_period_edit_races.sql)
