# GST API contract

`POST /api/v1/gst/e-invoices/generate` and `POST /api/v1/gst/eway-bills/generate` retain authentication and create permission requirements but now return HTTP 409 with `data.conflictCode = GST_SERVER_GENERATION_NOT_AVAILABLE`. `retrySafe` is false. The supplied JSON is ignored and GSTZen is not contacted.

Existing lookup, provider-detail refresh, cancellation, and supported E-Way operations retain their existing contracts. A future generation API must accept only an internal invoice reference and server-generated idempotency key; it must not accept payload fields or statutory identifiers from the browser.

No public readiness endpoint is exposed yet: the evaluator is intentionally internal until its results can be backed by persisted invoice compliance fields and permission-reviewed presentation rules.

## Verified source endpoint inventory

| Area | Current endpoints | Status |
|---|---|---|
| HSN/SAC | `GET/POST /api/v1/gst/hsn-sac`, `GET/PUT /api/v1/gst/hsn-sac/{id}` | Implemented; `GST.HsnSac` permissions |
| GST rates | `GET/POST /api/v1/gst/rate-versions` | Implemented; `GST.RateHistory` permissions |
| Classification mappings | category-default and item-override `GET`/`PUT`/retire endpoints under `/api/v1/gst` | Implemented; mapping permissions |
| E-Invoice | generate, cancel, stored lookup by IRN and provider-detail refresh | Generation intentionally returns 409; remaining provider calls are unverified |
| E-Way Bill | generate, cancel, stored lookup, provider-detail refresh, vehicle update and extend | Generation intentionally returns 409; extension contract and all provider calls are unverified |

Generation must remain a snapshot-only server operation. It may not accept `RequestJson`, GST identifiers, transport facts, seller details, or payload fragments controlled by the browser. A future replacement contract needs only an internal business-document ID plus a server-issued idempotency key and a status/reconciliation resource.

## Sales-invoice eligibility contract

`GET /api/v1/gst/invoices/{salesInvoiceId}/eligibility` is a protected, read-only assessment requiring `GST.EInvoice` view permission. It returns the normal COSMOS envelope around `GstComplianceSnapshotReadiness`: `salesInvoiceId`, `canCreateSnapshot`, and structured issue codes/messages.

The assessment reads only the persisted invoice header and lines. It intentionally does not hydrate current Party, Item, GST registration, HSN mapping, or GST-rule master data, because doing so would fabricate historical evidence. It neither creates a snapshot nor changes invoice/stock/accounting status. Current expected blockers include seller registration, buyer identity, place of supply, component tax/rule bindings, discount/rounding, transport contract, and provider-contract verification.
