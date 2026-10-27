# GST Phase 4 increment 1 — Company/Branch scope execution report

Date: 2026-10-27. Branch: `feature/gst-phase4-company-branch-scope`, based on `origin/main` commit `9af5b47`.

## Approved ownership contract implemented in source

- `Companies` is the shared legal-entity master and `Branches` is a company-owned master; neither is a manufacturing-configuration surrogate.
- `UserCompanyBranchScopes` is an active, audited user assignment. A null branch assignment grants the company level and its branches; a branch assignment grants only that branch. The protected System Owner bypass is explicit in the database scope procedure.
- Sales invoices gain nullable `CompanyId` and `BranchId`. Existing rows are intentionally not backfilled. New create/update contracts require `CompanyId`; `BranchId` is optional.
- A selected GST registration must be active and match the same company and exact branch scope. This is selection validation only; no calculation, statutory snapshot, E-Invoice, E-Way Bill, or GSTZen action is enabled.
- Service-layer checks are applied before read-by-id, create, update, confirm, cancel, payments, and GST eligibility. Cross-scope individual reads use the existing not-found response to avoid confirming a record exists. Legacy unscoped invoices are System Owner-only until an approved remediation process exists.

## Migration

`backend/database/migrations/20261027_30_company_branch_scope.sql` is forward-only and additive. It creates the master and assignment tables, branch/company foreign keys, invoice and registration links, indexes, and `sp_CompanyBranchScope_CanAccess`.

It changes only `sp_SalesInvoice_Create` and `sp_SalesInvoice_Update` after checking their deployed Phase 3 signatures. The script fails closed if the expected procedure revision is absent. It does not update existing invoices, registrations, stock, totals, or statutory records.

## Actual direct SQL evidence (read-only)

- Connection used the securely injected development connection string; value was not displayed.
- Server/database: `srv1791248` / `CosmosERP_Staging`.
- The login has `ALTER` on the database.
- Current staging has two Sales invoices, no canonical company/branch tables or Sales invoice scope columns, and zero GST registrations.
- A recent full backup is available. This confirms backup existence only; it is not a restore test performed in this increment.
- No SQL schema, data, permissions, backups, or configuration were modified during this increment.

## Verification

Passed locally:

```powershell
dotnet restore backend/src/Cosmos.API/Cosmos.API.csproj
dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore
```

The build completed successfully (seven pre-existing dependency/vulnerability warnings).

Not run:

- `SalesInvoiceGstSqlIntegrationTests`: `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` is absent from this Codex process. The migration was therefore not applied to retained staging, and no lifecycle test was run there.
- Cross-company/cross-branch SQL integration cases and frontend administration screens remain pending the disposable connection and the master-management API/UI increment.

## Required next controlled step

Inject a certificate-validated connection string for the existing `CosmosSalesGstIntegrationTests_Local` database as `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING`. Apply this migration there, run the Sales/GST lifecycle suite plus added scope cases, review results, then separately approve the guarded staging migration. Do not run lifecycle tests against `CosmosERP_Staging`.
