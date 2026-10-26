# COSMOS Dispatch Module — Completion Gap Analysis

**Assessment date:** 2026-10-12  
**Scope:** repository and existing Dispatch reports only. No database query, import, application code change, production-data change, audit-SQL execution, or parity-policy activation was performed.  
**Overall conclusion:** the current Dispatch Planning workflow is substantially implemented for the existing configured-settings policy, but it is **not operationally ready** because no real sales, stock, or inbound snapshot data is available. The Excel-parity calculator is tested in isolation but cannot be selected by a run or supplied with reproducible production inputs.

## Status definitions

- **DONE** — implemented in the repository and usable once its normal dependencies/data exist.
- **PARTIAL** — a usable foundation exists, but a required integration, verification, or user-facing capability is incomplete.
- **MISSING** — no implementation exists for the required capability.
- **BLOCKED** — work cannot safely proceed until an explicit business decision, approved data, or approved non-production environment is available.

## What exists versus what is missing

| Area | Status | Repository evidence | Next action |
|---|---|---|---|
| Sales, stock, and inbound snapshot entities | DONE | Tables and integrity rules: `backend/database/migrations/20260728_dispatch_planning_module.sql:86-166`. | Apply/verify schema only in approved environments; load no invented operational data. |
| Import-batch metadata and staging/commit workflow | DONE | Staging/import procedures: `20260728_dispatch_planning_module.sql:51-84,423-580`; API: `DispatchPlanningControllers.cs:58-88`. | Use approved CSV/manual test fixtures in an isolated database before onboarding operational feeds. |
| CSV import UI | DONE | `frontend/src/pages/dispatch/imports/DispatchImportsPage.jsx:334-936`. | Validate real supplier/channel extract layout and operational ownership. |
| Manual snapshot-entry UI/API | DONE | API endpoint at `DispatchPlanningControllers.cs:66-69`; UI wizard at `DispatchImportsPage.jsx:164-332`. | Use only controlled test records or approved real operational entries; define entry governance. |
| Warehouse identity | PARTIAL | `ChannelWarehouses` is referenced by all three snapshot tables (`20260728...:103-105,132-134,161-163`); import rows require `WarehouseId` and `ChannelSku` in `DispatchPlanningDtos.cs:33-48`. | Audit that every feed warehouse maps to an active channel warehouse; run the mapping audit only on an approved replica/restored database. |
| SKU/item identity | PARTIAL | Imports resolve `ChannelSku` to `ChannelSkuMappings`; snapshot tables persist item and mapping IDs (`20260728...:88-108`). | Resolve/repair mappings through the approved master-data process; do not infer an identity from an unmatched SKU. |
| Units per box | DONE | Existing procedure selects effective `ItemPackagingProfiles` (`20261008_dispatch_planning_sku_snapshot_integrity.sql:74-80`). | Create/verify profiles and effective dates for all Dispatch SKUs in test data, then operational master data. |
| Existing configured-policy calculation | DONE | Run inputs aggregate selected sales/stock/inbound batches (`20261008...:35-83`); service invokes `DispatchCalculationService` in `DispatchPlanningService.cs:174-181`. | Establish deterministic fixtures and run the existing lifecycle against an isolated database. |
| Priority allocation and immutable company-stock snapshot | DONE | Allocation service is retained, with persistence/finalization procedures at `20260728...:767-817`; UI invokes allocation at `DispatchRunDetailPage.jsx:307-328`. | Exercise limited-company-stock fixtures; retain current priority behavior. |
| Run lifecycle, override, finalization, reports | DONE | Run API endpoints: `DispatchPlanningControllers.cs:96-145`; run procedures: `20260728...:610-847`; frontend run/detail/report pages exist. | Execute integration/lifecycle tests with isolated data; no operational finalization until source-data readiness is approved. |
| Existing policy API compatibility | DONE | Create-run request has only current source batches and defaults: `DispatchPlanningDtos.cs:82-89`; existing controller/service do not select a policy. | Keep this contract and policy 1 unchanged during the next phase. |
| Excel-parity calculation engine | DONE (isolated) | `DispatchExcelParityCalculationService.cs:10-87`; boundary/unit tests: `DispatchExcelParityCalculationServiceTests.cs:7-190`. | Retain isolation; use fixture adapters only after data/period decisions. |
| Parity strategy registration or production invocation | MISSING | No parity-service registration in `Cosmos.Application/DependencyInjection.cs:36-38`; `DispatchPlanningService` depends only on `DispatchCalculationService` at lines 21, 43-44 and calls it at 174-181. | Implement the approved run-level policy selector only after listed business decisions and additive schema design approval. |
| Parity 30-day sales batch/reference | MISSING | Existing run DTO stores one sales batch only (`DispatchPlanningDtos.cs:82-89`); design identifies no authoritative selected 30-day source. | Approve period/batch rules and add an optional parity-only 30-day batch contract/persistence in a later implementation phase. |
| Warehouse-weekly/network-weekly sales inputs | MISSING | Current calculation input procedure groups one selected sales batch by warehouse/item/mapping; it does not persist the parity numerator/denominator (`20261008...:42-45`). | Define population and aggregation rules, then add a parity-only input query/snapshot. |
| Immutable parity input snapshot/policy version | MISSING | Runs persist `CalculationVersion`, source batch IDs, results, and company stock, but no policy selector or detailed parity-input snapshot (`20260728...:170-267`). | Implement the additive snapshot design in `DISPATCH_CONTROLLED_INTEGRATION_DESIGN.md` after approvals. |
| Mapping data readiness | BLOCKED | Mapping audit script/guidance exists but has not been executed against an approved environment: `DISPATCH_MAPPING_AUDIT_SQL.sql`, `DISPATCH_MAPPING_AUDIT_EXECUTION_GUIDE.md`. | Run Batch 1 and diagnostics on a restored database/reporting replica using read-only credentials and an approved scope. |
| Real sales/stock/inbound operational data | BLOCKED | User reports none exists; no repository evidence can establish live data state. Empty audit grids are not validity evidence. | Obtain approved source extracts and ownership, map them, then validate/commit through the existing workflow. Do not create fake production data. |
| Manual proportional allocation | BLOCKED | Existing allocation is priority based; controlled design explicitly separates manual proportional allocation as a new workflow. | Obtain separate business approval and rules, or leave out of scope. |

