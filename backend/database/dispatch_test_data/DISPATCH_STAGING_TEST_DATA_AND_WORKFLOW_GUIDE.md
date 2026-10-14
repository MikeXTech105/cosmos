# Dispatch staging test scenario

Target: `srv1791248` / `CosmosERP_Staging`; prefix: `DSPSTG20261014`. Seed creates only active master data and three committed input batches. It does not create runs, recommendations, allocations, or shipments.

Expected inputs: sales A=10/B=20; stock A=2/B=1; inbound A=3 status 2 (eligible), B=9 status 1 (excluded). The configured setting uses factor 1, safety .1, box size 6 and round-up. Expected calculation: A shortage 6 → 6; B shortage 21 → 24. Company stock is 20, so priority allocation is expected to allocate A=6 then B=14.

## UI workflow

1. In **Dispatch Planning → Imports** (`/dispatch/imports`), filter channel `DSPSTG20261014`; verify committed Sales, Warehouse Stock, and Inbound batches.
2. In **Dispatch Planning → Runs** (`/dispatch/runs`), create a new run for date `2026-10-07`, selecting those three batches. Use a note beginning `DSPSTG20261014`.
3. Calculate, inspect recommendations, optionally override while Calculated, Allocate, then Finalize. The backend endpoints are `/api/v1/dispatch-planning/imports/*` and `/api/v1/dispatch-planning/runs/*`.
4. Check results in **Dispatch Planning → Reports** (`/dispatch/reports`). These are expected results until UI/API execution is observed.

## SSMS order

1. Run `dispatch_staging_schema_preflight.sql` (read-only).
2. After approval, run `dispatch_staging_test_data_seed.sql` once.
3. Run `dispatch_staging_test_data_verify.sql` (read-only).
4. Use the UI. Cleanup refuses once a scenario run exists; do not directly remove finalized/audited records.
