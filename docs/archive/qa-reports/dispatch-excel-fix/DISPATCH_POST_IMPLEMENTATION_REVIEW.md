# Dispatch Post-Implementation Verification Review

**Review date:** 2026-10-10  
**Mode:** read-only review. No application code, migration, workbook, or production behavior was changed.  
**Workbook inspected:** `D:\Downloads\Copy of NEW DISPATCH SCHEDULING.xlsx`. The requested `(3)` filename was not present.

## Verdict

The parity service faithfully implements the primary workbook formulas for tier selection, factors, recurring demand, safety stock, suppression, and rounding in its covered cases. It is isolated from production. However, it is **not ready for controlled integration testing** until the P1 eligibility-flag defect is corrected and the missing numeric/invalid-input boundary tests are added. It is not eligible for production activation until the documented sales-period, source, and policy decisions are approved.

## Findings

| Severity | Classification | Finding | Evidence / recommendation |
|---|---|---|---|
| P1 | DEFECT | `IsDispatchEligible` is true when total stock equals reorder point, although the result is zero and the workbook output is blank/suppressed. | `DispatchExcelParityCalculationService.Calculate` line 28 uses `totalStock <= reorderPoint`. For 30-day=70, weekly=10/20, box=10, current=75, inbound=0: safety=35, reorder=75, shortage=0, actual result is `IsDispatchEligible=true` and recommendation=0. Make eligibility require a positive shortage (`totalStock < reorderPoint` or `rawShortage > 0`) and test it. |
| P2 | MISSING TEST | Precision is rounded at every intermediate stage to six decimals, but no test proves the chosen persistence precision cannot change a threshold/rounding outcome. | `DispatchExcelParityCalculationService.cs:21-27,86`. The workbook formulas do not explicitly round intermediate values. Add fractional-share tests near the 0.5-box and one-box boundaries and document the accepted tolerance. |
| P2 | MISSING TEST | Negative and invalid input validation exists but is largely untested. | `Validate` lines 72-84 rejects negative sales, warehouse/network sales, stock, inbound, non-positive box quantity, and impossible warehouse share. Tests cover only one zero-denominator case. Add a test for every guard. |
| P2 | MISSING TEST | Zero 30-day sales with zero network weekly sales is not tested and deliberately returns safety 0 rather than reproducing Excel's literal divide-by-zero expression. | `Calculate` lines 23-25 avoids division when 30-day sales is zero. This is a defensible safe behavior, but must be explicit in the policy/acceptance test. |
| P2 | MISSING TEST | Exact Tier 3 one-box boundary and zero warehouse-share case are not covered. | `QuantityForTier` lines 59-69; add shortage exactly one box, warehouse weekly sales zero/network positive, and stock/reorder equality eligibility assertions. |
| P2 | BLOCKED | The parity strategy has no production input source, dependency-injection registration, policy selector, persistence mapping, or lifecycle integration. | Search found references only in the new service, tests, and reports. `DependencyInjection.cs:36-38` registers only the existing engines; `DispatchPlanningService.cs:178` calls only `DispatchCalculationService`. This is correct isolation, but blocks integration. |
| P3 | PASS | No accidental API, database, migration, frontend, or production calculation-path modification was found. | The new files are standalone/untracked. Existing API/run path still uses the original engine and existing persistence. |
| P3 | PASS | Existing inbound filtering, sellable-stock semantics, configured tiers, and priority allocation remain unchanged. | Calculation-input SQL filters `InboundStatus IN(2,3)` at migration line 53 and returns sellable stock at line 58. Production calculation uses configured settings; allocation remains `DispatchAllocationService` at `DispatchPlanningService.cs:215`. |

## Formula-by-formula comparison

| Workbook formula / rule | Parity implementation | Review |
|---|---|---|
| `PER_BOX!F2 = IF(E2 > 20×B2, 1, IF(E2 > 7×B2, 2, 3))` | `ResolveTier` lines 42-49 uses the same strict `>` comparisons | PASS |
| Tier factors: T1 3/4, T2 4/2, T3 4/4 | `Factors` lines 51-57 | PASS |
| `RECURRING_DEMAND!C2 = factor × LAST_WEEK_SALE` | line 21: weekly sales × recurring factor | PASS |
| `SAFETY_STOCK!D3 = 30-day sales × warehouse weekly sales / network weekly sales × safety factor / 4` | lines 23-25 | PASS for positive valid denominator; zero-denominator policy differs intentionally and needs more coverage |
| `TOTAL_STOCK = current + inbound` | line 20 | PASS for explicit parity inputs; production inbound eligibility remains intentionally separate |
| `REORDER POINT = recurring + safety` | line 26 | PASS |
| Safety > 0 required | line 28 | PASS except stock-equality eligibility semantic defect |
| Tier 1 suppress below one box; otherwise nearest box | lines 64 and 68 | PASS |
| Tier 2 suppress below half box; otherwise nearest box | lines 65 and 68 | PASS |
| Tier 3 returns loose shortage below one box; otherwise nearest box | lines 66 and 68 | PASS |
| `TOTAL_STOCK > REORDER POINT` suppresses output | line 28 plus line 60 | Recommendation is zero, but equality reports eligible; DEFECT for the boolean flag |

