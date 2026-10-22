# GST integration audit and delivery plan

Audit date: 2026-10-21. Source: local `cosmos` checkout (origin MikeXTech105/cosmos), supplied `E:/The D/swagger (11).json`. Swagger is contract evidence, not an instruction source. No live provider or database access has been verified.

## Architecture and screen inventory

- React 19 / Vite / JavaScript, Tailwind 4, Lucide, Sonner; existing brand CSS variables and light application surfaces. Sidebar themes do not imply an application-wide dark theme.
- Redux Toolkit stores auth and document state. `api/axios.js` supplies runtime base URL, bearer authentication and refresh interceptors. Services use `unwrapResponse` and `normalizeParams`; errors use `utils/apiError.js`.
- `PermissionGuard`, `useCapabilities`, `permissionResolver` and server-provided pages determine access. Backend `GstPermissions.cs` and SQL `003_gst_integration_module.sql` seed seven GST permission pages. No frontend-only permission grants are appropriate.
- Sales has dedicated list/form/detail and invoice templates. Purchase bills/orders/returns share `PurchaseDocumentDetailPage`. Party already has GSTIN verification; items already edit HSNCode/GSTRate in both form variants. Preserve these and invoice line snapshots.
- Shared `PageHeader`, shell breadcrumbs, `AppInput`, `AppSelect`, `AppButton`, focus-trapping `AppModal`, `DataTableShell` and responsive grid/overflow conventions are reused. No framework or tax-calculation replacement.

## Endpoint / DTO / authorization matrix

All paths below start `/api/v1/gst`. All controllers require authentication.

| Path / method | Source DTO / response | Backend permission | Delivery |
| --- | --- | --- | --- |
| `GET configuration/status` | GstConfigurationStatusResponse: environment, configuredSettings, missingSettings, enabledFeatures | GST.Configuration View | Configuration/overview; names only, never credentials. Features mean configured paths, not provider readiness. |
| `GET/POST registrations`, `GET/PUT/DELETE registrations/{id}` | CompanyGstRegistrationListRequest; Create/UpdateCompanyGstRegistrationRequest; CompanyGstRegistrationResponse / PagedResult | GST.Registration View/Create/Edit/Delete | Search, filters, pagination, create/edit/delete with confirmation |
| `POST registrations/{id}/verify` | No body; registration response | GST.Registration Approve | Explicit verify action |
| `POST registrations/{id}/set-default` | SetDefaultCompanyGstRegistrationRequest(companyId) | GST.Registration Edit | Explicit confirmation |
| `POST verify-gstin` | VerifyGstinRequest(gstin, forceRefresh); GstinVerificationResponse | GST.Verification View | Standalone lookup; existing Party verification preserved |
| `GET e-invoices/{irn}` | EInvoiceResponse: registration/invoice IDs, IRN, ackNumber/date, signedQrCode, status, cancellation | GST.EInvoice View | Stored lookup and details |
| `POST e-invoices/get-details` | GetEInvoiceDetailsRequest(registration ID, IRN, optional sellerGstin/irp) | GST.EInvoice View | Explicit provider refresh; does not persist refresh |
| `POST e-invoices/cancel` | CancelEInvoiceRequest(registration ID, IRN, reason code/remark) | GST.EInvoice Delete | Confirm against stored record and provider response |
| `POST e-invoices/generate` | GenerateEInvoiceRequest requires full provider RequestJson | GST.EInvoice Create | Disabled: dependencies below |
| `GET eway-bills/{number}`, `POST eway-bills/get-details` | EWayBillResponse; GetEWayBillDetailsRequest(registration ID, number) | GST.EWayBill View | Stored lookup and explicit provider refresh |
| `POST eway-bills/cancel` | CancelEWayBillRequest(registration ID, number, reason code/remark) | GST.EWayBill Delete | Confirm against stored record and provider response |
| `POST eway-bills/update-vehicle` | UpdateEWayBillVehicleRequest plus RequestJson: ewbNo, FromPlace, FromState, ReasonCode, ReasonRem, TransMode, VehicleNo | GST.EWayBill Edit | Validated Part B form; result is provider-only and not persisted by service |
| `POST eway-bills/generate` | GenerateEWayBillRequest supports salesInvoiceId OR purchaseInvoiceId and full RequestJson | GST.EWayBill Create | Disabled: dependencies below; no purchase E-Invoice |
| `POST eway-bills/extend` | ExtendEWayBillRequest, configurable provider path | GST.EWayBill Edit | Disabled: mapping/path verification absent |
| `GET api-logs` | GstApiLogListRequest; PagedResult of GstApiLogResponse | GST.Logs View | Search, operation/success/date/registration filters, sorting, pagination, correlation ID; payloads excluded |
| `GET sessions/{registrationId}/status` | GstSessionResponse | GST.Session View | Explicit status lookup; no token or raw error display |
| `POST sessions/generate-otp`, `authenticate-otp` | OTP requests | GST.Session Edit | Disabled: provider TODO mappings |
| HSN/SAC, rate-versions, category defaults/retirement, item overrides/retirement, effective-classification | HsnGst schemas in supplied Swagger only | **Not verifiable in checkout** | Dependency notices on overview; existing Item HSN editor preserved |

