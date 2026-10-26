# COSMOS ERP — Repository Audit (2026-10-26)

## Scope and evidence
Read-only inspection of GitHub `main` at commit `bfb23e522d76020fe8c2b5c3121db5cca5b53460`, plus selected source, configuration, progress and QA reports. Git tree contains 1,788 tracked files. **No build, test suite, SQL migration, live endpoint or deployment was executed in this audit.** Findings below distinguish source-confirmed observations from prior audit reports.

## Project status
- Backend: .NET 10 layered API, Dapper/stored procedure SQL Server persistence, JWT/RBAC, module Swagger.
- Frontend: React/Vite source is present (not a placeholder).
- Core ERP: parties, items/masters, sales, purchase/expenses, stock reporting, HR, dashboard/reporting, GST, Rojmel.
- Extended functionality evidenced in source/migrations: supply-chain foundation, procurement/dispatch planning, shipment operations, Data Book, Activity Logs, Website Management, Manufacturing BOM/production, HSN/GST foundations.
- Latest merged `main` commit on 2026-10-24 is PR #161 (E-Way Bill). A merger is **not proof of statutory provider readiness**.
- Activity Logs implementation is documented in `backend/docs/ACTIVITY_LOGS_MODULE.md` and migration `20260810_activity_logs_module.sql`.
- Website module is documented and migration `20260813_website_management_module.sql` exists.
- Manufacturing migration `20260921_manufacturing_module.sql` and later BOM unification migration `20261006_unify_procurement_with_manufacturing_boms.sql` exist.
- HSN/GST code and migrations through 2026-10-24 exist; the GST remediation document explicitly says server-side compliant generation remains blocked awaiting complete historical document snapshots and policy/provider decisions.

## Findings

### P0 — Tracked secrets and unsafe example credentials
- `backend/src/Cosmos.API/appsettings.json` is tracked. The October 9 QA audit identifies committed DB/JWT/GST credentials.
- Root `docker-compose.yml` contains a literal System Owner bootstrap password and sets `ASPNETCORE_ENVIRONMENT: Development`.
- `frontend/.env` is tracked. Review its values and deployment dependency before replacing with `.env.example`; do not assume it contains a secret or is safe to delete without inspection.
- **Action:** rotate credentials/signing keys/provider tokens, replace literals with required injected environment values, separate dev/prod compose overrides, deploy via secrets, and add secret scanning. Removing a file from the current branch does not purge Git history.

### P0 — Deployment correctness and transport
- `.github/workflows/deploy.yml` triggers on pushes to `deploy` but SSH command executes `git pull origin main`; deployment does not necessarily deploy the triggering commit. Pin deployment to an explicit ref/SHA or make trigger and checkout consistent.
- `docker-compose.yml` publishes API port 8080 and frontend port 3000. Earlier October 9 integrated QA reports an HTTP-only host, and a frontend SPA/API route mismatch. Verify whether later remediation has actually been deployed.
- Require TLS reverse proxy, validate forwarded headers only from trusted proxies, disallow Development configuration on live deployment.

### P1 — Database and production-verification gates
- `backend/database/002_Verify_Database_Setup.sql` is a 3-byte placeholder; do not treat it as verification.
- Numerous ordered migrations through October 24 exist; the main repo tree does not establish which ran on staging/production.
- Run fresh DB provisioning, additive migration path, smoke tests, role-scoping, stock accounting and rollback checks against disposable SQL Server, then separately verify staging.
- Do **not** delete reset, migration, smoke-test, seed or remediation files without dependency/reference analysis.

### P1 — GST legal workflow deliberately blocked
- `docs/COSMOS_GST_EINVOICE_EWAYBILL_MASTER_REMEDIATION_REPORT.md` states generation endpoints return HTTP 409 `GST_SERVER_GENERATION_NOT_AVAILABLE` while compliant document snapshot building and reconciliation are missing. Treat this as a deliberate safety block, not completed live E-Invoice/E-Way Bill generation.
- Validate statutory seller/buyer identity, place of supply, line-tax snapshots, transport details, idempotency, reconciliation and provider rules before enabling.

### P1 — Documentation drift
- `docs/PROJECT_PROGRESS.md` is a large historical ledger whose last section documents older Data Book work; `backend/docs/PROJECT_PROGRESS.md` has newer manufacturing/website updates but is not a current whole-system release tracker.
- `backend/FEATURE_INVENTORY.md` and `backend/TECHNICAL_DEBT.md` include historical claims and should be revalidated rather than read as a current snapshot.
- Create a dated current-status index and retain archival documents until citations/references are mapped.

### P2 — Repository hygiene candidates
- Tracked runtime/smoke logs: `backend/artifacts/swagger-smoke.err.log`, `backend/artifacts/swagger-smoke.out.log`, `tmp/handbook/server.log`, `tmp/handbook/server-error.log`. Generated logs should be ignored rather than versioned; verify no canonical fixtures rely on them.
- `tmp/handbook`, `output/*`, and `qa-reports/dispatch-excel-*` contain generated/documentary assets. Review ownership and external links before archiving, **not** indiscriminate deletion.
- Root `.gitignore` is sparse; add precise ignores for ephemeral logs, local secrets and generated build output while retaining intentional fixtures/doc deliverables.
- `payment_invoice (77).pdf` and `invoice-reference.png` are root-level reference assets; confirm whether needed for testing and whether any personal/client data is present before deciding retention.

## Recommended release gate
1. Secret rotation and verified configuration hygiene.
2. Align deployment trigger/checkout; HTTPS endpoint and frontend API routing live smoke.
3. Run current backend/frontend builds, automated suites, static analysis, dependency audit.
4. Verify SQL migrations and module integration on disposable then staging DB.
5. Verify API envelopes, required-field validation, permissions, reporting, stock/ledger consistency.
6. Verify GST legal snapshots and provider end-to-end before unblocking generation.
7. Reconcile two progress documents and archive superseded generated reports only after reference review.

## Changes in this branch
This report and progress-status notes are informational. The working `main` branch is unchanged. Files should only be removed when they are proven unused and non-sensitive, preferably in a separately reviewable cleanup pull request.
