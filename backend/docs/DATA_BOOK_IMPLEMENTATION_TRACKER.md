# Data Book Implementation Tracker

| Area | Status | Notes |
|---|---|---|
| Contracts and validation | Implemented | DTOs, safe list/export filters, base64 8-byte row version validation. |
| Application service | Implemented | Current-user propagation, ownership defence-in-depth, private 404 behaviour, affordances. |
| Persistence | Implemented | Dapper repository with explicit current-user and correlation parameters. |
| API and Swagger | Implemented | JWT/page-action endpoints in `data-book`; history maps to View. Static response metadata validates normalized `changedFields`, `oldData`, and `newData`; live Swagger needs an approved non-production database/API environment. |
| Migration | Added | `20260806_data_book_module.sql`, rerunnable tables/indexes/seeds/procedures/append-only history trigger. |
| History contract fix | Implemented | Centralized read normalization supports legacy object-form and canonical string-form metadata; public history now has typed fields/snapshots while legacy raw JSON remains temporarily available. |
| History SQL migration | Added | `20260810_data_book_history_contract_fix.sql` alters only update history serialization for future rows; existing append-only rows are not rewritten. |
| Verification assets | Added | Read-only verification and transactional rollback smoke scripts. |
| Tests | Verified | Added history normalizer, raw Dapper-row, migration-contract, owner, privileged non-owner privacy, and OpenAPI metadata coverage. After centralized activity companion events, current run: Data Book 32/32 and full suite 204/204 passed. |
| Live SQL / runtime Swagger | Pending | No database or API process was changed/started by this implementation. |

## Verification commands

```powershell
dotnet build backend/Cosmos.slnx --no-restore -m:1
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore -m:1
```

Apply the migration twice to a disposable SQL Server database, run `verify_data_book_module.sql`, then run `data_book_smoke_tests.sql`. The smoke script requires two active users and rolls back all test rows.

`dotnet build Cosmos.slnx --no-restore`, focused Data Book testing, and the full suite passed on 2026-08-10. The focused Data Book run passed 32/32 and the full suite passed 204/204. The build retained the repository's existing `Microsoft.OpenApi` NU1903 and Infrastructure NU1510 package warnings. Live SQL and runtime Swagger were not run because the configured database is not a local disposable environment.

## Deployment order

1. Back up the target database and confirm the base COSMOS schema/migrations are current.
2. Apply `backend/database/migrations/20260806_data_book_module.sql` if it is not already deployed.
3. Apply `backend/database/migrations/20260810_data_book_history_contract_fix.sql` after the base Data Book migration.
4. Run `backend/database/verify_data_book_module.sql`.
5. On a disposable or approved test database with two active users, run `backend/database/data_book_smoke_tests.sql`.
6. Deploy the API build containing the Data Book contracts, normalizer, service, repository, controller, and Swagger registration.
7. Grant `DataBook.Entries` permissions to non-SuperAdmin roles explicitly; no role grants private-row override.
8. Check `/swagger/data-book/swagger.json`, including `changedFields`, `oldData`, and `newData`, then perform JWT role smoke tests before production enablement.

## Deferred and known limitations

Private values/history JSON are not encrypted by the application because COSMOS has no reusable encryption/key-management abstraction. Database encryption, backup security, and access control remain deployment responsibilities. Shared private-entry access, attachments, restore, rollback, comments, approvals, dynamic fields, and rich text remain Phase 2 work.
