# Dispatch Parity Production Activation Checklist

## Business approval

- [ ] Approved weekly and 30-day sales windows, calendar/time-zone treatment, and source batch rules.
- [ ] Approved 30-day SKU aggregation identity and safety-share denominator scope.
- [ ] Approved whether parity policy replaces configured tier/factor/rounding for selected runs.
- [ ] Confirmed eligible inbound statuses and sellable-stock semantics for policy 2.
- [ ] Decided whether manual proportional allocation is out of scope or approved as a separate workflow.

## Design and migration readiness

- [ ] Additive migration reviewed: policy/version, optional 30-day batch FK, immutable input snapshots, constraints/indexes.
- [ ] Existing policy-1 defaults and historic runs remain unchanged.
- [ ] API versioning/backward compatibility reviewed: omitted policy resolves to current strategy.
- [ ] Calculation explanations expose policy version and source provenance without breaking existing response consumers.
- [ ] Rollback plan is documented: select policy 1 for new runs; do not alter completed-run records.

## Test and comparison readiness

- [ ] Isolated database/API integration tests I-01 through I-18 have passed.
- [ ] Current Dispatch regression suite remains green.
- [ ] Controlled comparison batch includes every tier, multiple warehouses, eligible/ineligible inbound, boundary rounding, and constrained allocation.
- [ ] Input snapshots, recommendations, allocations, audit events, and lifecycle states reconcile exactly to approved expectations.
- [ ] Expected configured-vs-parity differences are documented and approved.

## Pilot and release controls

- [ ] Policy 2 is explicit, permission-controlled, and off by default.
- [ ] Pilot is limited to named users/channel/batches and produces read-only comparison evidence before operational use.
- [ ] Monitoring captures run ID, policy/version, source batches, calculation failures, calculation duration, and lifecycle conflicts.
- [ ] Support/runbook includes source-period validation, failure recovery, cancellation, and rollback steps.
- [ ] No production data is backfilled or recalculated without a separately approved plan.

## Go/no-go rule

**No-go** until every business-approval item and applicable integration-test item is complete. Activating the parity policy without an approved 30-day source and denominator scope would make results non-reproducible. The existing configured policy remains the safe default.
