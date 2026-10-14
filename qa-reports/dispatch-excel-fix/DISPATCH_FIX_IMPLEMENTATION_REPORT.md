# Dispatch Fix Implementation Report

## Implemented change

Added a separate, pure Excel-parity calculation strategy rather than changing the production default:

- `backend/src/Cosmos.Application/DispatchPlanning/DispatchExcelParityModels.cs`
- `backend/src/Cosmos.Application/Services/DispatchExcelParityCalculationService.cs`
- `backend/tests/Cosmos.Tests/DispatchPlanning/DispatchExcelParityCalculationServiceTests.cs`

The strategy explicitly accepts 30-day sales, warehouse weekly sales, network weekly sales, current stock, inbound, and units per box. It applies the verified primary workbook formulas and returns a versioned result/explanation. It rejects null input, invalid negative quantities, non-positive boxes, an invalid positive-sales/zero-network denominator, and a warehouse weekly amount larger than the network total.

No API, controller, repository, stored procedure, database schema, run lifecycle, authorization, frontend contract, default calculation policy, or production data was changed. No migration is required for this isolated strategy.

## Original issues

| Issue | Root cause | Change | Result |
|---|---|---|---|
| D-02 Tier | Production only had manually configured tiers | Implemented strict >7 and >20 box resolution in parity strategy | FIXED AND VERIFIED in unit tests; production selection pending |
| D-03 Safety | Production only had recurring × factor formula | Implemented network-share safety calculation | FIXED AND VERIFIED in unit tests; production source mapping pending |
| D-04 Quantity rules | Production uses generic configured quantity settings | Implemented safety gate, tier thresholds, loose Tier 3, and nearest-box rounding | FIXED AND VERIFIED in unit tests; production supersession pending |
| P1 stock equality | Eligibility was true at zero shortage because it used `totalStock <= reorderPoint` | Eligibility now requires `rawShortage > 0` | FIXED AND VERIFIED; equality returns false/zero |
| D-05 Inbound | Formula parity conflicts with existing eligibility lifecycle | No change; retain statuses 2/3 | INTENTIONALLY RETAINED |
| D-06 Manual allocation | Workbook does not define W governance | No change; retain priority allocation | BLOCKED — BUSINESS DECISION REQUIRED |
| D-07 Current stock | Workbook stock semantics are unspecified | No change; retain sellable/net stock | INTENTIONALLY RETAINED |
| D-08 Sales periods | No approved production mapping of weekly/30-day sales | Explicit parity inputs only | BLOCKED — BUSINESS DECISION REQUIRED |

## Tests and expected vs actual results

- Targeted Dispatch tests: **54 passed, 0 failed, 0 skipped**.
- Complete backend suite: **305 passed, 0 failed, 0 skipped**.
- Solution build: **succeeded, 0 errors**.
- Verified expected-versus-actual calculations are in `DISPATCH_PARITY_RESULTS.md` and `DISPATCH_BOUNDARY_TEST_RESULTS.md`; all executed final recommendations matched exactly.

No isolated database/API lifecycle tests were executed because an approved test database/fixture path was not available. No result is claimed for import-to-finalize lifecycle, concurrency, or a production policy selection.

## Deployment and rollback

The change is additive and unreachable from the existing production run flow, so it does not alter deployed recommendations. Rollback is a normal code rollback; no data rollback or database migration is involved.

The isolated calculation engine is ready for controlled integration testing. Before production activation, add a backward-compatible source/persistence selection for the policy version and approved inputs, execute lifecycle integration tests in an isolated database, compare a representative approved batch, and retain the current policy as rollback selection.
