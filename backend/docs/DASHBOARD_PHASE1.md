# Dashboard Phase 1

## Overview

Dashboard Phase 1 adds the general ERP dashboard backend for COSMOS. It is separate from the existing OEE dashboard and focuses on cross-module operational visibility for business owners, administrators, and managers.

Implementation follows the existing backend pattern:

Controller -> Application service -> Repository interface -> Dapper repository -> SQL stored procedure.

All endpoints return the existing `ApiResponse<T>` envelope, require JWT authentication, use Swagger group `dashboard`, and enforce `Dashboard.View`.

## Scope

Included in Phase 1:

- Sales, purchase, expense, receivable, payable, inventory, GST, HR, and alert summary cards.
- Sales vs purchase trend.
- Revenue vs expense trend.
- Top-selling items.
- Top customers and suppliers.
- Grouped alerts with preview rows.
- HR attendance summary.

Not included in Phase 1:

- Frontend implementation.
- Export endpoints.
- Widget configuration or user-personalized dashboard layout.
- Recent activity timeline. No common activity/audit feed exists yet.
- Company/branch filters. No general company/branch dimension exists across source tables.

## API Catalogue

Base route: `api/v1/dashboard`

| Method | Route | Purpose |
|---|---|---|
| GET | `/overview` | Summary cards for the selected period plus comparison data. |
| GET | `/sales-purchase-trend` | Sales and purchase totals grouped by `Day`, `Week`, or `Month`. |
| GET | `/revenue-expense-trend` | Sales revenue and expense totals grouped by `Day`, `Week`, or `Month`. |
| GET | `/top-selling-items` | Highest-selling items for the selected period. |
| GET | `/top-parties` | Top customers or suppliers for the selected period. |
| GET | `/alerts` | Inventory, receivable, payable, and GST alert groups. |
| GET | `/hr-summary` | HR active employee and attendance summary for one date. |

## Query Parameters

Overview:

- `fromDate`
- `toDate`
- `comparisonPeriod`: `PreviousPeriod`, `PreviousMonth`, or `Yesterday`

Trend endpoints:

- `fromDate`
- `toDate`
- `groupBy`: `Day`, `Week`, or `Month`

Top selling items:

- `fromDate`
- `toDate`
- `categoryId`
- `top`

Top parties:

- `fromDate`
- `toDate`
- `partyType`: `Customer` or `Supplier`
- `top`

Alerts:

- `previewLimit`
- `minimumAmount`

HR summary:

- `attendanceDate`

## Defaults And Validation

- Overview defaults to the current business month through the current business date.
- Trend endpoints default to the configured trailing month window.
- Top lists default to the current business month.
- HR summary defaults to the current business date.
- `fromDate` cannot be after `toDate`.
- Date ranges are capped by `Dashboard:MaxDateRangeDays`.
- Top rows are capped by `Dashboard:MaxTopRows`.
- Alert preview rows are capped by `Dashboard:MaxAlertPreviewRows`.
- Business date is calculated from `Dashboard:BusinessTimeZone`; invalid time zone config falls back to UTC.

## KPI Definitions

Sales:

- Today sales: confirmed, non-cancelled sales invoices on `Today`.
- Current month sales: confirmed, non-cancelled sales invoices from month start through `Today`.
- Selected period sales: confirmed, non-cancelled sales invoices in `fromDate` to `toDate`.
- Amount received: sales invoice payments in the selected period.
- Sales outstanding: unpaid balance on sales invoices.

Purchases:

- Today purchases: confirmed, non-cancelled purchase bills on `Today`.
- Current month purchases: confirmed, non-cancelled purchase bills from month start through `Today`.
- Selected period purchases: confirmed, non-cancelled purchase bills in `fromDate` to `toDate`.
- Amount paid: supplier payments in the selected period.
- Purchase outstanding: unpaid balance on purchase bills.

Expenses:

- Expense totals use `Expenses.TotalAmount`.
- Highest expense category is based on selected-period expense totals.

Inventory:

- Current stock value uses `Items.CurrentStock * Items.PurchasePrice`.
- Low stock uses tracked active items where `CurrentStock <= MinimumStock`.
- Out of stock uses tracked active items where `CurrentStock = 0`.
- Negative stock uses tracked active items where `CurrentStock < 0`.