## Required Dispatch inputs and how they should enter

| Input | Current entry/persistence path | Current readiness | Parity-policy gap |
|---|---|---|---|
| Sales by warehouse/SKU | Validated CSV or one-row manual input → import batch → `DispatchWarehouseSalesSnapshots`; sales requires `PeriodFrom`, `PeriodTo`, `SalesQuantity` and SKU/warehouse identity. | Application path exists; operational records are absent. | Must approve the exact weekly and 30-day period semantics and which committed batches are authoritative. |
| Current warehouse stock | CSV/manual warehouse-stock snapshot → `DispatchWarehouseStockSnapshots`; persisted sellable stock derives from available minus reserved/damaged. | Application path exists; operational records are absent. | Preserve current sellable-stock policy unless explicitly changed. |
| Inbound stock | CSV/manual inbound snapshot → `DispatchWarehouseInboundSnapshots`, including status/reference/arrival date. | Application path exists; operational records are absent. | Existing calculation includes statuses 2/3; parity must explicitly retain this or approve a different rule. |
| Warehouse identity | Import row `WarehouseId` → `ChannelWarehouses`. | Requires correctly maintained master data. | Mapping audit must show whether feed identities map without ambiguity. |
| SKU identity | Import row `ChannelSku` → `ChannelSkuMappings` → item/mapping IDs. | Requires correctly maintained master data. | Parity aggregation identity (item, mapping, channel) still needs approval for 30-day sales. |
| Units per box | Effective packaging profile resolved during calculation. | Existing technical source. | Confirm existing profile precedence/effective-date behavior is approved for parity. |
| Warehouse weekly sales | Not separately persisted today; derivable from a selected committed sales batch. | Missing parity integration. | Approve scope/population, then calculate and snapshot the numerator. |
| Network-wide weekly sales | Not separately persisted today; derivable from a selected committed sales batch across approved population. | Missing parity integration. | Approve denominator inclusions/exclusions, then calculate and snapshot it. |
| Company allocatable stock | Current system source selected when calculation is saved and persisted in `DispatchCompanyStockSnapshots`. | Existing policy path. | No parity change should be made; allocator consumes final recommendations. |

