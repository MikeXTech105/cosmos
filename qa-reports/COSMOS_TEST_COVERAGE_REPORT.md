# COSMOS ERP — Test Coverage Report

## Executed checks

| Command/check | Environment | Result | Limitation |
|---|---|---|---|
| `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --nologo --verbosity quiet` | local source | 266 passed, 0 failed, 0 skipped | unit/source tests; not live integration |
| `GET :3000/` and browser login view | live | 200; login UI rendered | no authentication submitted |
| `GET :8080/health` | live | 200 | health only |
| Swagger UI/public OpenAPI | live | reachable | not every Swagger module contract executed |
| unauthenticated protected reads | live | selected endpoints returned 401 JSON | no role/permission matrix |
| frontend runtime/API fallback probes | live | confirmed SPA HTML fallback | proves deployment defect |

## Not executed

Frontend build, lint, and Vitest were not run because `frontend/node_modules` is absent; dependencies were not installed during this audit. No tests were run against production that create/update/delete records. No direct SQL Server queries were executed.

## Existing coverage observed

Backend tests cover JWT, bcrypt, system-owner authorization/provisioning, activity logs, dashboard, sales calculations, procurement policy/calculations/workbook compatibility, dispatch engine/contracts, shipment engine/validation/materialization, Rojmel authorization/ledger, Data Book, manufacturing, reports, image upload security, and website management. Frontend test files cover runtime config, auth storage, API errors, dispatch/procurement/website queries, permission resolution, grids/forms, CSV, and selected service calls.

## Missing high-value regressions

1. Browser end-to-end test that fails if the frontend API base points to SPA HTML.
2. Authenticated API serialization and error-envelope tests for each frontend service family.
3. Three-role authorization matrix (admin/normal/restricted) including direct API calls.
4. Controlled dispatch/procurement end-to-end calculation and state-transition tests.
5. Read-only database/API reconciliation tests against an approved staging database.
6. Frontend build/lint/Vitest in CI with dependency lockfile enforcement.
