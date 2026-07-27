# Supply Chain Frontend Implementation Guide

## Scope

This guide describes the frontend work required to consume the implemented Supply Chain Common Foundation and the aligned Procurement Planning backend.

No frontend screens were added in this backend-focused release. The existing frontend should not expose any action until the authenticated user's SQL-backed page/action permissions allow it.

## API and security conventions

- Base URL: `/api/v1`
- Authentication: Bearer JWT through the existing Axios interceptor.
- API response: standard `ApiResponse<T>` envelope.
- Pagination: `PageNumber`, `PageSize`; maximum page size is 200.
- Authorization is enforced by the API. Frontend guards are usability controls only.
- Use the existing `usePermission` and `PermissionGuard` patterns. Do not hard-code role names or IDs.

## Pages and permissions

Add the following permission-driven navigation items below the existing Supply Chain parent page only when `View` is granted.

| Page | Route suggestion | Page permission | Actions to expose |
| --- | --- | --- | --- |
| Channels | `/supply-chain/channels` | `SupplyChain.Channels` | View, Create, Edit, Delete |
| Channel Warehouses | `/supply-chain/warehouses` | `SupplyChain.Warehouses` | View, Create, Edit, Delete, Export |
| Channel Item Mappings | `/supply-chain/item-mappings` | `SupplyChain.ItemMappings` | View, Create, Edit, Delete, Export |
| Packaging Profiles | `/supply-chain/packaging-profiles` | `SupplyChain.PackagingProfiles` | View, Create, Edit, Delete, Export |
| Supply Chain Imports | `/supply-chain/imports` | `SupplyChain.Imports` | View, Create, Approve, Delete, Export |

Keep the existing Procurement routes/pages unchanged. They remain the compatibility surface for sales history, BOMs, settings, planning runs, and recommendations.

## Suggested API client module

Create `frontend/src/services/supplyChain/supplyChainService.js` using the established Axios wrapper. Keep request code grouped by resource:

```text
GET/POST/PUT/DELETE /supply-chain/channels
PATCH               /supply-chain/channels/{id}/status

GET/POST/PUT/DELETE /supply-chain/warehouses
PATCH               /supply-chain/warehouses/{id}/status
GET                 /supply-chain/warehouses/dropdown

GET/POST/PUT/DELETE /supply-chain/item-mappings
PATCH               /supply-chain/item-mappings/{id}/status
GET                 /supply-chain/item-mappings/unmatched

GET/POST/PUT/DELETE /supply-chain/packaging-profiles
PATCH               /supply-chain/packaging-profiles/{id}/set-default

POST                /supply-chain/imports/validate
GET                 /supply-chain/imports
GET                 /supply-chain/imports/{id}
GET                 /supply-chain/imports/{id}/errors
GET                 /supply-chain/imports/{id}/error-export
POST                /supply-chain/imports/{id}/commit
POST                /supply-chain/imports/{id}/cancel
```

Use `FormData` for import validation:

```js
const form = new FormData();
form.append('file', file);
form.append('importType', 'ProcurementSales');
if (channelId) form.append('channelId', String(channelId));
```

Do not set a manual multipart boundary; the HTTP client must set it.

## Screen behavior

### Channels

Show code, name, description, sort order, and active status. Normalize code to uppercase in the form but still display server-side validation errors. Disable Delete if the API returns an in-use conflict; do not attempt to calculate references in the browser.

### Channel Warehouses

Use the Channel dropdown backed by `/supply-chain/channels?isActive=true`. A warehouse code is unique only within its channel, so the UI must allow the same code under different channels. Do not preload or create warehouse codes from spreadsheets; client-confirmed records only.

Filters: search, channel, active status, city, state, paging, sort.

### Channel Item Mappings

Use the existing Item dropdown/search API as the authoritative Item source. Required fields are Channel, Item, and Channel SKU. Product name and external Item ID are descriptive fields only.

The form should expose:

- `IsPrimary`: one active primary mapping is allowed per Item + Channel.
- `EffectiveFrom` / `EffectiveTo`: reject an end date before the start date locally and show API conflicts.
- `IsActive`: status changes are independent of soft deletion.

Provide an **Unmatched SKUs** tab backed by `/item-mappings/unmatched`. It should guide the user to create an explicit mapping; never offer “create Item from row” or product-name auto-match.

### Packaging Profiles

Require Item, packaging code, units per box, dimension unit, and weight unit. Supported units are:

- Dimensions: `CM`, `MM`
- Weight: `KG`, `G`

Display calculated volumetric weight returned by the API as read-only. Do not calculate a second divergent browser value. When setting a default profile, call `/set-default` and refresh all profiles for the affected Item/Channel scope.

### Supply Chain Imports

Implement this as a staged wizard, never a one-click upload.

1. Select `ProcurementSales` and a `.csv` or `.xlsx` file up to 10 MB.
2. Call `/imports/validate`; show batch totals, warnings, unmatched Items, unmatched Channels, duplicates, and row-level errors.
3. Disable Commit when `CanCommit` is false. Unmatched SKU rows are visible and may be committed to the compatible Procurement history, but the Procurement calculation will block until mappings are resolved.
4. If the same file hash was previously committed, require a user-entered correction reason and send `AllowDuplicate=true` only after an explicit confirmation dialog.
5. Commit requires `SupplyChain.Imports.Approve`; otherwise hide/disable it.
6. Offer error CSV download from `/error-export` for users with Export permission.
7. Allow Cancel only for uncommitted batches. For committed Procurement imports, use the existing Procurement import-batch cancellation flow.

The backend currently enables `ProcurementSales` operationally. Show other future import types as unavailable, not as selectable broken options.

## Procurement Planning changes to surface

Existing Procurement screens need only additive presentation changes:

- Retain current Channel and SKU-mapping screens/routes until a deliberate frontend migration is scheduled.
- Add a visible link to the shared Channel and Item Mapping pages so masters are maintained in one place.
- On planning results and export, show `InboundStock` and `ProjectedAvailableStock` beside physical stock.
- Explain that the calculation uses global `Items.CurrentStock` plus the latest valid inbound snapshot; it is not warehouse-level stock allocation.
- Show the new planning cancellation action only with `ProcurementPlanning.PlanningHistory.Delete`, require a reason, and refresh the run after cancellation.
- Do not offer conversion of a recommendation into a Purchase Order, Bill, stock adjustment, ledger entry, or accounting entry.

## Loading, errors, and audit context

- Preserve the response `CorrelationId` in client error logs/support links when present.
- Display field-level validation errors against their owning controls; display HTTP 409 as a conflict with a refresh/retry action where appropriate.
- Do not display server paths, tokens, raw upload content, or full request bodies in notifications.
- Refresh paginated grids after mutations rather than optimistic updates for default-profile, status, commit, and cancellation actions.

## Deferred frontend work

Do not build Dispatch Planning calculations, shipment execution, docket tracking, freight, returns, marketplace integrations, automatic Item/Warehouse creation, or Purchase Order creation in this phase. Those later screens will reuse the shared master and import routes above.
