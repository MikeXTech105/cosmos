# Stock Reports

## Purpose

Stock Reports extend Reports Phase 1 for inventory-tracked items. They provide operational stock position, movement history, exception reports, valuation, and movement-speed reports for frontend reporting screens and future Excel/PDF export.

## Architecture

The module reuses the existing reports architecture:

Controller -> `IReportsService` -> `IReportsRepository` -> Dapper -> stored procedures.

No separate reporting framework was created. All endpoints use Swagger group `reports`, JWT authentication, `ApiResponse<T>`, and `Reports.Inventory` / `View`.

## Endpoint Catalogue

| Report | Endpoint |
|---|---|
| Stock Summary | `GET /api/v1/reports/inventory/stock-summary` |
| Stock Ledger | `GET /api/v1/reports/inventory/stock-ledger` |
| Item Ledger | `GET /api/v1/reports/inventory/items/{itemId}/ledger` |
| Low Stock | `GET /api/v1/reports/inventory/low-stock` |
| Negative Stock | `GET /api/v1/reports/inventory/negative-stock` |
| Stock Movements | `GET /api/v1/reports/inventory/stock-movements` |
| Stock Valuation | `GET /api/v1/reports/inventory/stock-valuation` |
| Dead Stock | `GET /api/v1/reports/inventory/dead-stock` |
| Fast-Moving Items | `GET /api/v1/reports/inventory/fast-moving-items` |
| Slow-Moving Items | `GET /api/v1/reports/inventory/slow-moving-items` |

Phase 1 compatibility endpoint retained:

| Legacy report | Endpoint |
|---|---|
| Item Movement | `GET /api/v1/reports/inventory/item-movement` |

## Filters

Common filters include `fromDate`, `toDate`, `asOfDate`, `itemId`, `categoryId`, `unitId`, `search`, `includeInactive`, `pageNumber`, `pageSize`, `sortBy`, and `sortDirection`.

Ledger/movement filters also support `movementType`, `sourceType`, and `partyId`.

Ageing filters support `inactiveDays` and `minimumStockValue`.

Moving-item filters support `top` and `minimumTransactions`.

## Response Shape

Expanded stock report endpoints return:

- `reportTitle`
- `generatedAtUtc`
- `valuationMethod`, where relevant
- `appliedFilters`
- `summary`
- `rows`

Paged endpoints return `rows.items`, `rows.pageNumber`, `rows.pageSize`, `rows.totalCount`, and `rows.totalPages`.

## Movement Semantics

The current schema stores stock history in `StockMovements` using `MovementType` plus `Quantity`.

| MovementType | Meaning | Direction |
|---|---|---|
| `1` | Sales issue | Outward |
| `2` | Sales invoice cancellation reversal | Inward |
| `3` | Purchase bill confirmation or purchase-return deletion reversal | Inward |
| `4` | Purchase return or purchase bill cancellation | Outward |

Sales returns and stock adjustments are not currently represented as separate supported workflows.

## Calculation Rules

Operational current stock:

`Items.CurrentStock`

Available stock:

`CurrentStock - ReservedStock`

Historical signed movement:

`Quantity < 0 ? Quantity : MovementType in (1, 4) ? -Quantity : Quantity`

Stock status:

- Negative Stock: `ClosingQuantity < 0`
- Out of Stock: `ClosingQuantity = 0`
- Low Stock: `MinimumStock > 0 AND ClosingQuantity <= MinimumStock`
- In Stock: all other inventory-tracked items

Low stock:

`Items.CurrentStock <= Items.MinimumStock`, excluding `MinimumStock = 0`.

Negative stock:

`Items.CurrentStock < 0`. The current base setup has a non-negative check constraint, so this report will normally be empty unless the database has been changed or legacy data exists.

Stock valuation:

`ClosingQuantity x Items.PurchasePrice`

Valuation method:

`ClosingQuantity x Items.PurchasePrice`

Dead stock:

Inventory-tracked item with positive current stock and no sale movement during the selected inactivity window. Never-sold items are returned with `neverSold = true`.

Fast-moving:

Ranks items by total sold quantity descending, then sales value descending, then item ID.

Slow-moving:

