# COSMOS ERP — QA Remediation Plan

## P0 — urgent security

1. Rotate all secrets present in tracked configuration and move them to deployment-managed secret storage (SEC-001). Coordinate database, JWT, and GST integration owners; rotation can invalidate sessions/integrations, so verify planned rollback and service restart procedures before release.

## P1 — major functionality and deployment

1. Correct frontend API routing (INT-001). First validate in staging: runtime config, CORS origin, proxy behavior, login, token refresh, and one list page from each major module.
2. Enable TLS and HTTP redirect (SEC-002). Coordinate certificate/reverse-proxy changes with API and frontend routing validation.
3. Upgrade the vulnerable OpenAPI dependency (SEC-003), then run restore/build/tests and Swagger smoke checks.

## P2 — controlled integration completion

1. Supply designated least-privileged audit accounts and a controlled staging dataset.
2. Execute the service-by-service contract matrix and authorization/data-scope matrix.
3. Verify dispatch/procurement formulas and finalization behavior in staging with read-only DB reconciliation.
4. Run frontend lint/build/Vitest and add the missing browser contract test.

## P3 — deferred/public and technical debt

1. When the public website resumes, diagnose OOS-001 from server correlation IDs and stored-procedure compatibility.
2. Review unconsumed endpoints/obsolete artifacts after live functionality is stable; do not remove them based solely on this audit.

## Safe rollout gates

- No production deployment until P0 and P1 acceptance criteria pass in staging.
- Use a rollback-capable configuration deployment for routing/TLS changes.
- Do not run migrations or transaction tests on production as part of QA.
- Sign off only after exact browser/API evidence is attached for each P0/P1 acceptance criterion.
