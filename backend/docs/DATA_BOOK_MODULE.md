# Data Book Module

## Purpose

Data Book stores small name-and-value business records. An entry is either public (shared with every user who has Data Book access) or private (visible only to its owner). It is intentionally not a password vault, attachment store, rich-text system, or record-sharing workflow.

## Security and ownership

- `DataBook.Entries` uses the existing `View`, `Create`, `Edit`, `Delete`, and `Export` page actions. The shared permission model has no `History` action, so history uses `View`.
- A user with `View` sees active public entries and only their own active private entries. SQL procedures always receive `@CurrentUserId` and apply `IsDeleted=0 AND (IsPrivate=0 OR OwnerUserId=@CurrentUserId)`.
- A non-owner gets the same `404` response for another user's private entry as for a missing entry. This applies to detail, update, delete, and history. SuperAdmin and the protected System Owner do not bypass this row-level rule.
- Public entries are shared: any user with `Edit` may update them and any user with `Delete` may soft-delete them. Their original owner/creator remains intact.
- A public-to-private update makes the acting user the owner. Only a private owner can make a private entry public; that conversion preserves owner and creator history.
- The list returns a 500-character value preview; detail returns the full value. An export contains full values only for public entries and the exporting user's own private entries.

## History and audit safety

Every successful create, update, visibility transition, and soft delete writes a `DataBookEntryHistory` row in the same SQL transaction. History records action, field names, prior/new JSON state, actor, UTC time, and correlation ID. The history table has an append-only trigger.

The shared HTTP audit middleware records only request method, path, and status. No Data Book request bodies, values, descriptions, old values, or new values are put into application logs or generic audit metadata.

There is no existing database encryption abstraction in COSMOS. Consequently, Data Book values and the functional old/new history JSON are stored in SQL Server plaintext and protected by database access controls/backups. Encryption-at-rest/key-management decisions are deferred to platform-level security work; no ad-hoc encryption was introduced.

## Database assets

Migration: `backend/database/migrations/20260806_data_book_module.sql`

- Tables: `DataBookEntries`, `DataBookEntryHistory`
- Indexes: active public, active owner-private, actor filters, and per-entry history chronology
- Constraints: user foreign keys, name/value non-blank checks, delete audit consistency, controlled history action values, JSON checks
- Procedures: `usp_DataBookEntry_Create`, `GetList`, `GetById`, `Update`, `Delete`, `GetHistory`, and `Export`
- Page seed: `DataBook.Entries` at `/data-book/entries`; full standard permissions seed by `SuperAdmin` role name lookup

`backend/database/verify_data_book_module.sql` is read-only. `backend/database/data_book_smoke_tests.sql` requires two active users and rolls all smoke data back.

## API

All endpoints require JWT authentication and the specified page action.

| Method | Route | Permission | Behaviour |
|---|---|---|---|
| POST | `/api/v1/data-book/entries` | Create | Creates public or owner-private entry. |
| GET | `/api/v1/data-book/entries` | View | Returns public plus caller-owned private entries. |
| GET | `/api/v1/data-book/entries/{id}` | View | Returns full value; hidden private IDs return 404. |
| PUT | `/api/v1/data-book/entries/{id}` | Edit | Uses `rowVersion`; applies ownership transition rules. |
| DELETE | `/api/v1/data-book/entries/{id}` | Delete | Body contains `rowVersion`; soft deletes. |
| GET | `/api/v1/data-book/entries/{id}/history` | View | Shows immutable history under the same visibility rule. |
| GET | `/api/v1/data-book/entries/export` | Export | UTF-8 BOM CSV, using the same visibility/filter scope. |

Lists and export support `search`, `category`, `visibility` (`all`, `public`, `my-private`), `createdByUserId`, `updatedByUserId`, `fromDate`, `toDate`, `sortBy` (`name`, `category`, `createdAtUtc`, `updatedAtUtc`), and `sortDirection` (`asc`, `desc`). Page size is 1-200. Sorting includes a deterministic ID tie breaker.

## Phase 2 candidates

Selected-user sharing, record restoration, version rollback, attachments, comments, encryption/key management, rich text, approval, dynamic fields, external spreadsheet sync, and administrator access to private records are intentionally out of scope.
