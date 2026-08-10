# Project Progress

## 2026-08-10 — Centralized Activity & Audit Logs

Completed the backend-only centralized activity-log module by extending the established `AuditLogs` system. The work adds the Activity Logs page/API/export, audit context/redaction/action normalization, security and Data Book companion events, dashboard recent activity, a rerunnable migration, and deployment verification assets. Technical HTTP request logging remains in Serilog rather than becoming permanent business activity. See `ACTIVITY_LOGS_MODULE.md` and `ACTIVITY_LOGS_IMPLEMENTATION_TRACKER.md`.

Live database and runtime Swagger validation remain pending an approved disposable environment.
