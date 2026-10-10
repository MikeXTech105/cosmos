# Activity Logs Frontend Integration

## Access and navigation

Show the Activity Logs navigation entry only when the login permission payload grants `ActivityLogs.canView`. Show CSV export only when `ActivityLogs.canExport` is true. Do not infer access from role names; the protected System Owner is granted dynamically by the backend.

The page is read-only. It should not render Create/Edit/Delete controls.

## List screen

Call `GET /api/v1/activity-logs` with the standard query-string fields. Default to `pageNumber=1`, `pageSize=50`, `sortBy=TimestampUtc`, and `sortDirection=desc`.

Recommended table columns are UTC timestamp (converted for display in the browser), user display name/username, module, action, entity type, entity reference, description, and HTTP status where present. Use `totalCount`/`totalPages` from the paged envelope for pagination.

Suggested filter controls:

- free-text search;
- actor (user ID or username);
- module and action dropdowns based on values returned by the dataset;
- entity type and entity ID;
- UTC from/to timestamps;
- method, status code, and correlation ID for support workflows.

Pass only documented sort keys. Treat `400` as a field-validation response, `401` as reauthentication, and `403` as missing page permission.

## Detail drawer or page

Call `GET /api/v1/activity-logs/{id}` when a row is selected. Render `changedFields` first, then `oldValues` and `newValues` as collapsed JSON/diff sections. Values are already safety-filtered by the backend, but the client must not attempt to recover or display absent secret fields. Nullable request/IP/user-agent values are expected for older rows and non-HTTP sources.

Use the returned correlation ID as a copyable support reference. Do not expose raw technical request logs in this view.

## Export

Call `GET /api/v1/activity-logs/export?format=csv` with the exact active filter and sort parameters. The response is a downloadable CSV, not an `ApiResponse` JSON body. Its UTF-8 BOM and `Content-Disposition` header should be preserved by the HTTP client. The server limits results to 50,000 rows; if the user needs more, narrow filters rather than issuing client-side paging requests to construct an export.

## Dashboard widget

For a compact recent-activity widget, call `GET /api/v1/dashboard/recent-activity?limit=10`. It requires `Dashboard.View`, not `ActivityLogs.View`, and intentionally has no sensitive details. Link to the central Activity Logs page only if `ActivityLogs.canView` is also present.

No React/frontend source changes are included with this backend module.
