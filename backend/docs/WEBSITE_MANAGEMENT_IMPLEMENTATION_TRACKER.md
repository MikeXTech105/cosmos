# Website Management Implementation Tracker

| Area | Status | Notes |
| --- | --- | --- |
| Architecture inspection | Implemented | Reused COSMOS controllers, API envelopes, Dapper/stored procedures, audit logs, permissions, migration, Swagger and test patterns. |
| Products/media/benefits | Implemented | Standalone catalogue; no ERP Item FK. |
| Blog/categories | Implemented | Published-only public projection and unique active slugs. |
| Announcements | Implemented | TopBar placement, schedule and deterministic priority ordering. |
| Warranty | Implemented | Public multipart route, private evidence, generated references, workflow, resolution, history, internal notes/customer messages. |
| Dashboard/reports/settings/contact | Implemented | Dashboard aggregates, warranty report, allow-listed settings, contact compatibility submission. |
| Permissions/audit | Implemented | Existing actions/pages and centralized sanitized audit logs. |
| Rate limit/error compatibility | Implemented | Public write policy and frontend-compatible direct JSON errors. |
| Migration/verification/smoke | Added | `20260813_website_management_module.sql`, `verify_website_management_module.sql`, `website_management_smoke_tests.sql`. |
| Tests | Added | Validators, public claim metadata handling, workflow, permission annotations, and SQL contract boundary. |
| Blog tags/product categories/public tracking | Deferred | No current frontend consumer; client confirmation required. |
| SQL runtime verification | Pending | Requires approved disposable SQL Server; no database was modified by this work. |
| Runtime Swagger verification | Pending | Requires API startup with valid System Owner/database environment. |

## Deployment order

1. Back up and bring the COSMOS base schema/migrations current.
2. Apply `database/migrations/20260813_website_management_module.sql` to a disposable/test database first, then again to prove rerunnability.
3. Run `database/verify_website_management_module.sql`.
4. Run `database/website_management_smoke_tests.sql` (it rolls back).
5. Deploy the API build and configure `WebsiteManagement:PrivateStoragePath` to a protected writable volume outside the app web root.
6. Verify `/swagger/website-management/swagger.json` and `/swagger/website-public/swagger.json`.
7. Grant child-page permissions to non-SuperAdmin roles; test System Owner and JWT authorization.
8. Switch frontend reads one surface at a time after client content confirmation; preserve the two POST contracts.
