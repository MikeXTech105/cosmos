# Cosmos ERP — API Runtime Test Results

**Environment:** supplied production URLs, read-only and unauthenticated. These results predate deployment of the INT-001 source remediation and do not validate that un-deployed change.

| Test | Method/URL | Status | Content type / sanitized shape | Result |
|---|---|---:|---|---|
| Health | GET `:8080/health` | 200 | plain text | PASS: reachability only |
| Swagger UI | GET `:8080/swagger/index.html` | 200 | HTML | PASS: documentation reachable |
| Auth boundary | GET `:8080/api/auth/me` | 401 | JSON API failure envelope with correlation ID | PASS: unauthenticated boundary sample |
| RBAC pages boundary | GET `:8080/api/pages` | 401 | JSON API failure envelope | PASS: unauthenticated boundary sample |
| Supply-chain boundary | GET `:8080/api/v1/supply-chain/channels` | 401 | JSON API failure envelope | PASS: unauthenticated boundary sample |
| Frontend-origin auth route | GET `:3000/api/auth/me` | 200 | SPA HTML, not JSON | FAIL: confirmed prior INT-001 deployment behavior |
| Frontend-origin pages route | GET `:3000/api/pages` | 200 | SPA HTML, not JSON | FAIL: confirmed prior INT-001 deployment behavior |
| Public settings | GET `:8080/api/website/settings` | 200 | `[]` | OUT OF SCOPE — public Website on hold |
| Public content lists | GET products/blogs/announcements | 500 | sanitized JSON internal-error envelope | OUT OF SCOPE — public Website on hold |

No credential, token, ID, write payload, or personal data was submitted. Authenticated routes, response DTOs, flags/status values, permission matrix, workflow transitions, and database consistency are **UNVERIFIED**.
