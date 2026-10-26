# Dispatch Planning Module — Audit and Fix Report

## 1. Executive Summary

The Dispatch Planning module was traced from controller through service, calculation/allocation engines, Dapper repository, stored procedures and Dispatch/Supply Chain tables. One confirmed defect was fixed: the database collapsed distinct channel SKUs that resolve to the same internal Item at a warehouse, although Dispatch planning is defined per warehouse and SKU. The repair is deliberately limited to the SQL calculation/result identity and does not change API shapes, auth, permissions, stock mutation boundaries, or planning formulas.

## 2. Current Dispatch Architecture

```text
Dispatch imports (sales, stock, inbound)
  -> committed Dispatch snapshot tables
  -> draft DispatchPlanningRun references selected import batches
  -> Run_CalculationInputs resolves effective setting/package and snapshot inputs
  -> DispatchCalculationService produces deterministic recommendations
  -> Run_SaveCalculation persists results and captures global company-stock snapshots
  -> DispatchAllocationService allocates immutable company stock
  -> SQL validates/persists allocation
  -> finalization locks planning records; it does not move stock
  -> Shipment Operations, if later created, owns real dispatch stock movement
```

Endpoints remain under `/api/v1/dispatch-planning`: settings, imports, runs and reports. Controllers use `DispatchPlanningService`; DTO validators run before service persistence; Dapper calls `usp_DispatchPlanning_*`; the standard JWT/page-action authorization, audit calls, exception middleware and `ApiResponse` envelope are unchanged.

## 3. Business Logic

For each `warehouse + channel SKU mapping` calculation row:

```text
sellable warehouse stock = max(0, available - reserved - damaged)
eligible inbound         = sum(inbound where status is Dispatched or InTransit)
total warehouse stock    = sellable warehouse stock + eligible inbound
recurring demand         = sales quantity * recurring demand factor
safety stock             = recurring demand * safety stock factor
reorder point            = recurring demand + safety stock
raw shortage             = max(0, reorder point - total warehouse stock)
pre-rounded quantity     = max(raw shortage, minimum dispatch quantity)
recommendation           = pre-rounded quantity adjusted by loose/box rounding policy
```

The calculation rounds decimals to six places, away from zero. `AllowLooseQuantity` or `Exact` bypasses box rounding; the other modes are nearest/up/down/exact-below-one-box/half-box-threshold. Allocation groups by internal Item and orders recommendation rows by allocation priority, tier, warehouse priority and result ID. This is appropriate because company stock is a single global Item pool, while demand inputs/results are warehouse/SKU-specific.

## 4. Excel vs Backend Comparison

| Excel concept in supplied brief | Backend implementation | Classification / action |
|---|---|---|
| Warehouse sales | committed warehouse sales snapshots, per mapping | same concept |
| Current stock | sellable warehouse snapshot quantity | same concept; whether Excel is gross or net is unknown |
| Inbound | committed inbound snapshots; only Dispatched/InTransit eligible | same formula boundary; status business policy needs confirmation |
| Total stock | sellable + eligible inbound | same |
| Recurring/safety/reorder | supplied formulas, decimal calculation service | same |
| Minimum dispatch | `max(shortage, minimum)` including zero shortage | same as supplied formula |
| Packaging/box rounding | six deterministic modes plus loose flag | same concept; workbook thresholds unavailable |
| SKU identity | now per warehouse + channel SKU mapping | **confirmed bug fixed** |
| Allocation | global Item stock snapshot, deterministic priority order | intentional backend boundary; no warehouse inventory ledger |

The workbook itself was unavailable, so legacy cells/rules not stated in the brief are **UNKNOWN / NEEDS BUSINESS CONFIRMATION**.

## 5. Bugs Found

### DP-001 — distinct mapped SKUs could collapse into one Item/warehouse result

* **Severity:** HIGH
* **Files:** original Dispatch migration calculation-input/save procedures and result uniqueness constraint.
* **Current behavior before repair:** Sales/stock use `ChannelItemMappingId`, but inbound was summed only by Item/warehouse. Save validation and `DispatchRecommendationResults` uniqueness accepted only one row per Item/warehouse.
* **Impact:** different channel SKUs mapped to the same Item could fail calculation or receive each other's inbound quantity.
* **Evidence:** snapshot and result tables explicitly contain `ChannelItemMappingId`; the business requirement is per warehouse and SKU.

