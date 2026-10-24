# SQL deployment runbook

Manual SSMS execution is outstanding. Select the intended database, run `backend/database/migrations/20261024_gst_compliance_snapshot_generation_foundation.sql`, then run `backend/database/migrations/20261024_gst_compliance_snapshot_generation_ssms_verification.sql` read-only.

The migration stops if duplicate active IRNs or E-Way Bill numbers exist. Resolve those records with an auditable business process; do not delete issued documents. It does not backfill snapshots. Recovery is to correct the prerequisite duplicate data or investigate the failed transaction, then rerun; no destructive rollback is supplied.

The application readiness evaluator is deployable independently of the SQL migration but cannot create snapshots until the business-approved invoice fields and confirmation transaction changes are deployed.