## Operational-data gap versus application-functionality gap

### Missing operational data / master-data readiness

- No approved, committed Dispatch sales snapshots.
- No approved, committed warehouse-stock snapshots.
- No approved, committed inbound snapshots.
- Unverified warehouse and SKU mapping coverage for operational feed identities.
- Unverified units-per-box/profile coverage and effective dates.
- No approved source owner, cadence, time-zone convention, or evidence that an operational extract covers the required periods.

These conditions prevent meaningful recommendations even though the import, run, calculation, and allocation paths exist.

### Missing or incomplete application functionality

- No policy selector, policy version contract, or permission/control for Excel parity.
- No parity 30-day sales-batch selection or validation.
- No calculation input adapter for weekly warehouse share / network denominator.
- No immutable parity input snapshots or replay endpoint/reporting.
- No schema/procedure/repository/API/frontend support for a policy-2 run.
- No completed isolated integration suite for imports through finalized allocation using the policy-2 path.
- Manual proportional allocation is not implemented and must remain separate.

## Work that can proceed safely now

| Work item | Status | Safe fixture/data approach | Acceptance evidence |
|---|---|---|---|
| Existing-policy import/run lifecycle tests | READY | Isolated database with clearly labelled synthetic Sales/Stock/Inbound batches and master-data fixtures. | Validate → commit → create → calculate → override → allocate → finalize, with expected persisted rows. |
| Parity calculator regression/unit tests | READY | Existing deterministic inputs only; no database records required. | Exact tier, factor, stock-equality, rounding, invalid-input, and inbound assertions. |
| Import/mapping validation tests | READY | Synthetic mapped/unmatched SKU and warehouse fixtures in an isolated database. | Server validation results and no committed snapshots for invalid rows. |
| Mapping-audit dry run | BLOCKED | Approved restored database/reporting replica only; read-only credentials and approved time scope. | Batch 1 preflight and Batch 1A diagnostics; no remediation based solely on candidates. |
| Parity policy integration tests | PARTIAL | Synthetic committed weekly/30-day sales, stock, inbound, packaging, mapping, and company-stock batches after policy design is implemented. | The I-01 through I-18 scenarios in `DISPATCH_INTEGRATION_TEST_PLAN.md`. |
| Representative business comparison | BLOCKED | Approved, frozen, non-production copy of a real batch after business rules are signed off. | Signed comparison from inputs through allocation; unexplained differences block activation. |

## Prioritized remaining-work checklist

### P0 — establish data and control prerequisites

- [ ] **BLOCKED:** Name source-system owners for sales, stock, and inbound extracts; document cadence, channel, warehouse key, SKU key, time zone, and correction handling.
- [ ] **BLOCKED:** Approve one audit scope and date range; execute mapping-audit Batch 1/1A on a restored database or reporting replica with read-only credentials.
- [ ] **PARTIAL:** Resolve operational master-data gaps found by approved validation/audit through normal mapping/profile maintenance. Preserve all source identities and evidence.
- [ ] **DONE / operational use pending:** Submit approved operational snapshots through the existing validate/commit process; do not bypass it or synthesize production history.
- [ ] **PARTIAL:** Run existing configured-policy lifecycle against approved test data before claiming operational readiness.

