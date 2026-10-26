# SQL deployment runbook

Manual SSMS execution is outstanding. Select the intended database, run `backend/database/migrations/20261024_gst_compliance_snapshot_generation_foundation.sql`, then run `backend/database/migrations/20261024_gst_compliance_snapshot_generation_ssms_verification.sql` read-only.

The migration stops if duplicate active IRNs or E-Way Bill numbers exist. Resolve those records with an auditable business process; do not delete issued documents. It does not backfill snapshots. Recovery is to correct the prerequisite duplicate data or investigate the failed transaction, then rerun; no destructive rollback is supplied.

The application readiness evaluator is deployable independently of the SQL migration but cannot create snapshots until the business-approved invoice fields and confirmation transaction changes are deployed.

## Phase 2 active-snapshot hardening

After the 20261024 foundation has been applied and its verification has passed, run `backend/database/migrations/20261026_gst_compliance_snapshot_active_uniqueness.sql`, then the matching `_ssms_verification.sql` script read-only. The migration is additive and rerunnable. It first refuses deployment if a Sales Invoice already has more than one non-superseded snapshot, then adds `UX_GstComplianceSnapshots_Invoice_Active`.

It does not create, backfill, validate, or mutate snapshots; it does not alter `SalesInvoices`, `SalesInvoiceItems`, stock movements, or tax values. Resolve any preflight duplicate through an approved, auditable correction process before rerunning. No production or shared-staging execution occurred in this phase.
