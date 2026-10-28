# GST Phase 4 increment 1 — Company/Branch scope execution report

Date: 2026-10-27. Branch: `feature/gst-phase4-company-branch-scope`, based on `origin/main` commit `9af5b47`.

## Approved ownership contract implemented in source

- `Companies` is the shared legal-entity master and `Branches` is a company-owned master; neither is a manufacturing-configuration surrogate.
- `UserCompanyBranchScopes` is an active, audited user assignment. A null branch assignment grants the company level and its branches; a branch assignment grants only that branch. The protected System Owner bypass is explicit in the database scope procedure.
- Sales invoices gain nullable `CompanyId` and `BranchId`. Existing rows are intentionally not backfilled. New create/update contracts require `CompanyId`; `BranchId` is optional.
- A selected GST registration must be active and match the same company and exact branch scope. This is selection validation only; no calculation, statutory snapshot, E-Invoice, E-Way Bill, or GSTZen action is enabled.
- Service-layer checks are applied before read-by-id, create, update, confirm, cancel, payments, and GST eligibility. Cross-scope individual reads use the existing not-found response to avoid confirming a record exists. Legacy unscoped invoices are System Owner-only until an approved remediation process exists.

## Migration

`backend/database/migrations/20261027_30_company_branch_scope.sql` is forward-only and additive. It creates the master and assignment tables, branch/company foreign keys, invoice and registration links, indexes, and `sp_CompanyBranchScope_CanAccess`.

It changes only `sp_SalesInvoice_Create` and `sp_SalesInvoice_Update` after checking their deployed Phase 3 signatures. The script fails closed if the expected procedure revision is absent. It does not update existing invoices, registrations, stock, totals, or statutory records.

## Actual direct SQL evidence (read-only staging)

- Connection used the securely injected development connection string; value was not displayed.
- Server/database: `srv1791248` / `CosmosERP_Staging`.
- The login has `ALTER` on the database.
- Current staging has two Sales invoices, no canonical company/branch tables or Sales invoice scope columns, and zero GST registrations.
- A recent full backup is available. This confirms backup existence only; it is not a restore test performed in this increment.
- Staging remains unchanged: it has two invoices, no Phase 4 scope tables, and the Sales V2 table type is present. No retained schema, data, permissions, backups, or configuration were modified.

## Disposable SQL execution evidence

- `COSMOS_SALES_GST_INTEGRATION_CONNECTION_STRING` parsed without disclosure. It targets `CosmosSalesGstIntegrationTests_Local`, uses `cosmos_gst_test`, has `Encrypt=True;TrustServerCertificate=False`, reaches `srv1791248`, and is denied access to `CosmosERP_Staging`.
- The database was empty of invoices, registrations, parties, and items before work.
- Its baseline was missing `dbo.SalesInvoiceItemInputV2` and was too old for the full quantity-precision migration. That migration's preflight stopped with no changes. A new, versioned, test-database-only bootstrap creates the V2 Sales TVP and updates only the two Sales procedures; it rejects any database not named `CosmosSalesGstIntegrationTests_*`.
- The bootstrap and `20261027_30_company_branch_scope.sql` then applied successfully. Verification confirmed the three scope tables, Sales `CompanyId`/`BranchId`, all expected branch/company/user foreign keys, scope indexes, the Sales V2 TVP, and scope parameters on Sales create/update procedures.
- A migration rerun initially exposed an idempotency defect in procedure-header/parameter rewriting. The migration now recognizes both `CREATE` and `ALTER` headers and skips already-scoped procedure bodies; a full rerun on the disposable database succeeded.

## Verification

Passed locally and against the disposable SQL database:

```powershell
dotnet restore backend/src/Cosmos.API/Cosmos.API.csproj
dotnet build backend/src/Cosmos.API/Cosmos.API.csproj --no-restore
```

The build completed successfully (seven pre-existing dependency/vulnerability warnings).

```powershell
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~CompanyBranchScopeSqlIntegrationTests|FullyQualifiedName~SalesInvoiceGstSqlIntegrationTests"
```

Two SQL integration tests passed. The existing lifecycle test proved draft/update/confirm/cancel, stock deduction/restoration, confirmed-update rejection, and forced confirmation rollback. The new scope test used real SQL assignments and application scope authorization to prove company access, branch isolation, company-level rules, no-assignment denial, legacy-record System Owner-only access, duplicate active-assignment rejection, and branch/company foreign-key rejection. Both tests remove their prefixed fixtures in `finally`; post-run checks found no prefixed rows.

### Increment 1A.2 — master procedure execution (actual evidence)

