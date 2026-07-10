# Implementation Interactions

## 2026-07-10 - Stock Reports Module

Original requirement:

Implement the Stock Reports module by extending existing Reports Phase 1 architecture, inspecting repository/database stock semantics first, avoiding duplicate report infrastructure, documenting assumptions, adding SQL procedures, tests, documentation, and progress tracking.

Reports requested:

- Stock Summary
- Stock Ledger
- Item Ledger
- Low Stock
- Negative Stock
- Stock Movements
- Stock Valuation
- Dead Stock
- Fast-Moving Items
- Slow-Moving Items

Architecture decisions:

- Reused `IReportsService`, `ReportsService`, `IReportsRepository`, and `ReportsRepository`.
- Reused existing `Reports.Inventory` permission page.
- Kept legacy Phase 1 `item-movement` endpoint available.
- Added `sp_Report_Inventory_*` procedures rather than replacing the original `sp_Report_Stock*` procedures.
- Used `Items.CurrentStock` for operational current stock and `StockMovements` for movement history.

Files created:

- `backend/database/migrations/20260710_stock_reports_module.sql`
- `backend/docs/STOCK_REPORTS.md`
- `backend/docs/STOCK_REPORTS_IMPLEMENTATION_TRACKER.md`
- `backend/docs/IMPLEMENTATION_INTERACTIONS.md`

Files modified:

- `backend/src/Cosmos.API/Controllers/Reports/InventoryReportsV1Controller.cs`
- `backend/src/Cosmos.Application/Abstractions/Persistence/IReportsRepository.cs`
- `backend/src/Cosmos.Application/Abstractions/Services/IReportsService.cs`
- `backend/src/Cosmos.Application/Services/ReportsService.cs`
- `backend/src/Cosmos.Application/Validators/ReportValidators.cs`
- `backend/src/Cosmos.Contracts/Reports/InventoryReportDtos.cs`
- `backend/src/Cosmos.Contracts/Reports/ReportRequestDtos.cs`
- `backend/src/Cosmos.Persistence/Repositories/ReportsRepository.cs`
- `backend/tests/Cosmos.Tests/Reports/ReportValidatorTests.cs`
- `backend/docs/REPORTS_PHASE1.md`
- `backend/docs/REPORTS_PHASE1_IMPLEMENTATION_TRACKER.md`
- `docs/PROJECT_PROGRESS.md`

SQL migration created:

- `backend/database/migrations/20260710_stock_reports_module.sql`

Tests executed:

- `dotnet restore`
- `dotnet build Cosmos.slnx --no-restore`
- `dotnet test Cosmos.slnx --no-build`

Build result:

- Passed. Existing warning remains: `Microsoft.OpenApi` 2.4.1 NU1903 high severity vulnerability advisory.

Test result:

- Passed: 24/24.

Swagger result:

- Verified `/swagger/reports/swagger.json` from local API at `http://127.0.0.1:5278`. All Stock Reports endpoints appeared under the `reports` document; no duplicate paths were reported; concrete 200 response schemas were present; document-level Bearer security was present.

Database verification result:

- Migration not executed against a live SQL Server in this pass.

Assumptions:

- Movement type `1` is sales outward.
- Movement type `2` is sales cancellation inward.
- Movement type `3` is purchase or reversal inward.
- Movement type `4` is purchase return or purchase cancellation outward.
- `Items.CurrentStock` is the operational stock source.
- `Items.PurchasePrice` is the only reliable valuation rate currently available.

Known limitations:

- No sales-return workflow was found.
- No stock adjustment workflow was found.
- No warehouse/bin/batch/serial stock structure was found.
- No weighted-average or FIFO costing store was found.
- Live SQL verification is pending.
- Export endpoints are pending.

Pending actions:

- Apply migration to SQL Server.
- Verify every report with representative data.
- Re-run Swagger JSON inspection after future endpoint changes.
- Add SQL Server-backed integration tests when a fixture exists.

