# Dispatch Parity Business Decision Register

**Status:** decisions required before policy-2 implementation. Technical implementation must reject unresolved choices; it must not infer them from spreadsheet behavior.

| ID | Decision owner | Decision required | Options/recommendation | Technical consequence if unresolved | Status |
|---|---|---|---|---|---|
| BD-01 | Dispatch business owner | Define the exact weekly-sales period. | Specify calendar vs rolling window, inclusive dates, time zone, required duration, and whether a batch must contain exactly one window. | Cannot validate weekly completeness/overlap or calculate trustworthy warehouse/network weekly totals. | BLOCKED |
| BD-02 | Dispatch business owner | Define the exact 30-day-sales period and source-batch selection. | Specify calendar vs rolling 30 days, timezone, required committed batch, corrections, and whether source data may span multiple batches. | `ThirtyDaySalesImportBatchId` cannot be validated or reproduced. | BLOCKED |
| BD-03 | Dispatch business owner | Define 30-day aggregation identity. | Choose item, item+mapping, item+channel, or a documented alternative. Recommendation: choose the same identity deliberately for all mappings; do not rely on accidental aggregation. | Per-SKU recurring demand may be duplicated or understated. | BLOCKED |
| BD-04 | Dispatch business owner | Define warehouse-share numerator and network denominator population. | Confirm channel-wide inclusion/exclusion of inactive mappings, zero-sales warehouses, returns, corrections, and all SKU mappings. | Safety stock is non-deterministic and comparison results cannot be signed off. | BLOCKED |
| BD-05 | Dispatch business owner | Approve whether policy 2 replaces configured calculation tiers/factors/rounding for the whole selected run. | Recommended: run-level replacement only; retain effective setting only for persisted FK/allocation priority, not for parity math. | The policy adapter cannot decide what to calculate or what to snapshot. | BLOCKED |
| BD-06 | Dispatch business owner | Confirm policy-2 stock and inbound semantics. | Retain sellable stock and inbound statuses 2/3, or approve a different policy with exact status list. | Recommendation totals can differ from both production and Excel evidence. | BLOCKED |
| BD-07 | Dispatch business owner + security owner | Decide who can create/select policy-2 runs during the pilot. | Reuse current run-create authority or add a dedicated policy-2 permission; recommendation is dedicated permission plus named pilot scope. | UI/API authorization cannot be completed safely. | BLOCKED |
| BD-08 | Dispatch business owner | Decide policy-2 recalculation behavior after first successful calculation. | Recommended: immutable input snapshot replay; alternatively reject recalculation. Do not allow re-snapshot of a historical run without a new run ID. | Results cannot be guaranteed reproducible. | BLOCKED |
| BD-09 | Dispatch business owner | Approve representation/audit wording for policy-2 rounding. | Add an explicit applied-rule code/explanation; do not falsely label parity output with a configured rounding mode. | Persisted result metadata is misleading. | BLOCKED |
| BD-10 | Dispatch business owner | Confirm manual proportional allocation (workbook W column) remains out of scope. | Recommended: explicitly out of scope; any future workflow requires separate authority, rounding/remainder/audit/permission decisions. | Existing priority allocator might be unintentionally changed. | PENDING CONFIRMATION |
| BD-11 | Data owner | Decide treatment of existing duplicate/ambiguous mapping-level source snapshots before identity-constraint migration. | Clean/remediate affected data with an approved, non-destructive plan; do not silently merge. | Mapping-safe constraints and parity aggregation cannot be deployed safely. | BLOCKED |
| BD-12 | Operations owner | Approve policy-2 operational rollback and pilot exit rules. | Disable new policy-2 selection for future runs; preserve existing runs/results/snapshots; no recalculation or historical rewrite. | Release/runbook cannot define a safe operational response. | BLOCKED |

## Technical decisions verified by review (not business policy)

| ID | Decision | Evidence | Required implementation stance |
|---|---|---|---|
| TD-01 | Policy 1 must stay default and follow the existing calculator. | `backend/src/Cosmos.Application/Services/DispatchPlanningService.cs:174-180`; `backend/src/Cosmos.Application/DependencyInjection.cs:36-38` | Omitted policy must call unchanged configured calculation and preserve existing API response behavior. |
| TD-02 | New persistence must be additive and historical runs must not be recalculated. | Existing finalized-run protections at `backend/database/migrations/20260728_dispatch_planning_module.sql:811-818,846-861` | Default old rows to policy 1 if required; do not create parity snapshots or update result rows. |
| TD-03 | Snapshot/result/run-state persistence must be one transaction. | Existing result transaction `backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql:85-114` | Extend the same write boundary; no asynchronous snapshot write. |
| TD-04 | Existing priority allocation must remain unchanged. | `backend/database/migrations/20260728_dispatch_planning_module.sql:767-801` | Pass persisted final recommendations to the existing allocator; do not add proportional/manual behavior. |
| TD-05 | Cross-table batch/channel/status rules require procedure/application validation, not a SQL CHECK constraint. | Design line 62; SQL relational constraint limitations | Enforce in create/input procedures with foreign keys/checks only for local values. |

## Decisions needed before coding begins

BD-01 through BD-09 and BD-11 require explicit resolution. BD-10 and BD-12 require confirmation before pilot/release work. Until then, only policy-1 regression/design preparation is safe.
