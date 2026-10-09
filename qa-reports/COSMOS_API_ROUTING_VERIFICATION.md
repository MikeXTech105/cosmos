# Cosmos ERP — API Routing Verification

**Investigation date:** 2026-10-09 (Asia/Kolkata)  
**Mode:** read-only. No credentials were submitted and no production state was changed.

## Classification

**INT-001 is CONFIRMED for the currently served frontend deployment.**

The supplied Chrome Network observation of `POST http://91.108.110.56:8080/api/auth/login` returning a successful JSON response is credible evidence that *that request in that browser session* reached the API. It does not prove that the currently served frontend bundle routes its login request there. Current live asset and safe GET evidence shows that the deployed client configuration now resolves the shared Axios client to same-origin `/api`, which the frontend Nginx server serves as SPA HTML.

## Current observed behavior

| Request | Status | Content type | Response classification |
|---|---:|---|---|
| `GET http://91.108.110.56:3000/api/auth/me` | 200 | `text/html` | SPA `index.html`, not API JSON |
| `GET http://91.108.110.56:8080/api/auth/me` | 401 | `application/json; charset=utf-8` | Expected unauthenticated API response |
| `GET http://91.108.110.56:3000/api/pages` | 200 | `text/html` | SPA `index.html`, not API JSON |
| `GET http://91.108.110.56:8080/api/pages` | 401 | `application/json; charset=utf-8` | Expected unauthenticated API response |

These same-route, different-origin probes establish that port 3000 does not proxy `/api` to port 8080 in the currently served deployment.

## Effective URL resolution

### Source behavior

| File | Behavior |
|---|---|
| `frontend/public/runtime-config.js` | Initializes `window.__COSMOS_CONFIG__` to an empty object. |
| `frontend/src/config/runtimeConfig.js` | Chooses `window.__COSMOS_CONFIG__.API_BASE_URL` when defined; otherwise falls back to build-time `VITE_API_BASE_URL`; otherwise uses an empty base URL (same origin). |
| `frontend/src/api/axios.js` | Creates the shared Axios client from `runtimeConfig.API_BASE_URL`. |
| `frontend/src/services/authService.js` | Login uses that shared Axios client: `POST /api/auth/login`. |
| `frontend/src/pages/auth/Login.jsx` | Calls `loginUser`, so login uses `authService` and then the shared client. |
| `frontend/nginx.conf` | Has SPA fallback (`try_files ... /index.html`) and no `/api` `proxy_pass` block. |
| `frontend/src/services/sessionService.js` | Is a separate client path for token refresh: it reads build-time `VITE_API_BASE_URL` directly and does **not** use `runtimeConfig`. |

The checked-in `.env` contains an absolute `VITE_API_BASE_URL` for port 8080. That would be compiled into a Vite production build if present in the actual build context. It is not current-live proof by itself.

### Current live deployment behavior

1. `GET :3000/runtime-config.js` returned `window.__COSMOS_CONFIG__ = window.__COSMOS_CONFIG__ || {};` with `Cache-Control: no-store, must-revalidate, no-cache`.
2. A fresh browser evaluation found no `window.__COSMOS_CONFIG__.API_BASE_URL` value.
3. The referenced current bundle was `/assets/index-CdJfwlWS.js`. It contains neither `91.108.110.56:8080`, `8080`, nor `VITE_API_BASE_URL`; it contains only the `http://localhost` fallback literal used by source logic.
4. The bundle is marked immutable, while the HTML shell and runtime config are no-cache. Current asset headers show the shell/runtime script and bundle were last modified on 2026-10-08.

Taken together, the current served bundle has no absolute API origin available through either runtime or build configuration. The shared Axios base is therefore empty and `/api/auth/login` resolves to `http://91.108.110.56:3000/api/auth/login` for a fresh current page.

## Reconciling the successful login observation

The successful `POST :8080/api/auth/login` and the failed relative GETs are not observations of the same effective request URL:

- The successful request is explicitly absolute and targets the API port.
- The audit GETs intentionally targeted the frontend port to test the SPA's same-origin API fallback.

Source supports only two mechanisms by which the frontend login call could become the reported absolute URL: a populated `window.__COSMOS_CONFIG__.API_BASE_URL` at page load, or a bundle built with `VITE_API_BASE_URL`. Neither mechanism is present in the currently served runtime script/bundle.

The evidence does **not** establish why the browser that produced the screenshot used port 8080. Possible explanations (an earlier/different deployment asset, a browser session that loaded a populated runtime configuration, or a request manually issued outside the shared client) remain **unverified** because the screenshot metadata and its page/bundle/runtime-config values were not supplied. Cached runtime configuration is less likely for a fresh load because the current runtime script is explicitly no-cache, but cannot be ruled out for the historical observation.

No conclusion is made that every route fails: port-8080 API behavior was only sampled with read-only unauthenticated GETs, and no authenticated request was submitted in this investigation.

## Additional configuration risk: refresh client divergence

Even after restoring runtime-config routing, `sessionService.js` obtains its refresh URL from build-time `VITE_API_BASE_URL`, whereas login and ordinary requests use `runtimeConfig`. A deployment relying solely on runtime `API_BASE_URL` can therefore make login/read requests reach the API while refresh fails after a 401. This is a **source-confirmed design inconsistency**; live refresh behavior was not tested because it would require a real session.

## Root cause

**Confirmed current root cause:** the live frontend runtime script does not define `API_BASE_URL`, the currently served JavaScript bundle has no build-time API base, and the Nginx configuration has no API proxy. The common Axios client consequently uses a relative path that is captured by the SPA fallback.

## Smallest safe fix

Set the frontend container/runtime value to the approved API base URL (for this deployment, the API origin/port) using the existing `runtime-config.js` mechanism, **or** add a narrowly scoped `/api/` reverse-proxy rule. Do not change both mechanisms in the same first remediation. Then refactor `sessionService` to consume the same validated runtime configuration as Axios so refresh cannot diverge.

## Required staging regressions

1. Fresh browser load: assert `runtime-config.js` has the intended non-secret API origin.
2. Assert `GET /api/auth/me` from the frontend client reaches the API and returns JSON 401 without a token—not HTML 200.
3. Login with a controlled staging identity; assert request URL, response envelope, and post-login authenticated GET.
4. Force token refresh in staging; assert refresh uses the same origin as login and updates the shared client's authorization header before retry.
5. Assert unknown browser routes still return SPA HTML, but `/api/*` never does.
6. Confirm CORS/TLS behavior for the chosen topology.

## QA finding update

This report supersedes the earlier wording that treated the port-3000 probes alone as proof that every frontend request was broken. The narrower, evidence-supported finding is: **the current served frontend's shared Axios configuration is misrouted; a separately observed absolute successful login does not reproduce against the current live assets and does not invalidate the current routing defect.**
