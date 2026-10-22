# Validation audit — 14 October 2026

Scope: static review of frontend forms, shared Zod schemas, payload mappers and backend FluentValidation validators in this repository. Covered auth/RBAC, HR, inventory, party/GST, sales, purchase/expenses/payments, supply chain, dispatch, shipment operations, manufacturing, procurement, OEE, Data Book, website and reports. This is not a live API/database audit. No application validation rules were changed.

## Confirmed excessive or inconsistent restrictions

1. **Employee optional identity/contact fields are mandatory in the UI.** `frontend/src/utils/validationSchemas.js:147` requires last name, DOB, mobile and email. Backend `HrValidators.cs` allows blank last name/email/mobile and `HrRequests.cs` declares nullable DOB. A single-name employee or employee without an email cannot be entered. Make these optional; validate format only when supplied. Nullable dates also need mapper normalization to null instead of empty string.
2. **HR names/codes have mismatched lengths.** Frontend department/designation/shift codes permit 50; backend permits 20. Frontend employee code permits 50; backend permits 30. In the other direction, frontend department/designation/shift names cap at 100 while backend permits 200. Align each field to the actual API/database limit.
3. **One-character names are unnecessarily rejected relative to the API.** Category, unit, item, department/designation/shift and employee first-name schemas require at least two characters, while backend requires nonempty values. `RoleModal.jsx` and `UserModal.jsx` also apply two-character minima absent from their backend rules. Use trimmed nonempty checks unless a specific business requirement needs a longer name.
4. **Sales invoice terms stop at 1000 instead of the backend's 2000.** Both invoice form schemas impose `.max(1000)` for terms; `SalesValidators.cs` permits 2000. Increase frontend limit to match the API.
5. **Packaging name is required only on frontend.** `supplyChainSchemas.js:107` requires a name; backend `SupplyChainValidators.cs` only sets a maximum length of 150. Decide whether display name should be required and align both sides; it is currently an extra frontend restriction.
6. **Page icon is required only on frontend.** `PageFormPage.jsx:47` blocks an empty icon while `PageValidators.cs` allows one. Allow blank/default icon.
7. **Website media alt text is mandatory only on frontend.** `websiteContent.js:105` blocks every populated image with empty alt text, while backend only limits alt text to 500. Keep an accessibility hint and enforce a consistent policy; optional decorative images/draft content should not automatically be blocked without that policy.

## Missing checks and save failures

8. **Employee bank data is treated as optional in the UI but always sent as an object on create.** `employeeFormMappers.js:263,305` constructs bank details even when blank; `EmployeeFormPage.jsx:255` includes it for create. `CreateEmployeeValidator` invokes a bank validator whenever the object is non-null, and that validator requires bank name/account/IFSC. Omit/null the object when all fields are blank; validate the complete bank block when any bank field is entered. On edit, employee update and bank update are separate requests, so a bank validation failure can occur after the employee update succeeds.
9. **Service items conflict with unconditional backend lookup checks.** Frontend `itemSchema` requires category/unit only for products; `itemHelpers.js:87` always sends unitId 0 for services. Backend `ItemCommandValidator` requires valid category/unit for all item types. Service saves can fail regardless of UI validation. Define service lookup requirements and change the backend condition or frontend mapping accordingly.
10. **Item code and GST checks do not match the API.** Item code is optional in frontend and sent blank; backend requires it. Frontend GST rate has no maximum; backend permits only 0–100. Add matching checks or implement explicit backend code generation before validation.
11. **Password and username policy is not fully explained/enforced before submit.** Frontend password forms check eight characters; backend also requires uppercase, lowercase, number, special character and max 128. User creation backend has username character/length restrictions missing from the frontend schema. Display and validate the same policy; retain login's nonempty password rule rather than imposing new-password rules on login.
12. **Purchase date validation is incomplete.** Shared purchase document schemas mark document dates optional and lack due-date/bill-date and expected-delivery/order-date ordering checks enforced by backend. Add checks conditionally for the selected document type. Sales invoice forms similarly lack the due-date ordering check present in backend.
13. **Payment modes accept undefined enum values.** Sales payment/initial-payment schemas and supplier payment schema use a nonnegative minimum instead of allowed enum membership. Backend rejects undefined modes. Validate against each module's actual enum; sales and purchase enums differ.
14. **HR address/leave/shift checks lag behind the API.** Employee address fields are optional in frontend; sent address objects require address type and line 1 in backend. Leave reason is optional in frontend but required in backend, and frontend lacks end-date ordering. Shift grace minutes and weekly hours lack backend maxima of 240 and 168. Add these checks before submit, without requiring an address block when none was entered.
15. **Shipment required fields are optional in frontend.** `shipmentSchemas.js` allows blank manualReason, packageNumber/packageType, docketNumber, tracking source and returnReason; backend requires these for the relevant endpoints. Submission paths use parsed data directly, so these are API save failures. Align schemas and required labels. Do not confuse zero package-item rows with a bug: the packing submit already filters those out.
16. **Shipment cross-field checks are missing.** Package net weight may exceed gross weight; mixed-item package flag, appointment time ordering/cancellation reason, expected-delivery ordering, currency pattern and optional rate-per-weight nonnegative checks do not match backend. Required/optional shipment IDs permit fractional numbers because `.int()` is missing. Mirror backend checks for the operation being submitted.
17. **Dispatch and supply-chain identifiers are too permissive.** Their identifier unions accept zero/negative/fractional numbers and arbitrary nonempty strings, despite numeric positive backend IDs. Probe confirmed warehouse channelId 0.5 and dispatch IDs 0 pass frontend schemas. Parse positive integers, retaining optional blanks only for optional IDs.
18. **Many text-field maximum limits exist only on backend.** Category/unit/item names and codes, HR address/bank/document fields, supply-chain fields, shipment notes/references, RBAC names and website content have backend maxima not consistently mirrored in UI. Match limits and show field-level feedback. Do not remove backend limits: they may protect database columns.

