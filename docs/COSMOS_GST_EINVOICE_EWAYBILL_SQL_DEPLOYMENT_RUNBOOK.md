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

## Current COSMOS development SQL execution policy (2026-10-26)

The project owner designated `CosmosERP_Staging` on the Hostinger SQL Server as the **development/integration** database. Codex reported successful encrypted authentication and a read-only query against that database. This establishes **read access only**; privileges for applying migration scripts remain to be tested safely. See [operations: Codex direct SQL workflow](OPERATIONS.md#codex-direct-sql-server-development-workflow-adopted-2026-10-26).

For subsequent GST work, Codex must directly inspect current SQL objects on this database, write and commit explicit versioned migrations and read-only verification scripts, then apply reviewed, bounded, non-destructive *development* migrations only after target verification and recovery checks. It must record actual execution evidence and keep Git source and deployed SQL synchronized.

`CosmosERP_Staging` contains retained business data: do **not** run the `SalesInvoiceGstSqlIntegrationTests` suite against it, bypass its disposable-database name guard, or create/confirm/cancel test invoices or stock adjustments without a separately approved isolated plan. The disposable suite still requires a separate `CosmosSalesGstIntegrationTests_*` database and `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING`.

The presence of GST columns/indexes in user-run SSMS verification is not evidence that the full SQL Sales lifecycle was tested. Tax policy approval, immutable compliance snapshots and GSTZen reconciliation remain outstanding; legal E-Invoice/E-Way Bill generation remains blocked. Rotate the committed SQL credential before granting broader automation privileges.

## Phase 4 Company/Branch master safety migrations (2026-10-28)

Apply `20261027_30_company_branch_scope.sql`, `20261027_31_company_branch_scope_permission.sql`, `20261027_32_company_branch_master_procedures.sql`, `20261027_33_company_branch_master_scope_authorization.sql`, and `20261028_34_company_branch_safe_deactivation.sql` in order to an approved target after standard preflight and recovery checks. Each is forward-only and rerunnable. The final migration blocks unsafe deactivation where active branches, registrations, scope assignments, or draft Sales invoices would otherwise leave an operationally inconsistent master.

These migrations have been applied and rerun only on `CosmosSalesGstIntegrationTests_Local`. They have **not** been applied to `CosmosERP_Staging`. Do not run the disposable lifecycle suite on staging. No migration here enables tax calculation, immutable statutory snapshots, E-Invoice, E-Way Bill, or GSTZen generation.
