# COSMOS ERP — UI Fix Backlog

| Priority | ID | Finding | Affected area | Recommended correction | Acceptance / regression |
|---|---|---|---|---|---|
| P0 | UI-001 | Users list failed with `t.find is not a function` | `frontend/src/pages/rbac/users/Users.jsx`; `userListData.js`; deployed `/users` integration | **Code fix complete locally:** explicit user mapper prevents the Array.map index from being used as role options; malformed lists produce a safe error. Deployment/staging verification remains required. | Unit tests, lint and production build pass. After deployment, admin list must display populated and empty states with no raw/minified error; staging browser test must pass. |
| P0 | INT-001-R | Current runtime API origin not independently verified | `frontend/src/config/runtimeConfig.js`, runtime deployment config | Validate current browser request origin/content type after deployment | `/api/*` calls are API JSON, never SPA HTML; fresh login/read/refresh succeeds in staging. |
| P1 | QA-API-001 | API request-level browser evidence unavailable | Browser QA harness/process | Add approved network capture with redaction for URL/method/status/content type/envelope keys | One safe read per module recorded without tokens/cookies/bodies. |
| P1 | QA-RBAC-001 | Role matrix unverified | Permission guards and backend permissions | Supply staging admin/standard/restricted identities | UI and direct API results agree for view/create/edit/delete/approve/export. |
| P1 | QA-STATUS-001 | Status/flag coverage incomplete | Sales, Purchase, Procurement | Use controlled fixtures for every enum/null/unknown state | Badge label/color/filter/query/action gate matches backend contract for every state. |
| P1 | QA-WORKFLOW-001 | Mutating workflows unverified | Sales/Purchase/Procurement/Dispatch/Shipment | Execute only in resettable staging | Lifecycle transitions, retry/idempotency and reload state pass. |
| P2 | A11Y-001 | Keyboard/modal behavior incomplete | Shared modal/sidebar controls | Add keyboard tests including Escape, focus trap and focus restore | Tests prove logical focus sequence and modal restoration. |
| P2 | RWD-001 | Responsive coverage limited to Party Master | Shared layouts/data tables/forms | Add screenshot tests for dense data grids/forms at four required viewports | No clipping/overlap/document overflow across selected module representatives. |
| P2 | UX-ERR-001 | Raw technical error leaks into Users UI | Users error mapping | Map runtime exception to a clear support-safe message and correlation ID if available | User sees actionable text; detailed error remains in approved telemetry only. |
| P3 | QA-BROWSER-001 | Other browser engines unverified | Release QA | Test approved desktop browsers | Compatibility matrix has observed results, not inferred passes. |

All source-file references above identify likely ownership, not a claim that a source edit was made during this audit. No application source or deployment configuration was changed.
