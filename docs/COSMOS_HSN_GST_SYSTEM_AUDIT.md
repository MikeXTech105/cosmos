# Cosmos ERP — HSN Code Management & GST Calculation System Audit

**Audit date:** 15 October 2026
**Scope:** Read-only source and database-script audit. No application code, schema, configuration, database data, or external compliance service was changed.
**Evidence standard:** “Implemented” means code or a database script was found. It does not mean the feature has been deployed, configured, or is legally compliant.

## 1. Executive Summary

Cosmos has useful GST building blocks but not a centralized, effective-dated GST calculation system. The Product Master already stores a free-text `HSNCode` and a decimal `GSTRate`; Sales Invoices snapshot the selected product HSN and submitted tax percentage; GST registrations, GSTIN verification, GSTZen API wrappers, E-Invoice/E-Way Bill persistence, audit logging, and basic tax-summary reports exist.

The decisive gaps are that there is no HSN master, no GST-rate master or history, no category default/override model, no authoritative rule-selection service, no CGST/SGST/IGST component calculation or persistence, and no automatic compliance-payload builder from invoices. The Sales path accepts a client-supplied tax rate rather than resolving it from product, date, supply location, and registrations. Purchase documents retain a user-supplied tax percentage but no HSN snapshot. No inventory stock-transfer domain workflow was found; the only “transfer” domain found is Rojmel wallet transfer, which is not stock movement.

The existing model is therefore suitable as a migration base, not as evidence of statutory GST-complete behavior. The reference WEWEL example is not used as a default, classification, or expected test rate in this audit.

## 2. Repository and Architecture Overview

| Area | Verified implementation | Evidence |
|---|---|---|
| Backend | ASP.NET Core Web API split into API, Application, Contracts, Domain, Infrastructure, Persistence, and Shared projects. | `backend/src/Cosmos.API`, `Cosmos.Application`, `Cosmos.Contracts`, `Cosmos.Domain`, `Cosmos.Infrastructure`, `Cosmos.Persistence` |
| Data access | SQL Server stored procedures accessed through Dapper repositories and `ISqlConnectionFactory`. | `backend/src/Cosmos.Persistence/Repositories/ItemRepository.cs`, `SalesRepository.cs`, `GstRepository.cs` |
| Database delivery | Idempotent SQL Server setup and dated SQL migrations; no EF migration project was found. | `backend/database/001_Full_Database_Setup.sql`, `backend/database/migrations/` |
| Frontend | React/Vite frontend organized by functional pages, service modules, Redux slices, and shared UI components. | `frontend/package.json`, `frontend/src/pages`, `frontend/src/services`, `frontend/src/store` |
| Testing | xUnit/Moq backend tests; Vitest frontend unit tests. SQL-contract tests assert selected stored-procedure text. | `backend/tests/Cosmos.Tests`, `frontend/src/**/*.test.js` |

The database is SQL Server based on T-SQL syntax, `CREATE OR ALTER PROCEDURE`, table-valued parameters, `ROWVERSION`, and Dapper stored-procedure use. This audit did not connect to a database, so deployment state, data quality, and the live definition of any procedure remain unverified.

## 3. Current HSN/GST Functionality Inventory

