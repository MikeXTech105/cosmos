# Dispatch Excel-Parity Integration Design Review

**Review date:** 2026-10-10  
**Scope:** design review only. No application, SQL, API, dependency-injection, schema, or production-data change was made.  
**Decision:** **READY AFTER SPECIFIC DECISIONS**. The proposed policy-1 default can remain backward-compatible, but policy-2 implementation must close the P1 technical items and obtain the recorded business decisions before coding starts.

## Evidence reviewed

- `qa-reports/dispatch-excel-fix/DISPATCH_CONTROLLED_INTEGRATION_DESIGN.md`
- `qa-reports/dispatch-excel-fix/DISPATCH_INTEGRATION_TEST_PLAN.md`
- `qa-reports/dispatch-excel-fix/DISPATCH_PRODUCTION_ACTIVATION_CHECKLIST.md`
- Existing Dispatch contracts, service, repository, migration, and stored procedures listed in each finding.

No integration tests were executed in this review. Earlier calculation-engine test results are not evidence that the proposed integration has passed.

## Verified compatible parts

| Check | Status | Evidence | Review result |
|---|---|---|---|
| Policy 1 is the default | PASS | Design lines 25-37; current request has no policy field at `backend/src/Cosmos.Contracts/DispatchPlanning/DispatchPlanningDtos.cs:130`; current service injects only `DispatchCalculationService` at `backend/src/Cosmos.Application/Services/DispatchPlanningService.cs:21,43` | An omitted future field can resolve to the current path without changing existing clients. |
| Parity engine is isolated today | PASS | `backend/src/Cosmos.Application/DependencyInjection.cs:36-38`; `backend/src/Cosmos.Application/Services/DispatchExcelParityCalculationService.cs:10`; current calculate call at `DispatchPlanningService.cs:174-180` | No DI registration or production invocation was found. |
| Existing priority allocator remains separate | PASS | Design lines 76-80; allocation procedure `backend/database/migrations/20260728_dispatch_planning_module.sql:767-801` | The plan correctly keeps priority allocation and treats manual proportional allocation as separate scope. |
| Existing source-batch commit gate exists | PASS | `backend/database/migrations/20260728_dispatch_planning_module.sql:610-646` | Current create-run procedure validates selected import batches and their committed state. Policy 2 must apply the same gate to its 30-day batch. |
| Existing calculation/allocation persistence is transactional per operation | PASS, limited | Save at `20261008_dispatch_planning_sku_snapshot_integrity.sql:85-114`; allocation at `20260728_dispatch_planning_module.sql:767-801` | Current result save and allocation use transactions, but parity input snapshots are not yet in that transaction. |
| Finalized history is protected | PASS | `20260728_dispatch_planning_module.sql:811-818, 846-861` | Finalized runs cannot be changed through the lifecycle/trigger protections. The migration must not backfill or recalculate them. |

## Findings

