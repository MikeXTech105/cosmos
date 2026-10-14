# Dispatch Policy-Specific Rounding Design

**Status:** design recommendation only. It does not modify the current `DispatchRoundingMode` contract or database.  
**Goal:** allow a parity result to state its actual rounding behavior truthfully, while preserving the effective configured setting as provenance and leaving policy-1 semantics unchanged.

## Why a separate applied-rule record is required

Current production calculates a pre-rounded quantity from configured factors/minimums and applies a configured mode (`Exact`, `NearestBox`, `RoundUpToBox`, `RoundDownToBox`, `ExactBelowOneBox`, or `HalfBoxThreshold`) plus `AllowLooseQuantity`. See `backend/src/Cosmos.Application/Services/DispatchCalculationService.cs:24-70`.

Parity calculation instead has three different rules after safety-stock eligibility:

| Applied parity rule | Exact behavior | Code evidence |
|---|---|---|
| Tier 1 — suppress then nearest box | Shortage below one box returns 0; otherwise nearest whole box, midpoint away from zero. | `DispatchExcelParityCalculationService.cs:63-68` |
| Tier 2 — half-box threshold then nearest box | Shortage below half a box returns 0; otherwise nearest whole box, midpoint away from zero. | `DispatchExcelParityCalculationService.cs:65-68` |
| Tier 3 — loose below box then nearest box | Shortage below one box is retained exactly; otherwise nearest whole box, midpoint away from zero. | `DispatchExcelParityCalculationService.cs:67-68` |

No one existing configured mode expresses all three parity rules. In particular, `NearestBox` would round a 6-unit shortage with a 10-unit box to 10; it cannot truthfully describe a Tier-1 parity result of 0 or a Tier-3 parity result of 6.

## Production versus parity behavior

| Scenario: 10 units/box, positive safety stock, shortage 6 | Current production | Parity policy |
|---|---|---|
| Setting: `NearestBox`, loose false | 10 | Not a parity result; production rule remains 10. |
| Tier 1 parity | Not applicable | 0 (suppressed below one box). |
| Tier 2 parity | Not applicable | 10 (at/above half box, then nearest box). |
| Tier 3 parity | Not applicable | 6 (loose below one box). |

The policy-1 result must continue to expose the configured mode as the applied mode. A policy-2 result must not claim it used a configured mode when it used a parity rule.

## Recommended representation

Use two distinct concepts in future persistence/API design:

1. **Applied calculation policy/version** — for example `ConfiguredSettings/dispatch-planning-v1` or `ExcelParity/dispatch-excel-parity-v1`.
2. **Applied rounding rule** — the exact rule actually used for this result.
3. **Configured-setting provenance** — setting ID, configured rounding mode, configured loose flag, and allocation priority captured for traceability, even when policy 2 does not use the setting's calculation values.

### Proposed applied-rounding vocabulary

| Code | Policy | Label | Deterministic rule |
|---|---|---|---|
| `CONFIGURED` | Policy 1 | Configured setting rule | Existing `RoundingMode` plus `AllowLooseQuantity` decide output. |
| `PARITY_T1_SUPPRESS_BELOW_BOX_NEAREST` | Policy 2 Tier 1 | Suppress below box; nearest box | `shortage < unitsPerBox ? 0 : RoundNearestBoxAwayFromZero`. |
| `PARITY_T2_SUPPRESS_BELOW_HALF_BOX_NEAREST` | Policy 2 Tier 2 | Suppress below half box; nearest box | `shortage < unitsPerBox / 2 ? 0 : RoundNearestBoxAwayFromZero`. |
| `PARITY_T3_LOOSE_BELOW_BOX_NEAREST` | Policy 2 Tier 3 | Loose below box; nearest box | `shortage < unitsPerBox ? shortage : RoundNearestBoxAwayFromZero`. |
| `NONE_NOT_ELIGIBLE` | Any | Not eligible | Safety stock is non-positive or shortage is zero; output is 0. |

The applied rule is selected only after the calculation policy/tier/eligibility are known. It must be captured with units per box, raw shortage, recommended quantity, scale (six decimals), and midpoint direction (`AwayFromZero`).

## Persistence/API options

