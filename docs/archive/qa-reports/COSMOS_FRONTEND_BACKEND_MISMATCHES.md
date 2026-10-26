# Cosmos ERP — Frontend/Backend Mismatches

| ID | Severity | Confidence | Module/API | Summary | Correction / acceptance criteria |
|---|---|---|---|---|---|
| INT-001 | High | Confirmed | Shared Axios routing | Previously deployed client resolved `/api` to port 3000 SPA fallback. Source remediation is complete but not deployed. | Deploy staging configuration; browser `/api/auth/me` must return API JSON 401, never SPA HTML. |
| FLAG-STATUS-001 | High | Resolved in source | Sales invoice/payment | Frontend maps now exactly match the Sales backend enums, including paid states and `Other=99`. | Focused unit coverage passed; staging list/detail and workflow verification remains required. |
| FLAG-STATUS-002 | High | Resolved in source | Purchase documents/orders/payments | Document and order lifecycles now use distinct maps; payment modes match the Purchase backend enums. | Focused unit coverage passed; staging list/detail and workflow verification remains required. |
| FLAG-STATUS-003 | High | Resolved in source | Procurement Planning runs | All five PlanningRunStatus values now map correctly; action gates use finalized/cancelled helpers. | Focused unit coverage passed; staging transition verification remains required. |
| OOS-STATUS-001 | Informational | Confirmed | Public Website warranty | Warranty status/resolution frontend constants differ from backend; public Website is on hold. | Defer until public Website scope resumes. |

## Reproduction

- INT-001: before deployment, request the same protected GET through ports 3000 and 8080; port 3000 returns HTML while 8080 returns JSON 401.
- Status mismatches: compare the named frontend constant maps to the named backend enum declarations; no runtime mutation is required.

## First corrective actions

1. Deploy and staging-verify INT-001 remediation.
2. Correct Sales enums and add contract fixtures.
3. Separate/correct Purchase document/order/payment enum maps.
4. Correct Procurement Planning run states.
5. Add generated/shared enum metadata or a contract artifact to prevent future drift.
6. Add authenticated list/detail tests with every enum value.
7. Add workflow/reload tests for Sales, Purchase, and Procurement.
8. Add role-matrix tests for permission flags.
9. Add read-only staging API schema snapshots.
10. Defer public Website enum repair until it returns to scope.
