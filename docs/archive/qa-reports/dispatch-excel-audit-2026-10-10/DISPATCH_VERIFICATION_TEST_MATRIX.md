# Dispatch Excel Alignment — Verification Test Matrix

**Purpose:** provide the test cases required before claiming Excel-equivalent dispatch behavior.  
**Precondition:** use a repaired, recalculated, approved workbook baseline; the supplied workbook has reference errors and cannot be the sole numerical oracle.

| ID | Area | Setup / input | Expected result | Type |
|---|---|---|---|---|
| V-01 | Identity mapping | Same SKU appears in two warehouses and two channels | Each result uses its exact item, warehouse, channel-item mapping; no cross-channel aggregation | API/integration |
| V-02 | Tier boundary 7 boxes | 30-day sales = `7 × unitsPerBox`, then ±0.000001 | Exact boundary follows the approved strict-`>` rule; below/equal is tier 3, above is tier 2 | Unit |
| V-03 | Tier boundary 20 boxes | 30-day sales = `20 × unitsPerBox`, then ±0.000001 | Exact boundary follows approved rule; below/equal is tier 2, above is tier 1 | Unit |
| V-04 | Factor selection | One SKU per tier | Safety and recurring factors match approved tier table/version | Unit |
| V-05 | Recurring demand | Sales = 10, factor = 4 | Recurring demand = 40 before any separately approved rounding | Unit |
| V-06 | Excel safety formula | Fixture with known 30-day sales, total network weekly sales, warehouse weekly sales share, factor | Result equals `30dSales × warehouseShare × factor/4` to six decimals if Excel model selected | Unit/integration |
| V-07 | Current sellable stock | Gross current, reserved and damaged fixture | Result uses documented gross/sellable/net definition and cannot become negative | Integration |
| V-08 | Inbound status | One otherwise-identical inbound snapshot for statuses 1–5 | Inclusion exactly follows approved status policy and is explained in result/audit data | Integration |
| V-09 | Total stock | Current = 10, eligible inbound = 5 | Total = 15 | Unit |
| V-10 | Reorder point | Recurring = 40, safety = 20 | Reorder = 60 | Unit |
| V-11 | Safety gate | Safety ≤ 0, shortage positive | Outcome follows agreed gate policy (Excel would suppress) | Unit |
| V-12 | Stock/reorder equality | Total stock = reorder point | Outcome is explicitly defined and matches approved policy | Unit |
| V-13 | Tier-1 threshold | Shortage just below, at, and above one box | Below one box is suppressed; at/above uses nearest-box rule if Excel policy selected | Unit |
| V-14 | Tier-2 threshold | Shortage just below, at, and above half a box | Below half box is suppressed; at/above uses nearest-box rule if Excel policy selected | Unit |
| V-15 | Tier-3 loose quantity | Positive shortage below one box | Exact loose shortage is returned when Excel policy selected | Unit |
| V-16 | Nearest-box midpoint | Shortage exactly N.5 boxes | Result follows explicitly chosen midpoint rule (Excel `ROUND`; current service uses AwayFromZero) | Unit |
| V-17 | Generic minimum-dispatch interaction | Raw shortage below configured minimum | Assert whether approved policy uses Excel tier threshold or COSMOS generic minimum—never both unintentionally | Unit |
| V-18 | Manual proportional allocation | Proposed warehouse amounts plus a manual total W that does not divide cleanly into boxes | Allocation follows approved proportional, box-rounding, and remainder policy | Unit/API, conditional on D-06 |
| V-19 | Priority allocation | Company stock lower than combined demand with varied allocation/tier/warehouse priorities | Allocation is deterministic and ordered as documented by `DispatchAllocationService` | Unit/API |
| V-20 | Import validation | Missing SKU mapping, invalid quantity, duplicate logical row, invalid inbound status | Validation returns actionable row-level errors; no data is committed | API/integration |
| V-21 | Manual entry validation | One valid manual sales/current/inbound entry for same logical key | `/manual/validate` gives equivalent validation result to CSV import | API/integration |
| V-22 | Run lifecycle | Validate → commit → create → calculate → override → allocate → finalize | State transitions and audit records are correct; finalization does not mutate inventory | API/integration |
| V-23 | Repeat/concurrency | Repeat calculate/allocate requests and concurrent attempts | Results, constraints, and errors are deterministic; no duplicate allocation/finalization | Integration |
| V-24 | Excel parity fixture | Approved repaired workbook rows spanning all tiers and warehouses | Sales, stock, recurring, safety, reorder, shortage, recommendation, and allocation match the approved policy | Regression |

## Required evidence for sign-off

- Versioned clean workbook or curated fixture data with zero formula errors.
- Approved decisions for tiering, sales periods, sellable stock, inbound eligibility, and manual allocation.
- Automated results for V-01 through V-24, with conditional V-18 only if manual allocation is retained.
- A sampled human-readable calculation explanation from the API showing all intermediate quantities.

## Current audit limitation

This matrix was not executed against a live database/API. It is a verification plan derived from source and formula inspection, not a test-execution report.
