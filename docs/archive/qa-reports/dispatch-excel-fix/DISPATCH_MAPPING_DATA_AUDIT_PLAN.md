# Dispatch Mapping-Identity Data Audit and Non-Destructive Remediation Plan

**Status:** proposed audit plan; execute only after data-owner approval and in the approved environment.  
**Safety rule:** do not merge, delete, overwrite, or reassign existing source records. This document proposes read-only discovery and future additive correction paths only.

## Problem statement

Dispatch calculations now group source sales, stock, and inbound by `(WarehouseId, ItemId, ChannelItemMappingId)` in `backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql:42-64`. However, several older source identities do not include the mapping:

| Source | Current identity/evidence | Why it is unsafe for mapping-level parity |
|---|---|---|
| Sales snapshots | Unique `(ImportBatchId, WarehouseId, ItemId, PeriodFrom, PeriodTo)` at `backend/database/migrations/20260728_dispatch_planning_module.sql:86-109` | Two channel SKUs for the same item/warehouse/window cannot be separately represented. |
| Stock snapshots | Unique `(ImportBatchId, WarehouseId, ItemId, SnapshotDate)` at `20260728_dispatch_planning_module.sql:115-137` | Mapping-specific stock records can conflict or be collapsed. |
| Inbound snapshots | Reference uniqueness `(ImportBatchId, WarehouseId, ItemId, ReferenceNumber)` at `20260728_dispatch_planning_module.sql:303-304` | The same reference associated with distinct mappings cannot be safely distinguished. |

The result-table identity was repaired to include mapping (`20261008_dispatch_planning_sku_snapshot_integrity.sql:29-32`), but upstream source identity still needs evidence-based remediation before policy 2 relies on it.

## Audit objectives

1. Quantify source rows where one item/warehouse/time identity has multiple mappings.
2. Identify rows that current constraints could have prevented, collapsed, or made impossible to import.
3. Detect invalid mapping/channel/item relationships, missing mappings, and inactive mappings.
4. Identify existing Dispatch runs/results affected by ambiguous source attribution without changing them.
5. Produce a signed data-owner decision log and exception inventory before any constraint migration.

## Phase 0 — Controls and scope approval

- Obtain written approval for database/environment, date range, channels, and read-only query account.
- Run against a restored copy or reporting replica first; never use a production write account.
- Record query version/hash, execution timestamp/timezone, database snapshot/backup reference, row counts, and operator.
- Treat all output as an audit artifact. Do not use it to alter historical Dispatch runs.

## Phase 1 — Read-only discovery queries

The technical owner should tailor names only if deployed schema differs. Each query is **SELECT-only**.

### 1. Sales: multiple mappings for one historical identity

```sql
SELECT
    s.ImportBatchId, s.WarehouseId, s.ItemId, s.PeriodFrom, s.PeriodTo,
    COUNT(DISTINCT s.ChannelItemMappingId) AS MappingCount,
    COUNT(*) AS RowCount,
    STRING_AGG(CONVERT(varchar(20), s.ChannelItemMappingId), ',') AS MappingIds
FROM dbo.DispatchWarehouseSalesSnapshots AS s
GROUP BY s.ImportBatchId, s.WarehouseId, s.ItemId, s.PeriodFrom, s.PeriodTo
HAVING COUNT(DISTINCT s.ChannelItemMappingId) > 1;
```

### 2. Stock: multiple mappings for one historical identity

```sql
SELECT
    s.ImportBatchId, s.WarehouseId, s.ItemId, s.SnapshotDate,
    COUNT(DISTINCT s.ChannelItemMappingId) AS MappingCount,
    COUNT(*) AS RowCount,
    STRING_AGG(CONVERT(varchar(20), s.ChannelItemMappingId), ',') AS MappingIds
FROM dbo.DispatchWarehouseStockSnapshots AS s
GROUP BY s.ImportBatchId, s.WarehouseId, s.ItemId, s.SnapshotDate
HAVING COUNT(DISTINCT s.ChannelItemMappingId) > 1;
```

### 3. Inbound: same reference across mappings