| Option | Description | Assessment |
|---|---|---|
| A — Add applied-rule metadata while retaining the old field as setting provenance | Add `CalculationPolicy`, `CalculationPolicyVersion`, and `AppliedRoundingRule` to result/snapshot output. Retain existing `RoundingMode` only as the effective setting's configured value and label it accordingly for policy 2. | Backward-compatible shape extension, but consumers must not mistake old `RoundingMode` for parity's applied rule. |
| B — Extend the current rounding enum with parity-specific values and preserve configuration separately | Add parity enum values for the three rules; set the existing result `RoundingMode` to the actual applied code and capture configured setting mode in the input snapshot. | **Recommended technical design** if policy-2 consumers are explicitly version-aware/gated. It makes the existing result field describe actual behavior. Requires API/database enum/check/client compatibility testing. |
| C — Free-text explanation only | Store sentence-level explanation but no structured applied code. | Reject: not queryable, easily inconsistent, and cannot support validation/reporting. |

### Recommendation and compatibility conditions

Recommend **Option B** for future approved implementation:

- Keep policy 1 numeric enum meanings and calculation behavior unchanged.
- Introduce new parity-only enum values rather than repurposing values 1–6.
- Persist the selected `DispatchSkuSettingId`, its original rounding mode/loose flag, and allocation priority in the immutable input snapshot as **configured provenance**.
- Persist the new parity enum value in the recommendation row as the **actual applied rule**.
- Include an explicit policy/version/applied-rule label in the response/UI and calculation explanation.
- Since policy 2 is explicit and permission-gated, no existing policy-1 consumer receives a parity-only value unless it has opted into/read access to policy 2. Contract/API compatibility tests must still cover unknown enum handling.

If policy-2 clients cannot safely accept enum extension, choose Option A temporarily, but the response must expose `AppliedRoundingRule` and label legacy `RoundingMode` as configuration provenance for parity results. Never silently label a parity result as `NearestBox`, `Exact`, or another configured rule unless it exactly applied that rule.

## Required deterministic recalculation and snapshot-replay policy

### Recommended rule

On first successful policy-2 calculation, atomically persist immutable per-line inputs, policy/version, applied rounding rule, calculation intermediates, results, and run state. Later Calculate requests for that run must **replay the frozen snapshot** and reproduce the same values. If the requested business inputs have changed, create a new run; do not resnapshot or overwrite the prior run.

### Why replay is preferred

- Effective settings and packaging profiles can change after a run is created.
- Source corrections may create new committed batches.
- Re-querying makes one run ID mean different things over time.
- Replay supports numerical audit and deterministic incident investigation.

### Minimum frozen fields

At a minimum, preserve per `(run, item, warehouse, mapping)`:

- policy and policy version;
- weekly and 30-day source batch IDs and approved periods;
- 30-day sales, warehouse weekly sales, network weekly sales;
- current sellable and eligible inbound quantities plus inbound-status policy version;
- units per box, effective packaging profile ID, configured setting ID, configured rounding mode/loose flag, and allocation priority;
- resolved tier/factors, six-decimal intermediates, eligibility, raw shortage, applied rounding-rule code, and recommendation;
- capture timestamp/correlation ID and source references.

### Transaction rule

The snapshot insert, recommendation replacement, and `DispatchPlanningRuns` status/policy/version update must occur in the same database transaction. The current save procedure already commits result replacement and run-state update together (`backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql:85-114`); parity snapshots must join that write boundary, not be saved asynchronously before or after it.

## Test cases required before approval/pilot

1. Policy 1 preserves all existing rounding outputs and enum meanings.
2. Tier 1: `9.999999` with 10 units/box returns 0; `10` returns 10; `15` returns 20 due to midpoint-away-from-zero.
3. Tier 2: `4.999999` returns 0; `5` returns 10; `15` returns 20.
4. Tier 3: `9.999999` remains `9.999999`; `10` returns 10; `15` returns 20.
5. Equality with reorder point has `NONE_NOT_ELIGIBLE` and recommendation 0.
6. Stored/UI applied-rule code agrees with the calculation explanation and output for every tier.
7. Recalculation after a profile/setting/source update replays the original snapshot byte-for-field (or returns the approved explicit rejection); it never silently re-queries.
8. A forced persistence failure rolls back snapshot, result, and run-state changes together.

## Business approval requested

The business owner must approve the visible parity rule labels and confirm that a policy-2 run should report the rule actually applied rather than the legacy setting's rounding mode. The technical owner can then choose the compatible storage/API option and prove it through integration tests.
