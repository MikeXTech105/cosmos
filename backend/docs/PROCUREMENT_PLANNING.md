# Procurement Planning

Procurement Planning calculates auditable recommendations; it never creates a Purchase Order, Purchase Bill, supplier balance mutation, stock movement, or accounting entry.

## Shared foundation integration

- Channels use the shared `SalesChannels` master, exposed by `/api/v1/supply-chain/channels`; legacy `/api/v1/procurement-planning/channels` routes remain compatible.
- Channel SKU mappings use the shared `ChannelSkuMappings` master, exposed by `/api/v1/supply-chain/item-mappings`; legacy Procurement routes remain compatible.
- `Items` remains the authoritative Item master. Imports never create Items or infer an Item from product names.
- Shared imports stage rows in `SupplyChainImportBatches`/`SupplyChainImportRows`. `ProcurementSales` is operational in this release; it writes the existing Procurement import batch/history records transactionally when committed.
- Inbound availability is represented by `ProcurementInboundStockSnapshots`; the latest valid snapshot at or before the planning end date contributes to projected availability.

## Imports

The shared validation endpoint accepts a CSV or XLSX sales file with `SalesDate`, `ChannelCode`, `ChannelSku`, optional `ChannelProductName`, and `Quantity`.

1. `POST /api/v1/supply-chain/imports/validate` stages rows without creating sales history.
2. The response shows row/field errors, unmatched SKUs, duplicate logical rows, and a commit decision.
3. A valid row resolves only through an exact active Channel SKU mapping. There is no product-name match and no master-data creation.
4. `POST /api/v1/supply-chain/imports/{id}/commit` creates the compatible Procurement batch/history records in one transaction. A duplicate file hash requires `AllowDuplicate=true` and a correction reason.
5. Existing Procurement preview/confirm endpoints remain available for backward compatibility.

## Calculation

`workbook-compatible-v2-inbound` stores its inputs/output in planning-run snapshots:

```text
Projected Available = current global stock + latest valid inbound snapshot
Lead-time demand   = ADU × effective lead time
Safety stock       = material requirement × safety factor
Reorder point      = lead-time demand + safety stock
Shortage           = MAX(0, reorder point − projected available)
Recommendation     = MOQ / order-multiple rule
```

Lead-time precedence is override, receipt-history average, then configured value. Stock exactly equal to the reorder point follows the existing workbook-compatible MOQ branch. Overrides require a reason and finalized runs cannot be edited. `POST /api/v1/procurement-planning/plans/runs/{id}/cancel` records an auditable cancellation reason. The numeric legacy status contract is retained for compatibility; the expanded constraint reserves Calculated and Reviewed workflow states without reinterpreting historic Draft/Finalized data.

## Permissions

Existing Procurement pages are retained (`SalesImport`, `SkuMapping`, `BomMapping`, `Settings`, `GeneratePlan`, `PlanningHistory`). The shared master pages are `SupplyChain.Channels`, `SupplyChain.Warehouses`, `SupplyChain.ItemMappings`, `SupplyChain.PackagingProfiles`, and `SupplyChain.Imports`. Every shared endpoint requires JWT and its page/action permission; System Owner behavior remains governed by the existing dynamic security design.

## Deployment and smoke test

1. Apply existing canonical migrations through `20260721_runtime_api_contract_fixes.sql` in documented order.
2. Apply `20260727_supply_chain_common_foundation.sql`.
3. Apply `20260727_procurement_shared_foundation_alignment.sql`.
4. Run `verify_supply_chain_common_foundation.sql`.
5. Build and test the backend.
6. Start the API and inspect `/swagger/supply-chain/swagger.json` and `/swagger/procurement-planning/swagger.json`.
7. With an authorized user, create a Channel Warehouse, Packaging Profile, and staged ProcurementSales import; verify invalid/unmatched rows cannot commit.

Do not run the destructive reset script as part of normal deployment.
