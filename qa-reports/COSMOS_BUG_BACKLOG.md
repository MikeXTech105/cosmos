# COSMOS ERP — QA Bug Backlog

| Priority | ID | Confidence | Proposed correction | Acceptance criteria | Regression tests / dependencies |
|---|---|---|---|---|---|
| P0 | SEC-001 | Confirmed | Remove/rotate tracked DB, JWT, and GST secrets; inject through secret management | No real secret in tracked config/history; app starts with injected secrets | CI secret scan; startup/config test; security owner required |
| P1 | INT-001 | Confirmed | Configure runtime `API_BASE_URL` or API reverse proxy | Browser `/api/auth/me` reaches API JSON, not SPA HTML; login/list request works | Browser/network contract tests; API host/deployment access |
| P1 | SEC-002 | Confirmed | Add TLS and redirect HTTP | HTTPS works, HTTP redirects, API/CORS frontend origin updated | transport/header smoke test; certificate/reverse-proxy access |
| P1 | SEC-003 | Confirmed | Upgrade vulnerable OpenAPI package | Restore/build has no NU1903 for the vulnerable version; Swagger works | dependency scan, build, 266+ backend tests |
| Deferred | OOS-001 | Confirmed but out of scope | Diagnose public list stored-procedure/deployment path when website work resumes | products/blogs/announcements return intended 200 envelope | public website staging DB/log access; not an ERP release blocker by current scope |

No probable/unverified issue is included as a bug. The following are audit gaps, not defects: authenticated permissions, data scope, live database integrity, workflows, calculations, and frontend build/lint.
