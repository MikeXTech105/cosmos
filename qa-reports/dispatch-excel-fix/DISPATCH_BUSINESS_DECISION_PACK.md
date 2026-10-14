# Dispatch Excel-Parity Business Decision Pack

**Purpose:** obtain explicit decisions before policy-2 (Excel-parity) integration is implemented.  
**Status:** recommendations only; none of the recommendations in this pack is an approved business rule.  
**Scope:** documentation and analysis only. No code, schema, API, procedure, default, or data change was made.

## How to read this pack

### Current production behavior

The live Dispatch path uses the configured calculation service. It reads one committed sales batch, effective SKU settings, sellable stock, and inbound statuses 2/3. It calculates recurring demand as `sales × configured recurring factor`, safety stock as `recurring × configured safety factor`, then applies the setting's minimum quantity, loose flag, and one of six configured rounding modes. See `backend/src/Cosmos.Application/Services/DispatchCalculationService.cs:24-70` and `backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql:42-81`.

### Spreadsheet/parity behavior

The isolated parity engine is **not production-integrated**. It selects tier from 30-day sales and units per box using strict `> 7` and `> 20` box thresholds; derives tier factors; calculates recurring demand from warehouse weekly sales; calculates safety stock from the warehouse/network weekly share; and uses tier-specific threshold/rounding rules. See `backend/src/Cosmos.Application/Services/DispatchExcelParityCalculationService.cs:15-69`.

The Excel workbook is evidence for the parity formula, not an approval for unanswered source-period, aggregation, correction, authorization, or operational policy questions.

### Worked-example convention

Examples below are illustrative. Unless a decision says otherwise, they use `10 units/box`, no current/inbound stock, and valid non-negative inputs. They demonstrate consequences; they are not proposed master data.

## Decision summary

| ID | Primary owner | Classification | Recommended direction |
|---|---|---|---|
| BD-01 | Business owner | Business approval | Exact, inclusive, one-window weekly batch rule. |
| BD-02 | Business owner | Business approval | One committed, validated 30-day source batch/window per parity run. |
| BD-03 | Business owner | Business approval | Explicitly choose mapping or item/channel aggregation; never accidental aggregation. |
| BD-04 | Business owner | Business approval | Define the whole channel population used for warehouse/network share. |
| BD-05 | Business owner | Business approval with technical constraint | Run-level parity math; setting retained only for allocation/FK provenance. |
| BD-06 | Business owner | Business approval | Retain sellable stock and inbound statuses 2/3 unless explicitly changed. |
| BD-07 | Business + security owner | Business/security approval | Dedicated policy-2 permission plus named pilot scope. |
| BD-08 | Business owner | Business approval; technical design implementable | Freeze once and replay immutable policy-2 inputs. |
| BD-09 | Business owner | Business approval with technical design | Record explicit applied parity rule, not a misleading configured mode. |
| BD-10 | Business owner | Business approval | Keep manual proportional allocation out of this release. |
| BD-11 | Data owner | Data-governance approval; technical evidence first | Read-only audit, exception register, then non-destructive remediation. |
| BD-12 | Operations owner | Operational approval | Disable future policy-2 selection; preserve all historical runs. |

## Decisions requiring explicit business approval

### BD-01 — Weekly-sales period

- **Decide:** the exact weekly window: calendar or rolling, inclusive boundaries, timezone, number of required days, and whether a selected weekly batch may contain only one approved window.
- **Options:**
  1. Calendar week, such as Monday–Sunday in the approved business timezone.
  2. Rolling seven complete local-business days ending before the planning date.
  3. Another fixed fiscal-week calendar supplied by the business.
- **Recommendation:** calendar/fiscal week with explicit inclusive dates and timezone, and exactly one matching committed batch window. It is easiest to audit, compare to workbook evidence, and reject incomplete imports deterministically.
- **Concrete example:** with 30-day sales `100`, network weekly sales `100`, and Tier 2, a warehouse weekly total of `20` produces recurring `40`, safety `20`, and a `60`-unit recommendation. If a partial/rolling window reports `30`, the same row produces recurring `60`, safety `30`, and a `90`-unit recommendation.
- **Risk if unresolved:** a mixed, incomplete, or overlapping batch can be accepted and materially change dispatch quantities without an identifiable business rule.
- **Evidence:** current validation checks each row's period ordering but not batch-wide window completeness/overlap at `backend/database/migrations/20260728_dispatch_planning_module.sql:458-493`.

### BD-02 — 30-day-sales source and window

