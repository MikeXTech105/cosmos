# Reports Phase 1 Implementation Tracker

## Checklist

- [x] Contracts created
- [x] Validators created
- [x] Service created
- [x] Repository created
- [x] Controllers created
- [x] SQL procedures created
- [x] Pages/permissions seeded
- [x] Swagger grouped under `reports`
- [x] Build passed
- [x] Tests added/updated
- [ ] SQL migration manually executed against SQL Server
- [ ] Manual API verification completed with JWT and report permissions
- [ ] Swagger UI manually inspected after applying SQL migration
- [ ] Export framework implemented

## Manual Verification Steps

1. Apply `backend/database/migrations/20260709_phase1_reports_module.sql` to the COSMOS ERP SQL Server database.
2. Confirm pages exist in `Pages`: `Reports.Sales`, `Reports.Purchase`, `Reports.Expenses`, `Reports.Inventory`, `Reports.Parties`.
3. Confirm `SuperAdmin` has `CanView = 1` and `CanExport = 1` for each new page.
4. Start the API and open the Swagger `reports` document.
5. Authenticate with a JWT-bearing user that has the new permissions.
6. Call one endpoint in each reports group with no filters.
7. Call paged endpoints with invalid `pageNumber`, `pageSize`, and `sortDirection` to verify validation errors.
8. Compare sales/purchase/stock totals against known database records.

## Pending Limitations

- SQL procedure behavior has not been integration-tested against a live SQL Server in this implementation pass.
- Export support is permission/documentation-only.
- Customer statement completeness depends on sales ledger entries that may not be written by current sales procedures.
- Stock valuation uses purchase price, not weighted average cost.

## Stock Reports Extension - 2026-07-10

- [x] Existing Phase 1 inventory endpoints reviewed.
- [x] Existing inventory DTOs, validators, service, repository, controller, SQL procedures, and permission seed reviewed.
- [x] Stock movement write logic in sales confirmation/cancellation reviewed.
- [x] Purchase bill and purchase return stock logic reviewed.
- [x] New stock report contracts added.
- [x] New stock report validators added.
- [x] New stock report service methods added.
- [x] New stock report repository methods added.
- [x] New stock report controller endpoints added.
- [x] New idempotent SQL migration created: `20260710_stock_reports_module.sql`.
- [x] `Reports.Inventory` permission reused; no duplicate report permission page added.
- [x] `STOCK_REPORTS.md` created.
- [x] `STOCK_REPORTS_IMPLEMENTATION_TRACKER.md` created.
- [x] Build passed after implementation.
- [ ] `20260710_stock_reports_module.sql` applied to live SQL Server.
- [ ] New stock procedures verified against live operational data.
- [x] Swagger JSON inspected after API startup.
- [ ] Export framework implemented.

Stock Reports are considered a Reports Phase 1 extension. They do not remove or rename the original Phase 1 inventory route family.

Swagger verification note: `/swagger/reports/swagger.json` was inspected from `http://127.0.0.1:5278` and showed all Stock Reports paths under the `reports` document with concrete response schema references and document-level Bearer security.