| Capability | Status | Verified behavior | Main limitation |
|---|---|---|---|
| Item HSN/GST fields | Partial | Item has nullable HSN and a `0..100` rate. | Free text/rate; no master, validation against HSN, approval, history, or effective date. |
| Category default | Missing | Category table has only name/description/activity fields. | No category HSN/tax fields or fallback logic. |
| Sales tax arithmetic | Partial | Calculates one aggregate tax using submitted `TaxPercentage`. | No jurisdiction, component split, exemption, effective date, or authoritative rate lookup. |
| Sales snapshots | Partial | HSN and total tax percentage are copied to invoice line. | No tax-rule/version or CGST/SGST/IGST snapshots. |
| Purchase tax | Partial | Tax percentage/amount is persisted per line. | No HSN snapshot and no GST component breakdown or centralized selection. |
| GST registration/provider | Implemented foundation | Registration, GSTIN verification, GSTZen wrapper, persistence, logs. | Not connected to invoice calculation or automatic payload generation. |
| E-Invoice/E-Way Bill | Partial | External-request wrappers validate and store request/response JSON. | Caller must supply provider payload; no invoice-to-payload mapper. |
| Tax reports | Partial | Sales HSN/tax summary uses sales snapshots; purchase summary uses current item HSN. | No component-wise/return reporting; purchase history can be rewritten by item edits. |
| Stock transfers | Missing/Unknown | Shipment operations and Rojmel wallet transfer exist. | No stock-transfer tax document/tax workflow found. |

## 4. Product Master and HSN Mapping Findings

### Verified current behavior

- `dbo.Items` includes `HSNCode NVARCHAR(50) NULL` and `GSTRate DECIMAL(5,2) NOT NULL DEFAULT(0)`; the only related constraint is rate `0..100` (`backend/database/001_Full_Database_Setup.sql:1431-1467`).
- `Item`, `ItemDto`, create/update commands, repository parameters, validators, API, and item forms all expose those fields (`backend/src/Cosmos.Domain/Entities/Item.cs:5-31`; `backend/src/Cosmos.Contracts/Items/ItemDtos.cs:3-35`; `backend/src/Cosmos.Persistence/Repositories/ItemRepository.cs:112-138`; `backend/src/Cosmos.Application/Validators/ItemValidators.cs:156-162`; `frontend/src/pages/inventory/items/ItemFormPage.jsx:573-579`).
- The frontend offers only hard-coded rates `0, 3, 5, 12, 18, 28` (`frontend/src/pages/inventory/items/itemHelpers.js:21-24`). The backend permits any two-decimal rate from zero through 100.
- Item HSN is a text input; backend validation only limits it to 50 characters. There is no digits-only, code-length, active-code, or classification validation.
- `dbo.Categories` has no HSN/tax columns (`backend/database/001_Full_Database_Setup.sql:1414-1428`). No category-to-HSN relation or bulk mapping/import endpoint was found.
- Item code, category, unit, item type, manufacturing state, and procurement classification exist, but no evidence was found that they influence tax selection.

### Required product-master direction

Keep the existing item HSN/rate fields only as a compatibility/read-model concern until a business-approved migration is delivered. A new, effective-dated HSN master and rule/mapping model must be the source of truth; the implementation must explicitly define whether item-level mappings copy a category default, reference it dynamically, or record an override. Existing values must be profiled before any backfill. Do not infer an HSN from name, SKU, supplier record, or the WEWEL example.

## 5. Existing GST Calculation Flow

### Sales flow found

1. The item form stores its HSN/rate. When an invoice item is selected, the frontend fills `taxPercentage` from `item.gstRate` (`frontend/src/pages/sales/invoices/InvoiceFormPage.jsx:281`; the modal has equivalent behavior at `InvoiceFormModal.jsx:200`).
2. `CreateSalesInvoiceCommand` accepts `TaxRateId` and `TaxPercentage` from the client (`backend/src/Cosmos.Application/Sales/SalesRequests.cs:20-29`). No `TaxRates` table or tax-rate repository was found; `TaxRateId` is nullable and has no foreign key in `SalesInvoiceItems`.
3. `SalesCalculationService.CalculateInvoiceTotals` computes taxable amount after discount and one aggregate tax `taxable * TaxPercentage / 100`, rounded to two decimals per line (`backend/src/Cosmos.Application/Services/SalesCalculationService.cs:10-63`). It validates basic discount/payment bounds only.
4. The service calls that calculation before persistence, but the stored procedure recalculates from the submitted table-valued parameter. It does not read `Items.GSTRate` and does not validate `TaxRateId` (`backend/src/Cosmos.Application/Services/SalesService.cs`, `backend/database/001_Full_Database_Setup.sql:3357-3418`).
5. `sp_SalesInvoice_Create` copies the *current* `Items.HSNCode` to `SalesInvoiceItems.HsnSacCodeSnapshot`, stores the submitted total percentage, aggregate tax amount and line total (`backend/database/001_Full_Database_Setup.sql:3403-3411`).