## 6. Fixes Implemented

`database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql`:

1. Replaces result uniqueness with `(PlanningRunId, ItemId, WarehouseId, ChannelItemMappingId)`.
2. Aggregates inbound snapshots by warehouse, Item and channel mapping.
3. Joins inbound to sales on all three identity values.
4. Accepts duplicate validation only when the full Item/warehouse/mapping tuple repeats.
5. Retains company-stock snapshots per internal Item and all existing allocation rules.

No C# API, DTO, controller, permission, or response-contract change was necessary.

## 7. Database Changes

Apply the new forward migration after `20260728_dispatch_planning_module.sql`. It changes one unique constraint and two procedures only. `database/verify_dispatch_planning.sql` now asserts the new uniqueness constraint. There is no data backfill and no stock mutation.

## 8. API Changes

None. Existing response fields `id`, `channelItemMappingId`, and `channelSku` are now important row identity fields. Clients must not deduplicate by Item and warehouse alone. See [frontend changes](docs/DISPATCH_PLANNING_FRONTEND_CHANGES.md).

## 9. Tests Added/Updated

* `DispatchPlanningEngineTests` now verifies all six rounding modes, partial Exact-Below-One-Box behavior, inbound covering a shortage, invalid non-loose box size, and independent channel-SKU rows sharing one Item-pool allocation.
* `DispatchPlanningSqlContractTests.Sku_snapshot_integrity_migration_preserves_warehouse_and_mapping_identity` guards the migration's constraint, inbound grouping/join, and duplicate-validation identity.
* `database/verify_dispatch_planning.sql` validates the deployed result identity constraint.

Existing focused tests already cover a normal rounded calculation, loose quantities and priority/cap allocation. The database remains the final allocator validation authority.

## 10. Test Results

* **Focused Dispatch test command:** started `dotnet test tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~DispatchPlanning"`.
* **Result:** **NOT AVAILABLE in this run.** The local test runner did not emit a completion summary and the machine already had many long-running `dotnet` processes. No process was terminated because it could belong to the user or another task.
* **Required follow-up:** run the focused command after clearing the local test-host contention, then run `dotnet build Cosmos.slnx --no-restore` and the full suite. Execute `database/verify_dispatch_planning.sql` against a database with all migrations applied.

## 11. Remaining Unknowns

* Whether manual overrides must obey packaging multiples; current behavior permits any non-negative reasoned override.
* Whether Planned inbound should count for any channel.
* Whether recalculating Draft/Calculated runs should freeze settings/packaging as of run creation instead of resolving them live.
* Whether imported/manual company-stock sources should be enabled. The engine can consume several snapshots, but the released database captures one system stock snapshot per Item/run.
* Workbook-specific factors, date windows, tier quantity effects, and half-box business interpretation.

## 12. Final Dispatch Flow

```text
Input rows (warehouse + exact channel SKU)
  ↓
validated/committed sales, stock, inbound snapshots
  ↓
draft run selects immutable input batches
  ↓
calculation resolves policy/package and computes recommendation
  ↓
calculated result preserves warehouse + SKU mapping identity
  ↓
reasoned override (Calculated only)
  ↓
global company-stock allocation by deterministic priority
  ↓
Allocated run finalization (no planning stock mutation)
  ↓
optional later Shipment Operations workflow
  ↓
shipment dispatch, not Dispatch Planning, creates real stock movement
```

## Complete validated example

Illustrative values, not production data:

```text
SKU: CHANNEL-SKU-A
Warehouse: WH-1
Sales: 20
Recurring Demand Factor: 1.5 -> recurring demand = 30
Safety Stock Factor: 0.25 -> safety stock = 7.5
Current Sellable Stock: 10
Eligible Inbound: 5
Total Available Warehouse Stock: 15
Reorder Point: 37.5
Raw Shortage: max(0, 37.5 - 15) = 22.5
Minimum Dispatch: 12 -> pre-rounded = 22.5
Units Per Box: 10; Rounding: Round Up -> final recommendation = 30
Company Item Stock Snapshot: 25 -> final allocation = 25 (partial allocation)
```

The formulas are in `DispatchCalculationService.CalculateLine`; allocation order/caps are in `DispatchAllocationService.Allocate` and revalidated by `usp_DispatchPlanning_Run_Allocate`.