| ID | Severity | Finding and evidence | Impact | Recommended action |
|---|---|---|---|---|
| IR-01 | P1 | **Parity input snapshots are not yet specified as part of the same save transaction as results and run state.** The design calls for snapshots “before saving recommendations” (design lines 45-52), while the current save procedure accepts only `@LinesJson`, deletes/reinserts results, and updates the run in one transaction (`20261008_dispatch_planning_sku_snapshot_integrity.sql:85-114`). | A failure can leave snapshot provenance absent or mismatched with the recommendations it is intended to reproduce. | Extend the save contract to accept validated snapshot JSON (or a single equivalent immutable payload), insert snapshots, results, and the policy/version run update in the same transaction. Add a forced-failure test proving all three roll back. |
| IR-02 | P1 | **Replay semantics are undecided.** The plan says recalculation must remain immutable “or re-snapshot behavior is explicitly documented” (test plan line 28). Current recalculation re-reads inputs, deletes results, and preserves company stock only if a snapshot does not already exist (`20261008...:104-112`). | Recalculation could produce different policy-2 recommendations for the same run, defeating reproducibility and producing a mixture of first-calculation company stock with later sales/profile inputs. | Specify and enforce: policy-2 captures once on first calculation; later calculate requests replay the immutable snapshot, or are rejected after calculation. Do not allow source-batch/policy mutation once a run exists. |
| IR-03 | P1 | **Parity rounding cannot be accurately represented by the current result metadata without an explicit design.** The existing result requires `RoundingMode IN (1..6)` (`20260728...:230-270`) and the save JSON requires that value (`20261008...:94-111`). The parity rules include Tier-1 suppress-below-one-box plus nearest-box and Tier-3 loose-below-one-box plus nearest-box, which do not map one-to-one to the configured rounding modes. The design defers compatible result shape (design line 64). | Persisting the configured setting’s rounding mode would misstate how a parity result was calculated and weaken audit/replay evidence. | Define a policy-specific applied-rounding representation: either additive result metadata (for example policy/rule code plus explanation) or a documented, truthful mapping approved by the domain owner. Test stored and displayed metadata, not only quantity. |
| IR-04 | P1 | **Policy-2 still depends technically on an effective `DispatchSkuSetting`.** The input procedure filters `ds.Id IS NOT NULL` and returns its ID, tier and allocation priority (`20261008...:56-81`); recommendation rows require non-null setting and tier FKs/checks (`20260728...:232-270`). Yet parity rules may replace configured tier/factor/rounding (design lines 29-30, 104-105). | A parity run with no setting cannot produce rows, and a setting used only for allocation may accidentally influence parity calculations. | Decide and document the retained setting role. Recommended: require an effective setting only as the immutable allocation-priority/FK source, explicitly exclude its calculation factors/tier/rounding from policy 2, and snapshot its ID and priority. Reject policy-2 inputs without that setting. |
| IR-05 | P1 | **Weekly and 30-day window integrity is not enforced by current import validation.** Row validation checks only non-null/order/non-negative sales periods (`20260728...:458-493`), and the current input procedure sums every sales row in the batch (`20261008...:42-45`). The design identifies the decision but not executable validation (design lines 9-12, 62). | Incomplete, overlapping, mixed-window, or correction batches can be silently summed as weekly or 30-day sales. | After business approval, add batch-level period validation: exact expected inclusive dates/duration, one approved window per source role, no overlaps for the aggregation identity, and an explicit correction-row treatment. Reject rather than infer. Include these cases in I-03/I-05. |
| IR-06 | P1 | **Cross-mapping source uniqueness remains a data-integrity risk.** Sales snapshot uniqueness is `(ImportBatchId, WarehouseId, ItemId, PeriodFrom, PeriodTo)` (`20260728...:86-109`), stock snapshot uniqueness omits mapping (`20260728...:115-137`), and inbound reference uniqueness also omits mapping (`20260728...:303-304`). Calculation now groups by mapping (`20261008...:42-64`). | Multiple active channel SKUs for the same item/warehouse/window may be rejected, merged, or become impossible to represent even though the policy-2 design and test I-04 rely on mapping-level identity. | Include an additive/replacement constraint migration, after duplicate-data assessment, that preserves `ChannelItemMappingId` in the relevant snapshot identities. Add tests with same item/warehouse, distinct mappings, same window/reference. |
| IR-07 | P1 | **The proposed check-constraint list cannot alone validate batch channel, committed status, or period consistency.** Design line 62 proposes check constraints for these relational facts. SQL CHECK constraints cannot safely enforce cross-table batch/channel/status rules. | An implementation following the document literally would either fail to implement the protection or create false confidence. | Put cross-table validation in create-run and parity-input stored procedures, with foreign keys where applicable; use CHECK constraints only for local values/conditional nullability. Add a database transaction test for bypass attempts. |
| IR-08 | P2 | **Concurrency/idempotency controls are described in tests but not in the design.** Test plan I-15 requires consistent concurrent calculate/allocate/finalize outcomes (lines 31-33). Existing state checks occur before transactions in the procedures (`20261008...:91-104`; `20260728...:773-800, 811-817`). | Concurrent operations may both pass a precheck before one writes, yielding avoidable duplicate work, conflict exceptions, or a state/result mismatch. | Define an optimistic row-version or transaction/locking strategy for run transitions. Make every write conditional on expected status; return 409 for the loser. Verify concurrent calculate/allocate/finalize tests against SQL. |
| IR-09 | P2 | **The policy-1 equivalence requirement needs an executable golden regression.** Design promises unchanged policy-1 projection (line 63) and test plan I-01 expects unchanged results (line 18), but it does not identify baseline fixtures or API/SQL result comparison. | A policy resolver, DTO change, or migration could subtly alter current behavior while tests only prove a run succeeds. | Capture deterministic current policy-1 fixtures before implementation; assert byte/field-equivalent recommendation inputs/results, lifecycle response status, and unchanged `dispatch-planning-v1` version for omitted policy requests. |
| IR-10 | P2 | **Authorization and rollout control are not mapped to actual permissions.** The checklist requires policy 2 be permission-controlled (line 29), but the existing controller authorizes only current Dispatch Planning actions and no policy-selection permission is identified (`backend/src/Cosmos.API/Controllers/DispatchPlanning/DispatchPlanningControllers.cs:91-119`). | The feature could be exposed to users with generic run-create authority, contrary to the pilot design. | Business owner/security owner must select reuse of existing Create permission or a new explicit policy-2 permission. Design the permission seed, controller enforcement, API error, audit event, and named pilot allow-list before implementation. |
| IR-11 | P2 | **Observability and operator rollback are not implementation-ready.** Checklist lines 29-33 state desired monitoring/runbook but no audit schema/event payload or queryable operational fields are designed. Current calculate audit reports only static calculation version/line count (`DispatchPlanningService.cs:180`). | Operations cannot readily diagnose period/source/policy faults or prove a policy-2 result’s provenance. | Add policy/version, all source batch IDs/windows, snapshot correlation/version, run transition actor/time, failure code, and duration to structured audit/telemetry. Document rollback as “disable policy-2 selection for future runs; never mutate/recalculate history.” |
| IR-12 | P2 | **Manual proportional allocation is correctly out of scope, but its UI/API exclusion must be explicit.** Design lines 76-80 and checklist line 9 state this, while the new manual-entry work could invite scope creep. | An implementer could put workbook W-column behavior into the existing priority allocation path, violating the reviewed boundary. | Make this an acceptance criterion: parity integration has no manual allocation DTO, endpoint, allocator branch, or calculation side effect. Open a separate approved change only if needed. |