- **Decide:** which committed source supplies 30-day sales, whether it is one batch or an approved multi-batch composition, its calendar/rolling definition, correction handling, and timezone.
- **Options:**
  1. One committed 30-day batch with one exact approved window.
  2. A deterministic set of daily/weekly committed batches spanning an exact 30-day window.
  3. A manually assembled aggregate (not recommended without a dedicated, auditable source contract).
- **Recommendation:** one committed, validated 30-day batch per parity run. It minimizes joins, correction ambiguity, and replay risk; a multi-batch source is viable only after its ordering, overlap, correction, and immutability rules are separately approved.
- **Concrete example:** at `10 units/box`, 30-day sales of `200` is Tier 2 because the threshold is strictly greater than 20 boxes. A later correction to `210` moves the row to Tier 1. With weekly sales `20`, network `100`, and zero stock, the illustrative parity recommendation changes from `80` (Tier 2) to `110` (Tier 1 after box rounding).
- **Risk if unresolved:** tier selection can change merely because different operators choose different batch combinations, making a run irreproducible.
- **Evidence:** no current run column or procedure input identifies a 30-day batch; the proposed field exists only in the design at `qa-reports/dispatch-excel-fix/DISPATCH_CONTROLLED_INTEGRATION_DESIGN.md:32-45`.

### BD-03 — 30-day aggregation identity

- **Decide:** whether 30-day sales are aggregated by internal item, by channel-SKU mapping, by item+channel, or another explicitly defined business identity.
- **Options:**
  1. **Per mapping:** each marketplace/channel SKU has independent 30-day demand and tier.
  2. **Per item+channel:** all active channel mappings for an item share one demand/tier basis.
  3. **Per item across channels:** only if the business explicitly wants cross-channel demand to influence a channel run.
- **Recommendation:** choose per mapping when a channel SKU represents independently managed demand; otherwise choose item+channel. The key requirement is a written identity rule applied consistently to source aggregation, tier calculation, snapshots, and reports.
- **Concrete example:** one item has mappings A and B. A has 30-day sales `70`, B has `30`. Per mapping, A is Tier 3 at the strict 7-box boundary and B is Tier 3. If the item total `100` is applied to both mappings, each can be treated as Tier 2 and the same item demand may be counted twice in recommendations.
- **Risk if unresolved:** duplicated or understated demand and inconsistent tiers when one internal item has multiple channel SKUs.
- **Evidence:** production input/result identity includes `ChannelItemMappingId` (`backend/database/migrations/20261008_dispatch_planning_sku_snapshot_integrity.sql:42-64, 103`), while parity's 30-day source identity is not defined.

### BD-04 — Warehouse-share numerator and network denominator

- **Decide:** the population used for `warehouse weekly sales / network weekly sales`: all channel warehouses/SKUs, or a defined subset; and treatment of inactive mappings, zero-sales warehouses, returns, and correction rows.
- **Options:**
  1. All active mappings and warehouses in the channel for the approved weekly window.
  2. Only warehouses/mappings participating in the particular run.
  3. A business-maintained eligible subset.
- **Recommendation:** all active channel mappings/warehouses in the approved window, with correction/return inclusion explicitly defined. This most closely expresses a network share and prevents a run subset from inflating safety stock.
- **Concrete example:** with 30-day sales `100`, warehouse weekly `20`, and Tier 2, denominator `100` gives safety `20`; a run-subset denominator `50` gives safety `40`. Recurring stays `40`, so zero-stock recommendation changes from `60` to `80`.
- **Risk if unresolved:** two runs of the same warehouse can produce different safety stock solely because their batch/run membership differs.
- **Evidence:** the isolated engine divides the warehouse weekly input by the network weekly input at `DispatchExcelParityCalculationService.cs:24-28`; it cannot decide population itself.

### BD-05 — Does parity replace configured calculation rules?

- **Decide:** whether policy 2 replaces configured tier, factor, minimum-dispatch, loose-quantity, and rounding calculation values for the entire run; and what remains sourced from the effective SKU setting.
- **Options:**
  1. Parity fully replaces calculation math but retains the effective setting ID/allocation priority as provenance and allocator input.
  2. Hybrid calculation, where selected configured factors or rounding remain active.
  3. Continue configured policy only; do not activate policy 2.
- **Recommendation:** option 1, run-level only. It is auditable and avoids a hidden per-row mixture of workbook and configured rules. Require an effective setting for the existing foreign key and allocation priority, but snapshot it and exclude its factors/tier/rounding from parity math.
- **Concrete example:** an illustrative setting may have Tier 3, recurring factor `1`, safety factor `1`, and nearest-box rounding; it would produce a different result from policy-2 Tier 1 factors `4` recurring / `3` safety for 30-day sales `210`. A hybrid cannot explain which policy produced a given quantity.
- **Risk if unresolved:** policy 2 can silently depend on configuration changes, and the required result setting FK may prevent calculation for an otherwise valid parity row.
- **Evidence:** production consumes effective setting tier/factors/minimum/rounding at `DispatchCalculationService.cs:24-49`; recommendation results require `DispatchSkuSettingId`, tier, and rounding metadata at `20260728_dispatch_planning_module.sql:232-270`.

