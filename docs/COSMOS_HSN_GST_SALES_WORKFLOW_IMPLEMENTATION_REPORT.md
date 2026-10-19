# Cosmos ERP — HSN/SAC Item and Sales Workflow Report

## Delivered scope

- Item Master edit now resolves the effective HSN/SAC on the current date, labels its source (`Product override`, `Category default`, or missing), searches active master records by code/type/description, and saves a dated product override through the existing Phase 1 API. Existing API authorization and audit behaviour remain authoritative.
- The Sales invoice editor resolves the selected item's effective classification and displays the HSN/SAC code and source in the line grid. No tax percentage is derived from HSN/SAC.
- Newly created or updated **draft** Sales invoice lines snapshot the effective product override or category default HSN/SAC in the same database transaction. They fall back to the existing legacy `Items.HSNCode` only if no effective Phase 1 mapping exists. Confirmed and cancelled invoices are not updated or recalculated.
- Existing invoice templates already render the stored HSN/SAC snapshot when present, so output uses the same draft snapshot after it is saved.

## Migration and manual verification

Apply, after the two Phase 1 mapping migrations:

1. `backend/database/migrations/20261019_sales_hsn_draft_snapshot.sql`
2. `backend/database/migrations/20261019_sales_hsn_draft_snapshot_ssms_verification.sql` in SSMS.

The migration replaces only the two Sales draft-save procedure definitions and is rerun-safe. It locates the `CREATE` and `PROCEDURE` keywords in each stored definition and rewrites that header to `ALTER PROCEDURE` before execution, including deployments with legacy headers or spacing variations. It does not alter tables, historical records, invoice numbering, confirmation stock deduction, or cancellation stock restoration. The verification script is read-only and should show `PASS` for both procedure definitions, followed by recent line snapshots. Staging was not accessed or verified.

## Tests run locally

| Command | Result |
| --- | --- |
| `npm test -- --run src/pages/sales/invoices/invoiceHelpers.test.js src/pages/inventory/items/itemHelpers.test.js src/services/gst/hsnGstService.test.js src/pages/gst/hsnGstHelpers.test.js` | PASS — 12 tests |
| Targeted ESLint for changed frontend files | PASS |
| `npm run build` | PASS |
| `dotnet test ...SalesCalculationServiceTests|...GstCalculationEngineTests|...HsnGstValidatorTests --no-restore` | PASS — 17 tests |
| `dotnet build src/Cosmos.API/Cosmos.API.csproj --no-restore` | PASS; existing NU1903/NU1510 warnings |
| `git diff --check` | PASS |

The full frontend lint command was started but did not complete within the available command window; targeted lint and the production build succeeded.

## GST decisions deliberately not made

The existing Phase 2 calculation engine remains isolated. This change does not choose seller registration, place of supply, price basis, invoice-discount allocation, special-supply treatment, or a GST rate based on an HSN/SAC. The legacy Sales calculation contract remains unchanged and client-provided tax percentages are not promoted to a new GST workflow.

## Other modules audit

| Module | Current status | Safe next step |
| --- | --- | --- |
| Purchase | Existing report columns can display `hsnSacCode`, but Purchase document save is not connected to the Phase 1 resolver. | Add a supplier/document-line snapshot policy separately. |
| Stock transfer | No Phase 1 classification flow found. | Define whether transfer documents require tax evidence before integration. |
| E-Invoice | No resolver/snapshot integration found. | Consume immutable confirmed Sales evidence only after policy approval. |
| E-Way Bill | No resolver/snapshot integration found. | Map from confirmed document evidence in a separate backward-compatible change. |
| Reports | Sales and purchase report column/registry entries exist; this change supplies Sales snapshots for new drafts but does not change report queries. | Verify report stored procedures expose the saved snapshot before adding report changes. |
