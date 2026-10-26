# Dispatch Existing Configured-Policy — Integration Test Report

**Date:** 2026-10-12  
**Result:** **COMPLETE — existing configured-policy workflow validated against an isolated SQL LocalDB database.**  
**Safety boundary:** all database writes were limited to the newly created, explicitly named LocalDB database `CosmosDispatchIntegrationTests_20261012`. No application connection string, production database, production credential, production data, Excel-parity registration, or policy-default change was used.

## Isolated test infrastructure established

| Component | Result | Evidence |
|---|---|---|
| SQL engine | PASS | LocalDB instance `(localdb)\MSSQLLocalDB` was reachable. Docker was unavailable and was not used. |
| Target safety guard | PASS | The smoke scripts refuse to run unless `DB_NAME()` matches `CosmosDispatchIntegrationTests[_]%`. |
| Test database | PASS | Created `CosmosDispatchIntegrationTests_20261012` from `master`; it is a new LocalDB database, not an existing application database. |
| Schema bootstrap | PASS | Applied `backend/database/001_Full_Database_Setup.sql`, then existing migrations `20260715_procurement_planning_module.sql`, `20260727_procurement_shared_foundation_alignment.sql`, `20260727_supply_chain_common_foundation.sql`, `20260728_dispatch_planning_module.sql`, and `20261008_dispatch_planning_sku_snapshot_integrity.sql`. |
| Synthetic data | PASS | All fixtures are explicitly `IT-Dispatch-*`: category, unit, item, channel, two warehouses, channel SKU mapping, package profile, settings, import files, and runs. |

New test infrastructure (no production behavior changed):

- `backend/database/dispatch_existing_policy_integration_tests.sql` — guarded stored-procedure smoke test.
- `backend/database/dispatch_existing_policy_concurrent_allocation.sql` — one side of a guarded two-session allocation race.
- `backend/tests/Cosmos.Tests/DispatchPlanning/DispatchConfiguredPolicySqlIntegrationTests.cs` — opt-in C# calculator-to-SQL persistence test. It requires `COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING` and asserts the database name begins `CosmosDispatchIntegrationTests_`; without it, the test is skipped.

## Tests executed and actual results

| Test / command | Actual result | Assertions/evidence |
|---|---|---|
| Apply base setup plus Dispatch prerequisite migrations to LocalDB test database | PASS | All scripts completed using `sqlcmd -b`; Dispatch tables/procedures were available. |
| `sqlcmd ... -i backend/database/dispatch_existing_policy_integration_tests.sql` | PASS | Final output: `PASS`, finalized run ID `1`, forced-rollback run ID `3`, concurrent-allocation fixture run ID `2`, `2` persisted recommendations, and allocated quantity `15.000000`. |
| Unmatched SKU validation | PASS | `IT-NO-MAP` sales row returned `InvalidRows=1`, `UnmatchedSkuCount=1`, `CanCommit=0`; the test asserted no sales snapshot was created for its batch. |
| Valid sales/stock/inbound validation and commit | PASS | Sales, stock, and inbound batches each validated with 2 valid rows and committed 2 snapshot rows; test asserted all six persisted snapshot rows. |
| Configured calculation input and persistence | PASS | Existing calculation-input procedure returned both warehouse lines. Persisted configured results asserted: warehouse 1 sales `10`, eligible inbound `3`, recommendation `6`; warehouse 2 sales `20`, eligible inbound `0` (status 1 excluded), recommendation `21`; run version `dispatch-planning-v1`. |
| Repeat calculation | PASS | The same run was saved twice and retained exactly 2 recommendation rows, proving replacement rather than duplication. |
| C# configured calculator → SQL persistence | PASS — 1 passed, 0 failed, 0 skipped | `DispatchConfiguredPolicySqlIntegrationTests` read the committed input procedure output, invoked `DispatchCalculationService`, saved through `usp_DispatchPlanning_Run_SaveCalculation`, and asserted both persisted calculated recommendations and `dispatch-planning-v1`. |
| Manual override | PASS | Warehouse 1 final quantity changed to `5` with stored reason `IT override to constrained quantity`. |
| Invalid lifecycle transition: finalize before allocation | PASS | Procedure returned conflict; run remained Calculated (`Status=2`). |
| Priority/constrained allocation | PASS | Allocated `5` and `10` across recommendations against a single item snapshot of `15`; both allocation and result totals asserted `15`. |
| Invalid lifecycle transition: override after allocation | PASS | Procedure returned conflict; run remained Allocated (`Status=3`). |
| Finalize and repeat finalize | PASS | First finalize persisted Finalized (`Status=4`, `FinalizedAtUtc` set); repeat finalize returned conflict and state stayed final. Item `CurrentStock` remained `15`, confirming no inventory mutation. |
| Forced save failure and rollback | PASS | Invalid packaging foreign key caused expected `500` from `usp_DispatchPlanning_Run_SaveCalculation`; assertions confirmed its Draft run had no company-stock snapshots or recommendation rows. |
| Two-session allocation race | PASS | Two independent `sqlcmd` sessions submitted the same allocation simultaneously. One returned `200`, the other `409 Only a Calculated Dispatch Planning run can be allocated.` Persisted state: `Status=3`, 2 allocation rows, total `15`, and 2 distinct recommendation IDs. |
| Existing configured-policy test subset | PASS — 15 passed, 0 failed, 0 skipped | `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~Cosmos.Tests.DispatchPlanning.DispatchPlanningEngineTests\|FullyQualifiedName~Cosmos.Tests.DispatchPlanning.DispatchPlanningDapperMaterializationTests\|FullyQualifiedName~Cosmos.Tests.DispatchPlanning.DispatchPlanningSqlContractTests" --no-restore` |
| API build | PASS — 0 errors | `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore` |

