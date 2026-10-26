# Dispatch Verification Test Matrix — Execution Status

| Area | Coverage | Status |
|---|---|---|
| Tier 7/20-box strict boundaries | `DispatchExcelParityCalculationServiceTests.ResolveTier_UsesStrictWorkbookThresholds` | EXECUTED — PASS |
| Tier factors and recurring demand | `Calculate_AppliesWorkbookFactorsForEachTier`; multi-warehouse test | EXECUTED — PASS |
| Safety-stock warehouse share / denominator | multi-warehouse and zero-denominator tests | EXECUTED — PASS |
| Reorder, stock equality, inbound counted once | stock/inbound tests | EXECUTED — PASS |
| Safety gate, half-box, one-box, nearest midpoint, Tier 3 loose | tier quantity tests | EXECUTED — PASS |
| Existing Dispatch engine and priority allocation | existing `DispatchPlanningEngineTests` | EXECUTED — PASS |
| Mapping and SQL contract | existing Dapper/SQL contract tests | EXECUTED — PASS |
| Inbound status 1–5 against production database | Requires isolated database fixtures and approved policy | NOT EXECUTED |
| Validate → commit → run → calculate → override → allocate → finalize | Requires isolated database/API host | NOT EXECUTED |
| Repeated/concurrent lifecycle requests | Requires isolated database/API host | NOT EXECUTED |
| Manual proportional allocation | Blocked by business decision | NOT APPLICABLE |
| Production Excel-policy run | Blocked by source/policy selection | NOT EXECUTED |

## Commands and actual results

```text
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter FullyQualifiedName~DispatchPlanning --no-build --no-restore
Passed: 37; Failed: 0; Skipped: 0

dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore
Passed: 288; Failed: 0; Skipped: 0

dotnet build backend/Cosmos.slnx --no-restore
Succeeded: 0 errors
```

The build/test commands emitted pre-existing package warnings: `NU1903` for `Microsoft.OpenApi` 2.4.1 and `NU1510` for redundant Infrastructure package references.
