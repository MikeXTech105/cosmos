# COSMOS — Enterprise System Architecture
**Scope:** Whole repository · **Reviewed:** 2026-10-26 · **Basis:** [Backend architecture](../backend/SYSTEM_ARCHITECTURE.md), [backend knowledge](../backend/PROJECT_KNOWLEDGE.md), module specifications, Git tree.

## System boundaries
- **ERP application:** React/Vite UI → ASP.NET Core .NET 10 controller APIs → application services and FluentValidation → Dapper persistence → SQL Server stored procedures. See `backend/Cosmos.slnx`, `backend/src/`, `frontend/src/`.
- **Identity/security:** JWT auth, SQL-backed Roles, Pages and page/action permissions; protected System Owner. UI permissions are presentation hints; APIs and SQL ownership checks enforce access.
- **External integration:** GSTZen provider services and GST registration/session resources, plus independent WEWEL public website data endpoints.
- **Runtime:** Docker Compose, API and frontend containers; deployment workflow under `.github/workflows/deploy.yml`. Target HTTPS/proxy configuration must be validated in the deployment environment.

## Backend layers
| Layer | Responsibility | Source |
|---|---|---|
| Cosmos.API | Routes, authentication, permission attributes/filters, middleware, Swagger and response mapping | `backend/src/Cosmos.API/` |
| Cosmos.Contracts | Client-facing DTOs and request/response shapes | `backend/src/Cosmos.Contracts/` |
| Cosmos.Application | Business use cases, rules, validation and abstractions | `backend/src/Cosmos.Application/` |
| Cosmos.Domain | Entities, enums and permission keys | `backend/src/Cosmos.Domain/` |
| Cosmos.Persistence | Dapper repositories and procedure calls | `backend/src/Cosmos.Persistence/` |
| Cosmos.Infrastructure | Provider clients and security implementation | `backend/src/Cosmos.Infrastructure/` |
| Cosmos.Shared | Common responses, exceptions and cross-cutting contracts | `backend/src/Cosmos.Shared/` |
| Cosmos.Tests | Automated verification | `backend/tests/Cosmos.Tests/` |

## Business data ownership and cross-module rules
- `Items` is the canonical ERP item master. Supply Chain, Procurement, Dispatch, Shipment and Manufacturing must reuse it; never silently create an Item during imports.
- Sales/Purchase, Production and confirmed Shipment events can modify stock according to their own transaction rules. Reconcile against `StockMovements`; do not add a second independent stock ledger.
- Procurement Planning produces **recommendations**, not purchase bills, purchase orders, stock movements or accounting records. [Procurement specification](../backend/docs/PROCUREMENT_PLANNING.md).
- Manufacturing's effective versioned BOM became Procurement's authoritative BOM after the 2026-10-06 consolidation migration; legacy Procurement BOM entries are historical. [BOM consolidation](../backend/docs/MANUFACTURING_PROCUREMENT_BOM_CONSOLIDATION.md).
- Rojmel wallet income/expense is a cash-ledger activity, distinct from supplier expense and tax accounting; between-wallet transfers are not income/expense. [Rojmel specification](../backend/docs/ROJMEL_WALLET_MODULE.md).
- Website Products are independent of ERP Items and do not participate in ERP stock or procurement. [Website Management specification](../backend/docs/WEBSITE_MANAGEMENT_MODULE.md).
- Data Book private entries remain owner-only, including for SuperAdmin and System Owner; SQL applies this restriction. [Data Book specification](../backend/docs/DATA_BOOK_MODULE.md).
- Business audit events use the central AuditLogs implementation; routine HTTP request telemetry stays in Serilog. [Activity Logs specification](../backend/docs/ACTIVITY_LOGS_MODULE.md).

## Design principles
Preserve existing route contracts or explicitly version/break them; validate page permissions against seeded Pages; handle money and stock mutation atomically at the database boundary; retain immutable business snapshots for historic accounting/compliance decisions; separate real provider integration from mock/sandbox verification.

## Architectural risks needing renewed verification
Cross-service database transaction semantics; older schema and migrations applied consistently; current production HTTPS and API proxy; GST legal document snapshots and provider reconciliation; correctness of stock movement reversals under concurrency. See [Quality and Risks](QUALITY_AND_RISKS.md).
