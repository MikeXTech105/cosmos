# Dispatch Planning Audit

**Audit scope:** Dispatch Planning API, contracts, validators, services, Dapper repository, SQL migration/procedures, Supply Chain packaging/warehouse dependencies, existing tests, and Dispatch documentation. **Workbook evidence:** the Dispatch Scheduling workbook itself is not present in the workspace or attachments; comparison is against the supplied written business reference only.

## Confirmed architecture

```text
Dispatch controllers
  -> DispatchPlanningService
  -> DispatchCalculationService / DispatchAllocationService
  -> DispatchPlanningRepository (Dapper)
  -> usp_DispatchPlanning_* procedures
  -> snapshot, run, result, allocation tables
```

The calculation consumes committed, selected sales/stock/inbound import batches for one channel. It uses active/effective dispatch settings and packaging profiles at calculation time, persists calculated values in `DispatchRecommendationResults`, then captures a per-item global company-stock snapshot. Allocation is in memory but SQL is the persistence/limit authority. Planning is read-only with respect to inventory; shipment operations owns actual later stock movement.

## Input mapping

| Input | Source | Used by |
|---|---|---|
| SKU/internal Item | `ChannelSkuMappings`, referenced by all three dispatch snapshot tables | calculation result identity |
| Warehouse | `ChannelWarehouses`, snapshot `WarehouseId` | sales/stock matching, priority |
| Sales | selected `DispatchWarehouseSalesSnapshots` batch | recurring demand |
| Current sellable stock | selected `DispatchWarehouseStockSnapshots.SellableQuantity` | total warehouse stock |
| Eligible inbound | selected inbound batch, statuses Dispatched/InTransit only | total warehouse stock |
| Factors/minimum/tier/priority | effective `DispatchSkuSettings` | calculation/order |
| Units per box/rounding | effective `ItemPackagingProfiles` plus setting flags | recommendation rounding |
| Company stock | `Items.CurrentStock - ReservedStock`, captured to `DispatchCompanyStockSnapshots` | allocation cap |

## Findings

### DP-001 — channel SKU identity was collapsed in calculation persistence

| Field | Evidence |
|---|---|
| Severity | **HIGH — confirmed data-integrity defect** |
| Files | `20260728_dispatch_planning_module.sql`: `usp_DispatchPlanning_Run_CalculationInputs`, `usp_DispatchPlanning_Run_SaveCalculation`, and result unique constraint |
| Current behavior | Sales/stock snapshots are grouped by `ChannelItemMappingId`, but save validation rejects duplicate `(ItemId, WarehouseId)` rows and results are unique on `(PlanningRunId, ItemId, WarehouseId)`. Inbound is summed only by warehouse/item. |
| Expected behavior | Dispatch is explicitly per warehouse **and SKU**. Distinct active channel-SKU mappings to the same internal Item must retain separate snapshot/recommendation identities and inbound must not cross those SKU mappings. |
| Evidence | Every snapshot/result has `ChannelItemMappingId`; the supplied business reference identifies warehouse and SKU as planning grain. |
| Impact | A valid multi-SKU-per-item channel can fail calculation or apply inbound for one SKU to another. |
| Fix | Forward migration changes result uniqueness and calculation validation to include mapping, and aggregates/joins inbound by mapping. |

### DP-002 — allocation supports multiple company snapshots in memory, but the released SQL model creates one per item

| Field | Evidence |
|---|---|
| Severity | **UNKNOWN / NEEDS BUSINESS CONFIRMATION** |
| Current behavior | `DispatchAllocationService` can consume multiple snapshots, but `DispatchCompanyStockSnapshots` has unique `(PlanningRunId, ItemId)` and `Run_Create` permits only system stock. |
| Action | Not changed. Expanding company-stock sources would be a new operational design/API, not a confirmed defect. |

### DP-003 — override values may bypass packaging rounding

| Field | Evidence |
|---|---|
| Severity | **UNKNOWN / NEEDS BUSINESS CONFIRMATION** |
| Current behavior | Override validation permits any non-negative final quantity with a reason. |
| Action | Not changed: the current documented model deliberately permits manual override; no evidence says an override must obey box rounding. |

### DP-004 — old draft/calculated runs resolve settings/packaging live on recalculation

| Field | Evidence |
|---|---|
| Severity | **UNKNOWN / NEEDS BUSINESS CONFIRMATION** |
| Current behavior | Snapshot batches are fixed by run, but `Run_CalculationInputs` selects currently active/effective setting/package records when recalculating Draft/Calculated runs. Persisted results retain resolved values once calculated. |
| Action | Not changed. Freezing master policy at Draft creation would materially redesign existing recalculation behavior. |

## Confirmed calculation/lifecycle facts

* `sellable = max(0, available - reserved - damaged)` in the stock snapshot computed column.
* Inbound contributes only when status is `Dispatched` or `InTransit`; planned, received and cancelled do not.
* `recurring = sales * recurringFactor`; `safety = recurring * safetyFactor`; `reorder = recurring + safety`; `shortage = max(0, reorder - (sellable + eligibleInbound))`.
* Current formula applies `max(shortage, minimumDispatch)` even when shortage is zero. This exactly matches the supplied formula, so no change was made.
* Rounding is decimal, six-scale, and covers Exact, Nearest, Up, Down, Exact-Below-One-Box, Half-Box-Threshold. Invalid non-loose box sizes fail deterministically.
* Lifecycle is Draft -> Calculated -> Allocated -> Finalized; Draft/Calculated/Allocated can cancel; only Calculated can override; only Allocated can finalize. Finalized rows are protected by SQL triggers.

## API trace

| Endpoint family | Controller/service/procedure |
|---|---|
| settings CRUD | `DispatchSkuSettingsController` -> service/repository -> `usp_DispatchPlanning_SkuSettings_*` |
| CSV import validate/commit/cancel/list | `DispatchSnapshotImportsController` -> service/repository -> `usp_DispatchPlanning_Import_*` |
| manual snapshot validation | `POST /imports/manual/validate` -> `DispatchPlanningService` -> shared import validation/commit procedures |

**Manual entry and hash compatibility (2026-10-10):** The frontend offers a Manual Entry path for one sales, warehouse-stock, or inbound warehouse/SKU row. It calls the dedicated manual-validation endpoint, which derives the SHA-256 batch hash server-side and then uses the same shared staging, validation, duplicate detection, commit, immutable snapshot, and audit flow as CSV imports. The ordinary CSV validation request also accepts an omitted `fileHash`; the service generates the same deterministic normalized-payload hash so imports do not fail in HTTP or other browser contexts without `crypto.subtle`.
| run create/list/get/calculate/recommendations/override/allocate/finalize/cancel | `DispatchPlanningRunsController` -> service/repository -> `usp_DispatchPlanning_Run_*` / recommendation procedures |
| recommendation report/export | `DispatchPlanningReportsController` -> service/repository -> report procedure |

All endpoints preserve JWT/page-action permissions, validators, audit entries and `ApiResponse` contracts.
