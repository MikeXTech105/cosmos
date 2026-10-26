# Dispatch Business Decisions

**Date:** 2026-10-10  
**Reference availability:** `Copy of NEW DISPATCH SCHEDULING(3).xlsx` was not found. The inspected reference was `D:\Downloads\Copy of NEW DISPATCH SCHEDULING.xlsx`; its primary formulas were used, while its broken and legacy ranges were excluded.

## Decision matrix

| Area | Existing COSMOS behavior | Workbook evidence | Decision / recommendation | Sufficient to implement? | Approval still required? |
|---|---|---|---|---|---|
| A. Product tier | Per-SKU configured tier, with effective dates | Tier 1 when 30-day sales > 20 boxes; Tier 2 when > 7; else Tier 3 | Implemented as an explicit Excel-parity strategy, but retain configured tiers as production default. The source has no approved 30-day snapshot. | Yes for isolated parity calculation | Yes, before switching production selection/source |
| B. Safety stock | `recurring demand × safety factor` | `30-day SKU sales × warehouse weekly-sales share × factor/4` | Implemented as an explicit Excel-parity strategy. Retain existing production policy until 30-day source and network scope are approved. | Yes for isolated parity calculation | Yes, before production activation |
| C. Eligibility/rounding | Configured minimum, rounding mode, and loose flag; no safety-positive gate | Safety > 0 gate; tier 1 < 1 box suppress; tier 2 < 0.5 box suppress; tier 3 loose below 1 box; otherwise nearest box | Implemented exactly in the parity strategy. Retain configured production rules until policy supersession is approved. | Yes for isolated parity calculation | Yes, before production activation |
| D. Inbound | Only `Dispatched` and `InTransit` (2/3) inbound counts | Workbook adds all entered inbound; it has no inbound status | Intentionally retain eligible-inbound-only production policy. Counting planned/cancelled/received rows as available would risk incorrect stock. | No change required | Yes, only if business wants all-inbound parity |
| E. Current stock | Sellable inventory snapshot; company allocation subtracts reservations | Workbook has a raw current-stock grid with no reservation/damage semantics | Intentionally retain sellable/net stock. It is the safer established definition and avoids allocating reserved/damaged stock. | No change required | Yes, only if source contract is to be redefined |
| F. Sales periods | Import rows carry optional `PeriodFrom`/`PeriodTo`, but calculation input has one sales quantity | Workbook uses weekly sales for recurring demand/warehouse share and a separately labelled 30-day sales input for tier/safety | Parity model requires explicit weekly and 30-day values. Production source mapping is blocked until periods are formally defined. | Yes for isolated parity calculation | Yes |
| G. Manual allocation | Priority/tier/warehouse ordered allocation from company stock | `OUTPUT!W` accepts manual total then proportionally box-rounds by proposal | Intentionally retain priority allocation. The workbook does not define W authority, residual handling, zero-proposal behavior, or audit requirements. | No | Yes |

## Implemented policy boundary

`DispatchExcelParityCalculationService` is an explicitly selected, non-default calculation strategy. It requires all independent inputs rather than inferring an unapproved sales period or inventory policy. Its policy version is `dispatch-excel-parity-v1`.

The existing `DispatchCalculationService` remains the production run path. No API contract, database schema, stored procedure, run lifecycle, default calculation version, or frontend behavior was switched.

## Rules verified in the parity strategy

- Tier thresholds are strict: exactly 7 boxes is Tier 3; exactly 20 boxes is Tier 2.
- Factors are Tier 1 = safety 3/recurring 4, Tier 2 = 4/2, Tier 3 = 4/4.
- Safety stock uses the workbook network-share formula and rejects a positive 30-day-sales calculation with a zero network weekly-sales denominator.
- Total stock is the explicitly supplied current stock plus explicitly supplied inbound quantity, counted once.
- A positive safety stock and stock no greater than reorder point are required for recommendation eligibility.
- Tier 1 and Tier 2 suppression thresholds and Tier 3 loose-under-box behavior follow the primary output formula. Full-box output uses nearest-box rounding with midpoint away from zero, matching Excel `ROUND` for positive quantities.

## Excluded evidence

- Cached results and ranges containing `#REF!` were not used as expected values.
- The `WAREHOUSE_QUANTITY` corruption and suspect secondary `OUTPUT` block were not reproduced.
- Manual W-column allocation was not implemented because no business definition exists.

## Approval request for production activation

Before wiring the parity strategy into runs, approve: (1) the 30-day sales snapshot and period definition, (2) the network scope for warehouse shares, (3) whether it supersedes configured tier/factor/rounding settings, and (4) whether current eligible-inbound and sellable-stock policies remain in force.