Includes active inventory-tracked items with positive stock, calculates sold quantity in the selected period, and distinguishes `Zero Sale`, `Low Sale`, and `Slow Moving`.

## Source Tables

- `Items`
- `Categories`
- `Units`
- `StockMovements`
- `SalesInvoices`
- `SalesInvoiceItems`
- `PurchaseBills`
- `PurchaseBillItems`
- `PurchaseReturns`
- `PurchaseReturnItems`
- `Parties`

## Stored Procedures

Migration: `backend/database/migrations/20260710_stock_reports_module.sql`

- `sp_Report_Inventory_StockSummary`
- `sp_Report_Inventory_StockLedger`
- `sp_Report_Inventory_ItemLedger`
- `sp_Report_Inventory_LowStock`
- `sp_Report_Inventory_NegativeStock`
- `sp_Report_Inventory_StockMovements`
- `sp_Report_Inventory_StockValuation`
- `sp_Report_Inventory_DeadStock`
- `sp_Report_Inventory_FastMovingItems`
- `sp_Report_Inventory_SlowMovingItems`

## Permissions

View:

`Reports.Inventory` / `View`

Future export:

`Reports.Inventory` / `Export`

The migration reuses the existing `Reports.Inventory` page and grants `SuperAdmin` view/export by role-name lookup.

## Example Requests

```http
GET /api/v1/reports/inventory/stock-summary?asOfDate=2026-07-10&pageNumber=1&pageSize=20
GET /api/v1/reports/inventory/stock-ledger?itemId=10&fromDate=2026-07-01&toDate=2026-07-10
GET /api/v1/reports/inventory/dead-stock?inactiveDays=90&minimumStockValue=1000
GET /api/v1/reports/inventory/fast-moving-items?fromDate=2026-04-01&toDate=2026-07-10&top=25
```

## Example Response

```json
{
  "success": true,
  "message": null,
  "data": {
    "reportTitle": "Stock Valuation",
    "generatedAtUtc": "2026-07-10T00:00:00Z",
    "valuationMethod": "ClosingQuantity x Items.PurchasePrice",
    "appliedFilters": {
      "categoryId": 5,
      "includeInactive": false
    },
    "summary": {
      "totalQuantity": 125,
      "totalStockValue": 25000,
      "itemCount": 8
    },
    "rows": {
      "items": [],
      "pageNumber": 1,
      "pageSize": 20,
      "totalCount": 0,
      "totalPages": 0
    }
  }
}
```

## Frontend Handoff

Create a Stock Reports menu under Reports. Visibility should use `Reports.Inventory.View`. Export buttons should use `Reports.Inventory.Export`, but remain disabled or marked unavailable until backend export endpoints are implemented.

Recommended screens:

1. Stock Summary
2. Stock Ledger
3. Item Ledger
4. Low Stock
5. Negative Stock
6. Stock Movements
7. Stock Valuation
8. Dead Stock
9. Fast-Moving Items
10. Slow-Moving Items

Common UI:

- Shared filter bar
- Date range and as-of date pickers
- Item/category/unit dropdowns
- Movement-type and source-type filters where relevant
- Stock-status filter for summary
- Search
- Sort controls
- Pagination
- Summary cards
- Data tables
- Empty states
- Loading states
- Validation-error display
- Excel/PDF buttons disabled while export remains pending

## Testing And Deployment

Run:

```bash
dotnet restore
dotnet build Cosmos.slnx
dotnet test Cosmos.slnx
```

Apply migration manually after Reports Phase 1:

```sql
:r backend/database/migrations/20260710_stock_reports_module.sql
```

Manual SQL verification is required on a live SQL Server. Use the reconciliation query included at the end of the migration to compare `Items.CurrentStock` with opening stock plus net stock movements.

## Known Limitations

- Sales returns are not implemented as a supported stock movement source.
- Stock adjustment-in/out APIs are not present.
- Warehouse/bin stock is not present.
- Batch/serial costing is not present.
- Weighted-average, FIFO, and batch costing are not supported.
- Reserved stock is only read from `Items.ReservedStock`.
- Export endpoints are pending.
- Live SQL Server verification is pending.
