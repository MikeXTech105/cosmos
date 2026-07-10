# Stock Reports Implementation Tracker

Date: 2026-07-10

## Status Summary

| Area | Status | Notes |
|---|---|---|
| Analysis | Implemented | Existing Phase 1 report stack, docs, SQL, stock movement semantics, sales/purchase stock logic, permissions, DI, and tests inspected. |
| Architecture | Implemented | Reused `IReportsService` and `IReportsRepository`; no duplicate report subsystem added. |
| Contracts | Implemented | Added stock report filters, summaries, paged report wrappers, and report row DTOs. |
| Validators | Implemented | Added query validation for dates, paging, IDs, sort allowlists, stock status, movement/source types, inactivity days, and top limits. |
| Services | Implemented | Added stock report service methods with applied filters and generated metadata. |
| Repositories | Implemented | Added Dapper `QueryMultiple` report-data mapping for summary plus paged rows. |
| Controllers | Implemented | Added all stock report endpoints under `api/v1/reports/inventory`. |
| SQL procedures | Implemented / Needs Live DB Verification | Created `20260710_stock_reports_module.sql` with idempotent stored procedures. |
| Index review | Implemented | Existing Phase 1 indexes reviewed; only `IX_Report_StockMovements_Source` added for voucher joins. |
| Permissions | Implemented / Needs Live DB Verification | Reuses `Reports.Inventory`; SuperAdmin seed uses role-name lookup. |
| Unit tests | Verified | Validator tests added; `dotnet test Cosmos.slnx --no-build` passed 24/24. |
| Integration tests | Needs Live DB Verification | No live SQL Server verification performed in this pass. |
| Swagger verification | Verified | API started at `http://127.0.0.1:5278`; `/swagger/reports/swagger.json` inspected. |
| Documentation | Implemented | `STOCK_REPORTS.md` and this tracker created. |
| Build verification | Verified | `dotnet build Cosmos.slnx --no-restore` passed with one pre-existing `Microsoft.OpenApi` vulnerability warning. |
| Database migration execution | Needs Live DB Verification | Migration was created but not applied here. |
| Frontend handoff | Implemented | Included in `STOCK_REPORTS.md`. |
| Export framework | Export Pending | Permissions retained; no fake export endpoint added. |

## Deliverables

| Deliverable | Status |
|---|---|
| Stock Summary | Implemented / Needs Live DB Verification |
| Stock Ledger | Implemented / Needs Live DB Verification |
| Item Ledger | Implemented / Needs Live DB Verification |
| Low Stock | Implemented / Needs Live DB Verification |
| Negative Stock | Implemented / Needs Live DB Verification |
| Stock Movements | Implemented / Needs Live DB Verification |
| Stock Valuation | Implemented / Needs Live DB Verification |
| Dead Stock | Implemented / Needs Live DB Verification |
| Fast-Moving Items | Implemented / Needs Live DB Verification |
| Slow-Moving Items | Implemented / Needs Live DB Verification |

## Pending Actions

1. Apply `backend/database/migrations/20260710_stock_reports_module.sql` after Reports Phase 1.
2. Run the stock reconciliation query included in the migration.
3. Call each endpoint with a JWT user that has `Reports.Inventory.View` after SQL migration execution.
4. Add live SQL integration tests when a SQL Server test fixture exists.
5. Implement shared export framework before enabling Excel/PDF buttons.
