# Dispatch Fix Implementation Report

**Report date:** 2026-10-10  
**Branch reviewed:** `codex`  
**Scope:** Dispatch module only. Procurement Planning and unrelated modules were not changed.

## Outcome

No Dispatch calculation behavior, API contract, database schema, or production data was changed in this pass. The audit mismatches were verified in the current source, but each candidate behavior change depends on a business-policy decision or input that the workbook and code do not establish. Implementing any of them now would invent rules or silently replace existing configuration-driven behavior.

The existing Dispatch test subset was executed successfully: **15 passed, 0 failed, 0 skipped**. This is regression evidence for current behavior only; it is not Excel-parity evidence.

## Verified issue disposition

| Original issue | Severity | Current source verification | Root cause / affected files | Change made | Approved rule implemented | Status |
|---|---|---|---|---|---|---|
| D-01 / workbook integrity | P0 | `#REF!` errors remain in the supplied workbook, including direct formula corruption in `WAREHOUSE_QUANTITY!N17` | Reference workbook, not COSMOS | None | None; workbook requires repair by its owner | BLOCKED |
| D-02 / dynamic tier | P1 | `DispatchCalculationInput` receives a configured `Tier`; `DispatchCalculationService` does not derive it from sales | `backend/src/Cosmos.Application/DispatchPlanning/DispatchPlanningModels.cs`; `backend/src/Cosmos.Application/Services/DispatchCalculationService.cs`; calculation-input SQL | None | Not approved. Need confirmation that the Excel 30-day thresholds replace setting-managed tiers and an authoritative 30-day input. | BLOCKED |
| D-03 / safety stock | P1 | Current formula is `recurring demand × safety factor`, not the workbook network-share formula | `backend/src/Cosmos.Application/Services/DispatchCalculationService.cs` | None | Not approved. Need a selected safety-stock strategy and required network totals. | BLOCKED |
| D-04 / dispatch quantity rules | P1 | Generic minimum quantity precedes configured rounding; no safety-positive gate exists | `backend/src/Cosmos.Application/Services/DispatchCalculationService.cs` | None | Not approved. Need confirmation that the workbook's tier-specific gate and rounding supersede existing setting values. | BLOCKED |
| D-05 / inbound eligibility | P1 | SQL includes only inbound statuses 2 and 3; workbook has no status filter | `backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql` | None | Not approved. Need policy choice between all inbound and eligible inbound only. | BLOCKED |
| D-06 / manual proportional allocation | P2 | Existing allocation is priority-based, not a manual W-total proportional split | `backend/src/Cosmos.Application/Services/DispatchAllocationService.cs`; `backend/src/Cosmos.Application/Services/DispatchPlanningService.cs` | None | Not approved. Need W-field meaning, owner, remainder policy, and retained-process confirmation. | BLOCKED |
| D-07 / current-stock semantics | P2 | COSMOS uses sellable stock, while Excel source meaning cannot be proven from the workbook | calculation-input SQL and import contracts | None | Not approved. Need gross/sellable/net definition. | BLOCKED |
| D-08 / sales period | P2 | Workbook labels conflict between last-week sales and 30-day sales; current snapshot contract does not resolve it | Workbook and dispatch snapshot contracts | None | Not approved. Need period definition per rule. | BLOCKED |
| D-09 / allocation decision table | P2 | No documented total/remainder policy exists | Product/business process, then allocation API/UI | None | Not approved. | BLOCKED |
| D-10 / legacy workbook block | P3 | Secondary workbook block is not suitable as a parity oracle | Reference workbook | None | N/A to application code until workbook owner classifies it | PENDING |
| D-11 / deterministic parity suite | P3 | Existing engine tests cover current calculations and allocation, not approved workbook parity | `backend/tests/Cosmos.Tests/DispatchPlanning/DispatchPlanningEngineTests.cs` | None | Pending clean fixtures and decisions above | PENDING |

## Expected versus actual verification

| Verification | Expected | Actual | Result |
|---|---|---|---|
| Current code still uses configured tier | Audit mismatch remains detectable | `DispatchCalculationInput` includes `Tier`; no dynamic sales-tier logic is present | Confirmed |
| Current safety formula | Audit mismatch remains detectable | `sales × recurring factor`, then `recurring × safety factor` | Confirmed |
| Current inbound policy | Audit mismatch remains detectable | SQL filters `InboundStatus IN (2,3)` | Confirmed |
| Existing Dispatch regression tests | Current suite passes | 15 passed, 0 failed, 0 skipped | Passed |
| Excel numeric parity | Not claimed without clean source and approved rules | Not run | Blocked |
| API/database integration against a test database | Not claimed without fixture data/environment | Not run | Unverified |

## Tests executed

```text
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj \
  --filter FullyQualifiedName~DispatchPlanning --no-build --no-restore

Passed: 15; Failed: 0; Skipped: 0
```

The earlier build invocation reported pre-existing package warnings:

- `NU1903` for `Microsoft.OpenApi` 2.4.1 (known high-severity advisory).
- `NU1510` for redundant `Microsoft.Extensions.Http` and `Microsoft.Extensions.Configuration.Binder` package references.

Those warnings are outside this Dispatch-only scope and were not changed.

## Decisions required to unblock implementation

1. Do the Excel threshold tiers (`>20` and `>7` boxes) replace per-SKU configured tiers, and which approved **30-day** sales snapshot supplies the value?
2. Is the Excel network-share safety-stock formula the target, or is the current recurring-demand factor model intentionally retained?
3. Should the Excel safety-positive output gate and tier-specific rounding replace existing `MinimumDispatchQuantity`, `RoundingMode`, and `AllowLooseQuantity` settings?
4. Should all inbound be included, or only dispatched/in-transit inbound (statuses 2/3)?
5. Is `OUTPUT!W` a required manual available-stock entry? If yes, what is its authority, its proportional-allocation remainder rule, and its audit requirement?
6. Does Excel current stock already exclude reservations/damage, and what sales period applies to each calculation?

## Regression and deployment considerations

- A tier/safety/rounding change can change recommendations for every SKU and warehouse. Version the applied rules in the run and compare a sampled batch before release.
- A dynamic-tier or network-share safety rule needs additional snapshot columns/query aggregates; introduce them with a backward-compatible migration only after decisions 1–2.
- Changing inbound eligibility affects shortage and allocation. Backfill/recalculation policy must be agreed before deployment.
- Manual proportional allocation requires an explicit API/UI/audit workflow; it should not be hidden behind the current automatic allocator.

## Files changed in this pass

- `qa-reports/dispatch-excel-audit-2026-10-10/DISPATCH_FIX_BACKLOG.md` — status update only.
- `qa-reports/dispatch-excel-audit-2026-10-10/DISPATCH_FIX_IMPLEMENTATION_REPORT.md` — verification report.

No application-source, migration, API, frontend, or test files were changed.
