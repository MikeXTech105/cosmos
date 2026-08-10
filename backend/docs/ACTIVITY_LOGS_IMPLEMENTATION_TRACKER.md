# Activity Logs Implementation Tracker

| Area | Status | Notes |
|---|---|---|
| Existing-system audit | Complete | Extended `dbo.AuditLogs` and its existing write procedure; no duplicate audit table or generic request rows. |
| Write enrichment/redaction | Complete | Repository supplies actor/context, canonical actions/modules, shallow changed-field diffs, and recursive sensitive-key removal. |
| Central API/export | Complete | View/export permissions, filters, pagination, safe sort allow-list, detail, UTF-8 CSV, and 50,000-row export cap. |
| Security and Data Book | Complete | Login success/failure, logout, password change/reset, profile update, and high-level Data Book lifecycle events are covered without secrets/snapshots. |
| Dashboard | Complete | Bounded permanent recent-activity feed under `Dashboard.View`. |
| SQL assets | Added | Rerunnable migration, read-only verifier, and rollback smoke test. |
| Automated tests | Verified | Sanitizer, context/actor propagation, permission/OpenAPI metadata, filtering normalization, migration SQL contract, JWT claim, dashboard recent activity, and affected Data Book coverage passed. Focused Data Book: 32/32; full suite: 204/204 on 2026-08-10. |
| Live SQL/runtime Swagger | Pending | Not run because no approved disposable database/API environment was used. |

## Required deployment checks

1. Apply `database/migrations/20260810_activity_logs_module.sql` twice on a disposable SQL Server database.
2. Run `database/verify_activity_logs_module.sql`.
3. Run `database/activity_logs_smoke_tests.sql` and confirm its rollback message.
4. Deploy the API, inspect `/swagger/activity-logs/swagger.json` and `/swagger/dashboard/swagger.json`, and test SuperAdmin/System Owner plus an ungranted normal role.
5. Perform representative item update, sales confirmation, Rojmel transfer, permission change, password change, failed login, and Data Book update checks; confirm sensitive values are absent from database activity and Serilog output.
6. Verify list/detail/export and `/api/v1/dashboard/recent-activity`; then explicitly grant `ActivityLogs.View`/`ActivityLogs.Export` to any normal role that should receive the page.

## Local verification completed

- `dotnet build Cosmos.slnx --no-restore`: passed with 0 errors.
- `dotnet test tests/Cosmos.Tests/Cosmos.Tests.csproj --no-build --no-restore --filter "FullyQualifiedName~DataBook"`: passed 32/32.
- `dotnet test Cosmos.slnx --no-build --no-restore`: passed 204/204.

The build retained existing package advisories: `Microsoft.OpenApi` NU1903 and Infrastructure configuration/HTTP NU1510 warnings.
