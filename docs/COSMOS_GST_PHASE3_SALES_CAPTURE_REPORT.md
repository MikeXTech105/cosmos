# Cosmos ERP — GST Phase 3 Sales Capture Report

## Status — 26 October 2026

**Implemented and unit-tested:** explicit issuer-registration selection, nullable place-of-supply review capture, and nullable inclusive/exclusive price-basis capture for Sales drafts. Historical invoices are unchanged and remain nullable.

**Pending approval / deliberately inactive:** replacement of the legacy client-supplied Sales tax percentage, GST engine invocation for authoritative invoices, immutable confirmation snapshots, and GSTZen generation.

## Compatibility boundary

Sales continues to use its existing create/update/confirm/cancel stored procedures, aggregate totals, tax percentage and stock movement behavior. The new capture fields are additive and are not used to determine persisted Sales tax, so no unapproved GST policy has changed an invoice total.

`CompanyGstRegistrationId` is validated as active. Draft procedures alone can change it because the existing update procedure only allows draft invoices. Existing Sales permissions do not establish company/branch record scope; this remains a statutory-readiness blocker.

Place of supply is user-reviewed capture only: `PlaceOfSupplyStateCode` requires a two-digit normalized code and `PlaceOfSupplySource` records the stated basis. It is not derived automatically from billing or shipping data and cannot select CGST/SGST/IGST components. Price basis likewise preserves explicit user intent only until an approved GST calculation policy is activated.

## Proposed discount policy

`ProportionalInvoiceDiscountAllocator` implements the owner-selected proportional allocation formula in isolated unit tests only. It rounds each allocation to two decimal places, assigns the remainder deterministically to the final eligible line, and reconciles exactly to the input discount. It is not called by Sales persistence.

## SQL deployment

Run after the base schema, GST registration module, and Phase 1/2 HSN-GST migrations:

1. `backend/database/migrations/20261026_sales_invoice_issuer_gst_registration.sql`
2. `backend/database/migrations/20261026_sales_invoice_issuer_gst_registration_verification.sql`

The migration is additive, does not backfill invoices, and replaces the unsafe dynamic stored-procedure text rewriting with explicit `CREATE OR ALTER` bodies. Execute and review it only in a disposable/test database first; no SQL execution was performed by Codex.

## Evidence

- `dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~Sales|FullyQualifiedName~Gst" --no-restore`: **PASS — 49 passed**.
- `dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore`: **PASS — 0 errors**.

## SQL lifecycle integration coverage

`SalesInvoiceGstSqlIntegrationTests` is an opt-in, repository/Dapper/stored-procedure lifecycle suite. It requires `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` and rejects any database whose name does not start with `CosmosSalesGstIntegrationTests_`. It creates only `ITGSTP3_` synthetic fixtures, exercises draft create/update, confirm stock deduction, confirmed-update rejection and cancel stock restoration, then removes those fixtures in `finally`.

It was **not executed** in this environment because the required disposable SQL Server connection string was not configured. The project owner separately reported SSMS evidence that all four nullable Sales context columns, the issuer FK and filtered issuer index exist, invalid issuer references return no rows, and historical invoice IDs 1 and 2 retain null GST context. That is user-provided database evidence, not a Codex-run integration test.

## Direct development verification attempt — 26 October 2026

The direct-SQL policy was reviewed and the Phase 3 branch was pushed at `e0fc301`. Neither approved injected development connection variable was available to the execution process. No fallback to a formerly tracked connection value was attempted. Therefore no direct connection, server/database identity check, permissions check, backup/recovery check, SQL-definition comparison, migration, or database mutation occurred. The [read-only preflight](../backend/database/migrations/20261026_sales_invoice_gst_direct_development_preflight.sql) must be run first when a secure injected connection is available; a non-destructive migration still requires its evidence and explicit approval.

### Final direct verification — 26 October 2026

Certificate-validated direct SQL verification now passed against `srv1791248` / `CosmosERP_Staging`. PR #173's four nullable header fields, FK, filtered issuer index, price-basis constraint, and `Create`/`Update`/`GetById` procedure bodies and signatures are deployed and match source. The two retained non-deleted invoices still have null issuer, place-of-supply, and price-basis capture; no automatic backfill occurred. `EInvoices`, `EWayBills`, compliance snapshots, generation requests, and generation attempts all contain zero records. This confirms the intended capture-only boundary, not statutory readiness.

The lifecycle suite was not run: no isolated `CosmosSalesGstIntegrationTests_*` database exists, and the available `sa`/sysadmin connection is prohibited for automated test setup. Its prerequisites are the base Sales schema/TVP and procedures, GST-registration schema, Phase 3 migration, plus empty synthetic-only storage. Creating that database or its restricted login requires explicit approval, storage confirmation, and a disposable cleanup plan.

## Remaining gates

- Approved state-code master / lookup data and statutory place-of-supply determination rules.
- Finance/GST approval of component rules, inclusive/exclusive calculation sequence, discount eligibility and rounding.
- Approved immutable confirmation snapshot and correction/supersession workflow.
- Company/branch/registration authorization scope.
- SQL integration evidence and GSTZen sandbox/provider contract verification.
