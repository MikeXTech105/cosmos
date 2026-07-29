# Shipment Operations frontend integration

## Scope and contract

All Shipment Operations endpoints are under `/api/v1/shipment-operations`, require a bearer token, and return the repository-standard `ApiResponse<T>` envelope. The Swagger group is `shipment-operations`.

Use the named enum values exposed by the generated client/schema for all status, source, dispatch-mode, priority, tracking, return, and freight fields. Do not persist numeric enum values in frontend state or worksheets.

## Workspace flow

1. Load the work list with `GET /shipments`; filter by channel, warehouse, status, source, date, or search text.
2. Open one shipment with `GET /shipments/{id}`. It returns the header together with items, packages, dockets, appointments, tracking, delivery attempts, receipts, returns, and freight charges.
3. Create either a manual shipment (`POST /shipments/manual`) or one derived from a finalized Dispatch Planning allocation (`POST /shipments/from-dispatch-planning`). Creation does not change inventory.
4. Use packing suggestions and save package allocations before transitioning through packing states. Package line quantities must reconcile to the planned quantities; multi-item packages must be flagged as mixed.
5. Create a docket, then transition to `Dispatched`. The server enforces the preconditions and applies the only outbound inventory movement.
6. Record appointments, tracking events, delivery attempts, receipts, returns, and freight through their focused routes. Refresh the shipment detail after each write; the server owns totals and status.

## Routes

| Area | Route | Notes |
|---|---|---|
| Work list/detail | `GET /shipments`, `GET /shipments/{id}` | Paginated list; detail is the workflow source of truth. |
| Creation/workflow | `POST /shipments/manual`, `POST /shipments/from-dispatch-planning`, `POST /shipments/{id}/transition`, `POST /shipments/{id}/cancel` | Cancellation has its own route and requires a reason. |
| Packing | `GET /shipments/{id}/packing-suggestions`, `POST /shipments/{id}/packages` | The package request contains its package-item allocations. |
| Transport/delivery | `POST /shipments/{id}/dockets`, `/appointments`, `/tracking-events`, `/delivery-attempts` | Dockets and appointments retain history; tracking events are append-only. |
| Receipts/returns | `POST /shipments/{id}/receipts`, `POST /shipments/{id}/returns`, `POST /returns/{id}/receive` | Only declared restockable returned quantity increases stock. |
| Freight | `POST /shipments/{id}/freight-charges`, `POST /freight-charges/{id}/submit|approve|reject|mark-paid|rojmel-expense` | Approval does not create a Rojmel expense. Rojmel posting is explicit. |
| Transporter role | `GET /transporters`, `PUT /transporters/{partyId}` | Uses the existing Party master plus the additive Transporter role. |
| Reports | `GET /reports`, `/reports/dashboard`, `/reports/export` | Export returns CSV and needs Export permission. |
| Historical import | `POST /imports/validate`, `POST /imports/{id}/commit|cancel`, `GET /imports` | Validate first, surface row errors, then require explicit commit. Import never changes current stock. |

## UI guardrails

- Render actions from the server-returned `ShipmentStatus`; do not infer stock, delivery, or freight state client-side.
- Treat `409` as a refresh-and-resolve response: another user may have changed allocation, packing, stock, or status.
- Keep proof attachments as URL/path references for now. There is no shared attachment upload API in this module.
- For Dispatch Planning conversion, offer only finalized allocations and show the server conflict verbatim if remaining quantity was consumed elsewhere.
- A return line can be received once in the current normalized model. Split an operationally partial return into separate return lines until a dedicated return-receipt history is introduced.

## Permissions

The API enforces the following permission pages: `ShipmentOperations.Shipments`, `Packing`, `Dockets`, `Appointments`, `Tracking`, `Receipts`, `Returns`, `Freight`, `Reports`, and `Imports`. Hide controls for missing actions as a convenience, but rely on the API for enforcement.

## Historical Work List mapping

The referenced `Copy of WORK LIST.xlsx` was not supplied, so the import UI should map and preview normalized rows rather than assume exact sheet headers. Each row needs an existing channel, warehouse, item/mapping identity, quantity, shipment date, and source shipment reference where multiple lines form one historical shipment. Resolve data-quality errors before commit and retain the user-supplied correction reason for duplicate/correction imports.
