# COSMOS ERP — Full Live System QA Audit

**Audit date:** 2026-10-09 (Asia/Kolkata)  
**Audit mode:** Read-only. No source, database, deployment, configuration, or production data was changed.  
**Live frontend:** `http://91.108.110.56:3000`  
**Live API:** `http://91.108.110.56:8080`

## 1. Executive Summary

The audit confirmed two production-blocking defects:

1. The deployed frontend has no API base URL configured. Its same-origin `/api/...` requests go to port 3000 and receive the SPA document, not API responses from port 8080.
2. The unauthenticated public Website endpoints for products, blog posts, and announcements return HTTP 500.

The source repository also contains active-looking database, JWT, and third-party integration secrets in tracked configuration. Values are intentionally not reproduced in this report.

Backend unit tests are healthy (266 passed), but live authenticated UI/API, RBAC matrix, state transitions, and database-record comparisons could not be exercised without audit-specific non-production credentials and direct read-only database access.

## 2. Environment Verified

| Component | Result | Evidence |
|---|---|---|
| Frontend | Reachable; redirects to `/login` | `GET :3000/` returned 200; browser rendered the login page |
| API | Reachable | `GET :8080/health` returned 200 with a 7-byte plain-text health response |
| API documentation | Reachable | `GET :8080/swagger/index.html` returned 200 |
| Transport | HTTP, not HTTPS | Both supplied live URLs use `http://` |
| Database technology | SQL Server, not MySQL | `Microsoft.Data.SqlClient`, `SqlConnectionFactory`, SQL Server connection string format, and database verification artifact |
| Database evidence available | Historical/export-based, not live direct access | `Database_Verification_Output/00_DATABASE_VERIFICATION_REPORT.md` records 58 tables and 211 procedures reviewed |

## 3. System Architecture

```text
React/Vite frontend (port 3000)
  -> Axios runtime/base URL configuration
  -> ASP.NET Core API (port 8080)
  -> Application services
  -> Dapper repositories / stored procedures
  -> SQL Server
```

Evidence: `frontend/src/api/axios.js`, `frontend/src/config/runtimeConfig.js`, `backend/src/Cosmos.API/Program.cs`, and `backend/src/Cosmos.Persistence/Connection/SqlConnectionFactory.cs`.

Repository inventory: 58 controller source files, 8 C# projects, 49 SQL scripts/migrations, 395 frontend page files, 84 frontend service files, 50 backend test files, and 49 frontend test files.

Major implemented areas found: authentication/RBAC, dashboard, master data, items, parties, sales, purchase & expense, GST, OEE, HR, reports, procurement planning, manufacturing, dispatch planning, shipment operations, supply-chain foundation, Data Book, Website Management/public website, Rojmel/wallet, settings, and activity logs.

## 4. API Inventory

The API registers 22 Swagger module documents in `Program.cs`: dashboard, activity logs, masters, items, parties, sales, purchase & expense, GST, OEE, HR, reports, procurement planning, manufacturing, dispatch planning, shipment operations, supply-chain, Data Book, website management, public website, Rojmel, settings, and general.

The live public-website OpenAPI document exposes these seven paths:

| Method | Endpoint | Auth (source) | Live result |
|---|---|---|---|
| GET | `/api/website/products` | Public | 500 |
| GET | `/api/website/blog-posts` | Public | 500 |
| GET | `/api/website/blog-posts/{slug}` | Public | Not exercised without a known slug |
| GET | `/api/website/announcements` | Public | 500 |
| GET | `/api/website/settings` | Public | 200, `[]` |
| POST | `/api/website/warranty-claims` | Public/write | Not exercised (read-only audit) |
| POST | `/api/website/contact-enquiries` | Public/write | Not exercised (read-only audit) |

Authentication enforcement was verified by unauthenticated read-only calls: `/api/auth/me`, `/api/pages`, and `/api/v1/supply-chain/channels` each returned 401 with the API's standard unauthorized body. Source contains permission attributes on protected controllers; no live authorized role matrix was performed.

## 5. Frontend/API Contract Issues

### QA-001 — Critical — Contract / production configuration

**Module:** Frontend bootstrap and all API-backed screens  
**Expected:** The deployed client should direct API calls to the live API origin/port, or the frontend server should proxy `/api` to it.  
**Actual:** The live `runtime-config.js` only initializes an empty configuration object. In the live browser, `window.__COSMOS_CONFIG__` is null/absent. The client code therefore selects the same-origin fallback. `GET http://91.108.110.56:3000/api/auth/me` and `GET http://91.108.110.56:3000/api/website/products` both returned HTTP 200 `text/html` containing the SPA document, while the intended API on port 8080 returns API responses (401 and 500 respectively).

**Evidence:** live GET probes on 2026-10-09; `frontend/public/runtime-config.js`; `frontend/src/config/runtimeConfig.js`; `frontend/src/api/axios.js`.  
**Reproduction:** Open `http://91.108.110.56:3000/login`; inspect the deployed runtime config; request any `/api/...` route on port 3000.  
**Root cause:** No deployed `API_BASE_URL` and no observed frontend proxy route.  
**Recommended fix:** Set `window.__COSMOS_CONFIG__.API_BASE_URL` to the approved API base URL at deployment, or configure a reverse proxy for `/api`; then verify browser network requests and the login response content type. Do not rely on SPA fallback for API paths.

