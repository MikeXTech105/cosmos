# Dispatch Controlled Integration Test Plan

**Precondition:** isolated SQL database, deterministic committed snapshot batches, and approved policy decisions. Do not run these tests against production.

## Test fixtures

Create a channel with at least two warehouses, one item/mapping per Tier 1/2/3 case, effective packaging profiles, configured settings, and company-stock rows. Create:

- one committed weekly-sales batch with exact `PeriodFrom`/`PeriodTo`;
- one committed 30-day-sales batch with an approved 30-day window;
- one stock batch and one inbound batch containing statuses 1–5;
- a baseline parity worksheet/independent expected-calculation file with no broken formulas.

## Integration scenarios

| ID | Scenario | Expected acceptance criteria |
|---|---|---|
| I-01 | Existing create run without policy fields | Creates `ConfiguredSettings` run; current calculation results/API shape remain unchanged. |
| I-02 | Parity create run with valid weekly/30-day batches | Creates policy-2 draft with both batch IDs, same channel, committed status, and valid windows. |
| I-03 | Invalid parity selection | Missing/foreign/uncommitted 30-day batch, invalid period, or absent inputs returns actionable validation error; no run/input snapshot is created. |
| I-04 | Input identity | Same item across multiple warehouses/mappings does not aggregate across wrong mapping; input-snapshot unique constraint prevents duplicates. |
| I-05 | Period/sales aggregation | Assert warehouse weekly, network weekly, and SKU 30-day aggregates against fixture totals and documented scope. |
| I-06 | Tier/factors | Assert strict 7/20-box tiers and applied factors stored in parity input/result snapshots. |
| I-07 | Calculation | Assert recurring, safety, reorder, total stock, shortage, eligibility, and recommendation against signed-off expected values for all tiers. |
| I-08 | Zero/invalid shares | Zero network weekly with positive 30-day sales fails calculation atomically; no partial results/input snapshot remain. Zero warehouse share produces eligible=false/recommendation=0 where expected. |
| I-09 | Stock/inbound | Current sellable stock is counted once; statuses 2/3 are included and statuses 1/4/5 excluded unless a later approved policy changes this. |
| I-10 | Input snapshot replay | After calculation, alter current settings/profile/import data in the fixture; retrieve/replay persisted input snapshot and obtain the original result. |
| I-11 | Recalculation/idempotency | Recalculate same draft/calculated run repeatedly. No duplicate recommendation/allocation/input-snapshot rows; policy/version remains immutable or re-snapshot behavior is explicitly documented. |
| I-12 | Override | Override after calculation; final quantity/reason/audit record persists and allocation consumes final, not calculated, quantity. |
| I-13 | Priority allocation | With limited company stock, parity recommendations allocate in the existing allocation-priority, tier, warehouse-priority order and never exceed company stock. |
| I-14 | Finalization | Finalize only after allocation; no inventory mutation; further calculate/allocate/override calls return existing lifecycle conflicts. |
| I-15 | Repeated/concurrent requests | Concurrent calculate/allocate/finalize attempts leave one consistent state, no duplicate allocations, and actionable conflict responses. |
| I-16 | Rollback | Force a procedure/application persistence failure mid-calculation; transaction rolls back results, input snapshots, and run-state changes together. |
| I-17 | Authorization/API compatibility | Existing permissions and clients work for policy 1. Policy-2 selection/display is permission-protected as approved; omitted field keeps policy 1. |
| I-18 | Comparison batch | Two runs over frozen source batches produce documented configured-vs-parity differences; every difference is explained/signed off. |

## Test layers

- **SQL contract tests:** migration text/procedure projection/check constraint coverage.
- **Repository integration tests:** isolated SQL schema, stored procedure rows, transaction rollback, duplicate identities.
- **API integration tests:** `WebApplicationFactory`/test database, authorization, request validation, response compatibility, lifecycle conflicts.
- **Application unit tests:** policy resolver and parity-input adapter only; retain existing calculator/allocator tests.
- **Manual acceptance:** approved comparison batch and human-readable explanations.

## Acceptance gates

1. Existing policy-1 regression suite remains green without changed expected values.
2. Every parity result row has immutable source-batch and input-snapshot provenance.
3. All I-01 through I-18 applicable tests pass; manual allocation tests remain excluded unless that workflow is approved.
4. A representative batch is signed off by the business owner with no unexplained numerical difference.
5. Rollback, observability, and permission behavior are verified before any pilot.
