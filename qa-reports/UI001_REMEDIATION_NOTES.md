# UI-001 Remediation Notes — Users Page Integration

**Date:** 2026-10-09 (Asia/Calcutta)  
**Status:** Code fixed and locally verified; **not deployed**; staging verification required before closure.

## Confirmed root cause

`Users.jsx` loaded users with:

```js
collection.items.map(normalizeUser)
```

`Array.prototype.map` invokes its callback as `(value, index, array)`. `normalizeUser`'s second parameter is `roleOptions`, so each user after the first received a numeric array index instead of the expected role-options array. During role reconciliation, `findMatchingRoleOption` invoked `roleOptions.find(...)`; a number has no `find` method. The deployed, hashed Users chunk contains the same callback shape, which explains the live minified error `t.find is not a function`.

This is a frontend callback-signature defect, not a backend envelope defect. The backend contracts are:

- `GET /api/users` → `ApiResponse<IReadOnlyCollection<UserDto>>`
- `GET /api/roles` → `ApiResponse<IReadOnlyCollection<RoleDetailDto>>`

The shared client unwraps these to the array in `response.data`, which is valid. Live runtime configuration was also verified as the expected API origin without recording credentials or tokens.

## Requests needed by the Users page

| Request | Consumer | Expected post-unwrapping shape |
|---|---|---|
| `GET /api/users` | User list, counts, search/filter/pagination | `UserDto[]` |
| `GET /api/roles` | Role filter and create/edit role selection | `RoleDetailDto[]` |

## Changed files

- `frontend/src/pages/rbac/users/Users.jsx`
  - Replaced the unsafe direct map callback with `normalizeUsers(collection.items)`.
  - Uses safe Users and Roles load-error messages.
- `frontend/src/pages/rbac/users/userListData.js` (new)
  - Contains collection parsing, role/user normalization, filtering, pagination, and safe error presentation.
  - Rejects a missing/malformed collection instead of converting it into a misleading empty users state.
  - Maps internal JavaScript errors such as `t.find is not a function` to `We couldn't load users. Please try again.`
- `frontend/src/pages/rbac/users/userListData.test.js` (new)
  - Covers populated/empty backend envelopes, supported envelopes, malformed collections, failed role lookup handling, filters, pagination, repeat/retry-safe normalization, and safe internal/API error messages.
- `qa-reports/COSMOS_UI_FIX_BACKLOG.md`
  - Updated UI-001 to reflect local fix status and staging gate.

## Local verification

Executed from `frontend/`:

| Command | Result |
|---|---|
| `npm test -- --run src/pages/rbac/users/userListData.test.js` | PASS — 1 file, 6 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS — Vite production build completed |

No production API calls, production record mutations, credentials, tokens, or deployment actions occurred during remediation.

## Required staging verification

1. Deploy the frontend build only to approved staging with the intended non-secret API origin.
2. With a controlled Administrator identity, open `/users` and verify a populated list containing at least two users; confirm no error state or console exception.
3. Use a controlled valid-empty dataset and verify the intentional `No users found` state, not an error state.
4. Verify the roles filter loads from `GET /api/roles`; simulate a role-read failure and confirm the filter is disabled with `Roles unavailable` while the users list remains usable.
5. Verify search, status/role filters, page-size/pagination, refresh/retry, edit role selection and permission-controlled actions.
6. Capture sanitized request URL/method/status/content type and only response envelope keys for both reads. Do not capture tokens, cookies, personal data, or full payloads.
7. Re-run browser regression at desktop and mobile widths.

## Rollback

If staging verification fails, redeploy the previous frontend artifact only. No backend/database rollback is needed because the backend contract was not changed. Retain this source change for diagnosis; do not close UI-001 until a deployed staging build has passed the checks above.
