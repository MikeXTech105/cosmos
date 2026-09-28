# COSMOS Manufacturing — Frontend Integration

## Scope

Manufacturing is Item-centred: raw materials, components and finished goods are existing Items. Do not create a separate product catalogue or calculate/update stock in React. All routes require JWT and are in the `manufacturing` Swagger group. Deploy `20260921_manufacturing_module.sql` before enabling this UI.

```text
Items → Manufactured item flag → Manufacturing BOM → Production Draft → Post → Stock update
```

Phase 1 includes BOMs and Draft/Posted/Cancelled productions. It does not include reports, dashboard, separate material issue/return, costing, or OEE linkage.

## Permissions

| Capability | Required page/action |
|---|---|
| List/detail BOM | `Manufacturing.Boms` / View |
| Create BOM | `Manufacturing.Boms` / Create |
| Update/activate/deactivate BOM | `Manufacturing.Boms` / Edit |
| Delete unused BOM | `Manufacturing.Boms` / Delete |
| List/detail production | `Manufacturing.Productions` / View |
| Create production draft | `Manufacturing.Productions` / Create |
| Edit/post/cancel production | `Manufacturing.Productions` / Edit |

Hide actions without permission. A `403` means the user lacks access.

## Item screen

Item list/detail contracts include `isManufactured`; Item create/update input includes the same Boolean. Show a **Manufactured item** toggle for active, inventory-tracked finished products. It does not replace `itemType`, create a BOM, or create stock. After saving an Item with this flag, link to the BOM list filtered by that Item.

## BOM screen

Base route: `/api/v1/manufacturing/boms`

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | List BOMs |
| POST | `/` | Create BOM |
| GET | `/{id}` | Detail and components |
| PUT | `/{id}` | Update |
| DELETE | `/{id}` | Soft delete unused BOM |
| POST | `/{id}/activate` | Activate/default BOM |
| POST | `/{id}/deactivate` | Deactivate BOM |

List query: `search`, `finishedItemId`, `status`, `pageNumber`, `pageSize`, `sortBy`, `sortDirection`. Status: `1` Draft, `2` Active, `3` Inactive.

```json
{
  "finishedItemId": 101,
  "version": "v1",
  "effectiveFrom": "2026-09-28",
  "effectiveTo": null,
  "notes": "Standard recipe",
  "isDefault": true,
  "components": [{
    "componentItemId": 201,
    "quantity": 0.05,
    "unitId": 2,
    "wastagePercentage": 2.5,
    "notes": null,
    "sortOrder": 1
  }]
}
```

Components must be unique, quantity must be positive, and wastage is `0`–`100`. Display API validation errors beside the affected field.

## Production screen

Base route: `/api/v1/manufacturing/productions`

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | List/history |
| POST | `/` | Create Draft and material snapshot |
| GET | `/{id}` | Header and material snapshot |
| PUT | `/{id}` | Edit Draft only |
| POST | `/{id}/post` | Atomically consume materials and receive output |
| POST | `/{id}/cancel` | Atomically reverse a Posted production |

List query: `search`, `finishedItemId`, `status`, `fromDate`, `toDate`, `pageNumber`, `pageSize`, `sortBy`, `sortDirection`. Status: `1` Draft, `2` Posted, `3` Cancelled.

```json
{
  "productionDate": "2026-09-28",
  "finishedItemId": 101,
  "bomId": 501,
  "plannedQuantity": 100,
  "producedQuantity": 100,
  "notes": "Day shift batch",
  "referenceNumber": "BATCH-20260928-A"
}
```

For the current release, require BOM selection in the UI. Only Draft shows Edit/Post; only Posted shows Cancel. Cancellation body:

```json
{ "reason": "Incorrect production entry" }
```

Production detail materials are authoritative. Show required quantity, wastage quantity and total consumed quantity as read-only after posting.

## Stock and safe UI behaviour

Post is one atomic backend action: components decrease, finished Item increases, and stock movements are recorded. Cancel reverses both effects. If stock is insufficient, no partial changes occur.

Use confirmation dialogs for Post and Cancel. Do not automatically retry a timeout; reload detail first because the server might have completed it.

## Response handling

All responses use `ApiResponse<T>`:

```json
{ "succeeded": true, "message": "Manufacturing production posted.", "data": {}, "errors": [], "correlationId": "..." }
```

On validation failures, `errors` can be a field/message map. On conflict, retain entered values, show the safe `message`, and retain `correlationId` for support. Relevant messages/codes include `MANUFACTURING_INSUFFICIENT_STOCK`, `MANUFACTURING_PRODUCTION_NOT_EDITABLE`, `MANUFACTURING_PRODUCTION_ALREADY_CANCELLED`, and `MANUFACTURING_BOM_INVALID`.

Use the deployed Swagger document as the final authority for response schema and field casing.
