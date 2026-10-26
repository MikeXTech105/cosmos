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