This is duplicated aggregate arithmetic in application and SQL, not a centralized GST engine. It is neither tax-inclusive aware nor place-of-supply aware, and it cannot explain a split between CGST/SGST/IGST.

### Missing calculation behavior

- No authoritative resolver for transaction date, supply type, seller registration, buyer GST treatment/GSTIN/state, place of supply, reverse charge, SEZ/deemed export/exempt treatment, or rate effective date.
- No persisted `TaxableValue`, `CgstRate/CgstAmount`, `SgstRate/SgstAmount`, `IgstRate/IgstAmount`, cess, or tax-rule version on invoice lines.
- No documented invoice-level rounding policy beyond aggregate two-decimal calculation, and no inclusive-price calculation.
- No tax rate master or effective-dated history exists. `TaxRateId` is currently an orphanable opaque value.

## 6. Sales Invoice Impact

### Existing reusable foundations

- Sales invoice header/lines, confirm/cancel lifecycle, item/unit/HSN snapshots, audit events, reports and PDF templates are present (`backend/database/001_Full_Database_Setup.sql:3141-3205`, `3357-3470`; `backend/src/Cosmos.Application/Services/SalesService.cs`).
- HSN and aggregate GST are rendered in invoice templates using persisted line values (`frontend/src/pages/sales/invoices/invoiceHelpers.js:555-564`; `frontend/src/pages/sales/invoiceTemplates/InvoiceTemplateShared.jsx:116-162`).
- Sales tax report uses the persisted `HsnSacCodeSnapshot` and `TaxPercentageSnapshot`, preserving those two values against later item edits (`backend/database/migrations/20260709_phase1_reports_module.sql:259-280`).

### Required changes

The sales request/service/procedure must stop trusting a client-selected percentage as the authoritative GST decision. It needs a server-side calculation result that captures selected HSN, rule/rate version, taxable value, each tax component, rounding adjustment and decision inputs. The existing sales line snapshot is a valuable compatibility base but insufficient for component-wise returns or a reproducible compliance payload. Historical invoices must retain the snapshot; they must not be recalculated solely because a product or rate changes.

## 7. Purchase Invoice Impact

### Verified current behavior

- Purchase bills, orders, returns and line inputs store a `TaxPercentage`, `TaxAmount`, discount and total, and calculate aggregate tax in stored procedures (`backend/database/001_Full_Database_Setup.sql:3641-3659`, `3697-3710`).
- The frontend pre-fills `taxPercentage` from `item.gstRate`, while keeping the editable purchase value (`frontend/src/pages/purchase/PurchaseLineItems.jsx:123-140`; `frontend/src/pages/purchase/purchaseHelpers.js:451-509`).
- Purchase line tables have no HSN/SAC snapshot fields. Purchase reports join the live `Items.HSNCode`, including `sp_Report_PurchaseTaxSummary` (`backend/database/migrations/20260709_phase1_reports_module.sql:481-503`).

### Required decision and change

Business must decide whether supplier-document HSN/rate is captured as supplier evidence, whether the product-master classification is recorded separately, and whether mismatches block, warn, or require approval. Both must be retained when legally/operationally necessary; product master must not silently overwrite supplier invoice evidence. Add historical supplier/document HSN and component snapshot fields before relying on purchase HSN reports for compliance.

## 8. Stock Transfer Impact

No inventory stock-transfer module, stock-transfer table, transfer API, or tax/document workflow was found in the inspected source. `RojmelTransfers` moves wallet balances, not inventory (`backend/src/Cosmos.Application/Services/RojmelServices.cs:214-253`). Shipment Operations has warehouse/shipment entities but the inspected contracts do not establish a taxable stock-transfer/accounting document workflow.

