# GSTZen Integration Guide

## Purpose

The GST Integration module connects Cosmos ERP to GSTZen for GSTIN verification, E-Invoice, E-Way Bill, GST session/OTP, and future GST return operations.

## GSTZen Docs Received

- https://gstzen.in/einvoicing/e-invoice/generate-e-invoice-api.html
- https://my.gstzen.in/docs/api/einvoice-api/einvoice-gen/
- https://my.gstzen.in/docs/api/ewaybill-api/eway-quicklinks/
- https://my.gstzen.in/docs/api/gstin-validator-api/

The `my.gstzen.in` documentation pages may require JavaScript/login access, so all endpoint paths remain configurable in `appsettings.json` or environment variables.

## Verified GSTZen Details

- GSTZen sandbox calls use an HTTP header named `Token`.
- GSTZen's public sandbox e-invoice example token is `de3a3a01-273a-4a81-8b75-13fe37f14dc6`.
- The sample token is documentation-only. Do not hardcode it in code or frontend.
- GSTZen supports sandbox testing before production.
- Live production APIs are enabled only after successful testing and payment.
- For production e-invoice, the client must add GSTINs in GSTZen, create API username/password on the government e-invoice portal, mark GSTZen as ERP provider, and provide those details to GSTZen.

## Architecture Overview

- API controllers live in `Cosmos.API` and are grouped in Swagger as `GST Integration`.
- Business flow and validation live in `Cosmos.Application`.
- Public request/response DTOs live in `Cosmos.Contracts`.
- GSTZen outbound HTTP lives behind `IGstZenProviderService` in `Cosmos.Infrastructure`.
- SQL Server persistence uses Dapper stored procedures through `IGstRepository`.
- GSTZen API request/response logs are stored in `GstApiLogs`.

## Configuration Model

`appsettings.json` stores only GSTZen account-level provider configuration because all client GSTINs use the same GSTZen account. Company and branch GSTINs are business data and are stored in `CompanyGstRegistrations`.

Do not put `CompanyGstin` or branch GSTIN values in appsettings or frontend code.

## appsettings.json Sample

```json
"GSTZen": {
  "Environment": "Sandbox",
  "SandboxBaseUrl": "",
  "ProductionBaseUrl": "",
  "SandboxToken": "de3a3a01-273a-4a81-8b75-13fe37f14dc6",
  "ProductionToken": "",
  "TokenHeaderName": "Token",
  "TimeoutSeconds": 60,
  "MaskSensitiveLogs": true,
  "GstinVerificationPath": "",
  "EInvoiceGeneratePath": "",
  "EInvoiceCancelPath": "",
  "EInvoiceGetDetailsPath": "",
  "EWayBillGeneratePath": "",
  "EWayBillCancelPath": "",
  "EWayBillUpdateVehiclePath": "",
  "EWayBillExtendPath": "",
  "EWayBillGetDetailsPath": "",
  "GstnGenerateOtpPath": "",
  "GstnAuthenticateOtpPath": "",
  "Gstr1Path": "",
  "Gstr3BPath": ""
}
```

Use the sample sandbox token only for GSTZen's public sandbox/demo GSTIN flows. Keep real values in environment variables, user secrets, or a production secret store.

## Environment Variables

- `GSTZen__Environment`
- `GSTZen__SandboxBaseUrl`
- `GSTZen__ProductionBaseUrl`
- `GSTZen__SandboxToken`
- `GSTZen__ProductionToken`
- `GSTZen__TokenHeaderName`
- `GSTZen__GstinVerificationPath`
- `GSTZen__EInvoiceGeneratePath`
- `GSTZen__EInvoiceCancelPath`
- `GSTZen__EInvoiceGetDetailsPath`
- `GSTZen__EWayBillGeneratePath`
- `GSTZen__EWayBillCancelPath`
- `GSTZen__EWayBillUpdateVehiclePath`
- `GSTZen__EWayBillExtendPath`
- `GSTZen__EWayBillGetDetailsPath`
- `GSTZen__GstnGenerateOtpPath`
- `GSTZen__GstnAuthenticateOtpPath`
- `GSTZen__Gstr1Path`
- `GSTZen__Gstr3BPath`

