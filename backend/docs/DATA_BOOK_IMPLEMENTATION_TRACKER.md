# Data Book Implementation Tracker

| Area | Status | Notes |
|---|---|---|
| Contracts and validation | Implemented | DTOs, safe list/export filters, base64 8-byte row version validation. |
| Application service | Implemented | Current-user propagation, ownership defence-in-depth, private 404 behaviour, affordances. |
| Persistence | Implemented | Dapper repository with explicit current-user and correlation parameters. |
| API and Swagger | Implemented | JWT/page-action endpoints in `data-book`; history maps to View. |
| Migration | Added | `20260806_data_book_module.sql`, rerunnable tables/indexes/seeds/procedures/append-only history trigger. |
| Verification assets | Added | Read-only verification and transactional rollback smoke scripts. |
| Tests | Verified | Validators, permission metadata, service privacy, Dapper materialization, SQL visibility contract; full suite passed 175/175. |
| Live SQL / runtime Swagger | Pending | No database or API process was changed/started by this implementation. |

## Verification commands

```powershell
dotnet build backend/Cosmos.slnx --no-restore -m:1
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore -m:1
```

Apply the migration twice to a disposable SQL Server database, run `verify_data_book_module.sql`, then run `data_book_smoke_tests.sql`. The smoke script requires two active users and rolls back all test rows.

`dotnet build backend/Cosmos.slnx --no-restore -m:1` and `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore -m:1` passed on 2026-08-06. The build retained the repository's existing `Microsoft.OpenApi` NU1903 and Infrastructure NU1510 package warnings.

## Deployment order

1. Back up the target database and confirm the base COSMOS schema/migrations are current.
2. Apply `backend/database/migrations/20260806_data_book_module.sql`.
3. Run `backend/database/verify_data_book_module.sql`.
4. On a disposable or approved test database with two active users, run `backend/database/data_book_smoke_tests.sql`.
5. Deploy the API build containing the Data Book contracts, services, repository, controller, and Swagger registration.
6. Grant `DataBook.Entries` permissions to non-SuperAdmin roles explicitly; no role grants private-row override.
7. Check `/swagger/data-book/swagger.json` and perform JWT role smoke tests before production enablement.

## Deferred and known limitations

Private values/history JSON are not encrypted by the application because COSMOS has no reusable encryption/key-management abstraction. Database encryption, backup security, and access control remain deployment responsibilities. Shared private-entry access, attachments, restore, rollback, comments, approvals, dynamic fields, and rich text remain Phase 2 work.
