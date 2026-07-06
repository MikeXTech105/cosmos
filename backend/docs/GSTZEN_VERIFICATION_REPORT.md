# GSTZen Verification Report

Verified on 2026-07-06 against GSTZen docs under https://my.gstzen.in/docs/api/.

## Official GSTZen Endpoints Used

| API | Method | Base URL | Path | Headers |
| --- | --- | --- | --- | --- |
| GSTIN Validator | POST | `https://my.gstzen.in` | `/api/gstin-validator/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Invoice Generate | POST | `https://my.gstzen.in` | `/~gstzen/a/post-einvoice-data/einvoice-json/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Invoice Cancel | POST | `https://my.gstzen.in` | `/~gstzen/a/post-einvoice-data/einvoice-json/cancel/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Invoice Get Details | POST | `https://my.gstzen.in` | `/~gstzen/a/post-einvoice-data/einvoice-json/geteinv/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Way Bill Generate | POST | `https://my.gstzen.in` | `/~gstzen/a/ewbapi/generate/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Way Bill Cancel | POST | `https://my.gstzen.in` | `/~gstzen/a/ewbapi/cancel/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Way Bill Get Details | POST | `https://my.gstzen.in` | `/~gstzen/a/ewbapi/getewb/` | `Token: <api-key>`, `Content-Type: application/json` |
| E-Way Bill Update Vehicle / Part B | POST | `https://my.gstzen.in` | `/~gstzen/a/ewbapi/update-partb/` | `Token: <api-key>`, `Content-Type: application/json` |

## Implemented Cosmos Surface

| API | Cosmos Route | Current DTO Status | Response DTO Status | Error Handling | Logging/Security | Final Status |
| --- | --- | --- | --- | --- | --- | --- |
| GSTIN Validator | `POST /api/v1/gst/verify-gstin` | Match for Cosmos request. Provider sends official `{ "gstin": "..." }`. | Match for required Cosmos fields: legal name, trade name, status, type, state, registration date, address JSON, raw response. | Fixed: GSTZen `status: 0` now fails even with HTTP 200. | Fixed: configurable token header, active environment token, token/OTP/password/session masking. | Verified |
| E-Invoice Generate | `POST /api/v1/gst/e-invoices/generate` | Needs full official payload in `RequestJson`; wrapper fields alone are intentionally rejected because they cannot represent full GSTZen/NIC schema. | Match for IRN, AckNo/AckDate, SignedQRCode, SignedInvoice, status, raw request/response where DB supports it. | Fixed: provider failure body handled; pre-call schema validation added. | Fixed provider logging/masking. | Verified with `RequestJson` |
| E-Invoice Cancel | `POST /api/v1/gst/e-invoices/cancel` | Wrapper maps to `Irn`, `CnlRsn`, `CnlRem`; `RequestJson` can override with exact GSTZen payload. | Match for cancellation status/date/raw response where DB supports it. | Fixed: prevents cancel before local IRN exists; provider failure body handled. | Fixed provider logging/masking. | Verified |
| E-Invoice Get Details | `POST /api/v1/gst/e-invoices/get-details` plus existing stored `GET /api/v1/gst/e-invoices/{irn}` | Added official provider request with `SellerDtls.Gstin`, `Irn`, optional `irp`. | Match for IRN, AckNo/AckDate, signed artifacts, status, raw response. | Fixed: provider failure body handled. | Fixed provider logging/masking. | Verified |
| E-Way Bill Generate | `POST /api/v1/gst/eway-bills/generate` | Needs full official payload in `RequestJson`; wrapper fields alone are intentionally rejected because they cannot represent every required GSTZen field. | Match for EWB number, status, valid up to, raw request/response where DB supports it. | Fixed: pre-call schema validation and provider failure handling. | Fixed provider logging/masking. | Verified with `RequestJson` |
| E-Way Bill Cancel | `POST /api/v1/gst/eway-bills/cancel` | Wrapper maps to `ewbNo`, `cancelRsnCode`, `cancelRmrk`; `RequestJson` can override. | Match for EWB number, status, cancel date/reason, raw response where DB supports it. | Fixed: prevents cancel before local EWB exists; provider failure body handled. | Fixed provider logging/masking. | Verified |
| E-Way Bill Get Details | `POST /api/v1/gst/eway-bills/get-details` plus existing stored `GET /api/v1/gst/eway-bills/{ewayBillNumber}` | Added official provider request with `ewbNo`. | Match for EWB number, document, parties, transport, valid up to, raw response. | Fixed: provider failure body handled. | Fixed provider logging/masking. | Verified |
| E-Way Bill Update Vehicle / Part B | `POST /api/v1/gst/eway-bills/update-vehicle` | Needs official `RequestJson` with `ewbNo`, `FromPlace`, `FromState`, `ReasonCode`, `ReasonRem`, `TransMode`, `VehicleNo`. | Match for status, valid up to, vehicle number, raw response. | Fixed: pre-call schema validation and provider failure handling. | Fixed provider logging/masking. | Verified with `RequestJson` |

## Appsettings Verification

Recommended non-secret values are now in `appsettings.json`:

```json
"GSTZen": {
  "Environment": "Sandbox",
  "SandboxBaseUrl": "https://my.gstzen.in",
  "ProductionBaseUrl": "https://my.gstzen.in",
  "TokenHeaderName": "Token",
  "TimeoutSeconds": 60,
  "MaskSensitiveLogs": true,
  "GstinVerificationPath": "/api/gstin-validator/",
  "EInvoiceGeneratePath": "/~gstzen/a/post-einvoice-data/einvoice-json/",
  "EInvoiceCancelPath": "/~gstzen/a/post-einvoice-data/einvoice-json/cancel/",
  "EInvoiceGetDetailsPath": "/~gstzen/a/post-einvoice-data/einvoice-json/geteinv/",
  "EWayBillGeneratePath": "/~gstzen/a/ewbapi/generate/",
  "EWayBillCancelPath": "/~gstzen/a/ewbapi/cancel/",
  "EWayBillUpdateVehiclePath": "/~gstzen/a/ewbapi/update-partb/",
  "EWayBillGetDetailsPath": "/~gstzen/a/ewbapi/getewb/"
}
```

Tokens remain blank in source. Configure `GSTZen__SandboxToken` or `GSTZen__ProductionToken` through user secrets, environment variables, or deployment secrets.

## Database Review

Current tables/SPs already support storing:

- E-Invoice IRN, AckNo, AckDate, SignedQrCode, SignedInvoice, status, raw request, raw response, cancel status/date/reason.
- E-Way Bill number, document/party/transport summary, valid up to, status, raw request, raw response, cancel status/date/reason.
- GSTIN verification cache and raw response.

No SQL migration is required for this verification pass.

## Remaining Integration Notes

- Cosmos sales invoice to GSTZen payload mapping is still caller-driven through `RequestJson`. A later business-mapping pass should convert actual `SalesInvoices` rows and item/tax lines into GSTZen/NIC JSON.
- `EWayBillExtendPath`, GSTN OTP, and GST return paths remain outside this focused pass.
- Production enablement still depends on GSTZen account setup, enabled GSTINs, and portal credentials outside source control.