## 6. UI Issues

The unauthenticated login screen rendered successfully with username/email, password, remember-me, forgot-password, and sign-in controls. No browser console warnings/errors were captured at this screen.

Authenticated pages were not tested because no audit credential was provided. The contract failure in QA-001 means normal API-backed UI behavior is currently expected to fail even after authentication.

## 7. Status Mismatches

Not tested live. Source-level status/workflow tests exist for dispatch, procurement, shipment, Rojmel, sales, and website management, but no production state was changed or authenticated data queried.

## 8. Database/API Issues

### QA-002 — High — Confirmed Bug

**Module:** Public Website  
**API:** `GET /api/website/products`, `GET /api/website/blog-posts`, and `GET /api/website/announcements`  
**Expected:** Each documented public list endpoint should return a valid API response, including an empty result where no public content exists.  
**Actual:** Each returned HTTP 500. The error is safely sanitized as `INTERNAL_ERROR` and includes a correlation ID. In contrast, `GET /api/website/settings` returned 200 with `[]`.

**Evidence:** Three independent live, unauthenticated GET requests on 2026-10-09; live `website-public` Swagger document; controller at `backend/src/Cosmos.API/Controllers/WebsiteManagement/PublicWebsiteController.cs`; repository calls in `backend/src/Cosmos.Persistence/Repositories/WebsiteManagementRepository.cs`.  
**Reproduction:** Request each endpoint directly at port 8080 without credentials.  
**Probable root-cause area:** production deployment/database stored-procedure or schema/data compatibility for the Website content list paths. Source routes each call dedicated stored procedures, but live database access was not authorized, so this is intentionally not asserted as the precise root cause.  
**Recommended fix:** Use the returned correlation IDs in server logs; verify the three referenced stored procedures and their production permissions/schema with a read-only DBA session; add a production smoke test that asserts 200 for empty datasets.

## 9. Business Logic Issues

No confirmed business-calculation defect was found in this read-only run. Existing test coverage includes dispatch planning, procurement planning/workbook compatibility, sales calculations, and shipment engines. The backend test suite passed all 266 tests.

## 10. Dispatch QA

Source evidence exists for dispatch run lifecycle, engine, Dapper materialization, SQL contracts, and frontend query/lifecycle tests. No live dispatch run was created, allocated, finalized, edited, or deleted, in accordance with the audit's no-mutation constraint. Live dispatch calculation/status verification is **REQUIRES CONTROLLED TEST ENVIRONMENT**.

## 11. Procurement QA

Source evidence exists for procurement calculation, policy, spreadsheet/workbook compatibility, Dapper materialization, and SQL-contract tests. No live procurement calculation or suggestion was created. Live quantity, MOQ, lead-time, safety-stock, and state transition verification is **REQUIRES CONTROLLED TEST ENVIRONMENT**.

## 12. RBAC/Security QA

### QA-003 — Critical — Security Issue

**Module:** Deployment configuration / secrets management  
**Expected:** Database credentials, JWT signing material, and third-party service tokens should be supplied securely outside tracked application configuration.  
**Actual:** `backend/src/Cosmos.API/appsettings.json` contains connection credentials, a JWT signing key, and GST integration tokens. Values are omitted from this report.  
**Evidence:** lines 3–24 of that file (reviewed without reproducing values).  
**Risk:** Repository readers and copied artifacts may obtain long-lived credentials or token-signing capability; this can enable database access, token forgery, or third-party integration misuse.  
**Recommended fix:** Immediately rotate all exposed values, remove them from Git history where feasible, move them to a secret manager/environment injection, and add secret-scanning CI. Treat values as compromised.

Unauthenticated authorization behavior was positively sampled: three protected GETs returned 401. Authorization with distinct authenticated roles, direct object access (IDOR/data scope), and create/edit/delete/finalize permissions was not performed because it requires authorized test identities and would otherwise risk production state.

### QA-004 — Medium — Security Observation

**Module:** Transport  
**Actual:** Both live endpoints are served over HTTP.  
**Risk:** Credentials and bearer tokens can be exposed or modified in transit on untrusted networks.  
**Evidence:** supplied live URLs and successful HTTP probes.  
**Recommended fix:** Terminate TLS, redirect HTTP to HTTPS, enable secure-cookie/token handling as applicable, and use only HTTPS in CORS origins and deployment configuration.

### QA-005 — Medium — Dependency Security Issue

**Module:** Backend dependency management  
**Actual:** `dotnet test` reports `Microsoft.OpenApi` 2.4.1 with a known high-severity advisory (NU1903).  
**Evidence:** test restore/build output on 2026-10-09.  
**Recommended fix:** Upgrade to a non-vulnerable compatible version, run the test suite, and review the advisory's impact against Swagger exposure.

## 13. Workflow Issues

