# Reports Phase 1

## Overview

Phase 1 introduces a common reports API surface for Vyapar-style operational reports across sales, purchase, expenses, inventory, and parties. The implementation follows the existing COSMOS ERP pattern:

Controller -> Application service -> Repository interface -> Dapper repository -> SQL stored procedure.

All APIs are JSON-first and return the existing `ApiResponse<T>` wrapper. Export is prepared through permission seeds only; Excel/PDF generation remains a future task unless a shared export service is introduced.

## Reports

Sales:
- Sales Summary
- Sales Invoice Register
- Sales by Party/Customer
- Sales by Item
- Payment In Report
- Customer Receivables
- Sales Tax/GST Summary

Purchase:
- Purchase Summary
- Purchase Bill Register
- Purchase by Supplier
- Purchase by Item
- Payment Out Report
- Supplier Payables
- Purchase Tax/GST Summary

Expenses:
- Expense Summary
- Expense by Category
- Expense by Party
- Monthly Expense Summary

Inventory:
- Stock Summary
- Stock Ledger
- Item Movement Report
- Low Stock Report
- Stock Valuation Report

Parties:
- Party Ledger
- Customer Statement
- Supplier Statement
- Receivable Aging
- Payable Aging

## API Endpoints

All endpoints require JWT authentication, use Swagger group `reports`, and enforce SQL-backed page/action permission checks.

Sales permission: `Reports.Sales` / `View`
- `GET /api/v1/reports/sales/summary`
- `GET /api/v1/reports/sales/invoices`
- `GET /api/v1/reports/sales/by-party`
- `GET /api/v1/reports/sales/by-item`
- `GET /api/v1/reports/sales/payments-in`
- `GET /api/v1/reports/sales/receivables`
- `GET /api/v1/reports/sales/tax-summary`

Purchase permission: `Reports.Purchase` / `View`
- `GET /api/v1/reports/purchase/summary`
- `GET /api/v1/reports/purchase/bills`
- `GET /api/v1/reports/purchase/by-supplier`
- `GET /api/v1/reports/purchase/by-item`
- `GET /api/v1/reports/purchase/payments-out`
- `GET /api/v1/reports/purchase/payables`
- `GET /api/v1/reports/purchase/tax-summary`

Expense permission: `Reports.Expenses` / `View`
- `GET /api/v1/reports/expenses/summary`
- `GET /api/v1/reports/expenses/by-category`
- `GET /api/v1/reports/expenses/by-party`
- `GET /api/v1/reports/expenses/monthly-summary`

Inventory permission: `Reports.Inventory` / `View`
- `GET /api/v1/reports/inventory/stock-summary`
- `GET /api/v1/reports/inventory/stock-ledger`
- `GET /api/v1/reports/inventory/item-movement`
- `GET /api/v1/reports/inventory/low-stock`
- `GET /api/v1/reports/inventory/stock-valuation`

Party permission: `Reports.Parties` / `View`
- `GET /api/v1/reports/parties/ledger`
- `GET /api/v1/reports/parties/customer-statement`
- `GET /api/v1/reports/parties/supplier-statement`
- `GET /api/v1/reports/parties/receivable-aging`
- `GET /api/v1/reports/parties/payable-aging`

## Query Parameters

Common optional parameters are used only where relevant:
- `fromDate`, `toDate`
- `partyId`
- `itemId`
- `categoryId`
- `status`
- `paymentStatus`
- `search`
- `pageNumber`, `pageSize`
- `sortBy`, `sortDirection`

Validation:
- `fromDate` cannot be greater than `toDate`.
- `pageNumber` must be at least `1`.
- `pageSize` must be between `1` and `200`.
- `sortDirection` must be `ASC` or `DESC` when provided.
- Numeric IDs must be positive when provided.

Paged reports:
- Sales Invoice Register
- Purchase Bill Register
- Payment In
- Payment Out
- Stock Ledger
- Item Movement
- Party Ledger

## DTO Purpose