### BD-06 — Sellable-stock and inbound eligibility semantics

- **Decide:** whether parity uses existing sellable stock and inbound statuses 2/3, or a specifically approved alternative.
- **Options:**
  1. Retain current sellable stock and statuses 2/3.
  2. Include a different named set of inbound statuses.
  3. Use a different stock definition with an explicit source/formula.
- **Recommendation:** option 1 unless the business provides a tested replacement. It preserves current production semantics and isolates Excel-parity differences to approved parity formulas.
- **Concrete example:** reorder point `100`, sellable stock `50`, inbound status 2 quantity `20`, and status 1 quantity `40`: current semantics count total stock `70`, giving a `30` shortage. Including all inbound counts `110` and suppresses dispatch.
- **Risk if unresolved:** business users may compare parity results to an Excel total with a different inbound meaning and reach contradictory conclusions.
- **Evidence:** production aggregation filters inbound statuses `IN (2,3)` at `20261008_dispatch_planning_sku_snapshot_integrity.sql:50-58`.

### BD-07 — Who may select policy 2?

- **Decide:** whether current Dispatch Planning Create authority is sufficient, or whether policy-2 selection needs a separate permission and named pilot users/channels.
- **Options:**
  1. Reuse the generic run-create permission.
  2. Add a dedicated policy-2 selection permission and pilot allow-list.
  3. Keep policy 2 unavailable outside a controlled technical comparison environment.
- **Recommendation:** option 2 for a pilot. It preserves normal policy-1 authority and makes every parity selection intentional and auditable.
- **Concrete example:** the same request payload without a policy field stays policy 1. With policy 2 selected, a generic creator could otherwise generate an operationally different recommendation. Under a dedicated permission, that request receives an authorization failure until the user is approved.
- **Risk if unresolved:** the feature can be exposed more broadly than the pilot plan intends.
- **Evidence:** the current controller has existing Dispatch Planning action authorization but no policy-selection authorization at `backend/src/Cosmos.API/Controllers/DispatchPlanning/DispatchPlanningControllers.cs:91-119`.

### BD-08 — Recalculation and input snapshot replay

- **Decide:** what a second Calculate request does after a parity run has been calculated once.
- **Options:**
  1. Replay the immutable first-calculation snapshot and reproduce the same result.
  2. Reject recalculation after the first successful policy-2 calculation; create a new run for new sources.
  3. Re-query current inputs and replace results (not recommended).
- **Recommendation:** option 1. Capture all parity inputs, source batch/window identities, effective profile/setting provenance, and calculated intermediates atomically with results; on recalculation, re-run only from those frozen values. If a source correction is needed, create a new run.
- **Concrete example:** first calculation uses warehouse weekly `20`, network `100`, 30-day `100`, resulting in a `60` recommendation. A later import/profile change makes weekly `30`. Replay remains `60`; reject returns a lifecycle conflict; re-query would change the same historical run to `90`.
- **Risk if unresolved:** an audit trail can show the same run ID producing two different recommendations from mutable data.
- **Evidence:** current recalculation allows Draft/Calculated, deletes results, and re-reads inputs while preserving company stock only if absent (`20261008_dispatch_planning_sku_snapshot_integrity.sql:91-112`).

### BD-09 — Truthful policy-2 rounding record

- **Decide:** the approved labels/codes presented to users and auditors for parity rounding behavior.
- **Options:**
  1. Extend the applied rounding-rule vocabulary with explicit parity rule codes per tier.
  2. Store only free-text explanation (not recommended; difficult to query/validate).
  3. Reuse a configured rounding mode value even when it is not the actual parity behavior (not acceptable).
- **Recommendation:** option 1. Use an explicit applied-rule code plus a complete calculation explanation; retain configured setting rounding separately as provenance where needed.
- **Concrete example:** at `10 units/box` and shortage `6`, Tier 1 parity returns `0`, Tier 2 returns `10` (six is at/above half-box), and Tier 3 returns loose `6`. Reporting all three as configured `NearestBox` would incorrectly suggest Tier 1 should have been `10` and would hide Tier 3 loose dispatch.
- **Risk if unresolved:** persisted/UI metadata misrepresents calculation behavior even when final quantities happen to be correct.
- **Evidence:** parity rounding differs by tier at `DispatchExcelParityCalculationService.cs:59-69`; production has six configured modes at `DispatchCalculationService.cs:54-70`.

