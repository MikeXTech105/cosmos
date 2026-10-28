# HR operator setup and payroll safeguards

Implementation baseline: `da4620383e88f4831a2c0d719882befd497661d7`.

The existing HR pages now expose maintained leave types/entitlements, salary components, component amounts, salary structures and effective employee assignments. They use the existing HR tables and permission families. Setup is embedded in Leaves and Payroll; no parallel master storage or new menu permission is introduced.

## Deployment and verification state

Apply `backend/database/migrations/20261028_02_hr_operator_setup.sql` after the existing HR schema and employee migrations. The migration is additive: version columns, proposed-correction fields, a payroll employment-date function and stored procedures. It does not reset a database, seed company staff, grant leave automatically, rebase existing balances, alter posted payroll details or change existing enum values.

The human requested SQL scripts for later execution. No live SQL migration or lifecycle pass is claimed. Use the repository's guarded implementation SQL runner. The HR integration suite reads only `COSMOS_HR_INTEGRATION_CONNECTION_STRING` and refuses a catalog outside `CosmosHrIntegrationTests_*`. Provide this privately, never as a chat message or committed connection string.

The HR test catalog needs the existing HR tables/procedures and `AuditLogs`, with no active company staff. Inactive predecessor records or master sentinels can represent an upgrade. `HrOperatorSetupSqlIntegrationTests` creates its own labeled synthetic staff, applies the new migration twice to populated tables, tests setup/concurrency/leave/payroll/corrections, retains the resulting test history and marks its own staff inactive. It is tagged `Category=SqlIntegration` and reports a skip when no explicit connection exists.

Before a company upgrade, take and verify a database backup. Review this migration against a disposable populated clone, then deploy the reviewed incremental script. Preserve posted data during rollback: restore the reviewed previous procedure definitions or restore the backup to a separate recovery catalog and reconcile. Do not drop version/history columns or erase payroll/leave/attendance history as a rollback shortcut.

## API contracts

All routes below require authentication. Scope remains the existing trusted company SQL catalog. Route IDs and DTO IDs retain `long` precision; the frontend uses the existing exact JSON transport, text identities and decimal number tokens.

| Route under `/api/hr/setup` | Method | Permission |
| --- | --- | --- |
| `leave-types` | GET / POST | HR.Leave View / Create |
| `leave-types/{id}` | PUT | HR.Leave Edit |
| `leave-entitlements/{employeeId}` | GET | HR.Leave View |
| `leave-entitlements` | PUT | HR.Leave Edit |
| `salary-components` | GET / POST | HR.Payroll View / Create |
| `salary-components/{id}` | PUT | HR.Payroll Edit |
| `salary-structures` | GET / POST | HR.Payroll View / Create |
| `salary-structures/{id}` | PUT | HR.Payroll Edit |
| `salary-assignments` | GET / POST | HR.Payroll View / Create |
| `payroll-runs` | GET, searchable/paged | HR.Payroll View |
| `payroll-preflight` | GET, payrollMonth/payrollYear | HR.Payroll View |
| `payroll-rates` | GET, applicable period assignments | HR.Payroll View |
| `attendance-adjustments` | GET pending inbox | HR.Attendance Approve |

Updated type/component/structure and entitlement requests carry the returned base64 `rowVersion`. A stale request fails with conflict and retains the operator's input. Salary structure component replacement is transactional. Duplicate component IDs, negative/over-precision amounts, missing components and duplicate effective assignment dates are rejected. An assigned structure is immutable through this maintenance path; create a new structure and effective assignment to change pay. Assignments that would alter processed payroll history are rejected. Later start dates supersede earlier assignments; a second assignment on the same start date is rejected.

Changing a leave type's annual quota affects the existing new-employee initialization rule. It does **not** grant or reset existing staff balances. An operator can explicitly set an employee's total entitlement. Used days remain unchanged and remaining days equal entitlement minus used; an entitlement below already used days is rejected. Paid/unpaid meaning cannot change for a type with existing applications. Carry-forward/year-end resets are not invented; the existing balance table does not model a leave year.

## Confirmed payroll rules

The human explicitly confirmed these rules during this implementation:

1. Preserve calendar-day earnings prorating and fixed configured deductions.
2. Attendance and approved paid leave on the same employed date block processing for HR correction.
3. Include staff who left during the month for the portion actually employed within the period.
4. When structures change within the month, use one explicitly selected and reviewed period rate, rather than blending rates by day.

