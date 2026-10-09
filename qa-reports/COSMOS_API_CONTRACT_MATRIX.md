# COSMOS ERP — API Contract Matrix

> **2026-10-09 audit update:** the earlier grouped matrix is not a complete endpoint-by-endpoint proof. Static inventory now records 282 endpoint-registry declarations, 316 Axios call sites, 58 controller files, and 454 HTTP action attributes. Authenticated property-level verification is 0%. The three confirmed Sales, Purchase, and Procurement Planning enum mismatches were remediated in source and covered by frontend contract tests; controlled staging list/detail and workflow verification remains required. The full per-call-site inventory remains a controlled-staging requirement in `COSMOS_API_INTEGRATION_TEST_PLAN.md`.

## Method and scope

Static inventory found 316 Axios method invocations in `frontend/src/services`, backed by the endpoint registry in `frontend/src/api/endpoints.js`. The backend has 58 controller files and module-grouped Swagger documents. This matrix records evidence level, not an assumption that static declarations work at runtime.

| Contract area | Frontend contract | Backend contract | Status | Evidence / action |
|---|---|---|---|---|
| Shared base URL | `runtimeConfig.API_BASE_URL`, Axios `baseURL` | API supplied at `:8080` | **MISMATCHED** | Live runtime config absent; frontend-origin `/api` returns HTML. See INT-001. |
| Authentication | login, me, refresh, logout, password endpoints | JWT auth middleware/controllers | **UNVERIFIED** | Direct unauthenticated `/api/auth/me` gives correct 401; no supplied test identity. |
| RBAC users/roles/pages/permissions | `rbac` services/endpoints | authorization + 441 `RequirePermission` usages | **UNVERIFIED** | No role tokens; source protections exist. |
| Dashboard | dashboard services/endpoints | dashboard controller/services | **UNVERIFIED** | Runtime blocked by base URL; no authenticated read. |
| Masters/items/parties | inventory/party services | controllers + Dapper repositories | **UNVERIFIED** | Static route registry present; no live data read. |
| Sales/purchase/expense | sales and purchase services | controllers, validation, SP repositories | **UNVERIFIED** | Writes excluded; no authenticated list probe. |
| HR/OEE | HR/OEE services | controllers, validators, SP repositories | **UNVERIFIED** | No test identities or non-production data. |
| Dispatch/procurement | dedicated services and query helpers | planning controllers, engines, repositories | **UNVERIFIED** | Source test coverage exists; live workflows excluded. |
| Manufacturing/shipment/supply chain | dedicated service modules | module controllers/repositories | **UNVERIFIED** | One unauthenticated supply-chain route returned 401. |
| Data Book/activity logs/Rojmel | dedicated services | module controllers/repositories | **UNVERIFIED** | Requires authenticated, scope-safe test data. |
| Public Website | website service | seven-path public OpenAPI document | **OUT OF SCOPE** | Content list calls 500; public website is explicitly on hold. |

## Verified response behavior

| Request | Expected envelope/HTTP | Actual | Classification |
|---|---|---|---|
| `GET :8080/api/auth/me` without token | 401 API error | 401 JSON API error, correlation ID | MATCHED for unauthenticated boundary |
| `GET :8080/api/pages` without token | 401 API error | 401 JSON API error | MATCHED for unauthenticated boundary |
| `GET :8080/api/v1/supply-chain/channels` without token | 401 API error | 401 JSON API error | MATCHED for unauthenticated boundary |
| `GET :3000/api/auth/me` | JSON API response | 200 SPA HTML | MISMATCHED |
| `GET :8080/api/website/settings` | public settings collection | 200 `[]` | MATCHED at endpoint level; public website out of scope |

## Required completion matrix

For each of the 316 service invocations, run a controlled staging contract test that records route/method, query serialization, request JSON, response schema, non-2xx body, content type, and frontend rendering. Classify it MATCHED only after both a source review and an executed request. This audit does not falsely label unexecuted routes as matched.

## Required regressions for INT-001

1. Deploy runtime config with an explicit API origin or `/api` proxy.
2. Assert browser requests to an API endpoint target JSON and do not return `text/html`.
3. Run one authenticated read in every main module before releasing.
4. Verify refresh updates the Axios authorization header, then verify a retry succeeds.