Therefore stock transfer is **Missing**, not an extension of existing wallet transfer. Before implementation, business and technical owners must establish whether movements are intra-registration, inter-state under one registration, or between distinct registrations/entities; who is supplier/recipient; the document type; and when E-Way Bill applies. No default interstate tax rule should be inferred.

## 9. E-Invoice and E-Way Bill Impact

### What exists

- `CompanyGstRegistrations`, sessions, verification logs, `EWayBills`, `EInvoices`, and API logs are defined in `backend/database/003_gst_integration_module.sql:5-178`.
- Controllers/services/repositories and a GSTZen HTTP provider are registered (`backend/src/Cosmos.API/Controllers/EInvoicesController.cs`, `EWayBillsController.cs`; `backend/src/Cosmos.Infrastructure/DependencyInjection.cs:25-36`; `backend/src/Cosmos.Persistence/Repositories/GstRepository.cs`).
- Validators require the caller to submit GSTZen/NIC-shaped JSON with `ItemList`; they do not build it from invoice lines (`backend/src/Cosmos.Application/Validators/GstValidators.cs:128-168` and `216-247`).
- E-Invoice/E-Way Bill rows can link to SalesInvoiceId, but no database foreign keys to SalesInvoices were found in the defining SQL. Purchase invoice linkage exists as a nullable identifier even though the current purchase domain names the header `PurchaseBills`.

### Gap and recommended direction

Implement a versioned internal compliance payload builder after the tax snapshot model exists. It should map frozen document data (not current item master values) to provider payloads, validate totals/components/HSN/unit before transmission, persist a payload hash/version, and use a reliable retry/idempotency design. Current raw JSON validation/persistence is reusable as a provider boundary, but is not sufficient for automatic invoice integration.

No frontend GST registration, E-Invoice, E-Way Bill, session, or log page was found despite routes seeded in `003_gst_integration_module.sql:509-523`; only party GSTIN verification uses the GST API (`frontend/src/pages/party/gstService.js`, `PartyFormModal.jsx`). Deployment/routing of those backend routes must be confirmed separately.

## 10. GST Reports and Return Reporting Impact

- Sales and purchase tax-summary pages are registered in the frontend (`frontend/src/pages/reports/reportRegistry.js:309-430`) and call report procedures via `ReportsRepository`.
- Sales report grouping is snapshot-based but reports only aggregate tax; it cannot provide component-wise statutory reporting (`backend/database/migrations/20260709_phase1_reports_module.sql:259-280`).
- Purchase report grouping uses current product HSN rather than a purchase-document snapshot (`backend/database/migrations/20260709_phase1_reports_module.sql:481-503`), so historic output can change after item maintenance.
- No GSTR-1, GSTR-3B, ITC reconciliation, return JSON/export, component-wise HSN summary, return filing workflow, or statutory validation was found.

These reports are operational tax summaries, not verified GST-return functionality. Legal/compliance review is required before representing any output as statutory compliant.

## 11. Database Schema and Migration Findings

### Existing objects

| Object | Relevant capability | Audit conclusion |
|---|---|---|
| `dbo.Items` | Nullable HSN + single decimal GST rate | Reuse/migrate carefully; not a master/history model. |
| `dbo.Categories` | Item category only | Needs extension or a separate category-default mapping. |
| `dbo.SalesInvoices`, `dbo.SalesInvoiceItems` | Header totals and line HSN/percentage snapshot | Strong starting point; needs immutable component/rule snapshots. |
| `dbo.PurchaseBills`, `dbo.PurchaseBillItems`, purchase orders/returns | Aggregate tax percentage/amount | Needs document HSN and GST component snapshots. |
| `dbo.CompanyGstRegistrations` | Company/branch IDs, GSTIN and state | Reusable registration reference; actual Company/Branch referential model needs verification. |
| `dbo.EInvoices`, `dbo.EWayBills` | Provider response/request persistence | Extend linkage and payload provenance after invoice mapping design. |
| `dbo.GstApiLogs`, audit tables | Provider/audit events | Reusable audit infrastructure. |

