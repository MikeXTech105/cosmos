# Supply Chain Workbook Mapping

## Evidence and scope

The supplied workspace contains `PROCUREMENT_PLANNING_WORKBOOK_MIGRATION_REPORT.xlsx`, generated from `Copy of PROCURMENT SCHEDULING.xlsx` on 2026-07-15. The original Procurement workbook and the requested `Copy of NEW DISPATCH SCHEDULING(1).xlsx` and `Copy of WORK LIST.xlsx` files are not available in the workspace or attachment store. This report therefore separates inspected facts from future-workbook assumptions. No Item, Channel SKU, or Warehouse was created from workbook text.

| Workbook | Availability | Sheets / evidence | Outcome |
| --- | --- | --- | --- |
| Procurement Scheduling | Indirectly inspected through the existing migration report | `30 DAYSALE`, `STOCK`, `ADU`, `LEAD TIME`, `OUTPUT`; report tabs include Migration Report, Channel SKU Mapping, BOM Extraction, Compatibility, Assumptions | Existing Procurement module is aligned and its findings are retained. |
| Dispatch Scheduling | Not supplied | No sheets, formulas, or rows available | Shared Channel, Warehouse, Channel Item Mapping, and Packaging foundations are ready; do not seed warehouse records. |
| Work List | Not supplied | No sheets, formulas, or rows available | Shared Channel, Warehouse, Channel Item Mapping, and Packaging foundations are ready; do not seed shipment or transporter data. |

## Procurement workbook findings

The existing report establishes these facts:

- Finished-product values are names, not channel SKUs. The `Channel SKU Mapping` staging tab deliberately leaves SKU values blank and blocks import until an explicit mapping to an existing Item is approved.
- All staged product and component names were unmatched in the then-staging ERP. The report explicitly prohibits automatic Item creation.
- The source's `ADU`/`OUTPUT` helper formulas often read a helper stock column rather than physical current stock. The prior implementation used `Items.CurrentStock` deliberately; this release preserves that behavior and now adds an explicit valid inbound snapshot to projected availability.
- Spring and rivet dependencies were flattened into configurable BOM coefficients (15% and 5% of rainbow material). Product-to-product BOM assumptions are not inferred at import time.
- Materials with incomplete configuration remain manual-planning candidates and generate warnings rather than a fabricated recommendation.

The known report sources include product/channel quantities in `30 DAYSALE`, physical stock in `STOCK`, materials/ADU in `ADU`, lead-time values in `LEAD TIME`, and recommendations in `OUTPUT`. Formula defects recorded by the report include helper-stock references, shifted/duplicated output rows, and no channel-SKU identity. No `#REF!` cell was independently observable because the original workbook was not provided.

## Common mapping matrix

| Workbook / area | Excel field | COSMOS target | Reused / new | Transformation and validation |
| --- | --- | --- | --- | --- |
| Procurement / 30 DAYSALE | Channel | `SalesChannels` exposed as the shared Channel master | Reused | Uppercase known code (`AMZ`, `BLI`, `INS`); unknown/inactive channels are validation errors. |
| Procurement / 30 DAYSALE | Channel SKU / MSKU | `ChannelSkuMappings` exposed as Channel Item Mappings | Reused and extended | Exact active `(ChannelId, ChannelSku)` match only. Product names never create or guess Items. |
| Procurement / 30 DAYSALE | Product name | Existing `Items` only after explicit mapping | Reused | Source name is display/context, not a primary identity. |
| Procurement / ADU / OUTPUT | Sales quantity | `ProcurementSalesHistory.Quantity` | Reused | Positive decimal required; staged rows show errors before commit. |
| Procurement / STOCK | Current stock | `Items.CurrentStock` | Reused | Global on-hand stays authoritative until a location-aware company-stock design is approved. |
| Procurement / inbound | Inbound quantity | `ProcurementInboundStockSnapshots.InboundQuantity` | New | Latest valid snapshot at or before planning end date is added to projected availability. |
| Procurement / LEAD TIME | Lead time | `ProcurementSettings` / `ProcurementLeadTimeHistory` | Reused | Override, receipt-history average, then configured value. |
| Procurement / OUTPUT | Safety factor, MOQ, order multiple | `ProcurementSettings` | Reused | Existing validated settings; no constants are silently inferred. |
| Dispatch / warehouse | Warehouse code/name | `ChannelWarehouses` | New | Record-based Channel FK, unique per Channel. No codes are seeded pending source review. |
| Dispatch / per-box | Units per box | `ItemPackagingProfiles.UnitsPerBox` | New | Positive quantity; effective dates support historical use. |
| Work List / dimensions | Length, width, height, units | `ItemPackagingProfiles` | New | Explicit CM/MM and computed volumetric weight. |
| Work List / weights | Gross/net weight, units | `ItemPackagingProfiles` | New | Explicit KG/G; net cannot exceed gross. |
| All imports | File, row errors, audit | `SupplyChainImportBatches` and `SupplyChainImportRows` | New | File hash, preview/staging, error rows, transactional commit, correlation ID. |

## Calculation alignment and discrepancy

The retained workbook-compatible calculation is versioned `workbook-compatible-v2-inbound`:

```text
Projected Available Stock = Items.CurrentStock + latest valid inbound snapshot
Lead-Time Demand          = Average Daily Usage × Lead Time Days
Safety Stock              = Material Requirement × Safety Factor
Reorder Point             = Lead-Time Demand + Safety Stock
Raw Requirement           = MAX(0, Reorder Point − Projected Available Stock)
Final Requirement         = MOQ / order-multiple rule
```

The legacy strict comparison remains intentional: projected stock equal to the reorder point uses the non-zero MOQ branch. This differs from some helper-stock workbook cells; those discrepancies were documented in the available compatibility report and are not overwritten by label-based assumptions.

## Client confirmations required

1. Provide the original Dispatch Scheduling and Work List workbooks, including all sheets and formulas, before any warehouse, packaging, shipment, or freight data migration.
2. Confirm warehouse codes/names and resolve possible code collisions: `AMD2`, `BLR7`, `BLR8`, `BOM5`, `BOM7`, `DEL4`, `DEL5`, `HYD8`, `MAA4`, `SIDA`, and `IDX2`. `SIDA` versus `IDX2` must be resolved explicitly.
3. Provide actual channel SKUs/external IDs for every marketplace listing. Product names alone remain blocked from matching.
4. Confirm whether names such as colour/size/box variants are distinct Items or packaging variants.
5. Confirm per-box values if Dispatch and Work List disagree, including effective-date rules.
6. Confirm whether weights are KG or G, dimensions are CM or MM, and the volumetric divisor by transporter/channel.
7. Define the business meaning of dispatch Tier 1/2/3 fields before planning is implemented.
8. Confirm whether inbound includes already-dispatched-but-unreceived stock and which snapshot date controls it.
9. Confirm whether `Items.CurrentStock` is genuinely global company stock or needs a future location-specific inventory foundation.

## Reuse decisions

- `Items`, Categories, Units, `StockMovements`, audit logging, JWT/SQL permissions, API response envelopes, Dapper procedures, pagination, and the Procurement CSV/XLSX parser are reused.
- `SalesChannels` is the shared Channel table and `ChannelSkuMappings` is the shared Channel Item Mapping table; neither duplicate conceptual table is created.
- `ChannelWarehouses`, `ItemPackagingProfiles`, staged shared import batches/rows, and inbound snapshots are new because the repository had no generic equivalents.
- Dispatch, shipment execution, freight, Rojmel, and frontend screens remain outside this change.