## Sandbox Setup

1. Set `GSTZen:Environment` to `Sandbox`.
2. Set `GSTZen:SandboxBaseUrl` from GSTZen docs.
3. Set `GSTZen:SandboxToken` from GSTZen sandbox credentials.
4. Set `GSTZen:TokenHeaderName` to `Token`.
5. Set endpoint paths from GSTZen docs/Postman collection.
6. Use sandbox/demo GSTINs for testing.
7. Verify calls through `/api/v1/gst/configuration/status` before testing provider endpoints.

## Production Setup

Before production:

1. Complete sandbox testing.
2. Make payment to GSTZen.
3. Ask GSTZen to enable Live Production APIs.
4. Add all client GSTINs in the GSTZen account.
5. For e-invoice, create API username/password on the government e-invoice portal for each required GSTIN.
6. Mark GSTZen as ERP provider.
7. Share required API login details with GSTZen.
8. Get `ProductionToken` and `ProductionBaseUrl`.
9. Change `Environment` from `Sandbox` to `Production`.
10. Configure `ProductionToken` and `ProductionBaseUrl`.
11. Never use the sandbox token in production.

## Values Needed From GSTZen

- Sandbox token
- Sandbox base URL
- Production token after payment/go-live approval
- Production base URL after go-live
- GSTIN Validator endpoint path
- E-Invoice generate endpoint path
- E-Invoice cancel endpoint path
- E-Invoice details endpoint path
- E-Way Bill generate endpoint path
- E-Way Bill cancel endpoint path
- E-Way Bill update vehicle endpoint path
- E-Way Bill extend/details endpoint paths
- Any required sample payloads
- Sample success/error responses

## Values Needed From Client

- List of all GSTINs
- Legal name/trade name
- Branch, state, and address for each GSTIN
- GST portal username for each GSTIN if required
- E-Invoice enabled per GSTIN
- E-Way Bill enabled per GSTIN
- Default GSTIN/branch
- Confirmation that the GSTZen account limit supports all GSTINs

## Database Script Execution

Run `backend/database/migrations/20260702_gst_integration_module.sql` after the base security, party, item, sales, purchase/expense, and HR scripts are applied.

No GSTZen account token is stored per GSTIN. Tokens remain account-level backend configuration unless GSTZen later requires separate credentials per GSTIN.

## API Endpoints

- `GET /api/v1/gst/configuration/status`
- `GET /api/v1/gst/registrations`
- `POST /api/v1/gst/registrations`
- `GET /api/v1/gst/registrations/{id}`
- `PUT /api/v1/gst/registrations/{id}`
- `DELETE /api/v1/gst/registrations/{id}`
- `POST /api/v1/gst/registrations/{id}/verify`
- `POST /api/v1/gst/registrations/{id}/set-default`
- `POST /api/v1/gst/verify-gstin`
- `POST /api/v1/gst/e-invoices/generate`
- `POST /api/v1/gst/e-invoices/cancel`
- `GET /api/v1/gst/e-invoices/{irn}`
- `POST /api/v1/gst/eway-bills/generate`
- `POST /api/v1/gst/eway-bills/cancel`
- `POST /api/v1/gst/eway-bills/update-vehicle`
- `POST /api/v1/gst/eway-bills/extend`
- `GET /api/v1/gst/eway-bills/{ewayBillNumber}`
- `POST /api/v1/gst/sessions/generate-otp`
- `POST /api/v1/gst/sessions/authenticate-otp`
- `GET /api/v1/gst/sessions/{companyGstRegistrationId}/status`
- `GET /api/v1/gst/api-logs`

## Request Examples