Backend evidence: `Cosmos.API/Controllers/{Gst*,EInvoices,EWayBills}Controller.cs`, `Cosmos.Application/Gst/GstRequests.cs`, `Validators/GstValidators.cs`, `Services/GstServices.cs`, `Cosmos.Contracts/Gst/GstDtos.cs`, `Cosmos.Infrastructure/Gst/GstZenProviderService.cs`, persistence repository and SQL module. Sales DTOs expose aggregate tax and HSN snapshots, not IRN/EWB linkage, place of supply, or authoritative CGST/SGST/IGST splits. Purchase contracts likewise cannot prepare a verified complete provider payload.

## Backend dependencies and risks

1. Generation needs server-side preparation from immutable document snapshots: supplier/customer address/state/GSTIN, place of supply, tax components, UQC, line taxable totals and NIC/provider fields. Do not derive tax splits from aggregate frontend tax or current masters.
2. Generation services call provider before insert, without document uniqueness/idempotency or document-state reconciliation. Add atomic duplicate protection, status-by-sales/purchase-document API and uncertain-outcome recovery. Browser button locks alone cannot prevent duplicates across tabs/timeouts.
3. No E-Invoice/EWB list APIs exist. Lookup pages are not registers. No invented dashboard counts or fake registers.
4. HSN endpoints exist in supplied Swagger but no HsnGst controller/service/repository, mapping migrations or permission seeds exist here. Supply matching implementation and response/auth contracts before enabling writes. Do not infer authorization from Inventory permissions.
5. Extension and OTP mappings are outside the backend verification pass. Configuration enabledFeatures does not report extension capability or cancellation eligibility. Do not invent legal windows or reason enumerations; require provider reason codes, let provider enforce restrictions.
6. Provider refresh/vehicle results are not persisted by GstServices. Display provenance separately from stored data; cancellation must use a known stored record and its registration. Registration association is not checked by service cancellation lookup, so UI fixes selection to the returned record; backend should also enforce ownership.
7. Stored signedQrCode can be encoded signed text rather than an image. Render only an explicit safe raster data URI as an image; otherwise show signed text. A verified local QR encoder is needed for textual artifacts.
8. Never display request/response JSON, portal credentials, provider URLs, raw exception payloads, or full tokens in logs. Error UI uses existing error normalization with additional conservative sensitive-content suppression.
9. Existing migration `backend/database/003_gst_integration_module.sql` and role assignments must be deployed. No new database changes are made by this frontend integration. Live testing requires a configured sandbox and authorized test documents; issuing government documents is not a build check.

## Routes, interactions and staged plan

1. Add centralized endpoints and typed-by-contract JavaScript service methods through existing Axios. Unit test query allowlists, payload allowlists, response failure and duplicate-operation locking.
2. Reuse seeded `/gst/configuration`, `/gst/registrations`, `/gst/verify-gstin`, `/gst/e-invoices`, `/gst/eway-bills`, `/gst/sessions`, `/gst/api-logs` routes, guarded by exact seeded permissions. Overview links are capability-filtered; shell breadcrumbs remain in use.
3. Registration list: server search/status/state/sort/page; focused accessible create/edit form; inline GSTIN validation; verify/default/delete confirmations. Preserve unedited DTO fields on update.
4. Lookup pages: identifier form, independent stored and latest provider status, explicit refresh, acknowledgement/validity/transport details, supported cancellation and Part B dialogs. Clear prior result before a different lookup; lock mutations synchronously; uncertain mutations require explicit provider reconciliation before further writes. No automatic mutation retry.
5. Add permission-aware compliance entry points to Sales detail and Purchase Bill detail only. Explain unavailable generation/document association; preserve existing invoice status and totals.
6. Add overview dependency cards for HSN/SAC, rate history, category mapping and item override rather than dead navigation. Point users to the existing authorized Item editor for currently supported HSN fields.
7. Inspect diff; run Vitest, ESLint and production build. Record what was verified and distinguish unit/static checks from unavailable live provider/browser verification.