No live workflow mutation was performed. Source validators and workflow tests passed, but backend enforcement versus frontend controls for invalid transitions remains unverified in production.

## 14. Validation/Error Handling

Positive observations:

- Protected endpoints returned 401 rather than data.
- Public website 500 responses were sanitized; no stack trace or secret was returned.
- Health endpoint returned 200.

Invalid identifiers, malformed payloads, negative quantities, duplicate records, expired tokens, and invalid transitions were not sent because this audit did not create or alter production state.

## 15. Pagination/Sorting/Filtering

Public list endpoints could not be tested because three fail at request level. Authenticated list endpoints were not exercised. Source query models and frontend endpoint/service layers exist, but parameter compatibility has not been proven against the live deployment.

## 16. Performance Observations

No load test was performed. The observed public list-endpoint failures are correctness failures, not performance findings. No latency conclusion is made from these probes.

## 17. Production Configuration Issues

QA-001 is the confirmed frontend/API production configuration mismatch. The local source configuration also identifies a SQL Server staging database, whereas the audit brief's MySQL statement is not consistent with implementation. The source architecture and historical database verification report consistently indicate SQL Server.

## 18. Cross-Module Issues

No cross-module live transaction was executed. The frontend/API configuration fault affects every module that uses the shared Axios client, including RBAC, inventory, sales, purchase, dispatch, procurement, reports, HR, and Rojmel.

## 19. Complete Bug List

| ID | Severity | Classification | Module | Summary |
|---|---|---|---|---|
| QA-001 | Critical | Contract Mismatch | Frontend/API | Deployed SPA routes API calls to port 3000 and receives HTML instead of API responses |
| QA-002 | High | Confirmed Bug | Public Website | Products, blog-posts, and announcements GET APIs return 500 |
| QA-003 | Critical | Security Issue | Configuration | Sensitive database/JWT/GST values tracked in appsettings |
| QA-004 | Medium | Security Issue | Deployment | Live system is exposed only over HTTP |
| QA-005 | Medium | Security Issue | Backend dependencies | Known high-severity Microsoft.OpenApi dependency advisory |

## 20. Business Confirmation Required

1. Provide designated, least-privileged audit accounts (admin, normal user, restricted user) or a controlled staging environment to complete RBAC and workflow tests.
2. Confirm whether port 8080 is deliberately public and whether a reverse proxy/TLS endpoint exists outside the supplied URLs.
3. Confirm expected public-website behavior when content is empty: empty 200 results versus default content.
4. Authorize direct read-only SQL Server access if live schema/data-to-API consistency must be verified rather than relying on the supplied export verification artifact.

## 21. Recommended Fix Priority

1. **Immediately:** rotate and remove tracked secrets (QA-003).
2. **Immediately:** correct frontend API routing/runtime configuration and verify login plus one protected read (QA-001).
3. **High:** investigate public Website stored-procedure/deployment failures using correlation IDs and restore the three list endpoints (QA-002).
4. **High:** enable HTTPS and redirect HTTP (QA-004).
5. **High:** remediate the vulnerable OpenAPI package and rerun tests (QA-005).
6. **Next QA cycle:** run controlled authenticated workflow/RBAC/data-scope tests and live read-only DB reconciliation.

## 22. Evidence / Source References

- `backend/src/Cosmos.API/Program.cs` — middleware, CORS, Swagger module registration, auth/authorization pipeline, health route.
- `backend/src/Cosmos.API/appsettings.json` — provider connection configuration and secret locations (values withheld).
- `backend/src/Cosmos.Persistence/Connection/SqlConnectionFactory.cs` and `backend/src/Cosmos.Persistence/Dapper/StoredProcedureExecutor.cs` — SQL Server/Dapper implementation.
- `frontend/src/config/runtimeConfig.js`, `frontend/src/api/axios.js`, `frontend/public/runtime-config.js` — API base URL behavior.
- `backend/src/Cosmos.API/Controllers/WebsiteManagement/PublicWebsiteController.cs` and `backend/src/Cosmos.Persistence/Repositories/WebsiteManagementRepository.cs` — public Website route/service/repository chain.
- `Database_Verification_Output/00_DATABASE_VERIFICATION_REPORT.md` — prior export-based database verification, including 58 tables and 211 stored procedures.
- Live probes on 2026-10-09: frontend root/login; `/health`; Swagger UI and public-website document; public website routes; protected unauthenticated routes; port-3000 `/api` fallback behavior.

## Final Summary

```text
Total Issues: 5
Critical: 2
High: 1
Medium: 2
Low: 0
Info: 0
Business Confirmation Required: 4

Modules Audited: 22 API modules inventoried; frontend bootstrap; public Website; auth boundary; deployment configuration; database evidence
APIs Audited: 12 live endpoints/probes plus the 7-path public Website OpenAPI document
Screens Audited: 1 (unauthenticated login)
Database Tables Reviewed: 58 in the supplied export-verification artifact; 0 via direct live connection in this audit

Overall QA Status: FAIL — production-blocking frontend/API routing and public Website API failures; critical secret-management exposure.
```
