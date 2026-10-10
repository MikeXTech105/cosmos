# Data Book Frontend Integration

## User experience

Offer tabs for **All**, **Public**, **My Private**, and **Recently Updated**. Map the first three to `visibility=all|public|my-private`; Recently Updated uses `sortBy=updatedAtUtc&sortDirection=desc`.

Use `Public` and `Private` badges. The form has Name, Value, Description, Category, and a checkbox labelled **Keep this information private** with this help text:

> Private information is visible only to you. Public information is visible to all users who have Data Book access and may be edited by users with Edit permission.

List rows contain `valuePreview`; fetch detail before displaying or copying a complete value. Do not infer access from missing rows: the backend is authoritative.

## Permissions and controls

Use the existing returned page permissions to hide menu/actions:

| Flag | UI effect |
|---|---|
| `DataBook.Entries.View` | Show module, lists, detail, and history. |
| `Create` | Enable create button/form. |
| `Edit` | Pair with response `canEdit` to show Edit. |
| `Delete` | Pair with response `canDelete` to show Delete. |
| `Export` | Enable CSV export. |

History uses View because COSMOS does not have a global History permission action. Never show another user's private entries or an owner picker. A `404` for detail/history/update/delete can mean absent or inaccessible private data; present a neutral “entry not found” message.

## Endpoints and payloads

| Operation | Endpoint |
|---|---|
| Create | `POST /api/v1/data-book/entries` |
| List | `GET /api/v1/data-book/entries` |
| Detail | `GET /api/v1/data-book/entries/{id}` |
| Update | `PUT /api/v1/data-book/entries/{id}` |
| Delete | `DELETE /api/v1/data-book/entries/{id}` |
| History | `GET /api/v1/data-book/entries/{id}/history` |
| CSV | `GET /api/v1/data-book/entries/export?format=csv` |

Create body:

```json
{
  "name": "Dispatch Contact",
  "value": "9876543210",
  "description": "Primary dispatch contact",
  "category": "Dispatch",
  "isPrivate": false
}
```

Update includes the `rowVersion` returned by detail/list (base64):

```json
{
  "name": "Dispatch Contact",
  "value": "9123456780",
  "description": "Updated dispatch contact",
  "category": "Dispatch",
  "isPrivate": false,
  "rowVersion": "AQIDBAUGBwg="
}
```

Delete sends a JSON body:

```json
{ "rowVersion": "AQIDBAUGBwg=" }
```

All successful JSON responses use COSMOS `ApiResponse<T>`. List `data` is a paged result with `items`, `pageNumber`, `pageSize`, `totalCount`, and `totalPages`. Values are previewed in list responses and full in detail. The owner is never supplied by the client.

## History, transitions, and errors

History responses now contain `actionType`, `changedFields` (`string[]`), structured `oldData`/`newData` snapshots, actor name/time, and correlation ID. Use `changedFields` with the same Pascal-case snapshot keys (for example `oldData["Value"]`). `changedAtUtc` is UTC. `changedFieldsJson`, `oldDataJson`, and `newDataJson` remain temporarily for compatibility with the currently deployed client, but new frontend code should not parse them. Show values carefully because history can contain confidential content.

Changing public to private transfers private ownership to the editor and immediately removes it from other users' lists. Changing private to public is valid only for the owner. Do not implement a “transfer private owner” UI.

On HTTP `409`, read `data.conflictCode` (`DATA_BOOK_ENTRY_CONCURRENCY_CONFLICT`), reload detail, and let the user compare/reapply changes. On `400`, show field errors. On `401` reauthenticate; `403` means missing page permission; `404` is intentionally ambiguous for private records. Preserve and surface the response correlation ID for support.

## Export

Export accepts the same filters as list except pagination. The file is UTF-8 BOM CSV named `cosmos_data_book_YYYY-MM-DD.csv`. It includes full values for public records and for the caller's own private records only. Do not try to recreate export from loaded list pages.
