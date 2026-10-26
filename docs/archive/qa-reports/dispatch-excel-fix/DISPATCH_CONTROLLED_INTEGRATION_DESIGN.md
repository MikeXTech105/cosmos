# Dispatch Controlled Integration Design

**Scope:** design only. No policy, API, schema, dependency-injection, or production behavior is changed by this document.

## Current architecture and authoritative candidate sources

| Required parity input | Existing authoritative candidate | Evidence | Decision still required |
|---|---|---|---|
| Last-week sales by warehouse/SKU | `DispatchWarehouseSalesSnapshots.SalesQuantity`, filtered to the run's committed `SalesImportBatchId`, grouped by warehouse, item, and channel mapping | Run calculation SQL groups the selected sales batch at `20261008_dispatch_planning_sku_snapshot_integrity.sql:42-45` | Define exact weekly window and whether rows must cover exactly that window. |
| Warehouse weekly sales for safety-share numerator | Same selected weekly-sales batch, summed across all active SKU/mapping rows for each warehouse | Workbook `SAFETY_STOCK!D3` uses warehouse weekly total / network weekly total | Confirm whether the share is channel-wide, warehouse-wide, and inclusive of all mapped SKUs. |
| Network weekly sales for safety-share denominator | Same selected weekly-sales batch, summed across all warehouses and SKU/mapping rows for the run's channel | Workbook safety header row totals all warehouse weekly sales | Confirm inclusions/exclusions (returns, inactive mappings, zero-sales warehouses, correction rows). |
| 30-day sales by SKU | No run-selected authoritative source today. Candidate: a distinct committed sales-import batch whose period is the approved 30-day window, aggregated by item/channel across warehouses | Sales snapshots already store `PeriodFrom` and `PeriodTo` (`20260728_dispatch_planning_module.sql:86-108`) | Required: choose calendar/rolling window, batch selection, and whether aggregation is item, item+mapping, or item+channel. |
| Units per box | Effective `ItemPackagingProfiles.UnitsPerBox`, resolved by existing calculation-input procedure | Existing procedure resolves profile at `20261008...:74-80` | No new definition required; confirm existing effective-date precedence remains desired. |
| Current stock | `DispatchWarehouseStockSnapshots.SellableQuantity` from selected stock batch | Persisted formula subtracts reserved and damaged quantities (`20260728...:123-137`) | Retain current sellable policy unless business explicitly changes it. |
| Eligible inbound | Existing inbound snapshot aggregation, statuses 2/3 only | `20261008...:50-58` | Retain as default; approval required only to choose all-inbound parity instead. |

## Existing run flow

`Validate import → Commit batch → Create run (batch IDs) → GetCalculationInputs → DispatchCalculationService → SaveCalculation → Override → Priority allocation → Finalize`

`DispatchPlanningService.CalculateRunAsync` currently obtains `DispatchCalculationInput` from the repository and always calls the configured-settings engine. The run already persists source batch IDs, `CalculationVersion`, recommendation results, and company-stock snapshots. It does **not** persist a policy selector, 30-day batch reference, warehouse/network sales-share inputs, or a complete immutable input snapshot for parity replay.

## Recommended backward-compatible policy selector

Introduce a run-level enum, not a global switch:

| Value | Meaning | Default |
|---|---|---|
| `ConfiguredSettings` (1) | Current `DispatchCalculationService`; configured tiers/factors/minimum/rounding | Yes, for every existing/new run unless explicitly selected |
| `ExcelParity` (2) | `dispatch-excel-parity-v1`; explicit weekly/30-day/share inputs and workbook-derived calculation rules | No; require explicit request and validation |

Recommended contract shape:

- Add optional `CalculationPolicy` to the create-run request/DTO. Omitted values resolve to `ConfiguredSettings`, preserving API clients.
- Add optional `ThirtyDaySalesImportBatchId` only when `CalculationPolicy=ExcelParity`.
- Do not add policy fields to SKU settings until business decides whether parity is item-selectable or run-selectable. A run-level selector avoids mixed policies in one result set and makes comparison/replay clear.
- Register both calculators behind a small policy resolver in the application layer only after the schema/data contract exists. Reject unsupported/missing policy inputs; never silently fall back to configured calculation.

## Reproducibility and snapshot design

### Proposed additive persistence

1. Add `CalculationPolicy` and `CalculationPolicyVersion` to `DispatchPlanningRuns`, defaulting existing rows to `ConfiguredSettings` / `dispatch-planning-v1`.
2. Add nullable `ThirtyDaySalesImportBatchId` FK to the run. It is mandatory only for `ExcelParity` runs.
3. Add `DispatchRunCalculationInputSnapshots`, uniquely keyed by `(PlanningRunId, ItemId, WarehouseId, ChannelItemMappingId)`. Persist at calculation time before saving recommendations:

   - selected policy/version;
   - weekly-sales batch ID, window, and warehouse/SKU weekly sales;
   - 30-day-sales batch ID, window, and applied SKU 30-day total;
   - applied warehouse weekly total and network weekly total;
   - effective units per box, setting/profile IDs, current sellable stock, eligible inbound, and inbound policy version;
   - source references/correlation IDs and captured timestamp.