Monthly gross earnings are the selected monthly earnings multiplied by payable days and divided by calendar days in that month, rounded to two decimal places. Deductions remain the selected structure's configured fixed amounts. Negative net pay blocks the whole run for review. A single unambiguous structure may select automatically. If multiple structures actually applied during employed dates, the UI requires an explicit per-employee assignment choice and review. The server checks employee ownership, actual period applicability, assignment row version and reviewed flag inside the processing transaction. It rejects another employee's assignment, an off-period assignment, stale versions and missing/duplicate reviews. Payroll details retain the selected assignment, structure, version and monthly earnings/deduction basis alongside the frozen result.

Payable dates are derived from explicit employment intervals, clipped to the payroll month. Present/holiday/week-off/WFH count as one day; half-day counts as one half; approved paid leave contributes one employed date. Cross-month leave is clipped by date rather than assigning its entire day count to its starting month. The overlap gate runs before calculation, so attendance and leave are never counted twice.

The employment-date function uses current joining/resignation/rejoining boundaries and retained `HR.Employees` audit snapshots for older resigned intervals. Read-only snapshot/rejoin/period views keep these sources distinct. Every relevant known rejoin cycle needs a matching prior employment closure, rather than accepting any one older snapshot as the whole history. A retained Rejoin action whose effective date payload is missing also blocks the affected historical period, and prevents an assumed original-join interval from filling a gap. The known resignation-to-rejoining gaps are excluded. If a prior joining date was overwritten or earlier boundaries cannot be reconstructed, preflight names the employee and blocks the run. It does not use audit creation time as the employment date or manufacture continuous employment. Inspect and repair retained history through an authorized process before proceeding.

Preflight lists every included employee, effective setup, component count, recorded attendance dates, employed calendar days and a specific blocker. Processing reruns the same checks under a serializable transaction, locks the period, checks the final staff count and rolls back any incomplete or invalid run. A duplicate period is rejected. Staff missing salary setup cannot disappear through a `CROSS APPLY`/inner join.

The pre-existing population filter remains current employee status Active (`1`) or Resigned (`3`). Current Inactive (`2`) and Terminated (`4`) records are not newly included in historical payroll. That policy was outside the confirmed changes and needs explicit review for any company period involving those records.

## Reviewed attendance corrections

The existing `POST /api/hr/attendance/adjustment-request` accepts optional proposed status/check-in/check-out values and the original values shown to the requester. The new UI begins from an employee/date record, binds identities internally and displays company-local time. Status-only corrections preserve original timestamp precision. Explicit time changes convert through the configured company timezone, including next-day night shifts; invalid clock intervals and DST ambiguity are rejected.

The server checks the submitted original snapshot, captures the attendance row version and prevents a second pending request for the day. An approver sees current and proposed values with the reason in the pending inbox. Approval applies attendance, working/overtime minutes, request state and before/after audit atomically. Minute/overtime calculation retains the existing HR procedure's 480-minute baseline; no new overtime policy is introduced. A changed attendance version or processed payroll period blocks approval. Repeated decisions do not apply a correction twice.

Existing legacy requests without proposed values retain their decision-only meaning; the UI identifies them. They are not silently reinterpreted as attendance edits.

## Recovery and client flow

- Daily attendance date changes, permission role changes and Data Book sheet/view/privacy-tab changes protect pending work. Explicit draft recovery is scoped to the authenticated account, API origin, verified company and context. Recovered work never posts automatically.
- Employee onboarding places identity/contact/employment first; address and bank fields are optional sections. Profile download is explicit. Bank data is excluded from onboarding drafts.
- If employee details save but the bank step fails, the saved employee is retained and the pending bank step can be retried alone. The existing bank endpoint appends history, so retry first reads the current bank record and reconciles an uncertain save response before another append.
- If user creation succeeds but role assignment fails, the account remains visible with a role-only retry. Creating the account again is not the recovery action.
- Leave balances and payslips show business fields instead of raw JSON. Payslip print/save PDF is an explicit action. Exact monetary text is preserved in transport, totals and formatting.
- HR pending leave links preserve employee/status context. Department attendance reporting uses the existing department-report endpoint and links back to the filtered daily roster.

## Evidence

`output/implementation-verification/people-admin-content-progress.json` links finding and coverage outcomes. Focused frontend tests cover exact results, bank response reconciliation, contextual password recovery, department report calls, Data Book refresh/paste preservation, role-step recovery, exact HR identities, safe previews and timezone conversion. Backend tests cover validators, independent permissions and T-SQL parsing. SQL lifecycle assertions are prepared in `HrOperatorSetupSqlIntegrationTests` and remain unexecuted until the guarded catalog is supplied and the user runs the scripts.

Public website preview uses a safe renderer for the supported stored text/Markdown, product fields and announcement bar. The public website's separate renderer/assets are not in this checkout. Exact public-site visual parity and real authenticated role/device journeys require separate verification; preview unit tests do not establish those passes.