### Required migrations (proposed, not created)

1. New HSN master plus active/inactive state, code type (HSN/SAC), description, audit fields, and uniqueness. Code-length/format policy must be approved before constraints are selected.
2. Effective-dated GST rate/rule master, with non-overlap protection for the chosen rule key and a future-safe rate version identifier. Define cancellation/deactivation policy rather than deleting historical rules.
3. Product-to-HSN mapping and category-default mapping, with explicit override/source/approval state. Decide whether a product may have date-ranged mappings.
4. Immutable document-line snapshots: selected HSN, rule/version, taxable basis, total rate/amount, CGST/SGST/IGST/cess rates and amounts, place-of-supply/state evidence, and rounding basis. Purchase should also preserve supplier-declared values separately if required.
5. Supporting indexes for effective-date lookup, active mappings, report date + status + rule/HSN, and idempotent compliance linkage. Backfill requires a reviewed data-quality report and should label inferred vs confirmed classifications.

No migration should rewrite existing invoice lines by looking at current `Items.HSNCode` or `Items.GSTRate`.

## 12. Permissions, Audit Logs, and Validation

### Existing infrastructure

- API permissions use `[RequirePermission]`; GST permission constants cover Configuration, Registration, Verification, E-Way Bill, E-Invoice, Session, and Logs (`backend/src/Cosmos.Domain/Security/GstPermissions.cs:5-11`).
- Item and sales services create audit entries through `IAuditRepository` (`backend/src/Cosmos.Application/Services/ItemService.cs`; `SalesService.cs`). GST registration and provider tables include audit columns, and activity-log categorization includes GST objects (`backend/database/migrations/20260810_activity_logs_module.sql:74`).
- Existing validators cover GSTIN pattern and basic input lengths, but not HSN authority, tax jurisdiction, rate effective dates, or component reconciliation (`backend/src/Cosmos.Application/Validators/GstValidators.cs`).

### Required controls

Create distinct permissions for HSN-master maintenance, HSN classification approval, tax-rule/rate maintenance, effective-date approval, bulk import, and audit-history viewing. Reuse the existing permission/audit patterns; do not permit rate or mapping mutation without before/after audit data and an effective-date reason. Business must decide segregation-of-duties requirements.

## 13. Existing Tests and Regression Risks

### Tests found and executed

Executed without a database or external GST call:

```text
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --filter "FullyQualifiedName~SalesCalculationServiceTests|FullyQualifiedName~GstZenProviderServiceTests|FullyQualifiedName~PurchaseExpenseValidatorTests" --no-restore
```

Result: **9 passed, 0 failed, 0 skipped**. The run emitted existing package warnings for `Microsoft.OpenApi` vulnerability `NU1903` and redundant framework-package references `NU1510`; those warnings were not changed in this audit.

Existing tests include aggregate sales calculation (`backend/tests/Cosmos.Tests/Sales/SalesCalculationServiceTests.cs`), GSTZen HTTP-wrapper mapping (`backend/tests/Cosmos.Tests/Gst/GstZenProviderServiceTests.cs`), and basic purchase validation (`backend/tests/Cosmos.Tests/PurchaseExpense/PurchaseExpenseValidatorTests.cs`). They do not establish statutory GST calculation correctness, database deployment state, live GSTZen behavior, tax reporting correctness, or HSN master integrity.

### Required new test coverage

