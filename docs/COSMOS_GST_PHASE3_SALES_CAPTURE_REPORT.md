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

## Remaining gates

- Approved state-code master / lookup data and statutory place-of-supply determination rules.
- Finance/GST approval of component rules, inclusive/exclusive calculation sequence, discount eligibility and rounding.
- Approved immutable confirmation snapshot and correction/supersession workflow.
- Company/branch/registration authorization scope.
- SQL integration evidence and GSTZen sandbox/provider contract verification.