```json
{
  "gstin": "24ABCDE1234F1Z5",
  "forceRefresh": false
}
```

```json
{
  "companyGstRegistrationId": 1,
  "salesInvoiceId": 1001,
  "documentType": "INV",
  "documentNumber": "SI-1001",
  "sellerGstin": "24ABCDE1234F1Z5",
  "buyerGstin": "27ABCDE1234F1Z2",
  "requestJson": "{}"
}
```

## Flows

Add client GSTIN: admin creates a `CompanyGstRegistrations` row, format is validated, optional verification updates legal/trade/address fields, and feature flags define whether e-invoice/e-way bill/GST return operations are allowed.

Verify customer/vendor GSTIN: `/api/v1/gst/verify-gstin` checks cache unless `forceRefresh=true`, calls GSTZen when needed, saves `GstVerificationLogs`, and returns taxpayer details.

Generate E-Invoice: user selects sales invoice and seller GST registration, ERP validates `companyGstRegistrationId`, maps payload through `IGstZenProviderService`, stores IRN/Ack/QR/signed invoice response, and links it to the sales invoice id.

Cancel E-Invoice: ERP sends IRN and cancel reason to GSTZen, stores cancellation status and response JSON, and returns the updated record.

Generate E-Way Bill: ERP validates selected GST registration has e-way bill enabled, sends transporter/vehicle/distance payload to GSTZen, stores EWB number/status/validity and response JSON.

Update Vehicle: ERP sends EWB number and new vehicle details to GSTZen, logs request/response, and returns provider status.

GST Session/OTP: ERP generates OTP for a selected company GST registration, authenticates OTP, and stores session metadata in `CompanyGstSessions` if GSTZen returns it.

## Permissions

The existing permission model supports `View`, `Create`, `Edit`, `Delete`, `Export`, and `Approve`. The requested permissions map as:

- `GST.View`: parent page visibility
- `GST.Configuration.View`: `GST.Configuration` + `View`
- `GST.Registration.View/Create/Update/Delete`: `GST.Registration` + `View/Create/Edit/Delete`
- `GST.Registration.Verify`: `GST.Registration` + `Approve`
- `GST.Verify`: `GST.Verification` + `View`
- `GST.EWayBill.Generate/Cancel/UpdateVehicle/Extend`: `GST.EWayBill` + `Create/Delete/Edit/Edit`
- `GST.EInvoice.Generate/Cancel`: `GST.EInvoice` + `Create/Delete`
- `GST.Session.Manage`: `GST.Session` + `Edit`
- `GST.Logs.View`: `GST.Logs` + `View`

## Security Notes

- GSTZen token is stored only in backend configuration, environment variables, user secrets, or a production secret store.
- GSTZen token is never returned in API responses.
- GSTZen token and OTP values are masked in provider logs.
- API logs should store masked request and response payloads.
- Company GSTINs belong in SQL Server, not configuration.
- The frontend must never store GSTZen account credentials.
- Use HTTPS for all production provider communication.

## Troubleshooting

- Configuration status reports missing/available settings without exposing token values.
- A provider call returns 500 if the current base URL is not configured.
- A provider call returns 500 if the current token is not configured.
- A provider call returns 500 if the endpoint path for that API is not configured.
- A provider HTTP failure is translated to an ERP-standard `CosmosException` and logged in `GstApiLogs`.
- E-invoice and e-way bill calls fail if the selected company GST registration is missing or the feature flag is disabled.
- GSTIN verification returns cached results until `CacheExpiresAt` unless `forceRefresh=true`.

## TODO

- TODO: Update GSTZen payload mapping after final GSTZen API documentation/Postman collection is provided.
- Confirm exact endpoint paths from the login-protected GSTZen docs/Postman collection.
- Confirm exact response fields for IRN, AckNo, SignedQRCode, EWB number, validity, and GSTN session tokens.
- Add GST return endpoints after final GSTR-1/GSTR-3B payload specs are available.
