# COSMOS — Enterprise Module Catalogue
**Reviewed:** 2026-10-26 · **Purpose:** Single navigation and domain-boundary source. Detailed rules remain in the linked module specifications.

| Domain | Scope and business boundary | Detailed source |
|---|---|---|
| Identity/Security | JWT sessions, Users, Roles, Pages, Actions, protected System Owner | [System Owner](../backend/docs/SYSTEM_OWNER.md) |
| Activity and Audit | Permanent business/security events; Serilog for technical HTTP telemetry | [Activity Logs](../backend/docs/ACTIVITY_LOGS_MODULE.md) |
| Core masters | Units, Categories, Items and Parties; global Item master | [Backend system documentation](archive/backend/BACKEND_SYSTEM_DOCUMENTATION.md) |
| Sales/Purchase/Expense | Invoices, purchase/expense workflows, stock and party ledgers | [Backend knowledge](archive/backend/PROJECT_KNOWLEDGE.md) |
| Inventory/Reports | Stock ledger, low/dead/fast/slow stock, dashboards, report APIs | [Stock reports](../backend/docs/STOCK_REPORTS.md), [Reports](../backend/docs/REPORTS_PHASE1.md), [Dashboard](../backend/docs/DASHBOARD_PHASE1.md) |
| HR | Employees, resignation/rejoin, attendance, leave, payroll | [Backend system documentation](archive/backend/BACKEND_SYSTEM_DOCUMENTATION.md) |
| OEE | Machine/mould production reporting and downtime | [Backend knowledge](archive/backend/PROJECT_KNOWLEDGE.md) |
| Rojmel | Company and user wallets, external wallets, transfers, income/expense and reports | [Rojmel](../backend/docs/ROJMEL_WALLET_MODULE.md) |
| Supply Chain | Channel/warehouse/SKU mapping and imports reused by planning and shipment | [Client handover](../backend/docs/SUPPLY_CHAIN_CLIENT_HANDOVER_GUIDE.md) |
| Procurement | Channel sales → BOM demand → recommendation snapshot; does not create PO | [Procurement](../backend/docs/PROCUREMENT_PLANNING.md) |
| Dispatch | Warehouse/SKU stock/sales/inbound snapshots, plan allocations and overrides | [Dispatch implementation](../backend/docs/DISPATCH_PLANNING_IMPLEMENTATION.md) |
| Shipment/Work List | Packing, docket, freight, dispatch confirmation, returns, history import | [Shipment](../backend/docs/SHIPMENT_OPERATIONS_IMPLEMENTATION.md) |
| Manufacturing | Versioned effective BOM, production drafts, posting and reversing stock | [Manufacturing](../backend/docs/MANUFACTURING_MODULE.md), [BOM consolidation](../backend/docs/MANUFACTURING_PROCUREMENT_BOM_CONSOLIDATION.md) |
| Data Book | Shared entries and owner-private entries, safe history and export | [Data Book](../backend/docs/DATA_BOOK_MODULE.md) |
| Website Management | Independent site products, content, top-bar announcements, warranties, public website endpoints | [Website](../backend/docs/WEBSITE_MANAGEMENT_MODULE.md) |
| GST/HSN | Registration/session, GSTIN, HSN mappings, isolated rules and e-document foundations | [Architecture](COSMOS_GST_EINVOICE_EWAYBILL_ARCHITECTURE.md), [policy](COSMOS_GST_EINVOICE_EWAYBILL_POLICY_DECISIONS.md), [remediation](COSMOS_GST_EINVOICE_EWAYBILL_MASTER_REMEDIATION_REPORT.md) |

## How to add or change a module
Identify existing masters, permissions, API contracts and stock/ledger effects; propose the database model; identify data migration and backward-compatibility requirements; implement validation and tests; update this catalogue and the linked module document. For user-facing workflows, retain concrete examples in the existing integration guides rather than creating another stand-alone tracker.

## Known non-equivalences
- Warehouse/channel inventory snapshots are not automatically the same as the ERP's global on-hand stock.
- A wallet transfer is not financial income or expense.
- Procurement BOM is resolved from Manufacturing versioned BOM, not from independently editable legacy component rows.
- HSN rule engine infrastructure is not equivalent to legally approved tax decisions.
- A successful provider API call is not proof of an accurate statutory invoice; never activate without an immutable document snapshot and reconciliation.