- HSN format/activity/mapping precedence: category default, approved product override, missing/expired mapping, bulk import and duplicate mapping.
- Rate selection by transaction date, rate history boundaries, overlap rejection, inactive rules, and historical replay.
- Intra-state CGST/SGST versus inter-state IGST, buyer/seller/place-of-supply conflicts, SEZ/export/reverse-charge scenarios only after business rules are approved.
- Tax-inclusive and exclusive prices, line/header discounts, charges, all rounding midpoints, zero/exempt lines, and exact total reconciliation.
- Sales, purchase, returns, credit/debit notes if/when implemented, and stock-transfer lifecycle tests.
- Snapshot immutability after master/rate changes and report output based on snapshots.
- E-Invoice/E-Way Bill automatic payload mapping, idempotency, retry, cancellation, redaction, and API failure handling.
- SQL integration tests for constraints/effective-range overlap, permissions/audits, migrations/backfill, and concurrency.

## 14. Module Impact Matrix

| Functional area/module | Existing implementation status | Evidence | Required change | Classification | Dependencies | Regression risk | Priority |
|---|---|---|---|---|---|---|---|
| HSN/GST Master | Missing | No HSN/rate master tables or APIs found; item fields only. | Add versioned HSN/rate/rule maintenance. | New | Business tax policy, permissions | High | P0 |
| Product Master | Partial | Item HSN/rate fields and forms. | Map master HSN/rules; support category default and product override. | Extend | HSN/rate master | High | P0 |
| GST Calculation Service | Partial | `SalesCalculationService` does aggregate submitted-rate arithmetic. | Central server-side resolver/calculator and immutable result. | Extend | Rules, registrations, POS policy | Critical | P0 |
| Sales/Sales Invoice | Partial | Sales snapshots and stored procedures. | Component snapshots, server resolution, document/PDF changes. | Extend | Calculator, migration | Critical | P0 |
| Purchase/Purchase Invoice | Partial | Purchase aggregate line tax only. | Preserve supplier HSN/tax evidence and master comparison/snapshots. | Extend | Business mismatch policy | High | P1 |
| Stock Transfer | Missing | No inventory stock-transfer domain found. | Define and implement separately. | New | Entity/registration/transfer policy | High | P1 |
| E-Invoice | Partial | GSTZen wrapper + raw JSON persistence. | Generate from frozen invoice payload and persist provenance. | Extend | Sales snapshot, provider contract | High | P1 |
| E-Way Bill | Partial | GSTZen wrapper + raw JSON persistence. | Generate from eligible sales/transfer documents. | Extend | Shipment/transfer policy | High | P1 |
| GST Reports | Partial | Sales/purchase tax-summary procedures. | Component-wise snapshot-based HSN/return outputs. | Extend | Snapshot migration | High | P1 |
| Audit Logs and Permissions | Partial | Existing permission/audit patterns and GST permissions. | Separate master/rate approval/audit controls. | Extend | Approval policy | Medium | P1 |
| Database/Migrations | Partial | SQL scripts, stored procedures and snapshots exist. | New master/rule/snapshot objects plus safe backfill. | Extend/New | Data assessment | Critical | P0 |
| Automated Tests | Partial | Calculation/provider/validator tests exist. | Add rules, lifecycle, SQL, UI and payload regression suites. | Extend | Approved behavior | High | P0 |

## 15. Exact Files and Database Objects Potentially Requiring Changes

The following inventory identifies existing artifacts; proposed new object names are intentionally not treated as existing objects.