## Workflow coverage

| Required workflow | Status | How verified |
|---|---|---|
| Warehouse/SKU/profile/settings fixtures | PASS | Created in the isolated database with active/effective fixture values. |
| Validate/stage imports | PASS | Existing `usp_DispatchPlanning_Import_Validate` called for invalid and valid payloads. |
| Reject invalid/unmatched row | PASS | Unmatched SKU stayed invalid and produced no snapshot. |
| Commit valid snapshots | PASS | Existing commit procedure persisted sales, stock, and inbound snapshots. |
| Create Dispatch run | PASS | Existing run-create procedure used committed source batches. |
| Calculate configured policy | PASS | Calculation-input procedure, C# `DispatchCalculationService`, and save procedure verified against exact fixture results. |
| Persist recommendations/version | PASS | Result row counts, values, and `dispatch-planning-v1` asserted. |
| Manual override | PASS | Persisted final quantity and reason asserted. |
| Existing priority allocation | PASS | Constrained single-item allocation totals asserted; no allocation exceeded available fixture stock. |
| Finalization | PASS | Final status/timestamp persisted; inventory did not change. |
| Repeat/lifecycle safety | PASS | Recalculate, repeat finalize, premature finalize, and post-allocation override tested. |
| Rollback | PASS | Forced FK failure after the procedure had begun persistence left no partial rows. |
| Concurrent requests | PASS | Two sessions left exactly one consistent allocated state. |

## Defects found and fixes

No existing configured-policy application defect was proven.

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| TEST-01 | P2 | Initial smoke script used inline expressions in named `EXEC` arguments; SQL Server rejected the test harness syntax. | Moved hashes and JSON expressions into declared variables. Test infrastructure only. |
| TEST-02 | P2 | Initial smoke script lacked `QUOTED_IDENTIFIER ON`, required by filtered indexes in the repository schema. | Added required session settings to the test scripts. Test infrastructure only. |
| TEST-03 | P2 | The forced-failure test originally wrapped procedure calls in an outer transaction. The procedure's rollback reset that outer transaction and produced SQL error 266. | Removed the outer harness transaction; the disposable database retains labelled fixtures and the tested procedure owns/rolls back its own transaction. |
| TEST-04 | P2 | Direct Dapper test binding did not support `DateOnly` in the isolated test path. | Test harness passes the SQL `date` parameter as `DateTime`; application code was unchanged. |

## Warnings and remaining limitations

- The build/test commands report `NU1903` for `Microsoft.OpenApi` 2.4.1 and two `NU1510` redundant package-reference warnings. They did not fail Dispatch validation and should be remediated separately.
- The tests exercise application calculation plus database procedures directly; they do not host the authenticated HTTP API or exercise React UI automation. API/controller authorization and browser behavior remain outside this database integration test.
- The LocalDB database contains only labelled synthetic fixtures and may be dropped/recreated safely. It is not operational data and must never be substituted for a staging/production verification environment.
- Excel-parity remains unregistered and uninvoked by the configured-policy tests.

## Final decision

**Completion decision: COMPLETE — existing configured-policy Dispatch workflow.**

Final evidence review confirms that the recorded results are supported by the guarded LocalDB scripts and the opt-in calculator-to-SQL integration test. The test database name guard (`CosmosDispatchIntegrationTests_*`) is enforced both by the SQL scripts and the C# test connection check; the recorded work did not use an application or production connection string. The executed evidence covers invalid import rejection, valid import validation and commit, run creation, configured calculation and persistence, override, priority allocation, finalization, repeat and invalid lifecycle requests, forced-failure rollback, and two-session allocation contention. The scoped test command recorded 15 passing tests with no failures or skips, and the API build recorded zero errors.

No proven defect blocks the existing configured-policy workflow. Existing policy defaults and allocation rules remain unchanged. Authenticated HTTP API and browser/UI automation are intentionally outside this completed database/application-service integration scope; they are non-blocking follow-up validation, not evidence of a configured-policy workflow defect. Excel-parity remains unregistered and uninvoked.
