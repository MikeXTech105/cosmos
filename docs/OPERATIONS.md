# COSMOS — Operations, Deployment and Data Safety
**Reviewed:** 2026-10-26 · **Scope:** Guidance from repository configuration and deployment records; not a verified production runbook.

## Environments
Use distinct local, disposable test, staging and production configurations. Do not run destructive `000_Reset_Database.sql` or staging cleanup on an existing business database. Obtain a tested backup/restore path and explicit approval for production-like changes.

## Docker and CI/CD
- Root `docker-compose.yml` currently publishes frontend `3000:80` and API `8080:8080`; security review is required before using that shape publicly.
- `.github/workflows/deploy.yml` triggers on pushes to `deploy` but its server script runs `git pull origin main`. Fix/verify release identity before trusting an automatic deploy.
- Production requires a TLS-terminating trusted reverse proxy, correct frontend `API_BASE_URL` or `/api` proxy routing, secure forwarded header configuration, and stable uploaded-media volumes.
- Existing technical guidance: [reverse-proxy uploads](../backend/docs/REVERSE_PROXY_UPLOAD_CONFIGURATION.md).

## Secrets — required remediation
Do not store System Owner bootstrap passwords, DB connection strings, JWT signing keys or provider tokens in tracked config. Prior audits identified sensitive values, and Compose still contains a literal System Owner password. Rotate affected values, inject at deploy time, minimize permissions, and scan full Git history. Remove values from current files **only after** deployment configuration is ready; deleting HEAD does not invalidate already-compromised credentials.

## SQL deployment
1. Backup and validate restore.
2. Identify current applied migrations and expected dependencies.
3. Execute only approved ordered scripts for target environment.
4. Run verification and transactional smoke tests; confirm permission seeds and stored procedures.
5. Start API and run authenticated smoke checks.
6. Test rollback with documented application/data recovery boundaries.

Read [database setup](../backend/database/DATABASE_SETUP_README.md), [System Owner bootstrap](../backend/docs/SYSTEM_OWNER.md), [staging cleanup](../backend/docs/STAGING_DATABASE_CLEANUP.md) and [GST deployment runbook](COSMOS_GST_EINVOICE_EWAYBILL_SQL_DEPLOYMENT_RUNBOOK.md). The historical `002_Verify_Database_Setup.sql` placeholder must not serve as an operational gate.

## Minimum checks
```bash
dotnet restore backend/Cosmos.slnx
dotnet build backend/Cosmos.slnx --no-restore
dotnet test backend/Cosmos.slnx --no-build
cd frontend
npm ci
npm run lint
npm test
npm run build
```
These are example commands; their successful execution in a real environment is **not asserted** by this document.

## Observability
Use correlation IDs to link API errors to Serilog request telemetry; use centralized Activity Logs for business/security actions rather than persisting every HTTP request. Restrict access to both.

## Codex direct SQL Server development workflow (adopted 2026-10-26)

**Environment role:** `CosmosERP_Staging` on Hostinger SQL Server (`srv1791248`) is the project owner's designated **development/integration** database. Do not infer that it is disposable or equivalent to production. It contains retained data. Prior Codex evidence confirms **encrypted authentication and a successful read-only query**; it does **not** prove DDL/DML privileges or authorize unrestricted mutations.

**Default development workflow (for every future Codex prompt touching SQL):**
1. Read current Git branch, module contracts, existing SQL migrations/procedures, and this runbook. Connect securely with a **secret-injected** connection string, explicitly verify `DB_NAME() = 'CosmosERP_Staging'`, server identity, schema prerequisites and current migration state; never echo secrets.
2. Use read-only metadata and SELECT queries first. Compare existing schema/procedure definitions to the intended changes. Review impact on dependent Dapper contracts, business data, foreign keys, stock/accounting and other modules.
3. Create/review a **versioned forward-only SQL migration in Git** and a **read-only verification script**. Use explicit `CREATE OR ALTER PROCEDURE` definitions; never make the deployed staging schema the only record of a change. Design transactional/data-safe changes and rerunnable guards where appropriate.
4. For ordinary **non-destructive, explicitly scoped development schema changes**, Codex may apply the reviewed migration directly to the designated development database, **after** verifying target DB and privileges, recording pre-change state, checking backup/recovery readiness, and evaluating impact. For a risky or ambiguous operation, request owner approval before execution.
5. After execution, query affected metadata and sample records, execute safe smoke/regression checks, and record migration identifier, environment, execution result and observed schema state in the relevant canonical module documents/PR. Confirm corresponding application build/tests.
6. Keep production and any other databases out of scope without separate explicit authorization. Never promote staging credentials, results or apparent access into production authority.

**Protected operations:** No unapproved `DROP`, `TRUNCATE`, mass `DELETE`/`UPDATE`, reset, data backfill, financial/tax rewrite, irreversible or table-rebuilding alteration, credential/security change, bulk seed, or live statutory GSTZen generation. No tests that create/cancel invoices or alter stock/wallet/accounting in the retained staging dataset by default; use a disposable isolated database for destructive/concurrency/lifecycle suites, or an owner-approved strictly bounded transaction/fixture plan with verified cleanup and backup. A database name guard for disposable tests must **never** be bypassed or pointed at `CosmosERP_Staging`.

**Security priority:** Codex reported that a database credential is committed in `backend/src/Cosmos.API/appsettings.json`. Treat this as exposed: rotate the credential, remove it from tracked configuration, inject it securely via environment or secret manager, and restrict the SQL login to required database permissions. Check deployment impact before editing secrets. **Never copy the secret into documentation, tool output, logs, test results or PRs.**

**Evidence levels:** `read-only connected` ≠ `DDL/DML access verified` ≠ `migration executed` ≠ `end-to-end SQL integration passed`. Record each distinctly. Direct staging access does not satisfy a disposable-database test that explicitly refuses `CosmosERP_Staging`.