| Existing artifact | Current behavior | Expected behavior | Why / dependencies | Change confidence |
|---|---|---|---|---|
| `backend/database/001_Full_Database_Setup.sql:1414-1467` (`Categories`, `Items`) | Category has no tax default; item stores free text HSN/rate. | Reference approved, effective mapping/rule records. | Core product classification; migration/backfill. | High |
| `backend/src/Cosmos.Application/Items/Commands/CreateItemCommand.cs` and `UpdateItemCommand.cs` | Accept direct HSN/rate. | Validate/migrate compatible item classifications. | Product UX/API contract decision. | High |
| `backend/src/Cosmos.Application/Validators/ItemValidators.cs` | Max HSN length + broad rate range. | Validate active approved mappings rather than arbitrary values. | Depends on masters and transition plan. | High |
| `frontend/src/pages/inventory/items/ItemFormPage.jsx:573-579`, `itemHelpers.js:21-24` | Text HSN and fixed rate dropdown. | HSN search/selection, default/override evidence, approved rates. | UI must not hard-code legal rates. | High |
| `backend/src/Cosmos.Application/Services/SalesCalculationService.cs` | Aggregate client rate tax. | Central rule result with components/rounding. | Highest-risk calculation change. | High |
| `backend/src/Cosmos.Application/Sales/SalesRequests.cs` / `SalesRepository.cs` | Client submits rate and opaque `TaxRateId`. | Internal resolver selected by contextual transaction data. | Requires API compatibility/versioning strategy. | High |
| `dbo.SalesInvoiceItems` in setup script lines 3177-3205 and sales procedures lines 3357-3470 | HSN and total rate snapshot only. | Immutable rule, POS, taxable and components. | Historic correctness and returns. | High |
| `dbo.PurchaseBillItems`, `PurchaseOrderItems`, `PurchaseReturnItems` at setup lines 3641-3659 | No HSN snapshot; tax is aggregate. | Supplier/master HSN and tax snapshots/components. | Purchase evidence/reconciliation decision. | High |
| `backend/database/migrations/20260709_phase1_reports_module.sql:259-280, 481-503` | Sales snapshot report; purchase current-item HSN report. | Snapshot-only component-wise HSN and return reporting. | Prevent historical report drift. | High |
| `backend/database/003_gst_integration_module.sql`, `GstRepository.cs`, `GstValidators.cs` | Raw GSTZen requests and registrations. | Invoice-derived, versioned payload generation. | Needs frozen invoice tax data/provider approval. | High |
| `backend/src/Cosmos.API/Controllers/*Gst*Controller.cs`, `EInvoicesController.cs`, `EWayBillsController.cs` | Backend routes exist. | New master/rule endpoints and controlled document actions. | Permission/api compatibility. | Medium |
| `frontend/src/pages/party/gstService.js`, `PartyFormModal.jsx` | GSTIN verification only. | GST master/rule and compliance-document UI. | No GST-management UI found. | High |
| Stock-transfer artifacts | None confirmed. | Dedicated domain after policy decision. | Cannot safely reuse Rojmel transfer. | High |

## 16. Missing Functionality and Technical Gaps

1. **Critical:** no HSN/SAC master, valid-code lifecycle, approval, bulk management, or category default.
2. **Critical:** no effective-dated rate/rule master; no overlap prevention or rule version.
3. **Critical:** sales tax rate is user/client supplied and total-only; no location/registration-driven CGST/SGST/IGST choice.
4. **Critical:** sales/purchase invoices do not persist tax-component snapshots or enough decision context to reproduce the result.
5. **High:** purchase reports use live product HSN and can rewrite historical classification.
6. **High:** E-Invoice/E-Way Bill request JSON is manually supplied; no document-to-compliance-payload mapping or verified invoice link integrity.
7. **High:** no inventory stock-transfer tax workflow was found.
8. **High:** no return reporting or legal-compliance validation was found.
9. **Medium:** UI has hard-coded rate options, differing from broad backend rate validation.
10. **Medium:** GST registration `CompanyId`/`BranchId` are nullable and no examined foreign keys establish their relation to warehouse/shipment context.

## 17. Recommended Implementation Architecture

Do not add a separate framework. Extend the existing Application/Contracts/Persistence/SQL stored-procedure architecture:

1. **Classification/rule domain:** versioned HSN/SAC master, rate/rule master, category default mapping, product mapping/override, status/approval/audit data.
2. **Single tax decision service:** a server-side application service accepts a canonical tax context and produces a deterministic, versioned calculation result. It should be the sole source used by sales/purchase/transfer integrations; SQL procedures should persist the supplied validated result or invoke one canonical database-compatible implementation, not recreate divergent arithmetic.
3. **Document snapshots:** persist rule/mapping identity and all monetary components on each line. Treat them as immutable once document posting/confirmation rules require it.
4. **Compliance adapter:** transform frozen document/snapshot data to GSTZen/NIC payload only at submission time. Preserve payload version/hash, response, retry/idempotency state, and audits.
5. **Reporting query layer:** aggregate snapshots, never current product mapping, for statutory-style reports.
6. **Compatibility:** keep legacy aggregate `TaxAmount`, `GSTRate`, HSN fields and existing API fields during migration; populate compatible totals from components. API contract removal needs a separately approved versioning/deprecation plan.

## 18. Phased Implementation Plan

1. **Prerequisites and decisions:** approve classification ownership, allowed code/rate source, product/category precedence, treatment/POS rules, rounding/inclusive-price rules, purchase mismatch policy, stock-transfer policy, and statutory-report scope. Establish a non-mutating quality assessment for existing items/invoices.
2. **Data model and security:** introduce masters/mappings/rate history, constraints, indexes, permissions and audits; design a backward-compatible document snapshot migration. Do not backfill by guessing.
3. **Tax core:** implement deterministic tax-context/result contracts, rule selection, components, date boundaries, rounding, explanatory diagnostics, and exhaustive unit tests.
4. **Product UI/API:** add HSN master management, product/category mapping and approval workflows, preserving current fields during the transition.
5. **Sales integration:** server calculation and snapshots; update SQL/API/frontend/PDF paths with compatibility tests.
6. **Purchase integration:** preserve supplier-declared and master-selected values; add mismatch workflow and snapshot reporting.
7. **Transfers/compliance:** only after the transfer policy/domain is approved, implement transfer documents and E-Invoice/E-Way Bill builders from frozen data.
8. **Reports, migration, rollout:** snapshot-based HSN/component reporting, staged data migration, reconciliation against approved examples, feature rollout, observability, and rollback plan.

## 19. Dependencies, Risks, and Open Questions

### Business decisions requiring explicit approval

- Authoritative source and approval process for HSN/SAC classifications and GST rates.
- Category default versus product override precedence and whether product mappings are date ranged.
- Taxable/exempt/zero-rated/reverse-charge/SEZ/export treatment rules.
- Seller registration selection and place-of-supply derivation; treatment of billing vs shipping address conflicts.
- Inclusive/exclusive price rules, invoice/line rounding, charges/discount allocation and tolerance.
- Purchase supplier-value mismatch policy and ITC/reconciliation scope.
- Scope and legal treatment of each stock-transfer scenario.
- Required return reports/exports and qualified compliance review before statutory claims.
- Who may create, approve, activate, supersede, or correct classifications/rates.

### Technical risks

- The current sales stored procedure and application service independently calculate aggregate tax; partial migration can cause divergence.
- Existing historical purchase reports are master-data dependent.
- A live database may not match repository SQL scripts; deployment preflight and actual procedure/schema comparison are essential.
- Current E-Invoice/E-Way Bill API accepts raw JSON; a new automatic payload must not silently alter existing manual-integration behavior.
- Package warnings encountered during test execution should be owned separately, but dependency security must be resolved before a compliance release.

### Audit limitations

- No database, deployment, production/staging data, external GSTZen service, provider credentials, or real invoice was accessed.
- No tax/legal source was consulted; this report is technical, not a GST compliance opinion.
- No end-to-end UI, SQL integration, or provider transmission was executed.
- The report reflects files present in this repository at the audit date; scripts may not prove deployed schema.

## 20. Recommended Next Step

Hold a business/technical design decision review using the decisions above, then produce an approved tax-context and document-snapshot specification before any schema or endpoint change. The first implementation should be the HSN/rate/mapping foundation plus deterministic calculation tests—not E-Invoice/E-Way Bill UI or a bulk backfill. After approval, validate the design in an isolated SQL Server integration environment with synthetic fixtures and approved numerical cases.
