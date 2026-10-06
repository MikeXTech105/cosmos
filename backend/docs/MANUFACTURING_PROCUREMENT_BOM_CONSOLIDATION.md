# Manufacturing BOM / Procurement Consolidation

## Decision

From migration `20261006_unify_procurement_with_manufacturing_boms.sql`, the versioned Manufacturing BOM is the authoritative source for Procurement Planning. `ProductBomComponents` is retained unchanged as historical/legacy data; it is no longer read by Procurement planning calculation, issue detection, settings coverage, or the Procurement BOM read endpoint.

No Item, product, SKU, BOM, or inventory master is duplicated. No existing BOM data is deleted or changed by the migration.

## Canonical applicability rule

`dbo.ufn_ManufacturingBom_Applicable(@AsOfDate)` selects one BOM per finished Item:

1. The BOM must be non-deleted, `Status = 2 (Active)`, and `IsActive = 1`.
2. `EffectiveFrom <= @AsOfDate` and `EffectiveTo` is null or `>= @AsOfDate`.
3. An eligible default BOM wins.
4. Otherwise, the eligible BOM with the latest `EffectiveFrom`, then highest Version, wins.

Database identity is never used as the selection rule. The same resolver is used by the Manufacturing applicable-BOM endpoint and Procurement SQL procedures. Procurement plan calculation uses its request `toDate` as the deterministic as-of date; interactive BOM reads and issue detection use the current UTC date.

## API contract

`GET /api/v1/manufacturing/boms` now includes `effectiveTo`, `isActive`, and `componentCount` for every list row. `componentCount` is the count of non-deleted component rows—not a frontend estimate.

`GET /api/v1/manufacturing/boms/applicable?finishedItemId={id}&asOfDate=yyyy-MM-dd` returns the resolved BOM header and components. It requires the existing `Manufacturing.Boms` View permission and preserves the standard `ApiResponse<T>` envelope. It returns 404 only when no active effective Manufacturing BOM exists.

Existing `GET /api/v1/manufacturing/boms/{id}` remains the detail endpoint.

The Procurement `GET /boms/products/{productId}` endpoint is retained for compatibility but now projects the applicable Manufacturing BOM components. `PUT /boms/products/{productId}` returns a 409 directing callers to Manufacturing BOM maintenance; it must not be used to create legacy planning-only BOMs.

## Error semantics

- `MISSING_BOM`: no active effective Manufacturing BOM exists.
- `BOM_HAS_NO_COMPONENTS`: an applicable Manufacturing BOM exists but has no non-deleted component rows.
- `INACTIVE_COMPONENT`: the applicable Manufacturing BOM contains an inactive/deleted component Item.

This prevents an empty or invalid BOM from being misreported as missing.

## Server deployment

1. Back up the target database according to normal operations policy.
2. Deploy the backend build containing this change.
3. Run [20261006_unify_procurement_with_manufacturing_boms.sql](../database/migrations/20261006_unify_procurement_with_manufacturing_boms.sql).
4. Run [verify_manufacturing_procurement_bom_consolidation.sql](../database/verify_manufacturing_procurement_bom_consolidation.sql) read-only. Set `@FinishedItemId` only for the target verification; it does not write data.
5. Verify Swagger documents and perform the API checks below.

For the current expected sample, use `@FinishedItemId = 12` and an as-of date of `2026-10-06`. The resolver must select MB-000006/version 2; list data must keep MB-000004/version 1 non-default.

## Required runtime checks

- `GET /swagger/manufacturing/swagger.json` includes `GET /api/v1/manufacturing/boms/applicable`.
- The Manufacturing BOM list reports correct `isDefault`, effective dates, activity, and component counts.
- Manufacturing detail and applicable endpoints return the same components for the selected BOM.
- Procurement BOM issues no longer returns `MISSING_BOM` for a sold finished item with a valid applicable Manufacturing BOM.
- Procurement plan preview resolves the same applicable BOM using its request `toDate`.
