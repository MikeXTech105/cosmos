# Procurement Planning Implementation Tracker

## Status

Backend module: Implemented and verified on 2026-07-15.

Frontend screens: Not implemented; integration contract is complete.

Client data migration: Awaiting explicit Item and channel-SKU matching. No workbook Item was auto-created.

## Delivery Checklist

| Phase | Deliverable | Status | Evidence |
|---|---|---|---|
| Discovery | Repository/module/security/database/test/documentation scan | Complete | `PROCUREMENT_PLANNING_IMPLEMENTATION.md` |
| Discovery | Workbook sheet/formula/dependency inspection | Complete | Migration workbook and regression fixture |
| Design | Minimal additive schema and Item classification | Complete | `20260715_procurement_planning_module.sql` |
| Backend | Channels and SKU mappings | Complete | Controller/service/repository/procedures |
| Backend | Manual and CSV/XLSX sales import with preview/history/cancel | Complete | API plus parser/writer tests |
| Backend | BOM and procurement settings/lead history | Complete | API plus transactional procedures |
| Backend | Calculation engine, validation, preview, saved snapshots | Complete | Pure service and 19 focused calculation tests |
| Backend | Draft adjustment/finalization/export | Complete | API, SQL smoke test, XLSX writer |
| Security | Pages, actions, JWT, audit | Complete | Permission constants and migration seeds |
| Swagger | Module document and multipart endpoints | Complete | Runtime Swagger verification |
| Migration | Workbook match/configuration report | Complete | `PROCUREMENT_PLANNING_WORKBOOK_MIGRATION_REPORT.xlsx` |
| Migration | Confirmed Item/SKU/BOM/settings data import | Blocked by client mapping | Every workbook name is currently Unmatched |
| Verification | Build and existing/new xUnit tests | Complete | 64/64 passed |
| Verification | Migration idempotency and DB smoke | Complete | Reapply succeeded; smoke PASS and rollback |
| Verification | Workbook comparison | Complete | Workbook report `Compatibility` sheet and regression test |
| Documentation | Backend, frontend, database package, project progress | Complete | Files in `backend/docs`, `backend/database`, and `docs` |

## Explicit Non-Applicability

- Warehouse isolation: the current repository has no general Warehouse entity or warehouse-level stock balance. Planning therefore uses global `Items.CurrentStock`; this is documented in the API and snapshot.
- Company/tenant isolation: the current core transaction tables have no common Company/Tenant key. The module does not invent one. If multi-company support is introduced, CompanyId and warehouse scope must be added consistently across Items/stock, sales history, BOM/settings, planning runs, permissions, and all procedures.
- Purchase orders, open orders, inbound quantities, supplier selection/tracking, live marketplace APIs, and forecasting are outside scope.

## Client Decisions Before Production Data Migration

1. Map or explicitly create all workbook finished-product and material Items.
2. Assign Raw Material vs Component vs Packing Material classifications.
3. Provide real AMZ/BLI/INS channel SKUs; the workbook contains only product names and channel quantities.
4. Confirm whether workbook EOQ values are minimum order quantities. The implemented default treats them as MOQ.
5. Confirm material order multiples and whether any material should use no multiple rounding.
6. Confirm lead times for workbook rows whose lead-time cells are blank.
7. Confirm manual-planning materials and physical stock for blank workbook stock cells.
8. Confirm that global `Items.CurrentStock` is acceptable until a warehouse stock model exists.
# Supply Chain Common Foundation Alignment — 2026-07-27

| Work item | Status | Evidence |
| --- | --- | --- |
| Reuse Item master, Channels, SKU mappings, parser, audit, response/paging patterns | Implemented | `SalesChannels` and `ChannelSkuMappings` extended in place; no `Channels`, `Products`, or `ChannelItemMappings` duplicate table. |
| Channel Warehouse master | Implemented | Record-based `ChannelWarehouses`, secured `/api/v1/supply-chain/warehouses` API, filtered unique code. |
| Packaging profile | Implemented | `ItemPackagingProfiles`, unit/weight rules, persisted volumetric calculation, default-profile filters. |
| Shared import staging | Implemented for ProcurementSales | File hash, staged validation/errors, transactional commit into compatible Procurement history. Other reserved import types are intentionally non-operational. |
| Procurement inbound availability | Implemented | `ProcurementInboundStockSnapshots`; calculation v2 adds the latest valid inbound quantity. |
| Existing Procurement route compatibility | Preserved | Existing controllers/procedures remain; shared APIs are additive. |
| Source Dispatch/Work List workbook analysis | Blocked by missing source files | See `SUPPLY_CHAIN_WORKBOOK_MAPPING.md`. |
| SQL execution against disposable SQL Server | Pending | Migrations and verification script added; no confirmed local SQL Server execution in this run. |
| Build and full automated suite | Passed | `dotnet build Cosmos.slnx --no-restore` and `dotnet test Cosmos.slnx --no-build`: 144/144 tests passed on 2026-07-27. |
