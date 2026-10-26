# Dispatch Excel Alignment — Prioritized Fix Backlog

**Verification update:** 2026-10-10. The current `codex` source was reinspected. No Dispatch business behavior was changed because the required business-policy decisions and calculation inputs are not present in the approved evidence.  
**Priority convention:** P0 blocks safe use; P1 prevents formula-equivalent results; P2 is important after business confirmation; P3 is data/workbook hygiene.

| ID | Priority | Status | Gap / decision | Recommended change | Exact implementation area | Acceptance criteria |
|---|---|---|---|---|---|---|
| D-01 | P0 | BLOCKED | Workbook contains `#REF!` errors in current, total, warehouse quantity, and output chains | Repair the reference workbook and obtain an approved clean baseline before using it for numeric acceptance | Workbook owner; examples: `WAREHOUSE_QUANTITY!N17`, `OUTPUT` cached error cells | Formula-error scan returns no `#REF!`; recalculated outputs are versioned and approved. |
| D-02 | P1 | BLOCKED | Dynamic tier rule is absent | Approve whether to replace configured tiers with the Excel threshold rule. The source has no 30-day-sales input or approved period semantics. | Tier-resolution service before `DispatchCalculationService.Calculate`; calculation-input query | Boundary sales values around 7× and 20× boxes select an approved, run-immutable tier. |
| D-03 | P1 | BLOCKED | Safety-stock equation differs | Approve the formula and provide the 30-day sales plus network warehouse-share inputs, or formally retain COSMOS's current formula | `DispatchCalculationService.cs:31-33`; calculation-input SQL | Representative safety stock matches a clean, approved fixture to six decimals. |
| D-04 | P1 | BLOCKED | Tier-specific output gate/rounding differs | Approve whether the Excel safety gate and each tier's rounding/suppression policy supersede existing per-SKU settings | `DispatchCalculationService.cs:34-70`; setting/domain model | Boundary cases for 0 safety, stock = reorder, 0.5 box, and 1 box yield the approved outcome. |
| D-05 | P1 | BLOCKED | Inbound policy is not Excel-equivalent | Decide between all inbound (Excel) and statuses 2/3 (current COSMOS); do not change eligibility without this decision | `20261008_dispatch_planning_sku_snapshot_integrity.sql:53` | Each inbound status has an approved inclusion result and automated coverage. |
| D-06 | P2 | BLOCKED | Manual total/proportional allocation has no counterpart | Confirm that `OUTPUT!W` remains an operational requirement and specify total meaning and rounding remainder handling | `DispatchAllocationService.cs:9-45`; service/API/UI/audit schema | Allocation is proportional, boxed, deterministic, and auditable according to the approved policy. |
| D-07 | P2 | BLOCKED | Current-stock semantics are unclear | Define whether the workbook value is gross, sellable, or net of reservations/damage | Snapshot import contract/validator; calculation input SQL | Reserved/damaged-stock fixtures produce the documented non-negative quantity. |
| D-08 | P2 | BLOCKED | Period definitions conflict | Define authoritative sales windows for tiering, recurring demand, and safety stock | Snapshot types, UI labels, calculation input query | UI and calculation explanation identify the same approved period. |
| D-09 | P2 | BLOCKED | Manual allocation lacks business meaning/remainder rule | Specify owner, available-quantity meaning, and remainder/zero-proposal treatment | Product decision before D-06 | Signed-off decision table and automated scenarios exist. |
| D-10 | P3 | PENDING | Spreadsheet is position-dependent and includes a suspect secondary block | Retire or isolate `WAREHOUSE_QUANTITY`/secondary `OUTPUT` block from acceptance comparisons unless its owner verifies it | Workbook governance | Clean workbook has one documented output path or labels legacy ranges unsupported. |
| D-11 | P3 | PENDING | Numerical parity is not yet proven | Build approved fixtures from repaired workbook rows and a deterministic dispatch test suite after D-01 through D-09 decisions | Backend test project and integration environment | Fixtures assert every approved intermediate and final result. |

## Recommended implementation order

1. **D-01, D-05, D-07, D-08, D-09:** establish a clean and agreed business baseline.
2. **D-02 through D-04:** implement or explicitly reject formula-equivalence changes.
3. **D-06:** only after the manual-allocation process is confirmed as in scope.
4. **D-10 and D-11:** remove acceptance ambiguity and lock behavior with tests.

## Non-recommendation

Do not copy the workbook's broken references or positional coupling into COSMOS. Where the business policy is approved, implement it through normalized snapshots, versioned configuration, validation, and auditable calculation explanations.
