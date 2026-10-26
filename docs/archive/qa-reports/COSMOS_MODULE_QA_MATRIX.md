# COSMOS ERP — Module QA Matrix

| Module | Source implementation | Live evidence | Tests/evidence | Status |
|---|---|---|---|---|
| Auth/RBAC | controllers, JWT middleware, role/page/permission services | 401 boundary verified; login page renders | security/auth tests; 441 permission attribute uses | Partially verified |
| Dashboard | frontend services/pages; API/services/repository | none authenticated | dashboard tests | Unverified live |
| Masters, items, parties | frontend + controllers + Dapper | none authenticated | selected materialization/validation tests | Unverified live |
| Sales | frontend + controllers/services | none authenticated | sales calculation tests | Unverified live |
| Purchase/expense | frontend + controllers/services | none authenticated | validators and report parameter tests | Unverified live |
| Inventory | frontend + controllers/services | none authenticated | frontend helpers/services tests | Unverified live |
| Procurement Planning | frontend/services + engine/repository | none | policy, calculation, workbook, Dapper tests | Source-tested; live unverified |
| Manufacturing | frontend/services + module API/repository | none | BOM/permission/materialization tests | Source-tested; live unverified |
| Dispatch Planning | frontend/services + engine/repository | none | lifecycle, engine, SQL/Dapper tests | Source-tested; live unverified |
| Shipment Operations | frontend/services + API/repository | none | engine/validator/materialization tests | Source-tested; live unverified |
| HR | frontend/services + API/repository | none | employee validation tests | Unverified live |
| OEE | frontend/services + API/repository | none | database/export evidence | Unverified live |
| GST | frontend/services + API/repository | none | provider tests | Unverified live |
| Reports | frontend/services + report APIs | none | report validator/export tests | Unverified live |
| Data Book/activity logs | frontend/services + APIs | none | data-book/activity-log tests | Source-tested; live unverified |
| Rojmel/wallet | frontend/services + APIs | none | authorization/ledger/materialization tests | Source-tested; live unverified |
| Website Management | frontend/services + APIs | none authenticated | website tests | Unverified live |
| Public Website | public controller/repository | list endpoints 500 | public OpenAPI | **OUT OF SCOPE — ON HOLD** |

All internal modules are affected by the shared base-URL fault until INT-001 is corrected. No module is marked functionally passed merely because its unit tests passed.
