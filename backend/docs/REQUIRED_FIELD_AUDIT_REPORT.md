# Required Field Dependency Audit Report

## Executive summary

This is a read-only static audit of the checked-out source and SQL artifacts. No application, SQL, or migration source was changed.

| Measure | Result | How calculated |
|---|---:|---|
| Modules analysed | 20 | Actual controller/service/repository groupings in [PROJECT_MODULE_MAP.md](PROJECT_MODULE_MAP.md) |
| Controller source files | 57 | \`src/Cosmos.API/Controllers/**/*.cs\` |
| HTTP action attributes | 466 | Repository-wide controller attribute scan; detailed index is [API_REQUIRED_FIELDS_MATRIX.md](API_REQUIRED_FIELDS_MATRIX.md) |
| Domain type declarations | 35 | \`src/Cosmos.Domain/**/*.cs\`; not equivalent to table count |
| Request/command/query declarations | 511 | Contracts and Application source inventory |
| Validator classes | 207 | \`AbstractValidator<T>\` declarations in 22 validator files |
| Explicit \`[Required]\` attributes | 0 | Repository-wide C# scan |
| EF Core required mappings | 0 | No EF Core / \`DbContext\` / \`IsRequired\` found |
| SQL table definitions | 116 | Unique \`CREATE TABLE\` names in 39 SQL files |
| SQL procedure definitions | 485 | Unique \`CREATE [OR ALTER] PROCEDURE\` names in source scripts |
| SQL trigger definitions | 6 | Unique trigger names in source scripts |
| SQL view definitions | 2 | Unique view names in source scripts |
| Static \`NOT NULL\` declarations | 1,548 | Declaration occurrences; scripts can supersede earlier declarations |
| Static foreign-key declarations | 208 | Declaration occurrences; scripts can repeat or alter an earlier constraint |

The source uses FluentValidation, non-nullable record/property contracts, controller route/value parameters, direct dereferences, Dapper parameter objects, SQL procedure parameters, \`NOT NULL\` columns and foreign keys as its requirement mechanisms. \`[Required]\` and EF conventions are not mechanisms in this solution.

**DATABASE DATA CHECK: NOT AVAILABLE.** Integrated authentication and the configured SQL-login attempt both failed against the configured staging host. No query was executed successfully; this audit does not claim anything about live NULLs, empty strings, defaults, orphaned rows, deployed procedure text, or deployment drift.

## Evidence and scope

- Validation registration is assembly-wide: \`src/Cosmos.Application/DependencyInjection.cs:13\`.
- All controllers inherit \`[ApiController]\`: \`src/Cosmos.API/Controllers/ApiControllerBase.cs:6\`.
- Nullable reference types are enabled in every production project, for example \`src/Cosmos.API/Cosmos.API.csproj:5\`.
- Dapper invokes named stored procedures with supplied parameter objects: \`src/Cosmos.Persistence/Dapper/StoredProcedureExecutor.cs:10-71\`.
- SQL connection construction is in \`src/Cosmos.Persistence/Connection/SqlConnectionFactory.cs:9-22\`.

The master finding index is [REQUIRED_FIELDS_MASTER.md](REQUIRED_FIELDS_MASTER.md). It preserves \`File\`, validator class, line, target field and rule excerpt for every direct validation rule found by the deterministic scan. The database evidence ledger is [DATABASE_REQUIRED_FIELDS.md](DATABASE_REQUIRED_FIELDS.md); its script-level status must not be confused with a verified live schema.

## Top required / high-dependency fields

| Field family | Why it is high impact | Evidence |
|---|---|---|
| Authentication credentials and refresh/reset tokens | Required to authenticate, rotate/revoke sessions or reset credentials; affects security boundaries and token tables. | \`src/Cosmos.Application/Validators/AuthValidators.cs:10-64\`, \`database/001_Full_Database_Setup.sql:41-154\` |
| User/role/page identifiers and assignments | Required primary/foreign-key and authorization graph inputs. Removing them breaks identity and permission enforcement. | \`UserValidators.cs\`, \`PermissionValidators.cs\`, \`database/001_Full_Database_Setup.sql:74-122\` |
| Item category/unit and inventory values | Item creation/business logic and downstream sales/procurement/dispatch/shipment FKs depend on them. | \`src/Cosmos.Application/Validators/ItemValidators.cs:135-161\`, \`database/001_Full_Database_Setup.sql:1433-1461\` |
| Sales/purchase line identifiers, quantities and prices | Required for document totals, stock movements, payment allocations and financial reporting. | \`SalesValidators.cs\`, \`PurchaseExpenseValidators.cs\`, SQL sales/purchase blocks |
| HR employee identifiers and attendance/payroll period fields | Parent/child FK graph and payroll calculations depend on them. | \`HrValidators.cs\`, \`database/001_Full_Database_Setup.sql:2115-2343\` |
| GST registration, IRN/e-way bill identifiers and official JSON payloads | Required by stored records and the GSTZen external contract. | \`GstValidators.cs:132-282\`, \`src/Cosmos.Infrastructure/Gst/GstZenProviderService.cs\` |
| Planning and shipment run IDs, item/channel/warehouse FKs | Required by calculation snapshots, allocation, traceability and status transitions. | planning/dispatch/shipment validator files and migrations dated 20260715-20260729 |
| Warranty claim identity, invoice and product-image uploads | Public-facing legal/operational workflow; validators require claim details and attachments. | \`WebsiteManagementValidators.cs:132-140\`, \`PublicWebsiteController.cs:44-89\` |
| Wallet transaction / transfer identifiers and amounts | Core financial ledger relationships; a removal changes balance/reconciliation behavior. | \`RojmelValidators.cs\`, \`20260720_rojmel_wallet_module.sql\` |

## Implicit requirements confirmed by code

The following fields are not merely annotated; they are directly dereferenced after validation. Making any optional requires both retaining/replacing its validation and adding a null/blank branch before the dereference.

| Field / contract | Evidence | Effect if omitted after validation is relaxed |
|---|---|---|
| Data Book \`Name\`, \`Value\`, \`RowVersion\` | \`src/Cosmos.Application/Services/DataBookService.cs:201-204\` | \`.Trim()\` throws for null; row version is concurrency-sensitive. |
| Profile \`Email\`, \`FullName\` | \`src/Cosmos.Application/Services/AuthService.cs:121\` | \`.Trim()\` throws; persistence receives invalid identity data. |
| Page \`Name\` | \`src/Cosmos.Application/Services/PageService.cs:38\` | \`.Trim()\` throws. |
| Procurement/supply-chain code, name, SKU and cancellation reason fields | \`ProcurementPlanningService.cs:110,141,245,258,399\`; \`SupplyChainService.cs:93-94,183,335\` | \`.Trim()\` / normalisation fails or a procedure receives a missing key. |
| Shipment cancellation/rejection reasons | \`src/Cosmos.Application/Services/ShipmentOperationsService.cs:94,227,306\` | \`.Trim()\` throws and required lifecycle audit reason disappears. |
| Wallet cancellation/transfer reasons | \`src/Cosmos.Application/Services/RojmelServices.cs:207,251\` | \`.Trim()\` throws and ledger cancellation rule loses its reason. |
| Website product/blog/announcement/warranty/contact fields | \`src/Cosmos.Application/Services/WebsiteManagementServices.cs:53,94,146,166,170\` | Normalization dereferences them; public workflow and persisted records fail. |

Other \`.Value\` occurrences were reviewed as *potential* implicit requirements. Many are explicitly guarded by \`HasValue\`, null-pattern checks or validator preconditions; they are not counted as unguarded requirements without an evidence path.

## Safe candidates and risk classification

No field is classified as a safe removal solely from source. A nullable SQL column does **not** prove that application logic accepts null. Candidates most likely to be low-risk *optional* changes are descriptive fields that have no \`NotEmpty\`/\`NotNull\` rule, are declared nullable, are normalized with \`TrimToNull\`, and map to \`NULL\` columns; examples include many descriptions, notes, optional image URLs and optional search/filter parameters. Each candidate must still be checked against its exact repository procedure and report usage.

High or critical changes include primary keys, foreign keys, identity/security claims, passwords/tokens, financial amounts and ledger references, required document/line-item collections, status transition reasons, public warranty evidence, and external GST payload members. These must not be removed as a local DTO edit.

## Migration strategy

1. Select one logical field and use the master, API and database ledgers to enumerate all evidence before changing a contract.
2. For “make optional”, first define the missing-value behaviour; change validation and DTO nullability; add explicit service branching; then make the stored-procedure parameter and SQL column nullable if they are currently mandatory.
3. Deploy an additive/compatible database procedure and application version first. Backfill or normalize existing data before adding/removing constraints.
4. Update every report, export, filter, join and external payload contract that uses the field. SQL \`=\` predicates must receive an explicit \`IS NULL\` policy.
5. Only after clients have migrated, remove the response/request member, procedure parameter, table column, FKs/indexes/checks/defaults, documentation and tests. Archive/transform historical/audit data deliberately.
6. Validate rollback before a destructive removal: restore accepting procedures/code first, then restore nullable column/constraint only after data compatibility is known.

## Per-field change templates

For every \`REQUIRED\` master entry, the change set is intentionally split:

- **Make optional:** remove or condition the exact validator rule; make the request/command component nullable when appropriate; guard the cited service dereference; condition the Dapper parameter; allow \`NULL\` in each called procedure and column; decide FK/delete/index semantics; add omission, null, empty and legacy-client tests.
- **Remove completely:** perform the optionality steps if a staged release is needed, then remove request and response members, validation, normalisation, service/repository parameter mapping, procedure parameters/bodies, query/join/report/export use, SQL columns/FKs/indexes/defaults/checks/triggers, integrations, events and tests. This is breaking whenever the member is public or stored historical data needs preserving.