## Restrictions requiring a business decision

These are real restrictions, but their existence alone does not prove a defect:

- `OeeValidators.cs` permits machine on-time only as 0 HR, 12 HR or 24 HR. If actual shifts include 8/10/16 hours, the model and calculations need changing together.
- OEE downtime reason is required for every production line. If fully running machines should have no reason, make it conditional on actual downtime; verify how the current UI maps default/no-downtime reasons first.
- HR backend makes supplied employee mobile numbers unique. Shared family/company numbers may need to be allowed; employee code should remain unique.
- `ReportValidators.cs` limits dated reports to 366 days. This could block multi-year reports; keep it if required for performance or support chunked/year-based exports. Removing it needs a query-performance review.
- Negative opening balances/stock are rejected in several modules. Retain the restriction when debit/credit or movement types represent the sign; only relax it for a supported signed accounting model.

## Checks that should remain

Positive transaction amounts/quantities; required party/item references; valid enums; discount boundaries; date ordering; duplicate BOM components/import safeguards; stock/posting lifecycle rules; permissions; row-version conflict checks; nonnegative weights; and net <= gross. Frontend checks improve feedback; backend checks must remain authoritative.

## Verification

Ran read-only schema probes through Vite SSR. Confirmed employee rejects fields firstName/lastName/dateOfBirth/mobile/email for a sample with single-character first name and blank optional contact data; category name A is rejected; warehouse channelId 0.5 passes; dispatch zero IDs and malformed planning date pass; docket with empty number passes; website image with empty alt text is blocked. Backend comparisons were from source, not live HTTP requests. Existing frontend and backend service/mapping behavior was inspected to exclude already-filtered zero supplier allocations/package rows from the findings.

Recommended order: resolve employee bank/optional fields and service-item save failures first, then HR lengths, required shipment fields and date/enum mismatches, then extra name/icon/terms restrictions. Decide OEE/report/shared-mobile policies separately.


## Frontend remediation applied — 14 October 2026

Updated shared validators, both page/modal form paths and relevant payload mappers. Employee optional fields and blank bank/address payloads are corrected; partial bank/address data receives validation before save. HR lengths and leave/shift rules match the API. One-character names, optional icon/packaging name/media alt text, and 2000-character invoice terms are supported. Auth password/username policy, dates/payment enums, item code/GST limits, positive integer IDs, shipment required fields/packing weight/unit/appointment rules now receive frontend checks. Service category/unit selections are available and preserved to satisfy the current backend contract.

Backend business policies (OEE hour options, unique employee mobile, report 366-day cap) remain unchanged. Backend lifecycle/financial checks remain authoritative. Employee and bank edits remain separate API requests; frontend checks reduce validation failures, but atomicity requires backend support. Existing full-project lint issue: DispatchImportsPage.jsx:180, react-hooks/set-state-in-effect. Live server/database validation was not run.
