# COSMOS ERP — UI Page Inventory

**Source:** `frontend/src/routes/AppRoutes.jsx`, live sidebar, and live `/rbac/pages` (104 active page records shown).  
**Legend:** `Opened` = read-only live smoke check; `Source only` = route exists but was not opened; `ID required` = dynamic record route; `Staging required` = mutation/workflow coverage excluded from production. All internal business routes are permission guarded in source; exact role/action rights were not exhaustively verified.

## Live-opened canonical pages

| Module | Route | Render/API-backed rendering | Principal safe UI checked |
|---|---|---|---|
| Dashboard | `/dashboard` | Opened; rendered no-data state | Date controls, refresh control, charts/empty states |
| RBAC | `/users` | **Opened; failed** | Error state captured (UI-001) |
| RBAC | `/roles`, `/permissions`, `/rbac/pages` | Opened; rendered | Tables/role selector/page hierarchy |
| Inventory | `/items` | Opened; rendered | Item table/statuses |
| Parties | `/party` | Opened; rendered | Tabs, filters, table/pagination |
| Sales | `/sales/invoices` | Opened; rendered | Filters, empty table, pagination |
| Purchase | `/purchase/bills`, `/purchase/orders` | Opened; rendered | Tables, date filters, status/payment badges |
| Supply Chain | `/supply-chain/channels` | Opened; rendered | Empty state/table |
| Procurement | `/procurement` | Opened; rendered | Calculated buy list/status labels |
| Dispatch | `/dispatch/dashboard` | Opened; rendered | Dashboard/filter/table shell |
| Shipments | `/shipments/dashboard` | Opened; rendered | Dashboard/filter/empty metrics |
| HR | `/hr/dashboard` | Opened; rendered | Dashboard empty states |
| OEE | `/oee/dashboard` | Opened; rendered | Date/filter controls |
| Rojmel | `/rojmel/dashboard` | Opened; rendered | Wallet/transaction table shells |
| Data Book | `/data-book` | Opened; rendered | Grid/list controls and table |
| Audit | `/activity-logs` | Opened; rendered | Filters, empty state, pagination |
| Reports | `/reports` | Opened; rendered | Report-card navigation inventory |

## Route catalogue (source inventory)

| Module | Routes | Live status / limitation |
|---|---|---|
| Authentication & account | `/`, `/login`, `/forgot-password`, `/reset-password`, `/change-password`, `/profile`, `/preferences` | Source only; login/password flows not exercised. |
| RBAC | `/users`, `/roles`, `/permissions`, `/rbac/pages`, `/rbac/pages/new`, `/rbac/pages/:id/edit`, `/pages` redirect | Users failed (UI-001); remaining list pages opened; create/edit staging required. |
| Party master | `/party`, `/party/new`, `/party/:id/edit` | List opened; form/detail IDs and mutation unverified. |
| Inventory | `/items`, `/items/new`, `/items/:id/edit`, `/categories`, `/units` | Items opened; remaining source only. |
| Sales | `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/:id`, `/sales/invoices/:id/edit` | List opened; all create/detail/edit and status actions unverified. |
| Purchase & expense | `/purchase/bills`, `/purchase/bills/new`, `/purchase/bills/:id`, `/purchase/bills/:id/edit`, `/purchase/orders`, `/purchase/orders/new`, `/purchase/orders/:id`, `/purchase/orders/:id/edit`, `/purchase/returns`, `/purchase/returns/new`, `/purchase/returns/:id`, `/purchase/returns/:id/edit`, `/purchase/supplier-payments`, `/purchase/expenses`, `/purchase/expense-categories`, `/purchase/reports` | Bills/orders opened; remaining source only. |
| Rojmel | `/rojmel/dashboard`, `/rojmel/my-wallet`, `/rojmel/wallets`, `/rojmel/transactions`, `/rojmel/transfers`, `/rojmel/reports`, `/rojmel/reports/:reportId` | Dashboard opened; record/payment actions unverified. |
| HR | `/hr/dashboard`, `/hr/employees`, `/hr/employees/new`, `/hr/employees/:id/edit`, `/hr/departments`, `/hr/designations`, `/hr/attendance`, `/hr/leaves`, `/hr/shifts`, `/hr/payroll` | Dashboard opened; workflow/form pages source only. |
| Reports | `/reports`, `/reports/:group`, `/reports/:group/:reportId` | Index opened; individual reports source only. |
| OEE | `/oee/dashboard`, `/oee/production-entries`, `/oee/machines`, `/oee/moulds`, `/oee/downtime-reasons`, `/oee/reports` | Dashboard opened; remaining source only. |
| Supply Chain | `/supply-chain/channels`, `/supply-chain/warehouses`, `/supply-chain/item-mappings`, `/supply-chain/packaging-profiles`, `/supply-chain/packaging-profiles/new`, `/supply-chain/packaging-profiles/:id/edit`, `/supply-chain/imports` | Channels opened; remaining source only. |
| Procurement Planning | `/procurement`, `/procurement/sales-import`, `/procurement/sku-mapping`, `/procurement/bom-mapping`, `/procurement/settings`, `/procurement/setup`, `/procurement/settings/:itemId/edit`, `/procurement/generate-plan`, `/procurement/planning-history` | Home opened; export/save/generate/history workflows unverified. |
| Dispatch Planning | `/dispatch`, `/dispatch/dashboard`, `/dispatch/runs`, `/dispatch/runs/:id`, `/dispatch/imports`, `/dispatch/settings`, `/dispatch/settings/new`, `/dispatch/settings/:id/edit`, `/dispatch/reports` | Dashboard opened; remaining source only. |
| Shipment Operations | `/shipments`, `/shipments/dashboard`, `/shipments/work-list`, `/shipments/work-list/new`, `/shipments/work-list/new-from-plan`, `/shipments/work-list/:id`, `/shipments/freight`, `/shipments/transporters`, `/shipments/imports`, `/shipments/reports` | Dashboard opened; mutation routes unverified. |
| Data/audit | `/data-book`, `/activity-logs` | Both opened; entry creation/deletion/export not tested. |
| Website Management — out of scope | `/website/dashboard`, `/website/products`, `/website/products/new`, `/website/products/:id/edit`, `/website/blog`, `/website/blog/new`, `/website/blog/:id/edit`, `/website/announcements`, `/website/warranty`, `/website/warranty/:id`, `/website/settings` | Source inventory only; public website is on hold. |
| System/errors | `/settings`, `/403`, `/404`, `*` | Source only. |

**Route observation:** `/inventory/items` and `/purchase/documents` produced the app 404 page because they are not source routes; no broken navigation link to either was observed. Canonical route names above should be used in future test automation.
