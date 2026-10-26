# COSMOS Dispatch Module — Excel Business Rules Extraction

**Audit date:** 2026-10-10  
**Source workbook:** `D:\Downloads\Copy of NEW DISPATCH SCHEDULING.xlsx`  
**Scope:** formula/source inspection only. The workbook was not edited, recalculated, or exported.

## Workbook model and lineage

The workbook has ten worksheets and no defined names:

| Stage | Worksheet | Role |
|---|---|---|
| Sales input | `LAST_WEEK_SALE` | warehouse/SKU sales matrix used by demand calculation |
| Stock input | `CURRENT_STOCK` | warehouse/SKU current-stock matrix |
| Inbound input | `INBOUND_STOCK` | warehouse/SKU inbound-stock matrix |
| Stock rollup | `TOTAL_STOCK` | current stock plus inbound stock |
| Packaging/tier | `PER_BOX` | units per box, sales, tier and per-tier factors |
| Demand | `RECURRING_DEMAND` | tier factor × warehouse sales |
| Safety stock | `SAFETY_STOCK` | allocated safety quantity by SKU and warehouse |
| Reorder | `REORDER POINT` | recurring demand plus safety stock |
| Dispatch proposal | `OUTPUT` | tier-specific shortage and rounding logic |
| Auxiliary / legacy | `WAREHOUSE_QUANTITY` | secondary stock matrix with integrity issues |

The intended primary calculation flow is:

`LAST_WEEK_SALE + CURRENT_STOCK + INBOUND_STOCK + PER_BOX → RECURRING_DEMAND + SAFETY_STOCK → REORDER POINT → OUTPUT`

## Extracted business rules

### 1. Data grain and identity

- Every core input is a SKU-by-warehouse matrix. SKU is in column A; warehouses are columns B onward (the exact first calculation column varies by sheet).
- The workbook has no formal mapping table, normalized key, or named range. It therefore relies on positional alignment of SKU rows and warehouse columns across worksheets.
- `CURRENT_STOCK`, `INBOUND_STOCK`, and `LAST_WEEK_SALE` are data-entry matrices. Formula-derived values are used downstream.

### 2. Total warehouse stock

`TOTAL_STOCK!B2` is representative of the copied formula:

```excel
=CURRENT_STOCK!B2+INBOUND_STOCK!B2
```

Rule: **all entered inbound stock is included**. The workbook contains no inbound status, ETA, or eligibility condition.

### 3. Tier derivation and factors

`PER_BOX` contains the following tier table:

| Tier | Sales threshold | Safety factor | Recurring-demand factor |
|---:|---|---:|---:|
| 1 | Last-30-day sales > `20 × units per box` | 3 | 4 |
| 2 | Otherwise, last-30-day sales > `7 × units per box` | 4 | 2 |
| 3 | Otherwise | 4 | 4 |

Representative formulas (`PER_BOX`, row 2):

```excel
F2 = IF(E2>(20*B2),1,IF(E2>(7*B2),2,3))
C2 = IF($F2=1,$J$3,IF($F2=2,$J$4,$J$5))
D2 = IF($F2=1,$K$3,IF($F2=2,$K$4,$K$5))
G2 = E2/B2
```

Here `B` is units per box, `E` is labelled **LAST 30 DAY SALE**, `F` is tier, `C` is the safety-stock factor, `D` is the recurring-demand factor, and `G` is sales/box ratio.

### 4. Recurring demand

Representative formula (`RECURRING_DEMAND!C2`):

```excel
=($B2*LAST_WEEK_SALE!B3)
```

`B2` is linked to `PER_BOX!D2`. Rule: **recurring demand = warehouse sales × the SKU's tier-derived recurring-demand factor.** No separate rounding is applied in this sheet.

### 5. Safety stock

Representative formula (`SAFETY_STOCK!D3`):

```excel
=$B3*(D$1/$B$1)*($C3/4)
```

Where:

- `B3` is the SKU's last-30-day sales from `PER_BOX`;
- `D1/B1` is the warehouse's share of total weekly sales over the model; and
- `C3` is the SKU's tier-derived safety factor.

Rule:

`safety stock(SKU, warehouse) = SKU 30-day sales × warehouse sales share × (safety factor / 4)`

This is a network-share allocation, not simply recurring demand multiplied by a safety factor.

### 6. Reorder point and shortage

Representative formula (`REORDER POINT!C2`):

```excel
=RECURRING_DEMAND!C2+SAFETY_STOCK!D3
```

Rule: **reorder point = recurring demand + safety stock.**

The dispatch shortage used in `OUTPUT` is `reorder point − total stock`, but a result is suppressed if total stock is greater than reorder point.

### 7. Output eligibility and tier-specific rounding

`OUTPUT!C2` is representative of the warehouse-output formula copied over the model. Its branch logic establishes these rules:

| Rule | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Safety gate | blank if safety stock ≤ 0 | same | same |
| Stock gate | blank if total stock > reorder point | same | same |
| Small-shortage suppression | blank when shortage < 1 box | blank when shortage < 0.5 box | none below 1 box |
| Otherwise | nearest full box | nearest full box | nearest full box |
| Loose quantity | no | no | yes when shortage < 1 box |

The full-box branch uses Excel `ROUND(shortage / unitsPerBox, 0) * unitsPerBox`, i.e. nearest-box rounding. Tier 3 returns the unrounded shortage below one box.

There is no formula for a general minimum dispatch quantity; the minimum is implied by the tier thresholds above.

### 8. Manual total and proportional allocation block

The `OUTPUT` header `W1` is the literal **TO BE FILLED**. Cells in the adjacent allocation block proportionally distribute that manually entered quantity across warehouse proposals. Representative formula (`OUTPUT!X2`):

```excel
=IF(C2>0,(ROUND((C2/$U2*$W2/PER_BOX!$B2),0))*PER_BOX!$B2,)
```

Rule inferred from formula structure: after a user enters a total in column W, allocate it in proportion to proposed warehouse quantities, rounded to full boxes. The workbook does not make the operational meaning or authority for W explicit; that needs business confirmation.

## Data-quality and interpretation risks in the workbook

- **Sales-period ambiguity:** input is named `LAST_WEEK_SALE`, while the tier source field is labelled `LAST 30 DAY SALE`. The model does not establish whether the two use compatible periods.
- **Broken references:** formula/cached-value inspection found `#REF!` errors in `CURRENT_STOCK`, `TOTAL_STOCK`, `WAREHOUSE_QUANTITY`, and extensively in `OUTPUT`. `WAREHOUSE_QUANTITY!N17` directly contains `+#REF!` in its formula. These are workbook defects, not evidence of an application defect.
- **Positional mappings:** no formal key prevents a warehouse-column shift or missing row from silently changing results.
- **Secondary output block:** starting around row 104, `OUTPUT` contains formulas with a worksheet name inconsistent with the actual `SAFETY_STOCK` sheet. Its role and validity are unverified.

## Representative numerical cases observed

| Case | Workbook evidence | Expected interpretation |
|---|---|---|
| Tier 3 | `PER_BOX` row 5: box 70, 30-day sales 42, tier 3 | 42 is below `7 × 70`; factors are 4/4 |
| Tier 1 | `PER_BOX` row 8: box 28, 30-day sales 900 | 900 exceeds `20 × 28`; tier 1 |
| Tier-3 loose output | output row 5 contains non-box-multiple quantities such as 44.7/14.5 | shortage below one box is preserved for tier 3 |

These are formula-trace examples, not recalculated acceptance values. Cached workbook results may be stale because of the reference errors above.