### BD-10 — Manual proportional allocation

- **Decide:** whether the workbook's manual/W-column proportional allocation is explicitly excluded or requires a separate future workflow.
- **Options:**
  1. Exclude it from policy-2 integration.
  2. Approve a separate workflow with authority, entered-total, eligible lines, rounding/remainder, audit, and permission rules.
- **Recommendation:** option 1 for this integration. Keep the existing priority allocator untouched; assess manual allocation independently.
- **Concrete example:** with company stock `100` and recommendations of `80` and `80`, existing priority allocation gives the higher-priority line `80` and the next `20`. A proportional rule might give `50/50`; these are operationally different allocations, not a calculation rounding detail.
- **Risk if unresolved:** implementation can accidentally change existing allocation priority semantics while adding parity calculation.
- **Evidence:** current allocator replaces allocations transactionally from its supplied priority allocation output at `20260728_dispatch_planning_module.sql:767-801`.

### BD-11 — Mapping-identity source data

- **Decide:** how data owners will classify and remediate existing source rows that cannot safely represent multiple channel mappings for the same item/warehouse/window.
- **Options:**
  1. Read-only audit first, then retain/report all ambiguous records and block them from policy-2 until corrected at source.
  2. Correct source data through approved new imports/adjustment records, preserving originals and lineage.
  3. Merge/delete existing records (not allowed).
- **Recommendation:** options 1 and 2 in sequence. Use the separate audit plan; do not change historical data and do not infer a winner among duplicate mappings.
- **Concrete example:** item `I1`, warehouse `W1`, same week, mappings `AMZ-RED` and `AMZ-BLUE` cannot both be uniquely represented by the sales table's current `(batch, warehouse, item, period)` key. Treating their `40` and `60` sales as one arbitrary mapping can make one SKU receive `100` and the other `0` instead of preserving two demand streams.
- **Risk if unresolved:** mapping-level parity tests can pass on clean fixtures while production imports reject, collapse, or ambiguously attribute real demand.
- **Evidence:** source uniqueness omits `ChannelItemMappingId` at `20260728_dispatch_planning_module.sql:86-137,303-304`, but calculation groups by it at `20261008_dispatch_planning_sku_snapshot_integrity.sql:42-64`.

### BD-12 — Pilot rollback and exit

- **Decide:** who can stop policy-2 usage, what triggers a halt, and how a pilot run is handled after a detected discrepancy.
- **Options:**
  1. Disable policy-2 selection for future runs, preserve all already created runs/snapshots/results, and investigate.
  2. Recalculate/edit historical parity runs (not recommended and inconsistent with reproducibility).
  3. Let policy 2 remain selectable while investigation continues (not recommended).
- **Recommendation:** option 1. Rollback is a forward-only feature control: future runs use policy 1; historical evidence remains intact.
- **Concrete example:** a signed-off batch later reveals a `10`-unit discrepancy. Under option 1, future runs cannot select policy 2 while the already-calculated run remains auditable. Under option 2, overwriting it removes the evidence needed to diagnose the discrepancy.
- **Risk if unresolved:** operators may mutate historical evidence during an incident or continue creating potentially affected runs.
- **Evidence:** finalized runs are already protected from mutation (`20260728_dispatch_planning_module.sql:811-818,846-861`); the policy-2 rollout needs the same operational discipline before finalization.

## Decisions resolved by technical evidence, not business preference

These do not need a business formula choice, but must be designed/implemented correctly:

1. Policy 1 remains default and its omitted-policy path must be regression-equivalent to the existing production calculation.
2. Batch-channel/status/window relations require stored-procedure/application validation; SQL CHECK constraints cannot enforce them across tables.
3. Policy inputs, result rows, and run-state update must commit/roll back in one transaction.
4. Existing priority allocation remains unchanged; no manual allocation DTO/endpoint/branch belongs in this scope.
5. Historical runs must not be recalculated or populated with invented parity input snapshots.

## Required explicit answers from the business owner

1. What exact weekly and 30-day windows and sources are approved?
2. What is the 30-day aggregation identity and the warehouse/network share population?
3. Does policy 2 fully replace configured calculation math, while retaining settings only for allocation/provenance?
4. Are sellable stock and inbound statuses 2/3 retained?
5. Who may select policy 2 during pilot, and what is the pilot scope?
6. Is immutable snapshot replay approved for a recalculation request?
7. Are the proposed explicit parity rounding labels acceptable?
8. Is manual proportional allocation out of scope?
9. Who owns mapping-data remediation, and what is the approved correction process?
10. Who can halt the pilot and what is the forward-only rollback procedure?
