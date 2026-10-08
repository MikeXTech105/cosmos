# Dispatch Planning Frontend Changes — 2026-10-08

## Why this change exists

The Dispatch Planning database repair preserves different channel SKUs that map to the same internal Cosmos Item at the same warehouse. The API route and JSON schema did not change, but a frontend that treats `(itemId, warehouseId)` as unique can still hide or overwrite valid rows.

## Required frontend changes

1. Use `DispatchRecommendationDto.id` as the recommendation row key everywhere (tables, edits, optimistic state, and override targets).
2. Display `channelSku` next to the internal `itemCode` in the planning matrix, review screen, allocation screen, report detail, and exports created in the client.
3. Do not deduplicate, group, sum, or cache recommendations only by `itemId + warehouseId`. Include `channelItemMappingId`, or prefer the immutable result `id`.
4. Send the exact source channel SKU in sales, stock, and inbound import rows. Do not combine source rows merely because they resolve to the same internal Item.
5. Keep allocation presentation grouped by internal Item only when showing the shared **company stock pool**. The allocation API itself remains server-calculated; display `allocatedQuantity` per recommendation row.

## No API request/response change

No endpoint, request DTO, response DTO, permission, or status transition changed. Existing endpoints remain:

* `POST /api/v1/dispatch-planning/runs/{id}/calculate`
* `GET /api/v1/dispatch-planning/runs/{id}/recommendations`
* `PATCH /api/v1/dispatch-planning/runs/{runId}/recommendations/{recommendationId}`
* `POST /api/v1/dispatch-planning/runs/{id}/allocate`

## Acceptance scenario

Given a single warehouse has `CHANNEL-SKU-A` and `CHANNEL-SKU-B`, both mapped to Item `ITEM-1`, after calculation the API must return two rows with distinct recommendation IDs and mapping IDs. The UI must show both rows, retain separate final/allocated quantities, and target the correct row on override.

## Deployment dependency

Deploy `database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql` before exposing the updated frontend behavior. Run `database/verify_dispatch_planning.sql` after all Dispatch migrations.