## Executed numerical evidence

| Case | Input | Expected | Actual | Result |
|---|---|---|---|---|
| 7-box boundary | box=10, 30-day sales=70 | Tier 3 | Tier 3 | PASS |
| Just above 7 boxes | box=10, sales=70.000001 | Tier 2 | Tier 2 | PASS |
| 20-box boundary | box=10, sales=200 | Tier 2 | Tier 2 | PASS |
| Just above 20 boxes | box=10, sales=200.000001 | Tier 1 | Tier 1 | PASS |
| Warehouse shares | 30-day=100; weekly 10/40 and 30/40 | safety 25 and 75 | 25 and 75 | PASS |
| Tier 2 threshold | shortages 4, 5, 6 with box=10 | 0, 10, 10 | 0, 10, 10 | PASS |
| Tier 1 threshold/midpoint | shortages 9, 10, 15 with box=10 | 0, 10, 20 | 0, 10, 20 | PASS |
| Tier 3 loose/midpoint | shortages 5, 15 with box=10 | 5, 20 | 5, 20 | PASS |
| Safety gate | 30-day=0, weekly=10/20, current=0 | ineligible, 0 | false, 0 | PASS |
| Explicit inbound | current=70, inbound=5, reorder=75 | total 75, 0 | 75, 0 | PASS |
| Invalid denominator | positive 30-day sales, network weekly=0 | reject | `InvalidOperationException` | PASS |
| Stock equals reorder point | 30-day=70, weekly=10/20, current=75 | no dispatch/blank | recommendation 0, **eligibility true** | DEFECT (source trace; no direct assertion exists) |

## Isolation review

- `DispatchExcelParityCalculationService` is not registered by `Cosmos.Application.DependencyInjection`.
- The reference search found no controller, repository, API contract, SQL, migration, frontend, or `DispatchPlanningService` invocation.
- Production runs retain `DispatchCalculationService` (`DispatchPlanningService.cs:21,178`) and existing priority allocation (`DispatchPlanningService.cs:22,215`).
- SQL continues to use sellable stock and statuses 2/3 inbound (`20261008_dispatch_planning_sku_snapshot_integrity.sql:48-58`).

**Result: PASS — no accidental production-path integration.**

## Test/build execution

```text
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter FullyQualifiedName~DispatchPlanning --no-restore
Passed: 37; Failed: 0; Skipped: 0

dotnet build backend/Cosmos.slnx --no-restore
Succeeded: 0 errors
```

Warnings were pre-existing package warnings: `NU1903` (`Microsoft.OpenApi` 2.4.1) and `NU1510` (redundant Infrastructure package references).

## Workbook evidence

The inspected workbook has the expected primary formulas:

- `PER_BOX!F2`, `C2`, and `D2` for strict tier/factor selection.
- `RECURRING_DEMAND!C2` for weekly-sales demand.
- `SAFETY_STOCK!D3` for the warehouse-share safety formula.
- `REORDER POINT!C2`, `TOTAL_STOCK!B2`, and `OUTPUT!C2` for reorder, stock, and quantity rules.

`WAREHOUSE_QUANTITY!N17` contains `=CURRENT_STOCK!N17+#REF!`; cached/broken secondary ranges were not used as expected results. The requested `Copy of NEW DISPATCH SCHEDULING(3).xlsx` was not found, so a distinct version of that file remains a blocker to claiming it was reviewed.

## Remaining blockers before production activation

1. Fix the P1 stock-equality eligibility flag and add its regression test.
2. Add P2 validation, precision, zero-network/zero-sales, and exact-Tier-3-boundary tests.
3. Approve the source and period for 30-day sales, weekly sales, and the network warehouse-share denominator.
4. Approve whether the parity policy supersedes configured tier/factor/rounding settings.
5. Design a backward-compatible policy/input persistence path, register the strategy only through an explicit selector, and test the full lifecycle against an isolated database.
6. Decide whether manual proportional allocation is required; if so, define its audit and remainder policies.

## Recommendation priority

1. **P1:** correct and test equality eligibility before any controlled integration.
2. **P2:** complete invalid/precision boundary tests and document six-decimal tolerance.
3. **P2:** obtain business approvals and add a versioned run/input persistence design.
4. **P3:** perform API/database lifecycle and concurrency tests after the explicit policy is wired.