GST:

- Pending e-invoices and e-way bills are inferred from eligible confirmed sales invoices without generated GST records.
- Failed counts use failed GST API log rows.
- Cancelled counts use persisted cancelled GST document rows.
- Expiring e-way bills use valid-until dates near the current business date.

HR:

- Active employees use `HR_Employees.Status = 1`.
- Resigned employees use `HR_Employees.Status = 3`.
- Attendance present includes present and work-from-home statuses.
- Leave uses attendance leave status.
- Not checked in counts active employees without an attendance row for the selected date.

Comparison:

- Growth percentage is calculated in the application layer as `(current - previous) / previous * 100`.
- If previous is zero and current is zero, growth is `0`.
- If previous is zero and current is non-zero, growth is `null`.

## Status Rules

Sales invoice statuses treated as confirmed/non-cancelled:

- `2`
- `3`
- `4`

Purchase bill statuses treated as confirmed/non-cancelled:

- `2`
- `3`
- `4`

Employee statuses:

- `1`: Active
- `2`: Inactive
- `3`: Resigned
- `4`: Terminated

Attendance statuses:

- `1`: Present
- `2`: Absent
- `3`: Half day
- `4`: Leave
- `5`: Holiday
- `6`: Week off
- `7`: Work from home

## Stored Procedures

Migration script: `backend/database/migrations/20260710_dashboard_phase1.sql`

- `sp_Dashboard_Overview`
- `sp_Dashboard_SalesPurchaseTrend`
- `sp_Dashboard_RevenueExpenseTrend`
- `sp_Dashboard_TopSellingItems`
- `sp_Dashboard_TopParties`
- `sp_Dashboard_Alerts`
- `sp_Dashboard_HrSummary`

The migration reuses or seeds the `Dashboard` page and grants `SuperAdmin` view permission by role-name lookup. No hard-coded role IDs are used.

## Backend Files

Contracts:

- `Cosmos.Contracts/Dashboard/DashboardRequestDtos.cs`
- `Cosmos.Contracts/Dashboard/DashboardResponseDtos.cs`

Application:

- `IDashboardService`
- `IDashboardRepository`
- `DashboardService`
- `DashboardValidators`

Persistence:

- `DashboardRepository`

API:

- `DashboardController`
- Dashboard options binding in `Program.cs`

Shared:

- `DashboardOptions`

## Frontend Guidance

The frontend should treat the dashboard as a read-only operational surface in Phase 1.

Recommended first screen:

- Summary KPI strip from `/overview`.
- Trend chart from `/sales-purchase-trend`.
- Revenue/expense chart from `/revenue-expense-trend`.
- Top-selling items and top parties tables.
- Alert panel from `/alerts`.
- HR widget from `/hr-summary`.

Use `Dashboard.View` from login permissions to show the general dashboard. Do not mix OEE dashboard APIs into the general dashboard unless the user explicitly selects manufacturing/OEE context.

## Performance And Caching

No cache is implemented in Phase 1 because the project has no existing cache abstraction. The SQL procedures are designed as aggregated reads with bounded date ranges and top-row limits.

Future optimization options:

- Add a shared dashboard cache abstraction with short TTLs.
- Pre-aggregate high-volume sales/purchase/stock data.
- Add SQL indexes after measuring production query plans.

## Verification

Code-level verification performed:

- `dotnet restore Cosmos.slnx`
- `dotnet build Cosmos.slnx`
- `dotnet test Cosmos.slnx`
- Swagger inspection at `/swagger/dashboard/swagger.json`

Database verification status:

- Migration created but not executed against a live SQL Server during this implementation pass.
- Stored procedure behavior must be verified with representative data after applying the migration.

## Known Limitations

- Live SQL Server execution is pending.
- Recent activity is deferred until a common audit/activity source exists.
- Branch/company filters are not available.
- Stock valuation is purchase-price based, not weighted average or FIFO.
- Late arrivals are returned as `null` because the current attendance data model does not expose a reliable expected check-in comparison in the dashboard procedure.
- Export and drill-down endpoints are future work.
