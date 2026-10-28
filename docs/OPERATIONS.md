# COSMOS — Operations, Deployment and Data Safety
**Reviewed:** 2026-10-28 · **Scope:** Guidance from repository configuration and deployment records; not a verified production runbook.

## Environments
Use distinct local, disposable test, staging and production configurations. Do not run destructive `000_Reset_Database.sql` or staging cleanup on an existing business database. Obtain a tested backup/restore path and explicit approval for production-like changes.

## Complete brief verification — 28 October

The user requested scripts to execute later. No company database or disposable SQL integration database was opened by this implementation session. [Test-CompleteImplementation.ps1](../backend/scripts/Test-CompleteImplementation.ps1) restores/builds the .NET solution, runs non-SQL tests and frontend test/lint/build, then bootstraps and tests four strictly guarded SQL families (Production, Sales GST, Dispatch and HR).

On a PC with .NET 10 SDK, Node dependencies (`npm ci` in `frontend/` when missing) and Microsoft SQL Server LocalDB installed, run from the repository root:

```powershell
./backend/scripts/Test-CompleteImplementation.ps1 -UseLocalDb
```

The runner creates a private GUID-named LocalDB instance and distinct fresh/upgrade catalogs with suite-specific `Cosmos*IntegrationTests_` prefixes. It applies `001_Full_Database_Setup.sql`, `003_gst_integration_module.sql` and ordered applicable migrations; never a reset. Upgrade mode first installs the predecessor schema, inserts a labelled linked Unit/Category/Item/StockMovement sentinel at `12.345678`, applies the eight `20261028_*` migrations and repeats the new and production baseline migrations. The sentinel verifies retained references and quantities. This does not replace migration testing against a restored representative company backup.

LocalDB and catalogs are retained for inspection; the owned instance is stopped after the run. Logs, TRX and `results.json` go under `output/implementation-verification/operator-<timestamp>/`. The runner rejects existing catalogs unless an explicit low-level reuse flag is supplied, checks `DB_NAME()` around every batch, rejects database-switch/server-control migration batches, and fails when required SQL tests are skipped or zero tests execute. Do not treat exit 2 (missing SQL environment) as a pass.

For a separate SQL Server, configure **process environment privately**, with a different empty catalog for every suite and mode. Run `-Mode Fresh` and `-Mode Upgrade` separately; `Both` requires automatic private LocalDB catalogs. The bootstrap identity needs permission to create only these test databases. Never reuse a retained company catalog or send credentials in chat.

| Suite | Private variable | Required catalog prefix |
|---|---|---|
| Production | `COSMOS_PRODUCTION_INTEGRATION_CONNECTION_STRING` | `CosmosProductionIntegrationTests_` |
| Sales GST | `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` | `CosmosSalesGstIntegrationTests_` |
| Dispatch | `COSMOS_DISPATCH_INTEGRATION_CONNECTION_STRING` | `CosmosDispatchIntegrationTests_` |
| HR | `COSMOS_HR_INTEGRATION_CONNECTION_STRING` | `CosmosHrIntegrationTests_` |

HR SQL fixtures require zero active staff initially and seed labelled synthetic employees. The snapshot suite retains immutable labelled source/snapshot evidence in its disposable catalog. Do not disable triggers or delete history to clean up tests. SQL fixture and provider tests do not issue legal invoices or send payroll payments.

Review the [migration manifest](../output/implementation-verification/migration-manifest.json), [HR setup contract](../backend/docs/HR_OPERATOR_SETUP.md) and [GST provider/policy handoff](COMMERCE_GST_PROVIDER_AND_VERIFICATION_HANDOFF.md) before deployment. Apply migrations only through the target environment's approved backup/change process. No down script can safely reverse retained posted history; test application rollback/schema compatibility and a representative backup restore separately. Live ordinary-role isolation, provider sandbox checks, tax policy approval and end-to-end stock/cash/payroll reconciliation remain release gates.

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

### Direct development SQL workflow

`CosmosERP_Staging` on `srv1791248` is the owner-designated retained development/integration database, not a disposable test target. Access must use an environment-injected `COSMOS_DEVELOPMENT_SQL_CONNECTION_STRING` or `ConnectionStrings__CosmosDb`; never restore an old tracked value or log a credential. Start with the read-only [Phase 3 preflight](../backend/database/migrations/20261026_sales_invoice_gst_direct_development_preflight.sql), retain its evidence, verify recovery readiness, and obtain approval before any change. Bounded, non-destructive, versioned migrations may then be applied directly and verified afterward.

Never run `SalesInvoiceGstSqlIntegrationTests`, create test invoices, or mutate stock/business data against this retained database. That suite remains limited to an isolated `CosmosSalesGstIntegrationTests_*` database. Production access and statutory GST generation remain out of scope.

### Direct-SQL evidence — 26 October 2026

The certificate-validated development connection reached `srv1791248` / `CosmosERP_Staging` with SQL reporting encrypted transport. The configured login is `sa`, a sysadmin and `db_owner` with `ALTER`, `CONTROL`, backup, and database-creation privileges. It must not remain the automation identity. Provision separate least-privilege accounts: read-only catalog inspection; an approved migration account limited to the intended development database; and an isolated-test account limited to `CosmosSalesGstIntegrationTests_*` databases.

On 27 October 2026 an approved non-overwriting `COPY_ONLY` full backup of retained staging completed with checksum and compression. `RESTORE VERIFYONLY ... WITH CHECKSUM` and `DBCC CHECKDB` passed after restoring it to the retained isolated database `CosmosERP_Staging_RestoreVerify_19103a663729477a8c47aec03f97eb3d`. Do not drop that evidence database without separate approval. This validates a specific backup's physical restore, not end-to-end application recovery or an RPO/RTO commitment.

Separate identities now exist: `cosmos_sql_inspector` (catalog/state plus narrow Sales/GST reads), `cosmos_dev_migrator` (approved development DDL), and `cosmos_gst_test` (denied retained staging and scoped to `CosmosSalesGstIntegrationTests_Local`). Store rotated credentials in an approved secret manager; no credentials are committed. The latter database is schema-only and retained for synthetic lifecycle tests. Its completed 1/1 test run must never be redirected to retained staging or production.

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