### P1 — complete the Excel-parity integration, without changing policy 1

- [ ] **BLOCKED:** Obtain the business approvals listed below.
- [ ] **MISSING:** Add an additive run-level `CalculationPolicy`/version, defaulting omitted requests and all historic runs to configured policy 1.
- [ ] **MISSING:** Add a parity-only 30-day sales-batch reference with committed/channel/window validation.
- [ ] **MISSING:** Add repository/procedure input retrieval for last-week sales, 30-day sales, warehouse weekly sales, and network weekly sales according to approved identity/period rules.
- [ ] **MISSING:** Persist immutable parity calculation-input snapshots atomically with recommendations and run-state changes.
- [ ] **MISSING:** Add a policy resolver that invokes parity only for explicit policy-2 runs. Do not register it as a default or alter `DispatchCalculationService` behavior.
- [ ] **MISSING:** Add policy-specific API DTO validation, authorization/control, UI selection, and read-only run-detail provenance while preserving existing request compatibility.

### P2 — allocation, visibility, and operational verification

- [ ] **DONE / regression required:** Keep `DispatchAllocationService` and priority ordering unchanged; verify it consumes final recommendations for either policy.
- [ ] **BLOCKED:** Keep manual proportional allocation out of scope unless its separate workflow is approved.
- [ ] **MISSING:** Add parity input/explanation reporting and observability (run ID, policy/version, batches, duration, validation failure, lifecycle conflict).
- [ ] **PARTIAL:** Execute SQL/repository/API/UI integration tests for imports, calculation, overrides, allocation, finalization, repeats, concurrency, and rollback.
- [ ] **BLOCKED:** Run and sign off a frozen representative comparison batch before enabling parity for any operational run.

## Business decisions required before Excel-parity activation

1. Define the weekly and 30-day sales periods, including calendar/rolling rule, time zone, completeness requirement, and correction/overlap handling.
2. Select the committed batches that authoritatively supply weekly and 30-day data for each parity run.
3. Approve the 30-day aggregation identity: item, channel-SKU mapping, channel/item, or another documented key.
4. Define the warehouse-share numerator and network-wide denominator population, including inactive mappings, returns, zero-sale warehouses, and correction rows.
5. Confirm that existing sellable-stock semantics and eligible inbound statuses 2/3 remain policy-2 inputs.
6. Approve policy-selection authority, eligible users/channels, and whether policy 2 can coexist with policy 1 for comparison runs.
7. Approve the parity tolerance/rounding evidence and the exact meaning of workbook parity where spreadsheet behavior is inconsistent.
8. Decide whether manual proportional allocation is out of scope or authorize its separate rules, permissions, audit trail, rounding, and lifecycle.

## Recommended implementation sequence and gates

1. Complete P0 data ownership/mapping/profile readiness using only approved non-production or operational import procedures.
2. Exercise the current configured policy with isolated deterministic fixtures; preserve results as the policy-1 baseline.
3. Obtain all eight business decisions and adopt the controlled integration design without inventing missing policies.
4. Implement the additive policy-2 persistence/contract/repository/service/UI slices behind explicit selection, retaining policy 1 as default.
5. Execute the integration matrix from `DISPATCH_INTEGRATION_TEST_PLAN.md`, including rollback, concurrency, and replay.
6. Compare both policies using frozen, approved representative source batches; obtain business sign-off.
7. Use the production activation checklist. Do not backfill or recalculate historical runs, and do not change the production default without a separate approved rollout.

## Current readiness decision

**Configured policy:** technically implemented but **BLOCKED for meaningful operational Dispatch output** until approved real snapshot/master data is present and validated.  
**Excel-parity policy:** **not ready for implementation activation** until the listed business decisions are approved; after that, it is ready for controlled, backward-compatible implementation using the existing design and test plan.  
**Production activation:** **not ready**. No database-cleanliness or mapping-validity claim is made because the audit has not been run on an approved target and no real Dispatch source data was reviewed.
