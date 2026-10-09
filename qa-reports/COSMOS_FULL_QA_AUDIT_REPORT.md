# COSMOS ERP — Integrated QA Audit

**Audit date:** 2026-10-09 (Asia/Kolkata)  
**Mode:** audit-only; no application, database, deployment, or configuration changes were made.

## Executive summary

The ERP is **NOT READY FOR SIGN-OFF**. One confirmed deployment-level frontend/API integration fault prevents the shared API client from reaching the supplied backend. Security review also found tracked secret material and an HTTP-only deployment. The public-website failures found in the prior run remain reproducible but are explicitly **OUT OF SCOPE — PUBLIC WEBSITE ON HOLD** under this audit brief.

## Scope and evidence

Live verified: frontend login screen, frontend runtime configuration, port-3000 API fallback behavior, API health, Swagger UI, selected public APIs, and selected unauthenticated protected APIs. Source reviewed: React/Vite client, ASP.NET Core API, Dapper/SQL Server persistence, configuration, migration/scripts, docs, Docker, and tests. Historical database-export evidence was reviewed; no direct live database session was used.

## Architecture

```text
React 19 / Vite / Redux Toolkit / Axios
  -> runtime API base URL
  -> ASP.NET Core (.NET 10) controllers + JWT/RBAC middleware
  -> application services + FluentValidation
  -> Dapper repositories + SQL Server stored procedures
  -> SQL Server
```

Inventory: 58 controllers, 8 C# projects, 49 SQL scripts/migrations, 395 frontend pages, 84 frontend services, 316 static Axios verb invocations, 453 stored-procedure references, 50 backend test files, and 49 frontend test files.

## Findings

### INT-001 — High — Shared frontend API client targets the SPA, not the API

**Category/module:** Confirmed frontend–backend contract mismatch / deployment configuration.  
**Affected frontend:** `frontend/public/runtime-config.js`; `frontend/src/config/runtimeConfig.js`; `frontend/src/api/axios.js`.  
**Affected backend:** all API-backed modules through their shared HTTP client.  
**Expected:** Client requests target the API at port 8080 (or a reverse proxy forwarding `/api`).  
**Actual:** The deployed runtime config is empty. Browser evaluation found no `window.__COSMOS_CONFIG__` value. `GET http://91.108.110.56:3000/api/auth/me` and `/api/website/products` each returned the frontend `index.html` (HTTP 200, `text/html`), not API JSON. The API itself returned 401 for `/api/auth/me` at port 8080.

**Reproduction:** Open the supplied frontend; fetch any `/api/...` path through port 3000; compare with the same path through port 8080.  
**Impact:** Login and every internal data screen using the shared Axios instance are expected to fail or parse HTML as JSON.  
**Root cause/confidence:** Missing deployed `API_BASE_URL` and no observed API proxy. **Confirmed.**  
**Fix:** Inject approved `API_BASE_URL` into runtime config or add a reverse proxy; reject HTML responses for `/api` paths.  
**Regression:** browser login plus authenticated GET, a list page, a mutation in staging, and an assertion that `/api/auth/me` from the frontend origin has JSON content type.  
**Verification:** LIVE VERIFIED.

### SEC-001 — Critical — Secrets are tracked in application configuration

**Category/module:** security / configuration.  
**Affected backend:** `backend/src/Cosmos.API/appsettings.json`, lines 3–24.  
**Actual:** The file contains a SQL Server connection credential, JWT signing material, and GST provider tokens. Values are not reproduced.  
**Impact:** Anyone with repository/artifact access may access a database, forge JWTs, or call an integration.  
**Root cause/confidence:** secrets committed to tracked configuration. **Confirmed.**  
**Fix:** Rotate all affected values now; remove from repository/history as practicable; use environment injection or a secret manager; add secret scanning.  
**Regression:** secret-scanning CI must fail on credential/token patterns; application starts only when secrets are injected.  
**Verification:** SOURCE VERIFIED.

### SEC-002 — Medium — Supplied live deployment is HTTP-only

**Category/module:** deployment transport security.  
**Actual:** Frontend and API were supplied and reached only via `http://`.  
**Impact:** credentials/bearer tokens may be observed or altered in transit.  
**Confidence:** Confirmed for the supplied endpoints; an undisclosed TLS endpoint was not tested.  
**Fix/regression:** terminate TLS, redirect HTTP, remove HTTP CORS origins, and verify HSTS/secure token behavior.  
**Verification:** LIVE VERIFIED.

### SEC-003 — Medium — Dependency advisory in backend test/build output

**Category/module:** dependency security.  
**Actual:** .NET test output reported NU1903 for `Microsoft.OpenApi` 2.4.1, a known high-severity advisory.  
**Confidence:** Confirmed.  
**Fix/regression:** upgrade to a safe compatible version and rerun restore, build, tests, and Swagger smoke checks.  
**Verification:** SOURCE/BUILD VERIFIED.

### OOS-001 — Informational — Public Website list APIs return 500

**Category/module:** public Website.  
**Actual:** public `products`, `blog-posts`, and `announcements` GETs on port 8080 returned sanitized HTTP 500; public settings returned 200 `[]`.  
**Status:** **OUT OF SCOPE — PUBLIC WEBSITE ON HOLD.** It does not currently demonstrate an internal ERP fault or a data exposure.  
**Dependency:** none proven for internal ERP screens.  
**Follow-up:** retain correlation IDs in server logs and investigate when public Website work resumes.

## Positive checks actually performed

- API health endpoint returned 200.
- API Swagger UI returned 200.
- Login UI rendered with expected fields; no console warnings/errors captured before interaction.
- Protected `/api/auth/me`, `/api/pages`, and `/api/v1/supply-chain/channels` returned sanitized 401 responses without credentials.
- Existing backend tests passed: **266 passed, 0 failed, 0 skipped**.
- The historical export verification report found no missing tables/columns/procedures against its reviewed source export; this is not a live-database assertion.

## Unverified areas

Authenticated UI, token refresh, role/action matrix, data-scope/IDOR checks, CRUD/workflow transitions, DB-record reconciliation, dispatch/procurement live calculations, file flows, pagination/sorting/filtering, and frontend lint/build were not run against production. Frontend dependencies were absent (`frontend/node_modules` absent), so frontend tests/lint/build were not executed; dependencies were not installed in this audit-only run.

## First five actions

1. Rotate and externalize every tracked secret.
2. Restore correct frontend-to-API routing and test it in staging and live.
3. Enable HTTPS and redirect HTTP.
4. Upgrade the vulnerable OpenAPI dependency.
5. Provide least-privileged test identities and a read-only SQL Server account to complete authenticated/RBAC/database verification.

## Final status

**NOT READY FOR SIGN-OFF.** The confirmed shared API-routing failure makes internal ERP functionality unavailable from the supplied frontend, while secrets and plaintext transport create material security risk.

## API contract and status audit update — 2026-10-09

Static contract comparison confirmed additional High-severity internal mismatches in Sales, Purchase, and Procurement Planning enum/status maps. See `COSMOS_FLAGS_STATUS_AUDIT.md` and `COSMOS_FRONTEND_BACKEND_MISMATCHES.md`. The public Website remains out of scope. The frontend routing remediation is source-validated but not deployed, so prior live routing evidence is not superseded until staging/runtime checks pass.
