# Dispatch Excel Parity Results

**Execution:** `DispatchExcelParityCalculationServiceTests` ran as part of the Dispatch subset and complete backend suite.  
**Policy tested:** `dispatch-excel-parity-v1`.  
**Baseline limitation:** the requested `(3)` workbook file was unavailable; the available workbook has broken cached/reference ranges. Results below are independently calculated from verified primary formulas, not cached workbook output.

| Case | Inputs | Expected result | Actual COSMOS parity result | Difference | Status / test |
|---|---|---|---|---:|---|
| Tier at 7 boxes | box 10; 30-day sales 70 | Tier 3 | Tier 3 | 0 | PASS — `ResolveTier_UsesStrictWorkbookThresholds` |
| Tier just above 7 | box 10; sales 70.000001 | Tier 2 | Tier 2 | 0 | PASS — same test |
| Tier at 20 boxes | box 10; sales 200 | Tier 2 | Tier 2 | 0 | PASS — same test |
| Tier just above 20 | box 10; sales 200.000001 | Tier 1 | Tier 1 | 0 | PASS — same test |
| Two warehouse safety shares | 30-day sales 100; weekly shares 10/40 and 30/40 | safety 25 and 75; total 100 | 25 and 75; total 100 | 0 | PASS — `Calculate_UsesWarehouseShareForSafetyStockAndWeeklySalesForRecurringDemand` |
| Tier 2 half-box boundary | 30-day 80; weekly 10/20; reorder 60; shortages 4, 5, 6 | recommendations 0, 10, 10 | 0, 10, 10 | 0 | PASS — `Calculate_Tier2SuppressesBelowHalfBoxThenUsesNearestBox` |
| Tier 1 one-box boundary | 30-day 300; weekly 10/20; reorder 152.5; shortages 9, 10, 15 | recommendations 0, 10, 20 | 0, 10, 20 | 0 | PASS — `Calculate_Tier1SuppressesBelowOneBoxThenUsesNearestBox` |
| Tier 3 loose/nearest behavior | 30-day 70; weekly 10/20; reorder 75; shortages 5, 15 | recommendations 5, 20 | 5, 20 | 0 | PASS — `Calculate_Tier3KeepsLooseShortageBelowBoxThenUsesNearestBox` |
| Safety gate | 30-day sales 0; weekly 10/20; current 0 | safety 0; ineligible; recommendation 0 | 0; false; 0 | 0 | PASS — `Calculate_SuppressesRecommendationWhenSafetyStockIsZero` |
| Stock equality/inbound | Tier 3 reorder 75; current 70; inbound 5 | total 75; recommendation 0 | 75; 0 | 0 | PASS — `Calculate_IncludesTheExplicitParityInboundQuantityOnce` |
| Invalid denominator | positive 30-day sales; network weekly sales 0 | reject calculation; no misleading value | `InvalidOperationException` | n/a | PASS — `Calculate_RejectsPositiveThirtyDaySalesWithoutNetworkWeeklySales` |

## Interpretation

The primary, independently specified workbook calculation path is numerically verified through deterministic unit tests. This does **not** demonstrate end-to-end production parity because production runs still use the existing configured policy and do not yet supply approved 30-day sales/network-share inputs.

No tolerance was needed: all asserted decimal results matched exactly at the service's six-decimal calculation scale.