`backend/database/migrations/20261027_32_company_branch_master_procedures.sql` was applied directly to the guarded disposable database only: `CosmosSalesGstIntegrationTests_Local`. It was then applied a second time successfully. It creates or updates the following six procedures without modifying retained staging data:

- `sp_Company_GetList(@Search, @ActiveOnly)`
- `sp_Company_GetById(@Id)`
- `sp_Company_Save(@Id, @Code, @Name, @IsActive, @UserId)`
- `sp_Branch_GetList(@CompanyId, @Search, @ActiveOnly)`
- `sp_Branch_GetById(@Id)`
- `sp_Branch_Save(@Id, @CompanyId, @Code, @Name, @IsActive, @UserId)`

The procedure migration explicitly persists `ANSI_NULLS` and `QUOTED_IDENTIFIER` before `CREATE OR ALTER`, and each write procedure uses `XACT_ABORT` with an explicit transaction. Rejected duplicate, inactive-company, and branch-reassignment writes roll back before returning a standard conflict status; successful saves return the status result followed by the saved record, which is consumed by `StoredProcedureExecutor.QueryWithStatusAsync`.

The SQL-backed master CRUD test and the existing scope/lifecycle integration tests were run with the injected disposable connection:

```powershell
dotnet test backend/tests/Cosmos.Tests/Cosmos.Tests.csproj --no-restore --filter "FullyQualifiedName~CompanyBranchMasterSqlIntegrationTests|FullyQualifiedName~CompanyBranchScopeSqlIntegrationTests|FullyQualifiedName~SalesInvoiceGstSqlIntegrationTests"
```

Result: **3 passed, 0 failed**. The master test covers create, update, list, duplicate-company prevention, duplicate-branch prevention, branch/company reassignment rejection, rejected-write rollback, and cleanup. The post-run SQL check found zero `ITP42%` Company or Branch fixture rows. The API build also passed after the repository was changed to invoke the stored procedures.

### Increment 1A.3 — Company/Branch master record scope (actual evidence)

`backend/database/migrations/20261027_33_company_branch_master_scope_authorization.sql` was applied twice successfully to `CosmosSalesGstIntegrationTests_Local` only. It replaces the overly broad `IsSystemUser` bypass with the protected System Owner convention: active system user plus active system role membership. It also adds a second, transaction-scoped authorization check to the Company and Branch save procedures. The authenticated server-side actor identifier is supplied by the service; it is not an HTTP request field.

The master service now applies both layers of authorization: controller page/action permissions remain the global gate, while service checks filter Company and Branch lists and return 404 for inaccessible individual records. A company-level scope can administer its company and create branches within it. A branch-only scope may view or edit only its assigned branch, cannot view/administer the company or siblings, and cannot create branches. New Company creation remains System Owner-only.

The write procedures take `UPDLOCK, HOLDLOCK` on the relevant active scope row in their transaction before mutating a Company or Branch. This makes revocation block or win before the mutation commits, rather than trusting a stale token or a prior service-only decision. The residual limitation is that direct SQL callers must remain restricted to the application/migration identities; SQL Server cannot derive an ERP user identity from an arbitrary stored-procedure parameter.

The disposable SQL test was extended to prove delegated company update, post-revocation denial at the procedure boundary, branch-only create denial, and assigned-branch update. The existing System Owner scope test now verifies the protected role convention rather than treating every `IsSystemUser` account as an owner.

### Increment 1A.4 — validation, deactivation, audit and HTTP evidence

`backend/database/migrations/20261028_34_company_branch_safe_deactivation.sql` was applied and rerun successfully against `CosmosSalesGstIntegrationTests_Local` only. It retains historical references but prevents Company deactivation when active branches, GST registrations, user scopes, or draft Sales invoices exist. It prevents Branch deactivation when active GST registrations, user scopes, or draft Sales invoices exist. It does not cascade, rewrite invoices, reassign users, or modify retained staging data.

Company/Branch FluentValidation now rejects null/empty/whitespace codes and names, SQL length overflow, and non-positive Branch company identifiers before mutation. Duplicate identity, inactive-company, reassignment, authorization, and active-dependency errors remain transactionally enforced by stored procedures.

HTTP-host tests exercise authentication, the real `RequirePermission` filter, controller routing, API envelopes, and correlation-ID middleware: unauthenticated requests return `401`, missing page permission returns `403` without calling the service, and an authorized request returns the normal envelope with its correlation ID. SQL-backed tests retain scope/lifecycle coverage and now include active-branch and active-assignment deactivation blocking.

### Increment 1A.5 — atomic Company/Branch audit writes (actual evidence)

