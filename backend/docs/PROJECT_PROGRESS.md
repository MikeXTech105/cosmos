# Project Progress

## 2026-08-13 â€” Website Management Module Update

Implemented the Website Management backend for WEWEL: standalone Website Products (no ERP Item relation), blogs/categories, scheduled TopBar announcements, warranty submissions/workflow/resolution/history/notes/customer messages, dashboard/report aggregates, settings, public read APIs, existing contact/warranty POST compatibility, private local evidence storage abstraction, page permissions, centralized audit events, rate limiting, migration assets, and focused tests. See `WEBSITE_MANAGEMENT_MODULE.md`, `WEBSITE_MANAGEMENT_FRONTEND_INTEGRATION.md`, `WEBSITE_MANAGEMENT_IMPLEMENTATION_TRACKER.md`, and `WEBSITE_FRONTEND_DATA_MIGRATION_REPORT.md`.

`dotnet build Cosmos.slnx --no-restore -m:1` passed, and the full suite passed **220/220**. SQL verification/smoke and runtime Swagger were not executed because no approved disposable database/API environment was used; the configured staging database was intentionally not altered. Apply `database/migrations/20260813_website_management_module.sql`, then run `database/verify_website_management_module.sql` and `database/website_management_smoke_tests.sql` in the documented deployment order. Client confirmation is still required before public marketing data is seeded or static frontend reads are switched.

## 2026-08-10 — Centralized Activity & Audit Logs

Completed the backend-only centralized activity-log module by extending the established `AuditLogs` system. The work adds the Activity Logs page/API/export, audit context/redaction/action normalization, security and Data Book companion events, dashboard recent activity, a rerunnable migration, and deployment verification assets. Technical HTTP request logging remains in Serilog rather than becoming permanent business activity. See `ACTIVITY_LOGS_MODULE.md` and `ACTIVITY_LOGS_IMPLEMENTATION_TRACKER.md`.

Live database and runtime Swagger validation remain pending an approved disposable environment.
