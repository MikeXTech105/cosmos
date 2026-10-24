# GST API contract

`POST /api/v1/gst/e-invoices/generate` and `POST /api/v1/gst/eway-bills/generate` retain authentication and create permission requirements but now return HTTP 409 with `data.conflictCode = GST_SERVER_GENERATION_NOT_AVAILABLE`. `retrySafe` is false. The supplied JSON is ignored and GSTZen is not contacted.

Existing lookup, provider-detail refresh, cancellation, and supported E-Way operations retain their existing contracts. A future generation API must accept only an internal invoice reference and server-generated idempotency key; it must not accept payload fields or statutory identifiers from the browser.

No public readiness endpoint is exposed yet: the evaluator is intentionally internal until its results can be backed by persisted invoice compliance fields and permission-reviewed presentation rules.
