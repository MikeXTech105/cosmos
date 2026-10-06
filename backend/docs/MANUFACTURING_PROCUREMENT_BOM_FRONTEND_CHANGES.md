# Frontend Changes: Manufacturing BOM as Procurement Source

## Required client migration

Procurement no longer owns a separate editable BOM. Remove or disable the Procurement BOM Mapping save action (`PUT /api/v1/procurement-planning/boms/products/{productId}`), and direct users with `Manufacturing.Boms/Edit` permission to Manufacturing BOM maintenance. Do not retry a 409 from the legacy endpoint.

The existing Procurement BOM read can remain temporarily for display-only compatibility, but new screens should use Manufacturing endpoints directly.

## Manufacturing list contract

For each `GET /api/v1/manufacturing/boms` row, render fields directly from the API:

```ts
type ManufacturingBomListItem = {
  id: number;
  bomNumber: string;
  finishedItemId: number;
  finishedItemCode: string;
  finishedItemName: string;
  version: string;
  status: 1 | 2 | 3;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  isActive: boolean;
  componentCount: number;
};
```

- Display **Default** only when `isDefault === true`; never use array position, `status`, or a missing property fallback.
- Display **Active** only when `status === 2` / `isActive === true` as provided by the API.
- Display raw-material/component count from `componentCount`. Do not display `components.length` for list rows because list rows do not contain detail components.
- Refresh/invalidate the list after create, update, activate, or deactivate. Do not retain a stale selected default BOM.

## Detail and applicable BOM use

Use `GET /api/v1/manufacturing/boms/{id}` for a selected BOM’s editable/detail view. Its `components` are authoritative.

Use this endpoint whenever a client needs the BOM that governs a date:

```http
GET /api/v1/manufacturing/boms/applicable?finishedItemId=12&asOfDate=2026-10-06
```

Never select the first list item or sort by `id` to determine a default/current BOM. Handle 404 as “no active effective Manufacturing BOM,” not as an empty component list.

## Procurement UX

- The Procurement issues screen must show `MISSING_BOM`, `BOM_HAS_NO_COMPONENTS`, and `INACTIVE_COMPONENT` as distinct remediation states.
- For `MISSING_BOM`, link to create/activate an effective Manufacturing BOM.
- For `BOM_HAS_NO_COMPONENTS`, link to that BOM’s detail/edit screen; do not show “no active BOM.”
- Keep SKU mapping, Item identity, stock, lead-time, safety factor, MOQ, and order-multiple flows unchanged.

## Required frontend tests

1. `isDefault: false` does not render Default.
2. `isDefault: true` renders Default.
3. A list row displays `componentCount`, including zero.
4. An applicable-BOM response renders its actual component rows.
5. A 404 applicable-BOM response shows the missing-effective-BOM state.
6. The legacy Procurement BOM save action is unavailable and a returned 409 is shown as a migration message.
