# Dispatch Excel-Parity Implementation Readiness Report

**Date:** 2026-10-10  
**Review scope:** proposed controlled-integration design, test plan, activation checklist, and current Dispatch implementation.  
**Final decision:** **READY AFTER SPECIFIC DECISIONS**.

## Executive conclusion

The proposed integration has the right safety direction: policy 1 remains the default, policy 2 is explicit, the isolated parity engine is not wired into production, the priority allocator stays unchanged, and manual proportional allocation is excluded. It is not ready for a blind implementation start because source-period rules, policy-2 setting/rounding semantics, snapshot replay, and mapping-level source identity must be resolved first.

No application code, schema, stored procedure, dependency-injection registration, API contract, production default, or production data was changed in this review. No integration test was executed.

## Readiness by area

| Area | Status | Evidence | Required condition |
|---|---|---|---|
| Existing policy-1 behavior | Conditionally ready | Current run calculation calls only `DispatchCalculationService` at `backend/src/Cosmos.Application/Services/DispatchPlanningService.cs:174-180`; proposed default at design lines 25-37 | Add golden regression fixtures proving omitted policy produces unchanged outputs/API/lifecycle. |
| Policy selector/API compatibility | Ready in concept | Optional field proposal at design lines 32-37; current request at `backend/src/Cosmos.Contracts/DispatchPlanning/DispatchPlanningDtos.cs:130-137` | Validate only policy-2 fields when selected; default omitted/null safely to policy 1; decide policy-2 permission. |
| 30-day and weekly source validation | Not ready | Design lines 9-15; current row-only validation `backend/database/migrations/20260728_dispatch_planning_module.sql:458-493` | Approve BD-01 through BD-04 and implement batch-level period/channel/overlap checks. |
| Reproducible immutable inputs | Not ready | Snapshot proposal design lines 39-64; existing save transaction `20261008_dispatch_planning_sku_snapshot_integrity.sql:85-114` | Resolve BD-08 and implement one transactional snapshot/result/state write. |
| Policy-2 result persistence | Not ready | Result rounding constraint/required setting at `20260728...:230-270`; parity design at lines 29-30 | Resolve BD-05 and BD-09; define truthful applied rounding and retained setting role. |
| Mapping-level identity | Not ready | Current calculation groups by mapping `20261008...:42-64`; source uniqueness omits it at `20260728...:86-137,303-304` | Resolve BD-11 and include safe source-identity migration/tests. |
| Allocation/finalization | Ready if unchanged | Allocator `20260728...:767-801`; finalizer `20260728...:811-818`; design lines 76-80 | Preserve unchanged input/output and reject any manual proportional branch. |
| Atomicity/concurrency | Partially ready | Existing transactions, but prechecks precede transactions (`20261008...:91-114`; `20260728...:773-801`) | Design conditional state transitions/concurrency control and execute I-15/I-16. |
| Historical-run protection | Ready in concept | Checklist line 33; finalized mutation protections `20260728...:846-861` | Add-only migration; no result recalculation/backfill, no snapshots for old runs. |
| Observability/rollback | Not ready | Checklist lines 27-33; current calculate audit at `DispatchPlanningService.cs:180` | Resolve BD-12 and define telemetry/audit fields and future-run-only rollback steps. |

## Required implementation sequence

1. Obtain documented approval for BD-01 through BD-09 and resolve BD-11 data integrity remediation.
2. Convert the approved period/identity/rounding/setting decisions into contract-level acceptance examples.
3. Produce the additive migration design: run policy/version/30-day reference, source identity repair, immutable input snapshots, FK/index/check boundaries, and no historical result update.
4. Amend create-run and policy-input procedures to validate all relational facts transactionally. Preserve the existing policy-1 calculation-input projection and path.
5. Extend the calculation-save boundary to persist policy/version, immutable inputs, recommendations, and status atomically. Implement the approved replay/recalculation rule.
6. Add policy resolver/DTO/validator/repository/API changes behind explicit policy-2 authorization; leave policy 1 the default.
7. Execute the full isolated SQL/repository/API lifecycle plan, especially I-01 through I-18 plus the gaps listed in the design review.
8. Run the signed-off comparison batch in a controlled environment, then complete the activation checklist before any pilot.

## Minimum test evidence required before pilot

- Unchanged policy-1 baseline fixtures and response compatibility.
- Rejection of foreign, uncommitted, incomplete, overlapping, wrong-channel, and ambiguous batch sources.
- Numerical parity outputs plus stored applied-rule/snapshot provenance for all tiers and rounding boundaries.
- Atomic rollback of snapshots/results/run state under forced failure.
- Mapping-level identity across sales, stock, inbound, recommendation, allocation, and retrieval.
- Deterministic outcomes for repeated and concurrent calculate/allocate/finalize requests.
- Override and priority-allocation behavior unchanged; no manual allocation route.
- Migration verification proving historical runs are neither recalculated nor altered.

## Risks preventing production activation

| Severity | Risk | Mitigation / gate |
|---|---|---|
| P1 | Undefined sales periods/denominator identity leads to non-reproducible safety stock and recurring demand. | Approve BD-01 through BD-04; enforce source validation. |
| P1 | Non-atomic or mutable parity inputs cause stored results to be irreproducible. | Approve BD-08; persist/replay immutable snapshot transactionally. |
| P1 | Existing source table uniqueness cannot safely represent multiple mappings per item/warehouse/window. | Resolve BD-11; migrate constraints and prove identity tests. |
| P1 | Existing result metadata cannot truthfully describe parity rounding/setting role. | Approve BD-05/BD-09; add accurate applied-policy representation. |
| P2 | Generic create permission could expose policy 2 too broadly. | Approve BD-07 and enforce pilot authorization. |
| P2 | Lack of observability/runbook delays diagnosis and safe rollback. | Approve BD-12 and implement telemetry/audit/runbook. |

## Confirmation on production isolation and history

The isolated parity service has no current production registration or caller. The existing configured calculator, inbound status filtering, sellable-stock behavior, and priority allocator are still the live path. The proposed change must retain this until explicit policy-2 selection is implemented and approved.

Historical runs must not be recalculated or modified. The only acceptable migration treatment is additive metadata defaulted to policy 1 where necessary; no re-derived parity inputs, result updates, allocation changes, or finalization changes.

## Exact business-owner decisions required

1. Weekly period definition and source batch rule.
2. 30-day period definition, source batch rule, and correction treatment.
3. 30-day aggregation identity.
4. Warehouse-share numerator and network denominator population.
5. Whether policy 2 replaces configured calculation rules, and the retained role of SKU settings.
6. Policy-2 inbound and sellable-stock semantics.
7. Policy-2 selector authorization/pilot users.
8. Immutable replay versus rejection of policy-2 recalculation.
9. Accurate applied-rounding audit representation.
10. Confirmation that manual proportional allocation remains separate scope.
11. Remediation approach for existing mapping-identity source data.
12. Pilot rollback/exit criteria.
