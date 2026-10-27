# Frontend acceptance checklist

Use this alongside the complete prompt, shared specification and actual current contracts. Record screen/component, endpoint/DTO, permission and behavioral test evidence for each row. A label or route name is not implementation proof.

| ID | Required outcome | Evidence to record |
|---|---|---|
| A01 | Baseline/current branch/instructions inspected; all T01–T22,F01–F24,U01–U06,C01–C16 mapped. | Actual changed scope, current test baseline, coverage matrix. |
| A02 | Integrated Production navigation and working deep links, guards, reload/back/active state. | Router/sidebar/permission configuration and browser checks. |
| A03 | Work Centre and Operation are the only two new master UIs. | Lists/forms/detail/active state, versions and permission tests. |
| A04 | Routing + eligibility are under Item > Manufacturing; Work Centre owns shift/calendar/capacity children. | Existing OEE/HR references, effectivity/sequence/rate/cavity validation. |
| A05 | Canonical BOM/output basis and real source/base rational conversion UI. | BH-25;330PCS→30BOX;10BOX→110PCS; unknown/cross-dimension/effectivity states. |
| A06 | Real paged order list, draft creation/edit and frozen detail/context/history. | Separate order/legacy enums; source/date/resource IDs and version payloads. |
| A07 | Explicit entire-allocation release reserves only. | Quantity/reason/retry/permission/UI tests; no fake balance mutation. |
| A08 | Repeated partial completion distinguishes good/rejected/consumed/scrap/staging return. | Concrete request payloads, remaining reservation and variance/shortage handling. |
| A09 | Released amendment/rescheduling, short close/cancel and eligible linked reversal. | State/permission restrictions, blocked reversal and history/drilldown. |
| A10 | Observed demand/freshness and real saved planning snapshots. | Current/stale/missing/no-demand;21/15/7-day/quarter-month; source revision/reload. |
| A11 | Selected source recommendations create real production drafts. | No duplicate conversion; source line identity and authoritative refresh. |
| A12 | Shared-material what-if uses one pool and explains bottleneck/shortage. | Multiple products competing for one component; proposal is not reservation. |
| A13 | Real capacity/calendar/schedule UI with timezone and resource exclusivity. | Overnight shift, dated breaks, unknown rate/cavity, overload and explicit booking. |
| A14 | Existing procurement settings/history support v3, typed lead/default supplier and real positive shortage. | Equality/MOQ/multiple/non30-day normalized safety; historical versions preserved. |
| A15 | Selected finalized lines→existing PO draft with sourced price/tax and real supplier. | Missing cost, stale/already-converted, source IDs and financial precision. |
| A16 | PO approve→Sent, promise history/current follow-up and close remainder. | Unapproved drafts excluded from inbound; no external message side effect. |
| A17 | Accepted/reject/quarantine partial receipt, later bill links and original receipt return/financial credit. | No repeated stock posting; exact identities, over-receipt/return limits, nullable cost. |
| A18 | Explicit invoice owner/partial shipment links in existing Invoice and Shipment screens. | Both action orders, two partial shipments, standalone invoice, dual permissions and conflicts. |
| A19 | Verified packing/base units/legacy draft repair with existing docket/freight/Rojmel/return continuity. | Missing pack, stale conversion, repack prerequisite, original dispatched-line bounds. |
| A20 | Existing configured dispatch preserved and parity helper not advertised as a fake API selector. | Policy/basis labels and real existing contracts. |
| A21 | Operator import wizard covers all22 source dispositions, provenance and selected safe rows. | Repeated headers, inactive history, duplicates, unresolved units/PO/cost/actor, blank tab/canvas evidence. |
| A22 | Approved openings and controlled adjustments; direct Item stock balances stay read-only. | Start-of-day cutover, as-of quality flags, source/reason/version audit. |
| A23 | Effective actual manufacturing + signed ledger/as-of/scorecard/plan-actual/capacity views and drilldowns. | Null vs0, separate measures, actual dates, unit-safe full-filter totals and true paging. |
| A24 | Real CSV/NDJSON export uses matching filters/units/permissions/version. | Export payloads, downloads/errors and no page-only totals. |
| A25 | Versions/idempotency/uncertain retries/conflict recovery are real and consistent. | Same key on identical retry; new key for changed payload; reload rather than overwrite. |
| A26 | Actual RBAC and lookup permissions; browser preference is not authority. | View/create/edit/approve/export,403, read-only history, OEE/HR lookup restrictions. |
| A27 | Verified company business dates/timezone and precision-safe wire handling. | Six-place posting, twelve-place source, large numeric boundary, offset/overnight date tests. |
| A28 | Cosmos styling/localization/responsive/accessibility and complete UI states. | Labels/errors/en+hi-en conventions, keyboard/focus/mobile, loading/empty/error/forbidden/stale. |
| A29 | Existing Item/BOM/report fixes and unrelated workflows remain operational. | Relevant regression tests and final diff review. |
| A30 | All appropriate tests/build/lint/browser journeys run; both verification passes evidenced. | Exact commands/results; baseline3 employee failures separate; real SQL results never inferred from mocks. |

## Representative journey checks

1. Configure actual Item/BOM/routing/eligibility/shift → generate verified demand snapshot → material/capacity feasibility → selected order draft.
2. Release → partial accepted+rejected output/actual components → amend/reschedule → complete or short close → eligible correction, with correct versions and uncertain retry recovery.
3. Finalized procurement recommendation → sourced-price PO draft → approve → partial receipt → later bill link/confirmation → supplier return → financial credit → close remaining supply.
4. Invoice-owner declaration + line links → invoice then two partial dispatches, and the reverse action order; standalone invoice/cancel and original-line shipment returns.
5. Source stage/map → validate/reconcile → selected-safe approve/post; unresolved/inactive/duplicate evidence remains understandable → unit-safe historical/current report and export.

## Completion boundary

Provide separate results for frontend/unit/contract/browser verification and real authenticated SQL journeys. No disposable SQL runtime is an explicit unverified gate, not a successful test. Do not deploy or modify a live company catalog to clear it. Missing real source evidence remains a repairable exception. Do not call a partly built UI complete.