```sql
SELECT
    s.ImportBatchId, s.WarehouseId, s.ItemId, s.ReferenceNumber,
    COUNT(DISTINCT s.ChannelItemMappingId) AS MappingCount,
    COUNT(*) AS RowCount,
    STRING_AGG(CONVERT(varchar(20), s.ChannelItemMappingId), ',') AS MappingIds
FROM dbo.DispatchWarehouseInboundSnapshots AS s
WHERE s.ReferenceNumber IS NOT NULL
GROUP BY s.ImportBatchId, s.WarehouseId, s.ItemId, s.ReferenceNumber
HAVING COUNT(DISTINCT s.ChannelItemMappingId) > 1;
```

### 4. Referential/channel consistency

```sql
SELECT s.ImportBatchId, s.WarehouseId, s.ItemId, s.ChannelItemMappingId
FROM dbo.DispatchWarehouseSalesSnapshots AS s
LEFT JOIN dbo.ChannelSkuMappings AS m ON m.Id = s.ChannelItemMappingId
LEFT JOIN dbo.ChannelWarehouses AS w ON w.Id = s.WarehouseId
WHERE m.Id IS NULL
   OR m.ItemId <> s.ItemId
   OR w.Id IS NULL
   OR w.ChannelId <> m.SalesChannelId
   OR m.IsDeleted = 1 OR m.IsActive = 0;
```

Run the analogous channel/item mapping check for stock and inbound sources. Also inventory null mappings, invalid periods, and duplicate rows at the intended **new** identity including mapping.

## Phase 2 — Classification and impact assessment

Classify every audit result without modifying it:

| Class | Meaning | Required action |
|---|---|---|
| A — Clean | Exactly one valid mapping for the source identity. | Eligible for future policy-2 source validation. |
| B — Multiple legitimate mappings | Distinct active SKU mappings are expected. | Preserve every source row; require mapping-aware uniqueness/index design. |
| C — Ambiguous attribution | Mapping is missing, invalid, inactive, or inconsistent with item/channel. | Block policy-2 use of affected batch/identity pending source-owner correction. |
| D — Duplicate/correction candidate | Same mapping has conflicting duplicates or overlapping periods. | Apply approved correction policy; do not sum/merge by assumption. |
| E — Historical run impact | An existing run/result references potentially ambiguous source identity. | Tag/report only; do not recalculate or alter history. |

For each finding, produce an exception record with source table, immutable source key/row IDs, batch, channel, item, warehouse, mappings, period/reference, quantities, class, proposed owner, and decision status.

## Phase 3 — Non-destructive remediation options

### Option A — Source-system correction followed by a new committed import (recommended)

The source owner corrects the mapping in its authoritative system. A new import batch carries corrected mapping-level rows and links to source/correction reference. The old committed batch remains immutable and available for audit. New policy-2 runs select only the corrected committed batch.

### Option B — Approved additive adjustment/correction record

If the source system cannot correct historical records, define an additive correction record with explicit original-row reference, reason, approved mapping, author, timestamp, and approval. The calculation source policy must say whether the correction supersedes or offsets the original; never silently update the original row.

### Option C — Exclude affected identities from policy 2

Keep production policy 1 intact and reject parity-run calculation only for affected mapping identities/batches until corrected data exists. This is safer than guessing attribution.

### Explicitly prohibited actions

- `DELETE`, `UPDATE`, or merge of source snapshots to manufacture a single mapping.
- Assigning a mapping based only on quantity, SKU text similarity, or a latest-row heuristic.
- Recalculating/finalizing historical runs to make them conform to the new identity.
- Dropping an existing uniqueness constraint before duplicate/conflict evidence is classified and an approved replacement migration is ready.

## Future migration prerequisites (not proposed for execution here)

Before an additive migration changes constraints/indexes:

1. Audit shows zero unclassified conflicts, or a documented exclusion/correction path exists for each.
2. New source identity includes `ChannelItemMappingId` where source semantics are mapping-specific.
3. New indexes support both input retrieval and duplicate prevention at the approved identity.
4. Existing data remains queryable; historical run/result records remain unchanged.
5. A dry-run migration is tested on a restored production-like database and includes rollback validation.
6. Integration tests prove same item + warehouse + distinct mappings remain distinct through import, inputs, recommendation, allocation, and retrieval.

## Acceptance evidence

The data owner should receive:

- counts by source/batch/channel/class;
- full exception inventory with immutable record references;
- examples of each ambiguous pattern, with no altered data;
- recommended remediation owner/date per exception;
- proposed mapping-aware identity/index design for technical review;
- proof that no audit query changed data.

No policy-2 batch is eligible until its affected source identities are Class A or approved Class B with mapping-aware persistence.