## Period, mapping, and lifecycle verification

### Source period and mapping rules

- A selected batch being committed is necessary but not sufficient. The current create procedure commits/gates the three current batches, but it does not establish that sales rows cover exactly one approved week or 30-day period.
- Policy 2 must validate the 30-day batch has the run channel, committed status, approved window, approved aggregation identity, and no uncommitted/staged rows contributing to it. Current calculation input queries only committed batches selected on the run; it does not inspect a policy-2 batch because none exists yet.
- Incorrect mapping must fail: `ChannelSkuMappings` must be active, belong to the run channel, and map to the item. The existing input procedure verifies this for weekly sources (`20261008...:60-64`); parity’s 30-day aggregation needs the same rule at its approved identity.

### Atomicity and history

- Current save calculation is atomic for result replacement, company-stock capture, and status update; allocation is separately atomic. The proposal must bring policy inputs into the calculation transaction.
- Results must be written with a unique run/item/warehouse/mapping identity. The repaired recommendation-result constraint already does this (`20261008...:29-32, 103`). The source snapshot constraints still need the repair described in IR-06.
- Overrides remain permitted only while Calculated (`20260728...:753-759`); allocation consumes final recommendations, so parity must not change that behavior.
- Finalize only permits Allocated and does not create inventory/shipment records (`20260728...:811-818`). No proposed change should weaken it.
- Historical runs must receive only default metadata in an additive migration. Do not add snapshots, rerun calculation, alter recommendations, or modify allocation/finalization records for them.

## Test-plan coverage review

The plan covers the major policy/lifecycle scenarios (I-01 through I-18), including rollback, concurrency, allocation, and finalization. It is incomplete until the following are added or made explicit:

1. Exact weekly and 30-day batch-window tests: incomplete day, mixed window, overlap, correction/duplicate rows, and boundary time-zone/calendar case.
2. Same item/warehouse with distinct mappings for sales, stock, inbound, snapshots, result insertion, and API retrieval.
3. Policy-2 requirement for an effective setting solely for allocation/FK identity, plus proof its configured calculation factors do not affect parity output.
4. Stored applied-rounding policy/version/explanation validation for every tier.
5. Concurrent status-transition tests with deterministic loser behavior, not merely “no duplicate” assertions.
6. Recalculation after source/profile/setting updates proving replay, or an explicit rejection after first calculation.
7. Migration tests for old rows: policy 1 default, null 30-day batch, no historical snapshots, no recalculation.
8. Permission tests for omitted policy, explicit policy 2, unauthorized policy selection, and policy-2 read visibility.

## Contradictions and clarifications

1. The design proposes cross-table guarantees as CHECK constraints (line 62). They require procedure/application validation and, where possible, FKs; this is a technical correction, not a business choice.
2. The design calls policy-specific result shape “compatible” before extending save JSON (line 64), but no correct rounding representation has been defined. This blocks implementation design completion (IR-03).
3. Test plan I-11 permits either immutable replay or re-snapshot behavior. Reproducibility and the activation checklist’s provenance requirement require one approved behavior; “either” is not sufficient.
4. The test plan says an input-snapshot unique constraint prevents bad identity (I-04), but upstream source snapshot uniqueness currently omits mapping. Both layers must protect the identity.

## Required implementation acceptance criteria

1. Omitted policy follows the existing policy-1 source/input/calculation/save path with unchanged deterministic fixture outputs.
2. Policy 2 rejects missing, uncommitted, wrong-channel, invalid-window, overlapping, or ambiguous input batches before writes.
3. Policy/version, immutable inputs, recommendation results, and run status commit or roll back together.
4. A calculated policy-2 run replays the same immutable source values or explicitly rejects recalculation; it never silently re-queries mutable effective settings/profiles.
5. Result metadata accurately declares the parity rounding rule and its applied inputs.
6. Existing priority allocation is byte-for-byte behaviorally unchanged; manual proportional allocation remains absent.
7. No existing run is recalculated, reclassified, or modified beyond safe additive default metadata.
