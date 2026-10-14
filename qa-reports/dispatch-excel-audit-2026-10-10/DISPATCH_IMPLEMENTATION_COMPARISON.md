# Dispatch Excel vs COSMOS Implementation Comparison

**Audit date:** 2026-10-10  
**Comparison basis:** read-only inspection of `Copy of NEW DISPATCH SCHEDULING.xlsx` and the current `codex` source tree. No API, database, UI, or workbook was changed.

## Summary counts

| Classification | Count | Meaning |
|---|---:|---|
| MATCH | 3 | Equivalent core behavior is implemented |
| MISMATCH | 4 | Formula/business behavior differs materially |
| MISSING | 1 | Workbook capability has no equivalent workflow |
| PARTIAL | 2 | Related capability exists but semantics differ/incomplete |
| AMBIGUOUS | 2 | A business definition or workbook integrity issue prevents a definitive conclusion |
| UNVERIFIED | 2 | Requires a live integration/runtime check |

## Detailed comparison

| ID | Excel rule/evidence | COSMOS implementation/evidence | Status | Finding |
|---|---|---|---|---|
| C-01 | SKU × warehouse matrices in all core sheets | Calculation inputs are item, warehouse, and channel-item mapping; SQL joins these identities in `20261008_dispatch_planning_sku_snapshot_integrity.sql:48-58` | MATCH | COSMOS uses a stronger normalized identity model than the positional workbook. |
| C-02 | `TOTAL_STOCK = CURRENT_STOCK + INBOUND_STOCK` | `DispatchCalculationService.cs:25-29` adds `CurrentSellableQuantity + EligibleInboundQuantity` | PARTIAL | Same structural rollup, but inbound eligibility and stock semantics differ (C-09/C-10). |
| C-03 | Tier is calculated from 30-day sales: `>20 boxes → 1`, `>7 boxes → 2`, else 3 | Calculation receives an already configured `Tier`; no sales-threshold tier derivation appears in `DispatchCalculationService.cs:13-52` | MISMATCH | Workbook tiers are dynamic; COSMOS tiers are configuration-driven. |
| C-04 | Warehouse recurring demand = sales × tier-derived recurring factor | `DispatchCalculationService.cs:31` calculates `sales × RecurringDemandFactor` | MATCH | The multiplication is equivalent; selection of the factor is affected by C-03. |
| C-05 | Safety = 30-day SKU sales × warehouse sales share × safety factor/4 | `DispatchCalculationService.cs:32` calculates `recurring demand × SafetyStockFactor` | MISMATCH | Different algorithm and input period. This can produce materially different reorder points. |
| C-06 | Reorder point = recurring demand + safety stock | `DispatchCalculationService.cs:33` follows the same composition | MATCH | Formula structure is equivalent once upstream inputs are accepted. |
| C-07 | Output requires safety stock > 0; tier-specific minimum/suppression and loose tier-3 shortage | `DispatchCalculationService.cs:34-36,54-70` uses generic `max(shortage, minimum dispatch)` then configured rounding/loose flag | MISMATCH | COSMOS has no safety-positive gate and does not select the workbook’s rules from a dynamically derived tier. |
| C-08 | `OUTPUT!W:AO` takes a manually entered total and allocates proportionally by warehouse proposal, rounded to boxes | `DispatchAllocationService.cs:9-45` consumes company stock automatically in allocation-priority, tier, warehouse-priority order | MISSING | No manual total / proportional-allocation workflow exists. |
| C-09 | All entered inbound is included; no status field | SQL filters inbound to `InboundStatus IN (2,3)` at `20261008_dispatch_planning_sku_snapshot_integrity.sql:53` | MISMATCH | COSMOS excludes inbound that is not dispatched/in transit. This may be an intentional policy improvement, but it is not Excel-equivalent. |
| C-10 | Workbook has raw current stock only; no reserved/damaged fields | SQL uses `SellableQuantity`; company stock records `CurrentStock - ReservedStock` at migration lines 106-107 | AMBIGUOUS | Determine whether Excel current stock was already sellable/net. If not, COSMOS is more conservative; if yes, data sources may be equivalent. |
| C-11 | Blank cells, positional matrices, and reference errors are tolerated by the workbook | Import validation and a dedicated manual-validation endpoint exist at `DispatchPlanningControllers.cs:65-71`; application validation is explicit | PARTIAL | COSMOS has stronger validation, but exact treatment of every workbook blank/duplicate/misaligned case is not equivalent. |
| C-12 | Workbook has a manual allocation instruction but does not persist an execution lifecycle | COSMOS validates, creates runs, calculates, overrides, allocates, and finalizes (`DispatchPlanningService.cs:122-224`) | AMBIGUOUS | COSMOS adds an audit/run lifecycle; business must decide whether manual W allocation is still a required operating step. |
| C-13 | Formula results/cached values include `#REF!` failures | No live run or migrated workbook dataset was executed in this audit | UNVERIFIED | Need a corrected workbook dataset and a sandbox run before numerical sign-off. |
| C-14 | Formula source has no explicit retry/idempotency acceptance evidence | Database/API behavior was not executed against concurrent/repeated requests | UNVERIFIED | Validate import, calculate, allocate, finalize, and duplicate-request behavior in a test environment. |

## Material differences by calculation phase

### Tier and factors

The workbook selects factors automatically from a sales-to-box threshold. COSMOS accepts a configured tier and factors. This is the largest configuration/automation difference: matching the workbook requires either an explicit tier-refresh rule or a documented decision that operations maintain tiers manually.

### Safety stock

The workbook spreads SKU 30-day sales among warehouses according to each warehouse's share of total weekly sales, then applies its factor. COSMOS derives safety stock from already-calculated recurring demand. Neither is a simple parameterization of the other.

### Dispatch rounding and suppression

The workbook's outcome varies by tier: two tiers suppress small requests and one permits sub-box dispatch. COSMOS supports multiple rounding modes and an allow-loose flag, but also raises every shortage to a generic minimum before rounding. Exact behavioral equivalence is absent unless configurations and a safety gate are deliberately added/changed.

### Inputs and allocation

COSMOS is safer on data integrity: it has an identity mapping, validation, an audit trail, and eligible-inbound logic. It is not a formula-faithful replication of the workbook, especially for all-inbound inclusion and manual proportional allocation.

## Source locations inspected

- `backend/src/Cosmos.Application/Services/DispatchCalculationService.cs:13-72`
- `backend/src/Cosmos.Application/Services/DispatchAllocationService.cs:9-45`
- `backend/src/Cosmos.Application/Services/DispatchPlanningService.cs:122-224`
- `backend/src/Cosmos.API/Controllers/DispatchPlanning/DispatchPlanningControllers.cs:65-143`
- `backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql:35-111`

Line references identify the code reviewed at audit time and are not claims of runtime verification.