`backend/database/migrations/20261028_35_company_branch_atomic_audit.sql` was applied and rerun successfully on `CosmosSalesGstIntegrationTests_Local` only. It creates transactional `AFTER INSERT, UPDATE` audit triggers for `Companies` and `Branches`. The triggers write through the established `dbo.AuditLogs` table in the same SQL transaction already owned by `sp_Company_Save` or `sp_Branch_Save`; no distributed transaction or compensating delete is used. A trigger/audit failure aborts the enclosing master procedure and its business write.

The triggers write the actor from `CreatedBy`/`UpdatedBy`, the server UTC audit timestamp, action (`Create`, `Update`, `Activate`, `Deactivate`), record ID, old/new JSON, and changed-field metadata. No-op retries do not generate a new update audit row because the trigger compares inserted and deleted values. The application service no longer writes a second post-commit audit record.

Real SQL verification extended the guarded master test: Company and Branch creation produce one audit event; Company updates persist old/new values; forced `dbo.AuditLogs` trigger failures roll back both the Company and Branch write; and fixture cleanup removes all `ITP42%` master and audit rows. The focused master SQL test passed after the forced-failure checks.

### Increment 1B — scope-assignment administration backend (initial execution)

`backend/database/migrations/20261028_36_company_branch_scope_assignments.sql` was applied and rerun successfully on `CosmosSalesGstIntegrationTests_Local` only. It registers the separate `System.CompanyBranchScopeAssignments` page resource without granting it to ordinary roles, creates parameterized assignment read/effective-scope/grant/revoke procedures, and adds atomic assignment audit records through the existing `AuditLogs` table.

The backend exposes `GET /api/v1/organization/scope-assignments/me`, `GET /api/v1/organization/scope-assignments/users/{userId}`, `POST /api/v1/organization/scope-assignments`, and `DELETE /api/v1/organization/scope-assignments/{assignmentId}`. Assignment mutation procedures recheck protected System Owner status and Company-level administrator scope under transaction locks, reject self-grants by delegated administrators, validate active target entities and branch/company matching, deactivate rather than delete revocations, and reject duplicate active grants. Assignment lifecycle SQL and HTTP-host tests remain required before this increment can be accepted.

The guarded SQL assignment lifecycle suite now passes against the disposable database. It verifies System Owner Company/Branch grants, delegated Company-level grant, cross-Company denial, branch-only denial, delegated self-assignment denial, inactive-user and branch/company mismatch denial, duplicate active-assignment denial, soft revocation and repeated-revocation behavior, persisted grant audit, and forced audit-trigger failure rollback. Its concurrent test releases two independently opened SQL connections together and proves exactly one active Company grant and exactly one active Branch grant survive matching grant races; a concurrent grant/revoke ends with no more than one active record. The fixture cleanup removes `ITP43%` users, scopes, Companies, Branches, roles, and test trigger.

The assignment HTTP-host suite now passes for all four routes. The prior run was not a hang: its test helper reserved a TCP port and released it before Kestrel bound it, allowing an address-in-use race. The helper now asks Kestrel to bind loopback port `0` and uses its actual bound address. The tests prove the actual authentication/permission-filter/controller/envelope/correlation pipeline for `me`, user assignments, grant, and revoke, plus `401` and `403` behavior.

Not run / incomplete:

- **Checkpoint 2 UI:** `/settings/company-branches` now provides Company, Branch, and User Access tabs via `frontend/src/pages/organization/OrganizationAdministrationPage.jsx`. It uses the real versioned organization APIs, client-side pagination because the API collections are unpaged, capability-driven write controls, active Company filtering for Branches, fixed Branch Company ownership while editing, dependent assignment branch selection, duplicate-submit prevention, and revoke confirmation. Backend authorization remains authoritative.
- The existing manifest and lockfile already pinned `lossless-json@4.3.3`; `npm ci` restored the previously incomplete local installation without changing precision-sensitive parsing. `npm run lint` and `npm run build` passed. The focused organization API-contract suite passed 2/2. The full frontend suite has an unrelated existing failure in `src/utils/validationSchemas.test.js`: it expects employee `addresses` to be omitted, but current code returns `addresses: []`.
- Browser verification was not run because no authenticated local API/browser session is configured; retained staging was not changed for UI testing.
- The scope test does not yet cover direct stored-procedure registration mismatch, draft reassignment, payment/confirm/cancel service interception, cross-session revocation timing, or frontend behavior.

## Required next controlled step

Before staging deployment, complete the missing master administration/API/UI and expanded SQL/API coverage. The current retained staging migration would add three empty masters/assignment tables, nullable Sales ownership columns, foreign keys, indexes, the scope procedure, and guarded Sales procedure changes. Its two existing invoices stay untouched and unscoped. Apply it only after separate approval; do not run lifecycle tests against `CosmosERP_Staging`.