Recommended next report milestone:

Party Ledger and Outstanding Reports:

- Customer Ledger
- Supplier Ledger
- Party Statement
- Receivables
- Payables
- Receivable Ageing
- Payable Ageing
- Party Transaction History

## 2026-07-10 - Dashboard Phase 1

Original requirement:

Implement the general COSMOS ERP dashboard backend after inspecting existing architecture and source data semantics. Do not implement frontend work. Keep the general dashboard separate from the existing OEE dashboard.

Architecture decisions:

- Added a dedicated dashboard module instead of folding dashboard APIs into reports.
- Reused the existing controller -> service -> repository -> Dapper -> stored procedure pattern.
- Reused or seeded the existing `Dashboard` page and `Dashboard.View` permission.
- Kept OEE dashboard endpoints under the existing `OEE` Swagger group.
- Deferred recent activity because no common activity feed exists.
- Deferred company/branch filters because the current source tables do not expose a consistent cross-module dimension.
- Deferred caching because no shared cache abstraction exists yet.

Files created:

- `backend/src/Cosmos.Contracts/Dashboard/DashboardRequestDtos.cs`
- `backend/src/Cosmos.Contracts/Dashboard/DashboardResponseDtos.cs`
- `backend/src/Cosmos.Shared/Options/DashboardOptions.cs`
- `backend/src/Cosmos.Application/Abstractions/Services/IDashboardService.cs`
- `backend/src/Cosmos.Application/Abstractions/Persistence/IDashboardRepository.cs`
- `backend/src/Cosmos.Application/Validators/DashboardValidators.cs`
- `backend/src/Cosmos.Application/Services/DashboardService.cs`
- `backend/src/Cosmos.Persistence/Repositories/DashboardRepository.cs`
- `backend/src/Cosmos.API/Controllers/Dashboard/DashboardController.cs`
- `backend/database/migrations/20260710_dashboard_phase1.sql`
- `backend/tests/Cosmos.Tests/Dashboard/DashboardValidatorTests.cs`
- `backend/tests/Cosmos.Tests/Dashboard/DashboardServiceTests.cs`
- `backend/docs/DASHBOARD_PHASE1.md`
- `backend/docs/DASHBOARD_PHASE1_IMPLEMENTATION_TRACKER.md`

Files modified:

- `backend/src/Cosmos.Application/Cosmos.Application.csproj`
- `backend/src/Cosmos.Application/DependencyInjection.cs`
- `backend/src/Cosmos.Persistence/DependencyInjection.cs`
- `backend/src/Cosmos.API/Program.cs`
- `backend/src/Cosmos.API/appsettings.json`
- `backend/docs/REPORTS_PHASE1.md`
- `backend/docs/IMPLEMENTATION_INTERACTIONS.md`
- `docs/PROJECT_PROGRESS.md`

Endpoints added:

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/sales-purchase-trend`
- `GET /api/v1/dashboard/revenue-expense-trend`
- `GET /api/v1/dashboard/top-selling-items`
- `GET /api/v1/dashboard/top-parties`
- `GET /api/v1/dashboard/alerts`
- `GET /api/v1/dashboard/hr-summary`

Tests executed:

- `dotnet restore Cosmos.slnx`
- `dotnet build Cosmos.slnx`
- `dotnet test Cosmos.slnx`

Build result:

- Passed. Existing warning remains: `Microsoft.OpenApi` 2.4.1 NU1903 high severity vulnerability advisory.

Swagger result:

- Verified `/swagger/dashboard/swagger.json` from local API. Dashboard paths were present, response schemas were concrete, no duplicate paths were found, and Bearer security was present.

Database verification result:

- Migration not executed against a live SQL Server in this pass.

Known limitations:

- Live SQL execution and KPI validation with representative data are pending.
- Recent activity timeline is pending.
- Export endpoints are pending.
- Stock valuation remains purchase-price based.
- Late-arrival count is not calculated yet.
