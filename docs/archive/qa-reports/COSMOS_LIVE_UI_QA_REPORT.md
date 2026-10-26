# COSMOS ERP — Live UI QA Report

**Audit date:** 2026-10-09 (Asia/Calcutta)  
**Environment:** `http://91.108.110.56:3000` (authenticated existing Administrator/SuperAdmin browser session); configured API host supplied as `http://91.108.110.56:8080`.  
**Method:** source and prior-report review; read-only live browser navigation, DOM/accessibility-tree inspection, responsive checks, screenshots captured in the test browser, and console-log inspection. No production data, records, files, payments, GST operations, emails, shipments, or workflow transitions were changed.

## Executive result

**NOT READY FOR SIGN-OFF.** One High, production-reproduced RBAC Users-page failure prevents a SuperAdmin from viewing users. The sampled read-only module pages otherwise rendered without browser-console warnings/errors. Full workflow, permission-matrix, API-contract, and state-transition sign-off remains blocked because this was production and no controlled staging identity/dataset was provided.

## Coverage

| Measure | Result |
|---|---:|
| Source routes discovered | 121 (97 non-parameterized/static; includes redirects, auth, error, and parameterized routes) |
| Internal page records shown by live Pages screen | 104 |
| Canonical internal pages opened live | 20 |
| Pages fully functionally tested | 0 — production mutation safeguards and no staging fixture |
| API-backed pages sampled | 20, by rendered read-only data/empty/error state |
| Browser console warnings/errors on sampled pages | 0 captured |
| Confirmed defects | 1 High |
| Responsive viewports checked | 1440×900, 1366×768, 768×1024, 390×844 |

## Confirmed finding

### UI-001 — High — Users page fails to load its data

- **Category:** API integration / table
- **Module / route:** RBAC, `/users`
- **Status:** **CONFIRMED**
- **Browser / viewport:** Codex in-app Chromium, desktop default (also observed after direct navigation)
- **Evidence:** Live rendered page showed `Unable to load users` and `t.find is not a function`; browser screenshot and accessibility/DOM capture were taken at 2026-10-09. The failure is visible in the page’s own error state; no console error was emitted.
- **Steps:** Sign in with the available Administrator session → open `/users` → wait for initial reads to settle.
- **Expected:** The users table displays the accessible users or a coherent empty state.
- **Actual:** Table shows zero rows and an error heading followed by `t.find is not a function`.
- **Likely cause / confidence:** **Probable, medium confidence:** a deployed frontend/API response-shape incompatibility or an older deployed bundle. Current source in `frontend/src/pages/rbac/users/Users.jsx` defensively normalizes several collection shapes, so the minified live error does not establish the precise expression or source revision.
- **Recommended correction:** Capture sanitized `/api/users` and roles-response shapes in staging; align the deployed response normalizer and add a browser integration regression that verifies a nonempty/empty list. Confirm the deployed asset revision matches source.
- **Acceptance criteria:** Administrator can load `/users` with no error; table, counts, filters, pagination and retry work for both an empty and populated response; no unhandled/minified error text reaches users.
- **Regression:** authenticated staging GET + browser test for `/users`, including malformed-envelope handling.

## Read-only live observations

- Dashboard, Party Master, Sales Invoices, Procurement, Dispatch, Shipments, HR, OEE, Rojmel, Activity Logs, Items, Purchase Bills/Orders, Supply Chain Channels, Data Book, Roles, Permissions, Pages, and Reports rendered a coherent heading and principal layout.
- Dashboard displayed an intentional-looking no-data state for the selected period; it did not remain loading.
- Items, Purchase Bills/Orders, Party Master, Data Book, Roles and Pages displayed populated read-only table/list content. Procurement displayed two calculated order recommendations. No status transition was attempted.
- `/inventory/items` and `/purchase/documents` return the application 404 page, but source routing confirms these are not registered routes; the canonical routes are `/items` and `/purchase/bills`/`/purchase/orders`. This is **not** filed as a defect.
- The sampled console logs had no warnings or errors. Browser tooling did not expose response status/content-type detail for individual requests; the API integration report distinguishes those as unverified.

## Deliberately excluded / blocked

- All creates, updates, deletes, approvals, cancellations, payments, GST work, exports/downloads, dispatch/shipment actions, password actions, and form submission.
- Detail/edit routes requiring real record IDs; lifecycle/status paths; expired-token and refresh flows; role-permission comparison across identities; error/empty response injection; direct API response-body validation.
- Website Management was left out of functional defect scope, per instruction that public website work is on hold. Its internal routes are inventoried only.

## First ten fixes / verification actions

1. Fix and deploy the `/users` read failure (UI-001).
2. Add staging browser coverage for Users list response envelopes.
3. Verify deployed runtime `API_BASE_URL` against the current INT-001 remediation; do not rely on source-only evidence.
4. Capture one sanitized successful browser/API request per main module with URL, method, HTTP status and content type.
5. Run Sales badge/filter checks against controlled fixtures for every invoice/payment enum.
6. Run Purchase bill/order badge/filter checks against controlled fixtures for every status/payment enum.
7. Run Procurement Planning Draft/Calculated/Reviewed/Finalized/Cancelled workflow checks in staging.
8. Run RBAC visibility and direct-API 401/403 checks with admin, standard and restricted staging identities.
9. Test create/edit validation, cancel, duplicate submission and modal focus on staging.
10. Run cross-browser and keyboard accessibility regression testing with persisted screenshots.
