# Centralized User Activity & Audit Logs

## Purpose and boundary

This module extends the existing `dbo.AuditLogs` table; it does not create a second audit system. It provides a single read model for permanent business and security activity while keeping operational request logs in Serilog/application logging.

Permanent activity includes successful business changes already written by the module services (masters, items, parties, sales, purchase/expense, HR, GST registration, OEE, Rojmel, procurement, dispatch, shipment, supply chain, users/roles/pages/permissions), plus Data Book lifecycle events and authentication security events. It is not an HTTP request archive. `AuditMiddleware` no longer inserts a row for every POST/PUT/PATCH/DELETE; request logging remains technical telemetry only. Existing legacy `HttpRequests` rows are excluded from the activity APIs and dashboard feed.

## Data contract and safety

Migration: `database/migrations/20260810_activity_logs_module.sql`

It adds metadata to `dbo.AuditLogs`: module, entity type/display value, description, changed fields, actor name snapshots, request path/method/status, correlation ID, direct peer IP, user agent, and source. `dbo.vw_ActivityLogs` supplies normalized module/action fallbacks for old rows, so historical records remain readable without a destructive data rewrite.

All application audit writes pass through `AuditRepository`. It:

- uses the authenticated request actor when callers did not provide one;
- attaches correlation ID, path, method, direct connection IP, user agent, and source;
- normalizes standard actions such as `Created`, `Updated`, `Cancelled`, `Transferred`, `PermissionChanged`, and security actions;
- sanitizes JSON recursively before persistence, removes keys whose normalized name indicates passwords, hashes, tokens, authorization/cookies, API keys, secrets, credentials, OTPs, connection strings, bank/payment account data, contact/address/identity data, document paths, or salary data; and
- stores only changed properties for object-to-object updates, with a bounded payload.

No password, reset token, access token, refresh token, password hash, authorization header, cookie, API key, secret, or connection string is intentionally written to activity data. Auth writes are deliberately best-effort so an audit-storage failure cannot change a login/logout/password result. Business audit writes retain the established synchronous behavior and occur only after the business operation reports success.

`IpAddress` is the server-observed direct remote address. This deployment does not trust `X-Forwarded-For` by default; a reverse-proxy deployment must configure ASP.NET Core forwarded headers with its known proxy/network rules before expecting client IP values.

Data Book retains its own transactional, append-only `DataBookEntryHistory` for detailed values. The centralized log receives only a separate high-level create/update/soft-delete event with no Data Book snapshot payload.

## Permissions

The migration seeds one existing page permission:

- Page: `ActivityLogs` (`/activity-logs`)
- `View`: list/detail
- `Export`: CSV export

Only the existing `SuperAdmin` role receives those two grants by role-name lookup. Create/Edit/Delete/Approve are explicitly false. Other roles require an explicit grant. The protected System Owner continues to receive dynamic access to all active pages/actions through the existing authorization rule, with no hard-coded account or role ID.

## APIs

All routes require JWT authentication and return the normal `ApiResponse<T>` envelope except CSV export.

| Method | Route | Permission | Response |
|---|---|---|---|
| GET | `/api/v1/activity-logs` | `ActivityLogs.View` | Paged `ActivityLogListItemDto` |
| GET | `/api/v1/activity-logs/{id}` | `ActivityLogs.View` | Safe activity detail |
| GET | `/api/v1/activity-logs/export?format=csv` | `ActivityLogs.Export` | UTF-8 BOM CSV |
| GET | `/api/v1/dashboard/recent-activity` | `Dashboard.View` | Compact permanent activity feed |

List and export accept `search`, `userId`, `username`, `module`, `action`, `entityType`, `entityId`, `fromDate`, `toDate`, `httpMethod`, `statusCode`, `correlationId`, `sortBy`, and `sortDirection`. List additionally accepts `pageNumber` and `pageSize` (1–200). Export is capped on the server at 50,000 rows. Allowed sorts are `TimestampUtc`, `Username`, `Module`, `Action`, `EntityType`, `EntityId`, and `HttpStatusCode`; SQL uses an allow-list/case ordering rather than dynamic SQL. Date values are UTC timestamps and both endpoints use inclusive bounds.

Detail returns sanitized `oldValues`/`newValues` objects when safely parseable and a normalized `changedFields` array. Historical malformed JSON degrades to null/empty detail fields instead of making an activity record unreadable.

The dashboard endpoint accepts `limit` (1–50; default 10) and intentionally omits before/after payloads.

## Database operations

- `database/verify_activity_logs_module.sql` is read-only and checks the table column/index/procedure/page/permission contract before returning safe counts.
- `database/activity_logs_smoke_tests.sql` creates a safe sample record inside a transaction, exercises list/detail/export/dashboard procedures, and always rolls back. Run it only on a disposable or approved non-production database.

Recommended deployment order: back up the database; apply the migration; run the read-only verifier; run the rollback smoke test on approved non-production data; deploy the API; grant `ActivityLogs` permissions to any normal role that should use the page; then verify Swagger and JWT authorization.

## Retention recommendation

Keep permanent business/security activity according to the company’s compliance, investigation, and backup requirements; a multi-year retention period is common but must be set by the organization rather than assumed by this module. Keep raw Serilog/request/error telemetry for a shorter operational period based on storage and incident-response needs. No purge job or destructive retention process is implemented here; any future purge must be a separately approved, controlled database operation.

## Known limits

- There is no independent database integration fixture in this repository, so live SQL execution remains a deployment verification step.
- Historic rows may lack enriched metadata; the view supplies safe fallbacks but cannot invent an actor that was never recorded.
- Activity logs are not a replacement for Data Book’s transactionally coupled history or for Serilog request/error telemetry.
