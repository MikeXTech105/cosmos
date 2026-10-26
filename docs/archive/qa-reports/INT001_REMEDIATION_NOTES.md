# INT-001 Remediation Notes

## Files changed

- `frontend/Dockerfile` — installs the existing runtime-config entrypoint script in the final Nginx image.
- `docker-compose.yml` — requires `COSMOS_API_BASE_URL` and passes it to the frontend container as `API_BASE_URL`.
- `frontend/docker/40-cosmos-runtime-config.sh` — writes `API_BASE_URL` only when the runtime setting is present; otherwise permits a build-time fallback.
- `frontend/src/config/runtimeConfig.js` — validates/normalizes the API origin and rejects an empty production configuration before API calls can be made.
- `frontend/src/services/sessionService.js` — now uses the same config and endpoint composition helper as the shared client.
- `frontend/.env` and `.env.example` — remove the live IP from tracked development configuration and document local-only use.
- `frontend/src/config/runtimeConfig.test.js`, `frontend/src/api/axios.test.js`, `frontend/src/services/sessionService.test.js` — routing and refresh regressions.

## Chosen approach and required setting

The container's existing runtime script is now active through the official Nginx entrypoint directory. The Compose deployment maps `COSMOS_API_BASE_URL` to the container's non-secret `API_BASE_URL`; set it to:

```text
API_BASE_URL=https://approved-api-host.example
```

An origin with an optional trailing `/api` is accepted and normalized to the origin, because client endpoint constants already start with `/api/`. Do not provide arbitrary path prefixes, query strings, fragments, credentials, tokens, or secrets. For local Vite development only, `VITE_API_BASE_URL` may be set to an HTTP(S) API origin (for example `http://localhost:8080`).

In non-development builds, an absent/invalid API origin displays the existing runtime-configuration gate instead of silently issuing frontend-origin API calls.

## Deployment and staging steps

1. Set `COSMOS_API_BASE_URL` in the staging deployment environment to the approved staging API origin.
2. Build a new frontend container image; the Dockerfile change is required for runtime injection.
3. Deploy it to staging with the configured environment value.
4. Restart/recreate only the staging frontend container so the entrypoint regenerates `runtime-config.js`.
5. In a fresh browser, confirm `runtime-config.js` has the configured origin and `/api/auth/me` returns API JSON 401 without a token.
6. Using a controlled staging identity, test login, an authenticated list read, an expired-token refresh/retry, logout, and a hard refresh.
7. Confirm `/api/*` never returns SPA HTML while unknown UI routes still do.

## Rollback

Re-deploy the prior frontend image/configuration. If the new image is retained, restore the previous valid `API_BASE_URL` value and recreate the frontend container. Do not roll back backend/database components; this fix changes only frontend routing/configuration.

## Remaining limitations

No production deployment/restart was performed. The runtime setting and refresh flow require staging verification with controlled credentials. The public website remains out of scope, and no Nginx API proxy was added.
