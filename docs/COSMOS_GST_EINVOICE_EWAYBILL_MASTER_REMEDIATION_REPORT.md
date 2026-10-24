# Cosmos GST E-Invoice and E-Way Bill remediation

## Verified baseline

`GstDocumentPage.jsx` disabled generation, but `EInvoicesController` and `EWayBillsController` still accepted browser-controlled `RequestJson`. `GstServices.cs` passed it to `GstZenProviderService.cs` before local persistence. `SalesInvoices` and `SalesInvoiceItems` lack the immutable legal identity, address, place-of-supply, and component-tax snapshots needed for a statutory payload. `EInvoices` and `EWayBills` had no active-document unique indexes.

## Completed safe work

Generation endpoints now return `409 GST_SERVER_GENERATION_NOT_AVAILABLE` before validation or provider access. The response is non-retryable and tells callers to reconcile rather than resubmit. Migration `20261024_gst_compliance_snapshot_generation_foundation.sql` adds immutable snapshot storage, SQL-side atomic request reservation, append-only attempt tracking, state conflict detection, and active IRN/E-Way Bill uniqueness only after duplicate preflight.

## Still blocked

No snapshot builder, confirmation transaction integration, provider reconciliation lookup, or GSTZen payload adapter was enabled. These require the policy and provider decisions recorded in the decision register. Historical invoices were not changed or backfilled.

## Snapshot requirements and mapping matrix

| Required snapshot field | Current authoritative source | Readiness |
|---|---|---|
| Invoice number/date, quantities, rate, item description, aggregate tax | `SalesInvoices` / `SalesInvoiceItems` | persisted, but not sufficient alone |
| HSN/SAC | `SalesInvoiceItems.HsnSacCodeSnapshot` | present only when captured; validated |
| Seller registration/legal address | current `CompanyGstRegistrations` only | not linked or snapshotted; blocks generation |
| Buyer GSTIN/legal/billing/shipping address | current `Parties` only | invoice stores only party ID; blocks generation |
| Place of supply | no invoice field | unresolved policy/source; blocks generation |
| CGST/SGST/IGST/cess, taxable value, approved rule reference | generic tax aggregate and isolated calculation snapshots | no invoice-line binding; blocks generation |
| Discount allocation/rounding | invoice-level discount only | policy not persisted; blocks generation |
| Transporter, vehicle, distance | no sales invoice fields | blocks E-Way Bill generation |

`GstComplianceSnapshotReadinessEvaluator` reports these gaps from invoice data without reading current master data as historical truth. It does not block ordinary invoice confirmation, because doing so would alter existing stock/accounting behavior without an approved business policy.
