# SQL deployment runbook

Manual SSMS execution is outstanding. Select the intended database, run `backend/database/migrations/20261024_gst_compliance_snapshot_generation_foundation.sql`, then run `backend/database/migrations/20261024_gst_compliance_snapshot_generation_ssms_verification.sql` read-only.

The migration stops if duplicate active IRNs or E-Way Bill numbers exist. Resolve those records with an auditable business process; do not delete issued documents. It does not backfill snapshots. Recovery is to correct the prerequisite duplicate data or investigate the failed transaction, then rerun; no destructive rollback is supplied.

The application readiness evaluator is deployable independently of the SQL migration but cannot create snapshots until the business-approved invoice fields and confirmation transaction changes are deployed.

## Phase 2 active-snapshot hardening

After the 20261024 foundation has been applied and its verification has passed, run `backend/database/migrations/20261026_gst_compliance_snapshot_active_uniqueness.sql`, then the matching `_ssms_verification.sql` script read-only. The migration is additive and rerunnable. It first refuses deployment if a Sales Invoice already has more than one non-superseded snapshot, then adds `UX_GstComplianceSnapshots_Invoice_Active`.

It does not create, backfill, validate, or mutate snapshots; it does not alter `SalesInvoices`, `SalesInvoiceItems`, stock movements, or tax values. Resolve any preflight duplicate through an approved, auditable correction process before rerunning. No production or shared-staging execution occurred in this phase.

### User-provided SSMS verification evidence

The user reported running the matching verification script on their SQL Server database. They reported `UX_GstComplianceSnapshots_Invoice_Active` with `is_unique = 1`, `has_filter = 1`, and filter `([Status]<>N'Superseded')`; the duplicate non-superseded snapshot query returned zero rows. This is user-provided evidence for that checked database and time, not an independent Codex execution. It confirms that superseded history remains permitted while a second active snapshot is rejected by the filtered unique index.

Automated disposable-SQL execution was not possible during finalization because Docker/SQL Server is unavailable on the verification host. Static review confirms the migration is rerunnable (`sys.indexes` guard), rejects pre-existing non-superseded duplicates before index creation, does not modify Sales/Inventory/Accounting data, and does not backfill snapshots. Run the clean-schema, ordered-migration, duplicate-active, superseded-history, preservation, and rerun scenarios in an approved disposable SQL Server environment before release.

## Phase 3 Sales GST capture migration

After the base Sales and GST-registration schemas, apply `backend/database/migrations/20261026_sales_invoice_issuer_gst_registration.sql`, then run its read-only `20261026_sales_invoice_issuer_gst_registration_verification.sql` script. The migration is additive: it does not backfill historical invoices or touch stock movements, invoice totals, or statutory generation. It uses explicit `CREATE OR ALTER` procedure definitions; it must not be replaced with dynamic procedure-text rewriting.

For repeatable lifecycle verification, populate an isolated database named `CosmosSalesGstIntegrationTests_<suffix>` with the required schemas/migrations and set `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` only for the test process. Run `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~SalesInvoiceGstSqlIntegrationTests" --no-restore`. Never point this variable at production or shared staging.

## Direct development database workflow — 26 October 2026

PR #174's guarded workflow was reviewed. It permits read-only inspection and reviewed, additive development migrations only on the owner-designated `CosmosERP_Staging` database on `srv1791248`; it explicitly forbids the disposable Sales GST lifecycle suite, test invoices, stock adjustments, production access, and statutory generation there.

Before any SQL work, inject either `COSMOS_DEVELOPMENT_SQL_CONNECTION_STRING` or `ConnectionStrings__CosmosDb` into the Codex host process. Do not add the value to source control, SSMS scripts, shell history, or command output. Run `backend/database/migrations/20261026_sales_invoice_gst_direct_development_preflight.sql` in SSMS. It is read-only and checks the selected database, server identity, effective login/database permissions, Phase 3 fields/constraint/foreign key/index, stored-procedure definition hashes, data integrity indicators, and (if permitted) backup history.

Only after the preflight confirms `CosmosERP_Staging`, the requested privileges, and recoverability should a reviewer approve running the additive `20261026_sales_invoice_issuer_gst_registration.sql` migration. Then execute `20261026_sales_invoice_issuer_gst_registration_verification.sql` and retain its output with the change record. Do not use the preflight or verification scripts as authority to create, confirm, cancel, or otherwise exercise business invoices.

### Actual execution evidence — 26 October 2026

The tracked application configuration was scrubbed of embedded connection, authentication, and provider tokens; `backend/src/Cosmos.API/appsettings.Development.example.json` now contains placeholders only. A supported environment-injected development SQL connection was not present in this Codex session. Consequently, no connection was opened, no server/database/permission/backup evidence was collected, no SQL object comparison against the deployed database occurred, no migration was applied, and no database record was changed. The old credential and non-database secrets must still be rotated/revoked by an authorized administrator because removing them from the working tree does not invalidate already exposed values or Git history.

### Trusted direct-SQL verification — 26 October 2026

After certificate remediation, Codex connected with `Encrypt=True`, `TrustServerCertificate=False`, and server-side `encrypt_option=TRUE`. The target was `srv1791248` / `CosmosERP_Staging`. The corrected Phase 3 preflight completed read-only: all Phase 3 fields, FK, filtered index, and check constraint are present/trusted; the three Sales procedure definitions and parameters match PR #173; invalid issuer references and incoherent capture fields are zero. No migration ledger exists, so this is deployed-object evidence rather than ledger evidence.

No database change was made. Do not interpret the result as recovery approval: the latest visible full-backup record is `2026-08-03T11:52:30`, and no isolated restore was tested. The current login is `sa`/sysadmin; use a separate approved migration identity before any direct SQL write. The disposable lifecycle suite remains blocked until an isolated `CosmosSalesGstIntegrationTests_*` database and dedicated test login are explicitly approved.