4. For `ConfiguredSettings`, persist the existing calculation inputs in the same table where feasible, or leave existing run/result snapshots unchanged and add only policy metadata. Do not rewrite historic recommendation results.

The separate input snapshot is preferred over recalculating from current import rows/settings: profiles and settings are effective-dated and source batches may later be superseded. It makes calculation explanations, production comparison, audit, and rollback reproducible.

### Migration compatibility and risks

- Use an additive, rerunnable migration with nullable new columns and defaults. Existing run creation remains valid.
- Backfill existing rows as policy 1 only; do not infer parity input values for historic runs.
- Add check constraints: policy value, required 30-day batch for parity, matching channel, committed batch state, valid period ordering, and unique snapshot identity.
- Extend `usp_DispatchPlanning_Run_CalculationInputs` with a policy branch or create a separate policy-input procedure. Keep the current projection unchanged for policy 1 to reduce regression risk.
- Extend save procedures/results JSON only after both policy paths expose a compatible persisted recommendation shape. Policy-specific raw inputs belong in the input-snapshot table, not overloaded API fields.

## Service/repository/API design impact

| Layer | Proposed responsibility | Affected current area |
|---|---|---|
| Contracts/validation | Optional policy and 30-day batch request fields; parity-specific validation only when selected | `DispatchPlanningDtos.cs`, `DispatchPlanningValidators.cs` |
| Domain/application | Policy enum/resolver; convert policy-specific repository rows into either existing configured input or parity input; audit applied policy/version | `DispatchPlanningModels.cs`, `DispatchPlanningService.cs`, new resolver interface |
| Repository | Read policy/input rows and persist immutable input snapshots transactionally with results | `IDispatchPlanningRepository.cs`, `DispatchPlanningRepository.cs` |
| SQL | Run columns, input snapshot table, create-run/calculation-input/save-calculation procedures, checks/indexes | new additive migration after approval |
| API/frontend | Add policy/30-day batch selection only after approved; default request behavior unchanged; display applied version and snapshots read-only | run DTO/controller and Dispatch run create/detail UI |

## Allocation design

The parity strategy changes recommendation calculation, not allocation. Keep `DispatchAllocationService` and its priority order unchanged for both policies. The allocator should consume persisted final recommendations and existing company-stock snapshots exactly as today.

Manual proportional allocation is a separate workflow, not an option inside the priority allocator. It requires independent approval of the entered-total authority, eligible requests, box-rounding/remainder policy, audit data, permission, and a dedicated request/endpoint/UI. Until then, mark the workbook W-column behavior as intentionally unsupported.

## Representative comparison batch

After approvals, use an isolated database and a signed-off batch containing at least one SKU per tier across two or more warehouses. Freeze the two sales batches, stock batch, inbound batch, effective setting/profile rows, and company stock. Calculate both policies in separate runs with identical stock/inbound sources. Compare input snapshot values and every intermediate/result field:

`tier → factors → weekly sales/share → 30-day sales → recurring → safety → reorder → total stock → shortage → eligibility → recommendation → allocation`

Require exact equality for identity fields and six-decimal values under the approved tolerance; explain intentional inbound/sellable/allocation differences. Business sign-off must approve the comparison before any policy-default change.

## Proposed implementation sequence

1. Obtain the decisions below and define test fixtures/period contracts.
2. Create additive migration and SQL contract tests; leave policy 1 default.
3. Add contract/validator/repository policy support and immutable input snapshots.
4. Add resolver and parity-run service branch; reject incomplete parity inputs.
5. Add isolated database/API lifecycle tests and comparison-run tests.
6. Pilot parity runs behind explicit permission/feature control; no default switch.
7. Review signed-off batch, rollout/rollback plan, and monitoring; only then consider enabling policy 2 for selected runs.

## Business-owner decisions required before implementation

1. What exact period defines weekly sales and 30-day sales, and which committed batches provide each?
2. Is 30-day sales aggregated by item, mapping, channel, or another identity?
3. Is the safety-share denominator all channel warehouses/SKUs, or a defined subset?
4. Does Excel parity replace configured tiers/factors/rounding for a run, and who may select it?
5. Do inbound eligibility statuses 2/3 and sellable-stock semantics remain in force for parity?
6. Is manual W-column proportional allocation required? If yes, approve its independent workflow rules.
