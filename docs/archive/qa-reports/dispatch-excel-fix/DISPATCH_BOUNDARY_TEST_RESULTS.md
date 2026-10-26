# Dispatch Parity Boundary-Test Results

**Date:** 2026-10-10  
**Scope:** isolated `DispatchExcelParityCalculationService` only. No production Dispatch registration, API, persistence, migration, frontend, or lifecycle behavior changed.

## P1 defect fix

**Root cause:** `IsDispatchEligible` used `safety > 0 && totalStock <= reorderPoint`. At exact stock/reorder equality this reported eligibility even though the shortage and recommendation were zero.

**Change:** `DispatchExcelParityCalculationService.Calculate` now uses `safety > 0 && rawShortage > 0`.

| Fixture | Expected | Actual | Test |
|---|---|---|---|
| 30-day=70, warehouse/network weekly=10/20, box=10, current=74 | eligible; recommendation 1 | true; 1 | `Calculate_HandlesStockBelowEqualAndAboveReorderPoint` |
| Same fixture, current=75 (reorder point) | ineligible; recommendation 0 | false; 0 | same |
| Same fixture, current=76 | ineligible; recommendation 0 | false; 0 | same |

## Input-validation and boundary results

| Case | Expected | Actual | Status |
|---|---|---|---|
| Null calculation input | `ArgumentNullException` | `ArgumentNullException` | PASS |
| Negative 30-day, warehouse-weekly, network-weekly, current, or inbound quantity | `ArgumentOutOfRangeException` | `ArgumentOutOfRangeException` for each field | PASS |
| Zero or negative units per box | `ArgumentOutOfRangeException` | `ArgumentOutOfRangeException` | PASS |
| Warehouse weekly sales > network weekly sales | `InvalidOperationException` | `InvalidOperationException` | PASS |
| 30-day=0 and network weekly=0 | no divide-by-zero; safety 0; ineligible/0 | safety 0; false/0 | PASS |
| Positive 30-day sales and network weekly=0 | reject invalid denominator | `InvalidOperationException` | PASS |
| Warehouse weekly=0, network weekly>0 | recurring/safety 0; ineligible/0 | 0/0; false/0 | PASS |
| Tier 3 shortage exactly one box | nearest-box branch returns one box | 10 | PASS |
| Tier 2 shortages just below/above half box | 0 below; one box at/above threshold | 0 / 10 | PASS |
| Tier 1 shortages just below/above one box | 0 below; one box at/above threshold | 0 / 10 | PASS |
| Exact midpoint (Tier 1 shortage 15, box 10) | nearest box, away from zero = 20 | 20 | PASS |

## Six-decimal precision assessment

The service rounds persisted/intermediate calculation quantities to six decimal places via `Q`, consistent with the existing Dispatch calculation service and the database calculation-result fields declared as `DECIMAL(19,6)`.

| Fixture | Mathematical shortage before Q | Service raw shortage / recommendation | Outcome |
|---|---:|---|---|
| Tier 2: current=55.0000006, reorder=60 | 4.9999994 | 4.999999 / 0 | Suppressed below half box |
| Tier 2: current=54.9999996, reorder=60 | 5.0000004 | 5.000000 / 10 | One box at/above half box |
| Tier 1: current=142.5000006, reorder=152.5 | 9.9999994 | 9.999999 / 0 | Suppressed below one box |
| Tier 1: current=142.4999996, reorder=152.5 | 10.0000004 | 10.000000 / 10 | One box at/above one box |

No tested fixture changed the final recommendation compared with the unrounded workbook threshold semantics. The accepted intermediate tolerance is **±0.0000005 units**, the maximum six-decimal rounding difference. Final box/loose recommendations remain exact in the executed fixtures. No precision behavior was changed.

## Executed commands

```text
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter FullyQualifiedName~DispatchPlanning --no-restore
Passed: 54; Failed: 0; Skipped: 0

dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-build --no-restore
Passed: 305; Failed: 0; Skipped: 0

dotnet build backend/Cosmos.slnx --no-restore
Succeeded: 0 errors
```

The commands emitted existing warnings: `NU1903` for `Microsoft.OpenApi` 2.4.1 and `NU1510` for redundant Infrastructure package references.

## Isolation and remaining blockers

The parity service remains unregistered in dependency injection and has no production controller, repository, SQL, or lifecycle reference. The configured-tier production calculation service and priority allocator are unchanged.

The isolated engine is **ready for controlled integration testing**. Production activation remains blocked by approval of the weekly/30-day sales sources, network-share scope, parity-policy selection versus configured settings, a backward-compatible persistence/selection design, isolated database lifecycle testing, and the unresolved manual-allocation decision.