Contracts are under `Cosmos.Contracts/Reports`:
- `ReportRequestDtos.cs`: shared and report-specific query DTOs.
- `SalesReportDtos.cs`: sales summaries, registers, party/item grouping, payment-in, receivable, and tax DTOs.
- `PurchaseReportDtos.cs`: purchase summaries, registers, supplier/item grouping, payment-out, payable, and tax DTOs.
- `ExpenseReportDtos.cs`: expense summary/grouping/monthly DTOs.
- `InventoryReportDtos.cs`: stock summary, ledger, movement, low stock, and valuation DTOs.
- `PartyReportDtos.cs`: party ledger, statements, receivable aging, and payable aging DTOs.

## Stored Procedures

Migration script: `backend/database/migrations/20260709_phase1_reports_module.sql`.

Sales:
- `sp_Report_SalesSummary`
- `sp_Report_SalesInvoiceRegister`
- `sp_Report_SalesByParty`
- `sp_Report_SalesByItem`
- `sp_Report_PaymentIn`
- `sp_Report_CustomerReceivables`
- `sp_Report_SalesTaxSummary`

Purchase:
- `sp_Report_PurchaseSummary`
- `sp_Report_PurchaseBillRegister`
- `sp_Report_PurchaseBySupplier`
- `sp_Report_PurchaseByItem`
- `sp_Report_PaymentOut`
- `sp_Report_SupplierPayables`
- `sp_Report_PurchaseTaxSummary`

Expenses:
- `sp_Report_ExpenseSummary`
- `sp_Report_ExpenseByCategory`
- `sp_Report_ExpenseByParty`
- `sp_Report_MonthlyExpenseSummary`

Inventory:
- `sp_Report_StockSummary`
- `sp_Report_StockLedger`
- `sp_Report_ItemMovement`
- `sp_Report_LowStock`
- `sp_Report_StockValuation`

Parties:
- `sp_Report_PartyLedger`
- `sp_Report_CustomerStatement`
- `sp_Report_SupplierStatement`
- `sp_Report_ReceivableAging`
- `sp_Report_PayableAging`

## Tables Used

Sales reports:
- `SalesInvoices`
- `SalesInvoiceItems`
- `SalesInvoicePayments`
- `Parties`
- `Items`

Purchase reports:
- `PurchaseBills`
- `PurchaseBillItems`
- `SupplierPayments`
- `Parties`
- `Items`

Expense reports:
- `Expenses`
- `ExpenseCategories`
- `Parties`

Inventory reports:
- `Items`
- `Categories`
- `Units`
- `StockMovements`

Party reports:
- `PartyLedgerEntries`
- `Parties`
- `SalesInvoices`
- `PurchaseBills`

## Permissions

Pages added:
- `Reports.Sales`
- `Reports.Purchase`
- `Reports.Expenses`
- `Reports.Inventory`
- `Reports.Parties`

Each page is seeded with `CanView` and `CanExport` for the `SuperAdmin` role by looking up the role by name. No role IDs are hard-coded.

## Known Limitations

- Export endpoints are not implemented yet. `CanExport` is seeded for future Excel/PDF work.
- Party/customer/supplier classification is not explicit in the current `Parties` table. Reports infer customer/supplier usage from sales and purchase documents.
- Customer statement uses `PartyLedgerEntries` with sales source types, but the current sales procedures do not consistently write sales ledger rows. Receivable aging and customer receivables therefore use `SalesInvoices`.
- Stock valuation uses `Items.PurchasePrice` as the valuation rate because no weighted-average-cost table exists yet.
- Stock ledger balance is derived from `StockMovements` movement type and quantity. It should be verified against real operational data after applying the migration.

## Future Phase 2

- GST return summaries and reconciliation reports.
- Accounting reports: profit/loss, trial balance, cash/bank book, day book.
- HR reports: attendance, payroll, leave balances.
- Advanced inventory: batch/serial, reorder planning, stock transfer, weighted-average valuation.
- Shared export framework for Excel/PDF with audit logging and export permissions.
