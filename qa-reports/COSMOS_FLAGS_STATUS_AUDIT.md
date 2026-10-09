# Cosmos ERP — Flags and Status Audit

**Scope:** source-level audit of status/enum/flag contracts plus prior safe runtime probes. No production mutation or authenticated test was performed.

## Coverage and method

The source contains 56 backend enum declarations under Contracts/Domain and extensive frontend status/flag usage. The comparisons below are exact where the matching frontend and backend enum sources were inspected. Boolean flags and remaining DTO-level status fields are **UNVERIFIED** unless explicitly listed; no live authenticated record response was available.

## Remediated internal mismatches (source and automated test verification, 2026-10-09)

### FLAG-STATUS-001 — High — Sales enum values do not match backend

**Frontend:** `frontend/src/pages/sales/invoices/invoiceHelpers.js` (`SALES_INVOICE_STATUS`, `SALES_PAYMENT_STATUS`, `SALES_PAYMENT_MODE`).  
**Backend:** `backend/src/Cosmos.Domain/Sales/SalesEnums.cs` (`SalesInvoiceStatus`, `SalesPaymentStatus`, `SalesPaymentMode`).  
**Status:** Resolved in source; staging verification remains required.

| Concept | Frontend values | Backend values | Impact |
|---|---|---|---|
| Invoice status | Draft=0, Confirmed=1, Cancelled=2 | Draft=1, Confirmed=2, PartiallyPaid=3, Paid=4, Cancelled=5 | **Resolved:** frontend maps, labels, filters, and action predicates use the backend values. |
| Payment status | Unpaid=0, Partial=1, Paid=2 | Unpaid=1, PartiallyPaid=2, Paid=3 | **Resolved:** frontend map, display, and filter serialization use the backend values. |
| Payment mode | Cash=0, BankTransfer=1, UPI=2, Card=3, Cheque=4, Other=5 | Cash=1, BankTransfer=2, Card=3, Upi=4, Cheque=5, Other=99 | **Resolved:** create payload and label mappings preserve all backend values, including `Other=99`. |

**Verification:** `invoiceHelpers.test.js` covers every enum member, status/filter serialization, all payment-mode payload values, and existing draft/confirmed/cancelled action gates.

### FLAG-STATUS-002 — High — Purchase enum values and state coverage do not match backend

**Frontend:** `frontend/src/pages/purchase/purchaseHelpers.js` (`PURCHASE_STATUS`, `PAYMENT_MODE`).  
**Backend:** `backend/src/Cosmos.Domain/PurchaseExpense/PurchaseExpenseEnums.cs`.  
**Status:** Resolved in source; staging verification remains required.

Frontend previously used Draft=0, Confirmed=1, Cancelled=2, Converted=3 in one shared map. Backend document/order states start at 1 and have separate document and order lifecycles: document `PartiallyPaid/Paid`, order `Sent/PartiallyConverted/Converted`. The frontend now preserves those two distinct maps. Purchase payment status is independently represented as `Unpaid=1, Partial=2, Paid=3`. Purchase payment modes now match `Cash=1, Bank=2, Upi=3, Cheque=4, Card=5`; the backend has no `Other` purchase-payment mode.

**Verification:** list and detail views select their map through `documentConfigs.statusKind`; focused tests cover both persisted status meanings, filter serialization, and bill create/update payloads for every payment mode. `PaymentType` remains a backend field name but is validated by the backend against `PurchasePaymentMode`; the UI now deliberately uses the payment-mode values.

### FLAG-STATUS-003 — High — Procurement Planning run lifecycle is truncated and has an incorrect cancelled value

**Frontend:** `frontend/src/constants/procurementEnums.js` (`PlanningRunStatus`).  
**Backend:** `backend/src/Cosmos.Domain/ProcurementPlanning/ProcurementPlanningEnums.cs` (`PlanningRunStatus`).  
**Status:** Resolved in source; staging verification remains required.

Frontend now exposes Draft=1, Finalized=2, Calculated=3, Reviewed=4, Cancelled=5, matching the backend. Shared action predicates leave Calculated and Reviewed distinct from Finalized/Cancelled, so they are not hidden by the corrected cancelled mapping.

**Verification:** `procurementEnums.test.js` covers every value, options/labels, and finalized/cancelled action gates. The backend's exact allowed transitions for Calculated and Reviewed remain undocumented in the inspected source and need controlled staging workflow verification.

## Matched source enum families (static only)

| Family | Result | Evidence |
|---|---|---|
| Dispatch run status, tiers, rounding, inbound status | MATCHED for inspected numeric members | `frontend/src/constants/dispatchEnums.js` and `backend/src/Cosmos.Domain/DispatchPlanning/DispatchPlanningEnums.cs` |
| Procurement rounding rule, message severity, sales-import batch | MATCHED for inspected members | corresponding procurement enum files |
| Website publish status | MATCHED numeric values | frontend/backend Website enum files; public Website is out of scope |

## Out of scope public Website discrepancies

`WebsitePublishStatus` is aligned. However, frontend warranty resolution/status constants disagree with backend `WarrantyResolutionType` and `WarrantyClaimStatus` (including an omitted backend Cancelled state). This is **OUT OF SCOPE — PUBLIC WEBSITE ON HOLD**; it should be repaired before public Website work resumes.

## Flags and permissions

`isActive`, `canView`, `canCreate`, `canEdit`, `canDelete`, `canApprove`, and `canExport` are used across frontend tables/pages. Backend controllers contain 89 `[Authorize]` attributes and 441 `RequirePermission(...)` usages. Static presence does not establish JSON field names, role behavior, or data scope. These contracts are **UNVERIFIED** pending controlled identities and authenticated GET responses.

## Required regressions

1. Contract-test every numeric enum serialization value and every query filter value.
2. Test each status badge against a backend DTO fixture for all allowed backend values.
3. Test create/update payloads for all payment modes.
4. Execute staging lifecycle tests for Sales, Purchase, and Procurement Planning and reload records after each transition.
5. Run role-matrix direct API tests for permission flags and verify frontend visibility independently.
