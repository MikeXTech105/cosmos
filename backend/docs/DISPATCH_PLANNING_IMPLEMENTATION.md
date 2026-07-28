# Dispatch Planning implementation

## Status

Implemented in source on 2026-07-28. Build, unit tests, and disposable SQL Server migration/verification status are recorded in the companion tracker. Role smoke testing and live Swagger verification remain environment-dependent.

## Repository-first decisions

The module reuses the existing `Items` product master, `SalesChannels`, `ChannelWarehouses`, `ChannelSkuMappings`, `ItemPackagingProfiles`, `SupplyChainImportBatches` / `SupplyChainImportRows`, Dapper stored-procedure conventions, API response envelopes, JWT/page-action authorization, and audit middleware/repository. It does not add an Item, channel, warehouse, mapping, packaging, user, permission, or generic import master.

`Items.CurrentStock` is read only. Calculating, allocating, finalizing, and cancelling a Dispatch Planning run do not update `Items`, `StockMovements`, shipment records, purchase orders, freight, or Rojmel records.

## Added operational model

The migration `20260728_dispatch_planning_module.sql` adds:

- `DispatchSkuSettings` – effective-dated global or channel-specific SKU policy.
- `DispatchImportStagedRows` – Dispatch-specific typed fields attached to shared import batches.
- `DispatchWarehouseSalesSnapshots`, `DispatchWarehouseStockSnapshots`, and `DispatchWarehouseInboundSnapshots` – committed immutable snapshot facts.
- `DispatchPlanningRuns` and `DispatchCompanyStockSnapshots` – immutable calculation inputs for a run.
- `DispatchRecommendationResults` and `DispatchAllocations` – calculated/final recommendation and allocation audit rows.

The shared batch remains the owner of import file identity, validation counts, batch status, duplicate-file protection, provenance, and commit history. `DispatchImportStagedRows` is intentionally an extension because the generic staged row has no warehouse, stock, inbound-status, or date-range columns.

## Calculation and allocation rules

For every `PlanningRunId + ItemId + WarehouseId` result:

```text
total warehouse stock = sellable warehouse stock + eligible inbound
recurring demand      = recent warehouse sales × recurring-demand factor
safety stock          = recurring demand × safety-stock factor
reorder point         = recurring demand + safety stock
raw shortage          = max(0, reorder point − total warehouse stock)
pre-rounded quantity  = max(raw shortage, minimum dispatch quantity)
recommendation        = box/loose rounding of pre-rounded quantity
```

Eligible inbound statuses are `Dispatched` and `InTransit`; `Planned`, `Received`, and `Cancelled` do not contribute. Warehouse stock is stored as gross available, reserved, and damaged values; persisted `SellableQuantity` is `max(0, available − reserved − damaged)`.

Packaging selection is explicit setting profile, then active channel default, then active global default. Setting selection is active channel-specific policy, then active global policy, constrained by effective dates. Missing settings or packaging profiles intentionally prevent a complete result from being generated; they must be corrected before calculation.

Rounding modes are `Exact`, `NearestBox`, `RoundUpToBox`, `RoundDownToBox`, `ExactBelowOneBox`, and `HalfBoxThreshold`. `AllowLooseQuantity` bypasses box rounding. Allocation is a pure, testable engine: for each Item it allocates immutable company stock by ascending allocation priority, then Tier 1/2/3, then warehouse priority, and finally stable result id. SQL revalidates that supplied allocations match the Item and cannot exceed either final recommendation or immutable available stock.

Overrides preserve both calculated and final values and always require a reason. Only Calculated runs can be overridden. Allocation moves a run to Allocated; only Allocated runs can be finalized. Finalized runs, recommendations, and allocations are database-immutable.

## Workbook evidence and assumptions

The source workbook named `Copy of NEW DISPATCH SCHEDULING(1).xlsx` was not present in the workspace or attachment directory. The prior Supply Chain work also records that Dispatch and Work List workbooks were unavailable. The available Procurement migration-report workbook was inspected as contextual evidence for explicit channel-SKU mapping, but it is not the Dispatch workbook.

Confirmed from the supplied written brief—not an inspected formula cell—are the worksheet concepts `LAST_WEEK_SALE`, `CURRENT_STOCK`, `INBOUND_STOCK`, `TOTAL_STOCK`, `PER_BOX`, `RECURRING_DEMAND`, `SAFETY_STOCK`, `REORDER POINT`, and `OUTPUT`, plus the stated total-stock and reorder-point formulas.

The following need client confirmation against the original workbook:

- Whether current stock is gross stock or already sellable/net stock.
- Exact recurring-demand and safety-stock factors by SKU/tier.
- Whether Tier changes quantity in addition to its implemented allocation priority.
- The exact rounding boundary for “half box” and expected nearest-box midpoint handling.
- Whether Planned inbound should count in any channel-specific circumstance.
- Any source-specific duplicate keys and whether inbound lines without a reference number are separately identifiable.

## Migration and deployment order

1. Apply base setup and existing migrations.
2. Apply Supply Chain common foundation.
3. Apply Procurement shared-foundation alignment.
4. Apply `20260728_dispatch_planning_module.sql`.
5. Run `backend/database/verify_dispatch_planning.sql`.
6. Deploy the API after the migration, then assign page/action permissions to non-SuperAdmin roles.

## Explicit exclusions

Shipment creation, packing, STO/docket/transporter tracking, appointments, freight payments, returns, Rojmel entries, and external marketplace APIs are not part of this module. Finalization expresses an immutable recommendation only; a later Shipment Operations module will own actual stock movement.
